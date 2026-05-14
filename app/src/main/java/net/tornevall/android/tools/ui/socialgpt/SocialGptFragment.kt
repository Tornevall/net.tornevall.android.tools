package net.tornevall.android.tools.ui.socialgpt

import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.provider.Settings
import android.speech.tts.TextToSpeech
import android.text.TextUtils
import android.text.method.LinkMovementMethod
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.core.text.HtmlCompat
import androidx.core.view.isVisible
import androidx.core.widget.doAfterTextChanged
import androidx.fragment.app.Fragment
import androidx.lifecycle.ViewModelProvider
import androidx.navigation.fragment.findNavController
import com.google.android.material.button.MaterialButton
import net.tornevall.android.tools.R
import net.tornevall.android.tools.accessibility.ToolsReaderAccessibilityService
import net.tornevall.android.tools.data.settings.ToolsTokenStore
import net.tornevall.android.tools.databinding.FragmentSocialgptBinding
import net.tornevall.android.tools.overlay.ToolsBubbleService
import java.util.Locale

class SocialGptFragment : Fragment() {

    private var _binding: FragmentSocialgptBinding? = null
    private val binding get() = _binding!!

    private var textToSpeech: TextToSpeech? = null
    private var ttsReady = false
    private var clipboardManager: ClipboardManager? = null
    private var lastImportedClipboardText: String = ""
    private lateinit var tokenStore: ToolsTokenStore
    private lateinit var viewModel: SocialGptViewModel
    private var pendingAutoVerifyFromIntent: Boolean = false

    private val clipboardListener = ClipboardManager.OnPrimaryClipChangedListener {
        importClipboardTextIfAvailable()
    }

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        viewModel = ViewModelProvider(this)[SocialGptViewModel::class.java]
        tokenStore = ToolsTokenStore(requireContext())
        _binding = FragmentSocialgptBinding.inflate(inflater, container, false)

        loadComposerState()
        setupTextToSpeech()
        clipboardManager = requireContext().getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
        pendingAutoVerifyFromIntent = arguments?.getBoolean(ARG_AUTO_VERIFY, false) == true
        importSharedTextIfAvailable()
        binding.inputPrompt.doAfterTextChanged { tokenStore.setSavedInstruction(it?.toString().orEmpty()) }

        binding.buttonGenerateDraft.setOnClickListener {
            tokenStore.setSavedInstruction(binding.inputPrompt.text?.toString().orEmpty())
            viewModel.generateDraft(
                token = tokenStore.getToken().orEmpty(),
                baseUrl = tokenStore.getBaseUrl(),
                contextText = binding.inputContext.text?.toString().orEmpty(),
                promptText = binding.inputPrompt.text?.toString().orEmpty(),
                model = tokenStore.getReplyModel().ifBlank { "gpt-4o" },
                language = tokenStore.getAnswerLanguage().ifBlank { "auto" },
                mood = tokenStore.getReplyMood().ifBlank { "balanced" },
                requestMode = SocialGptRequestMode.REPLY
            )
        }

        binding.buttonOpenSettings.setOnClickListener {
            findNavController().navigate(R.id.nav_settings)
        }

        binding.buttonStartBubble.setOnClickListener {
            if (!Settings.canDrawOverlays(requireContext())) {
                Toast.makeText(requireContext(), R.string.settings_overlay_permission_missing, Toast.LENGTH_SHORT).show()
                findNavController().navigate(R.id.nav_settings)
                return@setOnClickListener
            }
            if (!ToolsReaderAccessibilityService.isEnabled(requireContext())) {
                Toast.makeText(requireContext(), R.string.settings_enable_accessibility_first, Toast.LENGTH_SHORT).show()
                findNavController().navigate(R.id.nav_settings)
                return@setOnClickListener
            }

            requireContext().startService(Intent(requireContext(), ToolsBubbleService::class.java))
            Toast.makeText(requireContext(), R.string.socialgpt_bubble_started, Toast.LENGTH_SHORT).show()
        }

        binding.buttonVerifyFact.setOnClickListener {
            viewModel.generateDraft(
                token = tokenStore.getToken().orEmpty(),
                baseUrl = tokenStore.getBaseUrl(),
                contextText = binding.inputContext.text?.toString().orEmpty(),
                // Verify mode no longer depends on free-form instruction input.
                promptText = "",
                model = tokenStore.getVerifyModel().ifBlank { "gpt-5.4" },
                language = tokenStore.getVerifyLanguage().ifBlank { "auto" },
                mood = tokenStore.getReplyMood().ifBlank { "balanced" },
                requestMode = SocialGptRequestMode.VERIFY
            )
        }

        binding.buttonApplyModify.setOnClickListener {
            viewModel.applyModify(
                token = tokenStore.getToken().orEmpty(),
                baseUrl = tokenStore.getBaseUrl(),
                model = tokenStore.getReplyModel().ifBlank { "gpt-4o" },
                language = tokenStore.getAnswerLanguage().ifBlank { "auto" },
                mood = tokenStore.getReplyMood().ifBlank { "balanced" },
                modifyInstruction = binding.inputModify.text?.toString().orEmpty()
            )
        }

