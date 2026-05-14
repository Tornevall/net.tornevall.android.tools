package net.tornevall.android.tools.data.socialgpt

import net.tornevall.android.tools.data.settings.ToolsTokenStore
import org.json.JSONArray
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL

data class ToolsTokenValidationResult(
    val valid: Boolean,
    val message: String,
    val userName: String = ""
)

data class ToolsExtensionSettings(
    val responderName: String = "",
    val personaProfile: String = "",
    val customInstruction: String = "",
    val autoDetectResponder: Boolean = true,
    val mood: String = "",
    val customMood: String = "",
    val responseLanguage: String = "auto",
    val verifyFactLanguage: String = "auto"
)

class ToolsExtensionClient(
    private val baseUrl: String = ToolsTokenStore.BASE_URL_PROD,
    private var fallbackUrl: String = ToolsTokenStore.BASE_URL_DEV
) {

    fun getSettingsWithFallback(token: String): Result<ToolsExtensionSettings> {
        // Try primary URL first
        val primaryResult = getSettings(token)
        if (primaryResult.isSuccess) return primaryResult

        // Fallback to dev URL if prod fails
        return if (baseUrl != fallbackUrl) {
            get("$fallbackUrl/social-media-tools/extension/settings", token) { body ->
                parseSettingsBody(body)
            }
        } else {
            primaryResult
        }
    }

    fun validateToken(token: String): Result<ToolsTokenValidationResult> {
        return get("$baseUrl/social-media-tools/extension/validate-token", token) { body ->
            val json = JSONObject(body)
            val userName = json.optJSONObject("user")?.optString("name").orEmpty()
            val msg = if (userName.isNotBlank()) "Bearer token accepted for $userName." else extractMessage(body)
            ToolsTokenValidationResult(
                valid = json.optBoolean("valid", json.optBoolean("ok", false)),
                message = msg,
                userName = userName
            )
        }
    }

    fun getSettings(token: String): Result<ToolsExtensionSettings> {
        return get("$baseUrl/social-media-tools/extension/settings", token) { body ->
            parseSettingsBody(body)
        }
    }

    fun saveSettings(token: String, settings: ToolsExtensionSettings): Result<Unit> {
        return runCatching {
            val payload = JSONObject().apply {
                put("persona_profile", settings.personaProfile)
                put("custom_instruction", settings.customInstruction)
                put("response_language", settings.responseLanguage)
            }
            val (statusCode, body) = request("PUT", "$baseUrl/social-media-tools/extension/settings", token, payload.toString())
            if (statusCode !in 200..299) throw ToolsSocialGptException(statusCode, extractMessage(body))
        }
    }

    fun getModels(token: String): Result<List<String>> {
        return get("$baseUrl/social-media-tools/extension/models", token) { body ->
            val json = JSONObject(body)
            val arr: JSONArray? = json.optJSONArray("models")
            if (arr != null) {
                (0 until arr.length()).map { arr.optString(it) }.filter { it.isNotBlank() }
            } else {
                DEFAULT_MODELS
            }
        }
    }

    fun testConnection(token: String): Result<String> {
        return runCatching {
            val (statusCode, body) = request("POST", "$baseUrl/social-media-tools/extension/test", token, "{}")
            if (statusCode !in 200..299) throw ToolsSocialGptException(statusCode, extractMessage(body))
            val json = JSONObject(body)
            json.optString("message").ifBlank { "OK" }
        }
    }

    // --- helpers ---

    private fun <T> get(url: String, token: String, parse: (String) -> T): Result<T> {
        return retryWithBackoff {
            val connection = (URL(url).openConnection() as HttpURLConnection).apply {
                requestMethod = "GET"
                connectTimeout = 15_000
                readTimeout = 20_000
                doInput = true
                setRequestProperty("Accept", "application/json")
                setRequestProperty("Authorization", "Bearer ${token.trim()}")
            }
            val statusCode = connection.responseCode
            val body = readBody(connection, statusCode)
            if (statusCode !in 200..299) throw ToolsSocialGptException(statusCode, extractMessage(body))
            parse(body)
        }
    }

    private fun request(method: String, url: String, token: String, body: String): Pair<Int, String> {
        val result = retryWithBackoff {
            val connection = (URL(url).openConnection() as HttpURLConnection).apply {
                requestMethod = method
                connectTimeout = 15_000
                readTimeout = 20_000
                doInput = true
                doOutput = body.isNotBlank()
                setRequestProperty("Accept", "application/json")
                setRequestProperty("Content-Type", "application/json; charset=utf-8")
                setRequestProperty("Authorization", "Bearer ${token.trim()}")
            }
            if (body.isNotBlank()) {
                OutputStreamWriter(connection.outputStream, Charsets.UTF_8).use { it.write(body) }
            }
            val statusCode = connection.responseCode
            Pair(statusCode, readBody(connection, statusCode))
        }
        return result.getOrThrow()
    }

    private fun <T> retryWithBackoff(action: () -> T): Result<T> {
        var lastException: Exception? = null
        var backoff = 500L

        for (attempt in 1..3) {
            try {
                return Result.success(action())
            } catch (e: Exception) {
                lastException = e
                if (attempt < 3) {
                    Thread.sleep(backoff)
                    backoff *= 2
                }
            }
        }

        return Result.failure(lastException ?: Exception("Retry failed"))
    }

    private fun readBody(connection: HttpURLConnection, statusCode: Int): String {
        val stream = if (statusCode in 200..299) connection.inputStream else connection.errorStream
        return stream?.let { BufferedReader(InputStreamReader(it, Charsets.UTF_8)).use { r -> r.readText() } } ?: ""
    }

    private fun extractMessage(rawBody: String): String {
        if (rawBody.isBlank()) return ""
        return runCatching {
            val json = JSONObject(rawBody)
            json.optString("message").ifBlank { json.optString("error").ifBlank { rawBody } }
        }.getOrDefault(rawBody)
    }

    private fun parseSettingsBody(rawBody: String): ToolsExtensionSettings {
        val root = JSONObject(rawBody)
        // Modern API shape uses { ok, settings: { ... } }, keep fallback for legacy flat payloads.
        val settings = root.optJSONObject("settings") ?: root

        val responderName = settings.optString("responder_name")
            .ifBlank { root.optString("responder_name") }
        val personaProfile = settings.optString("persona_profile")
            .ifBlank { root.optString("persona_profile") }
        val customInstruction = settings.optString("custom_instruction")
            .ifBlank { root.optString("custom_instruction") }
        val autoDetectResponder = if (settings.has("auto_detect_responder")) {
            settings.optBoolean("auto_detect_responder", true)
        } else {
            root.optBoolean("auto_detect_responder", true)
        }
        val mood = settings.optString("mood")
            .ifBlank { root.optString("mood") }
        val customMood = settings.optString("custom_mood")
            .ifBlank { root.optString("custom_mood") }
        val responseLanguage = settings.optString("response_language")
            .ifBlank { root.optString("response_language") }
            .ifBlank { "auto" }
        val verifyFactLanguage = settings.optString("verify_fact_language")
            .ifBlank { root.optString("verify_fact_language") }
            .ifBlank { "auto" }

        return ToolsExtensionSettings(
            responderName = responderName,
            personaProfile = personaProfile,
            customInstruction = customInstruction,
            autoDetectResponder = autoDetectResponder,
            mood = mood,
            customMood = customMood,
            responseLanguage = responseLanguage,
            verifyFactLanguage = verifyFactLanguage
        )
    }

    companion object {
        val DEFAULT_MODELS = listOf("gpt-5.4", "gpt-4o", "gpt-4o-mini", "o3-mini", "o1-mini")
    }
}
