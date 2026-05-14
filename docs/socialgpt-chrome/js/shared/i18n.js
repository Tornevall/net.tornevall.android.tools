(function () {
    var root = typeof globalThis !== 'undefined'
        ? globalThis
        : (typeof window !== 'undefined' ? window : this);
    var SUPPORTED_LOCALES = ['en', 'sv'];

    function getByPath(object, path) {
        return String(path || '').split('.').reduce(function (current, part) {
            return current && typeof current === 'object' ? current[part] : undefined;
        }, object);
    }

    function replaceParams(template, params) {
        return String(template == null ? '' : template).replace(/\{\{?\s*([a-zA-Z0-9_]+)\s*}?}/g, function (_, key) {
            return Object.prototype.hasOwnProperty.call(params || {}, key) ? String(params[key]) : '';
        });
    }

    function normalizeSupportedLocale(value) {
        var normalized = String(value || '').trim().toLowerCase();
        if (!normalized || normalized === 'auto') {
            return '';
        }

        if (normalized.indexOf('sv') === 0) {
            return 'sv';
        }

        if (normalized.indexOf('en') === 0) {
            return 'en';
        }

        return SUPPORTED_LOCALES.indexOf(normalized) !== -1 ? normalized : '';
    }

    function detectBrowserLocale() {
        var candidates = [];

        try {
            if (typeof chrome !== 'undefined' && chrome.i18n && typeof chrome.i18n.getUILanguage === 'function') {
                candidates.push(chrome.i18n.getUILanguage());
            }
        } catch (error) {
        }

        if (typeof navigator !== 'undefined') {
            if (Array.isArray(navigator.languages)) {
                candidates = candidates.concat(navigator.languages);
            }
            if (navigator.language) {
                candidates.push(navigator.language);
            }
        }

        for (var index = 0; index < candidates.length; index += 1) {
            var supported = normalizeSupportedLocale(candidates[index]);
            if (supported) {
                return supported;
            }
        }

        return 'en';
    }

    function resolveLocale(preferredLocale) {
        var preferred = normalizeSupportedLocale(preferredLocale);
        return preferred || detectBrowserLocale();
    }

    var messages = {
        en: {
            page: {
                popup: {
                    title: 'Tornevall Networks Social Media Tools',
                    heading: 'Tornevall Networks Social Media Tools',
                    intro: 'Browser companion for Tornevall Networks social media workflows, server-side AI assistance, fact-checking, and admin/statistics tooling.',
                    registerTokenHtml: 'Register at <strong>tools.tornevall.net</strong> and generate a <strong>personal bearer token</strong> there to use this extension.',
                    moreSettingsHtml: 'More settings and platform-specific tools live in Tools. For more info, <a id="openToolsDashboardLink" href="https://tools.tornevall.net/admin/social-media-tools/facebook" target="_blank" rel="noopener noreferrer">open dashboard</a>. You can also <a id="forumLink" href="https://forum.tornevall.net" target="_blank" rel="noopener noreferrer">open the forum</a>.'
                },
                options: {
                    title: 'Tornevall Networks Social Media Tools · Configuration',
                    heading: 'Configuration page',
                    intro: 'This is the larger, easier-to-read settings surface for Tornevall Networks Social Media Tools. It now mirrors the same settings and autosave behavior as the small popup, but with more room for reading, troubleshooting, and longer explanations.',
                    connectionHelper: 'Save your personal Tools bearer token here. These settings sync through the same storage keys and autosave behavior as the popup.',
                    testingHelper: 'This page now uses the same autosave flow as the popup. Use it when you want the exact same settings in a larger and clearer layout.'
                }
            },
            common: {
                endpointNoteHtml: 'Requests are sent through <code>{url}</code> using your Tools bearer token.',
                extensionLanguage: 'Extension language:',
                extensionLanguageHelper: 'Controls the extension UI language for the popup, config page, and SocialGPT Toolbox. This does not change the AI reply language.',
                openToolboxInTab: 'Open Toolbox in active tab',
                openConfigPage: 'Open config page',
                openToolsDashboard: 'Open Tools dashboard',
                openForum: 'Open forum',
                devModeHtml: 'Use dev / beta server (<code>tools.tornevall.com</code>)',
                facebookAdminStats: 'Enable Facebook admin activity statistics',
                facebookAdminStatsHelperHtml: 'When this is off, Facebook <code>admin_activities</code> pages stay quiet and no statistics overlay is shown. When this is on, you still have to enable reporting separately on each Facebook page before anything is submitted.',
                facebookAdminDebug: 'Enable Facebook admin debug diagnostics',
                apiKey: 'Tools API Bearer Token:',
                apiKeyPlaceholder: 'Paste your personal Tools token here',
                responderName: 'Responder name:',
                responderNamePlaceholder: 'Who are you?',
                autoDetectName: 'Auto detect Facebook name',
                responseLanguage: 'Answer language:',
                verifyFactLanguage: 'Verify-fact language:',
                factCheckModel: 'Fact-check model:',
                factCheckModelHelperHtml: 'Used by <strong>Verify fact</strong>. If the chosen model returns an empty/failed fact-check, the extension retries once with <code>gpt-4o</code>. <strong>Dig deeper</strong> still prefers a reasoning-capable model.',
                quickReplyPreset: 'Default quick-reply style:',
                quickReplyInstruction: 'Extra quick-reply instruction (optional):',
                quickReplyInstructionPlaceholder: 'Example: Keep it kind, short, and suitable for public replies.',
                systemPrompt: 'Responder profile / about the person (stored in Tools):',
                customInstructionsHelperHtml: 'For <strong>custom instructions</strong>, use <a id="openToolsDashboardLinkInline" href="https://tools.tornevall.net/admin/social-media-tools/facebook" target="_blank" rel="noopener noreferrer">Tools → Social Media Tools → Facebook</a>.',
                markModeAdvancedHeading: 'Advanced mark-mode context',
                markModeAdvancedHelper: 'Keep the default compact numbering unless you need richer identifiers. These advanced options only affect the Toolbox mark-mode context and stay local in the extension.',
                markModeFrameHelper: 'If a site keeps the real content inside an iframe or app-like surface, click inside that frame first and choose the whole frame/document mode below to pull in the visible text from that context instead of just one small DOM block.',
                markContextLabelMode: 'Marked block labels:',
                markContextExpansionMode: 'Marked context extraction:',
                testQuestion: 'Test question (Tools → OpenAI):',
                testQuestionPlaceholder: 'Ask something that should reflect your Tools personalization.',
                testQuestionDefault: 'Reply in one short sentence that shows which responder name, profile, and custom instructions you received from Tools.',
                testToolsOpenAi: 'Test Tools → OpenAI',
                resetPrompt: 'Reset Prompt',
                autosaveHelper: 'Changes autosave locally. Tools-backed responder settings sync automatically when a personal bearer token is present.',
                debugConsoleSummary: 'Dev debug console',
                refresh: 'Refresh',
                copy: 'Copy',
                clear: 'Clear',
                noLogsYet: 'No logs yet.',
                optionsConnectionHeading: 'Connection & platform controls',
                optionsResponderHeading: 'Responder & reply defaults',
                optionsTestingHeading: 'Testing, reset & diagnostics'
            },
            option: {
                uiLanguage: {
                    auto: 'Same as browser UI',
                    en: 'English',
                    sv: 'Swedish'
                },
                language: {
                    autoPrompt: 'Same as the prompt/context',
                    autoContext: 'Same as the selected content/context',
                    sv: 'Swedish',
                    en: 'English',
                    da: 'Danish',
                    no: 'Norwegian',
                    de: 'German',
                    fr: 'French',
                    es: 'Spanish'
                },
                quickReply: {
                    default: 'Balanced default',
                    empathetic: 'Empathetic and human',
                    factual: 'Calm and factual',
                    deescalate: 'De-escalate tension'
                },
                markContextLabelMode: {
                    compact: 'Compact numbering only ([1], [2], ...)',
                    markId: 'Numbering + generated mark id',
                    detailed: 'Numbering + mark id + element details'
                },
                markContextExpansionMode: {
                    current: 'Current marked block only (default)',
                    parent: 'Go one parent up',
                    parentChildren: 'Go one parent up + scan direct child blocks',
                    document: 'Use the whole current frame/document text'
                }
            },
            defaults: {
                personaProfile: 'You are a friendly over intelligent human being, always ready to help. Respond as you are the one involved in the discussion and try to use the language used in the prompt.',
                testQuestion: 'A Facebook user writes: "Hi, what does this tool help you with?" Reply in one short sentence in your configured tone and style.'
            },
            contentScript: {
                panelTitle: 'Tornevall Networks Social Media Tools ↔',
                closeToolbox: 'Close Toolbox',
                responder: 'Responder',
                loadingResponder: '(loading...)',
                anchorFocused: 'Anchored to the currently focused text field.',
                anchorFocusOrMark: 'Focus a text field or mark elements to build context.',
                anchorReplyTarget: 'Anchored to the current reply field. Reply target detected: {target}.',
                anchorGenericThread: 'Anchored to the current field with nearby conversation context from visible parent/sibling blocks.',
                anchorMarkModeActive: 'Mark mode is active. Click page elements to add or remove context blocks.',
                anchorMarkedBlocks: 'Using {count} marked block{plural} as context.',
                anchorMarkedIds: ' IDs: {ids}.',
                anchorExtraction: ' Extraction: {label}.',
                extractionCurrent: 'current marked block only',
                extractionParent: 'one parent up',
                extractionParentChildren: 'one parent up + direct child scan',
                extractionDocument: 'current page/document text',
                extractionFrameDocument: 'current iframe/frame document text',
                promptLabel: 'Prompt',
                promptPlaceholder: 'Leave blank to use the default reply instruction.',
                moodLabel: 'Mood',
                modelLabel: 'Model',
                lengthLabel: 'Length',
                lengthAuto: 'Let GPT decide',
                lengthAsShort: 'As short as possible',
                lengthShortest: 'At maximum one sentence. Possibly a one-liner.',
                lengthVeryShort: '2–3 sentences (very short)',
                lengthShort: '4–6 sentences (short)',
                lengthMedium: '6–10 sentences (medium)',
                lengthExtreme: 'Extreme. You want your own book.',
                lengthLong: 'Extended (whatever is needed)',
                customMoodLabel: 'Custom mood',
                changeRequestLabel: 'Change request',
                changeRequestPlaceholder: 'Optional: what should change?',
                languageLabel: 'Language',
                contextLabel: 'Context',
                markContext: 'Mark context',
                stopMarking: 'Stop marking',
                import: 'Import',
                clear: 'Clear',
                contextPlaceholder: 'Optional context: import visible page context or write your own notes here.',
                outputLabel: 'Output',
                composeStatus: 'Select a text field to enable paste/fill actions.',
                generating: 'Generating…',
                working: 'Working…',
                generate: 'Generate',
                refresh: 'Refresh',
                verifyFact: 'Verify fact',
                verifyShort: 'Verify',
                openToolbox: 'Open Toolbox',
                quickResponse: 'Quick response',
                pasteIntoField: 'Paste into field',
                dragToolboxTitle: 'Drag to move Toolbox. Press Escape to snap it back near the active field.',
                dragFactTitle: 'Drag to move. Double-click or press Escape to reset position.',
                composerActionTitle: 'Open Toolbox for the selected field. Drag to move it away. Double-click to reset its position.',
                quickResponseTitle: 'Generate a quick reply using the preset saved in the extension popup.',
                verifySelectionTitle: 'Fact-check the selected text.',
                openToolboxSelectionTitle: 'Open Toolbox with the selected text imported as context.',
                verifyHoverTitle: 'Verify the hovered image or link. Drag to move it away and double-click to reset.',
                contextImported: 'Context imported into Toolbox.',
                contextImportedFromMenu: 'Context imported from context menu.',
                contextImportedFromPopup: 'Selected text imported from popup.',
                contextImportedFromSelection: 'Selected text imported into Toolbox.',
                verificationContextImported: 'Verification context imported into Toolbox.',
                contextCleared: 'Context cleared. You can import fresh context or write your own.',
                markModeStarted: 'Mark mode is active. Click page elements to add/remove context blocks.',
                markModeStopped: 'Mark mode stopped. Current marked context remains in the box.',
                markModeUnavailable: 'Could not toggle mark mode in this tab.',
                quickGenerating: 'Generating quick reply…',
                quickBuilding: 'Building a quick response from the current comment context…',
                verifyNoContext: 'There is no context to verify yet. Import, mark, or write context first.',
                verifyStarted: 'Verify started. Collecting context and checking facts now…',
                verifyingFacts: 'Verifying facts…',
                previewPreparing: 'Preparing verification context…',
                previewLabel: 'Preview',
                resultAppears: 'Result appears here automatically',
                checkingNow: 'Checking now…',
                factVerificationTitle: '✅ Fact checking via OpenAI',
                factVerificationFailedTitle: '⚠️ Fact check failed',
                factVerificationResult: 'Verification result',
                factAnchoredSelected: 'Anchored to the selected content.',
                factLanguage: 'Language',
                factRetry: 'You can retry below.',
                factRefresh: 'Refresh',
                factRefreshTitle: 'Run the same fact-check again.',
                factDigDeeper: 'Dig deeper',
                factDigDeeperTitle: 'Retry with a deeper pass that looks for broader context and stricter verification.',
                factOpenToolbox: 'Open Toolbox',
                factOpenToolboxTitle: 'Open Toolbox with the same verification context so you can continue working from the selected material.',
                factCheckComplete: 'Fact check complete. Review the popup result.',
                factCheckFailed: 'Fact check failed. Try refresh or think harder.',
                toolsRequestFailed: 'Tools request failed. Review the output above before pasting anything.'
            },
            status: {
                noActiveTab: 'No active tab is available.',
                tabsUnavailable: 'Tab access is not available in this popup context.',
                noFacebookAdminStatus: 'No Facebook admin reporting status is available for the active tab.',
                couldNotReadFacebookStatus: 'Could not read Facebook admin reporting status from the active tab.',
                openFacebookAdminPage: 'Open a Facebook group admin activities page to inspect reportable entries and batch totals.',
                activeOnAdminPage: 'Active tab is on a Facebook admin activities page.',
                activeOnFacebookNotAdmin: 'Active tab is on Facebook, but not on an admin activities page.',
                activeNotFacebook: 'Active tab is not on Facebook admin activities.',
                reportingDisabledPopup: ' Reporting is disabled in the popup. Enable the feature there before the page overlay can appear.',
                reportingEnabled: ' Reporting is enabled.',
                reportingDisabledReportable: ' Reporting is disabled, but detections below are still reportable if enabled.',
                noReportableEntries: 'No reportable admin-log entries detected yet.',
                couldNotReadSoundCloudStatus: 'Could not read SoundCloud status from the active tab.',
                noSoundCloudDiagnostics: 'No SoundCloud diagnostics are available yet.',
                noSupportedSoundCloudCaptures: 'No supported SoundCloud captures detected yet.',
                settingsAutosaved: 'Settings autosaved to {baseUrl}.',
                registerBeforeSync: 'Register at tools.tornevall.net and generate a personal bearer token there before syncing settings.',
                savedLocallyNeedToken: 'Saved locally. Add your personal bearer token to sync these settings to Tools.',
                couldNotSaveSettings: 'Could not save settings to Tools.',
                couldNotLoadSettings: 'Could not load settings from Tools.',
                couldNotLoadDebugLogs: 'Could not load debug logs.',
                couldNotSyncFacebookOutcomeConfig: 'Could not sync Facebook outcome config from Tools. Using local extension fallback rules.',
                validatingToken: 'Checking bearer token…',
                tokenAccepted: 'Bearer token accepted.',
                tokenAcceptedForUser: 'Bearer token accepted for {user}.',
                tokenRejected: 'Bearer token rejected.',
                tokenValidationFailed: 'Could not validate bearer token.',
                toolboxOpened: 'Toolbox opened in the active tab.',
                toolboxOpenedWithSelection: 'Toolbox opened in the active tab and imported the current text selection.',
                couldNotOpenToolboxInTab: 'Could not open Toolbox in the active tab.',
                reloadTabAndTryAgain: 'Could not reach the page helper. Reload the tab once and try again.',
                noResponseFromTab: 'The active tab did not return a response.',
                settingsLoaded: 'Settings loaded from {baseUrl}.',
                environmentChanged: 'Environment changed to {baseUrl}.',
                facebookDebugEnabled: 'Facebook admin debug diagnostics enabled.',
                facebookDebugDisabled: 'Facebook admin debug diagnostics disabled.',
                facebookStatsEnabled: 'Facebook admin activity statistics feature enabled. Page reporting still stays off until you enable it on each Facebook admin page.',
                facebookStatsDisabled: 'Facebook admin activity statistics feature disabled. Facebook admin pages will stay quiet until you enable it again.',
                pasteTokenFirst: 'Paste a personal bearer token first, then test the connection.',
                testingPleaseWait: '⏳ Testing via Tools → OpenAI, please wait...',
                couldNotSaveBeforeTesting: 'Could not save settings to Tools before testing.',
                testFailed: 'Test failed.',
                popupTestCompleted: '✅ Tools → OpenAI test complete\nQuestion: {question}\n\nAnswer:\n{answer}\n\nSource: {source} | OpenAI called={openaiCalled} | User={user}\nTools settings used: responder={responder}, profile={profile}, tone={tone}{globalKeyLine}',
                emptyResponse: '(empty response)',
                backendDefault: 'tools_backend',
                yes: 'yes',
                no: 'no',
                unknown: 'Unknown',
                anonymous: 'Anonymous',
                responderResetRemote: 'Responder profile reset and autosaved to {baseUrl}.',
                responderResetLocal: 'Responder profile reset locally. Add your personal bearer token to sync it to Tools.',
                localPrefsReset: 'Local extension preferences reset to defaults.',
                localPrefsAutosaved: 'Local extension preferences autosaved.',
                debugConsoleRefreshed: 'Debug console refreshed.',
                debugConsoleCopied: 'Debug console copied to clipboard.',
                couldNotCopyDebugConsole: 'Could not copy debug console.',
                couldNotClearDebugConsole: 'Could not clear debug console.',
                debugConsoleCleared: 'Debug console cleared.'
            }
        },
        sv: {
            page: {
                popup: {
                    title: 'Tornevall Networks Social Media Tools',
                    heading: 'Tornevall Networks Social Media Tools',
                    intro: 'Webbläsarstöd för Tornevall Networks sociala medieflöden, server-side AI-hjälp, faktakontroll och admin-/statistikverktyg.',
                    registerTokenHtml: 'Registrera dig på <strong>tools.tornevall.net</strong> och skapa där en <strong>personlig bearer-token</strong> för att använda tillägget.',
                    moreSettingsHtml: 'Fler inställningar och plattformsspecifika verktyg finns i Tools. För mer info, <a id="openToolsDashboardLink" href="https://tools.tornevall.net/admin/social-media-tools/facebook" target="_blank" rel="noopener noreferrer">öppna dashboarden</a>. Du kan också <a id="forumLink" href="https://forum.tornevall.net" target="_blank" rel="noopener noreferrer">öppna forumet</a>.'
                },
                options: {
                    title: 'Tornevall Networks Social Media Tools · Konfiguration',
                    heading: 'Konfigurationssida',
                    intro: 'Det här är den större och mer lättlästa inställningsytan för Tornevall Networks Social Media Tools. Den speglar nu samma inställningar och autosave-beteende som den lilla popupen, men med mer utrymme för läsning, felsökning och längre förklaringar.',
                    connectionHelper: 'Spara din personliga Tools bearer-token här. De här inställningarna synkar via samma lagringsnycklar och autosave-beteende som popupen.',
                    testingHelper: 'Den här sidan använder nu samma autosave-flöde som popupen. Använd den när du vill ha exakt samma inställningar i en större och tydligare layout.'
                }
            },
            common: {
                endpointNoteHtml: 'Anrop skickas via <code>{url}</code> med din Tools bearer-token.',
                extensionLanguage: 'Tilläggsspråk:',
                extensionLanguageHelper: 'Styr tilläggets UI-språk i popupen, config-sidan och SocialGPT Toolbox. Det här ändrar inte AI-svarens språk.',
                openToolboxInTab: 'Öppna Toolbox i aktiv flik',
                openConfigPage: 'Öppna konfigurationssidan',
                openToolsDashboard: 'Öppna Tools-dashboard',
                openForum: 'Öppna forumet',
                devModeHtml: 'Använd dev / beta-server (<code>tools.tornevall.com</code>)',
                facebookAdminStats: 'Aktivera statistik för Facebook-adminaktivitet',
                facebookAdminStatsHelperHtml: 'När detta är av håller sig Facebooks <code>admin_activities</code>-sidor tysta och ingen statistik-overlay visas. När detta är på måste du fortfarande aktivera rapportering separat på varje Facebook-sida innan något skickas in.',
                facebookAdminDebug: 'Aktivera felsökningsdiagnostik för Facebook-admin',
                apiKey: 'Tools API Bearer Token:',
                apiKeyPlaceholder: 'Klistra in din personliga Tools-token här',
                responderName: 'Svarsnamn:',
                responderNamePlaceholder: 'Vem är du?',
                autoDetectName: 'Identifiera Facebook-namn automatiskt',
                responseLanguage: 'Svarsspråk:',
                verifyFactLanguage: 'Språk för faktakontroll:',
                factCheckModel: 'Modell för faktakontroll:',
                factCheckModelHelperHtml: 'Används av <strong>Verify fact</strong>. Om vald modell ger en tom/misslyckad faktakontroll försöker tillägget en gång till med <code>gpt-4o</code>. <strong>Dig deeper</strong> föredrar fortfarande en resonemangsmodell.',
                quickReplyPreset: 'Standardstil för quick-reply:',
                quickReplyInstruction: 'Extra instruktion för quick-reply (valfritt):',
                quickReplyInstructionPlaceholder: 'Exempel: Håll det vänligt, kort och lämpligt för publika svar.',
                systemPrompt: 'Svararprofil / om personen (lagras i Tools):',
                customInstructionsHelperHtml: 'För <strong>egna instruktioner</strong>, använd <a id="openToolsDashboardLinkInline" href="https://tools.tornevall.net/admin/social-media-tools/facebook" target="_blank" rel="noopener noreferrer">Tools → Social Media Tools → Facebook</a>.',
                markModeAdvancedHeading: 'Avancerad kontext för mark-läge',
                markModeAdvancedHelper: 'Behåll standardläget med kompakt numrering om du inte behöver rikare identifiering. De här avancerade valen påverkar bara Toolboxens mark-lägeskontext och lagras lokalt i tillägget.',
                markModeFrameHelper: 'Om en sida lägger det riktiga innehållet i en iframe eller app-liknande yta, klicka först inne i den ramen och välj sedan hel frame-/dokumenttext nedan för att dra in den synliga texten därifrån i stället för bara ett litet DOM-block.',
                markContextLabelMode: 'Etiketter för markerade block:',
                markContextExpansionMode: 'Kontextextraktion för markering:',
                testQuestion: 'Testfråga (Tools → OpenAI):',
                testQuestionPlaceholder: 'Fråga något som borde spegla din Tools-personalisering.',
                testQuestionDefault: 'Svara i en kort mening som visar vilket svararnamn, vilken profil och vilka egna instruktioner du fick från Tools.',
                testToolsOpenAi: 'Testa Tools → OpenAI',
                resetPrompt: 'Återställ prompt',
                autosaveHelper: 'Ändringar autosparas lokalt. Tools-synkade svararinställningar synkas automatiskt när en personlig bearer-token finns.',
                debugConsoleSummary: 'Dev-felsökningskonsol',
                refresh: 'Uppdatera',
                copy: 'Kopiera',
                clear: 'Rensa',
                noLogsYet: 'Inga loggar ännu.',
                optionsConnectionHeading: 'Anslutning & plattformskontroller',
                optionsResponderHeading: 'Svararprofil & standardsvar',
                optionsTestingHeading: 'Test, återställning & diagnostik'
            },
            option: {
                uiLanguage: {
                    auto: 'Samma som webbläsarens UI',
                    en: 'Engelska',
                    sv: 'Svenska'
                },
                language: {
                    autoPrompt: 'Samma som prompten/kontexten',
                    autoContext: 'Samma som det valda innehållet/kontexten',
                    sv: 'Svenska',
                    en: 'Engelska',
                    da: 'Danska',
                    no: 'Norska',
                    de: 'Tyska',
                    fr: 'Franska',
                    es: 'Spanska'
                },
                quickReply: {
                    default: 'Balanserad standard',
                    empathetic: 'Empatisk och mänsklig',
                    factual: 'Lugn och saklig',
                    deescalate: 'Trappa ned spänningen'
                },
                markContextLabelMode: {
                    compact: 'Endast kompakt numrering ([1], [2], ...)',
                    markId: 'Numrering + genererat mark-id',
                    detailed: 'Numrering + mark-id + elementdetaljer'
                },
                markContextExpansionMode: {
                    current: 'Endast aktuellt markerat block (standard)',
                    parent: 'Gå en nivå upp till parent',
                    parentChildren: 'Gå en nivå upp till parent + skanna direkta child-block',
                    document: 'Använd hela den aktuella framens/dokumentets text'
                }
            },
            defaults: {
                personaProfile: 'Du är en vänlig, överintelligent människa som alltid är redo att hjälpa till. Svara som om du själv är den som deltar i diskussionen och försök använda språket som används i prompten.',
                testQuestion: 'En Facebook-användare skriver: "Hej, vad hjälper det här verktyget dig med?" Svara i en kort mening med din konfigurerade ton och stil.'
            },
            contentScript: {
                panelTitle: 'Tornevall Networks Social Media Tools ↔',
                closeToolbox: 'Stäng Toolbox',
                responder: 'Svarare',
                loadingResponder: '(läser in...)',
                anchorFocused: 'Förankrad till det textfält som just nu har fokus.',
                anchorFocusOrMark: 'Fokusera ett textfält eller markera element för att bygga kontext.',
                anchorReplyTarget: 'Förankrad till aktuellt svarsfält. Upptäckt svarsmål: {target}.',
                anchorGenericThread: 'Förankrad till aktuellt fält med närliggande samtalskontext från synliga parent-/sibling-block.',
                anchorMarkModeActive: 'Mark-läge är aktivt. Klicka på sidelement för att lägga till eller ta bort kontextblock.',
                anchorMarkedBlocks: 'Använder {count} markerat block{plural} som kontext.',
                anchorMarkedIds: ' ID:n: {ids}.',
                anchorExtraction: ' Extraktion: {label}.',
                extractionCurrent: 'endast aktuellt markerat block',
                extractionParent: 'en nivå upp till parent',
                extractionParentChildren: 'en nivå upp till parent + direkt child-scan',
                extractionDocument: 'aktuell sida-/dokumenttext',
                extractionFrameDocument: 'aktuell iframe-/frame-dokumenttext',
                promptLabel: 'Prompt',
                promptPlaceholder: 'Lämna tomt för att använda standardinstruktionen för svar.',
                moodLabel: 'Ton',
                modelLabel: 'Modell',
                lengthLabel: 'Längd',
                lengthAuto: 'Låt GPT avgöra',
                lengthAsShort: 'Så kort som möjligt',
                lengthShortest: 'Högst en mening. Gärna en oneliner.',
                lengthVeryShort: '2–3 meningar (mycket kort)',
                lengthShort: '4–6 meningar (kort)',
                lengthMedium: '6–10 meningar (medel)',
                lengthExtreme: 'Extrem. Du vill ha din egen bok.',
                lengthLong: 'Förlängt (det som behövs)',
                customMoodLabel: 'Anpassad ton',
                changeRequestLabel: 'Ändringsönskemål',
                changeRequestPlaceholder: 'Valfritt: vad ska ändras?',
                languageLabel: 'Språk',
                contextLabel: 'Kontext',
                markContext: 'Markera kontext',
                stopMarking: 'Stoppa markering',
                import: 'Importera',
                clear: 'Rensa',
                contextPlaceholder: 'Valfri kontext: importera synlig sidkontext eller skriv egna anteckningar här.',
                outputLabel: 'Utdata',
                composeStatus: 'Välj ett textfält för att aktivera klistra in-/fyll-funktioner.',
                generating: 'Genererar…',
                working: 'Jobbar…',
                generate: 'Generera',
                refresh: 'Uppdatera',
                verifyFact: 'Verifiera fakta',
                verifyShort: 'Verifiera',
                openToolbox: 'Öppna Toolbox',
                quickResponse: 'Snabbsvar',
                pasteIntoField: 'Klistra in i fält',
                dragToolboxTitle: 'Dra för att flytta Toolbox. Tryck Escape för att fästa tillbaka den nära det aktiva fältet.',
                dragFactTitle: 'Dra för att flytta. Dubbelklicka eller tryck Escape för att återställa positionen.',
                composerActionTitle: 'Öppna Toolbox för det valda fältet. Dra för att flytta bort den. Dubbelklicka för att återställa positionen.',
                quickResponseTitle: 'Generera ett snabbsvar med presetet som sparats i tilläggspopupen.',
                verifySelectionTitle: 'Faktakontrollera den markerade texten.',
                openToolboxSelectionTitle: 'Öppna Toolbox med den markerade texten importerad som kontext.',
                verifyHoverTitle: 'Verifiera den hovrade bilden eller länken. Dra för att flytta bort knappen och dubbelklicka för att återställa.',
                contextImported: 'Kontext importerad till Toolbox.',
                contextImportedFromMenu: 'Kontext importerad från snabbmenyn.',
                contextImportedFromPopup: 'Markerad text importerad från popupen.',
                contextImportedFromSelection: 'Markerad text importerad till Toolbox.',
                verificationContextImported: 'Verifieringskontext importerad till Toolbox.',
                contextCleared: 'Kontext rensad. Du kan importera ny kontext eller skriva egen.',
                markModeStarted: 'Mark-läget är aktivt. Klicka på sidelement för att lägga till eller ta bort kontextblock.',
                markModeStopped: 'Mark-läget stoppades. Den aktuella markerade kontexten ligger kvar i rutan.',
                markModeUnavailable: 'Kunde inte växla mark-läge i den här fliken.',
                quickGenerating: 'Genererar snabbsvar…',
                quickBuilding: 'Bygger ett snabbt svar från den aktuella kommentarens kontext…',
                verifyNoContext: 'Det finns ingen kontext att verifiera ännu. Importera, markera eller skriv kontext först.',
                verifyStarted: 'Verifiering startad. Samlar kontext och kontrollerar fakta nu…',
                verifyingFacts: 'Verifierar fakta…',
                previewPreparing: 'Förbereder verifieringskontext…',
                previewLabel: 'Förhandsvisning',
                resultAppears: 'Resultatet visas här automatiskt',
                checkingNow: 'Kontrollerar nu…',
                factVerificationTitle: '✅ Faktakontroll via OpenAI',
                factVerificationFailedTitle: '⚠️ Faktakontrollen misslyckades',
                factVerificationResult: 'Verifieringsresultat',
                factAnchoredSelected: 'Förankrad till det valda innehållet.',
                factLanguage: 'Språk',
                factRetry: 'Du kan försöka igen nedan.',
                factRefresh: 'Uppdatera',
                factRefreshTitle: 'Kör samma faktakontroll igen.',
                factDigDeeper: 'Gräv djupare',
                factDigDeeperTitle: 'Försök igen med en djupare körning som letar bredare kontext och striktare verifiering.',
                factOpenToolbox: 'Öppna Toolbox',
                factOpenToolboxTitle: 'Öppna Toolbox med samma verifieringskontext så att du kan fortsätta arbeta från det valda materialet.',
                factCheckComplete: 'Faktakontrollen är klar. Granska popupresultatet.',
                factCheckFailed: 'Faktakontrollen misslyckades. Försök uppdatera eller tänka hårdare.',
                toolsRequestFailed: 'Tools-anropet misslyckades. Granska utdata ovan innan du klistrar in något.'
            },
            status: {
                noActiveTab: 'Ingen aktiv flik är tillgänglig.',
                tabsUnavailable: 'Flikåtkomst är inte tillgänglig i den här popupkontexten.',
                noFacebookAdminStatus: 'Ingen status för Facebook-adminrapportering är tillgänglig för den aktiva fliken.',
                couldNotReadFacebookStatus: 'Kunde inte läsa status för Facebook-adminrapportering från den aktiva fliken.',
                openFacebookAdminPage: 'Öppna en Facebook-grupps admin activities-sida för att granska rapporterbara poster och batchsummor.',
                activeOnAdminPage: 'Den aktiva fliken är på en Facebook admin activities-sida.',
                activeOnFacebookNotAdmin: 'Den aktiva fliken är på Facebook, men inte på en admin activities-sida.',
                activeNotFacebook: 'Den aktiva fliken är inte på Facebook admin activities.',
                reportingDisabledPopup: ' Rapportering är avstängd i popupen. Aktivera funktionen där innan overlayn kan visas på sidan.',
                reportingEnabled: ' Rapportering är aktiverad.',
                reportingDisabledReportable: ' Rapportering är avstängd, men det som upptäcks nedan är fortfarande rapporterbart om du aktiverar funktionen.',
                noReportableEntries: 'Inga rapporterbara adminlogg-poster har upptäckts ännu.',
                couldNotReadSoundCloudStatus: 'Kunde inte läsa SoundCloud-status från den aktiva fliken.',
                noSoundCloudDiagnostics: 'Ingen SoundCloud-diagnostik är tillgänglig ännu.',
                noSupportedSoundCloudCaptures: 'Inga stödda SoundCloud-fångster har upptäckts ännu.',
                settingsAutosaved: 'Inställningar autosparade till {baseUrl}.',
                registerBeforeSync: 'Registrera dig på tools.tornevall.net och skapa där en personlig bearer-token innan du synkar inställningar.',
                savedLocallyNeedToken: 'Sparat lokalt. Lägg till din personliga bearer-token för att synka dessa inställningar till Tools.',
                couldNotSaveSettings: 'Kunde inte spara inställningarna till Tools.',
                couldNotLoadSettings: 'Kunde inte läsa in inställningarna från Tools.',
                couldNotLoadDebugLogs: 'Kunde inte läsa in felsökningsloggarna.',
                couldNotSyncFacebookOutcomeConfig: 'Kunde inte synka Facebooks outcome-config från Tools. Lokala fallback-regler används.',
                validatingToken: 'Kontrollerar bearer-token…',
                tokenAccepted: 'Bearer-token godkänd.',
                tokenAcceptedForUser: 'Bearer-token godkänd för {user}.',
                tokenRejected: 'Bearer-token avvisades.',
                tokenValidationFailed: 'Kunde inte verifiera bearer-token.',
                toolboxOpened: 'Toolbox öppnades i den aktiva fliken.',
                toolboxOpenedWithSelection: 'Toolbox öppnades i den aktiva fliken och importerade den aktuella textmarkeringen.',
                couldNotOpenToolboxInTab: 'Kunde inte öppna Toolbox i den aktiva fliken.',
                reloadTabAndTryAgain: 'Kunde inte nå sidhjälparen. Ladda om fliken en gång och försök igen.',
                noResponseFromTab: 'Den aktiva fliken returnerade inget svar.',
                settingsLoaded: 'Inställningar inlästa från {baseUrl}.',
                environmentChanged: 'Miljön byttes till {baseUrl}.',
                facebookDebugEnabled: 'Felsökningsdiagnostik för Facebook-admin aktiverad.',
                facebookDebugDisabled: 'Felsökningsdiagnostik för Facebook-admin avstängd.',
                facebookStatsEnabled: 'Funktionen för Facebook-adminstatistik är aktiverad. Sidrapportering är fortfarande av tills du aktiverar den på varje Facebook-sida.',
                facebookStatsDisabled: 'Funktionen för Facebook-adminstatistik är avstängd. Facebooks adminsidor håller sig tysta tills du aktiverar den igen.',
                pasteTokenFirst: 'Klistra först in en personlig bearer-token och testa sedan anslutningen.',
                testingPleaseWait: '⏳ Testar via Tools → OpenAI, vänta...',
                couldNotSaveBeforeTesting: 'Kunde inte spara inställningarna till Tools före testet.',
                testFailed: 'Testet misslyckades.',
                popupTestCompleted: '✅ Tools → OpenAI-test klart\nFråga: {question}\n\nSvar:\n{answer}\n\nKälla: {source} | OpenAI anropad={openaiCalled} | Användare={user}\nAnvända Tools-inställningar: responder={responder}, profil={profile}, ton={tone}{globalKeyLine}',
                emptyResponse: '(tomt svar)',
                backendDefault: 'tools_backend',
                yes: 'ja',
                no: 'nej',
                unknown: 'Okänd',
                anonymous: 'Anonym',
                responderResetRemote: 'Svararprofil återställd och autosparad till {baseUrl}.',
                responderResetLocal: 'Svararprofil återställd lokalt. Lägg till din personliga bearer-token för att synka den till Tools.',
                localPrefsReset: 'Lokala tilläggsinställningar återställda till standardvärden.',
                localPrefsAutosaved: 'Lokala tilläggsinställningar autosparade.',
                debugConsoleRefreshed: 'Felsökningskonsolen uppdaterad.',
                debugConsoleCopied: 'Felsökningskonsolen kopierad till urklipp.',
                couldNotCopyDebugConsole: 'Kunde inte kopiera felsökningskonsolen.',
                couldNotClearDebugConsole: 'Kunde inte rensa felsökningskonsolen.',
                debugConsoleCleared: 'Felsökningskonsolen rensad.'
            }
        }
    };

    var locale = resolveLocale();

    function t(key, params, fallback) {
        var value = getByPath(messages[locale], key);
        if (typeof value === 'undefined') {
            value = getByPath(messages.en, key);
        }
        if (typeof value === 'undefined') {
            value = typeof fallback !== 'undefined' ? fallback : key;
        }
        return replaceParams(value, params || {});
    }

    function applyTranslations(root) {
        var scope = root || document;
        if (!scope || !scope.querySelectorAll) {
            return;
        }

        scope.querySelectorAll('[data-i18n]').forEach(function (element) {
            element.textContent = t(element.getAttribute('data-i18n'), {}, element.textContent);
        });

        scope.querySelectorAll('[data-i18n-html]').forEach(function (element) {
            element.innerHTML = t(element.getAttribute('data-i18n-html'), {}, element.innerHTML);
        });

        scope.querySelectorAll('[data-i18n-placeholder]').forEach(function (element) {
            element.setAttribute('placeholder', t(element.getAttribute('data-i18n-placeholder'), {}, element.getAttribute('placeholder') || ''));
        });

        scope.querySelectorAll('[data-i18n-value]').forEach(function (element) {
            if ('value' in element) {
                element.value = t(element.getAttribute('data-i18n-value'), {}, element.value || '');
            }
        });

        if (document && document.documentElement) {
            document.documentElement.lang = locale;
        }
    }

    function setLocale(nextLocale) {
        locale = resolveLocale(nextLocale);
        api.locale = locale;
        return locale;
    }

    var api = {
        locale: locale,
        t: t,
        setLocale: setLocale,
        resolveLocale: resolveLocale,
        normalizeLocale: normalizeSupportedLocale,
        getSupportedLocales: function () {
            return SUPPORTED_LOCALES.slice();
        },
        applyTranslations: applyTranslations
    };

    root.TNNetworksExtensionI18n = api;
})();

