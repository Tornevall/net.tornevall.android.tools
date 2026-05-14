package net.tornevall.android.tools.overlay

import android.annotation.SuppressLint
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.graphics.PixelFormat
import android.os.Build
import android.os.IBinder
import android.provider.Settings
import android.util.TypedValue
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import android.widget.PopupMenu
import androidx.core.content.ContextCompat
import androidx.core.app.NotificationCompat
import androidx.appcompat.widget.AppCompatImageView
import net.tornevall.android.tools.MainActivity
import net.tornevall.android.tools.R
import net.tornevall.android.tools.accessibility.ToolsReaderAccessibilityService
import net.tornevall.android.tools.data.settings.ToolsTokenStore

/**
 * Floating bubble launcher shown above other apps.
 *
 * Tap behavior:
 * - If accessibility capture is enabled -> trigger ACTION_CAPTURE on ToolsReaderAccessibilityService
 * - Otherwise -> open accessibility settings
 */
class ToolsBubbleService : Service() {

    private lateinit var windowManager: WindowManager
    private lateinit var tokenStore: ToolsTokenStore
    private var bubbleView: View? = null
    private var panelView: View? = null
    private lateinit var layoutParams: WindowManager.LayoutParams
    private lateinit var panelLayoutParams: WindowManager.LayoutParams

