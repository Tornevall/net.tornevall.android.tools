# Tornevall Networks Social Media Tools

**A browser-wide AI assistant and fact-checking companion for Chrome.**

This extension provides text selection overlays, fact-checking controls, and AI-assisted replies on ANY website you visit. It's powered by the Tornevall Networks Tools platform.

### 🔗 Quick Links

- **GitHub Project**: https://github.com/Tornevall/tornevall-networks-social-media-tools
- **Tools Platform**: https://tools.tornevall.net
- **Chrome Web Store**: live release track since `1.2.12` *(latest fixes shipping in `1.2.16`)*

---

## 🎯 What It Does

**Everywhere on the web:**
- ✅ Select any text and see floating "Verify fact" and "Open Toolbox" buttons
- ✅ Right-click anywhere to access "Open Toolbox" or "Verify fact" context menus
- ✅ Open Toolbox directly from the popup when right-click/context-menu flow is unreliable on a site
- ✅ Get AI-powered replies and fact-checking via Tornevall Networks Tools
- ✅ After a fact-check result appears, continue with the same context using the result-box `Open Toolbox` action

**On specific platforms:**
- 📘 **Facebook**: Admin activity reporting (with permission)
- 🎵 **SoundCloud**: Insights capture and analytics (with permission)
- 𝕏 **X/Twitter**: Platform-specific tooling

---

## 🔧 Architecture: Why `<all_urls>` Permission?

**This extension REQUIRES `<all_urls>` in BOTH places:**

```json
"host_permissions": ["<all_urls>"],
"content_scripts": [{
  "matches": ["<all_urls>"],
  ...
}]
```

**Why?** The extension's core feature is a browser-wide AI assistant. Users need to:
1. Select text on ANY website and fact-check it
2. Use context menus on ANY page
3. Get AI replies in text fields anywhere

**Can we restrict this?** NO. Restricting it breaks the product.

**Current build note:** after the recent reset/recovery cycle, the browser-wide scope is provided directly by the static manifest configuration (`host_permissions` + `content_scripts.matches` both set to `<all_urls>`). There is currently **no separate popup toggle** for browser-wide mode in this build.

This is identical to:
- **Grammarly**: Grammar checking on all sites
- **1Password**: Password manager on all sites
- **uBlock Origin**: Ad-blocking on all sites

---

## 📥 Installation & Setup

### Load from Source

1. Clone or download this repository
2. Open `chrome://extensions/`
3. Enable "Developer mode" (top right)
4. Click "Load unpacked" and select this folder

### Get a Bearer Token

1. Visit **https://tools.tornevall.net**
2. Create an account
3. Generate a **personal bearer token**
4. Paste it into the extension popup or the full config page

---

## 🛡️ Privacy & Security

- ✅ All JavaScript is bundled locally (no remote code execution)
- ✅ API calls go ONLY to `tools.tornevall.net` and `tools.tornevall.com`
- ✅ Extension requires bearer token activation
- ✅ All settings stored locally in extension storage
- ✅ No hidden network requests
- ✅ AI requests now include the extension version/build metadata so Tools can identify which SocialGPT client revision generated a request
- ✅ Tools-side SocialGPT guardrails explicitly allow disclosure of the current AI model/client version when asked, while blocking attempts to extract source code, `.env` data, passwords, tokens, or hidden prompts

---

## 📚 Documentation

| File | Purpose |
|------|---------|
| **CHROME_WEB_STORE_SUBMISSION.md** | ⭐ Short release + submit guide for Chrome Web Store |
| **CHROME_WEB_STORE_COMPLIANCE.md** | ⭐ READ THIS before CWS submission |
| CHANGELOG.md | Version history |
| manifest.json | Extension configuration |

---

## 🚀 For Chrome Web Store Submission

**This extension is CWS-compliant** because:
- ✅ Honest description (says "browser-wide")
- ✅ Justified permissions (explains why `<all_urls>` is needed)
- ✅ Limited API surface (only Tools servers)
- ✅ No remote code (all local)
- ✅ User authentication required

