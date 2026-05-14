package net.tornevall.android.tools.data.socialgpt

import net.tornevall.android.tools.data.settings.ToolsTokenStore

data class ToolsExtensionSyncPlan(
    val composerInstruction: String,
    val shouldReplaceSavedInstruction: Boolean,
    val previousSyncedInstruction: String
)

fun resolveToolsExtensionSyncPlan(
    settings: ToolsExtensionSettings,
    currentSavedInstruction: String,
    previousSyncedInstruction: String
): ToolsExtensionSyncPlan {
    val composerInstruction = settings.personaProfile.trim().ifBlank {
        settings.customInstruction.trim()
    }
    val normalizedSavedInstruction = currentSavedInstruction.trim()
    val normalizedPreviousSyncedInstruction = previousSyncedInstruction.trim()
    val shouldReplaceSavedInstruction = composerInstruction.isNotBlank() && (
        normalizedSavedInstruction.isBlank() ||
            normalizedSavedInstruction == normalizedPreviousSyncedInstruction
        )

    return ToolsExtensionSyncPlan(
        composerInstruction = composerInstruction,
        shouldReplaceSavedInstruction = shouldReplaceSavedInstruction,
        previousSyncedInstruction = normalizedPreviousSyncedInstruction
    )
}

fun resolveInitialSocialGptInstruction(
    savedInstruction: String,
    quickReplyInstruction: String,
    personaProfile: String,
    defaultInstruction: String
): String {
    return savedInstruction.trim().ifBlank {
        quickReplyInstruction.trim().ifBlank {
            personaProfile.trim().ifBlank { defaultInstruction }
        }
    }
}

fun applyToolsExtensionSettingsToStore(
    tokenStore: ToolsTokenStore,
    settings: ToolsExtensionSettings
): ToolsExtensionSyncPlan {
    val plan = resolveToolsExtensionSyncPlan(
        settings = settings,
        currentSavedInstruction = tokenStore.getSavedInstruction(),
        previousSyncedInstruction = tokenStore.getLastSyncedToolsInstruction()
    )

    tokenStore.setPersonaProfile(settings.personaProfile)
    tokenStore.setAnswerLanguage(settings.responseLanguage.ifBlank { "auto" })
    tokenStore.setVerifyLanguage(settings.verifyFactLanguage.ifBlank { "auto" })

    if (plan.composerInstruction.isNotBlank()) {
        tokenStore.setQuickReplyInstruction(plan.composerInstruction)
        tokenStore.setLastSyncedToolsInstruction(plan.composerInstruction)
        if (plan.shouldReplaceSavedInstruction) {
            tokenStore.setSavedInstruction(plan.composerInstruction)
        }
    } else {
        tokenStore.setLastSyncedToolsInstruction("")
    }

    return plan
}

