let markedElements = [], isClickMarkingActive = false, panel, activeComposer = null, composerActionButton = null, quickResponseActionButton = null, adminActivitiesControl = null, soundCloudInsightsControl = null;
let panelAttachedComposer = null;
let panelContextDirty = false;
let panelDragState = null;
let panelManualPosition = null;
let verifyActionButton = null;
let verifyActionContext = '';
let verifyActionAnchor = null;
let selectionToolboxActionButton = null;
let selectionToolboxContext = '';
let selectionToolboxAnchor = null;
let verifyHoverButton = null;
let verifyHoverContext = '';
let verifyHoverAnchor = null;
let verifyHoverTarget = null;
let verifyHoverShowTimer = null;
let verifyHoverHideTimer = null;
let verifyHoverButtonDragState = null;
let verifyHoverButtonDragOffset = null;
let factResultBox = null;
let factResultAnchor = null;
let factResultBoxDragState = null;
let factResultBoxManualPosition = null;
let composerActionButtonDragState = null;
let composerActionButtonDragOffset = null;
let quickResponseActionButtonDragState = null;
let quickResponseActionButtonDragOffset = null;
let composerActionButtonDragListenersBound = false;
let frontResponserName = '';
let extensionUiLanguage = 'auto';
let defaultResponseLanguage = 'auto';
let defaultVerifyFactLanguage = 'auto';
let preferredFactCheckModel = 'gpt-4o';
let defaultQuickReplyPreset = 'default';
let defaultQuickReplyCustomInstruction = '';
let markedContextLabelMode = 'compact';
let markedContextExpansionMode = 'current';
let pendingAiRequestMode = null;
let lastVerificationRequest = null;
let availableToolsModels = [
    {id: 'gpt-4o-mini', label: 'gpt-4o-mini'},
    {id: 'gpt-4o', label: 'gpt-4o'},
    {id: 'gpt-4.1-mini', label: 'gpt-4.1-mini'},
    {id: 'gpt-4.1', label: 'gpt-4.1'},
    {id: 'o4-mini', label: 'o4-mini'},
    {id: 'o3-mini', label: 'o3-mini'},
];
let defaultToolsModel = 'gpt-4o-mini';
let preferredToolsModel = '';
let modelsCatalogLoading = false;
let selectionActionButtonTimer = null;

const EDITABLE_SELECTOR = 'textarea,input[type="text"],input:not([type]),[contenteditable=""],[contenteditable="true"],[role="textbox"]';
const TOOLS_PROD_BASE_URL = 'https://tools.tornevall.net';
const TOOLS_DEV_BASE_URL = 'https://tools.tornevall.com';
const FACEBOOK_INGEST_PATH = '/api/social-media-tools/facebook/ingest';
const ADMIN_ACTIVITY_KEYWORDS = ['admin', 'activity', 'log', 'godk', 'approved', 'approve', 'avvis', 'rejected', 'reject', 'declined', 'request', 'participate', 'förfrågan', 'removed', 'tagit bort', 'deleted', 'delete', 'revoked', 'återkall', 'blocked', 'block', 'banned', 'ban', 'spam', 'member', 'reported', 'report', 'member-reported', 'anmält', 'anmälda', 'anmäld', 'rapporterad', 'pending post', 'comment', 'kommentar', 'automatiskt', 'automatically', 'published', 'group'];
const IGNORED_LINK_TEXTS = ['gilla', 'svara', 'svara som', 'kommentera', 'dela', 'visa alla', 'visa fler svar', 'like', 'reply', 'share', 'comment', 'send', 'gif'];
const MAX_RECENT_NETWORK_EVENTS = 8;
const MAX_ADMIN_BATCH_SIZE = 50;
const ADMIN_PANEL_POSITION_STORAGE_KEY = 'tn_social_tools_admin_panel_position';
const SOUND_CLOUD_PANEL_POSITION_STORAGE_KEY = 'tn_social_tools_soundcloud_panel_position';
const NETWORK_MONITOR_STATE_ATTRIBUTE = 'data-tn-network-monitor-active';
const SOUNDCLOUD_BUFFER_ELEMENT_ID = 'tn-networks-soundcloud-buffer';
const SOUND_CLOUD_DIRECT_HOOK_READY_ATTRIBUTE = 'data-tn-soundcloud-hook-ready';
const SOUND_CLOUD_DIRECT_BUFFER_ELEMENT_ID = 'tn-soundcloud-direct-capture-buffer';
const SOUND_CLOUD_INSIGHTS_CAPTURE_ENABLED = false;
const MAX_RECENT_FACEBOOK_COMMENT_ENTRIES = 200;
const DEFAULT_REPLY_PROMPT = 'Write text that fits the visible context and can be pasted into the selected field.';
const MARKED_CONTEXT_LABEL_MODES = ['compact', 'mark-id', 'detailed'];
const MARKED_CONTEXT_EXPANSION_MODES = ['current', 'parent', 'parent-children', 'document'];
const MIN_SELECTION_ACTION_LENGTH = 2;
const extensionI18n = globalThis.TNNetworksExtensionI18n || {
    locale: 'en',
    t: function (key, params, fallback) {
        return typeof fallback !== 'undefined' ? fallback : key;
    },
    setLocale: function () {
        return 'en';
    }
};
const ct = function (key, params, fallback) {
    return extensionI18n.t(key, params, fallback);
};
const QUICK_REPLY_PRESETS = {
    default: {
        label: 'Balanced default',
        instruction: 'Write the best possible short public reply to the current message or comment. Sound natural, relevant, and ready to paste.',
    },
    empathetic: {
        label: 'Empathetic and human',
        instruction: 'Write a warm, human quick reply that shows understanding, avoids sounding robotic, and still stays concise.',
    },
    factual: {
        label: 'Calm and factual',
        instruction: 'Write a calm, factual quick reply that keeps emotions low, stays concrete, and avoids unnecessary filler.',
    },
    deescalate: {
        label: 'De-escalate tension',
        instruction: 'Write a short reply that lowers tension, stays respectful, and keeps the conversation constructive.',
    },
};
const FACEBOOK_REPLY_NOISE_LINES = ['most relevant', 'mest relevant', 'like', 'reply', 'share', 'comment', 'send', 'gif', 'gilla', 'svara', 'dela', 'kommentera', 'skicka'];
const FACEBOOK_ADMIN_MONTH_INDEX = {
    jan: 0,
    january: 0,
    januari: 0,
    feb: 1,
    february: 1,
    februari: 1,
    mar: 2,
    march: 2,
    mars: 2,
    apr: 3,
    april: 3,
    may: 4,
    maj: 4,
    jun: 5,
    june: 5,
    juni: 5,
    jul: 6,
    july: 6,
    juli: 6,
    aug: 7,
    august: 7,
    augusti: 7,
    sep: 8,
    sept: 8,
    september: 8,
    okt: 9,
    october: 9,
    oktober: 9,
    nov: 10,
    november: 10,
    dec: 11,
    december: 11,
};

let extensionContextAvailable = true;
let locationWatchIntervalId = null;

function isContextInvalidatedError(error) {
    const message = error && error.message ? String(error.message) : String(error || '');
    return message.toLowerCase().indexOf('extension context invalidated') !== -1;
}

function handleExtensionContextInvalidated(error) {
    if (!extensionContextAvailable) {
        return;
    }

    const invalidationMessage = 'Extension was reloaded or updated. Uploads are paused in this tab until you reload the page.';

    extensionContextAvailable = false;
    adminDebugEnabled = false;
    adminActivitiesScanScheduled = false;
    adminFlushRequestedWhileBusy = false;
    adminFlushInProgress = false;

    if (adminActiveSendBatch && adminActiveSendBatch.length) {
        adminActivityReporter.markBatchFailed(adminActiveSendBatch, invalidationMessage, {
            reason: 'extension-context-invalidated',
        });
        adminActiveSendBatch = null;
    }

    adminLastStatusText = invalidationMessage;

    if (locationWatchIntervalId) {
        window.clearInterval(locationWatchIntervalId);
        locationWatchIntervalId = null;
    }

    if (adminActivitiesControl) {
        updateAdminActivitiesControl();
    }

    if (typeof console !== 'undefined' && console.info) {
        console.info('[TN Social Tools] Extension context invalidated. Reload the page to reattach the updated extension in this tab.', {
            error: error && error.message ? error.message : String(error || 'Unknown error'),
            url: location.href,
        });
    }
}

function safeChromeCall(action, fallback) {
    if (!extensionContextAvailable) {
        return fallback;
    }

    if (typeof chrome === 'undefined' || !chrome) {
        return fallback;
    }

    try {
        return action();
    } catch (error) {
        if (isContextInvalidatedError(error)) {
            handleExtensionContextInvalidated(error);
            return fallback;
        }

        throw error;
    }
}

function getExtensionVersion() {
    return safeChromeCall(function () {
        if (!chrome.runtime || typeof chrome.runtime.getManifest !== 'function') {
            return 'unknown';
        }
        return chrome.runtime.getManifest().version;
    }, 'unknown');
}

function safeRuntimeGetURL(path) {
    return safeChromeCall(function () {
        if (!chrome.runtime || typeof chrome.runtime.getURL !== 'function') {
            return '';
        }
        return chrome.runtime.getURL(path);
    }, '');
}

function safeSendRuntimeMessage(message) {
    return safeChromeCall(function () {
        if (!chrome.runtime || typeof chrome.runtime.sendMessage !== 'function') {
            return false;
        }
        chrome.runtime.sendMessage(message);
        return true;
    }, false);
}

function safeSendRuntimeMessageWithResponse(message) {
    return new Promise(function (resolve) {
        const sent = safeChromeCall(function () {
            if (!chrome.runtime || typeof chrome.runtime.sendMessage !== 'function') {
                return false;
            }
            chrome.runtime.sendMessage(message, function (response) {
                if (chrome.runtime && chrome.runtime.lastError) {
                    if (isContextInvalidatedError(chrome.runtime.lastError)) {
                        handleExtensionContextInvalidated(chrome.runtime.lastError);
                    }
                    resolve({ok: false, error: chrome.runtime.lastError.message});
                    return;
                }

                resolve(response || {ok: false, error: 'No response from extension runtime.'});
            });
            return true;
        }, false);

        if (!sent) {
            resolve({ok: false, error: 'Extension runtime unavailable.'});
        }
    });
}

function safeStorageSyncGet(keys, callback) {
    const result = safeChromeCall(function () {
        if (!chrome.storage || !chrome.storage.sync || typeof chrome.storage.sync.get !== 'function') {
            return false;
        }
        chrome.storage.sync.get(keys, function (data) {
            if (chrome.runtime && chrome.runtime.lastError && isContextInvalidatedError(chrome.runtime.lastError)) {
                handleExtensionContextInvalidated(chrome.runtime.lastError);
                callback({});
                return;
            }

            callback(data || {});
        });
        return true;
    }, false);

    if (!result) {
        callback({});
    }
}

function safeStorageSyncSet(values, callback) {
    return safeChromeCall(function () {
        if (!chrome.storage || !chrome.storage.sync || typeof chrome.storage.sync.set !== 'function') {
            if (typeof callback === 'function') {
                callback();
            }
            return false;
        }
        chrome.storage.sync.set(values, function () {
            if (chrome.runtime && chrome.runtime.lastError && isContextInvalidatedError(chrome.runtime.lastError)) {
                handleExtensionContextInvalidated(chrome.runtime.lastError);
            }
            if (typeof callback === 'function') {
                callback();
            }
        });
        return true;
    }, false);
}

function safeAddRuntimeMessageListener(handler) {
    return safeChromeCall(function () {
        if (!chrome.runtime || !chrome.runtime.onMessage || typeof chrome.runtime.onMessage.addListener !== 'function') {
            return false;
        }
        chrome.runtime.onMessage.addListener(handler);
        return true;
    }, false);
}

function safeAddStorageChangeListener(handler) {
    return safeChromeCall(function () {
        if (!chrome.storage || !chrome.storage.onChanged || typeof chrome.storage.onChanged.addListener !== 'function') {
            return false;
        }
        chrome.storage.onChanged.addListener(handler);
        return true;
    }, false);
}

function normalizeResponseLanguageChoice(value) {
    const normalized = String(value || '').trim().toLowerCase();
    return ['auto', 'sv', 'en', 'da', 'no', 'de', 'fr', 'es'].indexOf(normalized) !== -1
        ? normalized
        : 'auto';
}

function normalizeExtensionUiLanguage(value) {
    const normalized = String(value || '').trim().toLowerCase();
    return ['auto', 'en', 'sv'].indexOf(normalized) !== -1
        ? normalized
        : 'auto';
}

function applyExtensionUiLanguage(value) {
    extensionUiLanguage = normalizeExtensionUiLanguage(value);
    if (typeof extensionI18n.setLocale === 'function') {
        extensionI18n.setLocale(extensionUiLanguage);
    }
    refreshLocalizedExtensionUi();
}

function getEmptyContextPrompt() {
    return '(' + ct('contentScript.anchorFocusOrMark', {}, 'Focus a text field or mark elements to build context.') + ')';
}

function normalizeQuickReplyPresetChoice(value) {
    const normalized = String(value || '').trim().toLowerCase();
    return Object.prototype.hasOwnProperty.call(QUICK_REPLY_PRESETS, normalized)
        ? normalized
        : 'default';
}

function normalizeMarkedContextLabelMode(value) {
    const normalized = String(value || '').trim().toLowerCase();
    return MARKED_CONTEXT_LABEL_MODES.indexOf(normalized) !== -1
        ? normalized
        : 'compact';
}

function normalizeMarkedContextExpansionMode(value) {
    const normalized = String(value || '').trim().toLowerCase();
    return MARKED_CONTEXT_EXPANSION_MODES.indexOf(normalized) !== -1
        ? normalized
        : 'current';
}

function normalizeModelOption(option) {
    const id = option && option.id ? normalizeWhitespace(option.id) : '';
    if (!id) {
        return null;
    }

    return {
        id: id,
        label: option && option.label ? normalizeWhitespace(option.label) : id,
    };
}

function normalizeAvailableToolsModels(models) {
    const seen = new Set();
    const normalized = [];

    (Array.isArray(models) ? models : []).forEach(function (option) {
        const normalizedOption = normalizeModelOption(option);
        if (!normalizedOption || seen.has(normalizedOption.id)) {
            return;
        }

        seen.add(normalizedOption.id);
        normalized.push(normalizedOption);
    });

    return normalized.length ? normalized : [
        {id: 'gpt-4o-mini', label: 'gpt-4o-mini'},
        {id: 'gpt-4o', label: 'gpt-4o'},
        {id: 'gpt-4.1-mini', label: 'gpt-4.1-mini'},
        {id: 'gpt-4.1', label: 'gpt-4.1'},
        {id: 'o4-mini', label: 'o4-mini'},
        {id: 'o3-mini', label: 'o3-mini'},
    ];
}

function resolveDefaultToolsModel(models, candidate) {
    const normalizedCandidate = normalizeWhitespace(candidate || '');
    const available = normalizeAvailableToolsModels(models);

    if (normalizedCandidate && available.some(function (option) {
        return option.id === normalizedCandidate;
    })) {
        return normalizedCandidate;
    }

    return available[0] ? available[0].id : 'gpt-4o-mini';
}

function getAvailableModelIds() {
    return normalizeAvailableToolsModels(availableToolsModels).map(function (option) {
        return option.id;
    });
}

function populatePanelModelOptions(selectedModel) {
    if (!panel) {
        return;
    }

    const modelField = panel.querySelector('#sgpt-model');
    if (!modelField) {
        return;
    }

    const available = normalizeAvailableToolsModels(availableToolsModels);
    defaultToolsModel = resolveDefaultToolsModel(available, defaultToolsModel);
    const resolvedSelection = resolveDefaultToolsModel(available, selectedModel || preferredToolsModel || defaultToolsModel);

    modelField.innerHTML = '';
    available.forEach(function (option) {
        const optionElement = document.createElement('option');
        optionElement.value = option.id;
        optionElement.textContent = option.label || option.id;
        modelField.appendChild(optionElement);
    });
    modelField.value = resolvedSelection;
}

function getPreferredDeepVerificationModel(currentModel) {
    const availableIds = getAvailableModelIds();
    const normalizedCurrentModel = normalizeWhitespace(currentModel || '');

    const preferredThinkingModels = ['o3', 'o4-mini', 'o3-mini', 'o1', 'o1-mini'];
    for (let index = 0; index < preferredThinkingModels.length; index += 1) {
        if (availableIds.indexOf(preferredThinkingModels[index]) !== -1) {
            return preferredThinkingModels[index];
        }
    }
    if (availableIds.indexOf('o3-mini') !== -1) {
        return 'o3-mini';
    }
    if (availableIds.indexOf('o4-mini') !== -1) {
        return 'o4-mini';
    }
    if (normalizedCurrentModel && availableIds.indexOf(normalizedCurrentModel) !== -1) {
        return normalizedCurrentModel;
    }

    return resolveDefaultToolsModel(availableToolsModels, defaultToolsModel);
}

function resolvePreferredFactCheckModel(value) {
    const candidate = normalizeWhitespace(value || '');
    const availableIds = getAvailableModelIds();

    if (candidate && availableIds.indexOf(candidate) !== -1) {
        return candidate;
    }
    if (availableIds.indexOf('gpt-4o') !== -1) {
        return 'gpt-4o';
    }

    return resolveDefaultToolsModel(availableToolsModels, preferredToolsModel || defaultToolsModel || 'gpt-4o');
}

async function refreshAvailableModelsForPanel(forceRefresh) {
    if (modelsCatalogLoading) {
        return false;
    }

    modelsCatalogLoading = true;

    try {
        const response = await safeSendRuntimeMessageWithResponse({
            type: 'GET_AVAILABLE_MODELS',
            forceRefresh: !!forceRefresh,
        });

        if (response && Array.isArray(response.models) && response.models.length) {
            availableToolsModels = normalizeAvailableToolsModels(response.models);
            defaultToolsModel = resolveDefaultToolsModel(availableToolsModels, response.defaultModel || defaultToolsModel);
            populatePanelModelOptions(preferredToolsModel || defaultToolsModel);
            safeStorageSyncSet({
                availableToolsModels: availableToolsModels,
                defaultToolsModel: defaultToolsModel,
            });
            return true;
        }

        populatePanelModelOptions(preferredToolsModel || defaultToolsModel);
        return false;
    } finally {
        modelsCatalogLoading = false;
    }
}

safeStorageSyncGet(['extensionUiLanguage', 'defaultResponseLanguage', 'defaultVerifyFactLanguage', 'preferredFactCheckModel', 'defaultQuickReplyPreset', 'defaultQuickReplyCustomInstruction', 'availableToolsModels', 'defaultToolsModel', 'preferredToolsModel', 'markedContextLabelMode', 'markedContextExpansionMode'], function (data) {
    applyExtensionUiLanguage(data.extensionUiLanguage || extensionUiLanguage);
    defaultResponseLanguage = normalizeResponseLanguageChoice(data.defaultResponseLanguage || 'auto');
    defaultVerifyFactLanguage = normalizeResponseLanguageChoice(data.defaultVerifyFactLanguage || defaultResponseLanguage || 'auto');
    preferredFactCheckModel = resolvePreferredFactCheckModel(data.preferredFactCheckModel || 'gpt-4o');
    defaultQuickReplyPreset = normalizeQuickReplyPresetChoice(data.defaultQuickReplyPreset || 'default');
    defaultQuickReplyCustomInstruction = normalizeWhitespace(data.defaultQuickReplyCustomInstruction || '');
    availableToolsModels = normalizeAvailableToolsModels(data.availableToolsModels || availableToolsModels);
    defaultToolsModel = resolveDefaultToolsModel(availableToolsModels, data.defaultToolsModel || defaultToolsModel);
    preferredToolsModel = resolveDefaultToolsModel(availableToolsModels, data.preferredToolsModel || defaultToolsModel);
    preferredFactCheckModel = resolvePreferredFactCheckModel(data.preferredFactCheckModel || preferredFactCheckModel);
    markedContextLabelMode = normalizeMarkedContextLabelMode(data.markedContextLabelMode || markedContextLabelMode);
    markedContextExpansionMode = normalizeMarkedContextExpansionMode(data.markedContextExpansionMode || markedContextExpansionMode);
    refreshMarkedElementPresentation();
});

safeAddStorageChangeListener(function (changes, areaName) {
    if (areaName !== 'sync') {
        return;
    }

    if (changes.extensionUiLanguage) {
        applyExtensionUiLanguage(changes.extensionUiLanguage.newValue || extensionUiLanguage);
    }
    if (changes.defaultResponseLanguage) {
        defaultResponseLanguage = normalizeResponseLanguageChoice(changes.defaultResponseLanguage.newValue || 'auto');
    }
    if (changes.defaultVerifyFactLanguage) {
        defaultVerifyFactLanguage = normalizeResponseLanguageChoice(changes.defaultVerifyFactLanguage.newValue || defaultResponseLanguage || 'auto');
    }
    if (changes.preferredFactCheckModel) {
        preferredFactCheckModel = resolvePreferredFactCheckModel(changes.preferredFactCheckModel.newValue || 'gpt-4o');
    }
    if (changes.defaultQuickReplyPreset) {
        defaultQuickReplyPreset = normalizeQuickReplyPresetChoice(changes.defaultQuickReplyPreset.newValue || 'default');
    }
    if (changes.defaultQuickReplyCustomInstruction) {
        defaultQuickReplyCustomInstruction = normalizeWhitespace(changes.defaultQuickReplyCustomInstruction.newValue || '');
    }
    if (changes.markedContextLabelMode) {
        markedContextLabelMode = normalizeMarkedContextLabelMode(changes.markedContextLabelMode.newValue || 'compact');
    }
    if (changes.markedContextExpansionMode) {
        markedContextExpansionMode = normalizeMarkedContextExpansionMode(changes.markedContextExpansionMode.newValue || 'current');
    }
    if (changes.availableToolsModels) {
        availableToolsModels = normalizeAvailableToolsModels(changes.availableToolsModels.newValue || availableToolsModels);
        preferredFactCheckModel = resolvePreferredFactCheckModel(preferredFactCheckModel);
        populatePanelModelOptions(preferredToolsModel || defaultToolsModel);
    }
    if (changes.defaultToolsModel) {
        defaultToolsModel = resolveDefaultToolsModel(availableToolsModels, changes.defaultToolsModel.newValue || defaultToolsModel);
        preferredFactCheckModel = resolvePreferredFactCheckModel(preferredFactCheckModel);
        populatePanelModelOptions(preferredToolsModel || defaultToolsModel);
    }
    if (changes.preferredToolsModel) {
        preferredToolsModel = resolveDefaultToolsModel(availableToolsModels, changes.preferredToolsModel.newValue || preferredToolsModel || defaultToolsModel);
        populatePanelModelOptions(preferredToolsModel);
    }

    if (changes.markedContextLabelMode || changes.markedContextExpansionMode || changes.extensionUiLanguage) {
        handleMarkedContextSettingsChanged();
    }
});

const EXTENSION_VERSION = getExtensionVersion();

let adminIngestEnabled = false;
let adminDebugEnabled = false;
let adminFeatureEnabled = false;
let adminActivitiesScanScheduled = false;
let adminFlushInProgress = false;
let adminFlushRequestedWhileBusy = false;
let adminActiveSendBatch = null;
let networkMonitorInjected = false;
let adminLastStatusText = 'Passive activity detection is ready. Statistics are off.';
let soundCloudPageBridge = null;
let adminNetworkEventsSeen = 0;
let adminInterestingNetworkEventsSeen = 0;
let adminLastNetworkEventAt = 0;
let adminNetworkDebugAnnounced = false;
let lastObservedLocationHref = location.href;
let adminActivitiesControlDragState = null;
let adminActivitiesDragListenersBound = false;
let soundCloudInsightsControlDragState = null;
let soundCloudInsightsDragListenersBound = false;
let soundCloudAutoIngestEnabled = false;
let soundCloudAutoIngestTouchedThisVisit = false;
let soundCloudToolsTokenConfigured = false;
let soundCloudDirectHookReady = false;
let soundCloudDirectHookMeta = null;
let soundCloudBackgroundPendingCaptureCount = 0;
let soundCloudBackgroundDuplicateCaptureCount = 0;
let soundCloudBackgroundLastFlush = null;
let activeReplyContextMeta = null;
let latestBootstrapAdminScanDebug = null;
let latestInjectedBootstrapAdminScanDebug = null;
const recentAdminNetworkEvents = [];
const facebookCommentEntryKeys = new Set();
const recentFacebookCommentEntries = [];

function clearAdminActivityRuntimeDebugState() {
    adminNetworkEventsSeen = 0;
    adminInterestingNetworkEventsSeen = 0;
    adminLastNetworkEventAt = 0;
    adminNetworkDebugAnnounced = false;
    latestBootstrapAdminScanDebug = null;
    latestInjectedBootstrapAdminScanDebug = null;
    recentAdminNetworkEvents.length = 0;
}

function disableAdminActivityCollection(message, meta) {
    const snapshot = getAdminReporterSnapshot();
    const hadPendingEntries = !!(snapshot && snapshot.totals && snapshot.totals.pending);

    adminIngestEnabled = false;
    adminActivitiesScanScheduled = false;
    adminFlushRequestedWhileBusy = false;
    adminFlushInProgress = false;
    adminActiveSendBatch = null;
    adminActivityReporter.reset();
    clearAdminActivityRuntimeDebugState();
    adminLastStatusText = message || 'Activity statistics are disabled for this tab.';

    if (adminActivitiesControl) {
        updateAdminActivitiesControl();
    }

    if (meta) {
        debugLog({
            level: 'info',
            category: 'facebook-admin-ingest',
            message: 'Facebook admin activity collection disabled.',
            meta: Object.assign({
                url: location.href,
                cleared_pending_entries: hadPendingEntries,
            }, meta),
        });
    }
}

function debugLog(entry) {
    safeSendRuntimeMessage({
        type: 'DEBUG_LOG',
        entry: Object.assign({
            source: 'content-script',
        }, entry || {}),
    });
}

const adminActivityReporter = typeof TNFacebookAdminReporter !== 'undefined' && TNFacebookAdminReporter && typeof TNFacebookAdminReporter.createReporter === 'function'
    ? TNFacebookAdminReporter.createReporter({
        storageKey: 'tn_social_tools_facebook_admin_reporter_v1',
        ttlMs: 24 * 60 * 60 * 1000,
        log: function (category, message, meta) {
            debugLog({
                level: 'info',
                category: category,
                message: message,
                meta: meta || {},
            });
        },
        debugEnabled: function () {
            return adminDebugEnabled;
        },
    })
    : {
        normalizeEntry: function (entry) { return entry || null; },
        discoverEntries: function () { return {added: 0, duplicates: 0, entries: []}; },
        startNextBatch: function () { return []; },
        markBatchSent: function () {},
        markBatchFailed: function () {},
        getQueueSize: function () { return 0; },
        reset: function () {},
        getSnapshot: function () {
            return {
                totals: {
                    detected: 0,
                    duplicates_ignored: 0,
                    queued: 0,
                    sending: 0,
                    failed: 0,
                    pending: 0,
                    sent: 0,
                    batches_started: 0,
                    batches_succeeded: 0,
                    batches_failed: 0,
                },
                reportable_entries: [],
                recent_sent_entries: [],
                last_submission: null,
                has_reportable_entries: false,
            };
        },
    };

function getAdminReporterSnapshot() {
    return adminActivityReporter.getSnapshot();
}

function buildAdminLastSubmissionSummary(lastSubmission) {
    if (!lastSubmission || typeof lastSubmission !== 'object') {
        return '';
    }

    if (lastSubmission.status === 'sending') {
        return 'Bulk send in progress. Attempting ' + (lastSubmission.attempted || 0) + ' entr' + ((lastSubmission.attempted || 0) === 1 ? 'y' : 'ies') + '.';
    }

    if (lastSubmission.status === 'success') {
        return 'Bulk sent: attempted ' + (lastSubmission.attempted || 0)
            + ' · received ' + (lastSubmission.received || 0)
            + ' · created ' + (lastSubmission.created || 0)
            + ' · updated/duplicate-safe ' + (lastSubmission.updated || 0)
            + ' · queue remaining ' + (lastSubmission.queue_remaining || 0);
    }

    if (lastSubmission.status === 'failed') {
        return 'Bulk send failed: attempted ' + (lastSubmission.attempted || 0)
            + ' · failed ' + (lastSubmission.failed || 0)
            + ' · queue remaining ' + (lastSubmission.queue_remaining || 0)
            + (lastSubmission.error ? ' · ' + lastSubmission.error : '');
    }

    return '';
}

function buildAdminReporterStatusPayload() {
    const snapshot = getAdminReporterSnapshot();
    const reportableEntries = sortAdminEntriesByRecency(snapshot.reportable_entries || []).slice(0, 5);
    const counters = snapshot.totals || {};

    return {
        ok: true,
        page_url: location.href,
        is_facebook_page: isFacebookPage(),
        is_admin_page: isFacebookAdminActivitiesPage(),
        feature_enabled: adminFeatureEnabled,
        ingest_enabled: adminIngestEnabled,
        debug_enabled: adminDebugEnabled,
        state_text: adminFeatureEnabled
            ? adminLastStatusText
            : 'Facebook admin activity statistics are disabled in the popup. Enable the feature there before using this page.',
        reportable_heading: 'Reportable if enabled',
        reportable_empty_text: 'No reportable admin-log entries detected yet.',
        reportable_entries: reportableEntries.map(function (entry) {
            return {
                actor_name: entry.actor_name || 'Unknown actor',
                action_text: entry.action_text || entry.description || '',
                action: entry.action || entry.handled_outcome || '',
                target_name: entry.target_name || '',
                state: entry.state || 'queued',
                occurred_at: entry.occurred_at || entry.facebook_activity_time || null,
                key: entry.key || entry.dedupe_key || '',
            };
        }),
        counters: {
            detected: counters.detected || 0,
            duplicates_ignored: counters.duplicates_ignored || 0,
            queued: counters.queued || 0,
            sending: counters.sending || 0,
            failed: counters.failed || 0,
            pending: counters.pending || 0,
            sent: counters.sent || 0,
        },
        last_submission: snapshot.last_submission || null,
        last_submission_text: buildAdminLastSubmissionSummary(snapshot.last_submission),
    };
}

function adminDebugConsoleInfo(message, meta) {
    if (!adminDebugEnabled || typeof console === 'undefined' || !console.info) {
        return;
    }

    console.info(message, meta || {});
}

function buildBootstrapAdminScanDebug(reason) {
    return {
        reason: reason || 'bootstrap-scan',
        started_at: new Date().toISOString(),
        body_available: !!document.body,
        body_application_json_count: 0,
        xpath_hits: {},
        matched_script_count: 0,
        fallback_used: false,
        scripts_considered: 0,
        scripts_with_entries: 0,
        entries_detected: 0,
        pending_added: 0,
        parse_failures: 0,
        skipped_short: 0,
        skipped_matcher: 0,
        top_scripts: [],
        parsed_scripts: [],
        detected_entry_preview: [],
        outcome: 'pending',
    };
}

function getAdminEntryTimestamp(entry) {
    if (!entry) {
        return 0;
    }

    const occurred = entry.occurred_at ? Date.parse(entry.occurred_at) : 0;
    if (occurred) {
        return occurred;
    }

    const detected = entry.detected_at ? Date.parse(entry.detected_at) : 0;
    return detected || 0;
}

function sortAdminEntriesByRecency(entries) {
    return (entries || []).slice().sort(function (left, right) {
        const timeDiff = getAdminEntryTimestamp(right) - getAdminEntryTimestamp(left);
        if (timeDiff !== 0) {
            return timeDiff;
        }

        return String(right && right.key || '').localeCompare(String(left && left.key || ''));
    });
}

function summarizeBootstrapAdminScriptNode(node, raw, score) {
    const text = String(raw || '');
    return {
        type: normalizeWhitespace(node && node.getAttribute ? node.getAttribute('type') : '') || '(none)',
        has_data_sjs: !!(node && node.hasAttribute && node.hasAttribute('data-sjs')),
        score: typeof score === 'number' ? score : scoreBootstrapAdminActivityScriptNode(node, text),
        length: text.length,
        preview: clipText(normalizeWhitespace(text), 220),
        has_preloader: /adp_CometGroupAdminActivitiesActivityLogContentQueryRelayPreloader|CometGroupAdminActivitiesActivityLogContentQueryRelayPreloader/.test(text),
        has_admin_typename: /"__typename"\s*:\s*"GroupAdminActivity"|"__typename"\s*:\s*"GroupsCometAdminActivity"/.test(text),
    };
}

