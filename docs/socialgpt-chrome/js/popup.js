const PROD_BASE_URL = 'https://tools.tornevall.net';
const DEV_BASE_URL = 'https://tools.tornevall.com';
const VALIDATE_TOKEN_PATH = '/api/social-media-tools/extension/validate-token';
const SETTINGS_PATH = '/api/social-media-tools/extension/settings';
const MODELS_PATH = '/api/social-media-tools/extension/models';
const FACEBOOK_OUTCOME_CONFIG_PATH = '/api/social-media-tools/facebook/outcome-config';
const TEST_PATH = '/api/social-media-tools/extension/test';
const AI_PATH = '/api/ai/socialgpt/respond';
const DEBUG_LOG_REQUEST = 'GET_DEBUG_LOGS';
const DEBUG_CLEAR_REQUEST = 'CLEAR_DEBUG_LOGS';
const RETRYABLE_REDIRECT_STATUSES = [301, 302, 303, 307, 308];
const extensionI18n = window.TNNetworksExtensionI18n || {
    t: function (key, params, fallback) {
        return typeof fallback !== 'undefined' ? fallback : key;
    },
    applyTranslations: function () {
    },
    locale: 'en'
};
const t = function (key, params, fallback) {
    return extensionI18n.t(key, params, fallback);
};
const DEFAULT_MOOD = 'Neutral and formal';
const DEFAULT_PERSONA_PROFILE = 'You are a friendly over intelligent human being, always ready to help. Respond as you are the one involved in the discussion and try to use the language used in the prompt.';
const DEFAULT_TEST_QUESTION = 'A Facebook user writes: "Hi, what does this tool help you with?" Reply in one short sentence in your configured tone and style.';
const DEFAULT_EXTENSION_UI_LANGUAGE = 'auto';
const DEFAULT_RESPONSE_LANGUAGE = 'auto';
const DEFAULT_VERIFY_FACT_LANGUAGE = 'auto';
const DEFAULT_FACT_CHECK_MODEL = 'gpt-4o';
const DEFAULT_QUICK_REPLY_PRESET = 'default';
const DEFAULT_QUICK_REPLY_CUSTOM_INSTRUCTION = '';
const DEFAULT_MARKED_CONTEXT_LABEL_MODE = 'compact';
const DEFAULT_MARKED_CONTEXT_EXPANSION_MODE = 'current';
const REMOTE_AUTOSAVE_DELAY_MS = 700;
const LEGACY_LOCALIZED_PERSONA_DEFAULTS = [
    'Du är en vänlig, överintelligent människa som alltid är redo att hjälpa till. Svara som om du själv är den som deltar i diskussionen och försök använda språket som används i prompten.'
];
const LEGACY_LOCALIZED_TEST_QUESTIONS = [
    'En Facebook-användare skriver: "Hej, vad hjälper det här verktyget dig med?" Svara i en kort mening med din konfigurerade ton och stil.',
    'Svara i en kort mening som visar vilket svararnamn, vilken profil och vilka egna instruktioner du fick från Tools.'
];
const FORUM_URL = (window.TNNetworksExtensionLinks && window.TNNetworksExtensionLinks.FORUM_URL) || 'https://forum.tornevall.net';
const TOOLS_SOCIAL_MEDIA_DASHBOARD_PATH = (window.TNNetworksExtensionLinks && window.TNNetworksExtensionLinks.TOOLS_SOCIAL_MEDIA_DASHBOARD_PATH) || '/admin/social-media-tools/facebook';

function getBaseUrl(devMode) {
    return devMode ? DEV_BASE_URL : PROD_BASE_URL;
}

function getRetryBaseUrls(baseUrl) {
    const normalized = String(baseUrl || '').trim();
    const candidates = normalized ? [normalized] : [];

    if (normalized === PROD_BASE_URL && candidates.indexOf(DEV_BASE_URL) === -1) {
        candidates.push(DEV_BASE_URL);
    }

    return candidates;
}

function isRetryableRedirectStatus(status) {
    return RETRYABLE_REDIRECT_STATUSES.indexOf(status) !== -1;
}

function setStatus(el, message, isError) {
    el.textContent = message;
    el.style.color = isError ? '#b91c1c' : 'green';
}

function setBusyState(isBusy, elements) {
    (elements || []).forEach(function (element) {
        if (element) {
            element.disabled = !!isBusy;
        }
    });
}

async function appendPopupDebugLog(entry) {
    return sendRuntimeMessage({
        type: 'DEBUG_LOG',
        entry: Object.assign({
            source: 'popup',
        }, entry || {}),
    });
}

function extractApiMessage(data, fallback) {
    if (!data) {
        return fallback;
    }

    if (typeof data.message === 'string' && data.message.trim()) {
        return data.message.trim();
    }

    if (typeof data.error === 'string' && data.error.trim()) {
        return data.error.trim();
    }

    if (data.errors && typeof data.errors === 'object') {
        var firstField = Object.keys(data.errors)[0];
        if (firstField) {
            var value = data.errors[firstField];
            if (Array.isArray(value) && value.length) {
                return String(value[0]);
            }
            if (typeof value === 'string' && value.trim()) {
                return value.trim();
            }
        }
    }

    if (typeof data === 'string' && data.trim()) {
        return data.trim();
    }

    return fallback;
}

function excerptText(value, maxLength) {
    if (!value) {
        return '';
    }

    var text = String(value).trim();
    if (text.length <= maxLength) {
        return text;
    }

    return text.slice(0, Math.max(0, maxLength - 1)).trim() + '…';
}

function normalizeComparableText(value) {
    return String(value == null ? '' : value)
        .replace(/\s+/g, ' ')
        .trim();
}

function matchesLegacyLocalizedDefault(value, candidates) {
    const normalizedValue = normalizeComparableText(value);
    if (!normalizedValue) {
        return false;
    }

    return (candidates || []).some(function (candidate) {
        return normalizeComparableText(candidate) === normalizedValue;
    });
}

function sanitizePersonaProfileValue(value) {
    const trimmed = String(value == null ? '' : value).trim();
    if (!trimmed) {
        return '';
    }

    return matchesLegacyLocalizedDefault(trimmed, LEGACY_LOCALIZED_PERSONA_DEFAULTS)
        ? DEFAULT_PERSONA_PROFILE
        : trimmed;
}

function sanitizeTestQuestionValue(value) {
    const trimmed = String(value == null ? '' : value).trim();
    if (!trimmed) {
        return '';
    }

    return matchesLegacyLocalizedDefault(trimmed, LEGACY_LOCALIZED_TEST_QUESTIONS)
        ? DEFAULT_TEST_QUESTION
        : trimmed;
}

function normalizeExtensionUiLanguage(value) {
    const normalized = String(value || '').trim().toLowerCase();
    return ['auto', 'en', 'sv'].indexOf(normalized) !== -1
        ? normalized
        : DEFAULT_EXTENSION_UI_LANGUAGE;
}

function formatPopupTestStatus(question, smokeTest, backend, openAi, user, settingsSource) {
    const answer = ((smokeTest.response || '').trim()
        || excerptText(smokeTest.response_excerpt || '', 180)
        || t('status.emptyResponse', {}, '(empty response)'));
    const globalKeyLine = openAi.global_key_ready ? '' : '\nGlobal OpenAI key ready: ' + t('status.no', {}, 'no');

    return t('status.popupTestCompleted', {
        question: question,
        answer: answer,
        source: backend.handler || t('status.backendDefault', {}, 'tools_backend'),
        openaiCalled: backend.openai_called ? t('status.yes', {}, 'yes') : t('status.no', {}, 'no'),
        user: user.name || t('status.unknown', {}, 'Unknown'),
        responder: settingsSource.responder_name || t('status.anonymous', {}, 'Anonymous'),
        profile: settingsSource.persona_profile_excerpt ? t('status.yes', {}, 'yes') : t('status.no', {}, 'no'),
        tone: settingsSource.applied_tone || '-',
        globalKeyLine: globalKeyLine
    });
}

