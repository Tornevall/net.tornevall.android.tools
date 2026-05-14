# Android Participant-Request Analysis Embryo
**Status**: 2026-05-14  
**Context**: Facebook moderation workflow on mobile with screen-capture-first design

## Overview

This document describes the **embryo** for Android participant-request analysis, based on the guidance in `AGENTS.md` sections:
- 5.1) SocialGPT Android parity guardrails (lines 2325-2363)
- 2026-05-14 change sync (participant-analysis phase separation)
- 2026-05-13 change sync (per-group Facebook rules)

### Key Design Principle

**Screen capture-first, no GraphQL.**  
Unlike the browser extension (which uses `projects/socialgpt-chrome/js/content-script.js` GraphQL), Android:
- Captures visible screen content (bitmaps + OCR text)
- Marks visible text as **OBSERVATIONAL** only
- Uses Tools API as the **sole source of truth** for moderation rules/history
- Never invents a local moderation-rules model

---

## Architecture

```
ParticipantAnalysisSession (embryo data model)
  ├─ groupId: String
  ├─ sessionStartedAt: LocalDateTime
  ├─ stages: List<AnalysisStage>
  │   ├─ stageLabel: "card" | "preview_comment" | "original_post" | "original_post_scrolled"
  │   ├─ capturedAt: LocalDateTime
  │   ├─ visibleScreenText: String (OCR, MARKED OBSERVATIONAL)
  │   ├─ screenshotFileName: String (path/blob reference)
  │   ├─ userActions: List<UserAction>
  │       ├─ actionType: "scroll" | "click_preview" | "navigate_original" ...
  │       ├─ recordedAt: LocalDateTime
  │       └─ details: String?
  └─ screenshotBitmaps: Map<stageLabel, Bitmap>

ParticipantAnalysisApiClient
  ├─ POST /api/social-media-tools/extension/facebook-participant-history
  │   └─ Returns: approvals + rejections history for candidates
  └─ GET /api/social-media-tools/extension/settings
      └─ Returns: per-group rules via facebook_participant_group_contexts_by_group_id

ParticipantAnalysisViewModel
  ├─ currentSession: LiveData<ParticipantAnalysisSession?>
  ├─ groupRules: LiveData<String?> (synced from Tools)
  ├─ participantHistory: LiveData<ParticipantHistoryResponse>
  ├─ startAnalysisSession(groupId)
  ├─ captureStage(stageLabel, visibleText, bitmap)
  ├─ recordUserAction(actionType, details)
  ├─ analyzeParticipants(pageUrl, candidates, periodDays)
  └─ endAnalysisSession(saveToDatabase)
```

---

## Sequential Capture Workflow

### Step 1: Detect Facebook Participant-Request Surface
Android should detect these **recognition markers** (from AGENTS.md line 2347-2355):
- Top moderation header: `"Att granska"`
- Active tab: `"Deltagare <count>"`
- Participant card rows: `"Har skickat en kommentar. Förhandsgranska"`
- Participant actions: `"Godkänn"`, `"Tacka nej"`, `"..."`

When these are detected, show a "Capture for analysis" button/action.

### Step 2: capture Card Stage
```kotlin
val session = ParticipantAnalysisSession(groupId = "123456789")

// User clicks "Analyze" on visible participant card
session.addStage(
    stageLabel = "card",
    visibleText = """
        |Rodolfo Garcia
        |Besökare · För 1 minut sedan
        |512 vänner · 2 gemensamma · 2 i gruppen
        |76 grupper
        |Gick med i Facebook 7 maj 2008
        |Har skickat en kommentar. Förhandsgranska
        |Beskriv kort varför just du vill gå med i gruppen...
        |Do you agree to the rules from the admin?
        |No response
    """.trimIndent(),
    capturedBitmap = screenCaptureBitmap()
)

session.recordUserAction("participant_card_captured", "User initiated analysis from participant list")
```

### Step 3: capture Preview Comment
User taps "Förhandsgranska" button to see the preview sheet.
```kotlin
session.addStage(
    stageLabel = "preview_comment",
    visibleText = """
        |Förhandsgranska kommentar
        |
        |Kommentarerna publiceras inte förrän du godkänner delttagaren.
        |
        |Rodolfo Garcia
        |UFFEBLUFFE
        |För 4 minuter sedan Visa ursprungligt inlägg
    """.trimIndent(),
    capturedBitmap = previewScreenBitmap()
)

session.recordUserAction("click_preview_comment", "Opened preview sheet")
```

### Step 4 (Optional): capture Original Post
User taps "Visa ursprungligt inlägg" to see the original post context.
```kotlin
session.addStage(
    stageLabel = "original_post",
    visibleText = """
        |Mujtaba Parwanis inlägg
        |
        |«Jag är socialdemokrat eftersom jag tror på...
        |
        |Visa statistik
        |4 704 – inläggets räckvidd
        |
        |Catharina Holmström
        |Det är inte bara sossar som tror på...
    """.trimIndent(),
    capturedBitmap = originalPostScreenBitmap()
)

session.recordUserAction("navigate_original_post", "User viewed original post context")
```

