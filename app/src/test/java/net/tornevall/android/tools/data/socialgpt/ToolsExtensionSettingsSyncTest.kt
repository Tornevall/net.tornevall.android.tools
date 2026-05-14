package net.tornevall.android.tools.data.socialgpt

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ToolsExtensionSettingsSyncTest {

    @Test
    fun `prefers persona profile as composer instruction`() {
        val settings = ToolsExtensionSettings(
            personaProfile = "Persona from Tools",
            customInstruction = "Fallback custom instruction"
        )

        val plan = resolveToolsExtensionSyncPlan(
            settings = settings,
            currentSavedInstruction = "",
            previousSyncedInstruction = ""
        )

        assertEquals("Persona from Tools", plan.composerInstruction)
        assertTrue(plan.shouldReplaceSavedInstruction)
    }

    @Test
    fun `keeps explicit local prompt when it differs from previous tools sync`() {
        val settings = ToolsExtensionSettings(personaProfile = "Updated remote persona")

        val plan = resolveToolsExtensionSyncPlan(
            settings = settings,
            currentSavedInstruction = "My manual local prompt",
            previousSyncedInstruction = "Old synced persona"
        )

        assertEquals("Updated remote persona", plan.composerInstruction)
        assertFalse(plan.shouldReplaceSavedInstruction)
    }

    @Test
    fun `falls back to persona when quick reply instruction is blank`() {
        val instruction = resolveInitialSocialGptInstruction(
            savedInstruction = "",
            quickReplyInstruction = "",
            personaProfile = "Persona-driven prompt",
            defaultInstruction = "Default prompt"
        )

        assertEquals("Persona-driven prompt", instruction)
    }
}