function escapeHtml(value) {
    return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

async function apiRequest(baseUrl, token, path, options) {
    const config = options || {};
    const method = config.method || 'GET';
    const startedAt = performance.now();
    const baseUrls = getRetryBaseUrls(baseUrl);

    await appendPopupDebugLog({
        level: 'info',
        category: 'popup-api',
        message: 'Popup API request started.',
        meta: {
            method: method,
            url: (baseUrls[0] || baseUrl) + path,
        }
    });
    let lastFailure = null;

    for (let index = 0; index < baseUrls.length; index += 1) {
        const currentBaseUrl = baseUrls[index];
        const url = currentBaseUrl + path;
        let response;

        try {
            response = await fetch(url, {
                method: method,
                headers: Object.assign({
                    'Accept': 'application/json',
                    'Authorization': 'Bearer ' + token,
                }, config.body ? {'Content-Type': 'application/json'} : {}),
                body: config.body ? JSON.stringify(config.body) : undefined,
            });
        } catch (error) {
            lastFailure = {
                status: 0,
                data: {
                    ok: false,
                    message: error && error.message ? error.message : 'Network request failed.',
                },
                url: url,
            };
            break;
        }

        const durationMs = Math.round(performance.now() - startedAt);
        const responseText = await response.text();
        let data = {};

        if (responseText) {
            try {
                data = JSON.parse(responseText);
            } catch (error) {
                data = {
                    ok: false,
                    message: responseText,
                };
            }
        }

        if ((!response.ok || (data && data.ok === false)) && isRetryableRedirectStatus(response.status) && index < baseUrls.length - 1) {
            await appendPopupDebugLog({
                level: 'warning',
                category: 'popup-api',
                message: 'Popup API request was redirected. Retrying on fallback host.',
                meta: {
                    method: method,
                    url: url,
                    fallback_url: baseUrls[index + 1] + path,
                    status: response.status,
                    duration_ms: durationMs,
                }
            });
            lastFailure = {status: response.status, data: data, url: url};
            continue;
        }

        await appendPopupDebugLog({
            level: response.ok ? 'info' : 'error',
            category: 'popup-api',
            message: 'Popup API request completed.',
            meta: {
                method: method,
                url: url,
                status: response.status,
                ok: response.ok,
                duration_ms: durationMs,
            }
        });

        return {
            ok: response.ok && data && data.ok !== false,
            status: response.status,
            data: data,
        };
    }

    await appendPopupDebugLog({
        level: 'error',
        category: 'popup-api',
        message: 'Popup API request failed before response.',
        meta: {
            method: method,
            url: lastFailure && lastFailure.url ? lastFailure.url : ((baseUrls[0] || baseUrl) + path),
            duration_ms: Math.round(performance.now() - startedAt),
            error: extractApiMessage(lastFailure ? lastFailure.data : null, 'Network request failed.'),
        }
    });

    return {
        ok: false,
        status: lastFailure && typeof lastFailure.status === 'number' ? lastFailure.status : 0,
        data: lastFailure && lastFailure.data ? lastFailure.data : {
            ok: false,
            message: 'Network request failed.',
        },
    };
}

function sendRuntimeMessage(message) {
    return new Promise(function (resolve) {
        chrome.runtime.sendMessage(message, function (response) {
            if (chrome.runtime.lastError) {
                resolve({ok: false, error: chrome.runtime.lastError.message});
                return;
            }

            resolve(response || {ok: false});
        });
    });
}

function sendMessageToActiveTab(message) {
    return new Promise(function (resolve) {
        if (!chrome.tabs || typeof chrome.tabs.query !== 'function') {
            resolve({ok: false, error: t('status.tabsUnavailable', {}, 'Tab access is not available in this popup context.')});
            return;
        }

        chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
            if (chrome.runtime.lastError) {
                resolve({ok: false, error: chrome.runtime.lastError.message});
                return;
            }

            var tab = Array.isArray(tabs) && tabs.length ? tabs[0] : null;
            if (!tab || typeof tab.id !== 'number') {
                resolve({ok: false, error: t('status.noActiveTab', {}, 'No active tab is available.')});
                return;
            }

            chrome.tabs.sendMessage(tab.id, message, function (response) {
                if (chrome.runtime.lastError) {
                    var rawError = chrome.runtime.lastError.message || '';
                    resolve({
                        ok: false,
                        error: rawError.indexOf('Receiving end does not exist') !== -1
                            ? t('status.reloadTabAndTryAgain', {}, 'Could not reach the page helper. Reload the tab once and try again.')
                            : rawError,
                    });
                    return;
                }

                resolve(response || {ok: false, error: t('status.noResponseFromTab', {}, 'The active tab did not return a response.')});
            });
        });
    });
}

function queryActiveTabFacebookAdminStatus() {
    return new Promise(function (resolve) {
        chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
            if (chrome.runtime.lastError) {
                resolve({ok: false, error: chrome.runtime.lastError.message});
                return;
            }

            var tab = Array.isArray(tabs) && tabs.length ? tabs[0] : null;
            if (!tab || typeof tab.id !== 'number') {
                resolve({ok: false, error: t('status.noActiveTab', {}, 'No active tab is available.')});
                return;
            }

            chrome.tabs.sendMessage(tab.id, {type: 'GET_FACEBOOK_ADMIN_REPORTER_STATUS'}, function (response) {
                if (chrome.runtime.lastError) {
                    resolve({
                        ok: false,
                        error: chrome.runtime.lastError.message,
                    });
                    return;
                }

                resolve(response && response.ok ? {ok: true, status: response} : {
                    ok: false,
                    error: response && response.error ? response.error : t('status.noFacebookAdminStatus', {}, 'No Facebook admin reporting status is available for the active tab.'),
                });
            });
        });
    });
}

function formatSoundCloudIngestResult(ingest) {
    if (!ingest) {
        return 'No ingest attempt recorded yet.';
    }
    if (typeof ingest.flushed_count === 'number') {
        return 'Buffered flush '
            + (ingest.ok ? 'OK' : 'partial')
            + ' · flushed=' + ingest.flushed_count
            + ' · duplicates=' + (ingest.duplicate_count || 0)
            + ' · remaining=' + (ingest.remaining_count || 0)
            + (ingest.failed_count ? ' · failed=' + ingest.failed_count : '');
    }
    if (ingest.attempted === false) {
        if (ingest.reason === 'empty_normalized_rows') {
            return 'Ingest not attempted: the captured SoundCloud dataset contained no normalized rows yet.';
        }
        if (ingest.reason === 'unsupported_operation') {
            return 'Ingest not attempted: this SoundCloud GraphQL operation is not one of the supported insights datasets yet.';
        }
        if (ingest.reason === 'already_buffered') {
            return 'Capture already buffered locally.';
        }
        if (ingest.reason === 'already_ingested') {
            return 'Duplicate capture ignored because it was already ingested.';
        }
        if (ingest.reason === 'auto_ingest_disabled') {
            return 'Ingest not attempted: auto-ingest starts disabled on each SoundCloud insights visit until you enable it manually.';
        }
        if (ingest.reason === 'missing_tools_token') {
            return 'Ingest not attempted: configure a Tools bearer token first.';
        }
        return 'Ingest not attempted: ' + (ingest.reason || 'unknown reason') + '.';
    }
    if (ingest.ok) {
        return 'Ingest OK' + (ingest.status ? ' · HTTP ' + ingest.status : '') + (ingest.event_id ? ' · event #' + ingest.event_id : '');
    }
    return 'Ingest failed' + (ingest.status ? ' · HTTP ' + ingest.status : '') + (ingest.message ? ' · ' + ingest.message : '');
}

