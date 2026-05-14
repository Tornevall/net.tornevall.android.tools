package net.tornevall.android.tools.ui.socialgpt

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import net.tornevall.android.tools.data.socialgpt.ToolsSocialGptClient
import net.tornevall.android.tools.data.socialgpt.ToolsSocialGptException
import kotlin.concurrent.thread

data class SocialGptUiState(
    val responseText: String = "",
    val factCheckText: String = "",
    val suggestions: List<String> = emptyList(),
    val selectedSuggestionIndex: Int = -1,
    val lastMode: SocialGptRequestMode = SocialGptRequestMode.REPLY,
    val responseMeta: String = "",
    val validationError: String? = null,
    val isLoading: Boolean = false,
    val isGenerating: Boolean = false,
    val isVerifying: Boolean = false,
    val webSearchUsed: Boolean = false,
    val webSearchRequired: Boolean = false,
    val webSearchFailed: Boolean = false
)

enum class SocialGptRequestMode(val apiValue: String) {
    REPLY("reply"),
    VERIFY("verify")
}

class SocialGptViewModel : ViewModel() {

    private val client = ToolsSocialGptClient()

    private val _uiState = MutableLiveData(SocialGptUiState())
    val uiState: LiveData<SocialGptUiState> = _uiState

    fun generateDraft(
        token: String,
        baseUrl: String,
        contextText: String,
        promptText: String,
        model: String,
        language: String,
        mood: String,
        requestMode: SocialGptRequestMode = SocialGptRequestMode.REPLY
    ) {
        val cleanToken = token.trim()
        if (cleanToken.isEmpty()) {
            _uiState.value = SocialGptUiState(validationError = "token_required")
            return
        }

        val cleanPrompt = promptText.trim()
        if (requestMode == SocialGptRequestMode.REPLY && cleanPrompt.isEmpty()) {
            _uiState.value = SocialGptUiState(validationError = "prompt_required")
            return
        }

        val cleanContext = contextText.trim()
        if (cleanContext.isEmpty()) {
            _uiState.value = SocialGptUiState(validationError = "context_required")
            return
        }

        // Set appropriate loading flag based on request mode
        val isVerifying = requestMode == SocialGptRequestMode.VERIFY
        _uiState.value = SocialGptUiState(
            isLoading = true,
            isGenerating = !isVerifying,
            isVerifying = isVerifying
        )

        thread {
            val modePrompt = if (requestMode == SocialGptRequestMode.VERIFY) {
                if (cleanPrompt.isBlank()) DEFAULT_VERIFY_PROMPT else cleanPrompt
            } else {
                "$cleanPrompt\n\nReturn exactly three concise reply suggestions as a numbered list (1-3)."
            }

            val result = client.requestReply(
                baseUrl = baseUrl,
                token = cleanToken,
                contextText = cleanContext,
                promptText = modePrompt,
                model = model,
                language = language,
                requestMode = requestMode.apiValue,
                modifier = if (requestMode == SocialGptRequestMode.VERIFY) "deep_fact_check" else mood,
                reasoningEffort = if (requestMode == SocialGptRequestMode.VERIFY) "medium" else "medium",
                fallbackUrl = getAlternateBaseUrl(baseUrl)
            )

            result.onSuccess { apiResult ->
                val parsedSuggestions = if (requestMode == SocialGptRequestMode.REPLY) {
                    parseSuggestions(apiResult.responseText)
                } else {
                    emptyList()
                }
                val responseSuggestions = if (parsedSuggestions.isEmpty() && requestMode == SocialGptRequestMode.REPLY) {
                    listOf(apiResult.responseText)
                } else {
                    parsedSuggestions
                }

                val meta = buildString {
                    append(if (requestMode == SocialGptRequestMode.REPLY) "Mode: reply" else "Mode: verify")
                    append(" | ")
                    append("Model: ")
                    append(apiResult.model)
                    if (apiResult.usedFallbackModel) {
                        append(" (fallback used)")
                    }
                    if (apiResult.webSearchUsed) {
                        append(" | 🔍 Web search used")
                    }
                }

                _uiState.postValue(
                    SocialGptUiState(
                        responseText = responseSuggestions.firstOrNull().orEmpty(),
                        factCheckText = if (requestMode == SocialGptRequestMode.VERIFY) apiResult.responseText else "",
                        suggestions = responseSuggestions,
                        selectedSuggestionIndex = if (responseSuggestions.isNotEmpty()) 0 else -1,
                        lastMode = requestMode,
                        responseMeta = meta,
                        isLoading = false,
                        isGenerating = false,
                        isVerifying = false,
                        webSearchUsed = apiResult.webSearchUsed,
                        webSearchRequired = apiResult.webSearchRequired,
                        webSearchFailed = apiResult.webSearchFailed
                    )
                )
            }.onFailure { throwable ->
                val errorCode = (throwable as? ToolsSocialGptException)?.statusCode
                val validationError = when (errorCode) {
                    401 -> "unauthorized"
                    403 -> "forbidden"
                    else -> if ((throwable as? ToolsSocialGptException)?.message == "empty_response") {
                        "empty_response"
                    } else {
                        "request_failed"
                    }
                }

                _uiState.postValue(
                    SocialGptUiState(
                        validationError = validationError,
                        isLoading = false,
                        isGenerating = false,
                        isVerifying = false
                    )
                )
            }
        }
    }