function renderBootstrapAdminScanDebug(scan, title, emptyText) {
    if (!adminDebugEnabled) {
        return '';
    }

    if (!scan) {
        return '<div style="color:#64748b;">' + escapeHtml(emptyText || 'No bootstrap scan has run yet.') + '</div>';
    }

    const xpathBits = Object.keys(scan.xpath_hits || {}).map(function (xpath) {
        return escapeHtml(xpath.replace(/^\.\/\/script/, '//script') + ': ' + scan.xpath_hits[xpath]);
    });
    const topScripts = Array.isArray(scan.top_scripts) ? scan.top_scripts.slice(0, 3) : [];
    const parsedScripts = Array.isArray(scan.parsed_scripts) ? scan.parsed_scripts.slice(0, 3) : [];

    return [
        '<div style="padding:8px; border-radius:8px; border:1px solid rgba(14,165,233,0.22); background:#f8fafc; color:#334155;">',
        '<div style="font-weight:700; color:#0f172a;">' + escapeHtml(title || 'Bootstrap debug') + '</div>',
        '<div style="margin-top:4px; color:#475569;">reason=' + escapeHtml(scan.reason || 'bootstrap-scan') + ' · outcome=' + escapeHtml(scan.outcome || 'pending') + '</div>',
        '<div style="margin-top:4px; color:#475569;">body=' + escapeHtml(scan.body_available ? 'yes' : 'no') + ' · application/json scripts=' + escapeHtml(String(scan.body_application_json_count || 0)) + ' · matched=' + escapeHtml(String(scan.matched_script_count || 0)) + ' · entries=' + escapeHtml(String(scan.entries_detected || 0)) + '</div>',
        '<div style="margin-top:4px; color:#475569;">considered=' + escapeHtml(String(scan.scripts_considered || 0)) + ' · scripts_with_entries=' + escapeHtml(String(scan.scripts_with_entries || 0)) + ' · pending_added=' + escapeHtml(String(scan.pending_added || 0)) + ' · parse_failures=' + escapeHtml(String(scan.parse_failures || 0)) + ' · fallback=' + escapeHtml(scan.fallback_used ? 'yes' : 'no') + '</div>',
        xpathBits.length ? '<div style="margin-top:6px; color:#475569;">XPath hits:<br>' + xpathBits.join('<br>') + '</div>' : '<div style="margin-top:6px; color:#64748b;">XPath hits: none</div>',
        (Array.isArray(scan.detected_entry_preview) && scan.detected_entry_preview.length)
            ? '<div style="margin-top:6px; font-weight:600; color:#0f172a;">Body entries parsed</div>' + scan.detected_entry_preview.map(function (text) {
                return '<div style="margin-top:3px; color:#475569;">' + escapeHtml(text) + '</div>';
            }).join('')
            : '<div style="margin-top:6px; color:#64748b;">Body entries parsed: none</div>',
        topScripts.length ? '<div style="margin-top:6px; font-weight:600; color:#0f172a;">Top body scripts</div>' + topScripts.map(function (item, index) {
            return '<div style="margin-top:4px; color:#475569;">#' + (index + 1) + ' score=' + escapeHtml(String(item.score || 0)) + ' len=' + escapeHtml(String(item.length || 0)) + ' preloader=' + escapeHtml(item.has_preloader ? 'yes' : 'no') + ' typename=' + escapeHtml(item.has_admin_typename ? 'yes' : 'no') + '<br>' + escapeHtml(item.preview || '') + '</div>';
        }).join('') : '<div style="margin-top:6px; color:#64748b;">No matching body scripts.</div>',
        parsedScripts.length ? '<div style="margin-top:6px; font-weight:600; color:#0f172a;">Parsed scripts</div>' + parsedScripts.map(function (item, index) {
            return '<div style="margin-top:4px; color:#475569;">#' + (index + 1) + ' entries=' + escapeHtml(String(item.entry_count || 0)) + ' chunks=' + escapeHtml(String(item.chunk_count || 0)) + ' single=' + escapeHtml(item.used_single_parse ? 'yes' : 'no') + '<br>' + escapeHtml(item.preview || '') + (item.entry_preview ? '<br>→ ' + escapeHtml(item.entry_preview) : '') + '</div>';
        }).join('') : '',
        '</div>'
    ].join('');
}

function syncAdminRuntimePreferences() {
    safeStorageSyncGet(['facebookAdminDebugEnabled', 'facebookAdminStatsEnabled'], function (data) {
        const nextDebugEnabled = !!(data && data.facebookAdminDebugEnabled);
        const nextFeatureEnabled = !!(data && data.facebookAdminStatsEnabled);
        const featureWasEnabled = adminFeatureEnabled;

        adminDebugEnabled = nextDebugEnabled;
        adminFeatureEnabled = nextFeatureEnabled;

        if (!adminFeatureEnabled) {
            if (adminIngestEnabled) {
                disableAdminActivityCollection('Facebook admin activity statistics were disabled in the popup. This tab queue was cleared.', {
                    reason: 'popup-feature-disabled',
                    auto_disabled: false,
                });
            } else {
                adminLastStatusText = 'Facebook admin activity statistics are disabled in the popup.';
            }
            ensureAdminActivitiesControl();
            return;
        }

        if (!featureWasEnabled && isFacebookAdminActivitiesPage()) {
            adminLastStatusText = 'Admin activities page detected. Statistics are disabled until you enable them for this exact Facebook URI.';
            injectNetworkMonitor();
            ensureAdminActivitiesControl();
        }

        updateAdminActivitiesControl();
    });
}

function normalizeWhitespace(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
}

function getResponseLanguageLabel(value) {
    const normalized = normalizeResponseLanguageChoice(value || defaultResponseLanguage);
    return {
        auto: ct('option.language.autoContext', {}, 'Same as the selected content/context'),
        sv: ct('option.language.sv', {}, 'Swedish'),
        en: ct('option.language.en', {}, 'English'),
        da: ct('option.language.da', {}, 'Danish'),
        no: ct('option.language.no', {}, 'Norwegian'),
        de: ct('option.language.de', {}, 'German'),
        fr: ct('option.language.fr', {}, 'French'),
        es: ct('option.language.es', {}, 'Spanish'),
    }[normalized] || ct('option.language.autoContext', {}, 'Same as the selected content/context');
}

function setLabelText(label, text) {
    if (!label) {
        return;
    }

    const textNode = Array.from(label.childNodes).find(function (node) {
        return node && node.nodeType === Node.TEXT_NODE;
    });

    if (textNode) {
        textNode.textContent = text;
    }
}

function refreshLocalizedPanelUi() {
    if (!panel) {
        return;
    }

    const head = panel.querySelector('#sgpt-head');
    if (head && head.firstChild) {
        head.firstChild.textContent = ct('contentScript.panelTitle', {}, 'Tornevall Networks Social Media Tools ↔') + ' ';
    }

    const closeButton = panel.querySelector('#sgpt-close');
    if (closeButton) {
        closeButton.setAttribute('aria-label', ct('contentScript.closeToolbox', {}, 'Close Toolbox'));
        closeButton.title = ct('contentScript.closeToolbox', {}, 'Close Toolbox');
    }

    const responderLabel = panel.querySelector('#sgpt-responder-label');
    if (responderLabel && responderLabel.firstChild) {
        responderLabel.firstChild.textContent = ct('contentScript.responder', {}, 'Responder') + ': ';
    }

    const promptField = panel.querySelector('#sgpt-prompt');
    if (promptField) {
        setLabelText(promptField.parentElement, ct('contentScript.promptLabel', {}, 'Prompt'));
        promptField.placeholder = ct('contentScript.promptPlaceholder', {}, 'Leave blank to use the default reply instruction.');
    }

    const modelField = panel.querySelector('#sgpt-model');
    if (modelField) {
        setLabelText(modelField.parentElement, ct('contentScript.modelLabel', {}, 'Model'));
    }

    const lengthField = panel.querySelector('#sgpt-length');
    if (lengthField) {
        setLabelText(lengthField.parentElement, ct('contentScript.lengthLabel', {}, 'Length'));
        const lengthLabels = [
            ct('contentScript.lengthAuto', {}, 'Let GPT decide'),
            ct('contentScript.lengthAsShort', {}, 'As short as possible'),
            ct('contentScript.lengthShortest', {}, 'At maximum one sentence. Possibly a one-liner.'),
            ct('contentScript.lengthVeryShort', {}, '2–3 sentences (very short)'),
            ct('contentScript.lengthShort', {}, '4–6 sentences (short)'),
            ct('contentScript.lengthMedium', {}, '6–10 sentences (medium)'),
            ct('contentScript.lengthExtreme', {}, 'Extreme. You want your own book.'),
            ct('contentScript.lengthLong', {}, 'Extended (whatever is needed)')
        ];
        Array.from(lengthField.options).forEach(function (option, index) {
            if (typeof lengthLabels[index] !== 'undefined') {
                option.textContent = lengthLabels[index];
            }
        });
    }

    const customMoodField = panel.querySelector('#sgpt-custom');
    if (customMoodField) {
        setLabelText(customMoodField.parentElement, ct('contentScript.customMoodLabel', {}, 'Custom mood'));
    }

    const modifierField = panel.querySelector('#sgpt-modifier');
    if (modifierField) {
        setLabelText(modifierField.parentElement, ct('contentScript.changeRequestLabel', {}, 'Change request'));
        modifierField.placeholder = ct('contentScript.changeRequestPlaceholder', {}, 'Optional: what should change?');
    }

    const languageField = panel.querySelector('#sgpt-language');
    if (languageField) {
        setLabelText(languageField.parentElement, ct('contentScript.languageLabel', {}, 'Language'));
        const languageLabels = [
            ct('option.language.autoContext', {}, 'Same as the selected content/context'),
            ct('option.language.sv', {}, 'Swedish'),
            ct('option.language.en', {}, 'English'),
            ct('option.language.da', {}, 'Danish'),
            ct('option.language.no', {}, 'Norwegian'),
            ct('option.language.de', {}, 'German'),
            ct('option.language.fr', {}, 'French'),
            ct('option.language.es', {}, 'Spanish')
        ];
        Array.from(languageField.options).forEach(function (option, index) {
            if (typeof languageLabels[index] !== 'undefined') {
                option.textContent = languageLabels[index];
            }
        });
    }

    const inlineContextLabel = panel.querySelector('.sgpt-inline-tools > span');
    if (inlineContextLabel) {
        inlineContextLabel.textContent = ct('contentScript.contextLabel', {}, 'Context');
    }

    const markButton = panel.querySelector('#sgpt-context-mark');
    if (markButton) {
        markButton.textContent = isClickMarkingActive
            ? ct('contentScript.stopMarking', {}, 'Stop marking')
            : ct('contentScript.markContext', {}, 'Mark context');
    }

    const importButton = panel.querySelector('#sgpt-context-import');
    if (importButton) {
        importButton.textContent = ct('contentScript.import', {}, 'Import');
    }

    const clearButton = panel.querySelector('#sgpt-context-clear');
    if (clearButton) {
        clearButton.textContent = ct('contentScript.clear', {}, 'Clear');
    }

    const contextField = panel.querySelector('#sgpt-context');
    if (contextField) {
        contextField.placeholder = ct('contentScript.contextPlaceholder', {}, 'Optional context: import visible page context or write your own notes here.');
    }

    const outputField = panel.querySelector('#sgpt-out');
    if (outputField) {
        setLabelText(outputField.parentElement, ct('contentScript.outputLabel', {}, 'Output'));
    }

    const sendButton = panel.querySelector('#sgpt-send');
    if (sendButton) {
        sendButton.textContent = ct('contentScript.generate', {}, 'Generate');
    }

    const refreshButton = panel.querySelector('#sgpt-mod');
    if (refreshButton) {
        refreshButton.textContent = ct('contentScript.refresh', {}, 'Refresh');
    }

    const verifyButton = panel.querySelector('#sgpt-verify');
    if (verifyButton) {
        verifyButton.textContent = ct('contentScript.verifyFact', {}, 'Verify fact');
    }

    const pasteButton = panel.querySelector('#sgpt-paste');
    if (pasteButton) {
        pasteButton.textContent = ct('contentScript.pasteIntoField', {}, 'Paste into field');
    }

    const loaderLabel = panel.querySelector('#sgpt-inline-loader-label');
    if (loaderLabel && (!loaderLabel.textContent || loaderLabel.textContent === 'Generating…' || loaderLabel.textContent === 'Genererar…')) {
        loaderLabel.textContent = ct('contentScript.generating', {}, 'Generating…');
    }

    updatePanelAnchorNote();
}

function refreshLocalizedExtensionUi() {
    if (composerActionButton) {
        composerActionButton.textContent = ct('contentScript.openToolbox', {}, 'Open Toolbox');
        composerActionButton.title = ct('contentScript.composerActionTitle', {}, 'Open Toolbox for the selected field. Drag to move it away. Double-click to reset its position.');
    }

    if (quickResponseActionButton) {
        quickResponseActionButton.textContent = ct('contentScript.quickResponse', {}, 'Quick response');
        quickResponseActionButton.title = ct('contentScript.quickResponseTitle', {}, 'Generate a quick reply using the preset saved in the extension popup.');
    }

    if (verifyActionButton) {
        verifyActionButton.textContent = ct('contentScript.verifyFact', {}, 'Verify fact');
        verifyActionButton.title = ct('contentScript.verifySelectionTitle', {}, 'Fact-check the selected text.');
    }

    if (selectionToolboxActionButton) {
        selectionToolboxActionButton.textContent = ct('contentScript.openToolbox', {}, 'Open Toolbox');
        selectionToolboxActionButton.title = ct('contentScript.openToolboxSelectionTitle', {}, 'Open Toolbox with the selected text imported as context.');
    }

    if (verifyHoverButton) {
        verifyHoverButton.textContent = ct('contentScript.verifyShort', {}, 'Verify');
        verifyHoverButton.title = ct('contentScript.verifyHoverTitle', {}, 'Verify the hovered image or link. Drag to move it away and double-click to reset.');
    }

    refreshLocalizedPanelUi();
}

function normalizeAdminActivityTimeValue(value) {
    if (value === null || typeof value === 'undefined' || value === '') {
        return null;
    }

    if (typeof value === 'number' && isFinite(value)) {
        const numericDate = new Date(value > 9999999999 ? value : value * 1000);
        return isNaN(numericDate.getTime()) ? null : numericDate.toISOString();
    }

    const raw = normalizeWhitespace(value);
    if (!raw) {
        return null;
    }

    if (/^\d{10,13}$/.test(raw)) {
        const numericValue = Number(raw);
        if (isFinite(numericValue)) {
            const unixDate = new Date(raw.length >= 13 ? numericValue : numericValue * 1000);
            if (!isNaN(unixDate.getTime())) {
                return unixDate.toISOString();
            }
        }
    }

    const parsed = Date.parse(raw);
    if (!isNaN(parsed)) {
        return new Date(parsed).toISOString();
    }

    return null;
}

function isGenericAdminTargetLabel(value) {
    const normalized = normalizeWhitespace(value).toLowerCase();
    if (!normalized) {
        return false;
    }

    return [
        'inlägg',
        'post',
        'kommentar',
        'comment',
        'medlem',
        'member',
        'förfrågan',
        'request',
        'reported content',
        'content',
        'reply',
        'svar'
    ].indexOf(normalized) !== -1;
}

function normalizeAdminTargetInfo(targetName, targetType) {
    const normalizedTargetName = normalizeWhitespace(targetName || '');
    const normalizedTargetType = normalizeWhitespace(targetType || '');

    if (!normalizedTargetName) {
        return {
            target_name: null,
            target_type: normalizedTargetType || null,
        };
    }

    if (normalizedTargetType) {
        return {
            target_name: normalizedTargetName,
            target_type: normalizedTargetType,
        };
    }

    if (isGenericAdminTargetLabel(normalizedTargetName)) {
        return {
            target_name: null,
            target_type: normalizedTargetName,
        };
    }

    return {
        target_name: normalizedTargetName,
        target_type: null,
    };
}

function buildLocalIsoTimestamp(year, monthIndex, day, hour, minute) {
    const parsedYear = Number(year);
    const parsedMonthIndex = Number(monthIndex);
    const parsedDay = Number(day);
    const parsedHour = Number(hour);
    const parsedMinute = Number(minute);
    if (!isFinite(parsedYear) || !isFinite(parsedMonthIndex) || !isFinite(parsedDay) || !isFinite(parsedHour) || !isFinite(parsedMinute)) {
        return null;
    }

    const date = new Date(parsedYear, parsedMonthIndex, parsedDay, parsedHour, parsedMinute, 0, 0);
    return isNaN(date.getTime()) ? null : date.toISOString();
}

function parseFacebookAdminDateLine(text) {
    const normalized = normalizeWhitespace(text)
        .replace(/\s+kl\.?\s+/i, ' ')
        .replace(/,/g, '');
    if (!normalized) {
        return null;
    }

    const lower = normalized.toLowerCase();
    const todayMatch = lower.match(/^(idag|today)\s+(\d{1,2}):(\d{2})$/i);
    if (todayMatch) {
        const now = new Date();
        return buildLocalIsoTimestamp(now.getFullYear(), now.getMonth(), now.getDate(), todayMatch[2], todayMatch[3]);
    }

    const yesterdayMatch = lower.match(/^(igår|yesterday)\s+(\d{1,2}):(\d{2})$/i);
    if (yesterdayMatch) {
        const now = new Date();
        now.setDate(now.getDate() - 1);
        return buildLocalIsoTimestamp(now.getFullYear(), now.getMonth(), now.getDate(), yesterdayMatch[2], yesterdayMatch[3]);
    }

    const namedMonthMatch = lower.match(/^(\d{1,2})\s+([a-zåäö]+)\s+(\d{4})(?:\s+|\s*at\s*)(\d{1,2}):(\d{2})$/i)
        || lower.match(/^(\d{1,2})\s+([a-zåäö]+)(?:\s+|\s*at\s*)(\d{1,2}):(\d{2})$/i);
    if (namedMonthMatch) {
        const hasExplicitYear = namedMonthMatch.length === 6;
        const day = namedMonthMatch[1];
        const monthLabel = namedMonthMatch[2];
        const monthIndex = FACEBOOK_ADMIN_MONTH_INDEX[monthLabel];
        if (typeof monthIndex === 'number') {
            const year = hasExplicitYear ? namedMonthMatch[3] : String(new Date().getFullYear());
            const hour = hasExplicitYear ? namedMonthMatch[4] : namedMonthMatch[3];
            const minute = hasExplicitYear ? namedMonthMatch[5] : namedMonthMatch[4];
            return buildLocalIsoTimestamp(year, monthIndex, day, hour, minute);
        }
    }

    const directParsed = Date.parse(normalized);
    if (!isNaN(directParsed)) {
        return new Date(directParsed).toISOString();
    }

    return null;
}

function extractOccurredAtFromVisibleAdminContainer(container) {
    if (!container) {
        return null;
    }

    const directTimeNodes = container.querySelectorAll('time, abbr[data-utime], span[title], a[title]');
    for (let index = 0; index < directTimeNodes.length; index += 1) {
        const node = directTimeNodes[index];
        const unixValue = node && node.getAttribute ? (node.getAttribute('data-utime') || node.getAttribute('data-store') || '') : '';
        const normalizedUnix = normalizeAdminActivityTimeValue(unixValue);
        if (normalizedUnix) {
            return normalizedUnix;
        }

        const titledValue = node && node.getAttribute ? node.getAttribute('title') : '';
        const titledTime = parseFacebookAdminDateLine(titledValue || '');
        if (titledTime) {
            return titledTime;
        }

        const nodeTextTime = parseFacebookAdminDateLine(node && node.textContent ? node.textContent : '');
        if (nodeTextTime) {
            return nodeTextTime;
        }
    }

    const lines = String(container.innerText || '')
        .split(/\n+/)
        .map(function (line) {
            return normalizeWhitespace(line);
        })
        .filter(Boolean)
        .reverse();

    for (let index = 0; index < lines.length; index += 1) {
        const parsed = parseFacebookAdminDateLine(lines[index]);
        if (parsed) {
            return parsed;
        }
    }

    return null;
}

function isFacebookPage() {
    return location.hostname.indexOf('facebook.com') !== -1;
}

function isSoundCloudPage() {
    return location.hostname.indexOf('soundcloud.com') !== -1;
}

function getSoundCloudPlatformDefinition() {
    const platform = getActivePlatformDefinition();
    return platform && platform.id === 'soundcloud' ? platform : null;
}

function isSupportedSoundCloudInsightsPage() {
    if (!SOUND_CLOUD_INSIGHTS_CAPTURE_ENABLED) {
        return false;
    }

    const platform = getSoundCloudPlatformDefinition();
    return !!(platform && typeof platform.isSupportedPage === 'function' && platform.isSupportedPage(location));
}

function getSoundCloudPageBridge() {
    if (!SOUND_CLOUD_INSIGHTS_CAPTURE_ENABLED) {
        return null;
    }

    if (!soundCloudPageBridge
        && window.TNNetworksSoundCloudPageBridge
        && typeof window.TNNetworksSoundCloudPageBridge.create === 'function') {
        soundCloudPageBridge = window.TNNetworksSoundCloudPageBridge.create({
            isSoundCloudPage: isSoundCloudPage,
            isSupportedInsightsPage: isSupportedSoundCloudInsightsPage,
            getLocationHref: function () {
                return location.href;
            },
            getDocumentTitle: function () {
                return document.title || '';
            },
            getNetworkMonitorInjected: function () {
                return !!((isSoundCloudPage() ? soundCloudDirectHookReady : isNetworkMonitorActive()) && isSupportedSoundCloudInsightsPage());
            },
            getHookReady: function () {
                return !!soundCloudDirectHookReady;
            },
            getLastHookMeta: function () {
                return soundCloudDirectHookMeta;
            },
            sendRuntimeMessage: safeSendRuntimeMessage,
            sendRuntimeMessageWithResponse: safeSendRuntimeMessageWithResponse,
        });
    }

    return soundCloudPageBridge;
}

function setSoundCloudStatusText(text) {
    const bridge = getSoundCloudPageBridge();
    if (!bridge) {
        return 'SoundCloud insights capture is unavailable.';
    }

    return bridge.setStatusText(text);
}

function buildSoundCloudPageStatusPayload() {
    const bridge = getSoundCloudPageBridge();
    const payload = bridge ? bridge.buildPageStatusPayload() : {
        ok: true,
        status: {
            pageUrl: location.href,
            title: document.title || '',
            isSoundCloudPage: isSoundCloudPage(),
            isRelevantInsightsPage: isSupportedSoundCloudInsightsPage(),
            networkMonitorInjected: !!((isSoundCloudPage() ? soundCloudDirectHookReady : isNetworkMonitorActive()) && isSupportedSoundCloudInsightsPage()),
            hookReady: !!soundCloudDirectHookReady,
            stateText: 'SoundCloud insights capture is unavailable.',
            captureCount: 0,
            lastCapture: null,
            pendingCaptureCount: soundCloudBackgroundPendingCaptureCount || 0,
            lastFlush: soundCloudBackgroundLastFlush || null,
            lastHookMeta: soundCloudDirectHookMeta,
        }
    };

    if (payload && payload.status) {
        payload.status.pendingCaptureCount = soundCloudBackgroundPendingCaptureCount || payload.status.pendingCaptureCount || 0;
        payload.status.duplicateCaptureCount = soundCloudBackgroundDuplicateCaptureCount || payload.status.duplicateCaptureCount || 0;
        payload.status.lastFlush = soundCloudBackgroundLastFlush || payload.status.lastFlush || null;
    }

    return payload;
}

function isNetworkMonitorActive() {
    if (networkMonitorInjected) {
        return true;
    }

    try {
        return !!(document.documentElement && document.documentElement.getAttribute(NETWORK_MONITOR_STATE_ATTRIBUTE) === '1');
    } catch (error) {
        return false;
    }
}

function syncSoundCloudDirectHookStateFromDom() {
    if (!isSoundCloudPage()) {
        return;
    }

    try {
        if (document.documentElement && document.documentElement.getAttribute(SOUND_CLOUD_DIRECT_HOOK_READY_ATTRIBUTE) === '1') {
            soundCloudDirectHookReady = true;
        }
    } catch (error) {
    }
}

function handleIncomingNetworkPayload(payload) {
    if (SOUND_CLOUD_INSIGHTS_CAPTURE_ENABLED && isSoundCloudPage() && payload.soundcloud_capture) {
        if (payload.soundcloud_capture.meta && typeof payload.soundcloud_capture.meta === 'object') {
            soundCloudDirectHookReady = true;
            soundCloudDirectHookMeta = payload.soundcloud_capture.meta;
        }
        const bridge = getSoundCloudPageBridge();
        if (bridge) {
            bridge.handleNetworkEventPayload(payload);
        }
    }

    if (isFacebookPage() && Array.isArray(payload.detected_comment_entries) && payload.detected_comment_entries.length) {
        rememberFacebookCommentEntries(payload.detected_comment_entries);
        if (panel && activeComposer && document.contains(activeComposer) && !markedElements.length) {
            const contextField = panel.querySelector('#sgpt-context');
            if (contextField) {
                contextField.value = getCurrentPanelContextValue();
            }
            updatePanelAnchorNote();
        }
    }

    if (!isFacebookAdminActivitiesPage()) {
        return;
    }

    if (!adminFeatureEnabled) {
        return;
    }

    ensureAdminActivitiesControl();
    const networkEntry = rememberAdminNetworkEvent(payload);
    mirrorAdminNetworkEventToConsole(networkEntry);
    let addedFromPayload = 0;
    if (adminIngestEnabled && networkEntry.detected_entries && networkEntry.detected_entries.length) {
        addedFromPayload = rememberDetectedAdminEntries(networkEntry.detected_entries, payload && payload.bootstrap_debug ? 'injected-bootstrap-scan' : 'network-event');
    }

    if (networkEntry.detected_entries && networkEntry.detected_entries.length) {
        mirrorAdminDetectionsToConsole(networkEntry.detected_entries, networkEntry);
    }

    if (payload && payload.bootstrap_debug) {
        latestInjectedBootstrapAdminScanDebug = Object.assign({}, payload.bootstrap_debug, {
            pending_added: addedFromPayload,
        });

        if (adminDebugEnabled) {
            debugLog({
                level: 'info',
                category: 'facebook-admin-bootstrap-monitor',
                message: 'Injected monitor bootstrap scan completed.',
                meta: latestInjectedBootstrapAdminScanDebug,
            });
        }
    }

    if (!adminNetworkDebugAnnounced) {
        adminNetworkDebugAnnounced = true;
        if (adminDebugEnabled) {
            debugLog({
                level: 'info',
                category: 'facebook-network-status',
                message: 'Facebook in-page monitor is receiving network events.',
                meta: {
                    url: location.href,
                    first_event: networkEntry.summary,
                }
            });
        }
    }

    if (networkEntry.interesting && adminDebugEnabled) {
        debugLog({
            level: 'info',
            category: 'facebook-network',
            message: 'Interesting Facebook XHR/fetch event captured.',
            meta: {
                url: location.href,
                transport: networkEntry.transport,
                method: networkEntry.method,
                status: networkEntry.status,
                duration_ms: networkEntry.duration_ms,
                pathname: networkEntry.pathname,
                doc_id: networkEntry.doc_id,
                friendly_name: networkEntry.friendly_name,
                request_preview: networkEntry.request_preview,
                response_preview: networkEntry.response_preview,
            }
        });
    }

    adminLastStatusText = adminIngestEnabled
        ? (networkEntry.detected_count
            ? 'Detected ' + networkEntry.detected_count + ' admin activity entr' + (networkEntry.detected_count === 1 ? 'y' : 'ies') + '. Bulk upload to Tools is queued.'
            : (networkEntry.interesting
                ? 'Activity statistics are enabled. Waiting for matching admin-log traffic.'
                : 'Activity statistics are enabled. Waiting for matching admin-log traffic.'))
        : (networkEntry.detected_count
            ? 'Observed ' + networkEntry.detected_count + ' admin activity entr' + (networkEntry.detected_count === 1 ? 'y' : 'ies') + '. Statistics are disabled, so nothing was queued.'
            : (networkEntry.interesting
                ? 'Interesting activity detected, but statistics are disabled for this URI.'
                : 'Statistics are disabled for this exact Facebook URI. Enable them only when you want to collect from this page.'));
    updateAdminActivitiesControl();
    if (adminIngestEnabled && networkEntry.interesting) {
        scheduleAdminActivitiesScan('network-event');
    }
}

function handleSoundCloudDirectCapture(detail) {
    if (!detail || typeof detail !== 'object' || !detail.opName) {
        return;
    }

    soundCloudDirectHookMeta = detail.meta && typeof detail.meta === 'object' ? detail.meta : null;
    handleIncomingNetworkPayload({
        soundcloud_capture: {
            opName: detail.opName,
            variables: detail.variables && typeof detail.variables === 'object' ? detail.variables : {},
            data: detail.data && typeof detail.data === 'object' ? detail.data : {},
            meta: detail.meta && typeof detail.meta === 'object' ? detail.meta : {},
        }
    });
}

function drainBufferedSoundCloudDirectCaptures() {
    if (!isSoundCloudPage()) {
        return;
    }

    const bufferNode = document.getElementById(SOUND_CLOUD_DIRECT_BUFFER_ELEMENT_ID);
    if (!bufferNode) {
        return;
    }

    let queuedCaptures = [];
    try {
        const parsed = JSON.parse(bufferNode.textContent || '[]');
        queuedCaptures = Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        queuedCaptures = [];
    }

    bufferNode.textContent = '[]';

    queuedCaptures.forEach(function (detail) {
        handleSoundCloudDirectCapture(detail);
    });
}

function drainBufferedSoundCloudNetworkEvents() {
    if (!isSoundCloudPage()) {
        return;
    }

    const bufferNode = document.getElementById(SOUNDCLOUD_BUFFER_ELEMENT_ID);
    if (!bufferNode) {
        return;
    }

    let bufferedPayloads = [];
    try {
        const parsed = JSON.parse(bufferNode.textContent || '[]');
        bufferedPayloads = Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        bufferedPayloads = [];
    }

    bufferNode.textContent = '[]';

    bufferedPayloads.forEach(function (payload) {
        if (payload && typeof payload === 'object') {
            handleIncomingNetworkPayload(payload);
        }
    });
}

function reportSoundCloudPageStatus() {
    const bridge = getSoundCloudPageBridge();
    if (bridge) {
        bridge.reportPageStatus();
    }

    updateSoundCloudInsightsControl();
}

