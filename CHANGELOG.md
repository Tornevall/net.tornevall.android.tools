# Changelog

All notable changes to Tornevall Networks Tools for Android will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-05-14

### Added
- **Protected Apps Configurator** - Users can now add/remove apps to automatically disable Accessibility Service when they're active
  - Default protected apps: BankID, BankID Bus, BankID ID
  - Configurable via Settings → Capture tab
  - Smart disable mechanism prevents app interference with secure banking/payment apps
- **Draggable Bubble Panel** - Move bubble launcher anywhere on screen by dragging the header
- **Compact Dropdown Menus** - Capture and Verify options grouped in organized dropdowns
  - Capture: Visible screen, Selected element, While scrolling
  - Verify: Visible screen, Selected element
- **Progress Indicators & Spinners** - Visual feedback for generate/verify operations
- **Web Search Feedback** - Visual indicator when web search is used in responses
- **Clickable Links in Responses** - Automatic detection of markdown and plain URLs
- **Tabbed Settings UI** - Organized by Connection, SocialGPT, Capture tabs
- **Tools Persona Sync Guidance** - The Android AGENTS contract now documents that `GET /api/social-media-tools/extension/settings` is the correct source for SocialGPT persona/profile sync and explains how Android should map `persona_profile`, `custom_instruction`, and language fields.

### Fixed
- BankID compatibility - Accessibility service now disables completely when protected apps are active
- Bubble panel layout - Fixed overlapping buttons and improved spacing
- Response rendering - Added proper HTML link support with LinkMovementMethod
- SocialGPT persona refresh - the Android app now treats the Tools-side `persona_profile` as the primary reusable composer instruction, keeps a separate last-synced Tools prompt marker, and refreshes the composer when the remote Tools persona changes instead of staying stuck on one older locally cached instruction.

### Changed
- Protected apps now configurable instead of hardcoded
- Bubble panel now draggable and compact (220dp width)
- Better notification messaging for protected app events
- SocialGPT startup/resume now also refreshes the reusable prompt from `GET /api/social-media-tools/extension/settings`, while still preserving explicit local in-progress edits when they no longer match the previous Tools-synced value.

## [1.0.0] - 2026-04-14

### Added
- **SocialGPT Reply Helper** - Generate 3 smart reply suggestions with AI
- **Verify Fact** - Deep fact-checking with GPT-5.4 and web search
- **Smart Screen Capture** - Three capture modes:
  - Visible screen (full viewport)
  - Selected element (focused capture)
  - While scrolling (multi-step capture)
- **Floating Bubble Launcher** - Accessible from any app
- **AI Model Selection** - Choose between reply and verify models
- **Mood & Language Settings** - Customize tone and output language
- **Persisted Composer State** - Auto-saves instructions for consistent replies
- **Accessibility Service** - Reads visible screen text for context
- **Bubble Size Customization** - Small, Medium, or Large options
- **Settings Synchronization** - Load/save settings from Tools platform

## Tagging Instructions

To create a release tag:

```bash
# Create annotated tag
git tag -a v1.1.0 -m "Release version 1.1.0 - Protected Apps Configurator"

# Push tag to remote
git push origin v1.1.0

# Or push all tags at once
git push origin --tags

# List all tags
git tag -l

# Show tag details
git show v1.1.0
```

## Version History Reference

- **v1.1.0** - May 14, 2026 - Protected Apps Configurator, UI improvements, BankID fixes
- **v1.0.0** - April 14, 2026 - Initial release with SocialGPT and accessibility capture

