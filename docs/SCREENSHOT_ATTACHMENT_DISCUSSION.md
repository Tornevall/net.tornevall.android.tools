# Screen Capture Integration for SocialGPT on Android
**Status**: 2026-05-14 Design Discussion  
**Question**: Can we attach screenshots to verify/reply requests? Does Tools support it?

## Answer: Currently Limited, Needs Enhancement

### Current State of Tools API

**POST /api/ai/socialgpt/respond** (verify/reply endpoint):
- Input: `context` (text), `user_prompt` (text), `extra_data` (JSON object with metadata)
- **No built-in media/image attachment support currently specified**
- Response: `response` (text), `web_search` (citations), `verification` (object)

The API **does support** metadata in `extra_data`:
```json
{
  "context": "Original text from screen",
  "user_prompt": "Is this statement factually accurate?",
  "extra_data": {
    "participant_analysis_phase": "initial",
    "web_search_mode": "force_on",
    "facebook_preview_focus_name": "...",
    "socialgpt_latency_mode": "fast_followup"
  }
}
```

But **no image/bitmap field is documented yet**.

---

## Proposed Enhancements for Screenshot Support

### Option 1: Base64-Encoded Image in Request (Near-Term)

Add to `POST /api/ai/socialgpt/respond`:

```json
{
  "context": "[visible text from screen]",
  "user_prompt": "Verify this statement",
  "request_mode": "verify",
  "client_platform": "android_app",
  "extra_data": {
    "participant_analysis_phase": "initial",
    "screen_capture": {
      "image_base64": "iVBORw0KGgoAAAANSUhEUgAAA...",
      "image_mime_type": "image/png",
      "stage_label": "card",
      "stage_timestamp": "2026-05-14T11:20:00+00:00",
      "captured_text": "[OCR or visible text]"
    }
  }
}
```

**Pros**:
- No new endpoint needed
- Image travels with the request
- OpenAI can analyze multimodal (text + image)
- Backward compatible (field is optional in `extra_data`)

**Cons**:
- Base64 inflates request size
- Requires Tools to decode + pass to OpenAI Responses API with vision
- OpenAI API calls might get more expensive (vision tokens)

### Option 2: Separate Upload Endpoint (Cleaner)

Add new endpoint: **POST /api/ai/socialgpt/requests/{requestId}/attach-screenshot**

```
POST /api/ai/socialgpt/requests/{requestId}/attach-screenshot
Authorization: Bearer <token>
Content-Type: multipart/form-data

image: <binary .png/.jpg>
stage_label: "card"
captured_text: "..."
```

Then attach to existing request:
```json
{
  "context": "text from screen",
  "request_mode": "verify",
  "screenshot_request_id": "req_abc123"
}
```

**Pros**:
- Cleaner separation of concerns
- Can attach multiple screenshots
- Files can be stored server-side for audit/history
- Easier to handle large bitmaps

**Cons**:
- New endpoint + schema (more work on Tools)
- Requires request ID generation upfront
- More complex client code

### Option 3: Store Screenshots Client-Side (Current Embryo)

**What we're doing NOW** (ParticipantAnalysisSession embryo):
- Capture screenshots locally
- Store in `ParticipantAnalysisSession.screenshotBitmaps` (in-memory) or Room DB (persistent)
- Send **OCR text** + **stage labels** to Tools API (`visibleScreenText` in ParticipantCandidate)
- Tools uses text for analysis; screenshots remain client-side for operator review

**Pros**:
- No API changes needed
- More privacy (screenshots never leave device)
- Faster (no large uploads)
- Simple to implement

**Cons**:
- OpenAI/Tools cannot see the actual visual context
- Harder to debug analysis results
- Potential OCR errors not caught by server

---

## Recommendation for Next Phase

### Short-Term (Now → Q3 2026)

**Use Option 3 (client-side screenshots)**:
1. Implement the embryo as-is: `ParticipantAnalysisSession` + local bitmap storage
2. Extract visible text via OCR (ML Kit)
3. Send text + stage labels to Tools API
4. Display screenshots locally to operator for manual verification

This is **battery-efficient**, **privacy-first**, and **requires no Tools API changes**.

### Medium-Term (Q3 → Q4 2026)

**Evaluate + propose Option 1 (base64 in extra_data)**:
1. Gather feedback on whether text-only analysis is sufficient
2. If operators want visual context, propose adding `extra_data.screen_capture` with base64 image
3. Requires Tools to:
   - Accept image data in `extra_data.screen_capture`
   - Decode base64 → bitmap
   - Pass to OpenAI Vision layer for multimodal analysis
4. OpenAI Responses API supports `image_url` with `vision` capabilities

### Long-Term (Q4 2026+)

**Consider Option 2** if feedback shows:
- Operators need historical audit of screenshots
- Multiple screenshots per analysis are common
- File storage patterns emerge

