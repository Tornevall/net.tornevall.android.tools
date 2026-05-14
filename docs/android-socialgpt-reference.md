# Android SocialGPT Reference (from `socialgpt-chrome`)

Date: 2026-04-22
Scope: documentation baseline for Android SocialGPT UI/config parity.

## 1) Purpose

This document explains how SocialGPT currently behaves in the Chrome extension so Android can build an initial native interface/config without reverse-engineering JavaScript later.

Primary source implementation:
- `K:/Apps/wamp64/www/tornevall.com/tools.tornevall.com/projects/socialgpt-chrome`

Important workflow rule:
- This PHPStorm session is documentation/planning only.
- Android implementation/integration should be done in Android Studio.

## 2) Source-of-truth files to track

Core runtime and API behavior:
- `projects/socialgpt-chrome/js/background.js`
- `projects/socialgpt-chrome/js/content-script.js`
- `projects/socialgpt-chrome/js/popup.js`

UI and settings surfaces:
- `projects/socialgpt-chrome/html/popup.html`
- `projects/socialgpt-chrome/html/options.html`
- `projects/socialgpt-chrome/js/options.js`

Shared helpers:
- `projects/socialgpt-chrome/js/shared/i18n.js`
- `projects/socialgpt-chrome/js/shared/platform-registry.js`
- `projects/socialgpt-chrome/js/shared/facebook-admin-reporter.js`
- `projects/socialgpt-chrome/js/shared/soundcloud-page-bridge.js`

Manifest and release context:
- `projects/socialgpt-chrome/manifest.json`
- `projects/socialgpt-chrome/README.md`
- `projects/socialgpt-chrome/CHANGELOG.md`

## 3) What SocialGPT does (behavior model)

SocialGPT is a token-backed Tools client with these main capabilities:

1. Reply generation:
- Sends context + prompt + settings to `POST /api/ai/socialgpt/respond`.
- Returns generated response text for pasting.

2. Fact-check mode:
- Uses same API endpoint with `request_mode="verify"`.
- Supports model selection and fallback behavior in extension runtime.
- Android default should start with deep verification intent (`reasoning_effort=high`) and render output in a dedicated in-app fact box.

3. Token and settings lifecycle:
- Validates bearer token via `GET /api/social-media-tools/extension/validate-token`.
- Reads/writes extension settings via `/api/social-media-tools/extension/settings`.
- Reads model catalog via `/api/social-media-tools/extension/models`.
- Uses `/api/social-media-tools/extension/test` for smoke test.

4. Optional platform overlays (web-only extension context):
- Facebook admin activity reporting module.
- SoundCloud insights capture module (currently guarded by runtime flag in content script).

For Android, focus first on parity for token, settings, model catalog, reply generation, and fact-check flows.

## 4) Current UX surfaces in extension (what Android should mirror first)

### 4.1 Popup surface (quick settings)

The popup is the primary compact control surface and includes:
- Bearer token field
- Environment switch (dev/prod)
- Persona/system prompt
- Auto-detect responder toggle
- Reply language
- Verify-fact language
- Preferred fact-check model
- Quick-reply preset and custom instruction
- Debug controls in dev mode
- Token validation status and inline feedback
- Open toolbox action for active tab (extension-specific, now frame-aware via background routing)
- Open options page shortcut

Android parity target:
- Build this first as a native "SocialGPT Settings" screen.
- Responder-name should be omitted in Android primary UX.
- Android should instead prioritize capture-safe fields that can actually be reused from on-screen context.

### 4.2 Options surface (expanded settings)

The options page mirrors popup settings in larger layout. Behavior is intentionally aligned with popup.

Android parity target:
- Optional second screen later, or a single larger settings screen that already includes advanced options.

### 4.3 In-page toolbox/selection overlays (extension-only)

Extension-specific web content features include:
- Floating "Open Toolbox" and "Verify fact" buttons for selected text
- On-page draggable toolbox panel
- Mark-context extraction modes for DOM content
- Result box actions and context handoff

Important extension-runtime note:
- As of `1.2.17`, popup/context-menu Toolbox and verify flows are routed through the background worker so the extension can choose the most relevant injected frame (existing Toolbox frame, selected-text frame, focused editable frame, otherwise top frame) on iframe-heavy pages.

Android parity guidance:
- Do not attempt web DOM overlay parity in phase 1.
- Map toolbox behavior to native Android compose/result screens instead.
- The Android floating bubble should be a styled native surface with direct actions for both reply and `Verify fact`.
- `Verify fact` should render a dedicated in-app fact box immediately instead of relying on console/debug output.

## 5) Settings and defaults currently used by SocialGPT

Key defaults visible in `js/popup.js` and `js/content-script.js`:
- Default response language: `auto`
- Default verify-fact language: `auto`
- Default fact-check model: `gpt-4o`
- Default quick-reply preset: `default`
- Default quick-reply custom instruction: empty string
- Default mark context label mode: `compact`
- Default mark context expansion mode: `current`

Representative persisted settings (extension storage keys):
- `toolsApiToken`
- `devMode`
- `responderName`
- `chatGptSystemPrompt`
- `autoDetectResponder`
- `extensionUiLanguage`
- `defaultResponseLanguage`
- `defaultVerifyFactLanguage`
- `preferredFactCheckModel`
- `defaultQuickReplyPreset`
- `defaultQuickReplyCustomInstruction`
- `availableToolsModels`
- `defaultToolsModel`
- `facebookAdminStatsEnabled`
- `facebookAdminDebugEnabled`

Android mapping recommendation:
- Create a single `SocialGptSettings` data model in Android and map API/Storage fields to this model.
- Android should persist the last `Your instruction` value locally and keep reusing it until the user edits it again.
- Android reply UX should be suggestion-first rather than one-shot final-output first.

