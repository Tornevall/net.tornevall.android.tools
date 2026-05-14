# Changelog

## 1.2.16 - 2026-04-13

### Added
- SocialGPT AI requests now send additive client metadata (`client_name`, `client_version`, `client_platform`) so the Tools backend can identify which extension build generated each request.

### Changed
- The extension now ships as version `1.2.16`.
- Tools-side SocialGPT replies are now allowed to disclose the currently used AI model identifier and the client version when a user explicitly asks for version/model information.

### Security
- Tools-side guardrails now explicitly block attempts to extract Tools internals such as source code, hidden prompts, `.env` values, tokens, passwords, or similar secrets from SocialGPT replies.
- When a SocialGPT request matches those secret-exfiltration patterns, Tools can report the incident to the configured support email address for follow-up.

## 1.2.15 - 2026-04-05

### Fixed
- Reply language selection now works independently from the popup/config UI language again, so choosing English, Danish, Norwegian, German, French, or Spanish no longer gets silently pulled back toward Swedish just because the browser UI is Swedish.
- Runtime UI translations no longer rewrite editable responder-profile or test-question textareas with localized defaults, which had started contaminating stored AI prompt content for some users.
- Existing users who were affected by the accidental Swedish default responder-profile text now get an automatic client-side repair path when the extension loads their settings.
- Sandboxed frames that block `sessionStorage` no longer throw a noisy uncaught security error from the Facebook admin reporter helper.

### Changed
- The built-in default responder profile and test question are now kept as stable canonical English defaults, while the surrounding popup/config labels can still be localized normally.
- Popup and config page now expose a separate **Extension language** selector (`Auto` / `English` / `Swedish`) so UI translation is explicitly independent from **Answer language** and **Verify-fact language**.
- The SocialGPT on-page UI now follows that same extension-language setting too, including Toolbox chrome, floating action buttons, fact-check result actions, and the background context-menu labels.

## 1.2.14 - 2026-04-05

### Changed
- Facebook admin statistics now require a new popup-level master toggle before any `admin_activities` overlay can appear on Facebook pages.
- The page-local `Enable activity statistics` button still exists, but it now only becomes available after the popup-level feature toggle has been turned on.
- Popup copy now explains the difference between the global Facebook admin statistics feature switch and the separate debug-diagnostics switch.
- The extension options/config page now mirrors the same editable settings as the popup instead of staying a scaffold with placeholder notes.
- The three main cards on the config page now expose the same token, environment, Facebook toggles, responder defaults, test question, reset flow, and dev debug console behavior as the popup.
- The stale companion-module wording about `sc4a-insights` was removed from the config page so the page no longer suggests a removed settings direction.
- Popup and config page UI copy now localize dynamically at runtime, with Swedish automatically used when the browser UI language is Swedish and English kept as fallback.
- Bearer-token fields in both popup and config page now show an inline validation spinner and a clear accepted/rejected confirmation while the token is checked against Tools.
- The popup now also includes an **Open Toolbox in active tab** shortcut so Toolbox can be opened even on pages where the normal right-click/context-menu flow is unreliable.
- If the page already has a live text selection when the popup shortcut is used, the extension now imports that selection directly into Toolbox instead of opening an empty panel.
- Toolbox mark mode can now stay in the old compact `[1]`, `[2]` format by default while the config page exposes a new advanced section for richer mark labels and broader DOM extraction.
- Advanced mark-mode users can now add generated mark ids (for example `tn-mark-2`), richer element descriptors, and optional `one parent up` / `one parent up + direct child scan` context expansion without changing the default workflow for everyone else.
- Advanced mark-mode extraction now also supports pulling in the **whole current frame/document text**, which is especially useful on iframe-backed/app-like pages when one small DOM block is too thin.
- When a richer mark-label mode is enabled, marked elements now also show a visible on-page badge while they are active, which makes it easier to map a selected DOM block back to the context shown in the Toolbox.
- The Toolbox panel itself is now draggable from its header instead of always snapping back to the composer edge.
- Text-selection actions were hardened for double-click and timing-sensitive pages so `Open Toolbox` / `Verify fact` appear more reliably after short direct text selections.
- Content scripts now run in nested frames too (including matching `about:blank` child frames), improving iframe-heavy page support where Chrome allows injection.