function queryActiveTabSoundCloudStatus() {
    return sendRuntimeMessage({type: 'GET_SOUNDCLOUD_ACTIVE_TAB_STATUS'});
}

document.addEventListener('DOMContentLoaded', function () {
    const apiKeyInput = document.getElementById('apiKey');
    const responderNameInput = document.getElementById('responderName');
    const autoDetectCheckbox = document.getElementById('autoDetectName');
    const extensionLanguageSelect = document.getElementById('extensionLanguage');
    const responseLanguageSelect = document.getElementById('responseLanguage');
    const verifyFactLanguageSelect = document.getElementById('verifyFactLanguage');
    const factCheckModelSelect = document.getElementById('factCheckModel');
    const quickReplyPresetSelect = document.getElementById('quickReplyPreset');
    const quickReplyInstructionInput = document.getElementById('quickReplyInstruction');
    const systemPromptInput = document.getElementById('systemPrompt');
    const markedContextLabelModeSelect = document.getElementById('markContextLabelMode');
    const markedContextExpansionModeSelect = document.getElementById('markContextExpansionMode');
    const devModeCheckbox = document.getElementById('devMode');
    const facebookAdminDebugCheckbox = document.getElementById('facebookAdminDebugEnabled');
    const facebookAdminStatsCheckbox = document.getElementById('facebookAdminStatsEnabled');
    const endpointNote = document.getElementById('endpointNote');
    const openToolsDashboardLink = document.getElementById('openToolsDashboardLink');
    const openToolsDashboardLinkInline = document.getElementById('openToolsDashboardLinkInline');
    const forumLink = document.getElementById('forumLink');
    const openToolboxBtn = document.getElementById('openToolboxBtn');
    const openOptionsPageBtn = document.getElementById('openOptionsPageBtn');
    const status = document.getElementById('status');
    const testBtn = document.getElementById('testConnectionBtn');
    const resetBtn = document.getElementById('resetPromptBtn');
    const testQuestionInput = document.getElementById('testQuestion');
    const debugConsoleWrap = document.getElementById('debugConsoleWrap');
    const debugConsole = document.getElementById('debugConsole');
    const refreshDebugBtn = document.getElementById('refreshDebugBtn');
    const copyDebugBtn = document.getElementById('copyDebugBtn');
    const clearDebugBtn = document.getElementById('clearDebugBtn');
    const tokenValidation = document.getElementById('tokenValidation');
    const tokenValidationIcon = document.getElementById('tokenValidationIcon');
    const tokenValidationText = document.getElementById('tokenValidationText');
    let popupReady = false;
    let remoteAutosaveTimer = null;
    let remoteSaveInFlight = false;
    let remoteSaveQueued = false;
    let queuedRemoteAutosaveOptions = null;
    let tokenValidationTimer = null;
    let tokenValidationSequence = 0;
    let tokenValidationCompletedSequence = 0;

    function setTokenValidationState(state, message) {
        if (!tokenValidation || !tokenValidationText) {
            return;
        }

        if (!state || state === 'idle') {
            tokenValidation.hidden = true;
            tokenValidation.setAttribute('data-state', 'idle');
            tokenValidationText.textContent = '';
            if (tokenValidationIcon) {
                tokenValidationIcon.textContent = '';
            }
            return;
        }

        tokenValidation.hidden = false;
        tokenValidation.setAttribute('data-state', state);
        tokenValidationText.textContent = message || '';

        if (tokenValidationIcon) {
            tokenValidationIcon.textContent = state === 'success' ? '✓' : (state === 'error' ? '✕' : '');
        }
    }

    async function validateBearerTokenNow() {
        const token = apiKeyInput ? apiKeyInput.value.trim() : '';
        const baseUrl = getBaseUrl(devModeCheckbox && devModeCheckbox.checked);
        const requestId = ++tokenValidationSequence;

        if (tokenValidationTimer) {
            window.clearTimeout(tokenValidationTimer);
            tokenValidationTimer = null;
        }

        if (!token) {
            setTokenValidationState('idle', '');
            return {ok: false, skipped: true, reason: 'empty_token'};
        }

        setTokenValidationState('checking', t('status.validatingToken', {}, 'Checking bearer token…'));

        const result = await apiRequest(baseUrl, token, VALIDATE_TOKEN_PATH, {
            method: 'GET'
        });

        if (requestId < tokenValidationSequence || requestId < tokenValidationCompletedSequence) {
            return {ok: false, skipped: true, reason: 'stale_result'};
        }

        tokenValidationCompletedSequence = requestId;

        if (result.ok && result.data && result.data.valid !== false) {
            const user = result.data.user || {};
            const userLabel = String(user.name || user.email || '').trim();
            setTokenValidationState(
                'success',
                userLabel
                    ? t('status.tokenAcceptedForUser', {user: userLabel}, 'Bearer token accepted for ' + userLabel + '.')
                    : t('status.tokenAccepted', {}, 'Bearer token accepted.')
            );
            return result;
        }

        setTokenValidationState(
            'error',
            extractApiMessage(result.data, t('status.tokenValidationFailed', {}, 'Could not validate bearer token.'))
                || t('status.tokenRejected', {}, 'Bearer token rejected.')
        );
        return result;
    }

    function scheduleBearerTokenValidation(delayMs) {
        if (tokenValidationTimer) {
            window.clearTimeout(tokenValidationTimer);
        }

        const token = apiKeyInput ? apiKeyInput.value.trim() : '';
        if (!token) {
            setTokenValidationState('idle', '');
            return;
        }

        tokenValidationTimer = window.setTimeout(function () {
            tokenValidationTimer = null;
            validateBearerTokenNow();
        }, typeof delayMs === 'number' ? delayMs : 650);
    }

    function renderFacebookAdminStatus(result) {
        if (!facebookAdminStatusState || !facebookAdminStatusCounters || !facebookAdminReportableList || !facebookAdminLastSubmission) {
            return;
        }

        if (!result || !result.ok || !result.status) {
            facebookAdminStatusState.textContent = (result && result.error)
                ? (t('status.couldNotReadFacebookStatus', {}, 'Could not read Facebook admin reporting status from the active tab.') + ': ' + result.error)
                : t('status.couldNotReadFacebookStatus', {}, 'Could not read Facebook admin reporting status from the active tab.');
            facebookAdminStatusCounters.textContent = t('status.openFacebookAdminPage', {}, 'Open a Facebook group admin activities page to inspect reportable entries and batch totals.');
            facebookAdminReportableList.innerHTML = '<div class="status-line status-muted">' + escapeHtml(t('status.noReportableEntries', {}, 'No reportable admin-log entries detected yet.')) + '</div>';
            facebookAdminLastSubmission.textContent = '';
            return;
        }

        var statusPayload = result.status;
        var counters = statusPayload.counters || {};
        var entries = Array.isArray(statusPayload.reportable_entries) ? statusPayload.reportable_entries : [];
        var pageStatePrefix = statusPayload.is_admin_page
            ? t('status.activeOnAdminPage', {}, 'Active tab is on a Facebook admin activities page.')
            : (statusPayload.is_facebook_page
                ? t('status.activeOnFacebookNotAdmin', {}, 'Active tab is on Facebook, but not on an admin activities page.')
                : t('status.activeNotFacebook', {}, 'Active tab is not on Facebook admin activities.'));
        var ingestState = statusPayload.feature_enabled === false
            ? t('status.reportingDisabledPopup', {}, ' Reporting is disabled in the popup. Enable the feature there before the page overlay can appear.')
            : (statusPayload.ingest_enabled
                ? t('status.reportingEnabled', {}, ' Reporting is enabled.')
                : t('status.reportingDisabledReportable', {}, ' Reporting is disabled, but detections below are still reportable if enabled.'));

        facebookAdminStatusState.textContent = statusPayload.state_text || (pageStatePrefix + ingestState);
        facebookAdminStatusCounters.textContent = pageStatePrefix + ingestState
            + ' Detected: ' + (counters.detected || 0)
            + ' · Pending: ' + (counters.pending || 0)
            + ' · Sending: ' + (counters.sending || 0)
            + ' · Failed: ' + (counters.failed || 0)
            + ' · Submitted: ' + (counters.sent || 0)
            + ' · Duplicates ignored: ' + (counters.duplicates_ignored || 0);

        if (!entries.length) {
            facebookAdminReportableList.innerHTML = '<div class="status-line status-muted">'
                + escapeHtml(statusPayload.reportable_empty_text || t('status.noReportableEntries', {}, 'No reportable admin-log entries detected yet.'))
                + '</div>';
        } else {
            facebookAdminReportableList.innerHTML = entries.map(function (entry) {
                var headline = [entry.actor_name || 'Unknown actor'];
                if (entry.action) {
                    headline.push('→ ' + entry.action);
                }
                if (entry.target_name) {
                    headline.push('(' + entry.target_name + ')');
                }

                return '<div class="status-item">'
                    + '<div><span class="status-pill">' + escapeHtml(entry.state || 'queued') + '</span>' + escapeHtml(headline.join(' ')) + '</div>'
                    + '<div class="status-muted" style="margin-top:4px;">' + escapeHtml(excerptText(entry.action_text || '', 180)) + '</div>'
                    + (entry.occurred_at ? '<div class="status-muted" style="margin-top:4px;">Facebook time: ' + escapeHtml(entry.occurred_at) + '</div>' : '')
                    + '</div>';
            }).join('');
        }

        facebookAdminLastSubmission.textContent = statusPayload.last_submission_text || '';
    }

    async function refreshFacebookAdminStatus() {
        renderFacebookAdminStatus(await queryActiveTabFacebookAdminStatus());
    }

    function renderSoundCloudStatus(result) {
        if (!soundCloudStatusState || !soundCloudStatusCounters || !soundCloudRecentCaptureList) {
            return;
        }

        if (!result || !result.ok) {
            soundCloudStatusState.textContent = t('status.couldNotReadSoundCloudStatus', {}, 'Could not read SoundCloud status from the active tab.');
            soundCloudStatusCounters.textContent = result && result.error ? result.error : t('status.noSoundCloudDiagnostics', {}, 'No SoundCloud diagnostics are available yet.');
            soundCloudRecentCaptureList.innerHTML = '<div class="status-line status-muted">' + escapeHtml(t('status.noSupportedSoundCloudCaptures', {}, 'No supported SoundCloud captures detected yet.')) + '</div>';
            return;
        }

        const tab = result.activeTab || {};
        const statusPayload = result.status || {};
        const recentEvents = Array.isArray(result.recentEvents) ? result.recentEvents : [];
        const latestSendState = statusPayload.lastFlush || statusPayload.lastIngest || null;
        const pageState = statusPayload.isRelevantInsightsPage
            ? 'Active tab is on a supported SoundCloud insights page.'
            : (statusPayload.isSoundCloudPage
                ? 'Active tab is on SoundCloud, but not on a supported insights / for-artists page.'
                : 'Active tab is not on SoundCloud.');

        soundCloudStatusState.textContent = statusPayload.stateText || pageState;
        soundCloudStatusCounters.textContent = (tab.url || statusPayload.pageUrl || 'Unknown tab')
            + ' · injected=' + (statusPayload.networkMonitorInjected ? 'yes' : 'no')
            + ' · hook=' + (statusPayload.hookReady ? 'ready' : 'waiting')
            + ' · captures=' + (statusPayload.captureCount || 0)
            + ' · buffered=' + (statusPayload.pendingCaptureCount || 0)
            + ' · ' + formatSoundCloudIngestResult(latestSendState);

        if (!recentEvents.length) {
            soundCloudRecentCaptureList.innerHTML = '<div class="status-line status-muted">' + escapeHtml(t('status.noSupportedSoundCloudCaptures', {}, 'No supported SoundCloud captures detected yet.')) + '</div>';
            return;
        }

        soundCloudRecentCaptureList.innerHTML = recentEvents.map(function (event) {
            const pill = event.datasetKey
                ? '<span class="status-pill">' + escapeHtml(event.datasetKey) + '</span>'
                : '<span class="status-pill">raw</span>';
            return '<div class="status-item">'
                + '<div>' + pill + escapeHtml(event.opName || 'Unknown operation') + '</div>'
                + '<div class="status-muted" style="margin-top:4px;">'
                + escapeHtml(event.capturedAt || 'Unknown time')
                + (typeof event.rowCount === 'number' ? ' · rows=' + escapeHtml(String(event.rowCount)) : '')
                + (event.via ? ' · via=' + escapeHtml(event.via) : '')
                + (event.host ? ' · host=' + escapeHtml(event.host) : '')
                + ' · ' + escapeHtml(formatSoundCloudIngestResult(event.ingest))
                + '</div>'
                + '</div>';
        }).join('');
    }

    async function refreshSoundCloudStatus() {
        renderSoundCloudStatus(await queryActiveTabSoundCloudStatus());
    }

    function renderEndpointNote() {
        const baseUrl = getBaseUrl(devModeCheckbox.checked);
        endpointNote.innerHTML = t('common.endpointNoteHtml', {url: baseUrl + AI_PATH}, 'Requests are sent through <code>' + baseUrl + AI_PATH + '</code> using your Tools bearer token.');
        if (openToolsDashboardLink) {
            openToolsDashboardLink.href = baseUrl + TOOLS_SOCIAL_MEDIA_DASHBOARD_PATH;
        }
        if (openToolsDashboardLinkInline) {
            openToolsDashboardLinkInline.href = baseUrl + TOOLS_SOCIAL_MEDIA_DASHBOARD_PATH;
        }
        if (forumLink) {
            forumLink.href = FORUM_URL;
        }
    }

    function renderDebugConsoleVisibility() {
        debugConsoleWrap.hidden = !devModeCheckbox.checked;
    }

    function formatFacebookNetworkMeta(meta) {
        if (!meta || typeof meta !== 'object') {
            return '';
        }

        const lines = [];
        if (meta.transport || meta.method || typeof meta.status !== 'undefined') {
            lines.push([
                meta.transport ? String(meta.transport).toUpperCase() : '',
                meta.method || '',
                typeof meta.status !== 'undefined' ? 'status=' + meta.status : '',
                meta.duration_ms ? meta.duration_ms + ' ms' : ''
            ].filter(Boolean).join(' · '));
        }
        if (meta.pathname || meta.url) {
            lines.push(meta.pathname || meta.url);
        }
        if (meta.friendly_name) {
            lines.push('friendly=' + meta.friendly_name);
        }
        if (meta.doc_id) {
            lines.push('doc_id=' + meta.doc_id);
        }
        if (meta.first_event) {
            lines.push('first_event=' + meta.first_event);
        }
        if (meta.request_preview) {
            lines.push('request: ' + meta.request_preview);
        }
        if (meta.response_preview) {
            lines.push('response: ' + meta.response_preview);
        }

        return lines.join('\n');
    }

    function formatDebugLogs(logs) {
        if (!Array.isArray(logs) || !logs.length) {
            return t('common.noLogsYet', {}, 'No logs yet.');
        }

        return logs.map(function (entry) {
            var prefix = [entry.ts || '-', (entry.level || 'info').toUpperCase(), entry.category || 'general']
                .join(' | ');
            var prettyMeta = (entry.category === 'facebook-network' || entry.category === 'facebook-network-status')
                ? formatFacebookNetworkMeta(entry.meta)
                : (entry.meta ? JSON.stringify(entry.meta, null, 2) : '');
            var meta = prettyMeta ? '\n' + prettyMeta : '';
            return prefix + '\n' + (entry.message || '') + meta;
        }).join('\n\n----------------\n\n');
    }

    async function refreshDebugConsole() {
        const result = await sendRuntimeMessage({type: DEBUG_LOG_REQUEST});
        if (!result.ok) {
            debugConsole.textContent = result.error || t('status.couldNotLoadDebugLogs', {}, 'Could not load debug logs.');
            return;
        }

        debugConsole.textContent = formatDebugLogs(result.logs);
    }

    function syncLocalCache(values) {
        chrome.storage.sync.set({
            responderName: values.responderName,
            chatGptSystemPrompt: sanitizePersonaProfileValue(values.systemPrompt),
            autoDetectResponder: values.autoDetectResponder,
            extensionUiLanguage: values.extensionUiLanguage,
            defaultMood: values.defaultMood,
            defaultCustomMood: values.defaultCustomMood,
            defaultResponseLanguage: values.defaultResponseLanguage,
            defaultVerifyFactLanguage: values.defaultVerifyFactLanguage,
            preferredFactCheckModel: values.preferredFactCheckModel,
            defaultQuickReplyPreset: values.defaultQuickReplyPreset,
            defaultQuickReplyCustomInstruction: values.defaultQuickReplyCustomInstruction,
        });
    }

    function buildLocalSyncPayload() {
        return {
            toolsApiToken: apiKeyInput.value.trim(),
            devMode: devModeCheckbox.checked,
            facebookAdminDebugEnabled: facebookAdminDebugCheckbox.checked,
            facebookAdminStatsEnabled: facebookAdminStatsCheckbox.checked,
            responderName: responderNameInput.value.trim(),
            chatGptSystemPrompt: sanitizePersonaProfileValue(systemPromptInput.value),
            autoDetectResponder: autoDetectCheckbox.checked,
            extensionUiLanguage: extensionLanguageSelect ? normalizeExtensionUiLanguage(extensionLanguageSelect.value) : DEFAULT_EXTENSION_UI_LANGUAGE,
            defaultMood: DEFAULT_MOOD,
            defaultCustomMood: '',
            defaultResponseLanguage: responseLanguageSelect.value || DEFAULT_RESPONSE_LANGUAGE,
            defaultVerifyFactLanguage: verifyFactLanguageSelect.value || DEFAULT_VERIFY_FACT_LANGUAGE,
            preferredFactCheckModel: factCheckModelSelect ? (factCheckModelSelect.value || DEFAULT_FACT_CHECK_MODEL) : DEFAULT_FACT_CHECK_MODEL,
            defaultQuickReplyPreset: quickReplyPresetSelect.value || DEFAULT_QUICK_REPLY_PRESET,
            defaultQuickReplyCustomInstruction: quickReplyInstructionInput.value.trim(),
            markedContextLabelMode: markedContextLabelModeSelect ? (markedContextLabelModeSelect.value || DEFAULT_MARKED_CONTEXT_LABEL_MODE) : DEFAULT_MARKED_CONTEXT_LABEL_MODE,
            markedContextExpansionMode: markedContextExpansionModeSelect ? (markedContextExpansionModeSelect.value || DEFAULT_MARKED_CONTEXT_EXPANSION_MODE) : DEFAULT_MARKED_CONTEXT_EXPANSION_MODE,
        };
    }

    function persistLocalSettings(callback) {
        chrome.storage.sync.set(buildLocalSyncPayload(), function () {
            if (typeof callback === 'function') {
                callback();
            }
        });
    }

    function buildRemoteSettingsPayload() {
        return {
            responder_name: responderNameInput.value.trim(),
            persona_profile: sanitizePersonaProfileValue(systemPromptInput.value),
            auto_detect_responder: autoDetectCheckbox.checked,
            response_language: responseLanguageSelect.value || DEFAULT_RESPONSE_LANGUAGE,
            verify_fact_language: verifyFactLanguageSelect.value || DEFAULT_VERIFY_FACT_LANGUAGE,
        };
    }

    async function saveRemoteSettings(options) {
        const config = options || {};
        const token = apiKeyInput.value.trim();
        const baseUrl = getBaseUrl(devModeCheckbox.checked);

        persistLocalSettings();

        if (!token) {
            if (config.requireToken) {
                setStatus(status, config.missingTokenMessage || t('status.registerBeforeSync', {}, 'Register at tools.tornevall.net and generate a personal bearer token there before syncing settings.'), true);
                return {ok: false, skipped: true, reason: 'missing_token'};
            }

            if (config.localOnlyMessage) {
                setStatus(status, config.localOnlyMessage, false);
            }

            return {ok: true, skipped: true, reason: 'missing_token'};
        }

        if (remoteSaveInFlight) {
            remoteSaveQueued = true;
            queuedRemoteAutosaveOptions = config;
            return {ok: true, queued: true};
        }

        remoteSaveInFlight = true;

        const result = await apiRequest(baseUrl, token, SETTINGS_PATH, {
            method: 'PUT',
            body: buildRemoteSettingsPayload(),
        });

        if (!result.ok) {
            remoteSaveInFlight = false;
            setStatus(status, extractApiMessage(result.data, config.errorMessage || t('status.couldNotSaveSettings', {}, 'Could not save settings to Tools.')), true);
            return {ok: false, data: result.data};
        }

        syncLocalCache({
            responderName: responderNameInput.value.trim(),
            systemPrompt: systemPromptInput.value.trim(),
            autoDetectResponder: autoDetectCheckbox.checked,
            extensionUiLanguage: extensionLanguageSelect ? normalizeExtensionUiLanguage(extensionLanguageSelect.value) : DEFAULT_EXTENSION_UI_LANGUAGE,
            defaultMood: DEFAULT_MOOD,
            defaultCustomMood: '',
            defaultResponseLanguage: responseLanguageSelect.value || DEFAULT_RESPONSE_LANGUAGE,
            defaultVerifyFactLanguage: verifyFactLanguageSelect.value || DEFAULT_VERIFY_FACT_LANGUAGE,
            preferredFactCheckModel: factCheckModelSelect ? (factCheckModelSelect.value || DEFAULT_FACT_CHECK_MODEL) : DEFAULT_FACT_CHECK_MODEL,
            defaultQuickReplyPreset: quickReplyPresetSelect.value || DEFAULT_QUICK_REPLY_PRESET,
            defaultQuickReplyCustomInstruction: quickReplyInstructionInput.value.trim(),
        });

        if (!config.suppressSuccessStatus) {
            setStatus(status, config.successMessage || t('status.settingsAutosaved', {baseUrl: baseUrl}, 'Settings autosaved to ' + baseUrl + '.'), false);
        }

        if (config.refreshDebugConsole && devModeCheckbox.checked) {
            await refreshDebugConsole();
        }

        remoteSaveInFlight = false;

        if (remoteSaveQueued) {
            const queuedOptions = queuedRemoteAutosaveOptions || {};
            remoteSaveQueued = false;
            queuedRemoteAutosaveOptions = null;
            return saveRemoteSettings(queuedOptions);
        }

        return {ok: true, data: result.data};
    }

    function scheduleRemoteAutosave(options) {
        const config = Object.assign({
            successMessage: t('status.settingsAutosaved', {baseUrl: getBaseUrl(devModeCheckbox.checked)}, 'Settings autosaved to ' + getBaseUrl(devModeCheckbox.checked) + '.'),
            localOnlyMessage: t('status.savedLocallyNeedToken', {}, 'Saved locally. Add your personal bearer token to sync these settings to Tools.'),
        }, options || {});

        persistLocalSettings();

        if (!popupReady) {
            return;
        }

        if (remoteAutosaveTimer) {
            window.clearTimeout(remoteAutosaveTimer);
        }

        remoteAutosaveTimer = window.setTimeout(function () {
            remoteAutosaveTimer = null;
            saveRemoteSettings(config);
        }, REMOTE_AUTOSAVE_DELAY_MS);
    }

    async function flushScheduledRemoteAutosave(options) {
        if (remoteAutosaveTimer) {
            window.clearTimeout(remoteAutosaveTimer);
            remoteAutosaveTimer = null;
        }

        return saveRemoteSettings(options || {});
    }

    function scheduleLocalAutosave(message) {
        persistLocalSettings(function () {
            if (popupReady && message) {
                setStatus(status, message, false);
            }
        });
    }

    function normalizeModelId(value) {
        return String(value || '').trim();
    }

    function resolveFactCheckModelSelection(models, preferredModel, fallbackModel) {
        const available = (Array.isArray(models) ? models : []).map(function (model) {
            return normalizeModelId(model && model.id ? model.id : model);
        }).filter(Boolean);
        const preferred = normalizeModelId(preferredModel);
        const fallback = normalizeModelId(fallbackModel) || DEFAULT_FACT_CHECK_MODEL;

        if (preferred && available.indexOf(preferred) !== -1) {
            return preferred;
        }
        if (available.indexOf(DEFAULT_FACT_CHECK_MODEL) !== -1) {
            return DEFAULT_FACT_CHECK_MODEL;
        }
        if (fallback && available.indexOf(fallback) !== -1) {
            return fallback;
        }

        return available[0] || DEFAULT_FACT_CHECK_MODEL;
    }

    function populateFactCheckModelOptions(models, defaultModel, preferredModel) {
        if (!factCheckModelSelect) {
            return;
        }

        const normalizedModels = (Array.isArray(models) ? models : []).map(function (model) {
            const id = normalizeModelId(model && model.id ? model.id : model);
            if (!id) {
                return null;
            }

            return {
                id: id,
                label: normalizeModelId(model && model.label ? model.label : id) || id,
            };
        }).filter(Boolean);

        const seen = {};
        factCheckModelSelect.innerHTML = '';
        normalizedModels.forEach(function (model) {
            if (seen[model.id]) {
                return;
            }
            seen[model.id] = true;
            const option = document.createElement('option');
            option.value = model.id;
            option.textContent = model.label;
            factCheckModelSelect.appendChild(option);
        });

        const fallbackOptionNeeded = !seen[DEFAULT_FACT_CHECK_MODEL];
        if (fallbackOptionNeeded) {
            const option = document.createElement('option');
            option.value = DEFAULT_FACT_CHECK_MODEL;
            option.textContent = DEFAULT_FACT_CHECK_MODEL + ' (fallback default)';
            factCheckModelSelect.appendChild(option);
            seen[DEFAULT_FACT_CHECK_MODEL] = true;
        }

        factCheckModelSelect.value = resolveFactCheckModelSelection(normalizedModels, preferredModel, defaultModel);
    }

    function cacheAvailableModelCatalog(models, defaultModel, source, fetchedAt, warning) {
        const seen = {};
        const normalizedModels = (Array.isArray(models) ? models : []).map(function (model) {
            const id = model && model.id ? String(model.id).trim() : '';
            if (!id || seen[id]) {
                return null;
            }

            seen[id] = true;
            return {
                id: id,
                label: model && model.label ? String(model.label).trim() : id,
                provider_visible: model ? model.provider_visible !== false : true,
                selected_by_default: !!(model && model.selected_by_default),
            };
        }).filter(Boolean);

        chrome.storage.sync.set({
            availableToolsModels: normalizedModels,
            defaultToolsModel: String(defaultModel || '').trim() || (normalizedModels[0] ? normalizedModels[0].id : 'gpt-4o-mini'),
            availableToolsModelsSource: source || 'provider',
            availableToolsModelsFetchedAt: fetchedAt || new Date().toISOString(),
            availableToolsModelsWarning: warning || '',
        });
    }

    async function refreshAvailableModelsCache(token, baseUrl) {
        const result = await apiRequest(baseUrl, token, MODELS_PATH);
        if (!result.ok || !result.data) {
            return false;
        }

        cacheAvailableModelCatalog(
            result.data.models || [],
            result.data.default_model || '',
            result.data.source || 'provider',
            result.data.fetched_at || null,
            result.data.warning || ''
        );

        populateFactCheckModelOptions(result.data.models || [], result.data.default_model || '', factCheckModelSelect ? factCheckModelSelect.value : DEFAULT_FACT_CHECK_MODEL);

        return true;
    }

    async function syncRemoteFacebookOutcomeConfig(token, baseUrl) {
        const result = await apiRequest(baseUrl, token, FACEBOOK_OUTCOME_CONFIG_PATH);
        if (!result.ok || !result.data || !result.data.outcome_detection) {
            await appendPopupDebugLog({
                level: 'warning',
                category: 'popup-api',
                message: t('status.couldNotSyncFacebookOutcomeConfig', {}, 'Could not sync Facebook outcome config from Tools. Using local extension fallback rules.'),
                meta: {
                    baseUrl: baseUrl,
                    error: extractApiMessage(result.data, 'Unknown outcome-config error.'),
                }
            });
            return false;
        }

        chrome.storage.sync.set({
            facebookAdminOutcomeConfig: result.data.outcome_detection,
            facebookAdminOutcomeConfigVersion: result.data.outcome_detection.version || null,
        });

        return true;
    }

    async function loadRemoteSettings() {
        const token = apiKeyInput.value.trim();
        if (!token) {
            return;
        }

        const baseUrl = getBaseUrl(devModeCheckbox.checked);
        const result = await apiRequest(baseUrl, token, SETTINGS_PATH);
        if (!result.ok || !result.data || !result.data.settings) {
            setStatus(status, extractApiMessage(result.data, t('status.couldNotLoadSettings', {}, 'Could not load settings from Tools.')), true);
            return;
        }

        const settings = result.data.settings;
        const remotePersonaProfileRaw = String(settings.persona_profile || '').trim();
        const sanitizedRemotePersonaProfile = sanitizePersonaProfileValue(remotePersonaProfileRaw);
        const shouldRepairLocalizedPersonaProfile = remotePersonaProfileRaw !== ''
            && normalizeComparableText(sanitizedRemotePersonaProfile) !== normalizeComparableText(remotePersonaProfileRaw);
        responderNameInput.value = settings.responder_name || '';
        systemPromptInput.value = sanitizedRemotePersonaProfile
            || sanitizePersonaProfileValue(systemPromptInput.value)
            || DEFAULT_PERSONA_PROFILE;
        autoDetectCheckbox.checked = settings.auto_detect_responder !== false;
        responseLanguageSelect.value = settings.response_language || DEFAULT_RESPONSE_LANGUAGE;
        verifyFactLanguageSelect.value = settings.verify_fact_language || DEFAULT_VERIFY_FACT_LANGUAGE;
        populateFactCheckModelOptions(
            result.data.available_models || [],
            result.data.default_model || DEFAULT_FACT_CHECK_MODEL,
            factCheckModelSelect ? factCheckModelSelect.value : DEFAULT_FACT_CHECK_MODEL
        );
        const sanitizedTestQuestion = sanitizeTestQuestionValue(testQuestionInput.value);
        if (sanitizedTestQuestion !== '') {
            testQuestionInput.value = sanitizedTestQuestion;
        }
        if (!testQuestionInput.value.trim()) {
            testQuestionInput.value = DEFAULT_TEST_QUESTION;
        }

        syncLocalCache({
            responderName: responderNameInput.value.trim(),
            systemPrompt: systemPromptInput.value.trim(),
            autoDetectResponder: autoDetectCheckbox.checked,
            defaultMood: settings.mood || DEFAULT_MOOD,
            defaultCustomMood: settings.custom_mood || '',
            defaultResponseLanguage: responseLanguageSelect.value || DEFAULT_RESPONSE_LANGUAGE,
            defaultVerifyFactLanguage: verifyFactLanguageSelect.value || DEFAULT_VERIFY_FACT_LANGUAGE,
            preferredFactCheckModel: factCheckModelSelect ? factCheckModelSelect.value || DEFAULT_FACT_CHECK_MODEL : DEFAULT_FACT_CHECK_MODEL,
            defaultQuickReplyPreset: quickReplyPresetSelect.value || DEFAULT_QUICK_REPLY_PRESET,
            defaultQuickReplyCustomInstruction: quickReplyInstructionInput.value.trim(),
        });
        cacheAvailableModelCatalog(
            result.data.available_models || [],
            result.data.default_model || '',
            result.data.models_source || 'provider',
            new Date().toISOString(),
            result.data.models_warning || ''
        );

        if (shouldRepairLocalizedPersonaProfile) {
            await saveRemoteSettings({suppressSuccessStatus: true});
        }

        await syncRemoteFacebookOutcomeConfig(token, baseUrl);

        setStatus(status, t('status.settingsLoaded', {baseUrl: baseUrl}, 'Settings loaded from ' + baseUrl + '.'), false);

        if (devModeCheckbox.checked) {
            await refreshDebugConsole();
        }
    }

    chrome.storage.sync.get([
        'toolsApiToken',
        'devMode',
        'facebookAdminDebugEnabled',
        'facebookAdminStatsEnabled',
        'responderName',
        'chatGptSystemPrompt',
        'autoDetectResponder',
        'extensionUiLanguage',
        'defaultMood',
        'defaultCustomMood',
        'defaultResponseLanguage',
        'defaultVerifyFactLanguage',
        'availableToolsModels',
        'defaultToolsModel',
        'preferredFactCheckModel',
        'defaultQuickReplyPreset',
        'defaultQuickReplyCustomInstruction',
        'markedContextLabelMode',
        'markedContextExpansionMode'
    ], async function (data) {
        const initialExtensionUiLanguage = normalizeExtensionUiLanguage(data.extensionUiLanguage || DEFAULT_EXTENSION_UI_LANGUAGE);
        if (extensionLanguageSelect) {
            extensionLanguageSelect.value = initialExtensionUiLanguage;
        }
        if (typeof extensionI18n.setLocale === 'function') {
            extensionI18n.setLocale(initialExtensionUiLanguage);
        }
        extensionI18n.applyTranslations(document);

        if (data.toolsApiToken) apiKeyInput.value = data.toolsApiToken;
        if (data.responderName) responderNameInput.value = data.responderName;
        systemPromptInput.value = sanitizePersonaProfileValue(data.chatGptSystemPrompt) || DEFAULT_PERSONA_PROFILE;
        testQuestionInput.value = DEFAULT_TEST_QUESTION;
        autoDetectCheckbox.checked = data.autoDetectResponder !== false;
        responseLanguageSelect.value = data.defaultResponseLanguage || DEFAULT_RESPONSE_LANGUAGE;
        verifyFactLanguageSelect.value = data.defaultVerifyFactLanguage || DEFAULT_VERIFY_FACT_LANGUAGE;
        populateFactCheckModelOptions(data.availableToolsModels || [], data.defaultToolsModel || DEFAULT_FACT_CHECK_MODEL, data.preferredFactCheckModel || DEFAULT_FACT_CHECK_MODEL);
        quickReplyPresetSelect.value = data.defaultQuickReplyPreset || DEFAULT_QUICK_REPLY_PRESET;
        quickReplyInstructionInput.value = data.defaultQuickReplyCustomInstruction || DEFAULT_QUICK_REPLY_CUSTOM_INSTRUCTION;
        if (markedContextLabelModeSelect) {
            markedContextLabelModeSelect.value = data.markedContextLabelMode || DEFAULT_MARKED_CONTEXT_LABEL_MODE;
        }
        if (markedContextExpansionModeSelect) {
            markedContextExpansionModeSelect.value = data.markedContextExpansionMode || DEFAULT_MARKED_CONTEXT_EXPANSION_MODE;
        }
        devModeCheckbox.checked = !!data.devMode;
        facebookAdminDebugCheckbox.checked = !!data.facebookAdminDebugEnabled;
        facebookAdminStatsCheckbox.checked = !!data.facebookAdminStatsEnabled;
        renderEndpointNote();
        renderDebugConsoleVisibility();

        if (data.toolsApiToken) {
            const validationResult = await validateBearerTokenNow();
            if (validationResult.ok) {
                await loadRemoteSettings();
            }
        } else if (devModeCheckbox.checked) {
            await refreshDebugConsole();
        }
        popupReady = true;
    });

    devModeCheckbox.addEventListener('change', function () {
        renderEndpointNote();
        renderDebugConsoleVisibility();
        persistLocalSettings(async function () {
            setStatus(status, t('status.environmentChanged', {baseUrl: getBaseUrl(devModeCheckbox.checked)}, 'Environment changed to ' + getBaseUrl(devModeCheckbox.checked) + '.'), false);
            if (apiKeyInput.value.trim()) {
                const validationResult = await validateBearerTokenNow();
                if (validationResult.ok) {
                    await loadRemoteSettings();
                }
            } else if (devModeCheckbox.checked) {
                await refreshDebugConsole();
            }
        });
    });

    facebookAdminDebugCheckbox.addEventListener('change', function () {
        scheduleLocalAutosave(facebookAdminDebugCheckbox.checked
            ? t('status.facebookDebugEnabled', {}, 'Facebook admin debug diagnostics enabled.')
            : t('status.facebookDebugDisabled', {}, 'Facebook admin debug diagnostics disabled.'));
    });

    facebookAdminStatsCheckbox.addEventListener('change', function () {
        scheduleLocalAutosave(facebookAdminStatsCheckbox.checked
            ? t('status.facebookStatsEnabled', {}, 'Facebook admin activity statistics feature enabled. Page reporting still stays off until you enable it on each Facebook admin page.')
            : t('status.facebookStatsDisabled', {}, 'Facebook admin activity statistics feature disabled. Facebook admin pages will stay quiet until you enable it again.'));
    });


    if (apiKeyInput) {
        apiKeyInput.addEventListener('input', function () {
            scheduleLocalAutosave(t('status.localPrefsAutosaved', {}, 'Local extension preferences autosaved.'));
            scheduleBearerTokenValidation(650);
        });
        apiKeyInput.addEventListener('change', function () {
            scheduleLocalAutosave(t('status.localPrefsAutosaved', {}, 'Local extension preferences autosaved.'));
            validateBearerTokenNow();
        });
        apiKeyInput.addEventListener('blur', function () {
            validateBearerTokenNow();
        });
    }

    if (quickReplyInstructionInput) {
        quickReplyInstructionInput.addEventListener('input', function () {
            scheduleLocalAutosave(t('status.localPrefsAutosaved', {}, 'Local extension preferences autosaved.'));
        });
        quickReplyInstructionInput.addEventListener('change', function () {
            scheduleLocalAutosave(t('status.localPrefsAutosaved', {}, 'Local extension preferences autosaved.'));
        });
    }

    [factCheckModelSelect, quickReplyPresetSelect].forEach(function (field) {
        field.addEventListener('change', function () {
            scheduleLocalAutosave(t('status.localPrefsAutosaved', {}, 'Local extension preferences autosaved.'));
        });
    });

    [markedContextLabelModeSelect, markedContextExpansionModeSelect].filter(Boolean).forEach(function (field) {
        field.addEventListener('change', function () {
            scheduleLocalAutosave(t('status.localPrefsAutosaved', {}, 'Local extension preferences autosaved.'));
        });
    });

    if (extensionLanguageSelect) {
        extensionLanguageSelect.addEventListener('change', function () {
            const nextLocale = normalizeExtensionUiLanguage(extensionLanguageSelect.value);
            if (typeof extensionI18n.setLocale === 'function') {
                extensionI18n.setLocale(nextLocale);
            }
            extensionI18n.applyTranslations(document);
            renderEndpointNote();
            scheduleLocalAutosave(t('status.localPrefsAutosaved', {}, 'Local extension preferences autosaved.'));
        });
    }

    [responderNameInput, systemPromptInput].forEach(function (field) {
        field.addEventListener('input', function () {
            scheduleRemoteAutosave();
        });
        field.addEventListener('change', function () {
            flushScheduledRemoteAutosave();
        });
    });

    [autoDetectCheckbox, responseLanguageSelect, verifyFactLanguageSelect].forEach(function (field) {
        field.addEventListener('change', function () {
            flushScheduledRemoteAutosave();
        });
    });

    testBtn.addEventListener('click', async function () {
        const token = apiKeyInput.value.trim();
        const baseUrl = getBaseUrl(devModeCheckbox.checked);
        const question = testQuestionInput.value.trim() || DEFAULT_TEST_QUESTION;
        const busyElements = [testBtn, resetBtn, apiKeyInput, responderNameInput, responseLanguageSelect, verifyFactLanguageSelect, factCheckModelSelect, quickReplyPresetSelect, quickReplyInstructionInput, systemPromptInput, testQuestionInput, devModeCheckbox, facebookAdminDebugCheckbox, autoDetectCheckbox];

        if (!token) {
            setStatus(status, t('status.pasteTokenFirst', {}, 'Paste a personal bearer token first, then test the connection.'), true);
            return;
        }

        setBusyState(true, busyElements);
        setStatus(status, t('status.testingPleaseWait', {}, '⏳ Testing via Tools → OpenAI, please wait...'), false);

        persistLocalSettings();

        const saveResult = await flushScheduledRemoteAutosave({
            requireToken: true,
            missingTokenMessage: t('status.pasteTokenFirst', {}, 'Paste a personal bearer token first, then test the connection.'),
            errorMessage: t('status.couldNotSaveBeforeTesting', {}, 'Could not save settings to Tools before testing.'),
            suppressSuccessStatus: true,
        });

        if (!saveResult.ok) {
            setBusyState(false, busyElements);
            return;
        }

        const result = await apiRequest(baseUrl, token, TEST_PATH, {
            method: 'POST',
            body: {
                question: question,
                response_length: 'very-short',
            },
        });
        if (!result.ok) {
            setStatus(status, extractApiMessage(result.data, t('status.testFailed', {}, 'Test failed.')), true);
            setBusyState(false, busyElements);
            return;
        }

        const user = result.data.user || {};
        const openAi = result.data.openai || {};
        const settingsSource = result.data.settings_source || {};
        const smokeTest = result.data.smoke_test || {};
        const backend = result.data.backend || {};
        setStatus(status, formatPopupTestStatus(question, smokeTest, backend, openAi, user, settingsSource), !openAi.global_key_ready);

        await appendPopupDebugLog({
            level: 'info',
            category: 'popup-test',
            message: 'Tools → OpenAI popup test completed.',
            meta: {
                baseUrl: baseUrl,
                question: excerptText(question, 140),
                response_excerpt: smokeTest.response_excerpt || smokeTest.response || '',
            }
        });

        setBusyState(false, busyElements);

        await refreshAvailableModelsCache(token, baseUrl);

        if (devModeCheckbox.checked) {
            await refreshDebugConsole();
        }
    });

    resetBtn.addEventListener('click', function () {
        systemPromptInput.value = DEFAULT_PERSONA_PROFILE;
        responseLanguageSelect.value = DEFAULT_RESPONSE_LANGUAGE;
        verifyFactLanguageSelect.value = DEFAULT_VERIFY_FACT_LANGUAGE;
        populateFactCheckModelOptions([], DEFAULT_FACT_CHECK_MODEL, DEFAULT_FACT_CHECK_MODEL);
        quickReplyPresetSelect.value = DEFAULT_QUICK_REPLY_PRESET;
        quickReplyInstructionInput.value = DEFAULT_QUICK_REPLY_CUSTOM_INSTRUCTION;
        if (markedContextLabelModeSelect) {
            markedContextLabelModeSelect.value = DEFAULT_MARKED_CONTEXT_LABEL_MODE;
        }
        if (markedContextExpansionModeSelect) {
            markedContextExpansionModeSelect.value = DEFAULT_MARKED_CONTEXT_EXPANSION_MODE;
        }
        testQuestionInput.value = DEFAULT_TEST_QUESTION;
        scheduleLocalAutosave(t('status.localPrefsReset', {}, 'Local extension preferences reset to defaults.'));
        flushScheduledRemoteAutosave({
            successMessage: t('status.responderResetRemote', {baseUrl: getBaseUrl(devModeCheckbox.checked)}, 'Responder profile reset and autosaved to ' + getBaseUrl(devModeCheckbox.checked) + '.'),
            localOnlyMessage: t('status.responderResetLocal', {}, 'Responder profile reset locally. Add your personal bearer token to sync it to Tools.'),
        });
    });

    refreshDebugBtn.addEventListener('click', async function () {
        await refreshDebugConsole();
        setStatus(status, t('status.debugConsoleRefreshed', {}, 'Debug console refreshed.'), false);
    });

    copyDebugBtn.addEventListener('click', async function () {
        try {
            await navigator.clipboard.writeText(debugConsole.textContent || '');
            setStatus(status, t('status.debugConsoleCopied', {}, 'Debug console copied to clipboard.'), false);
        } catch (error) {
            setStatus(status, t('status.couldNotCopyDebugConsole', {}, 'Could not copy debug console.'), true);
        }
    });

    clearDebugBtn.addEventListener('click', async function () {
        const result = await sendRuntimeMessage({type: DEBUG_CLEAR_REQUEST});
        if (!result.ok) {
            setStatus(status, result.error || t('status.couldNotClearDebugConsole', {}, 'Could not clear debug console.'), true);
            return;
        }

        debugConsole.textContent = t('common.noLogsYet', {}, 'No logs yet.');
        setStatus(status, t('status.debugConsoleCleared', {}, 'Debug console cleared.'), false);
    });

    if (openToolboxBtn) {
        openToolboxBtn.addEventListener('click', async function () {
            setBusyState(true, [openToolboxBtn]);
            const result = await sendMessageToActiveTab({type: 'OPEN_REPLY_PANEL_FROM_POPUP'});
            setBusyState(false, [openToolboxBtn]);

            if (!result || !result.ok) {
                setStatus(status, (result && result.error) || t('status.couldNotOpenToolboxInTab', {}, 'Could not open Toolbox in the active tab.'), true);
                return;
            }

            setStatus(
                status,
                result.importedSelection
                    ? t('status.toolboxOpenedWithSelection', {}, 'Toolbox opened in the active tab and imported the current text selection.')
                    : t('status.toolboxOpened', {}, 'Toolbox opened in the active tab.'),
                false
            );
        });
    }

    if (openOptionsPageBtn) {
        openOptionsPageBtn.addEventListener('click', function () {
            if (chrome.runtime && typeof chrome.runtime.openOptionsPage === 'function') {
                chrome.runtime.openOptionsPage();
                return;
            }

            if (chrome.tabs && typeof chrome.tabs.create === 'function' && chrome.runtime && typeof chrome.runtime.getURL === 'function') {
                chrome.tabs.create({url: chrome.runtime.getURL('html/options.html')});
            }
        });
    }
});