    override fun onCreate() {
        super.onCreate()
        isRunning = true
        tokenStore = ToolsTokenStore(this)
        windowManager = getSystemService(WINDOW_SERVICE) as WindowManager
        createNotificationChannel()
        showBubbleNotification()
        showBubble()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_STOP) {
            stopSelf()
            return START_NOT_STICKY
        }
        return START_STICKY
    }

    override fun onDestroy() {
        super.onDestroy()
        hidePanel()
        bubbleView?.let {
            windowManager.removeView(it)
        }
        val manager = getSystemService(NotificationManager::class.java)
        manager?.cancel(NOTIFICATION_ID)
        bubbleView = null
        isRunning = false
    }

    override fun onBind(intent: Intent?): IBinder? = null

    @SuppressLint("ClickableViewAccessibility")
    private fun showBubble() {
        if (!Settings.canDrawOverlays(this)) {
            stopSelf()
            return
        }

        val sizeSpec = currentBubbleSpec()
        val bubble = object : AppCompatImageView(this) {
            override fun performClick(): Boolean {
                super.performClick()
                return true
            }
        }.apply {
            setImageResource(R.drawable.ic_slideshow_black_24dp)
            setBackgroundResource(R.drawable.bg_bubble_fab)
            imageTintList = ContextCompat.getColorStateList(context, android.R.color.white)
            setPadding(sizeSpec.paddingPx, sizeSpec.paddingPx, sizeSpec.paddingPx, sizeSpec.paddingPx)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                elevation = 10f
            }
            setOnClickListener { onBubbleClicked() }
        }

        layoutParams = WindowManager.LayoutParams(
            sizeSpec.sizePx,
            sizeSpec.sizePx,
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.TOP or Gravity.START
            x = 40
            y = 220
        }

        var initialX = 0
        var initialY = 0
        var initialTouchX = 0f
        var initialTouchY = 0f

        bubble.setOnTouchListener { v, event ->
            when (event.action) {
                MotionEvent.ACTION_DOWN -> {
                    initialX = layoutParams.x
                    initialY = layoutParams.y
                    initialTouchX = event.rawX
                    initialTouchY = event.rawY
                    true
                }
                MotionEvent.ACTION_MOVE -> {
                    layoutParams.x = initialX + (event.rawX - initialTouchX).toInt()
                    layoutParams.y = initialY + (event.rawY - initialTouchY).toInt()
                    windowManager.updateViewLayout(bubble, layoutParams)
                    updatePanelPosition()
                    true
                }
                MotionEvent.ACTION_UP -> {
                    v.performClick()
                    true
                }
                else -> false
            }
        }

        bubbleView = bubble
        windowManager.addView(bubble, layoutParams)
    }

    private fun onBubbleClicked() {
        if (panelView != null) {
            hidePanel()
            return
        }

        showPanel()
    }

    private fun showPanel() {
        if (!Settings.canDrawOverlays(this)) {
            toast(R.string.settings_overlay_permission_missing)
            return
        }

        val panel = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(8), dp(8), dp(8), dp(8))
            setBackgroundResource(R.drawable.bg_bubble_panel)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                elevation = 8f
            }
        }

        // Header with title and drag zone
        val headerPanel = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                dp(32)
            )
        }

        val titleView = TextView(this).apply {
            text = "Tools"
            textSize = 14f
            setTextColor(ContextCompat.getColor(context, android.R.color.white))
            gravity = android.view.Gravity.CENTER_VERTICAL
            layoutParams = LinearLayout.LayoutParams(
                0,
                LinearLayout.LayoutParams.MATCH_PARENT,
                1f
            )
        }
        headerPanel.addView(titleView)

        // Capture dropdown button
        val captureButton = createCompactPanelButton("📸 Capture") {
            showCaptureMenu(panel)
        }

        // Verify dropdown button
        val verifyButton = createCompactPanelButton("✓ Verify") {
            showVerifyMenu(panel)
        }

        // Open reply helper button
        val openReplyButton = createCompactPanelButton("✎ Tasks") {
            openReplyHelper()
            hidePanel()
        }

        // Minimize button
        val minimizeButton = createCompactPanelButton("−") {
            hidePanel()
        }

        // Stop button
        val stopButton = createCompactPanelButton("⊗") {
            stopSelf()
        }

        // Add buttons row 1
        val buttonsRow1 = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            )
        }
        buttonsRow1.addView(captureButton)
        buttonsRow1.addView(verifyButton)
        buttonsRow1.addView(openReplyButton)

        // Add buttons row 2
        val buttonsRow2 = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            )
        }
        buttonsRow2.addView(minimizeButton)
        buttonsRow2.addView(stopButton)

        panel.addView(headerPanel)
        panel.addView(buttonsRow1)
        panel.addView(buttonsRow2)

        panelLayoutParams = WindowManager.LayoutParams(
            dp(220),
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.TOP or Gravity.START
            x = layoutParams.x + panelOffsetPx()
            y = layoutParams.y
        }

        // Make panel draggable
        var panelInitialX = 0
        var panelInitialY = 0
        var panelInitialTouchX = 0f
        var panelInitialTouchY = 0f

        headerPanel.setOnTouchListener { _, event ->
            when (event.action) {
                MotionEvent.ACTION_DOWN -> {
                    panelInitialX = panelLayoutParams.x
                    panelInitialY = panelLayoutParams.y
                    panelInitialTouchX = event.rawX
                    panelInitialTouchY = event.rawY
                    true
                }
                MotionEvent.ACTION_MOVE -> {
                    panelLayoutParams.x = panelInitialX + (event.rawX - panelInitialTouchX).toInt()
                    panelLayoutParams.y = panelInitialY + (event.rawY - panelInitialTouchY).toInt()
                    windowManager.updateViewLayout(panel, panelLayoutParams)
                    true
                }
                MotionEvent.ACTION_UP -> true
                else -> false
            }
        }

        panelView = panel
        windowManager.addView(panel, panelLayoutParams)
    }

    private fun showCaptureMenu(anchorView: View) {
        val popup = PopupMenu(this, anchorView)
        popup.menuInflater.inflate(R.menu.menu_capture_options, popup.menu)
        popup.setOnMenuItemClickListener { menuItem ->
            when (menuItem.itemId) {
                R.id.capture_visible -> {
                    dispatchCapture(scrollCapture = false, focusedCapture = false, autoVerify = false)
                    hidePanel()
                    true
                }
                R.id.capture_focused -> {
                    dispatchCapture(scrollCapture = false, focusedCapture = true, autoVerify = false)
                    hidePanel()
                    true
                }
                R.id.capture_scroll -> {
                    dispatchCapture(scrollCapture = true, focusedCapture = false, autoVerify = false)
                    hidePanel()
                    true
                }
                else -> false
            }
        }
        popup.show()
    }

    private fun showVerifyMenu(anchorView: View) {
        val popup = PopupMenu(this, anchorView)
        popup.menuInflater.inflate(R.menu.menu_verify_options, popup.menu)
        popup.setOnMenuItemClickListener { menuItem ->
            when (menuItem.itemId) {
                R.id.verify_visible -> {
                    dispatchCapture(scrollCapture = false, focusedCapture = false, autoVerify = true)
                    hidePanel()
                    true
                }
                R.id.verify_focused -> {
                    dispatchCapture(scrollCapture = false, focusedCapture = true, autoVerify = true)
                    hidePanel()
                    true
                }
                else -> false
            }
        }
        popup.show()
    }

    private fun createCompactPanelButton(label: String, onClick: () -> Unit): Button {
        return Button(this).apply {
            text = label
            isAllCaps = false
            setPadding(dp(6), dp(4), dp(6), dp(4))
            minHeight = 0
            minimumHeight = 0
            textSize = 11f
            setTextColor(ContextCompat.getColor(context, android.R.color.white))
            setBackgroundColor(ContextCompat.getColor(context, R.color.bubble_primary))
            setOnClickListener { onClick() }
            val params = LinearLayout.LayoutParams(
                0,
                dp(32),
                1f
            ).apply {
                marginStart = dp(2)
                marginEnd = dp(2)
            }
            layoutParams = params
        }
    }

    private fun hidePanel() {
        panelView?.let {
            windowManager.removeView(it)
        }
        panelView = null
    }

    private fun updatePanelPosition() {
        val panel = panelView ?: return
        panelLayoutParams.x = layoutParams.x + panelOffsetPx()
        panelLayoutParams.y = layoutParams.y
        windowManager.updateViewLayout(panel, panelLayoutParams)
    }

    private fun dispatchCapture(scrollCapture: Boolean, focusedCapture: Boolean, autoVerify: Boolean) {
        if (ToolsReaderAccessibilityService.isEnabled(this)) {
            if (!ToolsReaderAccessibilityService.requestCapture(
                    scrollCapture = scrollCapture,
                    focusedCapture = focusedCapture,
                    autoVerify = autoVerify
                )) {
                openReplyHelper()
            }
        } else {
            val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            startActivity(intent)
        }
    }

    private fun openReplyHelper() {
        val openAppIntent = Intent(this, MainActivity::class.java).apply {
            putExtra(ToolsReaderAccessibilityService.EXTRA_OPEN_REPLY_HELPER, true)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
        }
        startActivity(openAppIntent)
    }

    private fun toast(resId: Int) {
        Toast.makeText(this, resId, Toast.LENGTH_SHORT).show()
    }


    private fun panelOffsetPx(): Int = (currentBubbleSpec().sizePx + dp(12)).coerceAtLeast(dp(72))

    private fun currentBubbleSpec(): BubbleSizeSpec {
        return when (tokenStore.getBubbleSize()) {
            "small" -> BubbleSizeSpec(sizePx = dp(48), paddingPx = dp(11))
            "large" -> BubbleSizeSpec(sizePx = dp(72), paddingPx = dp(18))
            else -> BubbleSizeSpec(sizePx = dp(60), paddingPx = dp(14))
        }
    }

    private fun dp(value: Int): Int =
        TypedValue.applyDimension(
            TypedValue.COMPLEX_UNIT_DIP,
            value.toFloat(),
            resources.displayMetrics
        ).toInt()

    private fun createNotificationChannel() {
        val manager = getSystemService(NotificationManager::class.java)
        val channel = NotificationChannel(
            CHANNEL_ID,
            getString(R.string.bubble_notification_title),
            NotificationManager.IMPORTANCE_LOW
        )
        manager?.createNotificationChannel(channel)
    }

    private fun showBubbleNotification() {
        val openAppPendingIntent = PendingIntent.getActivity(
            this,
            0,
            Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val stopPendingIntent = PendingIntent.getService(
            this,
            1,
            Intent(this, ToolsBubbleService::class.java).setAction(ACTION_STOP),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_slideshow_black_24dp)
            .setContentTitle(getString(R.string.bubble_notification_title))
            .setContentText(getString(R.string.bubble_notification_text))
            .setContentIntent(openAppPendingIntent)
            .setOngoing(true)
            .addAction(0, getString(R.string.bubble_notification_stop), stopPendingIntent)
            .build()

        val manager = getSystemService(NotificationManager::class.java)
        manager?.notify(NOTIFICATION_ID, notification)
    }

    companion object {
        private const val CHANNEL_ID = "tools_bubble"
        private const val NOTIFICATION_ID = 1002
        private const val ACTION_STOP = "net.tornevall.android.tools.ACTION_STOP_BUBBLE"

        @Volatile
        var isRunning: Boolean = false
    }

    private data class BubbleSizeSpec(
        val sizePx: Int,
        val paddingPx: Int
    )
}