**Before submitting to CWS:** Read `CHROME_WEB_STORE_COMPLIANCE.md` for:
- Ready-to-use submission text templates
- Answers to common reviewer questions
- Full compliance checklist

For packaging and upload steps, use `CHROME_WEB_STORE_SUBMISSION.md`.

---

## ⚙️ Manifest Overview

```json
{
  "description": "Browser-wide AI assistant and social media toolkit...",
  "host_permissions": ["<all_urls>"],          // ← Required for injection
  "content_scripts": [{
    "matches": ["<all_urls>"],                 // ← Required for overlay
    "js": [...],
    "css": [...]
  }]
}
```

Both `<all_urls>` entries are REQUIRED and intentional.

---

## 🔑 Features

- **AI Replies**: Compose AI-powered responses on any page
- **Fact-Checking**: Select text to instantly verify
- **Settings Sync**: Preferences sync with Tools platform
- **Platform Integrations**: Facebook admin stats, SoundCloud insights
- **Dev Mode**: Debug console and connection testing

## Configuration surfaces

The extension now has two equivalent settings surfaces:

- **Popup** — the compact quick editor for day-to-day changes
- **Config page / options page** — a larger, clearer layout that mirrors the same settings and autosave behavior

Both surfaces read/write the same extension storage keys and trigger the same Tools-backed autosave logic when a personal bearer token is configured.
Both surfaces also localize dynamically at runtime, with Swedish selected automatically when the browser UI prefers Swedish and English used as fallback.
There is now also an explicit **Extension language** setting (`Auto`, `English`, `Swedish`) so the extension UI can be controlled separately from the actual AI reply language.
That UI localization is kept separate from the actual AI reply language choice, so **Answer language** / **Verify-fact language** still control generated output independently.

The same extension-language setting now also reaches the on-page SocialGPT UI itself:

- Toolbox labels and buttons
- floating `Open Toolbox` / `Verify fact` action buttons
- fact-check result actions and subtitles
- background context-menu labels

When you paste or edit the bearer token, the UI now performs a lightweight API validation call and shows an inline spinner plus a success/error confirmation before you run the full **Test Tools → OpenAI** smoke test.

As of `1.2.15`, localized UI defaults no longer overwrite your responder profile or test-question content. This specifically fixes the regression where some Swedish-browser users could end up with Swedish-biased prompt defaults even after choosing another answer language.

The popup now also includes an **Open Toolbox in active tab** shortcut. If the current page already has a live text selection, the extension imports that selection into Toolbox automatically, which gives you a fallback on pages where the normal context-menu flow is flaky.

The larger **config / options page** now also includes an **Advanced mark-mode context** section for the Toolbox:

- keep the current compact `[1]`, `[2]` style as the default
- optionally add a generated mark id such as `tn-mark-2`
- optionally include richer element details in the marked-context headers
- optionally expand marked context extraction to **one parent up**
- optionally expand further to **one parent up + direct child scan** when the default marked block is too thin
- optionally switch to **whole current frame/document text** when the useful text lives inside an iframe or other app-like surface

These advanced mark-mode settings are local to the extension and intentionally do not change the default compact behavior unless you enable them.

The Toolbox panel itself is now draggable from its header, and the text-selection overlay was hardened so short/double-click selections trigger **Open Toolbox** / **Verify fact** more reliably.
The Toolbox header close button (`×`) now also works again alongside the draggable header behavior.

---

## 📞 Support

- **Register & token**: https://tools.tornevall.net
- **Forum**: https://forum.tornevall.net
- **Compliance questions**: See CHROME_WEB_STORE_COMPLIANCE.md

---

✅ **Ready for CWS submission? Check CHROME_WEB_STORE_COMPLIANCE.md first.**

## Facebook admin activities

On Facebook group `admin_activities` pages, the extension can:

- stay completely inactive unless **Enable Facebook admin activity statistics** is turned on in the popup
- observe relevant page activity in the current tab
- show a single inline control for enabling activity statistics
- extract detected activity rows directly from Facebook XHR / GraphQL responses
- queue detected rows locally and submit them to Tools in bulk instead of one request per row
- keep the page overlay draggable so it does not block Facebook UI elements
- show a local preview of reportable admin-log entries before statistics submission is enabled