### Step 5 (Optional): Handle Scrolling
If user scrolls original-post thread to see more context:
```kotlin
session.addStage(
    stageLabel = "original_post_scrolled",
    visibleText = """
        |[Continuation of comment thread after scroll]
        |
        |Joakim Jakobsson
        |Catharina Holmström Då är det dags att visa det för M
        |och SD
    """.trimIndent(),
    capturedBitmap = scrolledContextBitmap()
)

session.recordUserAction("scroll_thread", "Scrolled comment thread to see more replies")
```

---

## Tools API Synchronization

### Fetch Per-Group Rules
When starting a session, fetch the group-specific moderation rules from Tools:

```kotlin
// GET /api/social-media-tools/extension/settings
val settings = apiClient.fetchExtensionSettings()

// Extract per-group rules (keyed by group ID)
val perGroupRules = apiClient.extractPerGroupRules(settings)
val groupRuleText = perGroupRules["123456789"] 
    ?: "Global fallback: [whatever is in facebook_participant_group_context]"

// Display to moderator BEFORE analysis starts
showNotification("Group rules: $groupRuleText")
```

**Important**: Rules are **read from Tools**, never created locally. Mobile app is stateless for moderation rules.

### Fetch Participant History
Once you have candidate(s) from the capture, look up their history:

```kotlin
val candidates = listOf(
    ParticipantCandidate(
        name = "Rodolfo Garcia",
        profileUrl = "https://www.facebook.com/groups/123456789/user/987654321/",
        profileUserId = "987654321",
        sourceStage = "card",
        extractedText = "[name and visible card text]"
    )
)

viewModel.analyzeParticipants(
    pageUrl = "https://www.facebook.com/groups/123456789/participant_requests",
    candidates = candidates,
    periodDays = 180
)

// Response includes BOTH rejections AND approvals (2026-05-14 change):
// - rejectionCount (old)
// - matched, decisionCount, approvedCount, approvedMembershipRequestCount, ... (new)
// - firstSeenAt, lastSeenAt, firstApprovedAt, lastApprovedAt, latestOutcome (new)
// - summaryText (now combined, not rejection-only)
```

---

## Handling Screenshots & Bitmaps

### Where are bitmaps stored?

This embryo **does not yet specify persistence**. Options:
1. **In-memory only** (current): Bitmaps stored in `ParticipantAnalysisSession.screenshotBitmaps` during session. Cleared when session ends.
2. **Local Room DB** (future): Store bitmap files + paths locally. Useful for offline access + debugging.
3. **Upload to blob storage** (future): If/when Tools API gains an upload endpoint, send bitmaps to Tools for server-side storage.

### How to capture screens on Android?

Example approaches:
- **AccessibilityService** (if user enables it): Can capture view hierarchy + draw bitmaps
- **WindowManager + Canvas** (Android 10+): Hidden overlay approach, requires `SYSTEM_ALERT_WINDOW`
- **Manual screenshot via native Java** (less reliable, may need root on some devices)
- **WebView if using Facebook in WebView** (not applicable here; user is in native Facebook app)

For now, **assume manual UI**:
```kotlin
// User triggers a "Capture" button in your overlay/fab
val bitmap = captureScreenToFile()  // Implement based on accessibility approach
viewModel.captureStage("card", visibleText = recognizedText, bitmap = bitmap)
```

### Screenshot Filenames

Each screenshot is stored with a stage label:
```
stage_card_1715945100000.png
stage_preview_comment_1715945150000.png
stage_original_post_1715945200000.png
```

---

## Anchoring & State Management

### Why "Weaker Anchoring"?

Browser extension relies on stable DOM selectors: `//button[@aria-label="Analyze"]` or similar.

Mobile has **no stable anchor** because:
- Facebook mobile app changes layouts frequently
- Screen coordinates vary (orientation, device size, notches)
- No DOM equivalent available

**Solution**: Use **stage labels** as the anchor instead.
```kotlin
data class AnalysisStage(
    val stageLabel: String,  // "card", "preview_comment", etc.
    val capturedAt: LocalDateTime,
    val visibleScreenText: String?,
    val screenshotFileName: String?,
    val userActions: MutableList<UserAction> = mutableListOf()
)
```

Each stage is **immutable** and **labeled explicitly**. No assumptions about layout/position.

### State Machine (Optional Future Enhancement)

If you want stricter validation, add a state machine:
```
IDLE
  → START_SESSION (user clicks "Analyze")
  → CAPTURE_CARD_PENDING
    → after captureStage("card") → CAPTURE_CARD_DONE
    → CAPTURE_PREVIEW_PENDING
      → ... → CAPTURE_PREVIEW_DONE
      → CAPTURE_ORIGINAL_PENDING (optional)
        → ... → CAPTURE_ORIGINAL_DONE
        → SCROLL_PENDING (optional)
          → ... → SCROLL_DONE
          → ANALYZE_READY
            → submitToTools()
            → ANALYZING
            → DONE
```