function formatSoundCloudIngestResult(ingest) {
    if (!ingest) {
        return 'No ingest attempt recorded yet.';
    }
    if (typeof ingest.flushed_count === 'number') {
        return 'Buffered flush '
            + (ingest.ok ? 'OK' : 'partial')
            + ' · Flushed: ' + ingest.flushed_count
            + ' · Duplicates: ' + (ingest.duplicate_count || 0)
            + ' · Remaining: ' + (ingest.remaining_count || 0)
            + (ingest.failed_count ? ' · Failed: ' + ingest.failed_count : '');
    }
    if (ingest.attempted === false) {
        if (ingest.reason === 'empty_normalized_rows') {
            return 'Ingest not attempted: the captured SoundCloud dataset did not contain any normalized insight rows yet.';
        }
        if (ingest.reason === 'unsupported_operation') {
            return 'Ingest not attempted: this SoundCloud GraphQL operation is not one of the supported insights datasets yet.';
        }
        if (ingest.reason === 'already_buffered') {
            return 'Capture already buffered. Waiting for auto-ingest to flush it.';
        }
        if (ingest.reason === 'already_ingested') {
            return 'Duplicate capture ignored because this snapshot was already ingested.';
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

function syncSoundCloudRuntimePreference() {
    safeStorageSyncGet(['toolsApiToken', 'soundcloudAutoIngestEnabled'], function (data) {
        soundCloudToolsTokenConfigured = !!(data && data.toolsApiToken && String(data.toolsApiToken).trim());
        soundCloudAutoIngestEnabled = !!(data && data.soundcloudAutoIngestEnabled === true && (!isSupportedSoundCloudInsightsPage() || soundCloudAutoIngestTouchedThisVisit));
        updateSoundCloudInsightsControl();
    });
}

function isSupportedSoundCloudInsightsUrl(value) {
    if (!value) {
        return false;
    }

    const platform = getSoundCloudPlatformDefinition();
    if (!platform || typeof platform.isSupportedPage !== 'function') {
        return false;
    }

    try {
        return !!platform.isSupportedPage(new URL(String(value), location.origin));
    } catch (error) {
        return false;
    }
}

function resetSoundCloudAutoIngestOnInsightsEntry(previousHref, reason) {
    if (!isSoundCloudPage() || !isSupportedSoundCloudInsightsPage()) {
        return;
    }

    const enteringSupportedInsights = reason === 'init' || !isSupportedSoundCloudInsightsUrl(previousHref);
    if (!enteringSupportedInsights) {
        return;
    }

    soundCloudAutoIngestTouchedThisVisit = false;
    soundCloudAutoIngestEnabled = false;
    safeStorageSyncGet(['soundcloudAutoIngestEnabled'], function (data) {
        if (data && data.soundcloudAutoIngestEnabled === true) {
            safeStorageSyncSet({soundcloudAutoIngestEnabled: false}, function () {
                updateSoundCloudInsightsControl();
                reportSoundCloudPageStatus();
            });
            return;
        }

        updateSoundCloudInsightsControl();
        reportSoundCloudPageStatus();
    });
}

function setSoundCloudAutoIngestEnabled(nextValue) {
    const enabled = !!nextValue;
    soundCloudAutoIngestTouchedThisVisit = true;
    soundCloudAutoIngestEnabled = enabled;
    safeStorageSyncSet({soundcloudAutoIngestEnabled: enabled}, function () {
        updateSoundCloudInsightsControl();
        reportSoundCloudPageStatus();
    });
}

function loadSoundCloudPanelPosition(control) {
    if (!control || typeof window.localStorage === 'undefined') {
        return;
    }

    try {
        const raw = window.localStorage.getItem(SOUND_CLOUD_PANEL_POSITION_STORAGE_KEY);
        if (!raw) {
            return;
        }

        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.top === 'number' && typeof parsed.left === 'number') {
            control.style.top = parsed.top + 'px';
            control.style.left = parsed.left + 'px';
            control.style.right = 'auto';
        }
    } catch (error) {
    }
}

function saveSoundCloudPanelPosition(control) {
    if (!control || typeof window.localStorage === 'undefined') {
        return;
    }

    try {
        const rect = control.getBoundingClientRect();
        window.localStorage.setItem(SOUND_CLOUD_PANEL_POSITION_STORAGE_KEY, JSON.stringify({
            top: Math.max(8, Math.round(rect.top)),
            left: Math.max(8, Math.round(rect.left)),
        }));
    } catch (error) {
    }
}

function clampSoundCloudPanelPosition(control) {
    if (!control) {
        return;
    }

    const rect = control.getBoundingClientRect();
    const maxLeft = Math.max(8, window.innerWidth - rect.width - 8);
    const maxTop = Math.max(8, window.innerHeight - rect.height - 8);
    const nextLeft = Math.min(Math.max(8, rect.left), maxLeft);
    const nextTop = Math.min(Math.max(8, rect.top), maxTop);

    control.style.left = nextLeft + 'px';
    control.style.top = nextTop + 'px';
    control.style.right = 'auto';
}

function enableSoundCloudInsightsControlDragging(control) {
    if (!control || control.dataset.dragReady === 'true') {
        return;
    }

    const handle = control.querySelector('[data-role="drag-handle"]');
    if (!handle) {
        return;
    }

    control.dataset.dragReady = 'true';
    loadSoundCloudPanelPosition(control);
    clampSoundCloudPanelPosition(control);

    handle.addEventListener('mousedown', function (event) {
        if (event.button !== 0 || event.target.closest('button')) {
            return;
        }

        const rect = control.getBoundingClientRect();
        soundCloudInsightsControlDragState = {
            offsetX: event.clientX - rect.left,
            offsetY: event.clientY - rect.top,
        };

        event.preventDefault();
    });

    if (soundCloudInsightsDragListenersBound) {
        return;
    }

    soundCloudInsightsDragListenersBound = true;

    window.addEventListener('mousemove', function (event) {
        if (!soundCloudInsightsControlDragState || !soundCloudInsightsControl) {
            return;
        }

        soundCloudInsightsControl.style.left = Math.max(8, event.clientX - soundCloudInsightsControlDragState.offsetX) + 'px';
        soundCloudInsightsControl.style.top = Math.max(8, event.clientY - soundCloudInsightsControlDragState.offsetY) + 'px';
        soundCloudInsightsControl.style.right = 'auto';
        clampSoundCloudPanelPosition(soundCloudInsightsControl);
    });

    window.addEventListener('mouseup', function () {
        if (!soundCloudInsightsControlDragState || !soundCloudInsightsControl) {
            soundCloudInsightsControlDragState = null;
            return;
        }

        clampSoundCloudPanelPosition(soundCloudInsightsControl);
        saveSoundCloudPanelPosition(soundCloudInsightsControl);
        soundCloudInsightsControlDragState = null;
    });

    window.addEventListener('resize', function () {
        if (!soundCloudInsightsControl) {
            return;
        }

        clampSoundCloudPanelPosition(soundCloudInsightsControl);
        saveSoundCloudPanelPosition(soundCloudInsightsControl);
    });
}

function updateSoundCloudInsightsControl() {
    if (!SOUND_CLOUD_INSIGHTS_CAPTURE_ENABLED) {
        if (soundCloudInsightsControl) {
            soundCloudInsightsControl.remove();
            soundCloudInsightsControl = null;
        }
        return;
    }

    if (!soundCloudInsightsControl) {
        return;
    }

    const statusPayload = buildSoundCloudPageStatusPayload().status || {};
    const state = soundCloudInsightsControl.querySelector('[data-role="state"]');
    const counters = soundCloudInsightsControl.querySelector('[data-role="counters"]');
    const capture = soundCloudInsightsControl.querySelector('[data-role="capture"]');
    const ingest = soundCloudInsightsControl.querySelector('[data-role="ingest"]');
    const helper = soundCloudInsightsControl.querySelector('[data-role="helper"]');
    const debug = soundCloudInsightsControl.querySelector('[data-role="debug"]');
    const toggleButton = soundCloudInsightsControl.querySelector('[data-role="toggle-auto-ingest"]');
    const monitorActive = !!statusPayload.networkMonitorInjected;
    const lastCapture = statusPayload.lastCapture || null;
    const lastHookMeta = statusPayload.lastHookMeta || soundCloudDirectHookMeta || null;
    const latestSendState = statusPayload.lastFlush || statusPayload.lastIngest || null;

    if (state) {
        state.textContent = statusPayload.stateText || 'SoundCloud insights capture is idle.';
        state.style.color = monitorActive ? '#065f46' : '#92400e';
    }

    if (counters) {
        counters.textContent = 'Monitor: ' + (monitorActive ? 'injected' : 'waiting')
            + ' · Captures: ' + (statusPayload.captureCount || 0)
            + ' · Buffered: ' + (statusPayload.pendingCaptureCount || 0)
            + ' · Auto-ingest: ' + (soundCloudAutoIngestEnabled ? 'enabled' : 'disabled')
            + ' · Token: ' + (soundCloudToolsTokenConfigured ? 'configured' : 'missing');
    }

    if (capture) {
        capture.innerHTML = lastCapture
            ? ('<div style="font-weight:600; color:#0f172a;">'
                + escapeHtml((lastCapture.datasetKey || 'raw') + ' · ' + (lastCapture.opName || 'Unknown operation'))
                + '</div>'
                + '<div style="margin-top:4px; color:#475569;">Rows: ' + escapeHtml(String(lastCapture.rowCount || 0))
                + (lastCapture.totalMetric !== null && typeof lastCapture.totalMetric !== 'undefined' ? ' · Total metric: ' + escapeHtml(String(lastCapture.totalMetric)) : '')
                + '</div>'
                + '<div style="margin-top:4px; color:#64748b;">Captured: ' + escapeHtml(lastCapture.capturedAt || 'Unknown time') + '</div>')
            : '<div style="color:#64748b;">No supported SoundCloud captures detected yet. Open insights panels that trigger GraphQL requests.</div>';
    }

    if (ingest) {
        ingest.textContent = formatSoundCloudIngestResult(latestSendState);
        ingest.style.color = latestSendState && latestSendState.ok
            ? '#065f46'
            : (latestSendState && latestSendState.attempted ? '#b91c1c' : '#475569');
    }

    if (helper) {
        helper.textContent = soundCloudAutoIngestEnabled
            ? ((statusPayload.pendingCaptureCount || 0)
                ? 'Auto-ingest is on. Buffered captures will flush into Tools as soon as the extension can send them.'
                : 'New supported captures from this browser are pushed to Tools automatically.')
            : ((statusPayload.pendingCaptureCount || 0)
                ? 'Auto-ingest is off, but supported captures are being buffered here and can be flushed later without losing them.'
                : 'Auto-ingest is off. Turn it on here when you want supported captures from this browser sent to Tools.');
    }

    if (debug) {
        debug.innerHTML = '<div><strong>Hook:</strong> ' + escapeHtml(statusPayload.hookReady ? 'ready' : 'waiting') + '</div>'
            + '<div><strong>Page:</strong> ' + escapeHtml(isSupportedSoundCloudInsightsPage() ? 'supported' : 'unsupported') + '</div>'
            + '<div><strong>Buffered:</strong> ' + escapeHtml(String(statusPayload.pendingCaptureCount || 0)) + '</div>'
            + '<div><strong>Last op:</strong> ' + escapeHtml(lastCapture && lastCapture.opName ? lastCapture.opName : 'none yet') + '</div>'
            + '<div><strong>Via:</strong> ' + escapeHtml(lastHookMeta && lastHookMeta.via ? lastHookMeta.via : 'n/a') + '</div>'
            + '<div><strong>Host:</strong> ' + escapeHtml(lastHookMeta && lastHookMeta.host ? lastHookMeta.host : location.hostname) + '</div>'
            + '<div><strong>Request:</strong> ' + escapeHtml(lastHookMeta && lastHookMeta.request_url ? lastHookMeta.request_url : 'n/a') + '</div>';
    }

    if (toggleButton) {
        toggleButton.textContent = soundCloudAutoIngestEnabled ? 'Disable auto-ingest' : 'Enable auto-ingest';
        toggleButton.style.background = soundCloudAutoIngestEnabled ? '#b91c1c' : '#0f766e';
    }
}

function ensureSoundCloudInsightsControl() {
    if (!SOUND_CLOUD_INSIGHTS_CAPTURE_ENABLED) {
        if (soundCloudInsightsControl) {
            soundCloudInsightsControl.remove();
            soundCloudInsightsControl = null;
        }
        return null;
    }

    if (!isSupportedSoundCloudInsightsPage()) {
        if (soundCloudInsightsControl) {
            soundCloudInsightsControl.remove();
            soundCloudInsightsControl = null;
        }
        return null;
    }

    if (soundCloudInsightsControl) {
        updateSoundCloudInsightsControl();
        return soundCloudInsightsControl;
    }

    const control = document.createElement('div');
    control.id = 'sgpt-soundcloud-insights-control';
    control.style.position = 'fixed';
    control.style.top = '96px';
    control.style.right = '16px';
    control.style.zIndex = '2147483645';
    control.style.width = '340px';
    control.style.padding = '10px';
    control.style.borderRadius = '10px';
    control.style.border = '1px solid rgba(0,0,0,0.12)';
    control.style.background = 'rgba(255,255,255,0.96)';
    control.style.boxShadow = '0 6px 18px rgba(0,0,0,0.15)';
    control.style.fontFamily = 'system-ui,sans-serif';
    control.style.fontSize = '12px';
    control.style.color = '#0f172a';
    control.innerHTML = [
        '<div data-role="drag-handle" style="display:flex; justify-content:space-between; gap:8px; align-items:center; margin-bottom:6px; cursor:move; user-select:none;">',
        '<div style="font-weight:700;">SoundCloud insights capture</div>',
        '<div style="font-size:11px; color:#64748b;">drag</div>',
        '</div>',
        '<div data-role="state" style="margin-bottom:8px; color:#334155; font-weight:600;">Supported SoundCloud insights page detected. Waiting for GraphQL traffic...</div>',
        '<div data-role="counters" style="margin-bottom:8px; color:#475569;">Monitor: waiting · Captures: 0 · Auto-ingest: disabled · Token: missing</div>',
        '<div style="margin-bottom:8px;">',
        '<button type="button" data-role="toggle-auto-ingest" style="appearance:none; border:none; border-radius:999px; background:#0f766e; color:#fff; padding:7px 12px; font-size:11px; font-weight:700; cursor:pointer;">Enable auto-ingest</button>',
        '</div>',
        '<div style="margin-top:8px; font-weight:600; color:#334155;">Debug</div>',
        '<div data-role="debug" style="margin-top:4px; font-size:11px; line-height:1.35; color:#475569; max-height:110px; overflow:auto;">Hook: waiting</div>',
        '<div style="margin-top:10px; font-weight:600; color:#334155;">Latest capture</div>',
        '<div data-role="capture" style="margin-top:4px; font-size:11px; line-height:1.35; color:#475569; max-height:120px; overflow:auto;">No supported SoundCloud captures detected yet.</div>',
        '<div style="margin-top:10px; font-weight:600; color:#334155;">Latest ingest result</div>',
        '<div data-role="ingest" style="margin-top:4px; font-size:11px; line-height:1.35; color:#475569;">No ingest attempt recorded yet.</div>',
        '<div data-role="helper" style="margin-top:10px; font-size:11px; line-height:1.35; color:#64748b;">Auto-ingest is off. Turn it on here when you want supported captures from this browser sent to Tools.</div>'
    ].join('');

    document.body.appendChild(control);
    soundCloudInsightsControl = control;
    const toggleButton = control.querySelector('[data-role="toggle-auto-ingest"]');
    if (toggleButton) {
        toggleButton.addEventListener('click', function () {
            setSoundCloudAutoIngestEnabled(!soundCloudAutoIngestEnabled);
        });
    }
    enableSoundCloudInsightsControlDragging(control);
    updateSoundCloudInsightsControl();

    return control;
}

function clipText(value, limit) {
    const text = String(value || '');
    if (text.length <= limit) {
        return text;
    }

    return text.slice(0, Math.max(0, limit - 1)) + '…';
}

function escapeHtml(value) {
    return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function buildFacebookCommentSignature(authorName, bodyText) {
    return [normalizeWhitespace(authorName).toLowerCase(), normalizeWhitespace(bodyText).toLowerCase()].join('|');
}

function normalizeDetectedFacebookCommentEntry(entry) {
    if (!entry) {
        return null;
    }

    const authorName = normalizeWhitespace(entry.author_name || '');
    const bodyText = normalizeWhitespace(entry.body_text || '');
    if (!authorName || !bodyText) {
        return null;
    }

    return {
        key: entry.key || [entry.batch_id || '', entry.comment_id || '', authorName, bodyText].join('|'),
        batch_id: entry.batch_id || '',
        comment_id: entry.comment_id || null,
        parent_comment_id: entry.parent_comment_id || null,
        author_name: authorName,
        body_text: bodyText,
        signature: buildFacebookCommentSignature(authorName, bodyText),
        source_url: entry.source_url || location.href,
    };
}

function rememberFacebookCommentEntries(entries) {
    if (!Array.isArray(entries) || !entries.length) {
        return 0;
    }

    let added = 0;
    entries.forEach(function (entry) {
        const normalized = normalizeDetectedFacebookCommentEntry(entry);
        if (!normalized || facebookCommentEntryKeys.has(normalized.key)) {
            return;
        }

        facebookCommentEntryKeys.add(normalized.key);
        recentFacebookCommentEntries.unshift(normalized);
        added += 1;
    });

    if (recentFacebookCommentEntries.length > MAX_RECENT_FACEBOOK_COMMENT_ENTRIES) {
        const removed = recentFacebookCommentEntries.splice(MAX_RECENT_FACEBOOK_COMMENT_ENTRIES);
        removed.forEach(function (entry) {
            facebookCommentEntryKeys.delete(entry.key);
        });
    }

    return added;
}

function isInterestingAdminNetworkEvent(payload) {
    if (!payload) {
        return false;
    }

    const haystack = [
        payload.url,
        payload.pathname,
        payload.friendly_name,
        payload.operation_name,
        payload.doc_id,
        payload.request_preview,
        payload.response_preview,
        payload.variables_preview,
        payload.content_type,
    ].join(' ').toLowerCase();

    return !!payload.is_graphql
        || !!payload.mentions_activity_log
        || haystack.indexOf('admin_activities') !== -1
        || haystack.indexOf('management_activities') !== -1
        || haystack.indexOf('management_activity_log_target') !== -1
        || haystack.indexOf('groupadminactivity') !== -1
        || haystack.indexOf('activity log') !== -1
        || haystack.indexOf('moderation') !== -1;
}

function summarizeAdminNetworkEvent(entry) {
    const parts = [String((entry.transport || '?')).toUpperCase()];
    if (typeof entry.status !== 'undefined' && entry.status !== null) {
        parts.push(String(entry.status));
    }
    if (entry.is_graphql) {
        parts.push('GraphQL');
    }
    if (entry.friendly_name) {
        parts.push(entry.friendly_name);
    } else if (entry.doc_id) {
        parts.push('doc_id=' + entry.doc_id);
    } else if (entry.pathname) {
        parts.push(entry.pathname);
    }
    if (entry.duration_ms) {
        parts.push(entry.duration_ms + ' ms');
    }

    return parts.join(' · ');
}

function mirrorAdminNetworkEventToConsole(entry) {
    if (!entry || !adminDebugEnabled || typeof console === 'undefined' || !console.info) {
        return;
    }

    console.info('[TN Social Tools][admin-activities]', {
        summary: entry.summary,
        interesting: entry.interesting,
        transport: entry.transport,
        method: entry.method,
        status: entry.status,
        duration_ms: entry.duration_ms,
        pathname: entry.pathname,
        url: entry.url,
        doc_id: entry.doc_id,
        friendly_name: entry.friendly_name,
        request_preview: entry.request_preview,
        response_preview: entry.response_preview,
    });
}

function rememberAdminNetworkEvent(payload) {
    const detectedEntries = payload && Array.isArray(payload.detected_entries) ? payload.detected_entries : [];
    const entry = {
        ts: new Date().toISOString(),
        transport: payload && payload.transport ? payload.transport : 'unknown',
        method: payload && payload.method ? String(payload.method).toUpperCase() : 'GET',
        status: payload && typeof payload.status !== 'undefined' ? payload.status : 0,
        duration_ms: payload && payload.duration_ms ? payload.duration_ms : null,
        pathname: payload && payload.pathname ? payload.pathname : '',
        url: payload && payload.url ? payload.url : '',
        doc_id: payload && payload.doc_id ? payload.doc_id : '',
        friendly_name: payload && (payload.friendly_name || payload.operation_name) ? (payload.friendly_name || payload.operation_name) : '',
        is_graphql: !!(payload && payload.is_graphql),
        mentions_activity_log: !!(payload && payload.mentions_activity_log),
        request_preview: clipText(payload && payload.request_preview ? payload.request_preview : '', 240),
        response_preview: clipText(payload && payload.response_preview ? payload.response_preview : '', 240),
        detected_count: payload && typeof payload.detected_count === 'number' ? payload.detected_count : detectedEntries.length,
        detected_entries: detectedEntries,
        detected_preview: detectedEntries.slice(0, 3).map(function (detectedEntry) {
            return clipText(detectedEntry && detectedEntry.action_text ? detectedEntry.action_text : '', 120);
        }),
    };

    entry.interesting = isInterestingAdminNetworkEvent(payload);
    entry.summary = summarizeAdminNetworkEvent(entry);

    adminNetworkEventsSeen += 1;
    adminLastNetworkEventAt = Date.now();
    if (entry.interesting) {
        adminInterestingNetworkEventsSeen += 1;
    }

    recentAdminNetworkEvents.unshift(entry);
    if (recentAdminNetworkEvents.length > MAX_RECENT_NETWORK_EVENTS) {
        recentAdminNetworkEvents.length = MAX_RECENT_NETWORK_EVENTS;
    }

    return entry;
}

function getToolsBaseUrl(devMode) {
    return devMode ? TOOLS_DEV_BASE_URL : TOOLS_PROD_BASE_URL;
}

function loadAdminPanelPosition(control) {
    if (!control || typeof window.localStorage === 'undefined') {
        return;
    }

    try {
        const raw = window.localStorage.getItem(ADMIN_PANEL_POSITION_STORAGE_KEY);
        if (!raw) {
            return;
        }

        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.top === 'number' && typeof parsed.left === 'number') {
            control.style.top = parsed.top + 'px';
            control.style.left = parsed.left + 'px';
            control.style.right = 'auto';
        }
    } catch (error) {
    }
}

function saveAdminPanelPosition(control) {
    if (!control || typeof window.localStorage === 'undefined') {
        return;
    }

    try {
        const rect = control.getBoundingClientRect();
        window.localStorage.setItem(ADMIN_PANEL_POSITION_STORAGE_KEY, JSON.stringify({
            top: Math.max(8, Math.round(rect.top)),
            left: Math.max(8, Math.round(rect.left)),
        }));
    } catch (error) {
    }
}

function clampAdminPanelPosition(control) {
    if (!control) {
        return;
    }

    const rect = control.getBoundingClientRect();
    const maxLeft = Math.max(8, window.innerWidth - rect.width - 8);
    const maxTop = Math.max(8, window.innerHeight - rect.height - 8);
    const nextLeft = Math.min(Math.max(8, rect.left), maxLeft);
    const nextTop = Math.min(Math.max(8, rect.top), maxTop);

    control.style.left = nextLeft + 'px';
    control.style.top = nextTop + 'px';
    control.style.right = 'auto';
}

function enableAdminActivitiesControlDragging(control) {
    if (!control || control.dataset.dragReady === 'true') {
        return;
    }

    const handle = control.querySelector('[data-role="drag-handle"]');
    if (!handle) {
        return;
    }

    control.dataset.dragReady = 'true';
    loadAdminPanelPosition(control);
    clampAdminPanelPosition(control);

    handle.addEventListener('mousedown', function (event) {
        if (event.button !== 0 || event.target.closest('button')) {
            return;
        }

        const rect = control.getBoundingClientRect();
        adminActivitiesControlDragState = {
            offsetX: event.clientX - rect.left,
            offsetY: event.clientY - rect.top,
        };

        event.preventDefault();
    });

    if (adminActivitiesDragListenersBound) {
        return;
    }

    adminActivitiesDragListenersBound = true;

    window.addEventListener('mousemove', function (event) {
        if (!adminActivitiesControlDragState || !adminActivitiesControl) {
            return;
        }

        adminActivitiesControl.style.left = Math.max(8, event.clientX - adminActivitiesControlDragState.offsetX) + 'px';
        adminActivitiesControl.style.top = Math.max(8, event.clientY - adminActivitiesControlDragState.offsetY) + 'px';
        adminActivitiesControl.style.right = 'auto';
        clampAdminPanelPosition(adminActivitiesControl);
    });

    window.addEventListener('mouseup', function () {
        if (!adminActivitiesControlDragState || !adminActivitiesControl) {
            adminActivitiesControlDragState = null;
            return;
        }

        clampAdminPanelPosition(adminActivitiesControl);
        saveAdminPanelPosition(adminActivitiesControl);
        adminActivitiesControlDragState = null;
    });

    window.addEventListener('resize', function () {
        if (!adminActivitiesControl) {
            return;
        }

        clampAdminPanelPosition(adminActivitiesControl);
        saveAdminPanelPosition(adminActivitiesControl);
    });
}

function mirrorAdminDetectionsToConsole(entries, networkEntry) {
    if (!adminDebugEnabled || typeof console === 'undefined' || !console.info || !entries || !entries.length) {
        return;
    }

    console.info('[TN Social Tools][admin-activities][detections]', {
        count: entries.length,
        summary: networkEntry && networkEntry.summary ? networkEntry.summary : '',
        entries: entries.slice(0, 10).map(function (entry) {
            return {
                actor_name: entry.actor_name,
                target_name: entry.target_name,
                handled_outcome: entry.handled_outcome,
                action_text: entry.action_text,
            };
        }),
    });
}

function getToolsRuntimeSettings() {
    return new Promise(function (resolve) {
        safeStorageSyncGet(['toolsApiToken', 'devMode', 'soundcloudAutoIngestEnabled', 'facebookAdminStatsEnabled'], function (data) {
            if (data && data.toolsApiToken) {
                resolve(data || {});
                return;
            }

            safeSendRuntimeMessageWithResponse({type: 'GET_TOOLS_RUNTIME_SETTINGS'}).then(function (response) {
                if (response && response.ok && response.settings) {
                    resolve(response.settings || {});
                    return;
                }

                resolve(data || {});
            });
        });
    });
}

function isFacebookAdminActivitiesPage() {
    return location.hostname.indexOf('facebook.com') !== -1
        && /\/groups\/[^/]+\/admin_activities/.test(location.pathname || '');
}

// ---------------------------------------------
// LOADER HANDLING
// ---------------------------------------------
function injectLoader() {
    if (!document.getElementById("socialgpt-loader")) {
        const loader = document.createElement("div");
        loader.id = "socialgpt-loader";
        loader.style.position = "fixed";
        loader.style.bottom = "24px";
        loader.style.right = "24px";
        loader.style.left = "auto";
        loader.style.width = "36px";
        loader.style.height = "36px";
        loader.style.border = "4px solid rgba(148, 163, 184, 0.28)";
        loader.style.borderTop = "4px solid #008CBA";
        loader.style.borderRadius = "50%";
        loader.style.animation = "spin 1s linear infinite";
        loader.style.display = "none";
        loader.style.zIndex = "999999";
        loader.style.background = "rgba(255,255,255,0.96)";
        loader.style.boxShadow = "0 8px 24px rgba(15,23,42,0.18)";
        document.body.appendChild(loader);

        const style = document.createElement("style");
        style.textContent = `
        #socialgpt-loader {
            position: fixed;
            bottom: 24px;
            right: 24px;
            left: auto;
            width: 36px;
            height: 36px;
            border: 4px solid rgba(148, 163, 184, 0.28);
            border-top: 4px solid #008CBA;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            display: none;
            z-index: 9999;
            background: rgba(255,255,255,0.96);
            box-shadow: 0 8px 24px rgba(15,23,42,0.18);
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }`;
        document.head.appendChild(style);
    }
}

function cloneAnchorRect(rect) {
    if (!rect) {
        return null;
    }

    return {
        left: Math.round(rect.left),
        top: Math.round(rect.top),
        right: Math.round(rect.right),
        bottom: Math.round(rect.bottom),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
    };
}

function resolveFactAnchorRect(anchor) {
    if (!anchor) {
        return null;
    }

    if (anchor.targetNode && document.contains(anchor.targetNode) && anchor.targetNode.getBoundingClientRect) {
        const liveRect = anchor.targetNode.getBoundingClientRect();
        if (liveRect && liveRect.width >= 0 && liveRect.height >= 0) {
            return cloneAnchorRect(liveRect);
        }
    }

    return anchor.rect ? cloneAnchorRect(anchor.rect) : null;
}

function positionFactResultBox() {
    if (!factResultBox || !document.contains(factResultBox)) {
        factResultBox = null;
        factResultAnchor = null;
        return;
    }

    const rect = resolveFactAnchorRect(factResultAnchor);
    const minMargin = 12;
    const boxWidth = Math.min(420, Math.max(320, Math.round(window.innerWidth * 0.32)));
    factResultBox.style.width = boxWidth + 'px';
    factResultBox.style.maxWidth = 'min(420px, calc(100vw - 24px))';
    factResultBox.style.maxHeight = '60vh';

    if (factResultBoxManualPosition) {
        const clamped = clampFixedPosition(factResultBoxManualPosition.left, factResultBoxManualPosition.top, factResultBox, 12);
        factResultBox.style.left = Math.round(clamped.left) + 'px';
        factResultBox.style.top = Math.round(clamped.top) + 'px';
        factResultBox.style.right = 'auto';
        factResultBox.style.bottom = 'auto';
        factResultBoxManualPosition = {
            left: Math.round(clamped.left),
            top: Math.round(clamped.top),
        };
        return;
    }

    if (!rect) {
        factResultBox.style.right = '20px';
        factResultBox.style.bottom = '20px';
        factResultBox.style.left = 'auto';
        factResultBox.style.top = 'auto';
        return;
    }

    const measuredHeight = Math.min(factResultBox.offsetHeight || 280, Math.max(180, window.innerHeight - (minMargin * 2)));
    let left = rect.right + 12;
    if (left + boxWidth > window.innerWidth - minMargin) {
        left = rect.left - boxWidth - 12;
    }
    if (left < minMargin) {
        left = Math.max(minMargin, Math.min(rect.left, window.innerWidth - boxWidth - minMargin));
    }

    let top = rect.top;
    const maxTop = Math.max(minMargin, window.innerHeight - measuredHeight - minMargin);
    if (top > maxTop) {
        top = maxTop;
    }
    if (top < minMargin) {
        top = minMargin;
    }

    factResultBox.style.left = Math.round(left) + 'px';
    factResultBox.style.top = Math.round(top) + 'px';
    factResultBox.style.right = 'auto';
    factResultBox.style.bottom = 'auto';
}

function clearCurrentSelection() {
    const selection = window.getSelection ? window.getSelection() : null;
    if (!selection) {
        return;
    }

    try {
        selection.removeAllRanges();
    } catch (error) {
    }
}

function buildFactBoxSubtitle(anchor, responseLanguage, isError) {
    const parts = [anchor
        ? ct('contentScript.factAnchoredSelected', {}, 'Anchored to the selected content.')
        : ct('contentScript.factVerificationResult', {}, 'Verification result')];
    if (responseLanguage) {
        parts.push(ct('contentScript.factLanguage', {}, 'Language') + ': ' + getResponseLanguageLabel(responseLanguage));
    }
    if (isError) {
        parts.push(ct('contentScript.factRetry', {}, 'You can retry below.'));
    }
    return parts.join(' · ');
}

function buildFactBoxActions() {
    if (!lastVerificationRequest || !lastVerificationRequest.context) {
        return [];
    }

    return [
        {
            label: ct('contentScript.factRefresh', {}, 'Refresh'),
            title: ct('contentScript.factRefreshTitle', {}, 'Run the same fact-check again.'),
            background: '#e2e8f0',
            color: '#0f172a',
            onClick: function () {
                startFactVerification(lastVerificationRequest.context, {
                    anchor: lastVerificationRequest.anchor,
                    model: lastVerificationRequest.model,
                    responseLanguage: lastVerificationRequest.responseLanguage,
                    sourceLabel: lastVerificationRequest.sourceLabel || 'Fact verification',
                    keepMarks: true,
                    keepPosition: true,
                });
            },
        },
        {
            label: ct('contentScript.factDigDeeper', {}, 'Dig deeper'),
            title: ct('contentScript.factDigDeeperTitle', {}, 'Retry with a deeper pass that looks for broader context and stricter verification.'),
            background: '#7c3aed',
            color: '#ffffff',
            onClick: function () {
                startFactVerification(lastVerificationRequest.context, {
                    anchor: lastVerificationRequest.anchor,
                    model: getPreferredDeepVerificationModel(lastVerificationRequest.model),
                    responseLanguage: lastVerificationRequest.responseLanguage,
                    sourceLabel: 'Dig deeper',
                    keepMarks: true,
                    keepPosition: true,
                    verificationInstruction: 'Dig deeper before answering. Look for broader context, more relevant source angles, chronology, counts, names, places, and whether there are related facts or caveats that materially change the interpretation. Be extra strict and say clearly when evidence is incomplete or uncertain.',
                });
            },
        },
        {
            label: ct('contentScript.factOpenToolbox', {}, 'Open Toolbox'),
            title: ct('contentScript.factOpenToolboxTitle', {}, 'Open Toolbox with the same verification context so you can continue working from the selected material.'),
            background: '#0284c7',
            color: '#ffffff',
            onClick: function () {
                openReplyPanelWithImportedContext(lastVerificationRequest.context, {
                    message: ct('contentScript.verificationContextImported', {}, 'Verification context imported into Toolbox.'),
                });
            },
        },
    ];
}

function enableFactResultBoxDragging(handle, box) {
    if (!handle || !box || handle.dataset.dragReady === 'true') {
        return;
    }

    handle.dataset.dragReady = 'true';

    handle.addEventListener('pointerdown', function (event) {
        if (event.button !== 0 || !box.isConnected || (event.target && event.target.closest && event.target.closest('#sgpt-close'))) {
            return;
        }

        const rect = box.getBoundingClientRect();
        factResultBoxDragState = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            offsetX: event.clientX - rect.left,
            offsetY: event.clientY - rect.top,
            dragging: false,
        };

        if (typeof handle.setPointerCapture === 'function') {
            try {
                handle.setPointerCapture(event.pointerId);
            } catch (error) {
            }
        }
    });

    handle.addEventListener('dblclick', function (event) {
        factResultBoxManualPosition = null;
        positionFactResultBox();
        event.preventDefault();
    });

    handle.addEventListener('keydown', function (event) {
        if (event.key !== 'Escape') {
            return;
        }

        factResultBoxManualPosition = null;
        positionFactResultBox();
        event.preventDefault();
    });

    handle.addEventListener('pointermove', function (event) {
        if (!factResultBoxDragState || factResultBoxDragState.pointerId !== event.pointerId || !factResultBox || !factResultBox.isConnected) {
            return;
        }

        const distance = Math.max(Math.abs(event.clientX - factResultBoxDragState.startX), Math.abs(event.clientY - factResultBoxDragState.startY));
        if (!factResultBoxDragState.dragging && distance < 4) {
            return;
        }

        factResultBoxDragState.dragging = true;
        handle.style.cursor = 'grabbing';
        const clamped = clampFixedPosition(
            event.clientX - factResultBoxDragState.offsetX,
            event.clientY - factResultBoxDragState.offsetY,
            factResultBox,
            12
        );
        factResultBox.style.left = Math.round(clamped.left) + 'px';
        factResultBox.style.top = Math.round(clamped.top) + 'px';
        factResultBox.style.right = 'auto';
        factResultBox.style.bottom = 'auto';
    });

    function finishFactResultBoxDrag(event) {
        if (!factResultBoxDragState) {
            return;
        }

        if (event && factResultBoxDragState.pointerId != null && factResultBoxDragState.pointerId !== event.pointerId) {
            return;
        }

        if (factResultBoxDragState.dragging && factResultBox && factResultBox.isConnected) {
            const rect = factResultBox.getBoundingClientRect();
            factResultBoxManualPosition = {
                left: Math.round(rect.left),
                top: Math.round(rect.top),
            };
        }

        if (event && typeof handle.releasePointerCapture === 'function') {
            try {
                if (handle.hasPointerCapture && handle.hasPointerCapture(event.pointerId)) {
                    handle.releasePointerCapture(event.pointerId);
                }
            } catch (error) {
            }
        }

        handle.style.cursor = 'grab';
        factResultBoxDragState = null;
        positionFactResultBox();
    }

    handle.addEventListener('pointerup', finishFactResultBoxDrag);
    handle.addEventListener('pointercancel', finishFactResultBoxDrag);
}

function showFactResultBox(content, anchor, options) {
    const config = options || {};
    if (factResultBox && document.contains(factResultBox)) {
        factResultBox.remove();
    }

    factResultAnchor = anchor || null;

    const box = document.createElement('div');
    box.id = 'sgpt-factbox';
    box.style.position = 'fixed';
    box.style.width = '400px';
    box.style.maxHeight = '60vh';
    box.style.overflow = 'auto';
    box.style.background = config.background || '#fff';
    box.style.border = '1px solid ' + (config.borderColor || '#d8b4fe');
    box.style.borderRadius = '10px';
    box.style.boxShadow = '0 10px 28px rgba(0,0,0,0.18)';
    box.style.padding = '12px';
    box.style.zIndex = 2147483647;
    box.style.fontFamily = 'system-ui, sans-serif';
    box.style.fontSize = '14px';
    box.style.whiteSpace = 'pre-wrap';
    box.style.lineHeight = '1.45';
    box.style.color = config.textColor || '#0f172a';

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.setAttribute('aria-label', ct('contentScript.closeToolbox', {}, 'Close Toolbox'));
    closeBtn.title = ct('contentScript.closeToolbox', {}, 'Close Toolbox');
    closeBtn.style.position = 'absolute';
    closeBtn.style.top = '6px';
    closeBtn.style.right = '8px';
    closeBtn.style.border = 'none';
    closeBtn.style.background = 'transparent';
    closeBtn.style.fontSize = '18px';
    closeBtn.style.cursor = 'pointer';
    closeBtn.addEventListener('click', () => {
        box.remove();
        if (factResultBox === box) {
            factResultBox = null;
            factResultAnchor = null;
            factResultBoxManualPosition = null;
            factResultBoxDragState = null;
        }
    });

    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.flexDirection = 'column';
    header.style.gap = '4px';
    header.style.paddingRight = '24px';
    header.style.marginBottom = '6px';
    header.style.cursor = 'grab';
    header.style.userSelect = 'none';
    header.tabIndex = 0;
    header.title = ct('contentScript.dragFactTitle', {}, 'Drag to move. Double-click or press Escape to reset position.');

    const title = document.createElement('div');
    title.textContent = config.title || ct('contentScript.factVerificationTitle', {}, '✅ Fact checking via OpenAI');
    title.style.fontWeight = '700';
    title.style.color = config.titleColor || '#0284c7';

    const subtitle = document.createElement('div');
    subtitle.textContent = config.subtitle || (anchor
        ? ct('contentScript.factAnchoredSelected', {}, 'Anchored to the selected content.')
        : ct('contentScript.factVerificationResult', {}, 'Verification result'));
    subtitle.style.color = config.subtitleColor || '#7c3aed';
    subtitle.style.fontSize = '12px';
    subtitle.style.fontWeight = '600';

    header.appendChild(title);
    header.appendChild(subtitle);

    const loadingRow = document.createElement('div');
    loadingRow.style.display = config.isLoading ? 'flex' : 'none';
    loadingRow.style.alignItems = 'center';
    loadingRow.style.gap = '8px';
    loadingRow.style.marginBottom = '10px';
    loadingRow.style.color = '#6d28d9';
    loadingRow.style.fontSize = '12px';
    loadingRow.style.fontWeight = '600';

    const loadingSpinner = document.createElement('span');
    loadingSpinner.style.width = '14px';
    loadingSpinner.style.height = '14px';
    loadingSpinner.style.borderRadius = '50%';
    loadingSpinner.style.border = '2px solid rgba(124,58,237,0.22)';
    loadingSpinner.style.borderTopColor = '#7c3aed';
    loadingSpinner.style.animation = 'sgpt-inline-spin .8s linear infinite';

    const loadingText = document.createElement('span');
    loadingText.textContent = ct('contentScript.checkingNow', {}, 'Checking now…');

    loadingRow.appendChild(loadingSpinner);
    loadingRow.appendChild(loadingText);

    const text = document.createElement('div');
    text.textContent = content;
    if (config.isLoading) {
        text.style.color = '#475569';
    }

    const actions = Array.isArray(config.actions) ? config.actions.filter(Boolean) : [];
    const actionsRow = document.createElement('div');
    actionsRow.style.display = actions.length ? 'flex' : 'none';
    actionsRow.style.gap = '8px';
    actionsRow.style.flexWrap = 'wrap';
    actionsRow.style.marginTop = '12px';
    actions.forEach(function (action) {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = action.label || 'Action';
        button.title = action.title || '';
        button.style.border = 'none';
        button.style.borderRadius = '999px';
        button.style.padding = '6px 10px';
        button.style.cursor = 'pointer';
        button.style.background = action.background || '#e2e8f0';
        button.style.color = action.color || '#0f172a';
        button.style.fontSize = '12px';
        button.addEventListener('click', function (event) {
            event.preventDefault();
            if (typeof action.onClick === 'function') {
                action.onClick();
            }
        });
        actionsRow.appendChild(button);
    });

    box.appendChild(closeBtn);
    box.appendChild(header);
    box.appendChild(loadingRow);
    box.appendChild(text);
    box.appendChild(actionsRow);
    document.body.appendChild(box);
    factResultBox = box;
    enableFactResultBoxDragging(header, box);
    positionFactResultBox();
}

function showFactVerificationPending(context, anchor, sourceLabel) {
    const normalizedContext = normalizeWhitespace(context || '');
    const preview = normalizedContext ? clipText(normalizedContext, 280) : ct('contentScript.previewPreparing', {}, 'Preparing verification context…');

    showFactResultBox(
        ct('contentScript.previewLabel', {}, 'Preview') + ':\n' + preview,
        anchor,
        {
            title: ct('contentScript.verifyingFacts', {}, '⏳ Verifying facts…'),
            titleColor: '#7c3aed',
            subtitle: ct('contentScript.resultAppears', {}, 'Result appears here automatically') + ' · ' + ct('contentScript.factLanguage', {}, 'Language') + ': ' + getResponseLanguageLabel(lastVerificationRequest ? lastVerificationRequest.responseLanguage : defaultResponseLanguage),
            subtitleColor: '#6d28d9',
            borderColor: '#c4b5fd',
            background: '#faf5ff',
            isLoading: true,
            actions: buildFactBoxActions(),
        }
    );
}

function updatePanelBusyState(isBusy, label) {
    if (!panel) {
        return;
    }

    const loader = panel.querySelector('#sgpt-inline-loader');
    const loaderLabel = panel.querySelector('#sgpt-inline-loader-label');
    const buttons = ['#sgpt-send', '#sgpt-mod', '#sgpt-verify', '#sgpt-paste']
        .map(function (selector) {
            return panel.querySelector(selector);
        })
        .filter(Boolean);

    buttons.forEach(function (button) {
        button.disabled = !!isBusy;
        button.setAttribute('aria-busy', isBusy ? 'true' : 'false');
    });

    if (!loader) {
        return;
    }

    loader.dataset.visible = isBusy ? 'true' : 'false';
    loader.setAttribute('aria-hidden', isBusy ? 'false' : 'true');
    if (loaderLabel) {
        loaderLabel.textContent = label || ct('contentScript.working', {}, 'Working…');
    }
}

function showLoader(label, options) {
    const settings = options || {};
    updatePanelBusyState(true, label || ct('contentScript.working', {}, 'Working…'));

    const loader = document.getElementById("socialgpt-loader");
    if (loader) {
        loader.style.display = (panel || settings.skipFloating) ? "none" : "block";
    }
}

function hideLoader() {
    updatePanelBusyState(false);

    const loader = document.getElementById("socialgpt-loader");
    if (loader) {
        loader.style.display = "none";
    }
}

injectLoader();

// ---------------------------------------------
// FACEBOOK NAME DETECTION
// ---------------------------------------------
function detectFacebookUserNameViaObserver(callback) {
    if (!location.hostname.includes("facebook.com")) return;
    const observer = new MutationObserver(() => {
        const name = extractFacebookUserName();
        if (name) {
            frontResponserName = name;
            observer.disconnect();
            callback(name);
        }
    });
    observer.observe(document.body, {childList: true, subtree: true});

    const name = extractFacebookUserName();
    if (name) {
        frontResponserName = name;
        observer.disconnect();
        callback(name);
    }
}

function getNestedValue(root, path) {
    return path.reduce((acc, key) => {
        if (acc === null || typeof acc === 'undefined') {
            return undefined;
        }

        return typeof acc[key] === 'undefined' ? undefined : acc[key];
    }, root);
}

function extractFacebookUserName() {
    const scripts = document.querySelectorAll('script[type="application/json"]');
    for (const script of scripts) {
        try {
            const json = JSON.parse(script.textContent);
            const name = getNestedValue(json, ['require', 0, 3, 0, '__bbox', 'require', 0, 3, 1, '__bbox', 'result', 'data', 'viewer', 'actor', 'name']);
            if (name) return name;
        } catch (e) {
        }
    }

    const img = document.querySelector('img[alt][src*="scontent"]');
    if (img && img.alt && img.alt.length > 1) return img.alt.trim();

    const spans = [].slice.call(document.querySelectorAll('span'));
    for (const span of spans) {
        const txt = span.textContent && typeof span.textContent.trim === 'function' ? span.textContent.trim() : '';
        if (txt && txt.length >= 4 && /^[A-ZÅÄÖ][a-zåäö]+(?: [A-ZÅÄÖ][a-zåäö]+)?$/.test(txt)) return txt;
    }

    return null;
}


// ---------------------------------------------
// FIND CONTEXT NODE
// ---------------------------------------------
function findFullContextNode(n) {
    return (n.closest('[data-ad-preview="message"],[data-ad-comet-preview="message"],[role="article"],article,[data-pagelet],.userContentWrapper') || n.closest('form,div') || n.parentElement);
}

function getEventTargetElement(target) {
    if (!target) {
        return null;
    }

    return target.nodeType === Node.ELEMENT_NODE
        ? target
        : (target.parentElement || null);
}

function isSocialToolsUiElement(target) {
    const element = getEventTargetElement(target);
    return !!(element && element.closest && element.closest('#sgpt-panel, #sgpt-factbox, #sgpt-verify-action, #sgpt-selection-toolbox-action, #sgpt-verify-hover, #sgpt-composer-action, #sgpt-quick-response-action, #tn-social-tools-admin-activities, #tn-networks-soundcloud-buffer, #tn-soundcloud-direct-capture-buffer'));
}

function isEditableTarget(node) {
    return !!(node && typeof node.matches === 'function' && node.matches(EDITABLE_SELECTOR) && !node.closest('#sgpt-panel'));
}

function findEditableTarget(node) {
    if (!node || node.closest && node.closest('#sgpt-panel')) {
        return null;
    }

    const candidate = isEditableTarget(node)
        ? node
        : (node.closest ? node.closest(EDITABLE_SELECTOR) : null);

    if (!candidate) {
        return null;
    }

    const platform = getActivePlatformDefinition();
    if (!platform || typeof platform.supportsComposerTarget !== 'function') {
        return null;
    }

    return platform.supportsComposerTarget(candidate, location) ? candidate : null;
}

function getActivePlatformDefinition() {
    if (!window.TNNetworksPlatformRegistry || typeof window.TNNetworksPlatformRegistry.getActive !== 'function') {
        return null;
    }

    try {
        return window.TNNetworksPlatformRegistry.getActive(location.hostname);
    } catch (error) {
        return null;
    }
}

function getComposerActionButtonAnchorPosition(button, preferredPlacement) {
    if (!activeComposer || !document.contains(activeComposer)) {
        return null;
    }

    const rect = activeComposer.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
        return null;
    }

    const gap = 8;
    const buttonRect = getButtonRectForPlacement(button, 124, 32);
    const preferred = String(preferredPlacement || 'above').toLowerCase();
    const alignedRightLeft = Math.max(12, Math.min(rect.right - buttonRect.width, window.innerWidth - buttonRect.width - 12));
    const alignedLeftLeft = Math.max(12, Math.min(rect.left, window.innerWidth - buttonRect.width - 12));
    const aboveTop = rect.top - buttonRect.height - gap;
    const belowTop = rect.bottom + gap;

    const candidates = [];
    if (preferred === 'below') {
        candidates.push({ left: alignedRightLeft, top: belowTop });
        candidates.push({ left: alignedLeftLeft, top: belowTop });
        candidates.push({ left: alignedRightLeft, top: aboveTop });
        candidates.push({ left: alignedLeftLeft, top: aboveTop });
    } else {
        candidates.push({ left: alignedRightLeft, top: aboveTop });
        candidates.push({ left: alignedLeftLeft, top: aboveTop });
        candidates.push({ left: alignedRightLeft, top: belowTop });
        candidates.push({ left: alignedLeftLeft, top: belowTop });
    }

    for (let index = 0; index < candidates.length; index += 1) {
        const candidate = clampFixedPosition(candidates[index].left, candidates[index].top, button, 12);
        const avoidsVerticalOverlap = candidate.top + buttonRect.height <= rect.top - gap || candidate.top >= rect.bottom + gap;
        const avoidsHorizontalOverlap = candidate.left + buttonRect.width <= rect.left - gap || candidate.left >= rect.right + gap;
        if (avoidsVerticalOverlap || avoidsHorizontalOverlap) {
            return candidate;
        }
    }

    return {
        left: alignedRightLeft,
        top: Math.max(12, aboveTop),
    };
}