### Fixed
- Facebook admin activity handling no longer keeps passively processing admin-log payloads in a tab after the new popup-level feature toggle has been turned off.
- Mark mode no longer depends on a late page `click` alone; it now captures the target earlier, which reduces the accidental one-click shutdown/blur behavior seen on pages like WhatsApp.
- The Toolbox close `×` control now works again after the draggable-header change, instead of being swallowed by the header interaction.

### Added
- New lightweight endpoint: `GET /api/social-media-tools/extension/validate-token` for fast bearer-token verification without running an OpenAI smoke test.

## 1.2.13 - 2026-04-05

### Changed
- Facebook `admin_activities` overlay was simplified to one page-local `Enable activity statistics` control instead of exposing the noisy diagnostics by default.
- Facebook admin debug diagnostics got their own explicit popup opt-in instead of piggybacking on dev / beta mode.
- Facebook `admin_activities` route detection was hardened for SPA-style URL changes so the overlay can appear more reliably when Facebook navigates without a full page reload.

### Notes
- This entry is backfilled to keep the release history chronological between `1.2.14` and `1.2.12`.

## 1.2.12 - 2026-04-03

### ⭐ MAJOR: Chrome Web Store Compliance Update

**This version clarifies the extension's browser-wide scope and justifies the `<all_urls>` permission for Chrome Web Store submission.**

### Fixed
- **Selected-text overlay once again shows two actions** — `Open Toolbox` is now rendered next to `Verify fact` for plain text selections, instead of only showing the verify button.
- **Selected text can be imported directly into the Toolbox again** — clicking the restored `Open Toolbox` selection button opens the panel and preloads the selected text as context.
- **Verification result popup once again includes `Open Toolbox`** — after a fact-check finishes, the result box now exposes the same follow-up handoff into Toolbox instead of only showing `Refresh` and `Dig deeper`.
- **Background message handling cleaned up after reset/recovery edits** — duplicate `chrome.runtime.onMessage` wiring was collapsed back to one active handler while keeping the SoundCloud message endpoints intact.
- **Temporary false "missing token" states reduced** — content-script token checks now fall back to the background runtime settings reader before showing bearer-token-missing messaging, which helps after reload/sync drift.
- **Reply-output flow no longer crashes with `resetReplyTransientFieldsButKeepContext is not defined`** — transient reset helpers now live in top-level scope and the panel's `Context clear` handler is properly wired again.

### Changed
- **Manifest description updated**: Now clearly states "Browser-wide AI assistant" instead of narrow platform description
- **`host_permissions` set to `["<all_urls>"]`**: Required for content script injection on all sites
- **`content_scripts.matches` set to `["<all_urls>"]`**: Core feature requires browser-wide injection
- **Documentation complete**: Added `CHROME_WEB_STORE_COMPLIANCE.md` with full CWS submission guidance
- **Submission guide added**: `CHROME_WEB_STORE_SUBMISSION.md` now documents zip packaging, reviewer notes, and upload checklist for the current build
- **README updated**: Explains why `<all_urls>` is required and not restrictable
- **README + compliance docs synchronized with the current build**: browser-wide access is static via manifest in this revision (no separate popup global-mode toggle in the current reset state)
- **This is NOT a breaking change** — the extension already worked on all sites; this just documents it honestly

### Context
The extension is a browser-wide AI assistant (like Grammarly or 1Password). It provides:
- Text selection overlays for fact-checking and Open Toolbox on ANY website
- Right-click context menus available on all pages
- AI-assisted replies across the web

This **cannot** be restricted to specific domains without breaking the product.

Chrome Web Store accepts broad `<all_urls>` permissions when:
1. ✅ The extension's purpose clearly requires browser-wide access (ours does)
2. ✅ Documentation is transparent and honest (provided)
3. ✅ API calls are scoped to specific hosts (only tools.tornevall.net/com)
4. ✅ No remote code execution (all local)

### Related Documentation
- **Before CWS submission**: Read `CHROME_WEB_STORE_COMPLIANCE.md`
- **CWS submission templates**: Ready-to-use text in `CHROME_WEB_STORE_COMPLIANCE.md`
- **Compliance checklist**: Full verification steps in `CHROME_WEB_STORE_COMPLIANCE.md`

---

## 1.2.11 - 2026-04 (historical gap marker)

