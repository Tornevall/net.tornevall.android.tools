package net.tornevall.android.tools.data.settings

import android.content.Context

class ToolsTokenStore(context: Context) {

    private val prefs = context.applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    // --- Token ---
    fun getToken(): String? =
        prefs.getString(KEY_TOOLS_TOKEN, null)?.trim().takeUnless { it.isNullOrEmpty() }

    fun saveToken(token: String) {
        prefs.edit().putString(KEY_TOOLS_TOKEN, token.trim()).apply()
    }

    fun clearToken() {
        prefs.edit().remove(KEY_TOOLS_TOKEN).apply()
    }

    // --- Environment ---
    fun isDevMode(): Boolean = prefs.getBoolean(KEY_DEV_MODE, false)
    fun setDevMode(enabled: Boolean) { prefs.edit().putBoolean(KEY_DEV_MODE, enabled).apply() }

    fun getBaseUrl(): String =
        if (isDevMode()) BASE_URL_DEV else BASE_URL_PROD

    fun getPersonaProfile(): String = prefs.getString(KEY_PERSONA_PROFILE, "").orEmpty()
    fun setPersonaProfile(profile: String) { prefs.edit().putString(KEY_PERSONA_PROFILE, profile.trim()).apply() }

    // --- Language & model ---
    fun getAnswerLanguage(): String = prefs.getString(KEY_ANSWER_LANGUAGE, "auto").orEmpty()
    fun setAnswerLanguage(lang: String) { prefs.edit().putString(KEY_ANSWER_LANGUAGE, lang).apply() }

    fun getVerifyLanguage(): String = prefs.getString(KEY_VERIFY_LANGUAGE, "auto").orEmpty()
    fun setVerifyLanguage(lang: String) { prefs.edit().putString(KEY_VERIFY_LANGUAGE, lang).apply() }

    fun getVerifyModel(): String = prefs.getString(KEY_VERIFY_MODEL, "gpt-5.4").orEmpty()
    fun setVerifyModel(model: String) { prefs.edit().putString(KEY_VERIFY_MODEL, model).apply() }

    fun getReplyModel(): String = prefs.getString(KEY_REPLY_MODEL, "gpt-4o").orEmpty()
    fun setReplyModel(model: String) { prefs.edit().putString(KEY_REPLY_MODEL, model).apply() }

    fun getReplyMood(): String = prefs.getString(KEY_REPLY_MOOD, "balanced").orEmpty()
    fun setReplyMood(mood: String) { prefs.edit().putString(KEY_REPLY_MOOD, mood).apply() }

    // --- Quick reply ---
    fun getQuickReplyPreset(): String = prefs.getString(KEY_QUICK_REPLY_PRESET, "default").orEmpty()
    fun setQuickReplyPreset(preset: String) { prefs.edit().putString(KEY_QUICK_REPLY_PRESET, preset).apply() }

    fun getQuickReplyInstruction(): String = prefs.getString(KEY_QUICK_REPLY_INSTRUCTION, "").orEmpty()
    fun setQuickReplyInstruction(instruction: String) { prefs.edit().putString(KEY_QUICK_REPLY_INSTRUCTION, instruction.trim()).apply() }

    // --- SocialGPT composer state ---
    fun getSavedInstruction(): String = prefs.getString(KEY_SAVED_INSTRUCTION, "").orEmpty()
    fun setSavedInstruction(instruction: String) { prefs.edit().putString(KEY_SAVED_INSTRUCTION, instruction.trim()).apply() }

    fun getSavedMood(): String = prefs.getString(KEY_SAVED_MOOD, "balanced").orEmpty()
    fun setSavedMood(mood: String) { prefs.edit().putString(KEY_SAVED_MOOD, mood.trim().ifBlank { "balanced" }).apply() }

    fun isAccessibilityShortcutEnabled(): Boolean =
        prefs.getBoolean(KEY_ACCESSIBILITY_SHORTCUT_ENABLED, true)

    fun setAccessibilityShortcutEnabled(enabled: Boolean) {
        prefs.edit().putBoolean(KEY_ACCESSIBILITY_SHORTCUT_ENABLED, enabled).apply()
    }

    fun getBubbleSize(): String = prefs.getString(KEY_BUBBLE_SIZE, "medium").orEmpty()

    fun setBubbleSize(size: String) {
        val normalized = when (size.trim().lowercase()) {
            "small", "medium", "large" -> size.trim().lowercase()
            else -> "medium"
        }
        prefs.edit().putString(KEY_BUBBLE_SIZE, normalized).apply()
    }

    companion object {
        private const val PREFS_NAME = "tools_settings"
        const val KEY_TOOLS_TOKEN = "tools_api_token"
        private const val KEY_DEV_MODE = "dev_mode"
        private const val KEY_PERSONA_PROFILE = "persona_profile"
        private const val KEY_ANSWER_LANGUAGE = "default_response_language"
        private const val KEY_VERIFY_LANGUAGE = "default_verify_fact_language"
        private const val KEY_VERIFY_MODEL = "preferred_fact_check_model"
        private const val KEY_REPLY_MODEL = "preferred_reply_model"
        private const val KEY_REPLY_MOOD = "preferred_reply_mood"
        private const val KEY_QUICK_REPLY_PRESET = "default_quick_reply_preset"
        private const val KEY_QUICK_REPLY_INSTRUCTION = "default_quick_reply_custom_instruction"
        private const val KEY_SAVED_INSTRUCTION = "socialgpt_saved_instruction"
        private const val KEY_SAVED_MOOD = "socialgpt_saved_mood"
        private const val KEY_ACCESSIBILITY_SHORTCUT_ENABLED = "accessibility_shortcut_enabled"
        private const val KEY_BUBBLE_SIZE = "bubble_size"

        const val BASE_URL_PROD = "https://tools.tornevall.net/api"
        const val BASE_URL_DEV = "https://tools.tornevall.com/api"
    }
}