    fun selectSuggestion(index: Int) {
        val current = _uiState.value ?: return
        if (index !in current.suggestions.indices) return
        _uiState.value = current.copy(
            selectedSuggestionIndex = index,
            responseText = current.suggestions[index],
            validationError = null
        )
    }

    fun applyModify(
        token: String,
        baseUrl: String,
        model: String,
        language: String,
        mood: String,
        modifyInstruction: String
    ) {
        val state = _uiState.value ?: SocialGptUiState()
        val tokenValue = token.trim()
        if (tokenValue.isBlank()) {
            _uiState.value = state.copy(validationError = "token_required")
            return
        }

        val selectedSuggestion = state.suggestions.getOrNull(state.selectedSuggestionIndex)
        if (selectedSuggestion.isNullOrBlank()) {
            _uiState.value = state.copy(validationError = "no_suggestion_selected")
            return
        }

        val instruction = modifyInstruction.trim().ifBlank {
            "Refine this suggestion to be clearer while keeping the intent."
        }

        _uiState.value = state.copy(isLoading = true, isGenerating = true, validationError = null)

        thread {
            val result = client.requestReply(
                baseUrl = baseUrl,
                token = tokenValue,
                contextText = selectedSuggestion,
                promptText = "Rewrite the suggestion using this instruction: $instruction\\nReturn one final reply only.",
                model = model,
                language = language,
                requestMode = SocialGptRequestMode.REPLY.apiValue,
                modifier = mood,
                reasoningEffort = "medium",
                fallbackUrl = getAlternateBaseUrl(baseUrl)
            )

            result.onSuccess { apiResult ->
                val updatedSuggestions = state.suggestions.toMutableList()
                val idx = state.selectedSuggestionIndex.coerceAtLeast(0)
                if (idx in updatedSuggestions.indices) {
                    updatedSuggestions[idx] = apiResult.responseText
                } else {
                    updatedSuggestions.add(0, apiResult.responseText)
                }

                _uiState.postValue(
                    state.copy(
                        isLoading = false,
                        isGenerating = false,
                        responseText = apiResult.responseText,
                        suggestions = updatedSuggestions,
                        selectedSuggestionIndex = idx.coerceAtMost(updatedSuggestions.lastIndex),
                        lastMode = SocialGptRequestMode.REPLY,
                        responseMeta = "Mode: reply | Model: ${apiResult.model}",
                        validationError = null,
                        webSearchUsed = apiResult.webSearchUsed,
                        webSearchRequired = apiResult.webSearchRequired,
                        webSearchFailed = apiResult.webSearchFailed
                    )
                )
            }.onFailure { throwable ->
                val errorCode = (throwable as? ToolsSocialGptException)?.statusCode
                val validationError = when (errorCode) {
                    401 -> "unauthorized"
                    403 -> "forbidden"
                    else -> "request_failed"
                }
                _uiState.postValue(state.copy(isLoading = false, isGenerating = false, validationError = validationError))
            }
        }
    }

    private fun parseSuggestions(raw: String): List<String> {
        val numbered = Regex("""^\\s*\\d+[.):-]?\\s+(.+)$""")
        val parsed = raw.lines()
            .map { it.trim() }
            .filter { it.isNotBlank() }
            .mapNotNull { line -> numbered.find(line)?.groupValues?.getOrNull(1)?.trim() }

        return if (parsed.size >= 2) parsed.take(3) else emptyList()
    }

    private fun getAlternateBaseUrl(currentUrl: String): String {
        return if (currentUrl.contains("tools.tornevall.com")) {
            "https://tools.tornevall.net/api"
        } else if (currentUrl.contains("tools.tornevall.net")) {
            "https://tools.tornevall.com/api"
        } else {
            ""
        }
    }

    companion object {
        private const val DEFAULT_VERIFY_PROMPT =
            "Do a deep fact-check of the context. Identify likely inaccuracies, confidence, and what should be verified before posting. Keep output clear for a compact mobile UI."
    }
}
