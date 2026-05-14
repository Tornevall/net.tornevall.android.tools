package net.tornevall.android.tools.accessibility

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.AccessibilityButtonController
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.provider.Settings
import android.content.pm.PackageManager
import android.os.Build
import android.os.SystemClock
import android.text.TextUtils
import android.widget.Toast
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import androidx.core.content.ContextCompat
import androidx.core.app.NotificationCompat
import net.tornevall.android.tools.MainActivity
import net.tornevall.android.tools.R
import net.tornevall.android.tools.data.settings.ToolsTokenStore
import net.tornevall.android.tools.overlay.ToolsBubbleService

/**
 * ToolsReaderAccessibilityService
 *
 * How it works:
 * 1. User enables the service in Android Settings → Accessibility → [app name].
 *    This grants the service permission to read ALL visible text on screen via
 *    AccessibilityNodeInfo (the same API screen readers like TalkBack use).
 *
 * 2. The service runs in the background and posts a persistent notification with
 *    a "Capture" action button.
 *
 * 3. When the user taps "Capture" in the notification:
 *    - The service reads the active window's text content.
 *    - Opens MainActivity (reply helper) with the captured text pre-filled in Context.
 *
 * Required permission (declared in manifest): BIND_ACCESSIBILITY_SERVICE
 * User must grant it manually in Android Accessibility settings — no runtime prompt.
 *
 * Note: This service does NOT require INTERNET permission itself. It only reads
 * on-screen text and hands it off to the app UI.
 */
class ToolsReaderAccessibilityService : AccessibilityService() {

    private lateinit var tokenStore: ToolsTokenStore

    private val accessibilityButtonCallback =
        object : AccessibilityButtonController.AccessibilityButtonCallback() {
            override fun onClicked(controller: AccessibilityButtonController) {
                if (!tokenStore.isAccessibilityShortcutEnabled()) {
                    return
                }
                if (isProtectedAppForeground) {
                    toastProtectedAppHint()
                    return
                }
                val bubbleIntent = Intent(this@ToolsReaderAccessibilityService, ToolsBubbleService::class.java)
                if (ToolsBubbleService.isRunning) {
                    stopService(bubbleIntent)
                    Toast.makeText(this@ToolsReaderAccessibilityService, R.string.settings_bubble_stopped, Toast.LENGTH_SHORT).show()
                } else {
                    startService(bubbleIntent)
                    Toast.makeText(this@ToolsReaderAccessibilityService, R.string.socialgpt_bubble_started, Toast.LENGTH_SHORT).show()
                }
            }
        }

    override fun onServiceConnected() {
        super.onServiceConnected()
        tokenStore = ToolsTokenStore(this)
        activeService = this
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            accessibilityButtonController.registerAccessibilityButtonCallback(accessibilityButtonCallback)
        }
        createNotificationChannel()
        showCaptureNotification()
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        val packageName = event?.packageName?.toString().orEmpty()
        val protectedNow = isProtectedPackage(packageName)
        isProtectedAppForeground = protectedNow