### Changed
- Historical version gap backfilled: `1.2.11` appears to have existed during the browser-wide / Chrome Web Store preparation cycle, but no preserved standalone release snapshot or trustworthy full note set remains after the later reset/recovery work.
- User-visible work from that lost checkpoint is only documented here when it could be re-verified in surviving code or reintroduced explicitly in `1.2.12`.

## 1.2.10 - 2026-04 (historical gap marker)

### Changed
- Historical version gap backfilled: `1.2.10` is currently treated as an unrecoverable repository-history gap.
- No standalone changelog-grade release record survived for this tag/version in the current workspace state, so features are intentionally **not** guessed or reconstructed here without code evidence.

## 1.2.9 - 2026-03/04 (historical gap marker)

### Changed
- Historical version gap backfilled: `1.2.9` appears to have been part of the same missing sequence between the preserved `1.2.8` state and the later `1.2.12` recovery/compliance work.
- Missing pieces from that period should be treated as "unknown unless re-verified in code" rather than assumed released.

## 1.2.8 - 2026-03-18

### Changed
- SoundCloud-specific capture work is now being moved toward the dedicated `sc4a-insights` companion module so the main Social Media Tools extension can stay less explicit about SoundCloud scraping-oriented internals
- Main extension copy now points more clearly toward companion/module-based expansion instead of promising that larger SoundCloud dataset controls will live directly inside this extension

## 1.2.7 - 2026-03-18

### Added
- A dedicated extension options page now exists as a larger future configuration surface, with centralized links to the Tools dashboard and forum/community entry points
- SoundCloud capture forwarding now keeps a small in-page buffer of recent payloads so the extension can recover more useful capture context even when message timing is noisy

### Changed
- Popup/status flow was trimmed again so short-form everyday controls stay in the popup while larger configuration/help content moves toward the options page
- Background/content-script coordination around SoundCloud capture state, pending deliveries, and page bridge communication was expanded for the newer multi-frame/main-world hook setup

### Fixed
- SoundCloud insights capture got another reliability pass so GraphQL payloads from the newer injected/main-world monitor are less likely to disappear between the page bridge and the extension runtime

## 1.2.6 - 2026-03-16

### Added
- Popup settings now autosave locally as you type/change values, and Tools-backed responder settings autosync automatically when a personal bearer token is present
- A dedicated shared SoundCloud page bridge now owns SoundCloud status/capture forwarding, reducing some SoundCloud-specific weight inside the main content script

### Changed
- SoundCloud auto-ingest is now opt-in by default and must be enabled explicitly from the popup before supported insights captures are pushed into Tools
- Several internal extension file names now use a more consistent kebab-case convention for shared helpers, the injected monitor, and the main content script entry

## 1.2.5 - 2026-03-15

### Added
- The reply/composer panel now includes explicit `Paste into field` and `Paste + Send` actions so generated text can be pushed back into the currently selected editor
- The public/admin Tools services page now includes a compact Social Media Tools card alongside the existing navbar/dashboard entry points

### Changed
- The floating composer CTA now uses a more generic `Fill in with Tools` label instead of reply-specific wording
- The floating composer CTA can now be dragged away from the active field and double-clicked to snap back to its anchored position
- Generated output now tries to auto-fill the active composer on supported platforms, while Facebook stays on a safer paste-first/manual-submit flow
- Generic nearby parent/sibling thread context is now gathered for non-Facebook editors to give the AI more visible discussion context when available

## 1.2.4 - 2026-03-12

### Changed
- Continued hardening of the Facebook admin-activity capture rollout with more monitor/background/content-script tuning around GraphQL/XHR parsing, popup diagnostics, and inline reporting behavior
- README and popup/dashboard copy were refreshed again to better reflect the broader Social Media Tools scope rather than a Facebook-only responder

### Fixed
- Stabilization fixes shipped around the post-`1.2.2` admin-activity rollout, including additional monitor/reporting edge-case handling before the later `1.2.5` UI work

## 1.2.3 - 2026-03-12

### Changed
- Historical version gap backfilled: `1.2.3` appears to have been used as an internal rollout checkpoint during the Facebook admin-activity capture work, but no preserved standalone tag remains in repository history
- User-facing work from that checkpoint was consolidated into the subsequent `1.2.4` stabilization cut

