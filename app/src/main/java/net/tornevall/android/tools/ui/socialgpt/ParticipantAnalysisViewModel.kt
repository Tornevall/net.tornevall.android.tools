package net.tornevall.android.tools.ui.socialgpt

import android.content.Context
import android.graphics.Bitmap
import android.util.Log
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import net.tornevall.android.tools.api.ParticipantAnalysisApiClient
import net.tornevall.android.tools.api.ParticipantAnalysisSession
import net.tornevall.android.tools.api.ParticipantCandidate
import net.tornevall.android.tools.api.ParticipantHistoryResponse
import java.time.LocalDateTime

/**
 * ViewModel for managing Facebook participant-request analysis sessions.
 *
 * Responsibilities:
 * - Track multi-stage capture session (card → preview_comment → original_post → scrolled)
 * - Store captured bitmaps and OCR text (marked OBSERVATIONAL)
 * - Syncs per-group rules and participant history from Tools API
 * - Coordinates between screen capture UI and backend API calls
 *
 * Note: This is an embryo. Stage labels are intentionally simple (no stable DOM anchor).
 */
class ParticipantAnalysisViewModel(
    private val context: Context,
    private val apiToken: String? = null
) : ViewModel() {

    companion object {
        private const val TAG = "ParticipantAnalysisVM"
    }

    // Current analysis session
    private val _currentSession = MutableLiveData<ParticipantAnalysisSession?>(null)
    val currentSession: LiveData<ParticipantAnalysisSession?> = _currentSession

    // Fetched rules from Tools for current group
    private val _groupRules = MutableLiveData<String?>(null)
    val groupRules: LiveData<String?> = _groupRules

    // Fetched history for current batch of candidates
    private val _participantHistory = MutableLiveData<ParticipantHistoryResponse?>(null)
    val participantHistory: LiveData<ParticipantHistoryResponse?> = _participantHistory

    // UI state
    private val _isLoading = MutableLiveData(false)
    val isLoading: LiveData<Boolean> = _isLoading

    private val _errorMessage = MutableLiveData<String?>(null)
    val errorMessage: LiveData<String?> = _errorMessage

    private val apiClient = ParticipantAnalysisApiClient(
        bearerToken = apiToken
    )

    /**
     * Start a new analysis session for a Facebook group.
     */
    fun startAnalysisSession(groupId: String) {
        Log.d(TAG, "Starting new analysis session for group: $groupId")
        _currentSession.value = ParticipantAnalysisSession(groupId = groupId)

        // Fetch group-specific rules from Tools in background
        viewModelScope.launch(Dispatchers.Default) {
            fetchGroupRules(groupId)
        }
    }

    /**
     * Capture one stage of the analysis (participant card, preview, original post, etc.)
     */
    fun captureStage(
        stageLabel: String,
        visibleText: String? = null,
        bitmap: Bitmap? = null
    ) {
        Log.d(TAG, "Capturing stage: $stageLabel")
        _currentSession.value?.addStage(
            stageLabel = stageLabel,
            visibleText = visibleText,
            capturedBitmap = bitmap
        )
    }

    /**
     * Record user action during capture (scroll, click, navigate, etc.)
     */
    fun recordUserAction(actionType: String, details: String? = null) {
        _currentSession.value?.recordUserAction(actionType, details)
    }

    /**
     * Send captured participant candidates to Tools for history/approval lookup.
     * This builds a batch request to POST /api/social-media-tools/extension/facebook-participant-history
     */
    fun analyzeParticipants(
        pageUrl: String,
        candidates: List<ParticipantCandidate>,
        periodDays: Int = 180
    ) {
        val session = _currentSession.value ?: run {
            _errorMessage.value = "No active analysis session"
            return
        }

        Log.d(TAG, "Analyzing ${candidates.size} participants for group ${session.groupId}")

        viewModelScope.launch(Dispatchers.Default) {
            _isLoading.value = true
            try {
                val response = apiClient.fetchParticipantHistory(
                    pageUrl = pageUrl,
                    groupId = session.groupId,
                    periodDays = periodDays,
                    candidates = candidates
                )
                if (response != null) {
                    _participantHistory.postValue(response)
                    Log.d(TAG, "Got history for ${response.participantRows.size} participants")
                } else {
                    _errorMessage.postValue("Failed to fetch participant history from Tools")
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error analyzing participants", e)
                _errorMessage.postValue("Error: ${e.message}")
            } finally {
                _isLoading.postValue(false)
            }
        }
    }

    /**
     * Fetch per-group rules from Tools settings.
     * These are the moderation/risk context rules stored for exact group IDs.
     */
    private suspend fun fetchGroupRules(groupId: String) {
        try {
            val settings = apiClient.fetchExtensionSettings() ?: return
            val perGroupRules = apiClient.extractPerGroupRules(settings)

            // Look for exact group match, fall back to global
            val ruleText = perGroupRules[groupId]
                ?: apiClient.extractGlobalParticipantContext(settings)
                ?: "No rules configured for this group"

            _groupRules.postValue(ruleText)
            Log.d(TAG, "Loaded group rules for $groupId: $ruleText")
        } catch (e: Exception) {
            Log.e(TAG, "Error fetching group rules", e)
        }
    }

    /**
     * End current analysis session and optionally save/upload.
     */
    fun endAnalysisSession(saveToDatabase: Boolean = false) {
        Log.d(TAG, "Ending analysis session. Save=$saveToDatabase")
        if (saveToDatabase) {
            _currentSession.value?.let { session ->
                // TODO: Implement local persistence (Room DB) for offline history
                // For now, just log
                Log.d(TAG, "Session with ${session.stages.size} stages would be saved")
            }
        }
        _currentSession.value = null
        _participantHistory.value = null
        _groupRules.value = null
    }

    /**
     * Get human-readable summary of current session progress.
     */
    fun getSessionSummary(): String {
        val session = _currentSession.value ?: return "No active session"
        return buildString {
            append("Session for group ${session.groupId}\n")
            append("Started: ${session.sessionStartedAt}\n")
            append("Stages captured: ${session.stages.size}\n")
            session.stages.forEach { stage ->
                append("  - ${stage.stageLabel} (${stage.capturedAt})")
                if (!stage.userActions.isEmpty()) {
                    append(" [${stage.userActions.size} actions]")
                }
                append("\n")
            }
        }
    }
}