## 6) API usage details to preserve in Android

### 6.1 Token validation

Endpoint:
- `GET /api/social-media-tools/extension/validate-token`

Auth:
- Tools bearer token (`Authorization: Bearer ...`)

Use:
- Quick auth check before loading/saving settings or testing AI.

### 6.2 Settings read/write

Endpoints:
- `GET /api/social-media-tools/extension/settings`
- `PUT /api/social-media-tools/extension/settings`

Use:
- Android currently syncs the subset it uses in-app (`persona_profile`, `custom_instruction`, `response_language`).
- Responder-name/auto-detect fields remain backend-compatible for extension/web but are not primary Android UX fields.

### 6.3 Model catalog

Endpoint:
- `GET /api/social-media-tools/extension/models`
- Optional refresh query in extension workflow.

Use:
- Populate model picker.

### 6.4 Smoke test

Endpoint:
- `GET` and/or `POST /api/social-media-tools/extension/test`

Use:
- Confirm token + approved OpenAI access + provider path.

### 6.5 AI response generation

Endpoint:
- `POST /api/ai/socialgpt/respond`

Important request fields:
- `context`
- `user_prompt`
- `modifier`
- `model`
- `request_mode` (`reply` or `verify`)
- `response_language`
- `reasoning_effort` (recommended for verify mode)
- `client_name`
- `client_version`
- `client_platform`

Android mobile signaling contract:
- Always send `client_platform="android_app"`.
- Always send `client_name` and current `client_version` for every SocialGPT call.
- Keep values stable to let Tools API apply mobile-aware formatting/special-cases.

Android reply/verify workflow contract:
- Reply mode should prefer a suggestion-first flow where the user receives multiple candidate replies before refining one.
- Android should persist and reuse the latest `Your instruction` text across sessions until it changes.
- Modify/refine follow-ups should keep sending Android client metadata and can shape requests with `modifier`.
- Verify mode should default to deep verification intent from the start (`reasoning_effort=high`) and render a compact fact-result box in-app.

Important response fields:
- `ok`
- `model`
- `response`
- `usage`
- `used_fallback_model`
- optional additive `client` echo

## 7) Android UI blueprint (initial)

Phase-1 Android screens (recommended):

1. SocialGPT Home
- Quick actions: Reply, Verify fact, Test connection.
- Last-used model and language chips.
- Entry to a styled native bubble/toolbox surface for selected or captured text.

2. SocialGPT Settings
- Token input + Validate button/status
- Dev/Prod endpoint toggle
- Persona profile
- Response language
- Verify-fact language
- Preferred fact-check model
- Quick-reply preset and custom instruction
- Save and Test buttons
- Persist the latest `Your instruction` separately so Android can reuse it in reply mode until changed.

3. Reply Composer
- Input: context
- Input: persistent `Your instruction` (saved locally and reused until changed)
- Mood dropdown (maps to `modifier`)
- Model selector
- Response language selector
- Submit -> reply suggestions list (select one, then optional modify pass)
- The first successful response should be treated as candidate output, not as the only final answer path.
- A separate modify box should let the user refine the selected suggestion without rewriting the entire prompt.

4. Verify Fact
- Input text/context
- Model selector
- Verify action -> dedicated fact box in-screen (no extra console flow)
- Default request guidance: deep verification intent and compact mobile-readable output.

5. Suggestion Refine
- Selected suggestion + modify text box
- Re-run reply mode with selected suggestion as context + modify instruction
- Replace selected suggestion with refined output
- Keep the current mood/modifier selection visible and editable during refinement.

## 8) Android data/model blueprint (initial)

Recommended Android models:

- `ToolsEnvironment`
  - `isDev: Boolean`
  - `baseUrl: String`

- `SocialGptSettings`
  - `token: String`
  - `personaProfile: String`
  - `responseLanguage: String`
  - `verifyFactLanguage: String`
  - `preferredFactCheckModel: String`
  - `quickReplyPreset: String`
  - `quickReplyCustomInstruction: String`
  - `persistentInstruction: String`
  - `defaultMood: String`
  - `clientName: String`
  - `clientVersion: String`
  - `clientPlatform: String` (use `android_app`)

- `SocialGptModelOption`
  - `id: String`
  - `label: String`

- `SocialGptRequest`
  - payload matching `/api/ai/socialgpt/respond`
  - reply calls should support Android `modifier` / mood and persistent instruction reuse
  - verify calls should default to deep verification intent and include Android client metadata

- `SocialGptResponse`
  - `ok`, `model`, `response`, `usage`, `usedFallbackModel`, `client`

## 9) What not to copy 1:1 from extension

Do not directly replicate these in initial Android:
- Browser content-script overlays and DOM mark-mode features.
- Context-menu/browser action behavior.
- Tab/frame specific runtime state.

These are extension-shell concerns, not Android app concerns.

## 10) Suggested implementation phases for Android Studio

1. Phase A: Settings + auth foundation
- Token save/validate
- Environment toggle
- Settings load/save
- Model catalog load

2. Phase B: AI flows
- Reply screen (`request_mode=reply`)
- Verify screen (`request_mode=verify`)
- Result rendering + copy/share

3. Phase C: Polish and parity extras
- Usage metadata display
- Fallback model indicators
- Better presets and profile templates
- Optional analytics/admin feature surfaces if needed

## 11) Maintenance rule

Whenever SocialGPT extension changes these areas, update this document and Android `AGENTS.md` before Android coding begins:
- endpoint usage
- request/response fields
- setting keys/defaults
- model selection behavior
- token validation flow

