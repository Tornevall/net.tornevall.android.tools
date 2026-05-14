package net.tornevall.android.tools.api

import android.util.Log
import java.net.HttpURLConnection
import java.net.URL
import java.time.LocalDateTime
import org.json.JSONArray
import org.json.JSONObject

/**
 * Client wrapper for Facebook participant-analysis endpoints.
 * Handles:
 * - POST /api/social-media-tools/extension/facebook-participant-history
 * - GET|PUT /api/social-media-tools/extension/settings
 *
 * Auth: personal AI-capable token (tools_ai_bearer or other active personal token marked is_ai=1)
 * Transport: Authorization: Bearer <token>, X-Api-Key, or apikey
 */
class ParticipantAnalysisApiClient(
    private val baseUrl: String = "https://tools.tornevall.com",
    private val bearerToken: String? = null,
    private val apiKey: String? = null
) {
    companion object {
        private const val TAG = "ParticipantAnalysisApi"
    }

    /**
     * Fetch participant history from Tools for a batch of candidates.
     * Maps to: POST /api/social-media-tools/extension/facebook-participant-history
     *
     * @param pageUrl Facebook group participant page URL
     * @param groupId Facebook group ID (from /groups/<id>/...)
     * @param periodDays How far back to look (typically 180)
     * @param candidates List of ParticipantCandidate to look up
     * @return ParticipantHistoryResponse with approvals + rejections metadata
     */
    fun fetchParticipantHistory(
        pageUrl: String,
        groupId: String,
        periodDays: Int = 180,
        candidates: List<ParticipantCandidate>
    ): ParticipantHistoryResponse? {
        return try {
            val url = URL("$baseUrl/api/social-media-tools/extension/facebook-participant-history")
            val connection = url.openConnection() as HttpURLConnection

            connection.requestMethod = "POST"
            connection.setRequestProperty("Content-Type", "application/json")
            connection.setRequestProperty("Accept", "application/json")

            // Add auth header
            bearerToken?.let {
                connection.setRequestProperty("Authorization", "Bearer $it")
            } ?: apiKey?.let {
                connection.setRequestProperty("X-Api-Key", it)
            }

            // Build request body
            val requestBody = JSONObject().apply {
                put("page_url", pageUrl)
                put("group_id", groupId)
                put("period_days", periodDays)
                put("candidates", JSONArray().apply {
                    candidates.forEach { candidate ->
                        put(JSONObject().apply {
                            put("name", candidate.name)
                            candidate.profileUrl?.let { put("profile_url", it) }
                            candidate.profileUserId?.let { put("profile_user_id", it) }
                        })
                    }
                })
            }

            connection.doOutput = true
            connection.outputStream.use { os ->
                os.write(requestBody.toString().toByteArray())
            }

            if (connection.responseCode == 200) {
                val response = connection.inputStream.bufferedReader().use { it.readText() }
                Log.d(TAG, "Participant history response: $response")
                parseParticipantHistoryResponse(response)
            } else {
                Log.e(TAG, "Participant history request failed: ${connection.responseCode}")
                null
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error fetching participant history", e)
            null
        }
    }

    /**
     * Fetch current SocialGPT settings from Tools, including per-group participant rules.
     * Maps to: GET /api/social-media-tools/extension/settings
     *
     * @return JSONObject with settings, or null on failure
     */
    fun fetchExtensionSettings(): JSONObject? {
        return try {
            val url = URL("$baseUrl/api/social-media-tools/extension/settings")
            val connection = url.openConnection() as HttpURLConnection

            connection.requestMethod = "GET"
            connection.setRequestProperty("Accept", "application/json")

            // Add auth header
            bearerToken?.let {
                connection.setRequestProperty("Authorization", "Bearer $it")
            } ?: apiKey?.let {
                connection.setRequestProperty("X-Api-Key", it)
            }

            if (connection.responseCode == 200) {
                val response = connection.inputStream.bufferedReader().use { it.readText() }
                Log.d(TAG, "Extension settings response: $response")
                JSONObject(response)
            } else {
                Log.e(TAG, "Extension settings request failed: ${connection.responseCode}")
                null
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error fetching extension settings", e)
            null
        }
    }

    /**
     * Extract facebook_participant_group_contexts_by_group_id from settings.
     * This map is keyed by group ID (the <id> from /groups/<id>/...) and contains per-group rules.
     *
     * @param settings JSONObject from fetchExtensionSettings()
     * @return Map<groupId, ruleText>
     */
    fun extractPerGroupRules(settings: JSONObject): Map<String, String> {
        return try {
            val rules = mutableMapOf<String, String>()
            val settingsObj = settings.optJSONObject("settings") ?: return rules
            val groupContexts = settingsObj.optJSONObject("facebook_participant_group_contexts_by_group_id") ?: return rules

            groupContexts.keys().forEach { groupId ->
                rules[groupId] = groupContexts.optString(groupId, "")
            }
            rules
        } catch (e: Exception) {
            Log.e(TAG, "Error extracting per-group rules", e)
            emptyMap()
        }
    }

    /**
     * Get the global fallback Facebook participant context (older single field).
     * This is used as a fallback when the current group is not in facebook_participant_group_contexts_by_group_id.
     */
    fun extractGlobalParticipantContext(settings: JSONObject): String? {
        return try {
            settings.optJSONObject("settings")?.optString("facebook_participant_group_context")
        } catch (e: Exception) {
            Log.e(TAG, "Error extracting global participant context", e)
            null
        }
    }

    private fun parseParticipantHistoryResponse(jsonStr: String): ParticipantHistoryResponse {
        return try {
            val json = JSONObject(jsonStr)
            val ok = json.optBoolean("ok", false)
            val groupId = json.optString("group_id")
            val pageUrl = json.optString("page_url")
            val periodDays = json.optInt("period_days")

            val participantRows = mutableListOf<ParticipantHistoryRow>()
            val rowsArray = json.optJSONArray("participant_rows")

            if (rowsArray != null) {
                for (i in 0 until rowsArray.length()) {
                    val rowJson = rowsArray.getJSONObject(i)
                    participantRows.add(
                        ParticipantHistoryRow(
                            name = rowJson.optString("name", ""),
                            profileUrl = rowJson.optString("profile_url"),
                            profileUserId = rowJson.optString("profile_user_id"),
                            rejectionCount = rowJson.optInt("rejection_count", 0),
                            // Additive fields (2026-05-14):
                            matched = rowJson.optBoolean("matched"),
                            decisionCount = rowJson.optInt("decision_count"),
                            approvedCount = rowJson.optInt("approved_count"),
                            approvedMembershipRequestCount = rowJson.optInt("approved_membership_request_count"),
                            approvedPendingPostCount = rowJson.optInt("approved_pending_post_count"),
                            approvedRegularPendingPostCount = rowJson.optInt("approved_regular_pending_post_count"),
                            approvedAnonymousPendingPostCount = rowJson.optInt("approved_anonymous_pending_post_count"),
                            approvedOtherCount = rowJson.optInt("approved_other_count"),
                            firstSeenAt = rowJson.optString("first_seen_at")?.let { parseDateTime(it) },
                            lastSeenAt = rowJson.optString("last_seen_at")?.let { parseDateTime(it) },
                            firstApprovedAt = rowJson.optString("first_approved_at")?.let { parseDateTime(it) },
                            lastApprovedAt = rowJson.optString("last_approved_at")?.let { parseDateTime(it) },
                            latestOutcome = rowJson.optString("latest_outcome"),
                            summaryText = rowJson.optString("summary_text")
                        )
                    )
                }
            }

            ParticipantHistoryResponse(
                ok = ok,
                participantRows = participantRows,
                groupId = if (groupId.isNotEmpty()) groupId else null,
                pageUrl = if (pageUrl.isNotEmpty()) pageUrl else null,
                period_days = if (periodDays > 0) periodDays else null
            )
        } catch (e: Exception) {
            Log.e(TAG, "Error parsing participant history response", e)
            ParticipantHistoryResponse(ok = false)
        }
    }

    private fun parseDateTime(dateStr: String): LocalDateTime? {
        return try {
            // ISO 8601 format: "2026-04-21T11:20:00+00:00"
            LocalDateTime.parse(dateStr.substring(0, 19).replace(" ", "T"))
        } catch (e: Exception) {
            Log.w(TAG, "Could not parse datetime: $dateStr")
            null
        }
    }
}

