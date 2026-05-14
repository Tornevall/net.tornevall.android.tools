package net.tornevall.android.tools.data.socialgpt

import net.tornevall.android.tools.BuildConfig
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL

data class ToolsSocialGptResult(
    val responseText: String,
    val model: String,
    val usedFallbackModel: Boolean,
    val webSearchUsed: Boolean = false,
    val webSearchRequired: Boolean = false,
    val webSearchFailed: Boolean = false
)

class ToolsSocialGptClient {

    fun requestReply(
        baseUrl: String,
        token: String,
        contextText: String,
        promptText: String,
        model: String,
        language: String,
        requestMode: String,
        modifier: String = "",
        reasoningEffort: String? = null,
        fallbackUrl: String? = null
    ): Result<ToolsSocialGptResult> {
        return try {
            Result.success(tryRequestReply(baseUrl, token, contextText, promptText, model, language, requestMode, modifier, reasoningEffort))
        } catch (e: Exception) {
            // Try fallback URL if provided and primary failed
            if (fallbackUrl != null && baseUrl != fallbackUrl && e is ToolsSocialGptException) {
                try {
                    return Result.success(tryRequestReply(fallbackUrl, token, contextText, promptText, model, language, requestMode, modifier, reasoningEffort))
                } catch (fallbackError: Exception) {
                    return Result.failure(fallbackError)
                }
            }
            Result.failure(e)
        }
    }

    private fun tryRequestReply(
        baseUrl: String,
        token: String,
        contextText: String,
        promptText: String,
        model: String,
        language: String,
        requestMode: String,
        modifier: String = "",
        reasoningEffort: String? = null
    ): ToolsSocialGptResult {
        val endpoint = baseUrl.trimEnd('/') + "/ai/socialgpt/respond"
        val url = URL(endpoint)
        val connection = (url.openConnection() as HttpURLConnection).apply {
            requestMethod = "POST"
            connectTimeout = 15_000
            readTimeout = 30_000
            doInput = true
            doOutput = true
            setRequestProperty("Accept", "application/json")
            setRequestProperty("Content-Type", "application/json; charset=utf-8")
            setRequestProperty("Authorization", "Bearer ${token.trim()}")
        }

        val payload = JSONObject().apply {
            put("context", contextText)
            put("user_prompt", promptText)
            put("modifier", modifier)
            put("model", model.ifBlank { DEFAULT_MODEL })
            put("request_mode", requestMode)
            put("response_language", language.ifBlank { "auto" })
            put("client_name", CLIENT_NAME)
            put("client_version", BuildConfig.VERSION_NAME)
            put("client_platform", CLIENT_PLATFORM)
            if (!reasoningEffort.isNullOrBlank()) {
                put("reasoning_effort", reasoningEffort)
            }
        }

        OutputStreamWriter(connection.outputStream, Charsets.UTF_8).use { writer ->
            writer.write(payload.toString())
        }

        val statusCode = connection.responseCode
        val rawBody = readResponseBody(connection, statusCode)
        if (statusCode !in 200..299) {
            throw ToolsSocialGptException(statusCode, extractErrorMessage(rawBody))
        }

        val json = JSONObject(rawBody)
        val responseText = json.optString("response").trim()
        if (responseText.isBlank()) {
            throw ToolsSocialGptException(statusCode, "empty_response")
        }

        // Extract web_search metadata from nested object if available
        val webSearch = json.optJSONObject("web_search")
        val webSearchUsed = webSearch?.optBoolean("used", false) ?: false
        val webSearchRequired = webSearch?.optBoolean("required", false) ?: false
        val webSearchFailed = webSearch?.optBoolean("failed", false) ?: false

        return ToolsSocialGptResult(
            responseText = responseText,
            model = json.optString("model", model.ifBlank { DEFAULT_MODEL }),
            usedFallbackModel = json.optBoolean("used_fallback_model", false),
            webSearchUsed = webSearchUsed,
            webSearchRequired = webSearchRequired,
            webSearchFailed = webSearchFailed
        )
    }

    private fun readResponseBody(connection: HttpURLConnection, statusCode: Int): String {
        val stream = if (statusCode in 200..299) connection.inputStream else connection.errorStream
        if (stream == null) {
            return ""
        }
        return BufferedReader(InputStreamReader(stream, Charsets.UTF_8)).use { reader ->
            reader.readText()
        }
    }

    private fun extractErrorMessage(rawBody: String): String {
        if (rawBody.isBlank()) {
            return "request_failed"
        }
        return runCatching {
            val json = JSONObject(rawBody)
            when {
                json.optString("message").isNotBlank() -> json.optString("message")
                json.optString("error").isNotBlank() -> json.optString("error")
                else -> "request_failed"
            }
        }.getOrDefault("request_failed")
    }

    companion object {
        private const val CLIENT_NAME = "Tornevall Networks Tools for Android"
        private const val CLIENT_PLATFORM = "android_app"
        private const val DEFAULT_MODEL = "gpt-4o-mini"
    }
}

class ToolsSocialGptException(
    val statusCode: Int,
    override val message: String
) : Exception(message)

