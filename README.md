# Tornevall Networks Tools for Android

A mobile companion for **Tornevall Networks Tools** platform, providing AI-powered reply suggestions, fact-checking, and intelligent screen capture directly from your phone or tablet.

## Features

### 🎯 Core Features
- **SocialGPT Reply Helper** - Generate smart reply suggestions based on screen content
- **Verify Fact** - Deep fact-checking with web search using GPT-5.4
- **Smart Screen Capture** - Three capture modes:
  - Visible screen (full viewport)
  - Selected element (focused capture)
  - While scrolling (multi-step capture)
- **Bubble Launcher** - Floating action panel accessible from any app
- **Clickable Links** - URLs in responses are automatically converted to clickable links

### 📦 UI/UX Features
- **Draggable Bubble Panel** - Move the bubble launcher anywhere on screen
- **Compact Dropdown Menus** - Capture and Verify options grouped in dropdowns
- **Progress Indicators** - Spinners show when generate/verify is running
- **Web Search Feedback** - Visual indicator when web search is used in responses
- **Tabbed Settings** - Organized settings by category (Connection, SocialGPT, Capture)

### 🔒 Security & Compatibility
- **Protected Apps Configurator** - Customize which apps disable Accessibility Service
  - Default: BankID, BankID Bus, BankID ID
  - Add/remove apps via Settings → Capture tab → "Protected apps"
  - Automatically disables service when protected apps are active
- **BankID Smart Blocking** - Automatically disables capture when BankID/protected apps are active
  - Prevents app from interfering with BankID authentication
  - Auto-restarts when protected app closes
- **Accessibility Service with Safeguards**
  - Reads only visible screen text
  - Deep focus element detection
  - Protected app detection (BankID, secure paymentapps)

### 🎮 Advanced Features
- **Customizable Bubble Size** - Small, Medium, or Large
- **Persisted Composer State**
  - Auto-saves your reply instructions
  - Remembers mood, model, and language preferences
- **Tools Persona Sync**
  - The app refreshes SocialGPT settings from `GET /api/social-media-tools/extension/settings`
  - `persona_profile` is treated as the primary reusable composer persona/prompt from Tools
  - Remote persona updates can refresh the Android composer automatically when your local prompt still matches the last Tools-synced value
- **Mood & Model Selection**
  - Reply mood: balanced, friendly, formal, firm, casual
  - Reply model: gpt-4o (default) or others
  - Verify model: gpt-5.4 (with medium reasoning depth)
- **Client Metadata Tracking** - App sends `android_app` platform hint to Tools API

## Installation

### Prerequisites
- **Android 8.0+** (API 27+)
- Target SDK: **Android 15** (API 36)
- JDK 17+
- Android Studio (Jellyfish or later recommended)

### Build Steps

1. Clone the repository:
```bash
git clone <repository-url>
cd net.tornevall.android.tools
```

2. Set up your environment:
```bash
# Ensure JDK 17+ is in PATH
java -version

# Install Android SDK (if not already in Android Studio)
```

3. Build the debug APK:
```bash
./gradlew assembleDebug
```

4. Install on device:
```bash
./gradlew installDebug
```

5. Or open in Android Studio:
   - File → Open → Select project root
   - Build → Make Project (or Ctrl+F9)

## Configuration

### 1. Add Your Tools API Token

1. Open the app → **Settings** → **Connection** tab
2. Paste your **Tools bearer token** from `tools.tornevall.com/settings`
3. Switch between **Dev** (tools.tornevall.com) and **Prod** (tools.tornevall.net) as needed
4. Tap **Validate token** to test the connection

### 2. Enable Required Permissions

The app needs two system permissions:

#### Accessibility Service (required for screen capture)
1. Go to **Settings** → **Connection** tab
2. Tap **Open Accessibility Settings**
3. Find **Tornevall Networks Tools for Android**
4. Toggle **Accessibility** to ON
5. Confirm the allow prompt

This grants the app permission to:
- Read visible screen text
- Detect focused elements
- Capture while scrolling

#### Overlay Permission (required for bubble launcher)
1. Go to **Settings** → **Connection** tab
2. Tap **Grant overlay permission**
3. Allow the app to display over other apps

### 3. Configure SocialGPT Preferences (Optional)