        binding.buttonReadAloud.setOnClickListener {
            speakResponse(binding.textResponseBody.text?.toString().orEmpty())
        }

        viewModel.uiState.observe(viewLifecycleOwner) { state ->
            val hasResponse = state.responseText.isNotBlank()
            binding.buttonGenerateDraft.isEnabled = !state.isLoading
            binding.buttonVerifyFact.isEnabled = !state.isLoading
            binding.buttonApplyModify.isEnabled = !state.isLoading
            binding.buttonReadAloud.isEnabled = hasResponse && !state.isLoading
            binding.progressGenerating.isVisible = state.isGenerating
            binding.progressVerifying.isVisible = state.isVerifying
            binding.chipWebSearchIndicator.isVisible = state.webSearchUsed
            
            binding.textResponseLabel.text = if (state.responseMeta.isNotBlank()) {
                getString(R.string.socialgpt_response_label) + " · " + state.responseMeta
            } else {
                getString(R.string.socialgpt_response_label)
            }
            binding.textResponseBody.text = if (hasResponse) {
                renderRichText(state.responseText)
            } else if (state.isLoading) {
                getString(R.string.socialgpt_loading)
            } else {
                getString(R.string.socialgpt_response_placeholder)
            }
            binding.textResponseBody.movementMethod = LinkMovementMethod.getInstance()
            binding.textResponseError.isVisible = state.validationError != null
            if (state.validationError != null) {
                binding.textResponseError.text = when (state.validationError) {
                    "token_required" -> getString(R.string.socialgpt_token_required)
                    "context_required" -> getString(R.string.socialgpt_context_required)
                    "unauthorized" -> getString(R.string.socialgpt_request_unauthorized)
                    "forbidden" -> getString(R.string.socialgpt_request_forbidden)
                    "empty_response" -> getString(R.string.socialgpt_request_empty)
                    "no_suggestion_selected" -> getString(R.string.socialgpt_no_suggestion_selected)
                    "request_failed" -> getString(R.string.socialgpt_request_failed)
                    else -> getString(R.string.socialgpt_prompt_required)
                }
                announceForScreenReader(binding.textResponseError.text)
            }

            val hasSuggestions = state.suggestions.isNotEmpty()
            binding.textSuggestionsLabel.isVisible = hasSuggestions
            binding.layoutSuggestions.isVisible = hasSuggestions
            binding.layoutModify.isVisible = hasSuggestions
            binding.buttonApplyModify.isVisible = hasSuggestions
            renderSuggestionButtons(state.suggestions, state.selectedSuggestionIndex) { idx ->
                viewModel.selectSuggestion(idx)
            }

            val showVerifyCard = state.lastMode == SocialGptRequestMode.VERIFY &&
                (state.factCheckText.isNotBlank() || state.isLoading)
            binding.cardVerifyFact.isVisible = showVerifyCard
            binding.textVerifyFactBody.text = if (state.factCheckText.isNotBlank()) {
                renderRichText(state.factCheckText)
            } else {
                getString(R.string.socialgpt_loading)
            }
            binding.textVerifyFactBody.movementMethod = LinkMovementMethod.getInstance()

            if (hasResponse) {
                announceForScreenReader(getString(R.string.socialgpt_response_updated))
                if (binding.switchReadAfterGenerate.isChecked) {
                    speakResponse(state.responseText)
                }
            }
        }