The popup toggle is the global master switch for this feature.
If it is turned off, Facebook `admin_activities` pages stay quiet and no admin-statistics overlay is shown.

When the popup toggle is turned on, the Facebook-side monitor can activate on matching pages so the extension can detect relevant `admin_activities` data in the open tab.
Even then, no statistics are submitted to Tools unless the user explicitly enables statistics submission from the inline page control on that exact Facebook page.

Statistics submission is disabled by default on each page load.
If the Facebook page is reloaded or reopened, submission must be explicitly enabled again.

The point is to keep the Facebook-side workflow simple and page-local.
The actual Tools submit is performed by the extension runtime, not directly by the Facebook page context, to avoid browser CORS issues.

## Facebook reply context

On Facebook comment/reply fields, the reply panel tries to build a cleaner thread-aware context by:

- anchoring to the active reply composer
- detecting the likely reply target from the surrounding comment thread
- reusing recent comment/thread hints captured from Facebook XHR / GraphQL responses when available
- remembering the last reply prompt so repetitive moderation/reply workflows are faster

Reply generation and reply-assistance features are user-initiated.
The extension does not post or submit replies automatically.

## Advanced mark mode context

When you use **Mark context** inside the Toolbox, the extension still defaults to compact numbered sections such as `[1]` and `[2]`.
If you need more traceability on visually noisy pages, open the **config / options page** and expand **Advanced mark-mode context**.

Available advanced behaviors:

- **Compact numbering only** — current default, keeps the existing minimal headers
- **Numbering + generated mark id** — adds a stable local marker such as `tn-mark-1`
- **Numbering + mark id + element details** — also shows a short CSS-like element descriptor and a name/text hint when available
- **Current marked block only** — current extraction behavior
- **Go one parent up** — extracts one DOM level above the marked block
- **Go one parent up + scan direct child blocks** — keeps the broader parent context and also summarizes nearby direct child blocks
- **Use the whole current frame/document text** — captures the visible text from the current page/frame document, which is useful when the real content sits inside an iframe or larger app shell

When a richer label mode is enabled, marked elements also get a visible local badge on the page while they are active, which makes it easier to map the marked DOM node back to the context text shown in the Toolbox.

The extension now also runs its content scripts in nested frames (including matching `about:blank` child frames) where Chrome allows it, so mark mode and selection overlays can work inside more iframe-backed surfaces.


## Local storage

The extension keeps a small local cache for convenience.

Stored locally in Chrome:

- bearer token
- current environment flag (`devMode`)
- Facebook admin statistics feature flag (`facebookAdminStatsEnabled`)
- last synced responder values for UI fallback
- temporary in-session admin activity data pending optional submission

## Troubleshooting

If **dev / beta mode** is enabled:

- the popup shows a debug console

If **Enable Facebook admin debug diagnostics** is enabled in the popup:

- Facebook `admin_activities` pages can show extra diagnostics
- interesting page events can be mirrored to Chrome DevTools console with the `TN Social Tools` prefix
- detected admin-log entries can also be mirrored to the console before a bulk upload is sent

If **Enable Facebook admin activity statistics** is disabled in the popup:

- Facebook `admin_activities` pages do not show the admin-statistics overlay
- admin-log detections are not processed in that tab
- you can re-enable the feature later from the popup and then opt in again on the current Facebook page

The injected network monitor skips unsafe direct `responseText` reads for binary XHR response types such as `arraybuffer` and `blob`, so Facebook background traffic should no longer crash the page monitor while text/JSON admin-log payloads remain readable.

If Facebook activity submission returns a server-side 500 error, make sure the Tools server is updated to the matching backend version for the extension workflow.

If you change extension files locally, reload the extension in `chrome://extensions` before testing again.

If you see `Uncaught ReferenceError: resetReplyTransientFieldsButKeepContext is not defined`, reload both the extension and the active page tab so the latest `content-script.js` is injected.