        if (protectedNow) {
            if (ToolsBubbleService.isRunning) {
                stopService(Intent(this, ToolsBubbleService::class.java))
                showBankIdBlockingNotification()
            }
        } else {
            // Clear BankID notification when user leaves BankID app
            val nm = getSystemService(NotificationManager::class.java)
            nm?.cancel(BANKID_NOTIFICATION_ID)
        }
    }

    override fun onInterrupt() {
        // No-op: required override.
    }

    override fun onDestroy() {
        val nm = getSystemService(NotificationManager::class.java)
        nm?.cancel(NOTIFICATION_ID)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            accessibilityButtonController.unregisterAccessibilityButtonCallback(accessibilityButtonCallback)
        }
        if (activeService === this) {
            activeService = null
        }
        super.onDestroy()
    }

    override fun onUnbind(intent: Intent?): Boolean {
        val nm = getSystemService(NotificationManager::class.java)
        nm?.cancel(NOTIFICATION_ID)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            accessibilityButtonController.unregisterAccessibilityButtonCallback(accessibilityButtonCallback)
        }
        if (activeService === this) {
            activeService = null
        }
        return super.onUnbind(intent)
    }

    // ── Capture ──────────────────────────────────────────────────────────────

    /**
     * Reads all visible text from the current window and returns it as a single string.
     * Called from the PendingIntent-triggered capture path.
     */
    private fun captureCurrentWindowText(scrollCapture: Boolean = false, focusedCapture: Boolean = false): String {
        val root = rootInActiveWindow ?: return ""
        if (focusedCapture) {
            return captureFocusedElementText(root)
        }
        if (!scrollCapture) {
            return collectWindowText(root)
        }

        val segments = linkedSetOf<String>()
        var step = 0
        var currentRoot: AccessibilityNodeInfo? = root

        while (currentRoot != null && step <= MAX_SCROLL_STEPS) {
            val segment = collectWindowText(currentRoot)
            if (segment.isNotBlank()) {
                segments.add(segment)
            }

            val didScroll = currentRoot.performAction(AccessibilityNodeInfo.ACTION_SCROLL_FORWARD)
            if (!didScroll) {
                break
            }

            step += 1
            SystemClock.sleep(SCROLL_SETTLE_MS)
            currentRoot = rootInActiveWindow
        }

        return segments.joinToString(separator = "\n\n").trim()
    }

    private fun collectWindowText(root: AccessibilityNodeInfo): String {
        val sb = StringBuilder()
        collectNodeText(root, sb)
        return sb.toString().trim()
    }

    private fun captureFocusedElementText(root: AccessibilityNodeInfo): String {
        val focusedNode = root.findFocus(AccessibilityNodeInfo.FOCUS_ACCESSIBILITY)
            ?: root.findFocus(AccessibilityNodeInfo.FOCUS_INPUT)
            ?: return ""

        val sb = StringBuilder()
        collectNodeText(focusedNode, sb)
        if (sb.isNotBlank()) {
            return sb.toString().trim()
        }

        // Fallback: include the parent scope if focused element itself has no direct text.
        val parent = focusedNode.parent
        if (parent != null) {
            val parentSb = StringBuilder()
            collectNodeText(parent, parentSb)
            return parentSb.toString().trim()
        }

        return ""
    }

    private fun collectNodeText(node: AccessibilityNodeInfo?, sb: StringBuilder) {
        if (node == null) return
        val text = node.text?.toString().orEmpty()
        val contentDesc = node.contentDescription?.toString().orEmpty()
        val value = text.ifBlank { contentDesc }
        if (value.isNotBlank()) {
            if (sb.isNotEmpty()) sb.append(" ")
            sb.append(value)
        }
        for (i in 0 until node.childCount) {
            collectNodeText(node.getChild(i), sb)
        }
    }

    // ── Notification ─────────────────────────────────────────────────────────

    private fun createNotificationChannel() {
        val nm = getSystemService(NotificationManager::class.java) ?: return
        val channel = NotificationChannel(
            CHANNEL_ID,
            getString(R.string.capture_notification_title),
            NotificationManager.IMPORTANCE_LOW
        )
        nm.createNotificationChannel(channel)
    }

    private fun showCaptureNotification() {
        val captureIntent = Intent(this, ToolsReaderAccessibilityService::class.java)
            .setAction(ACTION_CAPTURE)
        val capturePendingIntent = PendingIntent.getService(
            this, 0, captureIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_slideshow_black_24dp)
            .setContentTitle(getString(R.string.capture_notification_title))
            .setContentText(getString(R.string.capture_notification_text))
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(true)
            .addAction(
                R.drawable.ic_camera_black_24dp,
                getString(R.string.capture_notification_action),
                capturePendingIntent
            )
            .build()

        val nm = getSystemService(NotificationManager::class.java)
        val hasPostNotificationsPermission =
            ContextCompat.checkSelfPermission(this, "android.permission.POST_NOTIFICATIONS") ==
                PackageManager.PERMISSION_GRANTED

        if (android.os.Build.VERSION.SDK_INT < 33 || hasPostNotificationsPermission) {
            nm?.notify(NOTIFICATION_ID, notification)
        }
    }

    private fun triggerCaptureAndOpen(
        scrollCapture: Boolean = false,
        focusedCapture: Boolean = false,
        autoVerify: Boolean = false
    ) {
        if (isProtectedAppForeground) {
            toastProtectedAppHint()
            return
        }

        val capturedText = captureCurrentWindowText(scrollCapture = scrollCapture, focusedCapture = focusedCapture)
        val openIntent = Intent(this, MainActivity::class.java).apply {
            action = Intent.ACTION_SEND
            type = "text/plain"
            putExtra(Intent.EXTRA_TEXT, capturedText)
            putExtra(EXTRA_OPEN_REPLY_HELPER, true)
            putExtra(EXTRA_AUTO_VERIFY, autoVerify)
            addFlags(
                Intent.FLAG_ACTIVITY_NEW_TASK or
                    Intent.FLAG_ACTIVITY_SINGLE_TOP or
                    Intent.FLAG_ACTIVITY_CLEAR_TOP
            )
        }
        startActivity(openIntent)

        if (capturedText.isBlank()) {
            Toast.makeText(this, R.string.capture_empty_hint, Toast.LENGTH_SHORT).show()
        } else if (scrollCapture) {
            Toast.makeText(this, R.string.capture_scroll_done_hint, Toast.LENGTH_SHORT).show()
        } else if (focusedCapture) {
            Toast.makeText(this, R.string.capture_focused_done_hint, Toast.LENGTH_SHORT).show()
        }
    }

    private fun toastProtectedAppHint() {
        Toast.makeText(
            this,
            "🔒 BankID detected – screen capture disabled for security. The bubble has been hidden.",
            Toast.LENGTH_LONG
        ).show()
    }

    private fun showBankIdBlockingNotification() {
        val nm = getSystemService(NotificationManager::class.java) ?: return
        val restartIntent = Intent(this, ToolsBubbleService::class.java)
        val restartPendingIntent = PendingIntent.getService(
            this, 1, restartIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle("BankID in use")
            .setContentText("Restart bubble after BankID closes")
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(false)
            .addAction(0, "Restart", restartPendingIntent)
            .build()

        val hasPostNotificationsPermission =
            ContextCompat.checkSelfPermission(this, "android.permission.POST_NOTIFICATIONS") ==
                PackageManager.PERMISSION_GRANTED

        if (Build.VERSION.SDK_INT < 33 || hasPostNotificationsPermission) {
            nm.notify(BANKID_NOTIFICATION_ID, notification)
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_CAPTURE) {
            triggerCaptureAndOpen(scrollCapture = false)
        } else if (intent?.action == ACTION_CAPTURE_SCROLL) {
            triggerCaptureAndOpen(scrollCapture = true)
        } else if (intent?.action == ACTION_CAPTURE_FOCUSED) {
            triggerCaptureAndOpen(focusedCapture = true)
        } else if (intent?.action == ACTION_VERIFY_CAPTURE) {
            triggerCaptureAndOpen(scrollCapture = false, autoVerify = true)
        } else if (intent?.action == ACTION_VERIFY_CAPTURE_FOCUSED) {
            triggerCaptureAndOpen(focusedCapture = true, autoVerify = true)
        }
        return START_STICKY
    }

    companion object {
        private const val CHANNEL_ID = "tools_capture"
        private const val NOTIFICATION_ID = 1001
        private const val BANKID_NOTIFICATION_ID = 1003
        const val ACTION_CAPTURE = "net.tornevall.android.tools.ACTION_CAPTURE"
        const val ACTION_CAPTURE_SCROLL = "net.tornevall.android.tools.ACTION_CAPTURE_SCROLL"
        const val ACTION_CAPTURE_FOCUSED = "net.tornevall.android.tools.ACTION_CAPTURE_FOCUSED"
        const val ACTION_VERIFY_CAPTURE = "net.tornevall.android.tools.ACTION_VERIFY_CAPTURE"
        const val ACTION_VERIFY_CAPTURE_FOCUSED = "net.tornevall.android.tools.ACTION_VERIFY_CAPTURE_FOCUSED"
        const val EXTRA_OPEN_REPLY_HELPER = "net.tornevall.android.tools.EXTRA_OPEN_REPLY_HELPER"
        const val EXTRA_AUTO_VERIFY = "net.tornevall.android.tools.EXTRA_AUTO_VERIFY"
        private const val MAX_SCROLL_STEPS = 4
        private const val SCROLL_SETTLE_MS = 260L
        private val PROTECTED_PACKAGES = setOf(
            "com.bankid",
            "com.bankid.bus",
            "com.bankid.id"
        )
        @Volatile
        private var isProtectedAppForeground: Boolean = false
        @Volatile
        private var activeService: ToolsReaderAccessibilityService? = null

        fun requestCapture(
            scrollCapture: Boolean = false,
            focusedCapture: Boolean = false,
            autoVerify: Boolean = false
        ): Boolean {
            val service = activeService ?: return false
            service.triggerCaptureAndOpen(
                scrollCapture = scrollCapture,
                focusedCapture = focusedCapture,
                autoVerify = autoVerify
            )
            return true
        }

        private fun isProtectedPackage(packageName: String): Boolean {
            if (packageName.isBlank()) return false
            val normalized = packageName.lowercase()
            return PROTECTED_PACKAGES.any { normalized.startsWith(it) } || normalized.contains("bankid")
        }

        fun diagnose(context: Context): String {
            val serviceId = "${context.packageName}/.accessibility.ToolsReaderAccessibilityService"
            val enabledServices = Settings.Secure.getString(
                context.contentResolver,
                Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
            ) ?: "none"

            val isEnabled = isEnabled(context)
            val hasActiveInstance = activeService != null
            return "Service ID: $serviceId\nEnabled services: $enabledServices\n" +
                "Detected as enabled: $isEnabled\nActive instance: $hasActiveInstance"
        }

        /**
         * Returns true if this accessibility service is currently enabled.
         * Used in Settings screen to show the correct status.
         */
        fun isEnabled(context: Context): Boolean {
            val serviceId = "${context.packageName}/.accessibility.ToolsReaderAccessibilityService"
            val serviceIdShort = ".accessibility.ToolsReaderAccessibilityService"
            val serviceIdFull = "net.tornevall.android.tools/.accessibility.ToolsReaderAccessibilityService"

            val enabledServices = Settings.Secure.getString(
                context.contentResolver,
                Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
            ) ?: return false

            val splitter = TextUtils.SimpleStringSplitter(':')
            splitter.setString(enabledServices)

            return splitter.any { service ->
                service.equals(serviceId, ignoreCase = true) ||
                    service.equals(serviceIdShort, ignoreCase = true) ||
                    service.equals(serviceIdFull, ignoreCase = true) ||
                    service.contains("ToolsReaderAccessibilityService", ignoreCase = true)
            }
        }
    }
}