        return binding.root
    }

    override fun onResume() {
        super.onResume()
        clipboardManager?.addPrimaryClipChangedListener(clipboardListener)
        // If user copied text in another app and then returned, import on resume.
        importClipboardTextIfAvailable()
    }

    override fun onPause() {
        super.onPause()
        clipboardManager?.removePrimaryClipChangedListener(clipboardListener)
    }

    private fun importSharedTextIfAvailable() {
        val sharedText = arguments?.getString(ARG_SHARED_TEXT)?.trim().orEmpty()
        if (sharedText.isNotBlank()) {
            binding.inputContext.setText(sharedText)
            announceForScreenReader(getString(R.string.socialgpt_shared_text_imported))
            arguments?.remove(ARG_SHARED_TEXT)
        }

        if (pendingAutoVerifyFromIntent) {
            pendingAutoVerifyFromIntent = false
            arguments?.remove(ARG_AUTO_VERIFY)
            triggerAutoVerify()
        }
    }

    private fun triggerAutoVerify() {
        val contextText = binding.inputContext.text?.toString().orEmpty().trim()
        if (contextText.isBlank()) {
            return
        }
        viewModel.generateDraft(
            token = tokenStore.getToken().orEmpty(),
            baseUrl = tokenStore.getBaseUrl(),
            contextText = contextText,
            promptText = "",
            model = tokenStore.getVerifyModel().ifBlank { "gpt-5.4" },
            language = tokenStore.getVerifyLanguage().ifBlank { "auto" },
            mood = tokenStore.getReplyMood().ifBlank { "balanced" },
            requestMode = SocialGptRequestMode.VERIFY
        )
    }

    private fun renderRichText(raw: String): CharSequence {
        if (raw.isBlank()) return raw
        var escaped = TextUtils.htmlEncode(raw)

        // Handle markdown links [text](url) -> clickable links
        escaped = escaped.replace(Regex("""\[([^\]]+)\]\(([^)]+)\)""")) { match ->
            val text = match.groupValues[1]
            val url = match.groupValues[2]
            "<a href=\"$url\">$text</a>"
        }

        // Handle plain URLs (http/https)
        escaped = escaped.replace(Regex("""(?:https?://[^\s\)]+)""")) { match ->
            val url = match.value
            "<a href=\"$url\">$url</a>"
        }

        // Handle markdown headers
        escaped = escaped.replace(Regex("""(?m)^###\s+(.+)$"""), "<b>$1</b>")
        escaped = escaped.replace(Regex("""(?m)^##\s+(.+)$"""), "<b>$1</b>")
        escaped = escaped.replace(Regex("""(?m)^#\s+(.+)$"""), "<b>$1</b>")

        // Handle markdown bold
        escaped = escaped.replace(Regex("""\*\*(.+?)\*\*"""), "<b>$1</b>")

        // Handle inline code
        escaped = escaped.replace(Regex("""`([^`]+)`"""), "<tt>$1</tt>")

        // Handle markdown lists
        escaped = escaped.replace(Regex("""(?m)^-\s+"""), "• ")

        // Convert newlines to HTML line breaks
        val html = escaped.replace("\n", "<br/>")

        return HtmlCompat.fromHtml(html, HtmlCompat.FROM_HTML_MODE_LEGACY)
    }

    private fun importClipboardTextIfAvailable() {
        val clipData = clipboardManager?.primaryClip ?: return
        if (clipData.itemCount <= 0) return

        val text = clipData.getItemAt(0).coerceToText(requireContext())?.toString()?.trim().orEmpty()
        if (text.isBlank()) return
        if (text == lastImportedClipboardText) return

        val currentText = binding.inputContext.text?.toString()?.trim().orEmpty()
        if (currentText == text) {
            lastImportedClipboardText = text
            return
        }

        binding.inputContext.setText(text)
        lastImportedClipboardText = text
        announceForScreenReader(getString(R.string.socialgpt_clipboard_imported))
    }

    private fun loadComposerState() {
        val savedInstruction = tokenStore.getSavedInstruction()
        val toolsInstruction = tokenStore.getQuickReplyInstruction()
        val initialInstruction = when {
            savedInstruction.isNotBlank() -> savedInstruction
            toolsInstruction.isNotBlank() -> toolsInstruction
            else -> getString(R.string.socialgpt_default_instruction)
        }
        binding.inputPrompt.setText(initialInstruction)
    }

    private fun renderSuggestionButtons(
        suggestions: List<String>,
        selectedIndex: Int,
        onSelect: (Int) -> Unit
    ) {
        val container = binding.layoutSuggestions
        container.removeAllViews()
        suggestions.forEachIndexed { index, suggestion ->
            val button = MaterialButton(requireContext(), null, com.google.android.material.R.attr.materialButtonOutlinedStyle).apply {
                text = suggestion
                isAllCaps = false
                textAlignment = View.TEXT_ALIGNMENT_VIEW_START
                setOnClickListener { onSelect(index) }
                strokeWidth = if (index == selectedIndex) 3 else 1
            }
            container.addView(button)
        }
    }

    private fun setupTextToSpeech() {
        textToSpeech = TextToSpeech(requireContext()) { status ->
            ttsReady = status == TextToSpeech.SUCCESS
        }
    }

    private fun speakResponse(text: String) {
        if (!ttsReady || text.isBlank()) {
            return
        }
        val selectedLanguage = tokenStore.getAnswerLanguage().ifBlank { "auto" }
        val locale = when (selectedLanguage) {
            "sv" -> Locale.forLanguageTag("sv-SE")
            "en" -> Locale.ENGLISH
            else -> Locale.getDefault()
        }
        textToSpeech?.language = locale
        textToSpeech?.speak(text, TextToSpeech.QUEUE_FLUSH, null, "socialgpt-response")
    }

    @Suppress("DEPRECATION")
    private fun announceForScreenReader(message: CharSequence?) {
        if (!message.isNullOrBlank()) {
            binding.textResponseBody.announceForAccessibility(message)
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        textToSpeech?.stop()
        textToSpeech?.shutdown()
        textToSpeech = null
        _binding = null
    }

    companion object {
        const val ARG_SHARED_TEXT = "shared_text"
        const val ARG_AUTO_VERIFY = "auto_verify"
    }
}