function getQuickResponseActionButtonAnchorPosition() {
    const composerButton = ensureComposerActionButton();
    const quickButton = ensureQuickResponseActionButton();
    const primaryAnchor = getComposerActionButtonAnchorPosition(composerButton, 'above');
    if (!primaryAnchor) {
        return null;
    }

    const composerRect = activeComposer && activeComposer.getBoundingClientRect ? activeComposer.getBoundingClientRect() : null;
    const primaryRect = getButtonRectForPlacement(composerButton, 124, 32);
    const quickRect = getButtonRectForPlacement(quickButton, 116, 32);
    const gap = 8;
    const candidates = [
        { left: primaryAnchor.left - quickRect.width - gap, top: primaryAnchor.top },
        { left: primaryAnchor.left + primaryRect.width + gap, top: primaryAnchor.top },
        { left: primaryAnchor.left, top: primaryAnchor.top + primaryRect.height + gap },
        { left: primaryAnchor.left, top: primaryAnchor.top - quickRect.height - gap },
        getComposerActionButtonAnchorPosition(quickButton, 'below'),
    ].filter(Boolean);

    for (let index = 0; index < candidates.length; index += 1) {
        const candidate = clampFixedPosition(candidates[index].left, candidates[index].top, quickButton, 12);
        if (!composerRect) {
            return candidate;
        }

        const avoidsVerticalOverlap = candidate.top + quickRect.height <= composerRect.top - gap || candidate.top >= composerRect.bottom + gap;
        const avoidsHorizontalOverlap = candidate.left + quickRect.width <= composerRect.left - gap || candidate.left >= composerRect.right + gap;
        const avoidsPrimaryOverlap = candidate.left + quickRect.width <= primaryAnchor.left - gap
            || candidate.left >= primaryAnchor.left + primaryRect.width + gap
            || candidate.top + quickRect.height <= primaryAnchor.top - gap
            || candidate.top >= primaryAnchor.top + primaryRect.height + gap;

        if ((avoidsVerticalOverlap || avoidsHorizontalOverlap) && avoidsPrimaryOverlap) {
            return candidate;
        }
    }

    return clampFixedPosition(primaryAnchor.left + primaryRect.width + gap, primaryAnchor.top, quickButton, 12);
}

function clampFixedPosition(left, top, element, minMargin) {
    const margin = typeof minMargin === 'number' ? minMargin : 12;
    const rect = element && element.getBoundingClientRect ? element.getBoundingClientRect() : {width: 150, height: 34};
    const width = Math.max(1, Math.round(rect.width || 150));
    const height = Math.max(1, Math.round(rect.height || 34));

    return {
        left: Math.min(Math.max(margin, left), Math.max(margin, window.innerWidth - width - margin)),
        top: Math.min(Math.max(margin, top), Math.max(margin, window.innerHeight - height - margin)),
    };
}

function setComposerActionButtonCoordinates(button, left, top) {
    const clamped = clampFixedPosition(left, top, button, 12);
    button.style.left = Math.round(clamped.left) + 'px';
    button.style.top = Math.round(clamped.top) + 'px';
}

function getButtonRectForPlacement(button, fallbackWidth, fallbackHeight) {
    const rect = button && button.getBoundingClientRect ? button.getBoundingClientRect() : null;
    return {
        width: Math.max(1, Math.round((rect && rect.width) || fallbackWidth || 72)),
        height: Math.max(1, Math.round((rect && rect.height) || fallbackHeight || 30)),
    };
}

function enableComposerActionButtonDragging(button) {
    if (!button || button.dataset.dragReady === 'true') {
        return;
    }

    button.dataset.dragReady = 'true';

    button.addEventListener('pointerdown', function (event) {
        if (event.button !== 0 || !button.isConnected) {
            return;
        }

        const rect = button.getBoundingClientRect();
        composerActionButtonDragState = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            offsetX: event.clientX - rect.left,
            offsetY: event.clientY - rect.top,
            dragging: false,
            anchorPosition: getComposerActionButtonAnchorPosition(button, 'above') || {left: rect.left, top: rect.top},
        };

        if (typeof button.setPointerCapture === 'function') {
            try {
                button.setPointerCapture(event.pointerId);
            } catch (error) {
            }
        }
    });

    button.addEventListener('dblclick', function (event) {
        composerActionButtonDragOffset = null;
        button.dataset.dragSuppressClick = 'true';
        window.setTimeout(function () {
            if (button) {
                button.dataset.dragSuppressClick = 'false';
            }
        }, 120);
        positionComposerActionButton();
        positionQuickResponseActionButton();
        event.preventDefault();
    });

    button.addEventListener('keydown', function (event) {
        if (event.key !== 'Escape') {
            return;
        }

        composerActionButtonDragOffset = null;
        button.dataset.dragSuppressClick = 'true';
        window.setTimeout(function () {
            if (button) {
                button.dataset.dragSuppressClick = 'false';
            }
        }, 120);
        positionComposerActionButton();
        positionQuickResponseActionButton();
        event.preventDefault();
    });

    button.addEventListener('pointermove', function (event) {
        if (!composerActionButtonDragState || !composerActionButton || composerActionButtonDragState.pointerId !== event.pointerId) {
            return;
        }

        const distance = Math.max(Math.abs(event.clientX - composerActionButtonDragState.startX), Math.abs(event.clientY - composerActionButtonDragState.startY));
        if (!composerActionButtonDragState.dragging && distance < 4) {
            return;
        }

        composerActionButtonDragState.dragging = true;
        composerActionButton.style.cursor = 'grabbing';
        setComposerActionButtonCoordinates(
            composerActionButton,
            event.clientX - composerActionButtonDragState.offsetX,
            event.clientY - composerActionButtonDragState.offsetY
        );
    });

    function finishComposerActionButtonDrag(event) {
        if (!composerActionButtonDragState || !composerActionButton) {
            composerActionButtonDragState = null;
            return;
        }

        if (event && composerActionButtonDragState.pointerId != null && composerActionButtonDragState.pointerId !== event.pointerId) {
            return;
        }

        if (composerActionButtonDragState.dragging) {
            const rect = composerActionButton.getBoundingClientRect();
            const anchorPosition = getComposerActionButtonAnchorPosition(composerActionButton, 'above') || composerActionButtonDragState.anchorPosition || {left: rect.left, top: rect.top};
            composerActionButtonDragOffset = {
                left: Math.round(rect.left - anchorPosition.left),
                top: Math.round(rect.top - anchorPosition.top),
            };
            composerActionButton.dataset.dragSuppressClick = 'true';
            window.setTimeout(function () {
                if (composerActionButton) {
                    composerActionButton.dataset.dragSuppressClick = 'false';
                }
            }, 120);
        }

        if (event && typeof composerActionButton.releasePointerCapture === 'function') {
            try {
                if (composerActionButton.hasPointerCapture && composerActionButton.hasPointerCapture(event.pointerId)) {
                    composerActionButton.releasePointerCapture(event.pointerId);
                }
            } catch (error) {
            }
        }

        composerActionButton.style.cursor = 'grab';
        composerActionButtonDragState = null;
        positionComposerActionButton();
    }

    button.addEventListener('pointerup', finishComposerActionButtonDrag);
    button.addEventListener('pointercancel', finishComposerActionButtonDrag);
}

function enableQuickResponseActionButtonDragging(button) {
    if (!button || button.dataset.dragReady === 'true') {
        return;
    }

    button.dataset.dragReady = 'true';

    button.addEventListener('pointerdown', function (event) {
        if (event.button !== 0 || !button.isConnected) {
            return;
        }

        const rect = button.getBoundingClientRect();
        quickResponseActionButtonDragState = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            offsetX: event.clientX - rect.left,
            offsetY: event.clientY - rect.top,
            dragging: false,
            anchorPosition: getQuickResponseActionButtonAnchorPosition() || {left: rect.left, top: rect.top},
        };

        if (typeof button.setPointerCapture === 'function') {
            try {
                button.setPointerCapture(event.pointerId);
            } catch (error) {
            }
        }
    });

    button.addEventListener('dblclick', function (event) {
        quickResponseActionButtonDragOffset = null;
        button.dataset.dragSuppressClick = 'true';
        window.setTimeout(function () {
            if (button) {
                button.dataset.dragSuppressClick = 'false';
            }
        }, 120);
        positionQuickResponseActionButton();
        event.preventDefault();
    });

    button.addEventListener('keydown', function (event) {
        if (event.key !== 'Escape') {
            return;
        }

        quickResponseActionButtonDragOffset = null;
        button.dataset.dragSuppressClick = 'true';
        window.setTimeout(function () {
            if (button) {
                button.dataset.dragSuppressClick = 'false';
            }
        }, 120);
        positionQuickResponseActionButton();
        event.preventDefault();
    });

    button.addEventListener('pointermove', function (event) {
        if (!quickResponseActionButtonDragState || !quickResponseActionButton || quickResponseActionButtonDragState.pointerId !== event.pointerId) {
            return;
        }

        const distance = Math.max(Math.abs(event.clientX - quickResponseActionButtonDragState.startX), Math.abs(event.clientY - quickResponseActionButtonDragState.startY));
        if (!quickResponseActionButtonDragState.dragging && distance < 4) {
            return;
        }

        quickResponseActionButtonDragState.dragging = true;
        quickResponseActionButton.style.cursor = 'grabbing';
        setComposerActionButtonCoordinates(
            quickResponseActionButton,
            event.clientX - quickResponseActionButtonDragState.offsetX,
            event.clientY - quickResponseActionButtonDragState.offsetY
        );
    });

    function finishQuickResponseActionButtonDrag(event) {
        if (!quickResponseActionButtonDragState || !quickResponseActionButton) {
            quickResponseActionButtonDragState = null;
            return;
        }

        if (event && quickResponseActionButtonDragState.pointerId != null && quickResponseActionButtonDragState.pointerId !== event.pointerId) {
            return;
        }

        if (quickResponseActionButtonDragState.dragging) {
            const rect = quickResponseActionButton.getBoundingClientRect();
            const anchorPosition = getQuickResponseActionButtonAnchorPosition() || quickResponseActionButtonDragState.anchorPosition || {left: rect.left, top: rect.top};
            quickResponseActionButtonDragOffset = {
                left: Math.round(rect.left - anchorPosition.left),
                top: Math.round(rect.top - anchorPosition.top),
            };
            quickResponseActionButton.dataset.dragSuppressClick = 'true';
            window.setTimeout(function () {
                if (quickResponseActionButton) {
                    quickResponseActionButton.dataset.dragSuppressClick = 'false';
                }
            }, 120);
        }

        if (event && typeof quickResponseActionButton.releasePointerCapture === 'function') {
            try {
                if (quickResponseActionButton.hasPointerCapture && quickResponseActionButton.hasPointerCapture(event.pointerId)) {
                    quickResponseActionButton.releasePointerCapture(event.pointerId);
                }
            } catch (error) {
            }
        }

        quickResponseActionButton.style.cursor = 'grab';
        quickResponseActionButtonDragState = null;
        positionQuickResponseActionButton();
    }

    button.addEventListener('pointerup', finishQuickResponseActionButtonDrag);
    button.addEventListener('pointercancel', finishQuickResponseActionButtonDrag);
}

function getVerifyHoverButtonAnchorPosition(target, button) {
    if (!target || !target.getBoundingClientRect) {
        return null;
    }

    const rect = target.getBoundingClientRect();
    const gap = 8;
    const buttonRect = getButtonRectForPlacement(button, 64, 28);
    const centeredTop = rect.top + Math.max(0, Math.round((rect.height - buttonRect.height) / 2));
    const candidates = [
        {left: rect.right + gap, top: centeredTop},
        {left: rect.right - buttonRect.width, top: rect.bottom + gap},
        {left: rect.left, top: rect.bottom + gap},
        {left: rect.left - buttonRect.width - gap, top: centeredTop},
        {left: rect.right - buttonRect.width, top: rect.top - buttonRect.height - gap},
    ];

    for (let i = 0; i < candidates.length; i += 1) {
        const candidate = candidates[i];
        if (candidate.left >= 12
            && candidate.top >= 12
            && candidate.left + buttonRect.width <= window.innerWidth - 12
            && candidate.top + buttonRect.height <= window.innerHeight - 12) {
            return candidate;
        }
    }

    return {
        left: Math.max(12, Math.min(rect.right - buttonRect.width, window.innerWidth - buttonRect.width - 12)),
        top: Math.max(12, Math.min(rect.top - buttonRect.height - gap, window.innerHeight - buttonRect.height - 12)),
    };
}

function positionVerifyHoverButton() {
    if (!verifyHoverButton || !verifyHoverTarget || !document.contains(verifyHoverTarget)) {
        return;
    }

    if (verifyHoverButtonDragState && verifyHoverButtonDragState.dragging) {
        return;
    }

    const anchor = getVerifyHoverButtonAnchorPosition(verifyHoverTarget, verifyHoverButton);
    if (!anchor) {
        return;
    }

    const left = anchor.left + (verifyHoverButtonDragOffset ? verifyHoverButtonDragOffset.left : 0);
    const top = anchor.top + (verifyHoverButtonDragOffset ? verifyHoverButtonDragOffset.top : 0);
    setComposerActionButtonCoordinates(verifyHoverButton, left, top);
}

function enableVerifyHoverButtonDragging(button) {
    if (!button || button.dataset.dragReady === 'true') {
        return;
    }

    button.dataset.dragReady = 'true';

    button.addEventListener('pointerdown', function (event) {
        if (event.button !== 0 || !button.isConnected) {
            return;
        }

        const rect = button.getBoundingClientRect();
        verifyHoverButtonDragState = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            offsetX: event.clientX - rect.left,
            offsetY: event.clientY - rect.top,
            dragging: false,
            anchorPosition: getVerifyHoverButtonAnchorPosition(verifyHoverTarget, button) || {left: rect.left, top: rect.top},
        };

        if (typeof button.setPointerCapture === 'function') {
            try {
                button.setPointerCapture(event.pointerId);
            } catch (error) {
            }
        }
    });

    button.addEventListener('dblclick', function (event) {
        verifyHoverButtonDragOffset = null;
        button.dataset.dragSuppressClick = 'true';
        window.setTimeout(function () {
            if (button) {
                button.dataset.dragSuppressClick = 'false';
            }
        }, 120);
        positionVerifyHoverButton();
        event.preventDefault();
    });

    button.addEventListener('keydown', function (event) {
        if (event.key !== 'Escape') {
            return;
        }

        verifyHoverButtonDragOffset = null;
        button.dataset.dragSuppressClick = 'true';
        window.setTimeout(function () {
            if (button) {
                button.dataset.dragSuppressClick = 'false';
            }
        }, 120);
        positionVerifyHoverButton();
        event.preventDefault();
    });

    button.addEventListener('pointermove', function (event) {
        if (!verifyHoverButtonDragState || !verifyHoverButton || verifyHoverButtonDragState.pointerId !== event.pointerId) {
            return;
        }

        const distance = Math.max(Math.abs(event.clientX - verifyHoverButtonDragState.startX), Math.abs(event.clientY - verifyHoverButtonDragState.startY));
        if (!verifyHoverButtonDragState.dragging && distance < 4) {
            return;
        }

        verifyHoverButtonDragState.dragging = true;
        verifyHoverButton.style.cursor = 'grabbing';
        setComposerActionButtonCoordinates(
            verifyHoverButton,
            event.clientX - verifyHoverButtonDragState.offsetX,
            event.clientY - verifyHoverButtonDragState.offsetY
        );
    });

    function finishVerifyHoverButtonDrag(event) {
        if (!verifyHoverButtonDragState || !verifyHoverButton) {
            verifyHoverButtonDragState = null;
            return;
        }

        if (event && verifyHoverButtonDragState.pointerId != null && verifyHoverButtonDragState.pointerId !== event.pointerId) {
            return;
        }

        if (verifyHoverButtonDragState.dragging) {
            const rect = verifyHoverButton.getBoundingClientRect();
            const anchorPosition = getVerifyHoverButtonAnchorPosition(verifyHoverTarget, verifyHoverButton) || verifyHoverButtonDragState.anchorPosition || {left: rect.left, top: rect.top};
            verifyHoverButtonDragOffset = {
                left: Math.round(rect.left - anchorPosition.left),
                top: Math.round(rect.top - anchorPosition.top),
            };
            verifyHoverButton.dataset.dragSuppressClick = 'true';
            window.setTimeout(function () {
                if (verifyHoverButton) {
                    verifyHoverButton.dataset.dragSuppressClick = 'false';
                }
            }, 120);
        }

        if (event && typeof verifyHoverButton.releasePointerCapture === 'function') {
            try {
                if (verifyHoverButton.hasPointerCapture && verifyHoverButton.hasPointerCapture(event.pointerId)) {
                    verifyHoverButton.releasePointerCapture(event.pointerId);
                }
            } catch (error) {
            }
        }

        verifyHoverButton.style.cursor = 'grab';
        verifyHoverButtonDragState = null;
        positionVerifyHoverButton();
    }

    button.addEventListener('pointerup', finishVerifyHoverButtonDrag);
    button.addEventListener('pointercancel', finishVerifyHoverButtonDrag);
}

function isComposerContentEditable(node) {
    return !!(node && (node.isContentEditable || (node.getAttribute && /^(|true)$/i.test(node.getAttribute('contenteditable') || ''))));
}

function dispatchComposerInputEvents(node, insertedText, inputType, options) {
    if (!node || !node.dispatchEvent) {
        return;
    }

    const settings = options || {};
    const eventInputType = inputType || 'insertText';

    if (settings.emitBeforeInput) {
        try {
            if (typeof InputEvent === 'function') {
                node.dispatchEvent(new InputEvent('beforeinput', {
                    bubbles: true,
                    cancelable: true,
                    data: insertedText,
                    inputType: eventInputType,
                }));
            }
        } catch (error) {
        }
    }

    try {
        if (typeof InputEvent === 'function') {
            node.dispatchEvent(new InputEvent('input', {
                bubbles: true,
                cancelable: true,
                data: insertedText,
                inputType: eventInputType,
            }));
        } else {
            node.dispatchEvent(new Event('input', {bubbles: true, cancelable: true}));
        }
    } catch (error) {
        node.dispatchEvent(new Event('input', {bubbles: true, cancelable: true}));
    }

    if (settings.emitChange) {
        node.dispatchEvent(new Event('change', {bubbles: true}));
    }
}

function setNativeTextInputValue(node, value) {
    const prototype = node instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : HTMLInputElement.prototype;
    const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');

    if (descriptor && typeof descriptor.set === 'function') {
        descriptor.set.call(node, value);
    } else {
        node.value = value;
    }
}

function resolveComposerEditingHost(node) {
    if (!node || !document.contains(node)) {
        return null;
    }

    if (node instanceof HTMLTextAreaElement || node instanceof HTMLInputElement || isComposerContentEditable(node)) {
        return node;
    }

    if (!node.querySelector) {
        return node;
    }

    const preferred = node.querySelector('textarea,input[type="text"],input:not([type]),[contenteditable=""],[contenteditable="true"],[contenteditable]:not([contenteditable="false"])');
    return preferred || node;
}

function moveComposerCaretToEnd(node) {
    if (!node || !document.contains(node)) {
        return;
    }

    if (node instanceof HTMLTextAreaElement || node instanceof HTMLInputElement) {
        if (typeof node.setSelectionRange === 'function') {
            node.setSelectionRange(node.value.length, node.value.length);
        }
        return;
    }

    if (!isComposerContentEditable(node)) {
        return;
    }

    try {
        const selection = window.getSelection();
        if (!selection) {
            return;
        }

        const range = document.createRange();
        range.selectNodeContents(node);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
    } catch (error) {
    }
}

function buildContentEditableFragment(value) {
    const fragment = document.createDocumentFragment();
    const lines = String(value || '').split('\n');
    lines.forEach(function (line, index) {
        if (index > 0) {
            fragment.appendChild(document.createElement('br'));
        }
        fragment.appendChild(document.createTextNode(line));
    });
    return fragment;
}

function replaceContentEditableText(node, value) {
    let inserted = false;

    try {
        node.focus();
    } catch (error) {
    }

    try {
        const selection = window.getSelection();
        if (selection) {
            const range = document.createRange();
            range.selectNodeContents(node);
            selection.removeAllRanges();
            selection.addRange(range);
        }

        if (typeof document.execCommand === 'function') {
            inserted = document.execCommand('insertText', false, value);
        }
    } catch (error) {
    }

    if (!inserted) {
        try {
            const selection = window.getSelection();
            const range = document.createRange();
            range.selectNodeContents(node);
            range.deleteContents();
            range.insertNode(buildContentEditableFragment(value));
            if (selection) {
                selection.removeAllRanges();
            }
        } catch (error) {
            node.textContent = value;
        }
    }

    moveComposerCaretToEnd(node);
    if (!inserted) {
        dispatchComposerInputEvents(node, value, 'insertFromPaste');
    }
    return {ok: true};
}

function replaceComposerText(node, text) {
    const editorHost = resolveComposerEditingHost(node);
    if (!editorHost || !document.contains(editorHost)) {
        return {ok: false, error: 'No selected field is available anymore.'};
    }

    const value = String(text || '');

    try {
        editorHost.focus();
    } catch (error) {
    }

    if (editorHost instanceof HTMLTextAreaElement || editorHost instanceof HTMLInputElement) {
        setNativeTextInputValue(editorHost, value);
        moveComposerCaretToEnd(editorHost);
        dispatchComposerInputEvents(editorHost, value, 'insertFromPaste');
        return {ok: true};
    }

    if (isComposerContentEditable(editorHost)) {
        return replaceContentEditableText(editorHost, value);
    }

    return {ok: false, error: 'The selected field could not be filled automatically.'};
}

function isVisibleElement(node) {
    if (!node || !node.getBoundingClientRect) {
        return false;
    }

    const rect = node.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
}

function isDisabledSubmitButton(node) {
    return !!(node && (
        node.disabled
        || node.getAttribute('aria-disabled') === 'true'
        || node.getAttribute('data-disabled') === 'true'
    ));
}

function findSendButtonForComposer(node, platform, options) {
    if (!node || !document.contains(node)) {
        return null;
    }

    const includeDisabled = !!(options && options.includeDisabled);
    const selectors = [];
    if (platform && Array.isArray(platform.sendButtonSelectors)) {
        selectors.push.apply(selectors, platform.sendButtonSelectors);
    }

    selectors.push('button[type="submit"]', '[role="button"]', 'button');

    const scopes = [
        node.closest('form'),
        node.closest('[role="dialog"]'),
        node.closest('[role="article"]'),
        node.closest('[data-testid="cellInnerDiv"]'),
        node.parentElement,
        document,
    ].filter(Boolean);

    const seen = new Set();
    const labelPattern = /(send|reply|post|tweet|comment|publish|share|submit|skicka|svara|posta|publicera|kommentera)/i;

    for (let scopeIndex = 0; scopeIndex < scopes.length; scopeIndex += 1) {
        const scope = scopes[scopeIndex];
        for (let selectorIndex = 0; selectorIndex < selectors.length; selectorIndex += 1) {
            const selector = selectors[selectorIndex];
            const matches = scope.querySelectorAll ? scope.querySelectorAll(selector) : [];

            for (let i = 0; i < matches.length; i += 1) {
                const button = matches[i];
                if (!button || seen.has(button) || button.closest('#sgpt-panel') || button.id === 'sgpt-composer-action') {
                    continue;
                }

                seen.add(button);

                if (!isVisibleElement(button) || (!includeDisabled && isDisabledSubmitButton(button))) {
                    continue;
                }

                const label = [
                    button.textContent || '',
                    button.getAttribute ? (button.getAttribute('aria-label') || '') : '',
                    button.getAttribute ? (button.getAttribute('title') || '') : '',
                    button.getAttribute ? (button.getAttribute('data-testid') || '') : '',
                ].join(' ');

                if (selector === 'button[type="submit"]' || labelPattern.test(label)) {
                    return button;
                }
            }
        }
    }

    return null;
}

function clickComposerSendButton(button) {
    if (!button || typeof button.click !== 'function') {
        return false;
    }

    try {
        button.focus();
    } catch (error) {
    }

    button.click();
    return true;
}

function getComposerFillCapabilities() {
    const platform = getActivePlatformDefinition();
    const hasComposer = !!(activeComposer && document.contains(activeComposer));
    const prefersManualPaste = !!(platform && platform.preferManualPaste);
    const sendButton = hasComposer && !prefersManualPaste
        ? findSendButtonForComposer(activeComposer, platform, {includeDisabled: true})
        : null;

    return {
        platform: platform,
        hasComposer: hasComposer,
        canPaste: hasComposer,
        canSubmit: !!sendButton,
        prefersManualPaste: prefersManualPaste,
        sendButton: sendButton,
    };
}

function buildComposeStatusMessage(outputText, capabilities) {
    if (!capabilities.hasComposer) {
        return 'Select a text field to enable paste/fill actions.';
    }

    if (!outputText) {
        return 'Generate text, then paste it into the selected field.';
    }

    return capabilities.canPaste
        ? 'Output is ready. Paste it into the selected field and review it before sending.'
        : 'Output is ready, but no selected field is available for paste right now.';
}