This is **not required** for the embryo; just an option if you want stricter flow control.

---

## API Request/Response Examples

### POST /api/social-media-tools/extension/facebook-participant-history

**Request** (from Android capture):
```json
{
  "page_url": "https://www.facebook.com/groups/123456789/participant_requests",
  "group_id": "123456789",
  "period_days": 180,
  "candidates": [
    {
      "name": "Rodolfo Garcia",
      "profile_url": "https://www.facebook.com/groups/123456789/user/987654321/",
      "profile_user_id": "987654321"
    }
  ]
}
```

**Response** (from Tools, 2026-05-14+ with approvals):
```json
{
  "ok": true,
  "participant_rows": [
    {
      "name": "Rodolfo Garcia",
      "profile_url": "...",
      "profile_user_id": "987654321",
      "rejection_count": 0,
      "matched": true,
      "decision_count": 2,
      "approved_count": 1,
      "approved_membership_request_count": 1,
      "approved_pending_post_count": 0,
      "first_seen_at": "2026-04-10T14:30:00+00:00",
      "last_seen_at": "2026-05-14T11:20:00+00:00",
      "first_approved_at": "2026-04-15T09:15:00+00:00",
      "last_approved_at": "2026-05-10T16:45:00+00:00",
      "latest_outcome": "approved",
      "summary_text": "1 godkänd ansökan, tidigare aktivitet i gruppen, ingen avslag"
    }
  ]
}
```

### GET /api/social-media-tools/extension/settings

**Response** (includes per-group rules):
```json
{
  "ok": true,
  "settings": {
    "responder_name": "Thomas",
    "persona_profile": "Factual and concise",
    "facebook_participant_group_context": "Default: Verify identity, check activity history",
    "facebook_participant_group_contexts_by_group_id": {
      "123456789": "Socialism discussion group: prioritize ideological alignment, check for bad-faith arguments",
      "987654321": "Tech group: verify technical experience, check for spam patterns"
    }
  }
}
```

---

## What's NOT Implemented Yet (Future Scope)

1. **Screenshot Upload Endpoint**
   - Tools API doesn't yet have a dedicated endpoint for bifogning/upload of Bitmap blobs.
   - If needed, you could:
     - Save bitmaps locally (Room DB)
     - Upload later via a `POST /api/participant-analysis/upload-screenshot` (would need to be added to Tools)
     - Or include base64-encoded image in the facebook-participant-history request itself (not yet supported)

2. **Notification/Callback Workflow**
   - Once participant is moderated (approved/rejected), notify back to Tools?
   - Current API doesn't expose a "participant moderation outcome" POST endpoint.

3. **Local Persistence**
   - Room DB schema for storing sessions + screenshots
   - Offline access to past analyses

4. **Accessibility Service Integration**
   - Actually capturing screens reliably from within Android app
   - OCR pipeline (Google ML Kit or similar)

5. **Fine-Grained Anchoring Metadata**
   - Storing canvas coordinates, view IDs, or other positional data for future reference

---

## Implementation Checklist (Next Steps)

- [ ] **UI Layer**: Create a `ParticipantAnalysisFragment` that:
  - Detects Facebook participant-request surface (show "Capture for analysis" action)
  - Shows navigation through stages (card → preview → original → scroll)
  - Displays group rules + participant history side-by-side with captured screens
  
- [ ] **Accessibility/Capture**: Implement screen capture via:
  - [ ] AccessibilityService-based approach (if user grants permission)
  - [ ] Or fallback to manual UI (user taps button to upload screenshot)
  
- [ ] **OCR Pipeline**: Integrate ML Kit Text Recognition to extract `visibleScreenText`

- [ ] **Local Persistence**: Add Room DB schema:
  - [ ] `ParticipantAnalysisSessionEntity` (groupId, timestamps, session metadata)
  - [ ] `AnalysisStageEntity` (stageLabel, visibleText, screenshotPath)
  - [ ] Store screenshot files in app's cache/files directory
  
- [ ] **Offline Sync**: When connection is restored, upload any pending analyses to Tools

- [ ] **Testing**:
  - [ ] Mock API responses for ParticipantHistoryResponse
  - [ ] Test stage capture + ordering
  - [ ] Test Tools API integration (live against dev instance)

---

## Notes

- **Screen text is OBSERVATIONAL**: Always mark captured text as "this is what we see on screen" — not final truth.
- **Tools is source of truth**: Group rules, participant history, moderation decisions all come from Tools API.
- **Weaker anchoring**: No DOM selectors, just timestamps + explicit stage labels.
- **Keep screen open**: User must keep Facebook app open (or your overlay app) during entire capture sequence.
- **Session = Transaction**: One analysis session = one complete moderation workflow (card → decision).
- **No local rules inventory**: Never create a separate local rule database on the app. Sync from Tools every time.

---

## References

- AGENTS.md section 5.1: Android parity guardrails
- AGENTS.md 2026-05-14 change sync: participant-analysis phase separation
- Facebook participant-request interface (visual markers from user's screenshots)

