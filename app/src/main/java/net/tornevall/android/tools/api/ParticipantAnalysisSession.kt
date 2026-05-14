package net.tornevall.android.tools.api

import android.graphics.Bitmap
import java.time.LocalDateTime

/**
 * Represents one sequential screen-capture session for Facebook participant-request analysis.
 *
 * This embryo reflects the guidance from AGENTS.md:
 * - Screen capture-first workflow (not GraphQL)
 * - Sequential stages: card → preview_comment → original_post → original_post_scrolled
 * - Weaker anchoring: each stage stored with explicit label instead of stable DOM anchor
 * - Screen text marked as observational, Tools as source of truth for rules/history
 *
 * @property groupId Facebook group ID from `/groups/<id>/...`
 * @property sessionStartedAt When this analysis session began on-device
 * @property stages Sequential capture stages with their OCR/text content
 * @property screenshotBitmaps Optional captured bitmaps (one per stage or subset)
 */
class ParticipantAnalysisSession(
    val groupId: String,
    val sessionStartedAt: LocalDateTime = LocalDateTime.now(),
    val stages: MutableList<AnalysisStage> = mutableListOf(),
    val screenshotBitmaps: MutableMap<String, Bitmap> = mutableMapOf()  // stageLabel -> bitmap
) {

    /**
     * Add one captured screen stage with optional screenshot and OCR text.
     * Stage labels: "card", "preview_comment", "original_post", "original_post_scrolled"
     */
    fun addStage(
        stageLabel: String,
        visibleText: String? = null,
        capturedBitmap: Bitmap? = null
    ) {
        stages.add(
            AnalysisStage(
                stageLabel = stageLabel,
                capturedAt = LocalDateTime.now(),
                visibleScreenText = visibleText,
                screenshotFileName = if (capturedBitmap != null) "stage_${stageLabel}_${System.currentTimeMillis()}.png" else null
            )
        )
        if (capturedBitmap != null) {
            screenshotBitmaps[stageLabel] = capturedBitmap
        }
    }

    /**
     * Mark when participant scrolled or advanced to next stage
     */
    fun recordUserAction(action: String, details: String? = null) {
        if (stages.isNotEmpty()) {
            stages.last().userActions.add(
                UserAction(
                    actionType = action,
                    recordedAt = LocalDateTime.now(),
                    details = details
                )
            )
        }
    }
}

/**
 * One individual capture stage within the analysis session.
 */
data class AnalysisStage(
    val stageLabel: String,  // "card", "preview_comment", "original_post", "original_post_scrolled"
    val capturedAt: LocalDateTime,
    val visibleScreenText: String? = null,  // Raw OCR/screen content marked as OBSERVATIONAL
    val screenshotFileName: String? = null,
    val userActions: MutableList<UserAction> = mutableListOf()
)

/**
 * User interaction during one stage (scrolling, clicking, etc.)
 */
data class UserAction(
    val actionType: String,  // "scroll", "click_visa_ursprungligt", "navigate_preview", etc.
    val recordedAt: LocalDateTime,
    val details: String? = null
)

/**
 * Candidate for analysis extracted from one or more stages.
 * This should map to what we send in POST /api/social-media-tools/extension/facebook-participant-history
 */
data class ParticipantCandidate(
    val name: String,
    val profileUrl: String? = null,
    val profileUserId: String? = null,
    val sourceStage: String,  // Which stage label did we extract this from
    val extractedText: String? = null  // Raw visible text context for this candidate
)

/**
 * Response structure when Tools API returns facebook-participant-history for a batch of candidates.
 * This maps the additive approval/rejection metadata from AGENTS.md change sync 2026-05-14.
 */
data class ParticipantHistoryResponse(
    val ok: Boolean,
    val participantRows: List<ParticipantHistoryRow> = emptyList(),
    val groupId: String? = null,
    val pageUrl: String? = null,
    val period_days: Int? = null
)

/**
 * Individual participant history row from Tools API.
 * Combines both rejections AND approvals (additive in 2026-05-14 change).
 */
data class ParticipantHistoryRow(
    val name: String,
    val profileUrl: String? = null,
    val profileUserId: String? = null,
    // Earlier rejection fields (pre-2026-05-14):
    val rejectionCount: Int = 0,
    // Additive approval fields (2026-05-14+):
    val matched: Boolean? = null,
    val decisionCount: Int? = null,
    val approvedCount: Int? = null,
    val approvedMembershipRequestCount: Int? = null,
    val approvedPendingPostCount: Int? = null,
    val approvedRegularPendingPostCount: Int? = null,
    val approvedAnonymousPendingPostCount: Int? = null,
    val approvedOtherCount: Int? = null,
    val firstSeenAt: LocalDateTime? = null,
    val lastSeenAt: LocalDateTime? = null,
    val firstApprovedAt: LocalDateTime? = null,
    val lastApprovedAt: LocalDateTime? = null,
    val latestOutcome: String? = null,
    // Combined summary (now describing both approvals + rejections):
    val summaryText: String? = null
)