function updatePanelComposerActions(statusOverride, tone) {
    if (!panel) {
        return;
    }

    const contextField = panel.querySelector('#sgpt-context');
    const outputField = panel.querySelector('#sgpt-out');
    const verifyButton = panel.querySelector('#sgpt-verify');
    const refreshButton = panel.querySelector('#sgpt-mod');
    const quickButton = panel.querySelector('#sgpt-quick');
    const pasteButton = panel.querySelector('#sgpt-paste');
    const status = panel.querySelector('#sgpt-compose-status');
    const modifierField = panel.querySelector('#sgpt-modifier');
    const capabilities = getComposerFillCapabilities();
    const contextText = contextField ? contextField.value.trim() : '';
    const outputText = outputField ? outputField.value.trim() : '';
    const modifierText = modifierField ? modifierField.value.trim() : '';

    if (verifyButton) {
        verifyButton.disabled = !contextText;
    }

    if (pasteButton) {
        pasteButton.disabled = !outputText || !capabilities.canPaste;
    }

    if (refreshButton) {
        const isRevision = !!outputText && !!modifierText;
        refreshButton.textContent = isRevision ? 'Apply change' : 'Refresh';
        refreshButton.title = isRevision
            ? 'Revise the current output using the change request.'
            : 'Generate a fresh answer from the same prompt and context.';
        refreshButton.disabled = !outputText;
    }

    if (quickButton) {
        quickButton.disabled = !capabilities.hasComposer && !contextText;
    }

    if (status) {
        status.textContent = statusOverride || buildComposeStatusMessage(outputText, capabilities);
        status.style.color = tone === 'error'
            ? '#b91c1c'
            : (tone === 'success' ? '#047857' : '#64748b');
    }
}

function pasteTextIntoActiveComposer(text, options) {
    const output = String(text || '').trim();
    if (!output) {
        return {ok: false, error: 'There is no generated text to paste yet.'};
    }

    const capabilities = getComposerFillCapabilities();
    if (!capabilities.hasComposer) {
        return {ok: false, error: 'Select a text field first.'};
    }

    const fillResult = replaceComposerText(activeComposer, output);
    if (!fillResult.ok) {
        return fillResult;
    }

    return {
        ok: true,
        submitted: false,
        message: 'Text pasted into the selected field. Review it before sending.',
    };
}

function clearMarkedContextSelection() {
    markedElements.forEach(function (el) {
        clearMarkedElementPresentation(el);
    });
    markedElements = [];
    isClickMarkingActive = false;
    safeSendRuntimeMessage({type: 'RESET_MARK_MODE'});
}

function getMarkedElementPublicId(index) {
    return 'tn-mark-' + (index + 1);
}

function clearMarkedElementPresentation(el) {
    if (!el || !el.classList) {
        return;
    }

    el.classList.remove('socialgpt-marked');
    el.removeAttribute('data-tn-social-mark-id');
    el.removeAttribute('data-tn-social-mark-badge');
    el.removeAttribute('data-tn-social-mark-mode');
}

function pruneMarkedElements() {
    markedElements = markedElements.filter(function (el) {
        return !!(el && document.contains(el));
    });
    return markedElements;
}

function buildElementCssDescriptor(el) {
    if (!el || !el.tagName) {
        return '';
    }

    const tag = String(el.tagName || '').toLowerCase();
    const idPart = el.id ? ('#' + normalizeWhitespace(el.id).replace(/\s+/g, '-')) : '';
    const classPart = Array.from(el.classList || [])
        .map(function (className) {
            return normalizeWhitespace(className || '').replace(/\s+/g, '-');
        })
        .filter(Boolean)
        .slice(0, 3)
        .map(function (className) {
            return '.' + className;
        })
        .join('');
    const role = normalizeWhitespace(el.getAttribute && el.getAttribute('role'));
    return tag + idPart + classPart + (role ? ('[role=' + role + ']') : '');
}

function findMarkedElementIdentityText(el) {
    if (!el || !el.querySelectorAll) {
        return '';
    }

    const ownCandidates = [
        el.getAttribute && el.getAttribute('aria-label'),
        el.getAttribute && el.getAttribute('title'),
        el.getAttribute && el.getAttribute('name'),
        el.getAttribute && el.getAttribute('data-testid'),
        el.getAttribute && el.getAttribute('data-pagelet'),
        el.getAttribute && el.getAttribute('alt'),
    ];

    for (let index = 0; index < ownCandidates.length; index += 1) {
        const candidate = normalizeWhitespace(ownCandidates[index] || '');
        if (candidate && candidate.length >= 3) {
            return clipText(candidate, 80);
        }
    }

    const nodes = el.querySelectorAll('h1,h2,h3,h4,h5,h6,strong,b,[aria-label],[title],[alt],a,button,span,div,p');
    for (let index = 0; index < nodes.length; index += 1) {
        const node = nodes[index];
        const candidate = normalizeWhitespace(node.innerText || node.textContent || node.getAttribute && node.getAttribute('aria-label') || '');
        if (candidate && candidate.length >= 4) {
            return clipText(candidate, 80);
        }
    }

    const fallback = normalizeWhitespace(el.innerText || el.textContent || '');
    return fallback ? clipText(fallback, 80) : '';
}

function buildMarkedElementBadge(el, index) {
    const parts = ['#' + (index + 1)];
    if (markedContextLabelMode !== 'compact') {
        parts.push(getMarkedElementPublicId(index));
    }
    if (markedContextLabelMode === 'detailed') {
        const identity = findMarkedElementIdentityText(el);
        if (identity) {
            parts.push(clipText(identity, 32));
        }
    }
    return parts.join(' · ');
}

function buildMarkedContextHeader(el, index) {
    const parts = [String(index + 1)];
    if (markedContextLabelMode === 'compact') {
        return '[' + parts[0] + ']';
    }

    parts.push(getMarkedElementPublicId(index));
    if (markedContextLabelMode === 'detailed') {
        const descriptor = buildElementCssDescriptor(el);
        const identity = findMarkedElementIdentityText(el);
        if (descriptor) {
            parts.push(descriptor);
        }
        if (identity) {
            parts.push(identity);
        }
    }

    return '[' + parts.join(' · ') + ']';
}

function refreshMarkedElementPresentation() {
    pruneMarkedElements();
    markedElements.forEach(function (el, index) {
        if (!el || !el.classList) {
            return;
        }

        el.classList.add('socialgpt-marked');
        el.setAttribute('data-tn-social-mark-id', getMarkedElementPublicId(index));
        el.setAttribute('data-tn-social-mark-mode', markedContextLabelMode);
        if (markedContextLabelMode === 'compact') {
            el.removeAttribute('data-tn-social-mark-badge');
        } else {
            el.setAttribute('data-tn-social-mark-badge', buildMarkedElementBadge(el, index));
        }
    });
}

function getMarkedContextExpansionLabel() {
    return {
        current: ct('contentScript.extractionCurrent', {}, 'current marked block only'),
        parent: ct('contentScript.extractionParent', {}, 'one parent up'),
        'parent-children': ct('contentScript.extractionParentChildren', {}, 'one parent up + direct child scan'),
        document: window.top === window
            ? ct('contentScript.extractionDocument', {}, 'current page/document text')
            : ct('contentScript.extractionFrameDocument', {}, 'current iframe/frame document text'),
    }[markedContextExpansionMode] || ct('contentScript.extractionCurrent', {}, 'current marked block only');
}

function handleMarkedContextSettingsChanged() {
    refreshMarkedElementPresentation();

    if (!panel) {
        return;
    }

    if (markedElements.length) {
        setPanelContextValue(getCurrentPanelContextValue());
    }
    updatePanelAnchorNote();
    updatePanelComposerActions();
}

function setPanelContextValue(value, options) {
    if (!panel) {
        return;
    }

    const contextField = panel.querySelector('#sgpt-context');
    if (!contextField) {
        return;
    }

    contextField.value = value || '';
    panelContextDirty = !!(options && options.dirty);
}

function updatePanelMarkModeButton(enabled) {
    if (!panel) {
        return;
    }

    const button = panel.querySelector('#sgpt-context-mark');
    if (!button) {
        return;
    }

    button.textContent = enabled
        ? ct('contentScript.stopMarking', {}, 'Stop marking')
        : ct('contentScript.markContext', {}, 'Mark context');
    button.dataset.active = enabled ? 'true' : 'false';
    button.setAttribute('aria-pressed', enabled ? 'true' : 'false');
}

function syncPanelMarkModeState() {
    if (!panel) {
        return Promise.resolve(isClickMarkingActive);
    }

    return safeSendRuntimeMessageWithResponse({type: 'GET_MARK_MODE'}).then(function (response) {
        const enabled = !!(response && response.ok && response.enabled);
        isClickMarkingActive = enabled;
        updatePanelMarkModeButton(enabled);
        updatePanelAnchorNote();
        return enabled;
    });
}

function setPanelMarkMode(enabled) {
    return safeSendRuntimeMessageWithResponse({type: 'SET_MARK_MODE', enabled: !!enabled}).then(function (response) {
        if (!response || !response.ok) {
            const fallbackEnabled = !!enabled;
            isClickMarkingActive = fallbackEnabled;
            updatePanelMarkModeButton(fallbackEnabled);
            updatePanelAnchorNote();
            return {
                ok: true,
                enabled: fallbackEnabled,
                localOnly: true,
                warning: response && response.error ? response.error : 'Background mark-mode sync was unavailable.',
            };
        }

        const nextEnabled = !!(response && response.ok && response.enabled);
        isClickMarkingActive = nextEnabled;
        updatePanelMarkModeButton(nextEnabled);
        updatePanelAnchorNote();
        return response || {ok: false, enabled: false};
    });
}

function refreshPanelContextFromCurrentTarget() {
    if (!panel) {
        return;
    }

    setPanelContextValue(getCurrentPanelContextValue());

    updatePanelAnchorNote();
    updatePanelComposerActions();
}

function resetReplyPanelTransientFields(options) {
    if (!panel) {
        return;
    }

    const settings = options || {};
    const promptField = panel.querySelector('#sgpt-prompt');
    const outputField = panel.querySelector('#sgpt-out');
    const modifierField = panel.querySelector('#sgpt-modifier');

    if (settings.clearMarks) {
        clearMarkedContextSelection();
    }

    if (promptField) {
        promptField.value = '';
    }

    if (outputField) {
        outputField.value = '';
    }

    if (modifierField) {
        modifierField.value = '';
    }

    if (settings.clearContext) {
        activeReplyContextMeta = null;
        setPanelContextValue('');
    } else {
        setPanelContextValue(getCurrentPanelContextValue());
    }

    updatePanelAnchorNote();
    updatePanelComposerActions(settings.statusMessage, settings.statusTone);
}

function stopMarkModeKeepingCurrentContext() {
    isClickMarkingActive = false;
    safeSendRuntimeMessage({type: 'SET_MARK_MODE', enabled: false});
    updatePanelMarkModeButton(false);
    updatePanelAnchorNote();
}

function resetReplyTransientFieldsButKeepContext() {
    if (!panel) {
        return;
    }

    const modifierField = panel.querySelector('#sgpt-modifier');
    if (modifierField) {
        modifierField.value = '';
    }

    stopMarkModeKeepingCurrentContext();
    updatePanelComposerActions();
}

function getReadablePanelText(value, depth) {
    const level = typeof depth === 'number' ? depth : 0;
    if (level > 5) {
        try {
            return JSON.stringify(value, null, 2);
        } catch (error) {
            return '';
        }
    }

    if (value == null) {
        return '';
    }

    if (typeof value === 'string') {
        return value;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
    }

    if (Array.isArray(value)) {
        return value.map(function (item) {
            return getReadablePanelText(item, level + 1);
        }).filter(function (item) {
            return typeof item === 'string' && item.trim();
        }).join('\n\n');
    }

    if (typeof value === 'object') {
        const priorityKeys = ['output', 'text', 'result', 'message', 'content', 'reply', 'response', 'error'];
        for (let i = 0; i < priorityKeys.length; i += 1) {
            const candidate = value[priorityKeys[i]];
            const text = getReadablePanelText(candidate, level + 1);
            if (typeof text === 'string' && text.trim()) {
                return text;
            }
        }

        if (Array.isArray(value.choices)) {
            const choiceText = getReadablePanelText(value.choices, level + 1);
            if (choiceText && choiceText.trim()) {
                return choiceText;
            }
        }

        if (Array.isArray(value.data)) {
            const dataText = getReadablePanelText(value.data, level + 1);
            if (dataText && dataText.trim()) {
                return dataText;
            }
        }

        try {
            return JSON.stringify(value, null, 2);
        } catch (error) {
            return '';
        }
    }

    return String(value);
}

function getReadablePanelErrorText(value) {
    const text = getReadablePanelText(value);
    return text && text.trim() ? text : 'Unknown error';
}

function getRefreshRequestMeta() {
    if (!panel) {
        return {
            modifier: '',
            previousReply: '',
            requestMode: 'refresh',
            loaderLabel: 'Refreshing…',
        };
    }

    const outputField = panel.querySelector('#sgpt-out');
    const modifierField = panel.querySelector('#sgpt-modifier');
    const previousReply = outputField ? outputField.value.trim() : '';
    const modifier = modifierField ? modifierField.value.trim() : '';
    const isRevision = previousReply !== '' && modifier !== '';

    return {
        modifier: isRevision ? modifier : '',
        previousReply: isRevision ? previousReply : '',
        requestMode: isRevision ? 'revise' : 'refresh',
        loaderLabel: isRevision ? 'Applying change…' : 'Refreshing…',
    };
}

function setActiveComposer(node) {
    const nextComposer = node && document.contains(node) ? node : null;
    const composerChanged = nextComposer !== activeComposer;

    activeComposer = nextComposer;
    if (panel) {
        if (isClickMarkingActive) {
            if (composerChanged) {
                panelAttachedComposer = activeComposer;
            }
            if (!markedElements.length && !panelContextDirty) {
                refreshPanelContextFromCurrentTarget();
            } else {
                positionPanelNearComposer();
                updatePanelAnchorNote();
                updatePanelComposerActions();
            }
            positionComposerActionButton();
            return;
        }

        if (composerChanged && panelAttachedComposer !== activeComposer) {
            panelAttachedComposer = activeComposer;
            resetReplyPanelTransientFields({clearMarks: true});
        } else if (!markedElements.length && !panelContextDirty) {
            refreshPanelContextFromCurrentTarget();
        }
        positionPanelNearComposer();
        updatePanelAnchorNote();
        updatePanelComposerActions();
    }
    positionComposerActionButton();
}

function findContextNodeForComposer(node) {
    if (!node) {
        return null;
    }

    const direct = node.closest('[data-ad-preview="message"],[data-ad-comet-preview="message"],[role="article"],article,[role="listitem"]');
    if (direct) {
        return direct;
    }

    let current = node.parentElement;
    while (current) {
        let sibling = current.previousElementSibling;
        while (sibling) {
            const article = sibling.matches && sibling.matches('[role="article"],article,[role="listitem"]')
                ? sibling
                : (sibling.querySelector ? sibling.querySelector('[role="article"],article,[role="listitem"]') : null);
            if (article) {
                return article;
            }
            sibling = sibling.previousElementSibling;
        }
        current = current.parentElement;
    }

    return findFullContextNode(node);
}

function getActiveComposerContext() {
    if (!activeComposer || !document.contains(activeComposer)) {
        activeReplyContextMeta = null;
        return getEmptyContextPrompt();
    }

    const contextNode = findContextNodeForComposer(activeComposer);
    activeReplyContextMeta = {source: 'composer'};
    return contextNode ? getReadableContext(contextNode) : getEmptyContextPrompt();
}

function updatePanelAnchorNote() {
    if (!panel) {
        return;
    }

    const note = panel.querySelector('#sgpt-anchor-note');
    if (!note) {
        return;
    }

    const activeMarks = pruneMarkedElements();

    if (activeMarks.length) {
        let message = ct('contentScript.anchorMarkedBlocks', {
            count: activeMarks.length,
            plural: activeMarks.length === 1 ? '' : 's'
        }, 'Using ' + activeMarks.length + ' marked block' + (activeMarks.length === 1 ? '' : 's') + ' as context.');
        if (markedContextLabelMode !== 'compact') {
            message += ct('contentScript.anchorMarkedIds', {
                ids: activeMarks.map(function (_, index) {
                    return getMarkedElementPublicId(index);
                }).join(', ')
            }, ' IDs: ' + activeMarks.map(function (_, index) {
                return getMarkedElementPublicId(index);
            }).join(', ') + '.');
        }
        if (markedContextExpansionMode !== 'current') {
            message += ct('contentScript.anchorExtraction', {
                label: getMarkedContextExpansionLabel()
            }, ' Extraction: ' + getMarkedContextExpansionLabel() + '.');
        }
        note.textContent = message;
        return;
    }

    if (isClickMarkingActive) {
        note.textContent = ct('contentScript.anchorMarkModeActive', {}, 'Mark mode is active. Click page elements to add or remove context blocks.');
        return;
    }

    if (activeReplyContextMeta && activeReplyContextMeta.replyTarget) {
        note.textContent = ct('contentScript.anchorReplyTarget', {
            target: activeReplyContextMeta.replyTarget
        }, 'Anchored to the current reply field. Reply target detected: ' + activeReplyContextMeta.replyTarget + '.');
        return;
    }

    if (activeReplyContextMeta && activeReplyContextMeta.source === 'generic-thread' && activeReplyContextMeta.threadSize > 1) {
        note.textContent = ct('contentScript.anchorGenericThread', {}, 'Anchored to the current field with nearby conversation context from visible parent/sibling blocks.');
        return;
    }

    note.textContent = activeComposer && document.contains(activeComposer)
        ? ct('contentScript.anchorFocused', {}, 'Anchored to the currently focused text field.')
        : ct('contentScript.anchorFocusOrMark', {}, 'Focus a text field or mark elements to build context.');
}

function ensureComposerActionButton() {
    if (composerActionButton) {
        return composerActionButton;
    }

    composerActionButton = document.createElement('button');
    composerActionButton.id = 'sgpt-composer-action';
    composerActionButton.type = 'button';
    composerActionButton.textContent = ct('contentScript.openToolbox', {}, 'Open Toolbox');
    composerActionButton.style.position = 'fixed';
    composerActionButton.style.zIndex = '2147483646';
    composerActionButton.style.padding = '6px 10px';
    composerActionButton.style.border = 'none';
    composerActionButton.style.borderRadius = '999px';
    composerActionButton.style.background = '#008CBA';
    composerActionButton.style.color = '#fff';
    composerActionButton.style.fontSize = '12px';
    composerActionButton.style.cursor = 'grab';
    composerActionButton.style.userSelect = 'none';
    composerActionButton.style.touchAction = 'none';
    composerActionButton.style.boxShadow = '0 2px 10px rgba(0,0,0,0.18)';
    composerActionButton.style.display = 'none';
    composerActionButton.title = ct('contentScript.composerActionTitle', {}, 'Open Toolbox for the selected field. Drag to move it away. Double-click to reset its position.');
    composerActionButton.addEventListener('click', function () {
        if (composerActionButton.dataset.dragSuppressClick === 'true') {
            return;
        }
        openReplyPanel();
    });
    document.body.appendChild(composerActionButton);
    enableComposerActionButtonDragging(composerActionButton);

    return composerActionButton;
}

function ensureQuickResponseActionButton() {
    if (quickResponseActionButton) {
        return quickResponseActionButton;
    }

    quickResponseActionButton = document.createElement('button');
    quickResponseActionButton.id = 'sgpt-quick-response-action';
    quickResponseActionButton.type = 'button';
    quickResponseActionButton.textContent = ct('contentScript.quickResponse', {}, 'Quick response');
    quickResponseActionButton.style.position = 'fixed';
    quickResponseActionButton.style.zIndex = '2147483645';
    quickResponseActionButton.style.padding = '6px 10px';
    quickResponseActionButton.style.border = 'none';
    quickResponseActionButton.style.borderRadius = '999px';
    quickResponseActionButton.style.background = '#ea580c';
    quickResponseActionButton.style.color = '#fff';
    quickResponseActionButton.style.fontSize = '12px';
    quickResponseActionButton.style.cursor = 'pointer';
    quickResponseActionButton.style.userSelect = 'none';
    quickResponseActionButton.style.boxShadow = '0 2px 10px rgba(0,0,0,0.16)';
    quickResponseActionButton.style.display = 'none';
    quickResponseActionButton.title = ct('contentScript.quickResponseTitle', {}, 'Generate a quick reply using the preset saved in the extension popup.');
    quickResponseActionButton.addEventListener('mousedown', function (event) {
        event.preventDefault();
    });
    quickResponseActionButton.addEventListener('click', function () {
        if (quickResponseActionButton.dataset.dragSuppressClick === 'true') {
            return;
        }
        sendQuickReply();
    });
    document.body.appendChild(quickResponseActionButton);
    enableQuickResponseActionButtonDragging(quickResponseActionButton);

    return quickResponseActionButton;
}

function ensureVerifyActionButton() {
    if (verifyActionButton) {
        return verifyActionButton;
    }

    verifyActionButton = document.createElement('button');
    verifyActionButton.id = 'sgpt-verify-action';
    verifyActionButton.type = 'button';
    verifyActionButton.textContent = ct('contentScript.verifyFact', {}, 'Verify fact');
    verifyActionButton.style.position = 'fixed';
    verifyActionButton.style.zIndex = '2147483646';
    verifyActionButton.style.padding = '5px 10px';
    verifyActionButton.style.border = 'none';
    verifyActionButton.style.borderRadius = '999px';
    verifyActionButton.style.background = '#7c3aed';
    verifyActionButton.style.color = '#fff';
    verifyActionButton.style.fontSize = '12px';
    verifyActionButton.style.cursor = 'pointer';
    verifyActionButton.style.userSelect = 'none';
    verifyActionButton.style.boxShadow = '0 2px 10px rgba(0,0,0,0.18)';
    verifyActionButton.style.display = 'none';
    verifyActionButton.title = ct('contentScript.verifySelectionTitle', {}, 'Fact-check the selected text.');
    verifyActionButton.addEventListener('mousedown', function (event) {
        event.preventDefault();
    });
    verifyActionButton.addEventListener('click', function () {
        if (!verifyActionContext) {
            return;
        }
        const context = verifyActionContext;
        const anchor = verifyActionAnchor;
        verifyActionContext = '';
        verifyActionAnchor = null;
        verifyActionButton.style.display = 'none';
        startFactVerification(context, {preferPanel: false, anchor: anchor});
    });
    document.body.appendChild(verifyActionButton);

    return verifyActionButton;
}

function ensureSelectionToolboxActionButton() {
    if (selectionToolboxActionButton) {
        return selectionToolboxActionButton;
    }

    selectionToolboxActionButton = document.createElement('button');
    selectionToolboxActionButton.id = 'sgpt-selection-toolbox-action';
    selectionToolboxActionButton.type = 'button';
    selectionToolboxActionButton.textContent = ct('contentScript.openToolbox', {}, 'Open Toolbox');
    selectionToolboxActionButton.style.position = 'fixed';
    selectionToolboxActionButton.style.zIndex = '2147483646';
    selectionToolboxActionButton.style.padding = '5px 10px';
    selectionToolboxActionButton.style.border = 'none';
    selectionToolboxActionButton.style.borderRadius = '999px';
    selectionToolboxActionButton.style.background = '#0284c7';
    selectionToolboxActionButton.style.color = '#fff';
    selectionToolboxActionButton.style.fontSize = '12px';
    selectionToolboxActionButton.style.cursor = 'pointer';
    selectionToolboxActionButton.style.userSelect = 'none';
    selectionToolboxActionButton.style.boxShadow = '0 2px 10px rgba(0,0,0,0.18)';
    selectionToolboxActionButton.style.display = 'none';
    selectionToolboxActionButton.title = ct('contentScript.openToolboxSelectionTitle', {}, 'Open Toolbox with the selected text imported as context.');
    selectionToolboxActionButton.addEventListener('mousedown', function (event) {
        event.preventDefault();
    });
    selectionToolboxActionButton.addEventListener('click', function () {
        if (!selectionToolboxContext) {
            return;
        }
        const context = selectionToolboxContext;
        selectionToolboxContext = '';
        selectionToolboxAnchor = null;
        selectionToolboxActionButton.style.display = 'none';
        if (verifyActionButton) {
            verifyActionButton.style.display = 'none';
        }
        verifyActionContext = '';
        verifyActionAnchor = null;
        openReplyPanelWithImportedContext(context, {
            message: ct('contentScript.contextImportedFromSelection', {}, 'Selected text imported into Toolbox.'),
        });
    });
    document.body.appendChild(selectionToolboxActionButton);

    return selectionToolboxActionButton;
}

function ensureVerifyHoverButton() {
    if (verifyHoverButton) {
        return verifyHoverButton;
    }

    verifyHoverButton = document.createElement('button');
    verifyHoverButton.id = 'sgpt-verify-hover';
    verifyHoverButton.type = 'button';
    verifyHoverButton.textContent = ct('contentScript.verifyShort', {}, 'Verify');
    verifyHoverButton.style.position = 'fixed';
    verifyHoverButton.style.zIndex = '2147483646';
    verifyHoverButton.style.padding = '4px 9px';
    verifyHoverButton.style.border = '1px solid #c4b5fd';
    verifyHoverButton.style.borderRadius = '999px';
    verifyHoverButton.style.background = 'rgba(124,58,237,0.96)';
    verifyHoverButton.style.color = '#fff';
    verifyHoverButton.style.fontSize = '11px';
    verifyHoverButton.style.cursor = 'grab';
    verifyHoverButton.style.userSelect = 'none';
    verifyHoverButton.style.touchAction = 'none';
    verifyHoverButton.style.boxShadow = '0 2px 10px rgba(0,0,0,0.14)';
    verifyHoverButton.style.display = 'none';
    verifyHoverButton.title = ct('contentScript.verifyHoverTitle', {}, 'Verify the hovered image or link. Drag to move it away and double-click to reset.');
    verifyHoverButton.addEventListener('mousedown', function (event) {
        event.preventDefault();
    });
    verifyHoverButton.addEventListener('click', function () {
        if (verifyHoverButton.dataset.dragSuppressClick === 'true') {
            return;
        }
        if (!verifyHoverContext) {
            return;
        }

        const context = verifyHoverContext;
        const anchor = verifyHoverAnchor;
        hideVerifyHoverButton(true);
        startFactVerification(context, {
            preferPanel: false,
            anchor: anchor,
            sourceLabel: 'Hover verify',
        });
    });
    document.body.appendChild(verifyHoverButton);
    enableVerifyHoverButtonDragging(verifyHoverButton);

    return verifyHoverButton;
}

function createFactAnchorForNode(node) {
    const targetNode = node ? (findFullContextNode(node) || node) : null;
    const rect = targetNode && targetNode.getBoundingClientRect ? targetNode.getBoundingClientRect() : null;

    return {
        targetNode: targetNode,
        rect: rect ? cloneAnchorRect(rect) : null,
    };
}

function buildSelectionVerificationContext(selectedText, node) {
    const claim = normalizeWhitespace(selectedText || '');
    if (!claim) {
        return '';
    }

    const contextNode = node ? findFullContextNode(node) : null;
    const nearbyContext = contextNode ? normalizeWhitespace(getReadableContext(contextNode)) : '';
    const lines = ['Selected claim:', claim];

    if (nearbyContext) {
        const normalizedClaim = claim.toLowerCase();
        const normalizedContext = nearbyContext.toLowerCase();
        if (normalizedContext !== normalizedClaim && normalizedContext.indexOf(normalizedClaim) === -1) {
            lines.push('Nearby page context (including visible links/media references when available):', clipText(nearbyContext, 2200));
        } else if (/\[(IMG|LINK|VIDEO):/i.test(nearbyContext)) {
            lines.push('Nearby page context (including visible links/media references when available):', clipText(nearbyContext, 2200));
        }
    }

    return lines.join('\n\n');
}

function buildHoverVerificationContext(target) {
    if (!target) {
        return '';
    }

    const snapshot = convertNodeToReadableText(target.cloneNode(true));
    const contextNode = findFullContextNode(target) || target;
    const nearbyContext = normalizeWhitespace(getReadableContext(contextNode));
    const isImage = target.tagName === 'IMG';
    const lines = [isImage ? 'Image or visual to verify:' : 'Link or URL to verify:', snapshot || (isImage ? '[IMG]' : '[LINK]')];

    if (nearbyContext) {
        const normalizedSnapshot = normalizeWhitespace(snapshot).toLowerCase();
        const normalizedContext = nearbyContext.toLowerCase();
        if (!normalizedSnapshot || normalizedContext !== normalizedSnapshot) {
            lines.push('Nearby page context (including visible links/media references when available):', clipText(nearbyContext, 2200));
        }
    }

    return lines.join('\n\n');
}

function findVerifiableHoverTarget(node) {
    if (!node || !node.closest) {
        return null;
    }

    if (node.closest('#sgpt-panel, #sgpt-factbox, #sgpt-verify-action, #sgpt-verify-hover')) {
        return null;
    }

    const image = node.closest('img');
    if (image && image.src) {
        return image;
    }

    const link = node.closest('a[href]');
    if (link && link.href) {
        return link;
    }

    return null;
}

function hideVerifyHoverButton(clearState) {
    if (verifyHoverShowTimer) {
        window.clearTimeout(verifyHoverShowTimer);
        verifyHoverShowTimer = null;
    }
    if (verifyHoverHideTimer) {
        window.clearTimeout(verifyHoverHideTimer);
        verifyHoverHideTimer = null;
    }
    if (verifyHoverButton) {
        verifyHoverButton.style.display = 'none';
    }
    if (clearState) {
        verifyHoverContext = '';
        verifyHoverAnchor = null;
        verifyHoverTarget = null;
    }
}

function showVerifyHoverButtonForTarget(target) {
    if (!target || panel || (window.getSelection && window.getSelection() && !window.getSelection().isCollapsed)) {
        hideVerifyHoverButton(!target);
        return;
    }

    const button = ensureVerifyHoverButton();
    const rect = target.getBoundingClientRect();
    if (!rect || rect.width < 0 || rect.height < 0) {
        hideVerifyHoverButton(true);
        return;
    }

    const context = buildHoverVerificationContext(target);
    if (!context) {
        hideVerifyHoverButton(true);
        return;
    }

    verifyHoverTarget = target;
    verifyHoverContext = context;
    verifyHoverAnchor = createFactAnchorForNode(target);
    button.style.display = 'block';
    positionVerifyHoverButton();
}

function getSelectionVerificationSource() {
    const selection = window.getSelection ? window.getSelection() : null;
    if (!selection || selection.rangeCount < 1 || selection.isCollapsed) {
        return null;
    }

    const range = selection.getRangeAt(0);
    const commonNode = range.commonAncestorContainer && range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
        ? range.commonAncestorContainer
        : (range.commonAncestorContainer ? range.commonAncestorContainer.parentElement : null);
    if (!commonNode || (commonNode.closest && commonNode.closest('#sgpt-panel'))) {
        return null;
    }

    const text = normalizeWhitespace(selection.toString() || '');
    if (!text || text.replace(/[^\p{L}\p{N}]+/gu, '').length < MIN_SELECTION_ACTION_LENGTH) {
        return null;
    }

    const clientRects = range.getClientRects ? Array.from(range.getClientRects()) : [];
    let rect = clientRects.length ? clientRects[clientRects.length - 1] : range.getBoundingClientRect();
    if ((!rect || rect.width <= 0 || rect.height <= 0) && commonNode && typeof commonNode.getBoundingClientRect === 'function') {
        rect = commonNode.getBoundingClientRect();
    }
    if (!rect || rect.width <= 0 || rect.height <= 0) {
        return null;
    }

    return {
        context: buildSelectionVerificationContext(text, commonNode),
        anchor: Object.assign(createFactAnchorForNode(commonNode), {
            rect: cloneAnchorRect(rect),
        }),
        right: Math.round(rect.right),
        top: Math.round(rect.top - 36),
    };
}

function schedulePositionVerifyActionButton(delayMs) {
    if (selectionActionButtonTimer) {
        window.clearTimeout(selectionActionButtonTimer);
    }

    selectionActionButtonTimer = window.setTimeout(function () {
        selectionActionButtonTimer = null;
        positionVerifyActionButton();
    }, typeof delayMs === 'number' ? delayMs : 30);
}

function positionVerifyActionButton() {
    const button = ensureVerifyActionButton();
    const toolboxButton = ensureSelectionToolboxActionButton();
    if (panel) {
        button.style.display = 'none';
        verifyActionContext = '';
        toolboxButton.style.display = 'none';
        selectionToolboxContext = '';
        return;
    }

    const source = getSelectionVerificationSource();
    if (!source) {
        button.style.display = 'none';
        verifyActionContext = '';
        toolboxButton.style.display = 'none';
        selectionToolboxContext = '';
        if (verifyHoverTarget) {
            showVerifyHoverButtonForTarget(verifyHoverTarget);
        }
        return;
    }

    hideVerifyHoverButton(false);
    verifyActionContext = source.context;
    verifyActionAnchor = source.anchor || null;
    selectionToolboxContext = source.context;
    selectionToolboxAnchor = source.anchor || null;

    toolboxButton.style.display = 'block';
    button.style.display = 'block';

    const verifyRect = getButtonRectForPlacement(button, 92, 30);
    const toolboxRect = getButtonRectForPlacement(toolboxButton, 116, 30);
    const spacing = 8;
    const verifyLeft = source.right - verifyRect.width;
    const toolboxLeft = verifyLeft - spacing - toolboxRect.width;

    setComposerActionButtonCoordinates(toolboxButton, toolboxLeft, source.top);
    setComposerActionButtonCoordinates(button, verifyLeft, source.top);
}

function positionComposerActionButton() {
    const button = ensureComposerActionButton();
    if (composerActionButtonDragState && composerActionButtonDragState.dragging) {
        return;
    }

     if (panel) {
        button.style.display = 'none';
        const quickButton = ensureQuickResponseActionButton();
        quickButton.style.display = 'none';
        return;
    }

    if (!activeComposer || !document.contains(activeComposer)) {
        button.style.display = 'none';
        const quickButton = ensureQuickResponseActionButton();
        quickButton.style.display = 'none';
        return;
    }

    const anchor = getComposerActionButtonAnchorPosition(button, 'above');
    if (!anchor) {
        button.style.display = 'none';
        return;
    }

    button.style.display = 'block';
    const left = anchor.left + (composerActionButtonDragOffset ? composerActionButtonDragOffset.left : 0);
    const top = anchor.top + (composerActionButtonDragOffset ? composerActionButtonDragOffset.top : 0);
    setComposerActionButtonCoordinates(button, left, top);
    positionQuickResponseActionButton();
}

function positionQuickResponseActionButton() {
    const button = ensureQuickResponseActionButton();
    if (quickResponseActionButtonDragState && quickResponseActionButtonDragState.dragging) {
        return;
    }

    if (panel || !activeComposer || !document.contains(activeComposer)) {
        button.style.display = 'none';
        return;
    }

    const anchor = getQuickResponseActionButtonAnchorPosition();
    if (!anchor) {
        button.style.display = 'none';
        return;
    }

    let left = anchor.left;
    let top = anchor.top;

    if (quickResponseActionButtonDragOffset) {
        left = anchor.left + quickResponseActionButtonDragOffset.left;
        top = anchor.top + quickResponseActionButtonDragOffset.top;
    }

    button.style.display = 'block';
    setComposerActionButtonCoordinates(button, left, top);
}

function setPanelCoordinates(left, top) {
    if (!panel) {
        return;
    }

    const clamped = clampFixedPosition(left, top, panel, 12);
    panel.style.left = Math.round(clamped.left) + 'px';
    panel.style.top = Math.round(clamped.top) + 'px';
    panel.style.right = 'auto';
    panel.style.bottom = 'auto';
}

function enableReplyPanelDragging(handle, box) {
    if (!handle || !box || handle.dataset.dragReady === 'true') {
        return;
    }

    handle.dataset.dragReady = 'true';

    handle.addEventListener('pointerdown', function (event) {
        if (event.button !== 0 || !box.isConnected || (event.target && event.target.closest && event.target.closest('#sgpt-close'))) {
            return;
        }

        const rect = box.getBoundingClientRect();
        panelDragState = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            offsetX: event.clientX - rect.left,
            offsetY: event.clientY - rect.top,
            dragging: false,
        };

        if (typeof handle.setPointerCapture === 'function') {
            try {
                handle.setPointerCapture(event.pointerId);
            } catch (error) {
            }
        }
    });

    handle.addEventListener('keydown', function (event) {
        if (event.key !== 'Escape') {
            return;
        }

        panelManualPosition = null;
        positionPanelNearComposer();
        event.preventDefault();
    });

    handle.addEventListener('pointermove', function (event) {
        if (!panelDragState || panelDragState.pointerId !== event.pointerId || !panel || !panel.isConnected) {
            return;
        }

        const distance = Math.max(Math.abs(event.clientX - panelDragState.startX), Math.abs(event.clientY - panelDragState.startY));
        if (!panelDragState.dragging && distance < 4) {
            return;
        }

        panelDragState.dragging = true;
        handle.style.cursor = 'grabbing';
        setPanelCoordinates(
            event.clientX - panelDragState.offsetX,
            event.clientY - panelDragState.offsetY
        );
    });

    function finishReplyPanelDrag(event) {
        if (!panelDragState) {
            return;
        }

        if (event && panelDragState.pointerId != null && panelDragState.pointerId !== event.pointerId) {
            return;
        }

        if (panelDragState.dragging && panel && panel.isConnected) {
            const rect = panel.getBoundingClientRect();
            panelManualPosition = {
                left: Math.round(rect.left),
                top: Math.round(rect.top),
            };
        }

        if (event && typeof handle.releasePointerCapture === 'function') {
            try {
                if (handle.hasPointerCapture && handle.hasPointerCapture(event.pointerId)) {
                    handle.releasePointerCapture(event.pointerId);
                }
            } catch (error) {
            }
        }

        handle.style.cursor = 'grab';
        panelDragState = null;
        positionPanelNearComposer();
    }

    handle.addEventListener('pointerup', finishReplyPanelDrag);
    handle.addEventListener('pointercancel', finishReplyPanelDrag);
}

