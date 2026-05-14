package net.tornevall.android.tools.ui.settings

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ArrayAdapter
import android.widget.Toast
import androidx.core.view.isVisible
import androidx.fragment.app.Fragment
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import com.google.android.material.tabs.TabLayout
import net.tornevall.android.tools.R
import net.tornevall.android.tools.accessibility.ToolsReaderAccessibilityService
import net.tornevall.android.tools.overlay.ToolsBubbleService
import net.tornevall.android.tools.data.settings.ToolsTokenStore
import net.tornevall.android.tools.data.socialgpt.ToolsExtensionClient
import net.tornevall.android.tools.data.socialgpt.ToolsExtensionSettings
import net.tornevall.android.tools.data.socialgpt.ToolsSocialGptException
import net.tornevall.android.tools.databinding.FragmentSettingsBinding
import kotlin.concurrent.thread

class SettingsFragment : Fragment() {

    private var _binding: FragmentSettingsBinding? = null
    private val binding get() = _binding!!

    private lateinit var tokenStore: ToolsTokenStore
    private var openAccessibilityAfterNotificationPermission: Boolean = false
    private val notificationPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        if (!granted) {
            toast(R.string.settings_notifications_required)
        }
        if (openAccessibilityAfterNotificationPermission) {
            startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS))
            openAccessibilityAfterNotificationPermission = false
        }
    }

    private val languageOptions = listOf("auto", "sv", "en", "da", "no", "fi")
    private val moodOptions = listOf(
        "balanced" to "Balanced",
        "friendly" to "Friendly",
        "formal" to "Formal",
        "firm" to "Firm",
        "casual" to "Casual"
    )
    private val bubbleSizeOptions = listOf(
        "small" to "Small",
        "medium" to "Medium",
        "large" to "Large"
    )
    private val quickReplyPresets = listOf(
        "default" to "Balanced default",
        "short"   to "Short",
        "formal"  to "Formal",
        "casual"  to "Casual"
    )

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?
    ): View {
        _binding = FragmentSettingsBinding.inflate(inflater, container, false)
        tokenStore = ToolsTokenStore(requireContext())
        return binding.root
    }

     override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
         super.onViewCreated(view, savedInstanceState)
         setupDropdowns(ToolsExtensionClient.DEFAULT_MODELS)
         setupTabs()
         loadLocalSettings()
         wireListeners()
         // Auto-sync profile from Tools if token is present
         if (!tokenStore.getToken().isNullOrBlank()) {
             loadFromToolsAutomatic()
         }
     }

    override fun onResume() {
        super.onResume()
        updateAccessibilityStatus()
        updateOverlayStatus()
    }

    // ── Initial load from SharedPreferences ──────────────────────────────────

    private fun loadLocalSettings() {
        binding.switchDevMode.isChecked = tokenStore.isDevMode()
        binding.inputToolsToken.setText(tokenStore.getToken().orEmpty())
        binding.inputPersonaProfile.setText(tokenStore.getPersonaProfile())
        binding.inputReplyModel.setText(tokenStore.getReplyModel(), false)
        binding.inputAnswerLanguage.setText(tokenStore.getAnswerLanguage(), false)
        val moodLabel = moodOptions.firstOrNull { it.first == tokenStore.getReplyMood() }?.second
            ?: moodOptions.first().second
        binding.inputReplyMood.setText(moodLabel, false)
        binding.inputVerifyLanguage.setText(tokenStore.getVerifyLanguage(), false)
        binding.inputVerifyModel.setText(tokenStore.getVerifyModel(), false)
        binding.switchAccessibilityShortcut.isChecked = tokenStore.isAccessibilityShortcutEnabled()
        val bubbleSizeLabel = bubbleSizeOptions.firstOrNull { it.first == tokenStore.getBubbleSize() }?.second
            ?: bubbleSizeOptions.first().second
        binding.inputBubbleSize.setText(bubbleSizeLabel, false)
        val presetLabel = quickReplyPresets
            .firstOrNull { it.first == tokenStore.getQuickReplyPreset() }?.second ?: "Balanced default"
        binding.inputQuickReplyPreset.setText(presetLabel, false)
        binding.inputQuickReplyInstruction.setText(tokenStore.getQuickReplyInstruction())
        updateTokenStatus()
    }

    // ── Dropdown setup ───────────────────────────────────────────────────────

    private fun setupDropdowns(models: List<String>) {
        val ctx = requireContext()
        val mergedModels = (models + listOf("gpt-4o", "gpt-4o-mini", "gpt-5.4", "o3-mini", "o1-mini"))
            .map { it.trim() }
            .filter { it.isNotBlank() }
            .distinct()
        binding.inputReplyModel.setAdapter(ArrayAdapter(ctx, android.R.layout.simple_list_item_1, mergedModels))
        binding.inputAnswerLanguage.setAdapter(ArrayAdapter(ctx, android.R.layout.simple_list_item_1, languageOptions))
        binding.inputVerifyLanguage.setAdapter(ArrayAdapter(ctx, android.R.layout.simple_list_item_1, languageOptions))
        binding.inputVerifyModel.setAdapter(ArrayAdapter(ctx, android.R.layout.simple_list_item_1, mergedModels))
        binding.inputReplyMood.setAdapter(
            ArrayAdapter(ctx, android.R.layout.simple_list_item_1, moodOptions.map { it.second })
        )
        binding.inputBubbleSize.setAdapter(
            ArrayAdapter(ctx, android.R.layout.simple_list_item_1, bubbleSizeOptions.map { it.second })
        )
        binding.inputQuickReplyPreset.setAdapter(
            ArrayAdapter(ctx, android.R.layout.simple_list_item_1, quickReplyPresets.map { it.second })
        )
    }

    private fun setupTabs() {
        val tabs = binding.tabSettings
        tabs.removeAllTabs()
        tabs.addTab(tabs.newTab().setText(R.string.settings_tab_connection), true)
        tabs.addTab(tabs.newTab().setText(R.string.settings_tab_socialgpt))
        tabs.addTab(tabs.newTab().setText(R.string.settings_tab_capture))
        showSettingsSection(0)
        tabs.addOnTabSelectedListener(object : TabLayout.OnTabSelectedListener {
            override fun onTabSelected(tab: TabLayout.Tab) {
                showSettingsSection(tab.position)
            }

            override fun onTabUnselected(tab: TabLayout.Tab) = Unit
            override fun onTabReselected(tab: TabLayout.Tab) = Unit
        })
    }

    private fun showSettingsSection(position: Int) {
        binding.sectionConnection.isVisible = position == 0
        binding.sectionSocialgpt.isVisible = position == 1
        binding.sectionCapture.isVisible = position == 2
    }

    // ── Listeners ────────────────────────────────────────────────────────────

    private fun wireListeners() {
        binding.switchDevMode.setOnCheckedChangeListener { _, checked ->
            tokenStore.setDevMode(checked)
        }
        binding.switchAccessibilityShortcut.setOnCheckedChangeListener { _, checked ->
            tokenStore.setAccessibilityShortcutEnabled(checked)
        }

        binding.inputReplyModel.setOnItemClickListener { _, _, _, _ ->
            tokenStore.setReplyModel(binding.inputReplyModel.text?.toString().orEmpty().ifBlank { "gpt-4o" })
        }
        binding.inputAnswerLanguage.setOnItemClickListener { _, _, _, _ ->
            tokenStore.setAnswerLanguage(binding.inputAnswerLanguage.text?.toString().orEmpty().ifBlank { "auto" })
        }
        binding.inputVerifyLanguage.setOnItemClickListener { _, _, _, _ ->
            tokenStore.setVerifyLanguage(binding.inputVerifyLanguage.text?.toString().orEmpty().ifBlank { "auto" })
        }
        binding.inputVerifyModel.setOnItemClickListener { _, _, _, _ ->
            tokenStore.setVerifyModel(binding.inputVerifyModel.text?.toString().orEmpty().ifBlank { "gpt-5.4" })
        }
        binding.inputReplyMood.setOnItemClickListener { _, _, position, _ ->
            val key = moodOptions.getOrNull(position)?.first ?: "balanced"
            tokenStore.setReplyMood(key)
        }
        binding.inputBubbleSize.setOnItemClickListener { _, _, position, _ ->
            val key = bubbleSizeOptions.getOrNull(position)?.first ?: "medium"
            tokenStore.setBubbleSize(key)
        }

        // Token section
        binding.buttonSaveToolsToken.setOnClickListener {
            val token = binding.inputToolsToken.text?.toString()?.trim().orEmpty()
            if (token.isBlank()) {
                toast(R.string.settings_tools_token_empty); return@setOnClickListener
            }
            saveAllLocal()
            tokenStore.saveToken(token)
            updateTokenStatus()
            toast(R.string.settings_tools_token_saved)
        }

         binding.buttonValidateToolsToken.setOnClickListener {
             val token = binding.inputToolsToken.text?.toString()?.trim().orEmpty()
             if (token.isBlank()) { toast(R.string.settings_tools_token_empty); return@setOnClickListener }
             binding.buttonValidateToolsToken.isEnabled = false
             binding.textToolsTokenStatus.text = getString(R.string.socialgpt_loading)
             val client = extensionClient()
             thread {
                 val result = client.validateToken(token)
                 runOnUiSafe {
                     binding.buttonValidateToolsToken.isEnabled = true
                     result.onSuccess { v ->
                         binding.textToolsTokenStatus.text = if (v.valid) {
                             if (v.userName.isNotBlank()) "✓ " + v.message else getString(R.string.settings_tools_token_valid)
                         } else {
                             v.message.ifBlank { getString(R.string.settings_tools_token_invalid) }
                         }
                         // Auto-sync profile after successful validation
                         if (v.valid) {
                             loadFromTools()
                         }
                     }.onFailure { t ->
                         binding.textToolsTokenStatus.text = httpErrorText(t)
                     }
                 }
             }
         }

        binding.buttonClearToolsToken.setOnClickListener {
            tokenStore.clearToken()
            binding.inputToolsToken.setText("")
            updateTokenStatus()
            toast(R.string.settings_tools_token_cleared)
        }

        // Sync with Tools
        binding.buttonLoadFromTools.setOnClickListener { loadFromTools() }
        binding.buttonSaveToTools.setOnClickListener { saveToTools() }

        // Test
        binding.buttonTestConnection.setOnClickListener {
            val token = tokenStore.getToken().orEmpty()
            if (token.isBlank()) { toast(R.string.settings_tools_token_empty); return@setOnClickListener }
            binding.buttonTestConnection.isEnabled = false
            binding.textTestResult.text = getString(R.string.socialgpt_loading)
            thread {
                val result = extensionClient().testConnection(token)
                runOnUiSafe {
                    binding.buttonTestConnection.isEnabled = true
                    result.onSuccess { msg ->
                        binding.textTestResult.text = "✓ ${msg.ifBlank { getString(R.string.settings_test_ok) }}"
                    }.onFailure { t ->
                        binding.textTestResult.text = "✗ ${httpErrorText(t)}"
                    }
                }
            }
        }

        // Accessibility
        binding.buttonOpenAccessibility.setOnClickListener {
            if (Build.VERSION.SDK_INT >= 33) {
                val granted = ContextCompat.checkSelfPermission(
                    requireContext(),
                    Manifest.permission.POST_NOTIFICATIONS
                ) == PackageManager.PERMISSION_GRANTED
                if (!granted) {
                    openAccessibilityAfterNotificationPermission = true
                    notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
                    return@setOnClickListener
                }
            }
            startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS))
        }

        binding.buttonOpenOverlayPermission.setOnClickListener {
            openOverlayPermissionSettings()
        }

        binding.buttonStartBubble.setOnClickListener {
            if (Build.VERSION.SDK_INT >= 33) {
                val granted = ContextCompat.checkSelfPermission(
                    requireContext(),
                    Manifest.permission.POST_NOTIFICATIONS
                ) == PackageManager.PERMISSION_GRANTED
                if (!granted) {
                    toast(R.string.settings_notifications_required)
                    openAccessibilityAfterNotificationPermission = false
                    notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
                    return@setOnClickListener
                }
            }
            if (!Settings.canDrawOverlays(requireContext())) {
                toast(R.string.settings_overlay_permission_missing)
                openOverlayPermissionSettings()
                return@setOnClickListener
            }
            if (!ToolsReaderAccessibilityService.isEnabled(requireContext())) {
                toast(R.string.settings_enable_accessibility_first)
                return@setOnClickListener
            }
            requireContext().startService(Intent(requireContext(), ToolsBubbleService::class.java))
            updateOverlayStatus()
        }

        binding.buttonStopBubble.setOnClickListener {
            requireContext().stopService(Intent(requireContext(), ToolsBubbleService::class.java))
            updateOverlayStatus()
        }
    }

     // ── Load from Tools API ──────────────────────────────────────────────────

     private fun loadFromToolsAutomatic() {
         val token = tokenStore.getToken().orEmpty()
         if (token.isBlank()) return

         val client = extensionClient()
         thread {
             val settingsResult = client.getSettingsWithFallback(token)
             runOnUiSafe {
                 settingsResult.onSuccess { s ->
                     if (s.personaProfile.isNotBlank()) {
                         binding.inputPersonaProfile.setText(s.personaProfile)
                         tokenStore.setPersonaProfile(s.personaProfile)
                     }
                     if (s.responseLanguage.isNotBlank()) {
                         binding.inputAnswerLanguage.setText(s.responseLanguage.ifBlank { "auto" }, false)
                         tokenStore.setAnswerLanguage(s.responseLanguage.ifBlank { "auto" })
                     }
                     if (s.customInstruction.isNotBlank()) {
                         binding.inputQuickReplyInstruction.setText(s.customInstruction)
                         tokenStore.setQuickReplyInstruction(s.customInstruction)
                         if (tokenStore.getSavedInstruction().isBlank()) {
                             tokenStore.setSavedInstruction(s.customInstruction)
                         }
                     }
                 }
             }
         }
     }

     private fun loadFromTools() {
         val token = tokenStore.getToken().orEmpty()
         if (token.isBlank()) { toast(R.string.settings_tools_token_empty); return }

         setSyncStatus(getString(R.string.socialgpt_loading))
         val client = extensionClient()

         thread {
             // Models
             val modelsResult = client.getModels(token)
             val models = modelsResult.getOrNull() ?: ToolsExtensionClient.DEFAULT_MODELS

             // Settings with fallback
             val settingsResult = client.getSettingsWithFallback(token)
             runOnUiSafe {
                setupDropdowns(models)
                settingsResult.onSuccess { s ->
                    binding.inputPersonaProfile.setText(s.personaProfile)
                    binding.inputAnswerLanguage.setText(s.responseLanguage.ifBlank { "auto" }, false)
                    binding.inputQuickReplyInstruction.setText(s.customInstruction)
                    tokenStore.setPersonaProfile(s.personaProfile)
                    tokenStore.setAnswerLanguage(s.responseLanguage.ifBlank { "auto" })
                    if (s.customInstruction.isNotBlank()) {
                        tokenStore.setQuickReplyInstruction(s.customInstruction)
                        if (tokenStore.getSavedInstruction().isBlank()) {
                            tokenStore.setSavedInstruction(s.customInstruction)
                        }
                    }
                    val baseUrl = if (tokenStore.isDevMode()) ToolsTokenStore.BASE_URL_DEV else ToolsTokenStore.BASE_URL_PROD
                    val host = baseUrl.removePrefix("https://").removePrefix("http://").split("/").first()
                    setSyncStatus("Settings loaded from $host")
                }.onFailure { t ->
                    setSyncStatus("✗ ${getString(R.string.settings_load_error)}: ${httpErrorText(t)}")
                }
            }
        }
    }

    // ── Save to Tools API ────────────────────────────────────────────────────

    private fun saveToTools() {
        val token = tokenStore.getToken().orEmpty()
        if (token.isBlank()) { toast(R.string.settings_tools_token_empty); return }

        saveAllLocal()
        setSyncStatus(getString(R.string.socialgpt_loading))

        val settings = ToolsExtensionSettings(
            personaProfile = binding.inputPersonaProfile.text?.toString()?.trim().orEmpty(),
            customInstruction = binding.inputQuickReplyInstruction.text?.toString()?.trim().orEmpty(),
            responseLanguage = binding.inputAnswerLanguage.text?.toString().orEmpty().ifBlank { "auto" }
        )

        thread {
            val result = extensionClient().saveSettings(token, settings)
            runOnUiSafe {
                result.onSuccess {
                    setSyncStatus("✓ ${getString(R.string.settings_saved_ok)}")
                }.onFailure { t ->
                    setSyncStatus("✗ ${getString(R.string.settings_save_error)}: ${httpErrorText(t)}")
                }
            }
        }
    }

    // ── Save all fields locally ──────────────────────────────────────────────

    private fun saveAllLocal() {
        tokenStore.setPersonaProfile(binding.inputPersonaProfile.text?.toString().orEmpty())
        tokenStore.setReplyModel(binding.inputReplyModel.text?.toString().orEmpty().ifBlank { "gpt-4o" })
        tokenStore.setAnswerLanguage(binding.inputAnswerLanguage.text?.toString().orEmpty().ifBlank { "auto" })
        tokenStore.setVerifyLanguage(binding.inputVerifyLanguage.text?.toString().orEmpty().ifBlank { "auto" })
        tokenStore.setVerifyModel(binding.inputVerifyModel.text?.toString().orEmpty().ifBlank { "gpt-5.4" })
        val moodLabel = binding.inputReplyMood.text?.toString().orEmpty()
        val moodKey = moodOptions.firstOrNull { it.second == moodLabel }?.first ?: "balanced"
        tokenStore.setReplyMood(moodKey)
        val bubbleSizeLabel = binding.inputBubbleSize.text?.toString().orEmpty()
        val bubbleSize = bubbleSizeOptions.firstOrNull { it.second == bubbleSizeLabel }?.first ?: "medium"
        tokenStore.setBubbleSize(bubbleSize)
        val presetLabel = binding.inputQuickReplyPreset.text?.toString().orEmpty()
        val presetKey = quickReplyPresets.firstOrNull { it.second == presetLabel }?.first ?: "default"
        tokenStore.setQuickReplyPreset(presetKey)
        tokenStore.setQuickReplyInstruction(binding.inputQuickReplyInstruction.text?.toString().orEmpty())
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private fun updateTokenStatus() {
        val hasToken = !tokenStore.getToken().isNullOrBlank()
        binding.textToolsTokenStatus.text = if (hasToken)
            getString(R.string.settings_tools_token_present)
        else
            getString(R.string.settings_tools_token_missing)
    }

    private fun updateAccessibilityStatus() {
        val active = ToolsReaderAccessibilityService.isEnabled(requireContext())
        binding.textAccessibilityStatus.text = if (active)
            getString(R.string.settings_accessibility_active)
        else
            getString(R.string.settings_accessibility_inactive)
        binding.buttonOpenAccessibility.isVisible = !active

        val debugText = ToolsReaderAccessibilityService.diagnose(requireContext())
        binding.textAccessibilityDebug.text = debugText
        binding.textAccessibilityDebug.isVisible = !active
    }

    private fun updateOverlayStatus() {
        val hasOverlayPermission = Settings.canDrawOverlays(requireContext())
        binding.textOverlayStatus.text = if (hasOverlayPermission) {
            getString(R.string.settings_overlay_permission_granted)
        } else {
            getString(R.string.settings_overlay_permission_missing)
        }
        binding.buttonOpenOverlayPermission.isVisible = !hasOverlayPermission

        binding.textBubbleStatus.text = if (ToolsBubbleService.isRunning) {
            getString(R.string.settings_bubble_running)
        } else {
            getString(R.string.settings_bubble_stopped)
        }
    }

    private fun openOverlayPermissionSettings() {
        val intent = Intent(
            Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
            Uri.parse("package:${requireContext().packageName}")
        )
        startActivity(intent)
    }

    private fun setSyncStatus(text: String) {
        binding.textSyncStatus.text = text
        binding.textSyncStatus.isVisible = true
    }

     private fun extensionClient(): ToolsExtensionClient {
         val baseUrl = tokenStore.getBaseUrl()
         val fallbackUrl = if (tokenStore.isDevMode()) {
             ToolsTokenStore.BASE_URL_PROD // If dev fails, try prod
         } else {
             ToolsTokenStore.BASE_URL_DEV  // If prod fails, try dev
         }
         return ToolsExtensionClient(baseUrl, fallbackUrl)
     }

    private fun httpErrorText(t: Throwable): String =
        when ((t as? ToolsSocialGptException)?.statusCode) {
            401  -> getString(R.string.socialgpt_request_unauthorized)
            403  -> getString(R.string.socialgpt_request_forbidden)
            else -> t.message ?: getString(R.string.settings_load_error)
        }

    private fun toast(resId: Int) =
        Toast.makeText(requireContext(), resId, Toast.LENGTH_SHORT).show()

    private fun runOnUiSafe(block: () -> Unit) {
        val b = _binding ?: return
        b.root.post(block)
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}