---

## Implementation for Embryo (Right Now)

### ParticipantAnalysisSession Already Supports:

```kotlin
data class AnalysisStage(
    val stageLabel: String,
    val visibleScreenText: String?,  // ← OCR text sent to Tools
    val screenshotFileName: String?, // ← Local file/blob reference
)

class ParticipantAnalysisSession {
    val screenshotBitmaps: MutableMap<String, Bitmap> = mutableMapOf()  // ← Client-side storage
}
```

### To Add Screenshot Capture Logic:

```kotlin
// In ParticipantAnalysisViewModel or a ScreenCaptureService:

private fun captureScreenWithOCR(stageLabel: String) {
    // 1. Capture bitmap using AccessibilityService or overlay
    val bitmap = captureScreenToMemory()
    
    // 2. Extract text via ML Kit Vision
    val ocrText = mlKitVision.extractText(bitmap)
    
    // 3. Store locally
    currentSession.addStage(
        stageLabel = stageLabel,
        visibleText = ocrText,  // ← This goes to Tools API
        capturedBitmap = bitmap // ← This stays on device
    )
    
    // 4. When ready, send candidates to Tools for history lookup
    viewModel.analyzeParticipants(
        pageUrl = "...",
        candidates = extractedCandidates,
        periodDays = 180
    )
    // Tools receives text + stage labels, analyzes participant history
}
```

### To Add Base64 Support (Future, Option 1):

```kotlin
// When sending to Tools, if OpenAI vision is available:

val requestBody = buildJsonObject {
    put("context", ocrText)
    put("user_prompt", "Verify this participant...")
    put("request_mode", "verify")
    put("extra_data", buildJsonObject {
        put("participant_analysis_phase", "initial")
        // NEW: optional screen capture
        put("screen_capture", buildJsonObject {
            put("image_base64", bitmap.toBase64Png())
            put("image_mime_type", "image/png")
            put("stage_label", stageLabel)
            put("captured_text", ocrText)
        })
    })
}
```

Then Tools would:
1. Detect `extra_data.screen_capture` is present
2. Decode base64 → PNG
3. Include image in OpenAI multimodal request if vision is enabled
4. Return richer verification result

---

## OpenAI Multimodal Support (Background)

OpenAI REST API Responses format already supports images:

```json
{
  "model": "gpt-4o",
  "messages": [
    {
      "role": "user",
      "content": [
        {
          "type": "text",
          "text": "Is this participant legitimate?"
        },
        {
          "type": "image_url",
          "image_url": {
            "url": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAA...",
            "detail": "high"
          }
        }
      ]
    }
  ]
}
```

So **Tools already has the plumbing** if someone implements Option 1. It's just not exposed to Android clients yet.

---

## Screenshot Quality & File Size Concerns

### Bitmap Size (Typical Android Phone):

- **Full-screen capture**: 1080×2340 px (Pixel 6a) ≈ 3 MB uncompressed
- **Compressed PNG**: ~500 KB–2 MB
- **Base64 encoded**: +33% overhead = 650 KB–3 MB per request

### Mitigations:

1. **Downscale before capture**: Resize to 720×1440 max → saves 50% file size
2. **Compress aggressively**: PNG quality=85% → saves 30%
3. **Crop relevant area**: Only capture the participant card region → saves 80%
4. **Limit to one image per request**: Don't send all 4 stages at once

### For Now (Embryo):

Keep full-quality local bitmaps for operator review. Don't upload/encode unless explicitly asked.

---

## Summary: Screenshot Attachment Status

| Feature | Current | Q3 2026 | Q4 2026+ |
|---------|---------|---------|----------|
| **Screenshot capture (local)** | ✅ Embryo | ✅ Implemented | ✅ Yes |
| **OCR text extraction** | 🔜 To do | ✅ Integrated | ✅ Yes |
| **Send to Tools as text** | ✅ Ready | ✅ Working | ✅ Yes |
| **Base64 in extra_data** | ❌ Not yet | 🔜 Proposed | ✅ Maybe |
| **Separate upload endpoint** | ❌ No | ❌ No | 🔜 Maybe |
| **OpenAI visual analysis** | ❌ No | ❌ No | ✅ If Option 1 |
| **Historical screenshot audit** | ❌ No | 🔜 Room DB | ✅ Maybe |

---

## Conclusion

**Tools does NOT have screenshot attachment yet**, but:
1. **You can start NOW** with the embryo (local client-side capture + OCR text)
2. **Tools API is designed for extensibility** (extra_data object + OpenAI multimodal support ready)
3. **Option 1 (base64 embed) is the cleanest next step** when visual context becomes critical
4. **Operators get value immediately** from text + history lookup, without needing image uploads

**Do NOT wait** for Tools to add screenshot support to start building. The embryo is complete and ready for UI integration on Android.