1. **Settings** → **SocialGPT** tab
2. **Reply model** - Default: `gpt-4o` (adjustable)
3. **Reply mood** - Default: `balanced` (friendly, formal, firm, casual)
4. **Fact-check model** - Default: `gpt-5.4`
5. **Default instruction** - Pre-fill reply hints (e.g., "Keep it short and friendly")
6. **Bubble size** - Small, Medium (default), or Large

### 4. Configure Protected Apps (Optional)

Protected apps automatically disable Accessibility Service when active. Default list includes BankID and banking apps.

1. **Settings** → **Capture** tab
2. **Protected apps** - Tap to view/edit list
3. **Add app** - Enter package name (e.g., `com.bankid`, `com.example.app`)
4. **Remove app** - Swipe or long-press to remove
5. **Save** - Changes save automatically

#### Default Protected Apps
- `com.bankid` - BankID
- `com.bankid.bus` - BankID Bus
- `com.bankid.id` - BankID ID

Add banking, payment, or other sensitive apps that should disable the service.

## Usage

### Starting the Bubble Launcher

1. **From app**: Settings → SocialGPT tab → "Start bubble launcher"
2. **From system shortcut** (if enabled): Bottom-right accessibility button
3. **From notification**: Long-press persistent capture notification → "Start"

### Using the Bubble Launcher

Once active, a small floating bubble appears on-screen:

**Tap bubble** → Panel opens with:
- **📸 Capture** dropdown → Visible screen / Selected element / While scrolling
- **✓ Verify** dropdown → Verify visible screen / Verify selected element
- **✎ Tasks** → Opens Reply helper (main app)
- **−** → Minimize panel
- **⊗** → Stop bubble

**Drag the bubble** → Grab header area to move it anywhere on screen
**Drag the panel** → Grab "Tools" header to reposition the expanded menu

### Generating Reply Suggestions

1. **Capture screen content** using bubble or app
2. **Edit/add context** in "Original post" field
3. **Enter instruction** in "Your instruction" (auto-saved)
4. **Tap Generate reply suggestions** → See 3 suggestions
5. **Select one** → Shows as selected
6. **Modify** selected suggestion → Add modifier instruction + mood
7. **Tap Apply modify** → Refined version replaces selection
8. **Copy** final version to clipboard when ready

### Fact-Checking Content

1. **Paste content** into "Original post"
2. Instruction not needed (uses deep fact-check prompt)
3. **Tap Verify fact** → Shows result in dedicated box
4. Results show:
   - Fact-check analysis
   - 🔍 Web search indicator (if used)
   - Clickable references (if any)
5. **Read aloud** available if text-to-speech is enabled

### Markdown & Link Support

Responses automatically render:
- **Markdown links**: `[text](url)` → Clickable links
- **Plain URLs**: Auto-detected and clickable
- **Markdown formatting**: `**bold**`, `_italic_`, `` `code` ``, headers
- **Lists**: `- item` → Bullet points

Tap any link to open in browser.

## Architecture

### Project Structure

```
app/src/main/
├── java/net/tornevall/android/tools/
│   ├── MainActivity.kt                          # App entry point
│   ├── data/
│   │   ├── settings/
│   │   │   └── ToolsTokenStore.kt              # Shared preferences storage
│   │   └── socialgpt/
│   │       ├── ToolsSocialGptClient.kt         # API HTTP client
│   │       ├── ToolsExtensionClient.kt         # Extension settings API
│   │       └── ToolsSocialGptException.kt      # Error handling
│   ├── ui/
│   │   ├── socialgpt/
│   │   │   ├── SocialGptFragment.kt            # Reply helper UI
│   │   │   └── SocialGptViewModel.kt           # State management
│   │   ├── settings/
│   │   │   └── SettingsFragment.kt             # Tabbed settings
│   │   └── Other fragments (Capture, Import, etc)
│   ├── accessibility/
│   │   └── ToolsReaderAccessibilityService.kt  # Screen capture engine
│   └── overlay/
│       └── ToolsBubbleService.kt               # Floating bubble launcher
├── res/
│   ├── layout/
│   │   ├── fragment_socialgpt.xml              # Reply helper layout
│   │   ├── fragment_settings.xml               # Tabbed settings layout
│   │   └── Other layouts
│   ├── menu/
│   │   ├── menu_capture_options.xml            # Dropdown: capture modes
│   │   └── menu_verify_options.xml             # Dropdown: verify modes
│   ├── values/
│   │   └── strings.xml                         # All string resources
│   └── drawable/
│       └── Custom icons & backgrounds
└── AndroidManifest.xml                         # Permissions & components

```