function positionPanelNearComposer() {
    if (!panel) return;
    if (panelDragState && panelDragState.dragging) {
        return;
    }

    if (!activeComposer || !document.contains(activeComposer)) {
        activeComposer = findEditableTarget(document.activeElement);
    }

    const minMargin = 12;
    const panelWidth = Math.min(440, Math.max(320, window.innerWidth - (minMargin * 2)));
    panel.style.width = panelWidth + 'px';

    if (panelManualPosition) {
        setPanelCoordinates(panelManualPosition.left, panelManualPosition.top);
        return;
    }

    if (!activeComposer) {
        panel.style.width = panelWidth + 'px';
        panel.style.left = 'auto';
        panel.style.top = 'auto';
        panel.style.right = '16px';
        panel.style.bottom = '16px';
        return;
    }

    const rect = activeComposer.getBoundingClientRect();
    const spacing = 12;

    const measuredHeight = Math.min(panel.offsetHeight || 420, Math.max(220, window.innerHeight - (minMargin * 2)));
    let left = rect.right + spacing;
    if (left + panelWidth > window.innerWidth - minMargin) {
        left = rect.left - panelWidth - spacing;
    }
    if (left < minMargin) {
        left = Math.max(minMargin, Math.min(rect.left, window.innerWidth - panelWidth - minMargin));
    }

    let top = rect.top;
    const maxTop = Math.max(minMargin, window.innerHeight - measuredHeight - minMargin);
    if (top > maxTop) {
        top = maxTop;
    }
    if (top < minMargin) {
        top = minMargin;
    }

    setPanelCoordinates(left, top);
    positionComposerActionButton();
}

function isFacebookUiNoiseLine(line) {
    const lowered = normalizeWhitespace(line).toLowerCase();
    if (!lowered) {
        return true;
    }

    if (FACEBOOK_REPLY_NOISE_LINES.indexOf(lowered) !== -1) {
        return true;
    }

    if (lowered.indexOf('reply as ') === 0 || lowered.indexOf('svara som ') === 0 || lowered.indexOf('answer as ') === 0) {
        return true;
    }

    if (lowered.indexOf('facebook.com') !== -1 || lowered.indexOf('_cft_') !== -1 || lowered.indexOf('/?') !== -1) {
        return true;
    }

    if (/^\d+\s*(s|min|m|h|d|w|v)$/.test(lowered) || /^\d+\s*(likes?|replies?)$/.test(lowered)) {
        return true;
    }

    return false;
}

function extractFacebookMeaningfulLines(node) {
    if (!node) {
        return [];
    }

    const clone = node.cloneNode(true);
    Array.from(clone.querySelectorAll('script,style,form,input,textarea,button,svg,img,video,iframe,[aria-hidden="true"]')).forEach(function (el) {
        el.remove();
    });

    Array.from(clone.querySelectorAll('a')).forEach(function (anchor) {
        anchor.textContent = normalizeWhitespace(anchor.textContent || '');
        anchor.removeAttribute('href');
    });

    return String(clone.innerText || '')
        .split(/\n+/)
        .map(function (line) {
            return normalizeWhitespace(line);
        })
        .filter(function (line) {
            return !!line && !isFacebookUiNoiseLine(line);
        });
}

function extractFacebookAuthorFromNode(node) {
    if (!node || !node.querySelectorAll) {
        return '';
    }

    const candidates = node.querySelectorAll('h2, h3, strong, a[role="link"], span[dir="auto"]');
    for (let i = 0; i < candidates.length; i += 1) {
        const text = normalizeWhitespace(candidates[i].textContent || '');
        if (!text || text.length < 2 || text.length > 80 || isFacebookUiNoiseLine(text)) {
            continue;
        }

        return text;
    }

    return '';
}

function extractFacebookCommentRecordFromNode(node) {
    if (!node) {
        return null;
    }

    const lines = extractFacebookMeaningfulLines(node);
    if (!lines.length) {
        return null;
    }

    const authorName = extractFacebookAuthorFromNode(node) || lines[0] || '';
    const bodyLines = lines.filter(function (line, index) {
        return !(index === 0 && line === authorName);
    });
    const bodyText = normalizeWhitespace(bodyLines.join('\n'));

    if (!authorName || !bodyText) {
        return null;
    }

    return {
        author_name: authorName,
        body_text: bodyText,
        signature: buildFacebookCommentSignature(authorName, bodyText),
    };
}

function findFacebookCommentNodeForComposer(node) {
    if (!node) {
        return null;
    }

    const direct = findContextNodeForComposer(node);
    if (direct && extractFacebookCommentRecordFromNode(direct)) {
        return direct;
    }

    let current = node.parentElement;
    while (current) {
        let sibling = current.previousElementSibling;
        while (sibling) {
            const article = sibling.matches && sibling.matches('[role="article"],article,[role="listitem"]')
                ? sibling
                : (sibling.querySelector ? sibling.querySelector('[role="article"],article,[role="listitem"]') : null);
            if (article && extractFacebookCommentRecordFromNode(article)) {
                return article;
            }
            sibling = sibling.previousElementSibling;
        }
        current = current.parentElement;
    }

    return direct;
}

function collectFacebookVisibleThreadRecords(targetNode) {
    if (!targetNode || !targetNode.parentElement) {
        return [];
    }

    const records = [];
    const seen = new Set();
    const children = Array.from(targetNode.parentElement.children);

    for (let i = 0; i < children.length; i += 1) {
        const child = children[i];
        const article = child === targetNode
            ? child
            : (child.matches && child.matches('[role="article"],article,[role="listitem"]') ? child : (child.querySelector ? child.querySelector('[role="article"],article,[role="listitem"]') : null));

        if (!article) {
            continue;
        }

        const record = extractFacebookCommentRecordFromNode(article);
        if (!record || seen.has(record.signature)) {
            continue;
        }

        seen.add(record.signature);
        records.push(record);

        if (article === targetNode) {
            break;
        }
    }

    return records.slice(-6);
}

function findCachedFacebookThreadRecords(targetRecord) {
    if (!targetRecord) {
        return [];
    }

    const matched = recentFacebookCommentEntries.find(function (entry) {
        return entry.signature === targetRecord.signature;
    });

    if (!matched || !matched.batch_id) {
        return [];
    }

    const seen = new Set();
    return recentFacebookCommentEntries
        .filter(function (entry) {
            return entry.batch_id === matched.batch_id;
        })
        .reverse()
        .filter(function (entry) {
            if (seen.has(entry.signature)) {
                return false;
            }
            seen.add(entry.signature);
            return true;
        })
        .slice(0, 8)
        .map(function (entry) {
            return {
                author_name: entry.author_name,
                body_text: entry.body_text,
                signature: entry.signature,
            };
        });
}

function buildFacebookReplyContextFromComposer(node) {
    const targetNode = findFacebookCommentNodeForComposer(node);
    const targetRecord = extractFacebookCommentRecordFromNode(targetNode);
    if (!targetRecord) {
        return null;
    }

    const visibleRecords = collectFacebookVisibleThreadRecords(targetNode);
    const cachedRecords = findCachedFacebookThreadRecords(targetRecord);
    const merged = [];
    const seen = new Set();

    visibleRecords.concat(cachedRecords).forEach(function (record) {
        if (!record || seen.has(record.signature)) {
            return;
        }

        seen.add(record.signature);
        merged.push(record);
    });

    const lines = [];
    lines.push('Reply target: ' + targetRecord.author_name);
    lines.push('Target comment: ' + targetRecord.author_name + ': ' + targetRecord.body_text);
    if (merged.length) {
        lines.push('Thread context:');
        merged.forEach(function (record) {
            lines.push('- ' + record.author_name + ': ' + record.body_text);
        });
    }

    return {
        source: 'facebook-thread',
        replyTarget: targetRecord.author_name,
        threadSize: merged.length,
        text: lines.join('\n'),
    };
}

function buildGenericContextSnippet(node) {
    if (!node) {
        return '';
    }

    return normalizeWhitespace(getReadableContext(node));
}

function collectGenericVisibleThreadBlocks(targetNode) {
    if (!targetNode || !targetNode.parentElement) {
        return [];
    }

    const siblings = Array.from(targetNode.parentElement.children);
    const targetIndex = siblings.indexOf(targetNode);
    if (targetIndex === -1) {
        return [];
    }

    const records = [];
    const seen = new Set();

    for (let index = Math.max(0, targetIndex - 6); index <= targetIndex; index += 1) {
        const sibling = siblings[index];
        const block = sibling === targetNode
            ? targetNode
            : (sibling.matches && sibling.matches('[role="article"],article,[role="listitem"]')
                ? sibling
                : (sibling.querySelector ? sibling.querySelector('[role="article"],article,[role="listitem"]') : sibling));
        const text = buildGenericContextSnippet(block);

        if (!text || text.length < 20 || seen.has(text)) {
            continue;
        }

        seen.add(text);
        records.push(clipText(text, 500));
    }

    return records;
}

function buildGenericReplyContextFromComposer(node) {
    const targetNode = findContextNodeForComposer(node) || findFullContextNode(node);
    if (!targetNode) {
        return null;
    }

    const threadBlocks = collectGenericVisibleThreadBlocks(targetNode);
    const currentBlock = buildGenericContextSnippet(targetNode);
    if (!threadBlocks.length && !currentBlock) {
        return null;
    }

    const lines = [];
    const previousBlocks = threadBlocks.slice(0, Math.max(0, threadBlocks.length - 1));

    if (previousBlocks.length) {
        lines.push('Earlier visible context:');
        previousBlocks.forEach(function (entry) {
            lines.push('- ' + entry);
        });
    }

    lines.push('Current target block:');
    lines.push(threadBlocks.length ? threadBlocks[threadBlocks.length - 1] : clipText(currentBlock, 500));

    return {
        source: 'generic-thread',
        threadSize: previousBlocks.length + 1,
        text: lines.join('\n'),
    };
}

function getCurrentPanelContextValue() {
    const activeMarks = pruneMarkedElements();
    refreshMarkedElementPresentation();

    if (activeMarks.length) {
        activeReplyContextMeta = {
            source: 'marked',
            markedCount: activeMarks.length,
            markedLabelMode: markedContextLabelMode,
            markedExpansionMode: markedContextExpansionMode,
        };
        return activeMarks.map(function (el, i) {
            return buildMarkedContextHeader(el, i) + '\n' + getReadableContext(el);
        }).join('\n\n---\n\n');
    }

    if (isFacebookPage() && activeComposer && document.contains(activeComposer)) {
        const facebookReplyContext = buildFacebookReplyContextFromComposer(activeComposer);
        if (facebookReplyContext && facebookReplyContext.text) {
            activeReplyContextMeta = facebookReplyContext;
            return facebookReplyContext.text;
        }
    }

    if (activeComposer && document.contains(activeComposer)) {
        const genericReplyContext = buildGenericReplyContextFromComposer(activeComposer);
        if (genericReplyContext && genericReplyContext.text) {
            activeReplyContextMeta = genericReplyContext;
            return genericReplyContext.text;
        }
    }

    return getActiveComposerContext();
}

// ---------------------------------------------
// EXTRACT READABLE CONTEXT (GENERIC, WITH MEDIA)
// ---------------------------------------------
function getReadableContext(el) {
    const parts = [];
    const expansionRoot = markedContextExpansionMode === 'document'
        ? (document.body || document.documentElement || el)
        : (markedContextExpansionMode === 'current'
            ? el
            : ((el && el.parentElement) ? el.parentElement : el));
    const primaryNode = expansionRoot || el;
    const primaryText = primaryNode ? convertNodeToReadableText(primaryNode.cloneNode(true)) : '';

    // 1. Include the selected element or the requested parent-expansion root
    if (markedContextExpansionMode === 'document') {
        parts.push(window.top === window ? '[Visible page/document text]' : '[Visible iframe/frame document text]');
        parts.push(clipText(primaryText, 12000));
        return parts.join('\n\n');
    }

    parts.push(primaryNode !== el ? clipText(primaryText, 2600) : primaryText);

    if (markedContextExpansionMode === 'parent-children' && primaryNode && primaryNode.children && primaryNode.children.length) {
        const siblingSummaries = [];
        const children = Array.from(primaryNode.children);
        for (let index = 0; index < children.length; index += 1) {
            const child = children[index];
            if (!child || child === el || child.closest && child.closest('#sgpt-panel, #sgpt-factbox, #sgpt-verify-action, #sgpt-verify-hover')) {
                continue;
            }

            const childText = normalizeWhitespace(convertNodeToReadableText(child.cloneNode(true)));
            if (!childText) {
                continue;
            }

            const childDescriptor = buildElementCssDescriptor(child);
            siblingSummaries.push((childDescriptor ? (childDescriptor + ': ') : '') + clipText(childText, 220));
            if (siblingSummaries.length >= 4) {
                break;
            }
        }

        if (siblingSummaries.length) {
            parts.push('[Nearby child blocks]');
            parts.push(siblingSummaries.map(function (entry) {
                return '- ' + entry;
            }).join('\n'));
        }
    }

    // 2. Look for outer container used by Facebook
    const fbContainer = primaryNode && primaryNode.closest ? primaryNode.closest('[data-ad-preview="message"]') : null;
    if (fbContainer && fbContainer.parentElement) {
        const siblings = Array.from(fbContainer.parentElement.children);
        let found = false;
        for (const sib of siblings) {
            if (sib === fbContainer) {
                found = true;
                continue;
            }
            if (!found) continue;
            if (containsMedia(sib)) {
                parts.push('[Attached media]');
                parts.push(convertNodeToReadableText(sib.cloneNode(true)));
            }
        }
    }

    // 3. Background-image elements
    const bgImages = extractBackgroundImagesAround(primaryNode || el);
    if (bgImages.length > 0) {
        parts.push('[Background images]');
        parts.push(...bgImages);
    }

    return parts.join('\n\n');
}

function containsMedia(node) {
    return node.querySelector('img, video, iframe, picture, svg, audio, embed, object, a[href]') !== null;
}

function convertNodeToReadableText(node) {
    // Handle images
    const imgs = node.querySelectorAll('img');
    for (const img of imgs) {
        const isEmoji = img.src.includes('emoji.php');
        const altText = img.alt && typeof img.alt.trim === 'function' ? img.alt.trim() : '';
        const label = isEmoji
            ? img.alt || '🖼️'
            : `[IMG: ${altText || img.src || 'image'}]`;
        const span = document.createElement('span');
        span.textContent = label;
        img.replaceWith(span);
    }

    // Handle videos/embeds
    const videos = node.querySelectorAll('video, iframe, embed, object');
    for (const vid of videos) {
        const label = `[VIDEO: ${vid.src || 'embedded video'}]`;
        const span = document.createElement('span');
        span.textContent = label;
        vid.replaceWith(span);
    }

    // Handle links
    const links = node.querySelectorAll('a[href]');
    for (const a of links) {
        const rawText = a.textContent && typeof a.textContent.trim === 'function' ? a.textContent.trim() : '';
        const text = rawText ? rawText.replace(/\s+/g, ' ') : 'link';
        const url = a.href;
        const label = /facebook\.com/i.test(url || '') && text && text !== 'link'
            ? text
            : `[LINK: ${text} (${url})]`;
        const span = document.createElement('span');
        span.textContent = label;
        a.replaceWith(span);
    }

    return node.innerText.trim();
}