## 1.2.2 - 2026-03-12

### Added
- Facebook admin-activity network capture now extracts detected activity rows from the GraphQL/XHR payload and can mirror those detections to DevTools when debug diagnostics are enabled
- Facebook admin-activity pages now show passive reportable-entry previews even before statistics submission is enabled
- Facebook reply fields now get a cleaner thread-aware context, with cached XHR/GraphQL comment hints used when available

### Changed
- Facebook admin-activity submission now queues entries locally and uploads them to Tools in bulk instead of one HTTP request per detected row
- The inline Facebook statistics overlay is now draggable so it can be moved away from Facebook controls on the right side of the page
- Facebook activity interpretation now has clearer Swedish + English fallback matching for approval, rejection, removal, blocking, revocation, edit, and publish-style actions
- The reply panel now remembers the latest reply prompt and uses a better default prompt for repeated reply workflows

### Fixed
- Re-enabled practical Facebook admin-activity submission by basing the upload flow on detected XHR/GraphQL batches instead of relying only on visible DOM rows
- Automatic moderation entries without a human actor name can now still be stored safely in Tools using an automatic-moderation fallback actor
- The injected XHR monitor no longer throws `InvalidStateError` when Facebook uses binary `XMLHttpRequest.responseType` values such as `arraybuffer`

## 1.2.1 - 2026-03-11

### Added
- Inline diagnostics on Facebook `admin_activities` pages showing monitor state plus recent XHR/fetch summaries for admin-log capture
- Interesting Facebook admin-log network events are now mirrored into Chrome DevTools console with a clear `TN Social Tools` prefix
- Startup diagnostics now log the loaded extension version and whether the current Facebook route matched `admin_activities`

### Fixed
- Popup settings/test errors are now rendered as real validation or API messages instead of `[object Object]`
- Empty Tools-backed behavior/system-prompt values no longer wipe the extension prompt field
- Content script now fails quietly when an old page instance survives an extension reload and hits `Extension context invalidated`
- Facebook activity submission no longer crashes the Tools backend on missing `Illuminate\Support\Str` import during outcome normalization
- Facebook activity submission now runs through the extension service worker instead of direct page fetch, avoiding Facebook-origin CORS failures

### Changed
- Social Media Tools now opens directly into the Facebook dashboard while Facebook is the only active module
- The personal `tools_ai_bearer` token is surfaced from the Social Media Tools dashboard as well as My API Keys
- Facebook dashboard copy now clearly separates the Tools AI token from the Facebook-only ingest token
- The Tools dashboard now includes an editor for responder name, behavior/personality, auto-detect, and default mood values used by the extension
- The popup Test button is now a real end-to-end Tools → OpenAI smoke test instead of a token-only readiness check
- Tools personalization now supports a responder profile plus a larger custom-instruction block, and the interactive test uses a user-entered question
- Facebook ingest can now use the personal `tools_ai_bearer` token, making the dedicated ingest token optional
- Facebook admin dashboard defaults are easier to spot, and the popup dashboard reference is now shorter and less repetitive
- Facebook `admin_activities` detection is now rechecked during SPA-style URL changes so the page overlay appears more reliably
- Facebook `admin_activities` overlay now uses one `Enable activity statistics` control, and the noisy fetch/XHR diagnostics are hidden unless dev / beta mode is enabled
- README was rewritten as a standalone Chrome extension guide and no longer mixes in Laravel/backend repo instructions
- Facebook admin debug diagnostics now use a separate explicit popup opt-in instead of piggybacking on dev / beta server mode

## 1.2.0 - 2026-03-11

### Added
- Dev/beta environment toggle for `tools.tornevall.com`
- Popup test endpoint flow for validating bearer token + global `provider_openai`
- Dev-only popup debug console backed by service-worker logs
- Schema-aware backend settings store for extension user settings

### Changed
- Rebranded extension UI to **Tornevall Networks Social Media Tools**
- Moved responder name and behavior/personality persistence to Tools backend
- Improved popup messaging around personal bearer tokens and Tools-host selection
- Updated manifest description and README to reflect the broader Tools scope

### Fixed
- Prevented extension settings API from failing with HTTP 500 when the expanded settings columns are not yet present
- Made AI settings lookup compatible with both the legacy and expanded social-media-settings schema