### Key Components

#### **SocialGptViewModel** (State Management)
- Manages UI state: responses, suggestions, loading states
- Handles generate and verify requests
- Tracks web search usage
- Separates loading flags for generate vs verify operations

#### **ToolsSocialGptClient** (API Integration)
- HTTP client using `HttpURLConnection` (no external library dependencies)
- Sends requests to Tools `/api/ai/socialgpt/respond`
- Parses web_search metadata from response
- Handles fallback model logic

#### **ToolsReaderAccessibilityService** (Screen Capture)
- Reads visible text via `AccessibilityNodeInfo`
- Three capture modes:
  - Full window traversal
  - Focused element detection
  - Multi-step scroll capture
- BankID detection and auto-blocking
- Protected app handling

#### **ToolsBubbleService** (Floating Interface)
- WindowManager overlay at `TYPE_APPLICATION_OVERLAY`
- Draggable bubble + expandable panel
- PopupMenu for dropdown options
- Notification when BankID is active

## BankID Compatibility

### The Problem
- BankID blocks when ANY accessibility service can read screen content
- This is a security feature to prevent credential harvesting

### Our Solution - Protected Apps
1. **Automatic Detection** - App detects when protected apps are active
2. **Smart Disable** - Accessibility service disables completely (not just paused)
3. **Customizable List** - Add/remove apps via Settings → Capture → Protected apps
4. **Default Protected Apps** - BankID, BankID Bus, BankID ID
5. **User Notification** - Clear message with link to re-enable when done
6. **No Manual Steps** - Everything happens automatically

#### How It Works
- When a protected app is detected, the Accessibility Service is completely disabled
- BankID (or protected app) cannot be blocked because the service isn't reading your screen
- Notification guides you to re-enable the service in Settings when done
- Service stays enabled in other apps - no need to manually toggle it

### Customizing Protected Apps

Add your own apps that should disable Accessibility Service:

1. Go to **Settings** → **Capture** tab
2. Tap **Protected apps** → **Add app**
3. Enter the app's package name:
   - Example: `com.bankid` (BankID)
   - Example: `com.example.mybank` (Your bank's app)
   - Example: `com.payapp` (Payment app)
4. Apps automatically added: BankID, BankID Bus, BankID ID

**Tip**: Look up app package names:
- Android Settings → Apps → App info → Package name (may vary by device)
- Online APK databases like APKPure or similar

### Using Protected Apps While Tools is Active
1. ✅ Your protected apps added to the list
2. ✅ Open protected app → Accessibility service auto-disables
3. ✅ Complete authentication safely (no blocking!)
4. ✅ Close protected app → Notification appears
5. ✅ Tap notification to re-enable service for other apps

Perfect flow - just use your banking/payment apps normally!

## API Integration

### Authentication
All requests include:
- Bearer token from Tools API (`Authorization: Bearer <token>`)
- Client metadata:
  - `client_name`: "Tornevall Networks Tools for Android"
  - `client_platform`: "android_app"
  - `client_version`: Built from BuildConfig.VERSION_NAME

### Endpoints Used

#### `POST /api/ai/socialgpt/respond`
Main endpoint for reply suggestions and fact-checking.

**Request Fields:**
```json
{
  "context": "Original text or post",
  "user_prompt": "Your instruction (for reply mode)",
  "modifier": "mood | deep_fact_check (for verify)",
  "model": "gpt-4o | gpt-5.4",
  "request_mode": "reply | verify",
  "response_language": "sv | en | auto",
  "reasoning_effort": "medium | high",
  "client_name": "Tornevall Networks Tools for Android",
  "client_platform": "android_app",
  "client_version": "X.Y.Z"
}
```

**Response Fields:**
```json
{
  "ok": true,
  "response": "Generated text",
  "model": "model used",
  "used_fallback_model": false,
  "web_search": {
    "used": true|false,
    "required": true|false,
    "failed": true|false
  }
}
```

#### `GET /api/social-media-tools/extension/settings`
Fetches user settings from Tools platform.

#### `POST /api/social-media-tools/extension/test`
Tests OpenAI connectivity.

## Troubleshooting

### "Token rejected" or "Forbidden"
- Check your Tools token is valid (test in Tools web UI)
- Verify you have OpenAI access approved
- Try validating the token in app Settings

### Capture returns "No readable text found"
- Ensure Accessibility Service is enabled
- Try a different capture mode (focused element vs full screen)
- Current app may not expose accessible text

### BankID still blocks while bubble is stopped
- This is expected - BankID blocks ANY accessibility service being enabled
- If issues persist, temporarily disable Accessibility in system Settings
- Re-enable after BankID completes

### Links in responses aren't clickable
- Ensure you're using the latest app version
- Try restarting the app
- Links are automatically detected for `http://` and `https://` URLs

### Bubble doesn't appear or crashes
- Check overlay permission is granted
- Verify overlay permission in Settings → Applications → Special app access
- Try restarting the bubble from Settings

### Settings don't persist
- Close and reopen the app
- Settings use SharedPreferences (stored device-local)
- Clearing app cache will reset settings

## Development

### Tech Stack
- **Language**: Kotlin
- **Min SDK**: 27 (Android 8.0)
- **Target SDK**: 36 (Android 15)
- **Build Tool**: Gradle 9.3.1
- **Architecture**: MVVM with LiveData
- **Networking**: `HttpURLConnection` (no external HTTP library)
- **Persistence**: SharedPreferences

### Building for Release

```bash
# Create release build
./gradlew assembleRelease

# Sign the APK (requires keystore)
# Use Android Studio: Build → Generate Signed Bundle/APK
```

### Running Tests

```bash
# Unit tests
./gradlew testDebugUnitTest

# Instrumented tests (requires device/emulator)
./gradlew connectedDebugAndroidTest
```

### Project Dependencies

See `gradle/libs.versions.toml` for complete dependency list. Key dependencies:
- `androidx.appcompat:appcompat`
- `androidx.lifecycle:lifecycle-viewmodel`
- `com.google.android.material:material`
- `androidx.core:core`
- `androidx.navigation:navigation-fragment-ktx`

## Permissions Required

```xml
<!-- Network access for API calls -->
<uses-permission android:name="android.permission.INTERNET" />

<!-- Accessibility service (granted via system settings) -->
<service android:name=".accessibility.ToolsReaderAccessibilityService"
    android:permission="android.permission.BIND_ACCESSIBILITY_SERVICE" />

<!-- Post notifications on Android 13+ -->
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
```

## Settings Storage

All settings stored locally using SharedPreferences:
- **Token** - Tools bearer token
- **Base URL** - Dev or production API endpoint
- **Instructions** - Saved reply guidance
- **Preferences** - Model, mood, language, bubble size
- **State** - Last used settings for next session

Settings are **device-local** and **never uploaded** to Tools platform (except when explicitly syncing profile from web UI).

## Future Enhancements

Planned features:
- [ ] Retrofit/OkHttp API service layer
- [ ] Compose UI modernization
- [ ] Hilt dependency injection
- [ ] Offline message queue
- [ ] Custom response templates
- [ ] Multi-language UI translations
- [ ] Dark mode improvements

## License

Tornevall Networks proprietary software. See LICENSE file for details.

## Support

For issues, feature requests, or questions:
1. Check [Tools docs](https://tools.tornevall.com)
2. Open issue in project repository
3. Contact support via Tools platform

## Changelog

### Version 1.0.0 (Current)
- ✅ SocialGPT reply suggestions
- ✅ Verify fact with GPT-5.4
- ✅ Smart screen capture (3 modes)
- ✅ Draggable bubble launcher
- ✅ Clickable links in responses
- ✅ BankID smart blocking
- ✅ Progress indicators
- ✅ Web search feedback
- ✅ Tabbed settings
- ✅ Persist composer state

---

**Last Updated**: May 14, 2026  
**Current Version**: 1.0.0  
**Android Target**: 15 (API 36)