function extractBackgroundImagesAround(el) {
    const found = [];
    const closestMessage = el.closest('[data-ad-preview="message"]');
    const scope = (closestMessage ? closestMessage.parentElement : null) || el.parentElement;
    if (!scope) return found;

    const nodes = scope.querySelectorAll('*');
    for (const node of nodes) {
        const bg = window.getComputedStyle(node).getPropertyValue('background-image');
        const match = bg ? bg.match(/url\(["']?(.*?)["']?\)/) : null;
        if (match && match[1] && !match[1].includes('emoji.php')) {
            found.push(`[IMG: ${match[1]}]`);
        }
    }

    return found;
}

function updateAdminActivitiesControl() {
    if (!adminActivitiesControl) {
        return;
    }

    const snapshot = getAdminReporterSnapshot();
    const countersSnapshot = snapshot.totals || {};

    const toggle = adminActivitiesControl.querySelector('[data-role="toggle"]');
    const state = adminActivitiesControl.querySelector('[data-role="state"]');
    const counters = adminActivitiesControl.querySelector('[data-role="counters"]');
    const monitor = adminActivitiesControl.querySelector('[data-role="monitor"]');
    const recent = adminActivitiesControl.querySelector('[data-role="recent"]');
    const debugWrap = adminActivitiesControl.querySelector('[data-role="debug-wrap"]');
    const detected = adminActivitiesControl.querySelector('[data-role="detected"]');
    const bootstrap = adminActivitiesControl.querySelector('[data-role="bootstrap"]');
    const bootstrapMonitor = adminActivitiesControl.querySelector('[data-role="bootstrap-monitor"]');

    if (toggle) {
        toggle.textContent = adminIngestEnabled ? 'Disable activity statistics' : 'Enable activity statistics';
        toggle.style.background = adminIngestEnabled ? '#dc2626' : '#059669';
    }

    if (state) {
        state.textContent = adminLastStatusText;
    }

    if (counters) {
        counters.textContent = 'Detected: ' + (countersSnapshot.detected || 0)
            + ' · Pending: ' + (countersSnapshot.pending || 0)
            + ' · Sending: ' + (countersSnapshot.sending || 0)
            + ' · Failed: ' + (countersSnapshot.failed || 0)
            + ' · Submitted: ' + (countersSnapshot.sent || 0)
            + ' · Duplicates ignored: ' + (countersSnapshot.duplicates_ignored || 0);
        counters.style.display = adminDebugEnabled ? 'block' : 'none';
    }

    if (debugWrap) {
        debugWrap.style.display = adminDebugEnabled ? 'block' : 'none';
    }

    if (monitor) {
        if (!adminLastNetworkEventAt) {
            monitor.textContent = networkMonitorInjected
                ? 'Monitor injected. Waiting for Facebook XHR/fetch activity...'
                : 'Monitor not injected yet.';
            monitor.style.color = '#92400e';
        } else {
            const ageSeconds = Math.max(0, Math.round((Date.now() - adminLastNetworkEventAt) / 1000));
            monitor.textContent = 'Monitor active · ' + adminNetworkEventsSeen + ' events seen · ' + adminInterestingNetworkEventsSeen + ' interesting · last seen ' + (ageSeconds <= 1 ? 'just now' : (ageSeconds + 's ago'));
            monitor.style.color = '#065f46';
        }
    }

    if (detected) {
        const latestDetected = sortAdminEntriesByRecency(snapshot.reportable_entries || []).slice(0, 5);
        if (!latestDetected.length) {
            detected.innerHTML = '<div style="color:#64748b;">No reportable admin-log entries detected yet.</div>';
        } else {
            detected.innerHTML = latestDetected.map(function (entry) {
                const labelParts = [entry.actor_name || 'Unknown actor'];
                if (entry.action) {
                    labelParts.push('→ ' + entry.action);
                } else if (entry.handled_outcome) {
                    labelParts.push('→ ' + entry.handled_outcome);
                }
                if (entry.target_name) {
                    labelParts.push('(' + entry.target_name + ')');
                }

                return '<div style="padding:6px 0; border-top:1px solid rgba(148,163,184,0.2);">'
                    + '<div style="font-weight:600; color:#0f766e;">' + escapeHtml(labelParts.join(' ')) + '</div>'
                    + '<div style="margin-top:2px; color:#64748b;">state=' + escapeHtml(entry.state || 'queued') + (entry.occurred_at ? ' · fb_time=' + escapeHtml(entry.occurred_at) : '') + '</div>'
                    + '<div style="margin-top:3px; color:#475569;">' + escapeHtml(clipText(entry.action_text || '', 150)) + '</div>'
                    + '</div>';
            }).join('');
        }
    }

    if (recent) {
        if (!recentAdminNetworkEvents.length) {
            recent.innerHTML = '<div style="color:#64748b;">No captured XHR/fetch events yet.</div>';
        } else {
            recent.innerHTML = recentAdminNetworkEvents.map(function (entry) {
                const preview = entry.response_preview || entry.request_preview;
                return '<div style="padding:6px 0; border-top:1px solid rgba(148,163,184,0.25);">'
                    + '<div style="font-weight:600; color:' + (entry.interesting ? '#0f766e' : '#334155') + ';">' + escapeHtml(entry.summary) + '</div>'
                    + '<div style="color:#64748b; margin-top:2px;">' + escapeHtml(entry.pathname || entry.url || '(unknown url)') + '</div>'
                    + (entry.detected_count ? '<div style="margin-top:3px; color:#0f766e; font-weight:600;">Detections: ' + escapeHtml(String(entry.detected_count)) + '</div>' : '')
                    + (entry.detected_preview && entry.detected_preview.length ? '<div style="margin-top:3px; color:#475569;">' + escapeHtml(entry.detected_preview.join(' · ')) + '</div>' : '')
                    + (preview ? '<div style="margin-top:3px; color:#475569;">' + escapeHtml(preview) + '</div>' : '')
                    + '</div>';
            }).join('');
        }
    }

    if (bootstrap) {
        bootstrap.innerHTML = renderBootstrapAdminScanDebug(latestBootstrapAdminScanDebug, 'Bootstrap body-read debug (content script)', 'No bootstrap body-read scan has run yet.');
    }

    if (bootstrapMonitor) {
        bootstrapMonitor.innerHTML = renderBootstrapAdminScanDebug(latestInjectedBootstrapAdminScanDebug, 'Bootstrap body-read debug (injected monitor)', 'No injected monitor bootstrap scan has run yet.');
    }
}

function ensureAdminActivitiesControl() {
    if (!isFacebookAdminActivitiesPage() || !adminFeatureEnabled) {
        if (adminActivitiesControl) {
            adminDebugConsoleInfo('[TN Social Tools] Removing admin_activities overlay because the route no longer matches or the feature is disabled.', {
                version: EXTENSION_VERSION,
                url: location.href,
                feature_enabled: adminFeatureEnabled,
            });
            adminActivitiesControl.remove();
            adminActivitiesControl = null;
        }
        return null;
    }

    if (adminActivitiesControl) {
        return adminActivitiesControl;
    }

    const control = document.createElement('div');
    control.id = 'sgpt-admin-activities-control';
    control.style.position = 'fixed';
    control.style.top = '16px';
    control.style.right = '16px';
    control.style.zIndex = '2147483645';
    control.style.width = '320px';
    control.style.padding = '10px';
    control.style.borderRadius = '10px';
    control.style.border = '1px solid rgba(0,0,0,0.12)';
    control.style.background = 'rgba(255,255,255,0.96)';
    control.style.boxShadow = '0 6px 18px rgba(0,0,0,0.15)';
    control.style.fontFamily = 'system-ui,sans-serif';
    control.style.fontSize = '12px';
    control.innerHTML = [
        '<div data-role="drag-handle" style="display:flex; justify-content:space-between; gap:8px; align-items:center; margin-bottom:6px; cursor:move; user-select:none;">',
        '<div style="font-weight:700;">Facebook admin activity statistics</div>',
        '<div style="font-size:11px; color:#64748b;">drag</div>',
        '</div>',
        '<div data-role="state" style="margin-bottom:8px; color:#334155; font-weight:600;">Passive activity detection is ready. Statistics are off.</div>',
        '<div style="display:flex; gap:8px; flex-wrap:wrap;">',
        '<button type="button" data-role="toggle" style="border:none; border-radius:999px; padding:6px 10px; color:#fff; cursor:pointer;">Enable activity statistics</button>',
        '</div>',
        '<div style="margin-top:10px; font-weight:600; color:#334155;">Reportable if enabled</div>',
        '<div data-role="detected" style="margin-top:4px; font-size:11px; line-height:1.35; color:#475569; max-height:150px; overflow:auto;">No reportable admin-log entries detected yet.</div>',
        '<div data-role="debug-wrap" style="display:none; margin-top:10px;">',
        '<div data-role="counters" style="margin-bottom:8px; color:#64748b;">Detected: 0 · Pending: 0 · Submitted: 0</div>',
        '<div data-role="monitor" style="margin-bottom:8px; padding:8px; border-radius:8px; border:1px solid rgba(59,130,246,0.25); background:#eff6ff; color:#1d4ed8; font-weight:600;">Monitor injected. Waiting for Facebook XHR/fetch activity...</div>',
        '<div style="margin-top:10px; font-weight:600; color:#334155;">Bootstrap body-read via content script</div>',
        '<div data-role="bootstrap" style="margin-top:4px; font-size:11px; line-height:1.35; color:#475569; max-height:220px; overflow:auto;">No bootstrap body-read scan has run yet.</div>',
        '<div style="margin-top:10px; font-weight:600; color:#334155;">Bootstrap body-read via injected monitor</div>',
        '<div data-role="bootstrap-monitor" style="margin-top:4px; font-size:11px; line-height:1.35; color:#475569; max-height:220px; overflow:auto;">No injected monitor bootstrap scan has run yet.</div>',
        '<div style="margin-top:10px; font-weight:600; color:#334155;">Recent monitor events (XHR/fetch/bootstrap)</div>',
        '<div data-role="recent" style="margin-top:4px; font-size:11px; line-height:1.35; color:#475569; max-height:180px; overflow:auto;">No captured XHR/fetch events yet.</div>',
        '</div>'
    ].join('');

    control.querySelector('[data-role="toggle"]').addEventListener('click', async function () {
        const settings = await getToolsRuntimeSettings();
        if (!settings.toolsApiToken) {
            adminLastStatusText = 'Missing Tools bearer token. Save it in the popup first.';
            updateAdminActivitiesControl();
            return;
        }

        if (adminIngestEnabled) {
            disableAdminActivityCollection('Activity statistics disabled. This tab queue was cleared.', {
                reason: 'manual-disable',
                auto_disabled: false,
            });
            return;
        }

        adminIngestEnabled = true;
        adminLastStatusText = 'Activity statistics enabled for this exact Facebook URI. Changing Facebook location will auto-disable and clear the queue.';
        updateAdminActivitiesControl();
        debugLog({level: 'info', category: 'facebook-admin-ingest', message: 'Facebook admin ingest toggled.', meta: {enabled: adminIngestEnabled, url: location.href}});
        scheduleAdminActivitiesScan('manual-enable');
        scheduleAdminActivitiesBootstrapWarmup('manual-enable');
    });

    document.body.appendChild(control);
    adminActivitiesControl = control;
    enableAdminActivitiesControlDragging(control);
    updateAdminActivitiesControl();

    adminDebugConsoleInfo('[TN Social Tools] admin_activities overlay mounted.', {
        version: EXTENSION_VERSION,
        url: location.href,
    });

    return control;
}

function injectNetworkMonitor() {
    if (networkMonitorInjected || !window.TNNetworksPlatformRegistry) {
        return;
    }

    const platform = window.TNNetworksPlatformRegistry.getActive(location.hostname);
    if (!platform || !platform.enableNetworkCapture) {
        return;
    }

    if (platform.id === 'soundcloud') {
        networkMonitorInjected = !!soundCloudDirectHookReady;
        if (isSupportedSoundCloudInsightsPage()) {
            setSoundCloudStatusText(soundCloudDirectHookReady
                ? 'SoundCloud insights page detected. Dedicated GraphQL hook is ready and waiting for captures...'
                : 'SoundCloud insights page detected. Waiting for dedicated GraphQL hook...');
            reportSoundCloudPageStatus();
        }
        return;
    }

    if (platform.id === 'facebook' && !adminFeatureEnabled) {
        return;
    }

    if (platform.id === 'soundcloud' && typeof platform.isSupportedPage === 'function' && !platform.isSupportedPage(location)) {
        setSoundCloudStatusText('Current SoundCloud page is not a supported insights / for-artists view.');
        reportSoundCloudPageStatus();
        return;
    }

    const script = document.createElement('script');
    script.src = safeRuntimeGetURL('js/injected/network-monitor.js');
    if (!script.src) {
        return;
    }
    script.onload = function () { this.remove(); };
    (document.head || document.documentElement).appendChild(script);
    networkMonitorInjected = true;

    adminDebugConsoleInfo('[TN Social Tools] In-page fetch/XHR monitor injected.', {
        version: EXTENSION_VERSION,
        url: location.href,
    });

    if (isSoundCloudPage()) {
        setSoundCloudStatusText('Supported SoundCloud insights page detected. Waiting for GraphQL traffic...');
        reportSoundCloudPageStatus();
    }

    if (isFacebookAdminActivitiesPage()) {
        adminLastStatusText = adminIngestEnabled
            ? 'Network monitor injected. Waiting for admin-log traffic...'
            : 'Admin activities page detected. Statistics are disabled until you enable them for this exact Facebook URI.';
        updateAdminActivitiesControl();
    }

    if (adminDebugEnabled) {
        debugLog({
            level: 'info',
            category: 'facebook-network-status',
            message: 'Injected in-page fetch/XHR monitor.',
            meta: {
                url: location.href,
                hostname: location.hostname,
            }
        });
    }
}

function handleLocationChange(reason) {
    const changed = lastObservedLocationHref !== location.href;
    const previousHref = lastObservedLocationHref;
    if (!changed && reason !== 'init') {
        return;
    }

    if (changed && isFacebookPage()) {
        disableAdminActivityCollection(
            'Facebook URI changed. Activity statistics were auto-disabled and any queued entries were cleared for this tab.',
            {
                reason: reason || 'location-change',
                previous_url: previousHref,
                next_url: location.href,
                auto_disabled: true,
            }
        );
    }

    if (isSoundCloudPage()) {
        resetSoundCloudAutoIngestOnInsightsEntry(previousHref, reason);
    }

    lastObservedLocationHref = location.href;
    ensureAdminActivitiesControl();
    ensureSoundCloudInsightsControl();

    if (isSoundCloudPage()) {
        if (isSupportedSoundCloudInsightsPage()) {
            injectNetworkMonitor();
            ensureSoundCloudInsightsControl();
            setSoundCloudStatusText(networkMonitorInjected
                ? 'SoundCloud insights page detected. Waiting for supported GraphQL captures...'
                : 'SoundCloud insights page detected, but monitor injection has not completed yet.');
        } else {
            setSoundCloudStatusText('Current SoundCloud page is not a supported insights / for-artists view.');
        }
        reportSoundCloudPageStatus();
    }

    if (!isFacebookAdminActivitiesPage()) {
        adminDebugConsoleInfo('[TN Social Tools] Route changed, but this is not a Facebook admin_activities page.', {
            version: EXTENSION_VERSION,
            reason: reason,
            url: location.href,
        });
        return;
    }

    if (!adminFeatureEnabled) {
        adminLastStatusText = 'Facebook admin activity statistics are disabled in the popup.';
        return;
    }

    injectNetworkMonitor();
    adminLastStatusText = networkMonitorInjected
        ? (adminIngestEnabled
            ? 'Admin activities page detected. Waiting for Facebook XHR/fetch activity...'
            : 'Admin activities page detected. Statistics are disabled until you enable them for this exact Facebook URI.')
        : (adminIngestEnabled
            ? 'Admin activities page detected, but monitor injection has not completed yet.'
            : 'Admin activities page detected. Statistics are disabled until you enable them for this exact Facebook URI.');
    updateAdminActivitiesControl();
    if (adminIngestEnabled) {
        scheduleAdminActivitiesScan('location-change');
        scheduleAdminActivitiesBootstrapWarmup('location-change');
    }
    adminDebugConsoleInfo('[TN Social Tools] Facebook admin_activities route detected.', {
        version: EXTENSION_VERSION,
        reason: reason,
        url: location.href,
    });
    if (adminDebugEnabled) {
        debugLog({
            level: 'info',
            category: 'facebook-network-status',
            message: 'Facebook admin_activities route detected.',
            meta: {
                reason: reason,
                url: location.href,
            }
        });
    }
}

function shouldConsiderAdminActivityText(text) {
    const lowered = String(text || '').toLowerCase();
    if (lowered.length < 20) {
        return false;
    }

    return ADMIN_ACTIVITY_KEYWORDS.some(function (keyword) {
        return lowered.indexOf(keyword) !== -1;
    });
}

function extractMeaningfulLinkTexts(container) {
    const found = [];
    const anchors = container.querySelectorAll('a, strong');

    for (let i = 0; i < anchors.length; i += 1) {
        const text = normalizeWhitespace(anchors[i].textContent || '');
        if (!text || text.length < 2 || text.length > 80) {
            continue;
        }

        if (IGNORED_LINK_TEXTS.indexOf(text.toLowerCase()) !== -1) {
            continue;
        }

        if (found.indexOf(text) === -1) {
            found.push(text);
        }
    }

    return found;
}

function detectHandledOutcomeFromText(text) {
    const lowered = String(text || '').toLowerCase();
    if (lowered.indexOf('godk') !== -1 || lowered.indexOf('approved') !== -1 || lowered.indexOf('approve') !== -1 || lowered.indexOf('published') !== -1 || lowered.indexOf('allowed') !== -1) return 'approved';
    if (lowered.indexOf('avvis') !== -1 || lowered.indexOf('rejected') !== -1 || lowered.indexOf('declined') !== -1) return 'rejected';
    if (lowered.indexOf('tagit bort') !== -1 || lowered.indexOf('removed') !== -1 || lowered.indexOf('delete') !== -1) return 'removed';
    if (lowered.indexOf('rediger') !== -1 || lowered.indexOf('edit') !== -1 || lowered.indexOf('changed') !== -1) return 'edited';
    if (lowered.indexOf('lagt till') !== -1 || lowered.indexOf('added') !== -1) return 'added';
    if (lowered.indexOf('återkall') !== -1 || lowered.indexOf('revoked') !== -1) return 'revoked';
    if (lowered.indexOf('block') !== -1 || lowered.indexOf('banned') !== -1) return 'blocked';
    return null;
}

function detectHandledStatusFromText(text) {
    const lowered = String(text || '').toLowerCase();
    const outcome = detectHandledOutcomeFromText(text);
    if (lowered.indexOf('automatiskt') !== -1 || lowered.indexOf('automatically') !== -1) {
        return outcome ? outcome + '_automatically' : 'automatic';
    }

    return outcome;
}

function normalizeAdminActivityEntry(entry) {
    if (!entry) {
        return null;
    }

    const actionText = normalizeWhitespace(entry.action_text || entry.raw_blue_segment || '');
    if (!shouldConsiderAdminActivityText(actionText)) {
        return null;
    }

    const actorName = normalizeWhitespace(entry.actor_name || '');
    const handledOutcome = entry.handled_outcome || detectHandledOutcomeFromText(actionText);
    const handledStatusText = entry.handled_status_text || detectHandledStatusFromText(actionText);
    const normalizedTarget = normalizeAdminTargetInfo(entry.target_name || '', entry.target_type || '');
    const targetName = normalizedTarget.target_name ? normalizeWhitespace(normalizedTarget.target_name) : '';
    const targetType = normalizedTarget.target_type ? normalizeWhitespace(normalizedTarget.target_type) : '';
    const sourceUrl = normalizeWhitespace(entry.source_url || location.origin + location.pathname);
    const activityUrl = normalizeWhitespace(entry.activity_url || location.href);
    const occurredAt = normalizeAdminActivityTimeValue(entry.occurred_at || entry.facebook_activity_time || entry.activity_time || null);
    const groupId = typeof TNFacebookAdminReporter !== 'undefined' && TNFacebookAdminReporter
        ? TNFacebookAdminReporter.extractGroupIdFromUrl(sourceUrl || activityUrl)
        : '';
    const action = normalizeWhitespace(entry.action || handledStatusText || handledOutcome || actionText);
    const fallbackActorName = (handledStatusText && handledStatusText.indexOf('automatic') !== -1) ? 'Automatic moderation' : actorName;
    const finalActorName = actorName || fallbackActorName;

    if (!finalActorName || !actionText) {
        return null;
    }

    return {
        key: entry.key || [groupId || sourceUrl, occurredAt || '', finalActorName, actionText, action].join('|'),
        dedupe_key: entry.dedupe_key || null,
        group_id: entry.group_id || groupId || null,
        facebook_activity_time: occurredAt,
        source_url: sourceUrl,
        activity_url: activityUrl,
        occurred_at: occurredAt,
        detected_at: entry.detected_at || new Date().toISOString(),
        actor_name: finalActorName,
        description: actionText,
        action_text: actionText,
        action: action,
        target_name: targetName || null,
        target_type: targetType || null,
        handled_outcome: handledOutcome,
        handled_status_text: handledStatusText,
        raw_blue_segment: entry.raw_blue_segment || actionText,
        source_external_id: entry.source_external_id || null,
        source_external_slug: entry.source_external_slug || null,
        source_label: entry.source_label || entry.source_name || null,
        network_activity_id: entry.network_activity_id || null,
        client_event_key: entry.client_event_key || entry.dedupe_key || entry.key || null,
        plugin_version: 'tornevall-networks-social-media-tools/' + EXTENSION_VERSION,
    };
}

function rememberDetectedAdminEntries(entries, reason) {
    if (!entries || !entries.length) {
        return 0;
    }

    const normalizedEntries = entries.map(function (entry) {
        return normalizeAdminActivityEntry(entry);
    }).filter(Boolean);
    const discovery = adminActivityReporter.discoverEntries(normalizedEntries, {reason: reason || 'scan'});
    const added = discovery && typeof discovery.added === 'number' ? discovery.added : 0;

    if ((added || (discovery && discovery.duplicates)) && adminDebugEnabled) {
        const snapshot = getAdminReporterSnapshot();
        debugLog({
            level: 'info',
            category: 'facebook-admin-detection',
            message: 'Processed Facebook admin activity entries through the shared reporter queue.',
            meta: {
                reason: reason,
                added: added,
                duplicates_ignored: discovery && discovery.duplicates ? discovery.duplicates : 0,
                detected_total: snapshot.totals.detected,
                pending_total: snapshot.totals.pending,
            }
        });
    }

    return added;
}

function bootstrapSafeJsonParse(value) {
    try {
        return JSON.parse(value);
    } catch (error) {
        return null;
    }
}

function getBootstrapAdminScriptTextMatcher() {
    return /GroupAdminActivity|GroupsCometAdminActivity|management_activities|management_activity_log_target|admin_activities|RelayPrefetchedStreamCache|ScheduledServerJS|CometGroupAdminActivitiesActivityLogContentQueryRelayPreloader|adp_CometGroupAdminActivitiesActivityLogContentQueryRelayPreloader|activity_time|activity_title/i;
}

function isStrongBootstrapAdminScriptText(raw) {
    const text = String(raw || '');
    return /adp_CometGroupAdminActivitiesActivityLogContentQueryRelayPreloader|CometGroupAdminActivitiesActivityLogContentQueryRelayPreloader/.test(text)
        || /"__typename"\s*:\s*"GroupAdminActivity"|"__typename"\s*:\s*"GroupsCometAdminActivity"/.test(text)
        || (/management_activity_log_target/.test(text) && /management_activities/.test(text) && /activity_title/.test(text));
}

function scoreBootstrapAdminActivityScriptNode(node, raw) {
    const text = String(raw || '');
    const type = normalizeWhitespace(node && node.getAttribute ? node.getAttribute('type') : '').toLowerCase();
    let score = 0;

    if (node && document.body && document.body.contains(node)) score += 20;
    if (node && node.matches && node.matches('script[type="application/json"][data-sjs]')) {
        score += 140;
    } else if (node && node.hasAttribute && node.hasAttribute('data-sjs')) {
        score += 90;
    } else if (type === 'application/json') {
        score += 60;
    }

    if (/adp_CometGroupAdminActivitiesActivityLogContentQueryRelayPreloader|CometGroupAdminActivitiesActivityLogContentQueryRelayPreloader/.test(text)) score += 120;
    if (/"__typename"\s*:\s*"GroupAdminActivity"|"__typename"\s*:\s*"GroupsCometAdminActivity"/.test(text)) score += 110;
    if (/RelayPrefetchedStreamCache/.test(text)) score += 60;
    if (/management_activity_log_target/.test(text)) score += 40;
    if (/management_activities/.test(text)) score += 35;
    if (/GroupAdminActivity|GroupsCometAdminActivity/.test(text)) score += 30;
    if (/activity_title/.test(text)) score += 15;

    return score;
}

function collectBootstrapAdminActivityScriptNodes(debugState) {
    const bodyRoot = document.body || null;
    const root = bodyRoot || document.documentElement;
    const results = [];
    const seenNodes = new Set();
    const matcher = getBootstrapAdminScriptTextMatcher();
    const targetedXpathQueries = [
        ".//script[@type='application/json' and contains(., 'adp_CometGroupAdminActivitiesActivityLogContentQueryRelayPreloader')]",
        ".//script[@type='application/json' and contains(., 'CometGroupAdminActivitiesActivityLogContentQueryRelayPreloader')]",
        ".//script[@type='application/json' and contains(., 'GroupAdminActivity')]",
        ".//script[@type='application/json' and contains(., 'management_activity_log_target')]",
    ];

    function appendNode(node) {
        if (!node || seenNodes.has(node)) {
            return;
        }
        seenNodes.add(node);
        results.push(node);
    }

    function appendXPathMatches(scope, xpath) {
        if (!scope || typeof document.evaluate !== 'function' || typeof XPathResult === 'undefined') {
            return;
        }

        try {
            const snapshot = document.evaluate(xpath, scope, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
            if (debugState) {
                debugState.xpath_hits[xpath] = snapshot.snapshotLength;
            }
            for (let index = 0; index < snapshot.snapshotLength; index += 1) {
                appendNode(snapshot.snapshotItem(index));
            }
        } catch (error) {
            if (debugState) {
                debugState.xpath_hits[xpath] = 'error';
            }
            // Fall back to selector scanning below.
        }
    }

    if (bodyRoot) {
        targetedXpathQueries.forEach(function (xpath) {
            appendXPathMatches(bodyRoot, xpath);
        });
    }

    const primaryScripts = bodyRoot ? bodyRoot.querySelectorAll('script[type="application/json"]') : [];
    if (debugState) {
        debugState.body_available = !!bodyRoot;
        debugState.body_application_json_count = primaryScripts.length;
    }
    for (let i = 0; i < primaryScripts.length; i += 1) {
        const node = primaryScripts[i];
        const raw = node && typeof node.textContent === 'string' ? node.textContent : '';
        if (raw && raw.length >= 40 && (isStrongBootstrapAdminScriptText(raw) || matcher.test(raw))) {
            appendNode(node);
        }
    }

    if (!results.length && root) {
        if (debugState) {
            debugState.fallback_used = true;
        }
        const fallbackScripts = root.querySelectorAll('script[type="application/json"], script[data-sjs], script:not([src])');
        for (let i = 0; i < fallbackScripts.length; i += 1) {
            const node = fallbackScripts[i];
            const raw = node && typeof node.textContent === 'string' ? node.textContent : '';
            if (raw && raw.length >= 40 && matcher.test(raw)) {
                appendNode(node);
            }
        }
    }

    results.sort(function (left, right) {
        return scoreBootstrapAdminActivityScriptNode(right, right && right.textContent) - scoreBootstrapAdminActivityScriptNode(left, left && left.textContent);
    });

    if (debugState) {
        debugState.matched_script_count = results.length;
        debugState.top_scripts = results.slice(0, 5).map(function (node) {
            return summarizeBootstrapAdminScriptNode(node, node && node.textContent);
        });
    }

    return results;
}

function extractAdminActivityNamesFromTitle(title) {
    const titleText = normalizeWhitespace(title && title.text ? title.text : '');
    const ranges = title && Array.isArray(title.ranges) ? title.ranges.slice() : [];
    const names = [];

    ranges.sort(function (a, b) {
        return (a && typeof a.offset === 'number' ? a.offset : 0) - (b && typeof b.offset === 'number' ? b.offset : 0);
    });

    ranges.forEach(function (range) {
        if (!range) {
            return;
        }

        const entityName = normalizeWhitespace(range.entity && (range.entity.name || range.entity.text) ? (range.entity.name || range.entity.text) : '');
        const shortName = normalizeWhitespace(range.entity && range.entity.short_name ? range.entity.short_name : '');
        let slicedName = '';

        if (!entityName && titleText && typeof range.offset === 'number' && typeof range.length === 'number') {
            slicedName = normalizeWhitespace(titleText.slice(range.offset, range.offset + range.length));
        }

        const name = entityName || slicedName || shortName;
        if (name && names.indexOf(name) === -1) {
            names.push(name);
        }
    });

    return names;
}

function isBootstrapAdminActivityTypename(typename) {
    const value = normalizeWhitespace(typename);
    return value === 'GroupAdminActivity' || value === 'GroupsCometAdminActivity';
}

function parseBootstrapAdminActivityNode(node) {
    if (!node || !isBootstrapAdminActivityTypename(node.__typename)) {
        return null;
    }

    const actionText = normalizeWhitespace(node.activity_title && node.activity_title.text ? node.activity_title.text : '');
    if (!actionText || !shouldConsiderAdminActivityText(actionText)) {
        return null;
    }

    const names = extractAdminActivityNamesFromTitle(node.activity_title);
    const lowered = actionText.toLowerCase();
    const isAutomatic = !!node.is_automatic_action || lowered.indexOf('automatiskt') !== -1 || lowered.indexOf('automatically') !== -1;
    let actorName = isAutomatic ? 'Automatic moderation' : (names[0] || '');
    const targetName = isAutomatic ? (names[0] || names[1] || '') : (names[1] || '');

    if (!actorName && names[0]) {
        actorName = names[0];
    }
    if (!actorName) {
        actorName = isAutomatic ? 'Automatic moderation' : 'Unknown actor';
    }

    return normalizeAdminActivityEntry({
        key: [location.href, String(node.id || ''), actorName, targetName || '', actionText].join('|'),
        source_url: location.href,
        activity_url: location.href,
        occurred_at: node.activity_time ? new Date(node.activity_time * 1000).toISOString() : null,
        facebook_activity_time: node.activity_time ? new Date(node.activity_time * 1000).toISOString() : null,
        actor_name: actorName,
        action_text: actionText,
        target_name: targetName || null,
        handled_outcome: detectHandledOutcomeFromText(actionText),
        handled_status_text: detectHandledStatusFromText(actionText),
        raw_blue_segment: actionText,
        network_activity_id: node.id || null,
        is_automatic_action: isAutomatic,
    });
}

function getBootstrapAdminActivityEdgeLists(value) {
    return [
        value.data && value.data.node && value.data.node.management_activities && value.data.node.management_activities.edges,
        value.data && value.data.management_activity_log_target && value.data.management_activity_log_target.management_activities && value.data.management_activity_log_target.management_activities.edges,
        value.result && value.result.data && value.result.data.management_activity_log_target && value.result.data.management_activity_log_target.management_activities && value.result.data.management_activity_log_target.management_activities.edges,
        value.__bbox && value.__bbox.result && value.__bbox.result.data && value.__bbox.result.data.management_activity_log_target && value.__bbox.result.data.management_activity_log_target.management_activities && value.__bbox.result.data.management_activity_log_target.management_activities.edges,
        value.payload && value.payload.__bbox && value.payload.__bbox.result && value.payload.__bbox.result.data && value.payload.__bbox.result.data.management_activity_log_target && value.payload.__bbox.result.data.management_activity_log_target.management_activities && value.payload.__bbox.result.data.management_activity_log_target.management_activities.edges,
        value.next && value.next.result && value.next.result.data && value.next.result.data.management_activity_log_target && value.next.result.data.management_activity_log_target.management_activities && value.next.result.data.management_activity_log_target.management_activities.edges,
        value.next && value.next.payload && value.next.payload.__bbox && value.next.payload.__bbox.result && value.next.payload.__bbox.result.data && value.next.payload.__bbox.result.data.management_activity_log_target && value.next.payload.__bbox.result.data.management_activity_log_target.management_activities && value.next.payload.__bbox.result.data.management_activity_log_target.management_activities.edges,
    ];
}

function walkBootstrapAdminActivities(value, results, seenKeys) {
    if (!value) {
        return;
    }

    if (Array.isArray(value)) {
        value.forEach(function (item) {
            walkBootstrapAdminActivities(item, results, seenKeys);
        });
        return;
    }

    if (typeof value !== 'object') {
        return;
    }

    if (isBootstrapAdminActivityTypename(value.__typename)) {
        const parsedNode = parseBootstrapAdminActivityNode(value);
        if (parsedNode && !seenKeys[parsedNode.key]) {
            seenKeys[parsedNode.key] = true;
            results.push(parsedNode);
        }
    }

    getBootstrapAdminActivityEdgeLists(value).forEach(function (edgeList) {
        if (!Array.isArray(edgeList)) {
            return;
        }

        edgeList.forEach(function (edge) {
            const parsedNode = parseBootstrapAdminActivityNode(edge && edge.node ? edge.node : null);
            if (parsedNode && !seenKeys[parsedNode.key]) {
                seenKeys[parsedNode.key] = true;
                results.push(parsedNode);
            }
        });
    });

    Object.keys(value).forEach(function (key) {
        if (key === 'data' || key === 'result' || key === 'payload' || key === 'extensions' || key === '__bbox' || key === 'require' || key === 'handle' || key === 'next') {
            walkBootstrapAdminActivities(value[key], results, seenKeys);
        }
    });
}

function parseAdminActivityEntriesFromBootstrapText(text, debugState) {
    const raw = String(text || '');
    const lowered = raw.toLowerCase();
    const results = [];
    const seenKeys = {};
    const parsedChunks = [];
    const scriptDebug = debugState ? {
        preview: clipText(normalizeWhitespace(raw), 180),
        raw_length: raw.length,
        chunk_count: 0,
        used_single_parse: false,
        entry_count: 0,
        entry_preview: '',
    } : null;

    if (!raw || (lowered.indexOf('groupadminactivity') === -1 && lowered.indexOf('groupscometadminactivity') === -1 && lowered.indexOf('management_activities') === -1 && lowered.indexOf('management_activity_log_target') === -1 && lowered.indexOf('admin_activities') === -1 && lowered.indexOf('relayprefetchedstreamcache') === -1 && lowered.indexOf('scheduledserverjs') === -1 && lowered.indexOf('cometgroupadminactivitiesactivitylogcontentqueryrelaypreloader') === -1 && lowered.indexOf('adp_cometgroupadminactivitiesactivitylogcontentqueryrelaypreloader') === -1 && lowered.indexOf('activity_title') === -1)) {
        if (debugState) {
            debugState.skipped_matcher += 1;
        }
        return results;
    }

    raw.split(/\n+(?=\{)/g).forEach(function (part) {
        const parsed = bootstrapSafeJsonParse(part);
        if (parsed) {
            parsedChunks.push(parsed);
        }
    });

    if (scriptDebug) {
        scriptDebug.chunk_count = parsedChunks.length;
    }

    if (!parsedChunks.length) {
        const singleParsed = bootstrapSafeJsonParse(raw);
        if (singleParsed) {
            parsedChunks.push(singleParsed);
            if (scriptDebug) {
                scriptDebug.used_single_parse = true;
            }
        } else if (debugState) {
            debugState.parse_failures += 1;
        }
    }

    parsedChunks.forEach(function (parsed) {
        walkBootstrapAdminActivities(parsed, results, seenKeys);
    });

    if (scriptDebug) {
        scriptDebug.entry_count = results.length;
        scriptDebug.entry_preview = results.length ? clipText(results.slice(0, 2).map(function (entry) {
            return entry.action_text || '';
        }).join(' · '), 180) : '';
        debugState.parsed_scripts.push(scriptDebug);
    }

    return results;
}

function collectBootstrapAdminActivityEntries(reason) {
    if (!isFacebookAdminActivitiesPage()) {
        return [];
    }

    const debugState = buildBootstrapAdminScanDebug(reason);
    const scripts = collectBootstrapAdminActivityScriptNodes(debugState);
    const results = [];
    const seenKeys = new Set();
    const matcher = getBootstrapAdminScriptTextMatcher();

    for (let i = 0; i < scripts.length; i += 1) {
        const raw = scripts[i] && typeof scripts[i].textContent === 'string' ? scripts[i].textContent : '';
        if (!raw || raw.length < 40) {
            debugState.skipped_short += 1;
            continue;
        }
        if (!matcher.test(raw)) {
            debugState.skipped_matcher += 1;
            continue;
        }

        debugState.scripts_considered += 1;

        const parsedEntries = parseAdminActivityEntriesFromBootstrapText(raw, debugState);
        if (parsedEntries.length) {
            debugState.scripts_with_entries += 1;
        }

        parsedEntries.forEach(function (entry) {
            if (entry && !seenKeys.has(entry.key)) {
                seenKeys.add(entry.key);
                results.push(entry);
            }
        });
    }

    debugState.entries_detected = results.length;
    debugState.detected_entry_preview = results.slice(0, 5).map(function (entry) {
        return clipText(entry && entry.action_text ? entry.action_text : '', 180);
    });
    debugState.outcome = results.length
        ? 'entries-detected'
        : (debugState.matched_script_count
            ? 'matched-scripts-but-no-entries'
            : (debugState.body_application_json_count ? 'body-json-found-no-matches' : 'no-body-json-scripts'));
    latestBootstrapAdminScanDebug = debugState;

    if (adminDebugEnabled) {
        debugLog({
            level: 'info',
            category: 'facebook-admin-bootstrap',
            message: 'Bootstrap body-read scan completed.',
            meta: {
                reason: debugState.reason,
                outcome: debugState.outcome,
                body_available: debugState.body_available,
                body_application_json_count: debugState.body_application_json_count,
                matched_script_count: debugState.matched_script_count,
                scripts_considered: debugState.scripts_considered,
                scripts_with_entries: debugState.scripts_with_entries,
                entries_detected: debugState.entries_detected,
                pending_added: debugState.pending_added,
                fallback_used: debugState.fallback_used,
                xpath_hits: debugState.xpath_hits,
                top_scripts: debugState.top_scripts,
                parsed_scripts: debugState.parsed_scripts.slice(0, 5),
                detected_entry_preview: debugState.detected_entry_preview,
            }
        });
    }

    return results;
}

function parseAdminActivityEntry(container) {
    const actionText = normalizeWhitespace(container.innerText || '');
    if (!shouldConsiderAdminActivityText(actionText)) {
        return null;
    }

    const names = extractMeaningfulLinkTexts(container);
    const actorName = names[0] || null;
    if (!actorName) {
        return null;
    }

    const targetCandidate = names.length > 1 ? names[1] : null;
    const normalizedTarget = normalizeAdminTargetInfo(targetCandidate, null);
    const targetName = normalizedTarget.target_name;
    const targetType = normalizedTarget.target_type;
    const occurredAt = extractOccurredAtFromVisibleAdminContainer(container);
    const key = [location.href, actorName, occurredAt || '', actionText].join('|');

    return normalizeAdminActivityEntry({
        key: key,
        source_url: location.href,
        activity_url: location.href,
        occurred_at: occurredAt,
        facebook_activity_time: occurredAt,
        actor_name: actorName,
        action_text: actionText,
        target_name: targetName,
        target_type: targetType,
        handled_outcome: detectHandledOutcomeFromText(actionText),
        handled_status_text: detectHandledStatusFromText(actionText),
        raw_blue_segment: actionText,
    });
}

function collectVisibleAdminActivityEntries() {
    const selectors = ['[role="article"]', '[role="listitem"]', 'div[data-pagelet]', 'li'];
    const results = [];
    const seenKeys = new Set();

    selectors.forEach(function (selector) {
        const nodes = document.querySelectorAll(selector);
        for (let i = 0; i < nodes.length; i += 1) {
            const node = nodes[i];
            if (!node || !node.offsetParent) {
                continue;
            }

            const parsed = parseAdminActivityEntry(node);
            if (parsed && !seenKeys.has(parsed.key)) {
                seenKeys.add(parsed.key);
                results.push(parsed);
            }
        }
    });

    return results;
}

function chunkAdminEntries(entries, size) {
    const chunks = [];
    for (let index = 0; index < entries.length; index += size) {
        chunks.push(entries.slice(index, index + size));
    }
    return chunks;
}

async function submitAdminActivityEntriesBatch(entries) {
    const response = await safeSendRuntimeMessageWithResponse({
        type: 'FACEBOOK_ADMIN_INGEST',
        entries: entries,
    });

    if (!response.ok) {
        throw new Error(response.error || response.message || 'Could not submit admin activity batch.');
    }

    return response;
}

async function flushAdminActivitiesToTools(reason) {
    if (adminFlushInProgress) {
        adminFlushRequestedWhileBusy = true;
        return;
    }

    adminFlushInProgress = true;

    try {
        if (!isFacebookAdminActivitiesPage()) {
            return;
        }

        if (!adminIngestEnabled) {
            adminLastStatusText = 'Admin activities page detected. Statistics are disabled until you enable them for this exact Facebook URI.';
            updateAdminActivitiesControl();
            return;
        }

        const bootstrapEntries = collectBootstrapAdminActivityEntries(reason || 'bootstrap-scan');
        const bootstrapAdded = rememberDetectedAdminEntries(bootstrapEntries, reason || 'bootstrap-scan');
        if (latestBootstrapAdminScanDebug) {
            latestBootstrapAdminScanDebug.pending_added = bootstrapAdded;
        }
        rememberDetectedAdminEntries(collectVisibleAdminActivityEntries(), reason || 'visible-scan');

        updateAdminActivitiesControl();

        const initialSnapshot = getAdminReporterSnapshot();

        if (!initialSnapshot.totals.pending) {
            adminLastStatusText = 'Listening for admin-log changes. No new detected entries are waiting.';
            updateAdminActivitiesControl();
            return;
        }

        let submittedThisRun = 0;
        let receivedThisRun = 0;
        let createdThisRun = 0;
        let updatedThisRun = 0;
        let batch = adminActivityReporter.startNextBatch(MAX_ADMIN_BATCH_SIZE, {reason: reason || 'scheduled-scan'});

        while (batch.length) {
            adminActiveSendBatch = batch.slice();
            adminLastStatusText = 'Sending Facebook admin bulk: ' + batch.length + ' entr' + (batch.length === 1 ? 'y' : 'ies') + ' in this batch.';
            updateAdminActivitiesControl();

            try {
                const response = await submitAdminActivityEntriesBatch(batch);
                const data = response.data || {};
                adminActivityReporter.markBatchSent(batch, data, {reason: reason || 'scheduled-scan'});
                adminActiveSendBatch = null;
                submittedThisRun += batch.length;
                receivedThisRun += typeof data.received === 'number' ? data.received : batch.length;
                createdThisRun += typeof data.created === 'number' ? data.created : 0;
                updatedThisRun += typeof data.updated === 'number' ? data.updated : 0;
            } catch (error) {
                if (adminActiveSendBatch && adminActiveSendBatch.length) {
                    adminActivityReporter.markBatchFailed(adminActiveSendBatch, error, {reason: reason || 'scheduled-scan'});
                }
                adminActiveSendBatch = null;
                const failedSnapshot = getAdminReporterSnapshot();
                adminLastStatusText = 'Bulk send failed after ' + submittedThisRun + ' submitted entr' + (submittedThisRun === 1 ? 'y' : 'ies') + '. '
                    + (error && error.message ? error.message : 'Could not submit admin-log batch.')
                    + ' Pending retry: ' + (failedSnapshot.totals.pending || 0) + '.';
                updateAdminActivitiesControl();
                debugLog({level: 'error', category: 'facebook-admin-ingest', message: adminLastStatusText, meta: {reason: reason, batch_size: batch.length}});
                return;
            }

            batch = adminActivityReporter.startNextBatch(MAX_ADMIN_BATCH_SIZE, {reason: reason || 'scheduled-scan'});
        }

        const finalSnapshot = getAdminReporterSnapshot();
        adminLastStatusText = submittedThisRun > 0
            ? 'Facebook admin bulk complete. Attempted: ' + submittedThisRun
                + ' · Received: ' + receivedThisRun
                + ' · Created: ' + createdThisRun
                + ' · Updated/duplicate-safe: ' + updatedThisRun
                + ' · Queue remaining: ' + (finalSnapshot.totals.pending || 0)
            : 'Listening for admin-log changes. No new detected entries to submit right now.';
        updateAdminActivitiesControl();
    } finally {
        adminActiveSendBatch = null;
        adminFlushInProgress = false;
        if (adminFlushRequestedWhileBusy) {
            adminFlushRequestedWhileBusy = false;
            scheduleAdminActivitiesScan((reason || 'scheduled-scan') + '-followup');
        }
    }
}

function scheduleAdminActivitiesScan(reason) {
    if (adminActivitiesScanScheduled || !adminIngestEnabled || !isFacebookAdminActivitiesPage()) {
        return;
    }

    adminActivitiesScanScheduled = true;
    setTimeout(function () {
        adminActivitiesScanScheduled = false;
        flushAdminActivitiesToTools(reason);
    }, 450);
}

function requestInjectedBootstrapAdminScan(reason) {
    if (!isFacebookAdminActivitiesPage()) {
        return;
    }

    try {
        window.postMessage({
            source: 'tn-networks-social-media-tools-content',
            type: 'REQUEST_BOOTSTRAP_SCAN',
            reason: reason || 'content-script-request',
        }, '*');
    } catch (error) {
    }
}

function scheduleAdminActivitiesBootstrapWarmup(reason) {
    if (!adminIngestEnabled || !isFacebookAdminActivitiesPage()) {
        return;
    }

    const expectedHref = location.href;
    [0, 900, 2200].forEach(function (delay, index) {
        setTimeout(function () {
            if (location.href !== expectedHref || !isFacebookAdminActivitiesPage()) {
                return;
            }
            const warmupReason = (reason || 'bootstrap') + '-warmup-' + index;
            requestInjectedBootstrapAdminScan(warmupReason);
            scheduleAdminActivitiesScan(warmupReason);
        }, delay);
    });
}

// ---------------------------------------------
// PANEL HTML
// ---------------------------------------------
function panelHTML() {
    return `
    <style id="sgpt-style">
      #sgpt-panel{position:fixed;bottom:16px;right:16px;width:440px;max-width:min(440px,calc(100vw - 24px));max-height:70vh;background:#fff !important;border:1px solid #ccc;border-radius:6px;box-shadow:0 4px 14px rgba(0,0,0,0.15);z-index:2147483647;display:flex;flex-direction:column;font-family:system-ui,sans-serif !important;font-size:14px;color:#0f172a !important;color-scheme:light;isolation:isolate}
      #sgpt-panel,#sgpt-panel *{box-sizing:border-box}
      #sgpt-panel[data-collapsed="true"]{transform:translateX(calc(100% - 42px));transition:transform .3s}
      #sgpt-head{display:flex;align-items:center;background:#008CBA;color:#fff;padding:4px 8px;border-top-left-radius:6px;border-top-right-radius:6px;cursor:grab;user-select:none;touch-action:none}
      #sgpt-close{margin-left:auto;background:transparent;border:none;color:#fff;font-size:18px;cursor:pointer}
      #sgpt-body{flex:1;display:flex;flex-direction:column;padding:8px;overflow:hidden}
      #sgpt-body label{display:flex;flex-direction:column;gap:4px;font-size:12px;font-weight:600;color:#334155 !important}
      #sgpt-body input[type=text],#sgpt-body textarea,#sgpt-body select{width:100%;margin-bottom:6px;border:1px solid #bfc7d1 !important;border-radius:4px;padding:6px 8px;background:#fff !important;color:#111827 !important;-webkit-text-fill-color:#111827 !important;caret-color:#111827 !important;opacity:1 !important;font:13px/1.4 Arial,sans-serif !important;appearance:none}
      #sgpt-body input[type=text]::placeholder,#sgpt-body textarea::placeholder{color:#6b7280 !important;-webkit-text-fill-color:#6b7280 !important;opacity:1 !important}
      #sgpt-body input[type=text]:focus,#sgpt-body textarea:focus,#sgpt-body select:focus{outline:none;border-color:#1999c6 !important;box-shadow:0 0 0 2px rgba(25,153,198,.15)}
      #sgpt-body textarea{resize:vertical;min-height:60px;max-height:160px}
      #sgpt-context{background:#f8fafc !important}
      #sgpt-send,#sgpt-mod,#sgpt-verify,#sgpt-paste{margin-right:4px;padding:4px 10px;border:none;border-radius:4px;background:#008CBA;color:#fff;cursor:pointer;font:13px/1.35 Arial,sans-serif !important}
      #sgpt-verify{background:#7c3aed}
      #sgpt-paste{background:#0f766e}
      #sgpt-send[disabled],#sgpt-mod[disabled],#sgpt-verify[disabled],#sgpt-paste[disabled]{opacity:.55;cursor:not-allowed}
      #sgpt-foot{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap}
      #sgpt-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:flex-end}
      #sgpt-inline-loader{display:none;align-items:center;gap:7px;padding:4px 10px;border-radius:999px;background:#eff6ff;color:#1d4ed8;font-size:12px;font-weight:600;white-space:nowrap}
      #sgpt-inline-loader[data-visible="true"]{display:inline-flex}
      .sgpt-inline-loader-spinner{width:14px;height:14px;border-radius:50%;border:2px solid rgba(29,78,216,.22);border-top-color:#2563eb;animation:sgpt-inline-spin .8s linear infinite}
      @keyframes sgpt-inline-spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
      #sgpt-responder-label{font-size:12px;color:#666;margin-bottom:6px;text-align:right}
      #sgpt-anchor-note{font-size:11px;color:#666;margin-bottom:8px}
      #sgpt-compose-status{font-size:11px;color:#64748b;flex:1 1 180px}
      .sgpt-quick-settings{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-bottom:8px}
      .sgpt-quick-settings select,.sgpt-quick-settings input{margin-bottom:0}
      .sgpt-inline-tools{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:4px}
      .sgpt-inline-tools > span{font-size:12px;font-weight:600;color:#334155 !important}
      .sgpt-inline-actions{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}
      .sgpt-inline-actions button{padding:3px 8px;border:1px solid #94a3b8;border-radius:999px;background:#fff;color:#0f172a;cursor:pointer;font:12px/1.2 Arial,sans-serif !important}
      .sgpt-inline-actions button[data-active="true"]{background:#0ea5e9;color:#fff;border-color:#0284c7}
      .socialgpt-marked[data-tn-social-mark-mode="mark-id"],.socialgpt-marked[data-tn-social-mark-mode="detailed"]{outline:2px solid rgba(14,165,233,.9) !important;outline-offset:2px !important;position:relative !important;box-shadow:0 0 0 3px rgba(14,165,233,.18) !important}
      .socialgpt-marked[data-tn-social-mark-badge]::after{content:attr(data-tn-social-mark-badge);position:absolute;top:0;left:0;transform:translate(6px,-70%);max-width:min(320px,calc(100% - 12px));padding:3px 8px;border-radius:999px;background:#0f172a;color:#fff;font:11px/1.2 Arial,sans-serif !important;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;box-shadow:0 6px 18px rgba(15,23,42,.24);pointer-events:none;z-index:2147483646}
      .socialgpt-marked[data-tn-social-mark-mode="compact"]::after{background:#0284c7}
    </style>
      <div id="sgpt-head">${ct('contentScript.panelTitle', {}, 'Tornevall Networks Social Media Tools ↔')} <button type="button" id="sgpt-close" aria-label="${escapeHtml(ct('contentScript.closeToolbox', {}, 'Close Toolbox'))}" title="${escapeHtml(ct('contentScript.closeToolbox', {}, 'Close Toolbox'))}">×</button></div>
    <div id="sgpt-body">
      <div id="sgpt-responder-label">${ct('contentScript.responder', {}, 'Responder')}: <span id="sgpt-responder-name" data-name="${frontResponserName || ''}">${frontResponserName || ct('contentScript.loadingResponder', {}, '(loading...)')}</span></div>
      <div id="sgpt-anchor-note">${ct('contentScript.anchorFocused', {}, 'Anchored to the currently focused text field.')}</div>
      <label>${ct('contentScript.promptLabel', {}, 'Prompt')}<input type="text" id="sgpt-prompt" placeholder="${escapeHtml(ct('contentScript.promptPlaceholder', {}, 'Leave blank to use the default reply instruction.'))}"></label>
      <div class="sgpt-quick-settings">
        <label>${ct('contentScript.moodLabel', {}, 'Mood')}<select id="sgpt-mood">
            <optgroup label="Objective & Informative">
              <option value="Neutral and formal">Neutral and formal</option>
              <option value="Fact-based and concise">Fact-based and concise</option>
              <option value="Academic and precise">Academic and precise</option>
              <option value="Analytical and critical">Analytical and critical</option>
            </optgroup>
            <optgroup label="Confrontational & Direct">
              <option value="Critical and direct">Critical and direct</option>
              <option value="Cynical and sharp">Cynical and sharp</option>
              <option value="Aggressive and unapologetic">Aggressive and unapologetic</option>
              <option value="Brutally honest">Brutally honest</option>
            </optgroup>
            <optgroup label="Satirical & Sarcastic">
              <option value="Sarcastic and dry">Sarcastic and dry</option>
              <option value="Snarky and dismissive">Snarky and dismissive</option>
              <option value="Satirical and ironic">Satirical and ironic</option>
              <option value="Witty and clever">Witty and clever</option>
            </optgroup>
            <optgroup label="Approachable & Light">
              <option value="Friendly and casual">Friendly and casual</option>
              <option value="Conversational and soft">Conversational and soft</option>
            </optgroup>
          </select></label>
        <label>${ct('contentScript.modelLabel', {}, 'Model')}<select id="sgpt-model"></select></label>
        <label>${ct('contentScript.lengthLabel', {}, 'Length')}<select id="sgpt-length">
            <option value="auto">${ct('contentScript.lengthAuto', {}, 'Let GPT decide')}</option>
            <option value="as-short-as-possible">${ct('contentScript.lengthAsShort', {}, 'As short as possible')}</option>
            <option value="shortest-possible">${ct('contentScript.lengthShortest', {}, 'At maximum one sentence. Possibly a one-liner.')}</option>
            <option value="very-short">${ct('contentScript.lengthVeryShort', {}, '2–3 sentences (very short)')}</option>
            <option value="short">${ct('contentScript.lengthShort', {}, '4–6 sentences (short)')}</option>
            <option value="medium">${ct('contentScript.lengthMedium', {}, '6–10 sentences (medium)')}</option>
            <option value="extreme">${ct('contentScript.lengthExtreme', {}, 'Extreme. You want your own book.')}</option>
            <option value="long">${ct('contentScript.lengthLong', {}, 'Extended (whatever is needed)')}</option>
          </select></label>
      </div>
      <div class="sgpt-quick-settings" style="grid-template-columns:repeat(3,minmax(0,1fr));">
        <label>${ct('contentScript.customMoodLabel', {}, 'Custom mood')}<input type="text" id="sgpt-custom"></label>
        <label>${ct('contentScript.changeRequestLabel', {}, 'Change request')}<input type="text" id="sgpt-modifier" placeholder="${escapeHtml(ct('contentScript.changeRequestPlaceholder', {}, 'Optional: what should change?'))}"></label>
        <label>${ct('contentScript.languageLabel', {}, 'Language')}<select id="sgpt-language">
            <option value="auto">${ct('option.language.autoContext', {}, 'Same as the selected content/context')}</option>
            <option value="sv">${ct('option.language.sv', {}, 'Swedish')}</option>
            <option value="en">${ct('option.language.en', {}, 'English')}</option>
            <option value="da">${ct('option.language.da', {}, 'Danish')}</option>
            <option value="no">${ct('option.language.no', {}, 'Norwegian')}</option>
            <option value="de">${ct('option.language.de', {}, 'German')}</option>
            <option value="fr">${ct('option.language.fr', {}, 'French')}</option>
            <option value="es">${ct('option.language.es', {}, 'Spanish')}</option>
        </select></label>
      </div>
      <div class="sgpt-inline-tools"><span>${ct('contentScript.contextLabel', {}, 'Context')}</span><div class="sgpt-inline-actions"><button type="button" id="sgpt-context-mark" aria-pressed="false">${ct('contentScript.markContext', {}, 'Mark context')}</button><button type="button" id="sgpt-context-import">${ct('contentScript.import', {}, 'Import')}</button><button type="button" id="sgpt-context-clear">${ct('contentScript.clear', {}, 'Clear')}</button></div></div>
      <textarea id="sgpt-context" placeholder="${escapeHtml(ct('contentScript.contextPlaceholder', {}, 'Optional context: import visible page context or write your own notes here.'))}"></textarea>
      <label>${ct('contentScript.outputLabel', {}, 'Output')}<textarea id="sgpt-out"></textarea></label>
      <div id="sgpt-foot"><div id="sgpt-compose-status">${ct('contentScript.composeStatus', {}, 'Select a text field to enable paste/fill actions.')}</div><div id="sgpt-actions"><div id="sgpt-inline-loader" aria-live="polite" aria-hidden="true"><span class="sgpt-inline-loader-spinner"></span><span id="sgpt-inline-loader-label">${ct('contentScript.generating', {}, 'Generating…')}</span></div><button id="sgpt-send">${ct('contentScript.generate', {}, 'Generate')}</button><button id="sgpt-mod">${ct('contentScript.refresh', {}, 'Refresh')}</button><button id="sgpt-verify">${ct('contentScript.verifyFact', {}, 'Verify fact')}</button><button id="sgpt-paste">${ct('contentScript.pasteIntoField', {}, 'Paste into field')}</button></div></div>
    </div>`;
}

// ---------------------------------------------
// CREATE PANEL
// ---------------------------------------------
function createPanel() {
    if (panel) return panel;

    panel = document.createElement('div');
    panel.id = 'sgpt-panel';
    panel.innerHTML = panelHTML();
    document.body.appendChild(panel);
    refreshLocalizedPanelUi();

    const panelHeader = panel.querySelector('#sgpt-head');
    if (panelHeader) {
        panelHeader.tabIndex = 0;
        panelHeader.title = ct('contentScript.dragToolboxTitle', {}, 'Drag to move Toolbox. Press Escape to snap it back near the active field.');
        enableReplyPanelDragging(panelHeader, panel);
    }

    panel.querySelector('#sgpt-head').addEventListener('dblclick', () => {
        panel.dataset.collapsed = panel.dataset.collapsed === 'true' ? 'false' : 'true';
    });

    const closeButton = panel.querySelector('#sgpt-close');
    closeButton.addEventListener('pointerdown', function (event) {
        event.preventDefault();
        event.stopPropagation();
    });
    closeButton.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();
        closeReplyPanel();
    });

    panel.querySelector('#sgpt-send').addEventListener('click', () => sendGPT(false));
    panel.querySelector('#sgpt-mod').addEventListener('click', () => sendGPT(true));
    panel.querySelector('#sgpt-verify').addEventListener('click', () => startFactVerification());
    panel.querySelector('#sgpt-model').addEventListener('change', function () {
        preferredToolsModel = normalizeWhitespace(this.value || '');
        safeStorageSyncSet({preferredToolsModel: preferredToolsModel});
    });
    panel.querySelector('#sgpt-paste').addEventListener('click', () => {
        const result = pasteTextIntoActiveComposer(panel.querySelector('#sgpt-out').value, {submit: false});
        updatePanelComposerActions(result.ok ? result.message : result.error, result.ok ? 'success' : 'error');
    });
    panel.querySelector('#sgpt-context').addEventListener('input', () => {
        panelContextDirty = true;
        updatePanelAnchorNote();
        updatePanelComposerActions();
    });
    panel.querySelector('#sgpt-context-import').addEventListener('click', () => {
        refreshPanelContextFromCurrentTarget();
    });
    panel.querySelector('#sgpt-context-clear').addEventListener('click', () => {
        clearMarkedContextSelection();
        stopMarkModeKeepingCurrentContext();
        activeReplyContextMeta = null;
        setPanelContextValue('');
        updatePanelAnchorNote();
        updatePanelComposerActions(ct('contentScript.contextCleared', {}, 'Context cleared. You can import fresh context or write your own.'), 'success');
    });
    panel.querySelector('#sgpt-context-mark').addEventListener('click', async () => {
        const response = await setPanelMarkMode(!isClickMarkingActive);
        if (response && response.ok) {
            updatePanelComposerActions(response.enabled
                ? ct('contentScript.markModeStarted', {}, 'Mark mode is active. Click page elements to add/remove context blocks.')
                : ct('contentScript.markModeStopped', {}, 'Mark mode stopped. Current marked context remains in the box.'), response.enabled ? 'success' : undefined);
        } else {
            updatePanelComposerActions(ct('contentScript.markModeUnavailable', {}, 'Could not toggle mark mode in this tab.'), 'error');
        }
    });
    panel.querySelector('#sgpt-out').addEventListener('input', () => updatePanelComposerActions());
    panel.querySelector('#sgpt-modifier').addEventListener('input', () => updatePanelComposerActions());

    positionPanelNearComposer();
    updatePanelComposerActions();
    syncPanelMarkModeState();
    positionVerifyActionButton();
    populatePanelModelOptions(preferredToolsModel || defaultToolsModel);

    return panel;
}

function closeReplyPanel() {
    if (!panel) {
        return;
    }

    clearMarkedContextSelection();
    panel.remove();
    panel = null;
    panelDragState = null;
    panelManualPosition = null;
    panelAttachedComposer = null;
    panelContextDirty = false;
    positionComposerActionButton();
    positionVerifyActionButton();
    if (verifyHoverTarget) {
        showVerifyHoverButtonForTarget(verifyHoverTarget);
    }
}

function openReplyPanel() {
    const p = createPanel();

    p.dataset.collapsed = 'false';
    panelAttachedComposer = activeComposer && document.contains(activeComposer) ? activeComposer : null;
    resetReplyPanelTransientFields();
    positionPanelNearComposer();
    updatePanelAnchorNote();
    updatePanelComposerActions();
    syncPanelMarkModeState();
    positionVerifyActionButton();
    p.querySelector('#sgpt-prompt').focus();

    hideVerifyHoverButton(true);
    isClickMarkingActive = false;
    safeSendRuntimeMessage({type: 'RESET_MARK_MODE'});

    safeStorageSyncGet(['responderName', 'autoDetectResponder', 'defaultMood', 'defaultCustomMood', 'defaultResponseLanguage', 'lastResponseLength', 'availableToolsModels', 'defaultToolsModel', 'preferredToolsModel'], (data) => {
        const label = p.querySelector('#sgpt-responder-name');
        const moodField = p.querySelector('#sgpt-mood');
        const customMoodField = p.querySelector('#sgpt-custom');
        const languageField = p.querySelector('#sgpt-language');
        const lengthField = p.querySelector('#sgpt-length');
        const modelField = p.querySelector('#sgpt-model');

        availableToolsModels = normalizeAvailableToolsModels(data.availableToolsModels || availableToolsModels);
        defaultToolsModel = resolveDefaultToolsModel(availableToolsModels, data.defaultToolsModel || defaultToolsModel);
        preferredToolsModel = resolveDefaultToolsModel(availableToolsModels, data.preferredToolsModel || preferredToolsModel || defaultToolsModel);

        if (modelField) {
            populatePanelModelOptions(preferredToolsModel || defaultToolsModel);
        }

        if (moodField && data.defaultMood) {
            moodField.value = data.defaultMood;
        }

        if (lengthField && data.lastResponseLength) {
            lengthField.value = data.lastResponseLength;
        }

        if (customMoodField) {
            customMoodField.value = data.defaultCustomMood || '';
        }

        if (languageField) {
            languageField.value = normalizeResponseLanguageChoice(data.defaultResponseLanguage || defaultResponseLanguage);
        }


        if (data.autoDetectResponder) {
            detectFacebookUserNameViaObserver((name) => {
                frontResponserName = name;
                if (label) {
                    label.textContent = name;
                    label.dataset.name = name;
                }
            });
        } else {
            frontResponserName = data.responderName || 'Anonymous';
            if (label) {
                label.textContent = frontResponserName;
                label.dataset.name = frontResponserName;
            }
        }
    });

    refreshAvailableModelsForPanel(false);
}

function openReplyPanelWithImportedContext(importedContext, options) {
    const normalizedContext = normalizeWhitespace(importedContext || '');
    const message = options && options.message
        ? String(options.message)
        : ct('contentScript.contextImported', {}, 'Context imported into Toolbox.');

    openReplyPanel();

    if (!normalizedContext || !panel) {
        return;
    }

    setPanelContextValue(normalizedContext, {dirty: true});
    panelContextDirty = true;
    updatePanelAnchorNote();
    updatePanelComposerActions(message, 'success');
}

// ---------------------------------------------
// SEND TO GPT
// ---------------------------------------------
function sendGPT(mod, mode) {
    const ctx = getContextForAiRequest({includeCurrentTarget: false});
    const promptField = panel.querySelector('#sgpt-prompt');
    const prompt = promptField ? promptField.value.trim() : '';
    const effectivePrompt = prompt || DEFAULT_REPLY_PROMPT;
    const modelField = panel.querySelector('#sgpt-model');
    const model = modelField && modelField.value ? modelField.value : getPreferredFactCheckModel();
    const refreshMeta = mod ? getRefreshRequestMeta() : null;
    showLoader(refreshMeta ? refreshMeta.loaderLabel : ct('contentScript.generating', {}, 'Generating…'));

    const selectedLength = panel.querySelector('#sgpt-length').value;
    safeStorageSyncSet({ lastResponseLength: selectedLength });

    const moodField = panel.querySelector('#sgpt-mood');
    const customMoodField = panel.querySelector('#sgpt-custom');
    const languageField = panel.querySelector('#sgpt-language');
    const outputField = panel.querySelector('#sgpt-out');
    const responderField = panel.querySelector('#sgpt-responder-name');
    const responderName = responderField && responderField.dataset
        ? ((responderField.dataset.name || '').trim() || frontResponserName || 'Anonymous')
        : (frontResponserName || 'Anonymous');

    pendingAiRequestMode = mode || (refreshMeta ? refreshMeta.requestMode : 'reply');

    safeSendRuntimeMessage({
        type: 'GPT_REQUEST',
        context: ctx,
        userPrompt: effectivePrompt,
        modifier: refreshMeta ? refreshMeta.modifier : '',
        mood: moodField ? moodField.value : '',
        responseLength: selectedLength,
        customMood: customMoodField ? customMoodField.value.trim() : '',
        responseLanguage: languageField ? languageField.value : defaultResponseLanguage,
        previousReply: refreshMeta ? refreshMeta.previousReply : '',
        model,
        responderName,
        requestMode: mode || (refreshMeta ? refreshMeta.requestMode : 'reply')
    });
}

// ---------------------------------------------
// MARK-MODE CLICK HANDLER
// ---------------------------------------------
function toggleMarkedContextTarget(target) {
    if (!target) {
        return;
    }

    const already = markedElements.includes(target);
    if (already) {
        clearMarkedElementPresentation(target);
        markedElements = markedElements.filter(el => el !== target);
    } else {
        markedElements.push(target);
    }
    refreshMarkedElementPresentation();
    if (panel) {
        setPanelContextValue(getCurrentPanelContextValue());
        updatePanelAnchorNote();
        updatePanelComposerActions();
    }
}

function resolveMarkModeTarget(eventTarget) {
    if (isSocialToolsUiElement(eventTarget)) {
        return null;
    }

    const element = getEventTargetElement(eventTarget);
    return element ? findFullContextNode(element) : null;
}

document.addEventListener('pointerdown', e => {
    if (!isClickMarkingActive || e.button !== 0) return;
    const target = resolveMarkModeTarget(e.target);
    if (!target) return;
    toggleMarkedContextTarget(target);
    e.preventDefault();
    e.stopPropagation();
}, true);

document.addEventListener('click', e => {
    if (!isClickMarkingActive) return;
    const target = resolveMarkModeTarget(e.target);
    if (!target) return;
    e.preventDefault();
    e.stopPropagation();
}, true);

document.addEventListener('focusin', e => {
    const editable = findEditableTarget(e.target);
    if (editable) {
        setActiveComposer(editable);
    }
}, true);

document.addEventListener('selectionchange', () => {
    schedulePositionVerifyActionButton(40);
}, true);

document.addEventListener('mouseup', () => {
    schedulePositionVerifyActionButton(20);
}, true);

document.addEventListener('dblclick', () => {
    schedulePositionVerifyActionButton(24);
}, true);

document.addEventListener('keyup', () => {
    schedulePositionVerifyActionButton(24);
}, true);

document.addEventListener('mouseover', event => {
    if (panel) {
        hideVerifyHoverButton(true);
        return;
    }

    if (verifyHoverButton && verifyHoverButton.contains(event.target)) {
        if (verifyHoverHideTimer) {
            window.clearTimeout(verifyHoverHideTimer);
            verifyHoverHideTimer = null;
        }
        return;
    }

    const target = findVerifiableHoverTarget(event.target);
    if (!target) {
        if (verifyHoverButton && verifyHoverButton.style.display === 'block') {
            return;
        }
        hideVerifyHoverButton(true);
        return;
    }

    if (verifyHoverTarget === target && verifyHoverButton && verifyHoverButton.style.display === 'block') {
        return;
    }

    hideVerifyHoverButton(false);
    verifyHoverTarget = target;
    verifyHoverShowTimer = window.setTimeout(function () {
        verifyHoverShowTimer = null;
        showVerifyHoverButtonForTarget(target);
    }, 220);
}, true);

document.addEventListener('mouseout', event => {
    if (!verifyHoverTarget) {
        return;
    }

    const nextTarget = event.relatedTarget;
    if ((verifyHoverButton && nextTarget && verifyHoverButton.contains(nextTarget)) || (verifyHoverTarget && nextTarget && verifyHoverTarget.contains(nextTarget))) {
        return;
    }

    if (verifyHoverHideTimer) {
        window.clearTimeout(verifyHoverHideTimer);
    }
    verifyHoverHideTimer = window.setTimeout(function () {
        hideVerifyHoverButton(true);
    }, 120);
}, true);

window.addEventListener('resize', () => {
    positionPanelNearComposer();
    positionComposerActionButton();
    positionVerifyActionButton();
    if (verifyHoverTarget) {
        positionVerifyHoverButton();
    }
    positionFactResultBox();
}, true);

window.addEventListener('scroll', () => {
    positionPanelNearComposer();
    positionComposerActionButton();
    positionVerifyActionButton();
    if (verifyHoverTarget) {
        positionVerifyHoverButton();
    }
    positionFactResultBox();
}, true);

function resetMarksAndContext() {
    clearMarkedContextSelection();

    if (panel) {
        const fields = [['#sgpt-modifier', '']
            /*
                        ['#sgpt-context', ''],
                        ['#sgpt-prompt', ''],
                        ['#sgpt-out', ''],
                        ['#sgpt-custom', ''],
                        ['#sgpt-mood', 'Friendly'],
                        ['#sgpt-model', 'gpt-4o']
            */];

        for (const [selector, value] of fields) {
            const el = panel.querySelector(selector);
            if (el) el.value = value;
        }

        refreshPanelContextFromCurrentTarget();
    }
}

function getPreferredFactCheckModel() {
    return resolvePreferredFactCheckModel(preferredFactCheckModel || 'gpt-4o');
}

function getPreferredResponseLanguage() {
    const languageField = panel ? panel.querySelector('#sgpt-language') : null;
    return normalizeResponseLanguageChoice(languageField ? languageField.value : defaultResponseLanguage);
}

function getPreferredVerificationLanguage() {
    return normalizeResponseLanguageChoice(defaultVerifyFactLanguage || defaultResponseLanguage);
}

function getSelectedQuickReplyPreset() {
    return normalizeQuickReplyPresetChoice(defaultQuickReplyPreset);
}

function sanitizeContextForAi(value) {
    const normalized = normalizeWhitespace(value || '');
    if (!normalized || normalized === normalizeWhitespace(getEmptyContextPrompt())) {
        return '';
    }

    return String(value || '').trim();
}

function getContextForAiRequest(options) {
    const settings = options || {};
    const contextField = panel ? panel.querySelector('#sgpt-context') : null;
    const manualContext = sanitizeContextForAi(contextField ? contextField.value : '');
    if (manualContext !== '') {
        return manualContext;
    }

    if (settings.includeCurrentTarget !== false) {
        return sanitizeContextForAi(getCurrentPanelContextValue());
    }

    return '';
}

function buildQuickReplyPrompt(options) {
    const settings = options || {};
    const presetKey = normalizeQuickReplyPresetChoice(settings.presetKey || defaultQuickReplyPreset);
    const preset = QUICK_REPLY_PRESETS[presetKey] || QUICK_REPLY_PRESETS.default;
    const pieces = [preset.instruction];

    if (settings.extraInstruction) {
        pieces.push('Extra quick-reply instruction: ' + settings.extraInstruction);
    }

    if (settings.promptHint) {
        pieces.push('User hint: ' + settings.promptHint);
    }

    return pieces.join('\n\n');
}

function sendQuickReply() {
    if (!panel) {
        openReplyPanel();
    }

    if (!panel) {
        return;
    }

    const moodField = panel.querySelector('#sgpt-mood');
    const customMoodField = panel.querySelector('#sgpt-custom');
    const outputField = panel.querySelector('#sgpt-out');
    const promptField = panel.querySelector('#sgpt-prompt');
    const responderField = panel.querySelector('#sgpt-responder-name');
    const modelField = panel.querySelector('#sgpt-model');
    const responderName = responderField && responderField.dataset
        ? ((responderField.dataset.name || '').trim() || frontResponserName || 'Anonymous')
        : (frontResponserName || 'Anonymous');
    const presetKey = getSelectedQuickReplyPreset();
    const promptHint = promptField ? normalizeWhitespace(promptField.value || '') : '';
    const context = getContextForAiRequest({includeCurrentTarget: true});

    showLoader(ct('contentScript.quickGenerating', {}, 'Generating quick reply…'));
    pendingAiRequestMode = 'quick-reply';
    updatePanelComposerActions(ct('contentScript.quickBuilding', {}, 'Building a quick response from the current comment context…'), 'success');

    safeSendRuntimeMessage({
        type: 'GPT_REQUEST',
        context: context,
        userPrompt: buildQuickReplyPrompt({
            presetKey: presetKey,
            extraInstruction: defaultQuickReplyCustomInstruction,
            promptHint: promptHint,
        }),
        mood: moodField ? moodField.value : '',
        customMood: customMoodField ? customMoodField.value.trim() : '',
        responseLength: 'very-short',
        responseLanguage: getPreferredResponseLanguage(),
        previousReply: outputField ? outputField.value : '',
        model: modelField ? modelField.value : '',
        responderName: responderName,
        requestMode: 'quick-reply'
    });
}

function startFactVerification(contextOverride, options) {
    const settings = options || {};
    const contextField = panel ? panel.querySelector('#sgpt-context') : null;
    const context = normalizeWhitespace(contextOverride || sanitizeContextForAi(contextField ? contextField.value : ''));

    if (!context) {
        alert(ct('contentScript.verifyNoContext', {}, 'There is no context to verify yet. Import, mark, or write context first.'));
        return;
    }

    if (!settings.keepPosition) {
        factResultBoxManualPosition = null;
    }

    showLoader(ct('contentScript.verifyingFacts', {}, 'Verifying facts…'), {skipFloating: true});
    clearCurrentSelection();
    if (panel) {
        updatePanelComposerActions(ct('contentScript.verifyStarted', {}, 'Verify started. Collecting context and checking facts now…'), 'success');
    }

    pendingAiRequestMode = 'verify';
    factResultAnchor = settings.anchor || null;
    lastVerificationRequest = {
        context: context,
        anchor: factResultAnchor,
        model: settings.model || getPreferredFactCheckModel(),
        responseLanguage: settings.responseLanguage || getPreferredVerificationLanguage(),
        sourceLabel: settings.sourceLabel || 'Fact verification',
    };
    showFactVerificationPending(context, factResultAnchor, settings.sourceLabel || 'Fact verification');

    safeSendRuntimeMessage({
        type: 'GPT_REQUEST',
        context,
        userPrompt: (settings.verificationInstruction ? settings.verificationInstruction + '\n\n' : '') + 'Search facts and verify the following statements. If you find any false or misleading information, provide a detailed explanation of why it is incorrect. Use plain text, no format and no markdown.',
        requestMode: 'verify',
        responderName: frontResponserName || 'VerifierBot',
        model: lastVerificationRequest.model,
        responseLanguage: lastVerificationRequest.responseLanguage,
    });

    if (!settings.keepMarks && markedElements.length) {
        clearMarkedContextSelection();
    }
}

// ---------------------------------------------
// MAIN LISTENER
// ---------------------------------------------
safeAddRuntimeMessageListener(function (req, sender, sendResponse) {
    if (req.type === 'GET_FACEBOOK_ADMIN_REPORTER_STATUS') {
        sendResponse(buildAdminReporterStatusPayload());
        return true;
    }

    if (req.type === 'SHOW_LOADER') return showLoader();
    if (req.type === 'HIDE_LOADER') return hideLoader();

    if (req.type === 'TOGGLE_MARK_MODE') {
        isClickMarkingActive = req.enabled;
        updatePanelMarkModeButton(!!req.enabled);
        updatePanelAnchorNote();
    } else if (req.type === 'OPEN_TOOLBOX_FROM_CONTEXT_MENU') {
        const importedContext = normalizeWhitespace(req && req.contextText ? req.contextText : '');
        openReplyPanelWithImportedContext(importedContext, {
            message: ct('contentScript.contextImportedFromMenu', {}, 'Context imported from context menu.'),
        });
    } else if (req.type === 'OPEN_REPLY_PANEL_FROM_POPUP') {
        const selectionSource = getSelectionVerificationSource();
        if (selectionSource && selectionSource.context) {
            openReplyPanelWithImportedContext(selectionSource.context, {
                message: ct('contentScript.contextImportedFromPopup', {}, 'Selected text imported from popup.'),
            });
            sendResponse({ok: true, importedSelection: true});
            return true;
        }

        openReplyPanel();
        sendResponse({ok: true, importedSelection: false});
        return true;
    } else if (req.type === 'OPEN_REPLY_PANEL') {
        openReplyPanel();
    } else if (req.type === 'START_FACT_VERIFICATION_FROM_CONTEXT_MENU') {
        const menuContext = normalizeWhitespace(req && req.contextText ? req.contextText : '');
        startFactVerification(menuContext || undefined, {
            sourceLabel: req && req.sourceLabel ? String(req.sourceLabel) : 'Context menu verify',
            preferPanel: false,
        });
    } else if (req.type === 'GPT_RESPONSE') {
        hideLoader();
        if (pendingAiRequestMode === 'verify') {
            showFactResultBox(
                req.ok ? getReadablePanelText(req.payload) : getReadablePanelErrorText(req.error || req.payload),
                factResultAnchor,
                {
                    title: req.ok
                        ? ct('contentScript.factVerificationTitle', {}, '✅ Fact checking via OpenAI')
                        : ct('contentScript.factVerificationFailedTitle', {}, '⚠️ Fact check failed'),
                    titleColor: req.ok ? '#0284c7' : '#b91c1c',
                    subtitle: buildFactBoxSubtitle(factResultAnchor, lastVerificationRequest ? lastVerificationRequest.responseLanguage : defaultResponseLanguage, !req.ok),
                    subtitleColor: req.ok ? '#7c3aed' : '#b91c1c',
                    borderColor: req.ok ? '#d8b4fe' : '#fecaca',
                    background: req.ok ? '#fff' : '#fef2f2',
                    actions: buildFactBoxActions(),
                }
            );
            pendingAiRequestMode = null;
            if (panel) {
                updatePanelComposerActions(req.ok
                    ? ct('contentScript.factCheckComplete', {}, 'Fact check complete. Review the popup result.')
                    : ct('contentScript.factCheckFailed', {}, 'Fact check failed. Try refresh or think harder.'), req.ok ? 'success' : 'error');
            }
            return;
        }

        if (panel) {
            const outputElement = panel.querySelector('#sgpt-out');
            if (outputElement) {
                outputElement.value = req.ok
                    ? getReadablePanelText(req.payload)
                    : getReadablePanelErrorText(req.error || req.payload);
                resetReplyTransientFieldsButKeepContext();
                if (req.ok) {
                    updatePanelComposerActions();
                } else {
                    updatePanelComposerActions(ct('contentScript.toolsRequestFailed', {}, 'Tools request failed. Review the output above before pasting anything.'), 'error');
                }
                pendingAiRequestMode = null;
                return;
            }
        }

        showFactResultBox(req.ok ? getReadablePanelText(req.payload) : getReadablePanelErrorText(req.error || req.payload), factResultAnchor);
        pendingAiRequestMode = null;

    } else if (req.type === 'START_FACT_VERIFICATION') {
        startFactVerification();
    } else if (req.type === 'SOUNDCLOUD_BUFFER_STATUS') {
        const payload = req && req.payload && typeof req.payload === 'object' ? req.payload : {};
        soundCloudBackgroundPendingCaptureCount = typeof payload.pendingCaptureCount === 'number' ? payload.pendingCaptureCount : soundCloudBackgroundPendingCaptureCount;
        soundCloudBackgroundDuplicateCaptureCount = typeof payload.duplicateCaptureCount === 'number' ? payload.duplicateCaptureCount : soundCloudBackgroundDuplicateCaptureCount;
        soundCloudBackgroundLastFlush = payload.lastFlush || soundCloudBackgroundLastFlush;
        if (payload.lastIngest) {
            const bridge = getSoundCloudPageBridge();
            if (bridge && typeof bridge.setStatusText === 'function' && payload.lastFlush && typeof payload.lastFlush.remaining_count === 'number') {
                bridge.setStatusText(payload.lastFlush.remaining_count > 0
                    ? 'Buffered SoundCloud captures were flushed partially. Some captures are still pending.'
                    : 'Buffered SoundCloud captures were flushed into Tools.');
            }
        }
        updateSoundCloudInsightsControl();
        sendResponse({ok: true});
    } else if (req.type === 'GET_SOUNDCLOUD_PAGE_STATUS') {
        sendResponse(buildSoundCloudPageStatusPayload());
    }
});

window.addEventListener('scx-hook-ready', function (event) {
    if (!SOUND_CLOUD_INSIGHTS_CAPTURE_ENABLED || !isSoundCloudPage()) {
        return;
    }

    soundCloudDirectHookReady = true;
    soundCloudDirectHookMeta = event && event.detail && typeof event.detail === 'object' ? event.detail : null;
    setSoundCloudStatusText('SoundCloud insights hook is ready. Waiting for supported GraphQL captures...');
    reportSoundCloudPageStatus();
}, true);

window.addEventListener('scx-graphql-capture', function (event) {
    if (!SOUND_CLOUD_INSIGHTS_CAPTURE_ENABLED || !isSoundCloudPage()) {
        return;
    }

    handleSoundCloudDirectCapture(event && event.detail ? event.detail : null);
}, true);

window.addEventListener('message', function (event) {
    if (!event.data || event.data.source !== 'tn-networks-social-media-tools' || event.data.type !== 'NETWORK_EVENT') {
        return;
    }

    if (isSoundCloudPage() && soundCloudDirectHookReady && event.data.payload && event.data.payload.soundcloud_capture) {
        return;
    }

    handleIncomingNetworkPayload(event.data.payload || {});
}, true);

if (SOUND_CLOUD_INSIGHTS_CAPTURE_ENABLED) {
    syncSoundCloudDirectHookStateFromDom();
    drainBufferedSoundCloudDirectCaptures();
    drainBufferedSoundCloudNetworkEvents();
} else {
    soundCloudDirectHookReady = false;
    soundCloudDirectHookMeta = null;
}

injectNetworkMonitor();
ensureComposerActionButton();
ensureVerifyActionButton();
ensureAdminActivitiesControl();
ensureSoundCloudInsightsControl();
syncSoundCloudRuntimePreference();
syncAdminRuntimePreferences();
safeAddStorageChangeListener(function (changes, areaName) {
    if (areaName === 'sync' && (changes.facebookAdminDebugEnabled || changes.facebookAdminStatsEnabled)) {
        syncAdminRuntimePreferences();
    }

    if (areaName === 'sync' && (changes.soundcloudAutoIngestEnabled || changes.toolsApiToken)) {
        syncSoundCloudRuntimePreference();
    }
});
handleLocationChange('init');
locationWatchIntervalId = window.setInterval(function () {
    handleLocationChange('interval');
}, 1000);

adminDebugConsoleInfo('[TN Social Tools] content script ready.', {
    version: EXTENSION_VERSION,
    url: location.href,
    admin_activities_match: isFacebookAdminActivitiesPage(),
});

