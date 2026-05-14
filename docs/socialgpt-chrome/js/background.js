const PROD_BASE_URL = 'https://tools.tornevall.net';
const DEV_BASE_URL = 'https://tools.tornevall.com';
const SOCIALGPT_PATH = '/api/ai/socialgpt/respond';
const MODELS_PATH = '/api/social-media-tools/extension/models';
const FACEBOOK_INGEST_PATH = '/api/social-media-tools/facebook/ingest';
const SOUNDCLOUD_INGEST_PATH = '/api/social-media-tools/soundcloud/ingest';
const DEBUG_LOG_KEY = 'tn_networks_debug_logs';
const MAX_DEBUG_LOGS = 200;
const MAX_SOUNDCLOUD_RECENT_EVENTS = 5;
const MAX_SOUNDCLOUD_PENDING_CAPTURES = 50;
const MAX_SOUNDCLOUD_SENT_FINGERPRINTS = 200;
const RETRYABLE_REDIRECT_STATUSES = [301, 302, 303, 307, 308];
const EXTENSION_DISPLAY_NAME = 'Tornevall Networks Social Media Tools';
const FALLBACK_AVAILABLE_MODELS = [
    {id: 'gpt-4o-mini', label: 'gpt-4o-mini'},
    {id: 'gpt-4o', label: 'gpt-4o'},
    {id: 'gpt-4.1-mini', label: 'gpt-4.1-mini'},
    {id: 'gpt-4.1', label: 'gpt-4.1'},
    {id: 'o4-mini', label: 'o4-mini'},
    {id: 'o3-mini', label: 'o3-mini'},
];
const DEFAULT_FACT_CHECK_MODEL = 'gpt-4o';
const soundCloudTabStatusCache = {};
const CONTEXT_MENU_OPEN_TOOLBOX_ID = 'tn-social-tools-open-toolbox';
const CONTEXT_MENU_VERIFY_ID = 'tn-social-tools-verify-fact';

function normalizeExtensionUiLanguage(value) {
    var normalized = String(value || '').trim().toLowerCase();
    return ['auto', 'en', 'sv'].indexOf(normalized) !== -1 ? normalized : 'auto';
}

function detectBrowserUiLocale() {
    try {
        if (chrome.i18n && typeof chrome.i18n.getUILanguage === 'function') {
            return String(chrome.i18n.getUILanguage() || '').toLowerCase().indexOf('sv') === 0 ? 'sv' : 'en';
        }
    } catch (error) {
    }

    return 'en';
}

function resolveExtensionUiLocale(preferredLocale) {
    var normalized = normalizeExtensionUiLanguage(preferredLocale);
    return normalized && normalized !== 'auto' ? normalized : detectBrowserUiLocale();
}

function getBackgroundUiText(locale, key) {
    var dictionary = {
        en: {
            openToolbox: 'Open Toolbox',
            verifyFact: 'Verify fact with Toolbox'
        },
        sv: {
            openToolbox: 'Öppna Toolbox',
            verifyFact: 'Verifiera fakta med Toolbox'
        }
    };

    return (dictionary[locale] && dictionary[locale][key]) || dictionary.en[key] || key;
}

function getToolsBaseUrl(devMode) {
    return devMode ? DEV_BASE_URL : PROD_BASE_URL;
}

function getExtensionClientMeta() {
    try {
        var manifest = chrome.runtime && typeof chrome.runtime.getManifest === 'function'
            ? chrome.runtime.getManifest()
            : null;

        return {
            client_name: manifest && (manifest.name || manifest.short_name) ? String(manifest.name || manifest.short_name).trim() : 'socialgpt-chrome',
            client_version: manifest && manifest.version ? String(manifest.version).trim() : 'unknown',
            client_platform: 'chrome_extension',
        };
    } catch (error) {
        return {
            client_name: 'socialgpt-chrome',
            client_version: 'unknown',
            client_platform: 'chrome_extension',
        };
    }
}

function safeContextMenuCreate(details) {
    chrome.contextMenus.create(details, function () {
        // Ignore duplicate/ephemeral context menu errors during reloads.
        if (chrome.runtime.lastError) {
            return;
        }
    });
}

function setupExtensionContextMenus() {
    if (!chrome.contextMenus || typeof chrome.contextMenus.removeAll !== 'function') {
        return;
    }

    chrome.storage.sync.get(['extensionUiLanguage'], function (data) {
        var locale = resolveExtensionUiLocale(data && data.extensionUiLanguage);
        chrome.contextMenus.removeAll(function () {
            safeContextMenuCreate({
                id: CONTEXT_MENU_OPEN_TOOLBOX_ID,
                title: getBackgroundUiText(locale, 'openToolbox'),
                contexts: ['all'],
            });

            safeContextMenuCreate({
                id: CONTEXT_MENU_VERIFY_ID,
                title: getBackgroundUiText(locale, 'verifyFact'),
                contexts: ['selection', 'link', 'image', 'page'],
            });
        });
    });
}

function buildVerificationContextFromMenuInfo(info) {
    var chunks = [];

    if (info && typeof info.selectionText === 'string' && info.selectionText.trim()) {
        chunks.push('Selected text:\n' + info.selectionText.trim());
    }

    if (info && typeof info.linkUrl === 'string' && info.linkUrl.trim()) {
        chunks.push('Link URL:\n' + info.linkUrl.trim());
    }

    if (info && typeof info.srcUrl === 'string' && info.srcUrl.trim()) {
        chunks.push('Media URL:\n' + info.srcUrl.trim());
    }

    if (info && typeof info.pageUrl === 'string' && info.pageUrl.trim()) {
        chunks.push('Page URL:\n' + info.pageUrl.trim());
    }

    return chunks.join('\n\n');
}

function getRetryBaseUrls(baseUrl) {
    var normalized = String(baseUrl || '').trim();
    var candidates = normalized ? [normalized] : [];

    if (normalized === PROD_BASE_URL && candidates.indexOf(DEV_BASE_URL) === -1) {
        candidates.push(DEV_BASE_URL);
    }

    return candidates;
}

function isRetryableRedirectStatus(status) {
    return RETRYABLE_REDIRECT_STATUSES.indexOf(status) !== -1;
}

function setTabMarking(tabId, val) {
    chrome.storage.session.set({['marking_' + tabId]: val});
}

function getTabMarking(tabId) {
    return new Promise(function (resolve) {
        chrome.storage.session.get('marking_' + tabId, function (data) {
            resolve(data['marking_' + tabId] || false);
        });
    });
}

function appendDebugLog(entry) {
    return new Promise(function (resolve) {
        chrome.storage.session.get(DEBUG_LOG_KEY, function (data) {
            var logs = Array.isArray(data[DEBUG_LOG_KEY]) ? data[DEBUG_LOG_KEY] : [];
            logs.push(Object.assign({
                ts: new Date().toISOString(),
                source: 'background',
            }, entry || {}));
            logs = logs.slice(-MAX_DEBUG_LOGS);
            chrome.storage.session.set({[DEBUG_LOG_KEY]: logs}, function () {
                resolve(logs);
            });
        });
    });
}

function getDebugLogs() {
    return new Promise(function (resolve) {
        chrome.storage.session.get(DEBUG_LOG_KEY, function (data) {
            resolve(Array.isArray(data[DEBUG_LOG_KEY]) ? data[DEBUG_LOG_KEY] : []);
        });
    });
}

function clearDebugLogs() {
    return new Promise(function (resolve) {
        chrome.storage.session.set({[DEBUG_LOG_KEY]: []}, function () {
            resolve();
        });
    });
}

function setAuthFailureIndicator(message) {
    chrome.action.setBadgeBackgroundColor({color: '#b91c1c'});
    chrome.action.setBadgeText({text: 'AUTH'});
    chrome.action.setTitle({title: 'Authentication failed: ' + message});
}

function clearAuthFailureIndicator() {
    chrome.action.setBadgeText({text: ''});
    chrome.action.setTitle({title: EXTENSION_DISPLAY_NAME});
}

function extractToolsApiMessage(data) {
    if (data && typeof data.error === 'string' && data.error.trim()) {
        return data.error.trim();
    }

    if (data && typeof data.message === 'string' && data.message.trim()) {
        return data.message.trim();
    }

    return '';
}

function isAuthFailureStatus(status, data) {
    if (status === 401) {
        return true;
    }

    if (status !== 403) {
        return false;
    }

    var message = extractToolsApiMessage(data).toLowerCase();

    return message.indexOf('authentication') !== -1
        || message.indexOf('unauthenticated') !== -1
        || message.indexOf('unauthorized') !== -1
        || message.indexOf('bearer token') !== -1
        || message.indexOf('forbidden') !== -1
        || message.indexOf('missing permission') !== -1
        || message.indexOf('not allowed to use the requested tools feature') !== -1;
}

function normalizeToolsApiError(status, data) {
    var apiMessage = extractToolsApiMessage(data);

    if (status === 401) {
        return apiMessage || 'Authentication failed. Check your personal Tools bearer token.';
    }

    if (status === 403) {
        if (apiMessage.toLowerCase() === 'model not allowed') {
            return 'Requested model is not allowed for this Tools flow.';
        }

        return apiMessage || 'Access denied for this Tools request.';
    }

    if (status === 503) {
        return apiMessage || 'Tools is reachable, but the global provider_openai key is not configured.';
    }

    return apiMessage || 'Tools API request failed (' + status + ')';
}

function normalizeModelOption(option) {
    var id = option && option.id ? String(option.id).trim() : '';
    if (!id) {
        return null;
    }

    return {
        id: id,
        label: option && option.label ? String(option.label).trim() : id,
        providerVisible: option ? option.provider_visible !== false : true,
        selectedByDefault: !!(option && option.selected_by_default),
    };
}

function normalizeModelCatalog(models, defaultModel) {
    var seen = {};
    var normalized = [];

    (Array.isArray(models) ? models : []).forEach(function (option) {
        var normalizedOption = normalizeModelOption(option);
        if (!normalizedOption || seen[normalizedOption.id]) {
            return;
        }

        seen[normalizedOption.id] = true;
        normalized.push(normalizedOption);
    });

    if (!normalized.length) {
        normalized = FALLBACK_AVAILABLE_MODELS.slice();
    }

    var resolvedDefaultModel = String(defaultModel || '').trim();
    if (!resolvedDefaultModel || !seen[resolvedDefaultModel]) {
        resolvedDefaultModel = normalized[0] ? normalized[0].id : 'gpt-4o-mini';
    }

    normalized.sort(function (left, right) {
        if (left.id === resolvedDefaultModel) {
            return -1;
        }
        if (right.id === resolvedDefaultModel) {
            return 1;
        }

        return left.id.localeCompare(right.id, undefined, {numeric: true, sensitivity: 'base'});
    });

    return {
        models: normalized,
        defaultModel: resolvedDefaultModel,
    };
}

function cacheAvailableModels(catalog) {
    return new Promise(function (resolve) {
        chrome.storage.sync.set({
            availableToolsModels: catalog.models,
            defaultToolsModel: catalog.defaultModel,
            availableToolsModelsSource: catalog.source || 'fallback',
            availableToolsModelsFetchedAt: catalog.fetchedAt || new Date().toISOString(),
            availableToolsModelsWarning: catalog.warning || '',
        }, function () {
            resolve();
        });
    });
}

function readCachedAvailableModels() {
    return new Promise(function (resolve) {
        chrome.storage.sync.get([
            'availableToolsModels',
            'defaultToolsModel',
            'availableToolsModelsSource',
            'availableToolsModelsFetchedAt',
            'availableToolsModelsWarning'
        ], function (data) {
            var normalized = normalizeModelCatalog(data.availableToolsModels || [], data.defaultToolsModel || '');
            resolve({
                models: normalized.models,
                defaultModel: normalized.defaultModel,
                source: data.availableToolsModelsSource || (Array.isArray(data.availableToolsModels) && data.availableToolsModels.length ? 'cache' : 'fallback'),
                fetchedAt: data.availableToolsModelsFetchedAt || null,
                warning: data.availableToolsModelsWarning || '',
            });
        });
    });
}

async function fetchAvailableModels(apiToken, baseUrl, forceRefresh) {
    var baseUrls = getRetryBaseUrls(baseUrl);
    var lastFailure = null;

    for (var i = 0; i < baseUrls.length; i += 1) {
        var currentBaseUrl = baseUrls[i];
        var url = currentBaseUrl + MODELS_PATH + (forceRefresh ? '?refresh=1' : '');

        try {
            var res = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Authorization': 'Bearer ' + apiToken,
                },
            });

            var data = await res.json().catch(function () {
                return {};
            });

            if ((!res.ok || !data.ok) && isRetryableRedirectStatus(res.status) && i < baseUrls.length - 1) {
                lastFailure = {status: res.status, data: data};
                continue;
            }

            if (!res.ok || !data.ok) {
                var cachedCatalog = await readCachedAvailableModels();
                return {
                    ok: false,
                    error: normalizeToolsApiError(res.status, data),
                    status: res.status,
                    models: cachedCatalog.models,
                    defaultModel: cachedCatalog.defaultModel,
                    source: cachedCatalog.source,
                    fetchedAt: cachedCatalog.fetchedAt,
                    warning: cachedCatalog.warning || 'Using cached/fallback model list.',
                };
            }

            var normalized = normalizeModelCatalog(data.models || [], data.default_model || '');
            var catalog = {
                ok: true,
                models: normalized.models,
                defaultModel: normalized.defaultModel,
                source: data.source || 'provider',
                fetchedAt: data.fetched_at || new Date().toISOString(),
                warning: data.warning || '',
            };

            await cacheAvailableModels(catalog);

            return catalog;
        } catch (e) {
            lastFailure = {status: 0, data: {message: e && e.message ? e.message : 'Could not fetch available models from Tools.'}};
        }
    }

    var cachedOnError = await readCachedAvailableModels();
    return {
        ok: false,
        error: normalizeToolsApiError(lastFailure && typeof lastFailure.status === 'number' ? lastFailure.status : 0, lastFailure ? lastFailure.data : {}),
        status: lastFailure && typeof lastFailure.status === 'number' ? lastFailure.status : 0,
        models: cachedOnError.models,
        defaultModel: cachedOnError.defaultModel,
        source: cachedOnError.source,
        fetchedAt: cachedOnError.fetchedAt,
        warning: cachedOnError.warning || 'Using cached/fallback model list.',
    };
}

chrome.runtime.onInstalled.addListener(function () {
    setupExtensionContextMenus();
    appendDebugLog({level: 'info', category: 'lifecycle', message: 'Extension installed / updated.'});
});

chrome.runtime.onStartup.addListener(function () {
    setupExtensionContextMenus();
});

chrome.contextMenus.onClicked.addListener(function (info, tab) {
    if (!tab || typeof tab.id !== 'number') {
        return;
    }

    if (info.menuItemId === CONTEXT_MENU_OPEN_TOOLBOX_ID) {
        chrome.tabs.sendMessage(tab.id, {
            type: 'OPEN_TOOLBOX_FROM_CONTEXT_MENU',
            contextText: info && typeof info.selectionText === 'string' ? info.selectionText.trim() : '',
        });
        return;
    }

    if (info.menuItemId === CONTEXT_MENU_VERIFY_ID) {
        chrome.tabs.sendMessage(tab.id, {
            type: 'START_FACT_VERIFICATION_FROM_CONTEXT_MENU',
            contextText: buildVerificationContextFromMenuInfo(info),
            sourceLabel: 'Context menu verify',
        });
    }
});


chrome.tabs.onUpdated.addListener(function (tabId, info) {
    if (info.status === 'loading') {
        setTabMarking(tabId, false);
        var currentStatus = ensureSoundCloudTabStatus(tabId);
        resetSoundCloudTabStatus(
            tabId,
            typeof info.url === 'string' && info.url ? info.url : currentStatus.pageUrl,
            typeof info.title === 'string' && info.title ? info.title : currentStatus.title
        );
    }
});

chrome.tabs.onRemoved.addListener(function (tabId) {
    delete soundCloudTabStatusCache[String(tabId)];
});


async function callToolsSocialGpt(apiToken, baseUrl, payload) {
    await appendDebugLog({
        level: 'info',
        category: 'ai-request',
        message: 'Sending Tools AI request.',
        meta: {
            baseUrl: baseUrl,
            model: payload.model,
            request_mode: payload.request_mode,
            client_version: payload.client_version || '',
        }
    });

    var baseUrls = getRetryBaseUrls(baseUrl);
    var lastFailure = null;

    try {
        for (var i = 0; i < baseUrls.length; i += 1) {
            var currentBaseUrl = baseUrls[i];
            var res = await fetch(currentBaseUrl + SOCIALGPT_PATH, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + apiToken,
                },
                body: JSON.stringify(payload)
            });

            var data = await res.json().catch(function () {
                return {};
            });

            if ((!res.ok || !data.ok) && isRetryableRedirectStatus(res.status) && i < baseUrls.length - 1) {
                lastFailure = {status: res.status, data: data, baseUrl: currentBaseUrl};
                await appendDebugLog({
                    level: 'warning',
                    category: 'ai-request',
                    message: 'Tools AI request was redirected. Retrying on fallback host.',
                    meta: {
                        baseUrl: currentBaseUrl,
                        fallbackBaseUrl: baseUrls[i + 1],
                        status: res.status,
                    }
                });
                continue;
            }

            if (!res.ok || !data.ok) {
                var errorMessage = normalizeToolsApiError(res.status, data);
                await appendDebugLog({
                    level: 'error',
                    category: 'ai-request',
                    message: errorMessage,
                    meta: {
                        baseUrl: currentBaseUrl,
                        status: res.status,
                        data: data,
                    }
                });

                if (isAuthFailureStatus(res.status, data)) {
                    setAuthFailureIndicator(errorMessage);
                }

                return {ok: false, error: errorMessage, status: res.status};
            }

            clearAuthFailureIndicator();
            await appendDebugLog({
                level: 'info',
                category: 'ai-response',
                message: 'Tools AI request succeeded.',
                meta: {
                    baseUrl: currentBaseUrl,
                    model: data.model || payload.model,
                    usage: data.usage || null,
                }
            });

            return {
                ok: true,
                response: (data && data.response ? String(data.response).trim() : '') || 'No response from Tools API.',
            };
        }
    } catch (e) {
        lastFailure = {status: 0, data: {message: e && e.message ? e.message : 'Error calling Tools API.'}, baseUrl: baseUrl};
        await appendDebugLog({
            level: 'error',
            category: 'ai-request',
            message: 'Network or runtime failure while calling Tools API.',
            meta: {
                baseUrl: baseUrl,
                error: e && e.message ? e.message : String(e),
            }
        });
    }

    return {
        ok: false,
        error: normalizeToolsApiError(lastFailure && typeof lastFailure.status === 'number' ? lastFailure.status : 0, lastFailure ? lastFailure.data : {}),
        status: lastFailure && typeof lastFailure.status === 'number' ? lastFailure.status : 0,
    };
}

function hasMeaningfulAiResponse(result) {
    if (!result || !result.ok) {
        return false;
    }

    var response = result.response ? String(result.response).trim() : '';
    return !!response && response !== 'No response from Tools API.';
}

async function executeToolsRequestWithFactFallback(apiToken, baseUrl, payload) {
    var primaryResult = await callToolsSocialGpt(apiToken, baseUrl, payload);
    var requestedModel = payload && payload.model ? String(payload.model).trim() : '';
    var shouldRetry = payload
        && payload.request_mode === 'verify'
        && requestedModel
        && requestedModel !== DEFAULT_FACT_CHECK_MODEL
        && !hasMeaningfulAiResponse(primaryResult);

    if (!shouldRetry) {
        return primaryResult;
    }

    await appendDebugLog({
        level: 'warning',
        category: 'ai-request',
        message: 'Fact-check returned an empty or failed response. Retrying once with gpt-4o fallback.',
        meta: {
            previous_model: requestedModel,
            fallback_model: DEFAULT_FACT_CHECK_MODEL,
            request_mode: payload.request_mode,
        }
    });

    var retryPayload = Object.assign({}, payload, {
        model: DEFAULT_FACT_CHECK_MODEL,
    });
    var retryResult = await callToolsSocialGpt(apiToken, baseUrl, retryPayload);

    if (retryResult && retryResult.ok) {
        retryResult.response = String(retryResult.response || '').trim();
    }

    return retryResult;
}

async function callFacebookAdminIngest(apiToken, baseUrl, payload) {
    var entries = payload && Array.isArray(payload.entries) ? payload.entries : [];
    await appendDebugLog({
        level: 'info',
        category: 'facebook-admin-ingest',
        message: 'Sending Facebook admin activity ingest request.',
        meta: {
            baseUrl: baseUrl,
            entry_count: entries.length || 1,
            source_url: entries.length ? (entries[0] && entries[0].source_url ? entries[0].source_url : '') : (payload && payload.source_url ? payload.source_url : ''),
            actor_name: entries.length ? (entries[0] && entries[0].actor_name ? entries[0].actor_name : '') : (payload && payload.actor_name ? payload.actor_name : ''),
        }
    });

    try {
        var res = await fetch(baseUrl + FACEBOOK_INGEST_PATH, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + apiToken,
            },
            body: JSON.stringify(payload || {}),
        });

        var data = await res.json().catch(function () {
            return {};
        });

        if (!res.ok || !data.ok) {
            var errorMessage = normalizeToolsApiError(res.status, data);
            await appendDebugLog({
                level: 'error',
                category: 'facebook-admin-ingest',
                message: errorMessage,
                meta: {
                    baseUrl: baseUrl,
                    status: res.status,
                    data: data,
                }
            });

            if (isAuthFailureStatus(res.status, data)) {
                setAuthFailureIndicator(errorMessage);
            }

            return {ok: false, error: errorMessage, status: res.status};
        }

        clearAuthFailureIndicator();
        await appendDebugLog({
            level: 'info',
            category: 'facebook-admin-ingest',
            message: 'Facebook admin activity ingest succeeded.',
            meta: {
                baseUrl: baseUrl,
                received: typeof data.received === 'number' ? data.received : (entries.length || 1),
                created: typeof data.created === 'number' ? data.created : (!!data.created ? 1 : 0),
                updated: typeof data.updated === 'number' ? data.updated : 0,
                event_id: data.event && data.event.id ? data.event.id : null,
                source_id: data.source && data.source.id ? data.source.id : null,
            }
        });

        return {ok: true, data: data};
    } catch (e) {
        await appendDebugLog({
            level: 'error',
            category: 'facebook-admin-ingest',
            message: 'Network or runtime failure while sending Facebook admin activity ingest.',
            meta: {
                baseUrl: baseUrl,
                error: e && e.message ? e.message : String(e),
            }
        });
        return {ok: false, error: 'Error calling Tools API.'};
    }
}

function supportedSoundCloudOperationToDataset(operationName) {
    return {
        TopTracksByWindow: 'tracks',
        TopTracksByRange: 'tracks',
        TopCountriesByWindow: 'countries',
        TopCitiesByWindow: 'cities',
        TopPlaylistsByWindow: 'playlists',
        TotalsByWindow: 'totals',
        IsrcsWithTracks: 'isrcs',
        TrackByPermalink: 'lookup',
    }[String(operationName || '').trim()] || null;
}

function isSoundCloudHost(hostname) {
    return String(hostname || '').toLowerCase().indexOf('soundcloud.com') !== -1;
}

function isSoundCloudUrl(url) {
    try {
        return isSoundCloudHost(new URL(String(url || '')).hostname);
    } catch (error) {
        return false;
    }
}

function isSupportedSoundCloudInsightsUrl(url) {
    try {
        var parsed = new URL(String(url || ''));
        var host = String(parsed.hostname || '').toLowerCase();
        var path = String(parsed.pathname || '').toLowerCase();

        if (!isSoundCloudHost(host)) {
            return false;
        }

        if (host.indexOf('artists.soundcloud.com') !== -1
            || host.indexOf('insights.soundcloud.com') !== -1
            || host.indexOf('insights-ui.soundcloud.com') !== -1) {
            return true;
        }

        return /\/insights(?:\/|$)/.test(path)
            || /\/stats(?:\/|$)/.test(path)
            || /\/you\/insights(?:\/|$)/.test(path)
            || /\/for-artists(?:\/|$)/.test(path);
    } catch (error) {
        return false;
    }
}

function getSoundCloudIdleStateText(tabUrl) {
    if (isSupportedSoundCloudInsightsUrl(tabUrl)) {
        return 'Supported SoundCloud insights page detected. Waiting for page status from the active tab.';
    }

    if (isSoundCloudUrl(tabUrl)) {
        return 'Current SoundCloud page is not a supported insights / for-artists view.';
    }

    return 'SoundCloud insights capture is idle. Open a supported SoundCloud insights page to enable the in-page capture overlay.';
}

function safeArray(value) {
    return Array.isArray(value) ? value : [];
}

function extractSoundCloudCollectionItems(value) {
    if (Array.isArray(value)) {
        return value;
    }

    if (value && typeof value === 'object') {
        if (Array.isArray(value.collection)) {
            return value.collection;
        }
        if (Array.isArray(value.items)) {
            return value.items;
        }
        if (Array.isArray(value.nodes)) {
            return value.nodes;
        }
        if (Array.isArray(value.results)) {
            return value.results;
        }
    }

    return [];
}

function sumSoundCloudMetric(rows, keys) {
    return safeArray(rows).reduce(function (sum, row) {
        if (!row || typeof row !== 'object') {
            return sum;
        }

        for (var index = 0; index < keys.length; index += 1) {
            var value = row[keys[index]];
            if (typeof value !== 'undefined' && !isNaN(Number(value))) {
                return sum + Number(value);
            }
        }

        return sum;
    }, 0);
}

function formatSoundCloudMetricLabel(metricKey) {
    return String(metricKey || '')
        .replace(/[_-]+/g, ' ')
        .replace(/\b\w/g, function (character) {
            return character.toUpperCase();
        });
}

function normalizeSoundCloudCaptureForIngest(payload) {
    if (payload && payload.normalized_dataset && typeof payload.normalized_dataset === 'object') {
        return payload.normalized_dataset;
    }

    var opName = payload && payload.opName ? String(payload.opName).trim() : '';
    var datasetKey = supportedSoundCloudOperationToDataset(opName);
    if (!datasetKey) {
        return null;
    }

    var variables = payload && payload.variables && typeof payload.variables === 'object' ? payload.variables : {};
    var data = payload && payload.data && typeof payload.data === 'object' ? payload.data : {};
    var meta = payload && payload.meta && typeof payload.meta === 'object' ? payload.meta : {};
    var sourceUrl = String(meta.frame || '').trim();
    if (!sourceUrl) {
        return null;
    }

    var rows = [];
    var totalMetric = null;
    switch (datasetKey) {
        case 'tracks':
            rows = extractSoundCloudCollectionItems(data.topTracksByWindow || data.topTracksByRange).map(function (item) {
                var track = item && item.track && typeof item.track === 'object' ? item.track : {};
                return {
                    urn: track.urn ? String(track.urn) : '',
                    title: track.title ? String(track.title) : '',
                    plays: item && typeof item.count !== 'undefined' ? Number(item.count) || 0 : 0,
                    url: track.permalinkUrl ? String(track.permalinkUrl) : '',
                    permalink: track.permalink ? String(track.permalink) : '',
                    artwork: track.artworkUrl ? String(track.artworkUrl) : '',
                    created_at: track.createdAt ? String(track.createdAt) : '',
                    timeseries_by_window: Array.isArray(track.timeseriesByWindow) ? track.timeseriesByWindow : [],
                };
            });
            totalMetric = sumSoundCloudMetric(rows, ['plays']) || null;
            break;
        case 'countries':
            rows = extractSoundCloudCollectionItems(data.topCountriesByWindow).map(function (item) {
                return {
                    country: item && item.country && item.country.name ? item.country.name : '',
                    code: item && item.country && item.country.countryCode ? item.country.countryCode : '',
                    country_code: item && item.country && item.country.countryCode ? item.country.countryCode : '',
                    plays: item && typeof item.count !== 'undefined' ? Number(item.count) || 0 : 0,
                };
            });
            totalMetric = sumSoundCloudMetric(rows, ['plays']) || null;
            break;
        case 'cities':
            rows = extractSoundCloudCollectionItems(data.topCitiesByWindow).map(function (item) {
                return {
                    city: item && item.city && item.city.name ? item.city.name : '',
                    country: item && item.city && item.city.country && item.city.country.name ? item.city.country.name : '',
                    code: item && item.city && item.city.country && item.city.country.countryCode ? item.city.country.countryCode : '',
                    country_code: item && item.city && item.city.country && item.city.country.countryCode ? item.city.country.countryCode : '',
                    plays: item && typeof item.count !== 'undefined' ? Number(item.count) || 0 : 0,
                };
            });
            totalMetric = sumSoundCloudMetric(rows, ['plays']) || null;
            break;
        case 'playlists':
            rows = extractSoundCloudCollectionItems(data.topPlaylistsByWindow).map(function (item) {
                var playlist = item && item.playlist && typeof item.playlist === 'object' ? item.playlist : {};
                return {
                    urn: playlist.urn ? String(playlist.urn) : '',
                    playlist: playlist.title ? String(playlist.title) : '',
                    user: playlist.user && playlist.user.username ? String(playlist.user.username) : '',
                    count: item && typeof item.count !== 'undefined' ? Number(item.count) || 0 : 0,
                    url: playlist.permalinkUrl ? String(playlist.permalinkUrl) : '',
                    artwork: playlist.artworkUrl ? String(playlist.artworkUrl) : '',
                };
            });
            totalMetric = sumSoundCloudMetric(rows, ['count']) || null;
            break;
        case 'totals': {
            var totals = data && data.totalsByWindow && typeof data.totalsByWindow === 'object'
                ? data.totalsByWindow
                : {};
            rows = Object.keys(totals).map(function (metricKey) {
                if (typeof totals[metricKey] === 'undefined' || isNaN(Number(totals[metricKey]))) {
                    return null;
                }

                return {
                    label: formatSoundCloudMetricLabel(metricKey),
                    metric_key: String(metricKey),
                    metric_value: Number(totals[metricKey]) || 0,
                    count: Number(totals[metricKey]) || 0,
                };
            }).filter(function (row) {
                return !!row;
            });
            totalMetric = sumSoundCloudMetric(rows, ['metric_value', 'count']) || null;
            break;
        }
        case 'isrcs':
            rows = extractSoundCloudCollectionItems(data && data.isrcsWithTracks).map(function (item) {
                var track = item && item.track && typeof item.track === 'object' ? item.track : {};
                var metadata = item && item.metadata && typeof item.metadata === 'object' ? item.metadata : {};

                return {
                    isrc: item && item.isrc ? String(item.isrc) : '',
                    sc_track_id: metadata && metadata.scTrackId ? String(metadata.scTrackId) : '',
                    title: metadata && metadata.title ? String(metadata.title) : (track && track.title ? String(track.title) : ''),
                    track_title: track && track.title ? String(track.title) : '',
                    urn: track && track.urn ? String(track.urn) : '',
                    url: track && track.permalinkUrl ? String(track.permalinkUrl) : '',
                    permalink: track && track.permalink ? String(track.permalink) : '',
                    artwork: metadata && metadata.artworkUrl ? String(metadata.artworkUrl) : (track && track.artworkUrl ? String(track.artworkUrl) : ''),
                    released_at: metadata && metadata.releasedAt ? String(metadata.releasedAt) : '',
                    release_date: track && track.releaseDate ? String(track.releaseDate) : '',
                    has_track: !!(track && Object.keys(track).length),
                };
            });
            totalMetric = null;
            break;
        case 'lookup':
            rows = data && data.trackByPermalink && typeof data.trackByPermalink === 'object' ? [data.trackByPermalink] : [];
            break;
    }

    return {
        source_url: sourceUrl,
        source_label: 'SoundCloud 4 Artists',
        source_type: 'soundcloud_4artists',
        dataset_key: datasetKey,
        operation_name: opName,
        window_label: variables && (variables.timeWindow || variables.window || variables.selectedWindow)
            ? String(variables.timeWindow || variables.window || variables.selectedWindow)
            : '',
        captured_at: new Date().toISOString(),
        account_urn: variables && variables.urn ? String(variables.urn) : '',
        account_username: variables && variables.username ? String(variables.username) : '',
        account_permalink_url: variables && variables.permalinkUrl ? String(variables.permalinkUrl) : '',
        rows: rows,
        row_count: rows.length,
        total_metric: totalMetric,
        variables: variables,
        meta: meta,
        summary: {
            row_count: rows.length,
            total_metric: totalMetric,
        },
    };
}

function buildSimpleHash(value) {
    var input = String(value || '');
    var hash = 0;
    for (var index = 0; index < input.length; index += 1) {
        hash = ((hash << 5) - hash) + input.charCodeAt(index);
        hash |= 0;
    }

    return 'sc_' + Math.abs(hash).toString(36);
}

function buildSoundCloudCaptureFingerprint(normalizedPayload) {
    if (!normalizedPayload || typeof normalizedPayload !== 'object') {
        return '';
    }

    return buildSimpleHash(JSON.stringify({
        source_url: normalizedPayload.source_url || '',
        dataset_key: normalizedPayload.dataset_key || '',
        operation_name: normalizedPayload.operation_name || '',
        window_label: normalizedPayload.window_label || '',
        rows: Array.isArray(normalizedPayload.rows) ? normalizedPayload.rows : [],
    }));
}

function ensureSoundCloudTabCollections(status) {
    if (!status || typeof status !== 'object') {
        return;
    }

    if (!Array.isArray(status.pendingCaptures)) {
        status.pendingCaptures = [];
    }

    if (!Array.isArray(status.sentFingerprints)) {
        status.sentFingerprints = [];
    }

    status.pendingCaptureCount = Array.isArray(status.pendingCaptures) ? status.pendingCaptures.length : 0;
    status.duplicateCaptureCount = typeof status.duplicateCaptureCount === 'number' ? status.duplicateCaptureCount : 0;
}

function rememberSoundCloudSentFingerprint(status, fingerprint) {
    if (!status || !fingerprint) {
        return;
    }

    ensureSoundCloudTabCollections(status);
    status.sentFingerprints = status.sentFingerprints.filter(function (existingFingerprint) {
        return existingFingerprint !== fingerprint;
    });
    status.sentFingerprints.unshift(fingerprint);
    if (status.sentFingerprints.length > MAX_SOUNDCLOUD_SENT_FINGERPRINTS) {
        status.sentFingerprints = status.sentFingerprints.slice(0, MAX_SOUNDCLOUD_SENT_FINGERPRINTS);
    }
}

function queueSoundCloudPendingCapture(tabId, rawPayload, normalizedPayload) {
    var status = ensureSoundCloudTabStatus(tabId);
    var fingerprint = buildSoundCloudCaptureFingerprint(normalizedPayload);

    ensureSoundCloudTabCollections(status);

    if (!fingerprint) {
        return {
            queued: false,
            duplicate: false,
            reason: 'missing_fingerprint',
            fingerprint: '',
            pending_count: status.pendingCaptureCount,
        };
    }

    if (status.sentFingerprints.indexOf(fingerprint) !== -1) {
        status.duplicateCaptureCount += 1;
        return {
            queued: false,
            duplicate: true,
            reason: 'already_ingested',
            fingerprint: fingerprint,
            pending_count: status.pendingCaptureCount,
        };
    }

    if (status.pendingCaptures.some(function (entry) { return entry && entry.fingerprint === fingerprint; })) {
        status.duplicateCaptureCount += 1;
        return {
            queued: false,
            duplicate: true,
            reason: 'already_buffered',
            fingerprint: fingerprint,
            pending_count: status.pendingCaptureCount,
        };
    }

    status.pendingCaptures.unshift({
        fingerprint: fingerprint,
        normalizedPayload: normalizedPayload,
        rawPayload: rawPayload || null,
        capturedAt: normalizedPayload && normalizedPayload.captured_at ? normalizedPayload.captured_at : new Date().toISOString(),
    });
    if (status.pendingCaptures.length > MAX_SOUNDCLOUD_PENDING_CAPTURES) {
        status.pendingCaptures = status.pendingCaptures.slice(0, MAX_SOUNDCLOUD_PENDING_CAPTURES);
    }
    status.pendingCaptureCount = status.pendingCaptures.length;

    return {
        queued: true,
        duplicate: false,
        reason: '',
        fingerprint: fingerprint,
        pending_count: status.pendingCaptureCount,
    };
}

function updateSoundCloudTabStatus(tabId, patch) {
    var status = ensureSoundCloudTabStatus(tabId);
    Object.assign(status, patch || {}, {
        updatedAt: new Date().toISOString(),
    });
    return status;
}

function pushSoundCloudBufferStatusToTab(tabId) {
    var status = ensureSoundCloudTabStatus(tabId);
    if (typeof tabId !== 'number' || !chrome || !chrome.tabs || typeof chrome.tabs.sendMessage !== 'function') {
        return;
    }

    chrome.tabs.sendMessage(tabId, {
        type: 'SOUNDCLOUD_BUFFER_STATUS',
        payload: {
            pendingCaptureCount: status.pendingCaptureCount || 0,
            duplicateCaptureCount: status.duplicateCaptureCount || 0,
            lastFlush: status.lastFlush || null,
            lastIngest: status.lastIngest || null,
        }
    }, function () {
    });
}

async function flushSoundCloudPendingCapturesForTab(tabId, apiToken, baseUrl) {
    var status = ensureSoundCloudTabStatus(tabId);
    ensureSoundCloudTabCollections(status);

    if (!status.pendingCaptures.length) {
        status.lastFlush = {
            attempted: false,
            ok: true,
            reason: 'nothing_pending',
            flushed_count: 0,
            duplicate_count: 0,
            failed_count: 0,
            remaining_count: 0,
            flushed_at: new Date().toISOString(),
        };

        pushSoundCloudBufferStatusToTab(tabId);
        return status.lastFlush;
    }

    var pendingEntries = status.pendingCaptures.slice();
    var remainingEntries = [];
    var flushedCount = 0;
    var duplicateCount = 0;
    var failedCount = 0;
    var lastResult = null;

    for (var index = 0; index < pendingEntries.length; index += 1) {
        var entry = pendingEntries[index];
        if (!entry || !entry.normalizedPayload) {
            continue;
        }

        var ingestResult = await callSoundCloudIngest(apiToken, baseUrl, entry.normalizedPayload);
        lastResult = ingestResult;

        if (ingestResult && ingestResult.ok) {
            flushedCount += 1;
            if (ingestResult.duplicate_detected) {
                duplicateCount += 1;
            }
            rememberSoundCloudSentFingerprint(status, entry.fingerprint);
            continue;
        }

        failedCount += 1;
        remainingEntries.push(entry);
    }

    status.pendingCaptures = remainingEntries;
    status.pendingCaptureCount = remainingEntries.length;
    status.lastFlush = {
        attempted: true,
        ok: failedCount === 0,
        flushed_count: flushedCount,
        duplicate_count: duplicateCount,
        failed_count: failedCount,
        remaining_count: remainingEntries.length,
        flushed_at: new Date().toISOString(),
        last_result: lastResult,
    };

    pushSoundCloudBufferStatusToTab(tabId);
    return status.lastFlush;
}

async function flushAllPendingSoundCloudCaptures(apiToken, baseUrl) {
    var keys = Object.keys(soundCloudTabStatusCache);
    for (var index = 0; index < keys.length; index += 1) {
        await flushSoundCloudPendingCapturesForTab(soundCloudTabStatusCache[keys[index]].tabId, apiToken, baseUrl);
    }
}

function ensureSoundCloudTabStatus(tabId) {
    var key = typeof tabId === 'number' ? String(tabId) : 'unknown';
    if (!soundCloudTabStatusCache[key]) {
        soundCloudTabStatusCache[key] = {
            tabId: typeof tabId === 'number' ? tabId : null,
            updatedAt: null,
            pageUrl: '',
            title: '',
            isSoundCloudPage: false,
            isRelevantInsightsPage: false,
            networkMonitorInjected: false,
            hookReady: false,
            stateText: '',
            captureCount: 0,
            lastCapture: null,
            lastIngest: null,
            lastHookMeta: null,
            recentEvents: [],
            pendingCaptures: [],
            sentFingerprints: [],
            pendingCaptureCount: 0,
            duplicateCaptureCount: 0,
            lastFlush: null,
        };
    }

    ensureSoundCloudTabCollections(soundCloudTabStatusCache[key]);

    return soundCloudTabStatusCache[key];
}

function resetSoundCloudTabStatus(tabId, tabUrl, tabTitle) {
    var key = typeof tabId === 'number' ? String(tabId) : 'unknown';
    soundCloudTabStatusCache[key] = {
        tabId: typeof tabId === 'number' ? tabId : null,
        updatedAt: new Date().toISOString(),
        pageUrl: String(tabUrl || ''),
        title: String(tabTitle || ''),
        isSoundCloudPage: isSoundCloudUrl(tabUrl),
        isRelevantInsightsPage: isSupportedSoundCloudInsightsUrl(tabUrl),
        networkMonitorInjected: false,
        hookReady: false,
        stateText: getSoundCloudIdleStateText(tabUrl),
        captureCount: 0,
        lastCapture: null,
        lastIngest: null,
        lastHookMeta: null,
        recentEvents: [],
        pendingCaptures: [],
        sentFingerprints: [],
        pendingCaptureCount: 0,
        duplicateCaptureCount: 0,
        lastFlush: null,
    };

    return soundCloudTabStatusCache[key];
}


function rememberSoundCloudEvent(tabId, rawPayload, normalized, ingestResult) {
    var status = ensureSoundCloudTabStatus(tabId);
    var recentEvents = Array.isArray(status.recentEvents) ? status.recentEvents.slice() : [];
    recentEvents.unshift({
        capturedAt: normalized && normalized.captured_at ? normalized.captured_at : new Date().toISOString(),
        opName: rawPayload && rawPayload.opName ? rawPayload.opName : (normalized && normalized.operation_name ? normalized.operation_name : null),
        datasetKey: normalized && normalized.dataset_key ? normalized.dataset_key : null,
        rowCount: normalized && typeof normalized.row_count === 'number' ? normalized.row_count : null,
        via: rawPayload && rawPayload.meta && rawPayload.meta.via ? rawPayload.meta.via : null,
        host: rawPayload && rawPayload.meta && rawPayload.meta.host ? rawPayload.meta.host : null,
        ingest: ingestResult || null,
    });
    if (recentEvents.length > MAX_SOUNDCLOUD_RECENT_EVENTS) {
        recentEvents = recentEvents.slice(0, MAX_SOUNDCLOUD_RECENT_EVENTS);
    }

    status.recentEvents = recentEvents;
    return status;
}

async function callSoundCloudIngest(apiToken, baseUrl, payload) {
    await appendDebugLog({
        level: 'info',
        category: 'soundcloud-ingest',
        message: 'Sending SoundCloud insights ingest request.',
        meta: {
            baseUrl: baseUrl,
            dataset_key: payload && payload.dataset_key ? payload.dataset_key : null,
            operation_name: payload && payload.operation_name ? payload.operation_name : null,
            row_count: payload && typeof payload.row_count !== 'undefined' ? payload.row_count : 0,
            source_url: payload && payload.source_url ? payload.source_url : '',
        }
    });

    try {
        var res = await fetch(baseUrl + SOUNDCLOUD_INGEST_PATH, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + apiToken,
            },
            body: JSON.stringify(payload || {}),
        });

        var data = await res.json().catch(function () {
            return {};
        });

        if (!res.ok || !data.ok) {
            var errorMessage = normalizeToolsApiError(res.status, data);
            await appendDebugLog({
                level: 'error',
                category: 'soundcloud-ingest',
                message: errorMessage,
                meta: {
                    baseUrl: baseUrl,
                    status: res.status,
                    data: data,
                }
            });

            if (isAuthFailureStatus(res.status, data)) {
                setAuthFailureIndicator(errorMessage);
            }

            return {attempted: true, ok: false, status: res.status, message: errorMessage};
        }

        clearAuthFailureIndicator();
        await appendDebugLog({
            level: 'info',
            category: 'soundcloud-ingest',
            message: 'SoundCloud insights ingest succeeded.',
            meta: {
                baseUrl: baseUrl,
                dataset_key: payload && payload.dataset_key ? payload.dataset_key : null,
                event_id: data && data.event ? data.event.id : null,
                source_id: data && data.source ? data.source.id : null,
            }
        });

        return {
            attempted: true,
            ok: true,
            status: res.status,
            message: extractToolsApiMessage(data),
            event_id: data && data.event ? data.event.id : null,
            source_id: data && data.source ? data.source.id : null,
            duplicate_detected: !!(data && data.duplicate_detected),
            payload_hash: data && data.payload_hash ? data.payload_hash : null,
        };
    } catch (e) {
        await appendDebugLog({
            level: 'error',
            category: 'soundcloud-ingest',
            message: 'Network or runtime failure while sending SoundCloud insights ingest.',
            meta: {
                baseUrl: baseUrl,
                error: e && e.message ? e.message : String(e),
            }
        });
        return {
            attempted: true,
            ok: false,
            status: 0,
            message: e && e.message ? e.message : 'Error calling Tools API.',
        };
    }
}

function getSoundCloudActiveTabStatus() {
    return new Promise(function (resolve) {
        chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
            if (chrome.runtime.lastError) {
                resolve({ok: false, error: chrome.runtime.lastError.message});
                return;
            }

            var tab = Array.isArray(tabs) && tabs.length ? tabs[0] : null;
            var tabId = tab && typeof tab.id === 'number' ? tab.id : null;
            var cachedStatus = ensureSoundCloudTabStatus(tabId);

            if (!tab || tabId === null) {
                resolve({
                    ok: true,
                    activeTab: null,
                    status: cachedStatus,
                    recentEvents: cachedStatus.recentEvents || [],
                });
                return;
            }

            if (!isSoundCloudUrl(tab.url || '')) {
                cachedStatus = resetSoundCloudTabStatus(tabId, tab.url || '', tab.title || '');
                resolve({
                    ok: true,
                    activeTab: {
                        id: tab.id,
                        url: tab.url || '',
                        title: tab.title || '',
                    },
                    status: Object.assign({}, cachedStatus, {
                        responseError: null,
                    }),
                    recentEvents: [],
                });
                return;
            }

            chrome.tabs.sendMessage(tabId, {type: 'GET_SOUNDCLOUD_PAGE_STATUS'}, function (pageStatus) {
                var responseError = chrome.runtime.lastError ? chrome.runtime.lastError.message : '';
                var mergedStatus = Object.assign({}, cachedStatus);

                if (pageStatus && pageStatus.ok) {
                    mergedStatus = Object.assign({}, mergedStatus, pageStatus.status || {});
                    mergedStatus.pendingCaptureCount = typeof mergedStatus.pendingCaptureCount === 'number'
                        ? mergedStatus.pendingCaptureCount
                        : (cachedStatus.pendingCaptureCount || 0);
                    mergedStatus.duplicateCaptureCount = typeof mergedStatus.duplicateCaptureCount === 'number'
                        ? mergedStatus.duplicateCaptureCount
                        : (cachedStatus.duplicateCaptureCount || 0);
                    mergedStatus.lastFlush = mergedStatus.lastFlush || cachedStatus.lastFlush || null;
                } else if (!mergedStatus.pageUrl) {
                    mergedStatus.pageUrl = tab.url || '';
                }

                resolve({
                    ok: true,
                    activeTab: {
                        id: tab.id,
                        url: tab.url || mergedStatus.pageUrl || '',
                        title: tab.title || mergedStatus.title || '',
                    },
                    status: Object.assign({}, mergedStatus, {
                        responseError: responseError || null,
                    }),
                    recentEvents: Array.isArray(cachedStatus.recentEvents) ? cachedStatus.recentEvents.slice(0, MAX_SOUNDCLOUD_RECENT_EVENTS) : [],
                });
            });
        });
    });
}

chrome.runtime.onMessage.addListener(function (req, sender, sendResponse) {
    if (req.type === 'RESET_MARK_MODE') {
        var tabId = sender.tab.id;
        setTabMarking(tabId, false);
        chrome.tabs.sendMessage(tabId, {type: 'TOGGLE_MARK_MODE', enabled: false});
        return;
    }

    if (req.type === 'GET_MARK_MODE') {
        var getTabId = sender && sender.tab ? sender.tab.id : null;
        if (getTabId === null || typeof getTabId === 'undefined') {
            sendResponse({ok: true, enabled: false});
            return true;
        }

        getTabMarking(getTabId).then(function (enabled) {
            sendResponse({ok: true, enabled: !!enabled});
        });
        return true;
    }

    if (req.type === 'SET_MARK_MODE') {
        var setTabId = sender && sender.tab ? sender.tab.id : null;
        var enabled = !!req.enabled;
        if (setTabId === null || typeof setTabId === 'undefined') {
            sendResponse({ok: false, error: 'No active tab was available for mark mode.'});
            return true;
        }

        setTabMarking(setTabId, enabled);
        chrome.tabs.sendMessage(setTabId, {type: 'TOGGLE_MARK_MODE', enabled: enabled});
        appendDebugLog({level: 'info', category: 'ui', message: 'Mark mode toggled from panel.', meta: {enabled: enabled, tabId: setTabId}}).then(function () {
            sendResponse({ok: true, enabled: enabled});
        });
        return true;
    }

    if (req.type === 'DEBUG_LOG') {
        appendDebugLog(req.entry || {}).then(function () {
            sendResponse({ok: true});
        });
        return true;
    }

    if (req.type === 'GET_DEBUG_LOGS') {
        getDebugLogs().then(function (logs) {
            sendResponse({ok: true, logs: logs});
        });
        return true;
    }

    if (req.type === 'CLEAR_DEBUG_LOGS') {
        clearDebugLogs().then(function () {
            sendResponse({ok: true});
        });
        return true;
    }

    if (req.type === 'GET_TOOLS_RUNTIME_SETTINGS') {
        chrome.storage.sync.get([
            'toolsApiToken',
            'devMode',
            'soundcloudAutoIngestEnabled',
            'facebookAdminStatsEnabled',
            'facebookAdminDebugEnabled',
            'defaultToolsModel',
            'preferredFactCheckModel'
        ], function (data) {
            sendResponse({ok: true, settings: data || {}});
        });
        return true;
    }

    if (req.type === 'GET_AVAILABLE_MODELS') {
        chrome.storage.sync.get(['toolsApiToken', 'devMode'], async function (data) {
            if (!data.toolsApiToken) {
                var fallbackCatalog = await readCachedAvailableModels();
                sendResponse({
                    ok: false,
                    error: 'Missing Tools API token. Save it in the extension popup first.',
                    models: fallbackCatalog.models,
                    defaultModel: fallbackCatalog.defaultModel,
                    source: fallbackCatalog.source,
                    fetchedAt: fallbackCatalog.fetchedAt,
                    warning: fallbackCatalog.warning || 'Using cached/fallback model list.',
                });
                return;
            }

            var baseUrl = getToolsBaseUrl(!!data.devMode);
            var catalog = await fetchAvailableModels(data.toolsApiToken, baseUrl, !!req.forceRefresh);
            sendResponse(catalog);
        });
        return true;
    }

    if (req.type === 'GPT_REQUEST') {
        var requestTabId = sender.tab.id;
        chrome.storage.sync.get(['toolsApiToken', 'devMode', 'defaultToolsModel', 'preferredFactCheckModel'], async function (data) {
            if (!data.toolsApiToken) {
                var missingTokenMessage = 'Missing Tools API token. Register at tools.tornevall.net, generate a personal bearer token there, and save it in the extension popup.';
                setAuthFailureIndicator(missingTokenMessage);
                await appendDebugLog({level: 'error', category: 'auth', message: missingTokenMessage});
                sendResponse({ok: false, error: missingTokenMessage});
                chrome.tabs.sendMessage(requestTabId, {
                    type: 'GPT_RESPONSE',
                    payload: missingTokenMessage,
                    ok: false
                });
                return;
            }

            var baseUrl = getToolsBaseUrl(!!data.devMode);
            var clientMeta = getExtensionClientMeta();
            var payload = {
                context: req.context.trim(),
                user_prompt: req.userPrompt.trim(),
                modifier: req.modifier ? req.modifier.trim() : '',
                mood: req.mood || '',
                custom_mood: req.customMood ? req.customMood.trim() : '',
                response_length: req.responseLength || 'auto',
                previous_reply: req.previousReply || '',
                model: req.model || (req.requestMode === 'verify' ? (data.preferredFactCheckModel || DEFAULT_FACT_CHECK_MODEL) : '') || data.defaultToolsModel || 'gpt-4o-mini',
                responder_name_override: req.responderName || '',
                request_mode: req.requestMode || 'reply',
                response_language: req.responseLanguage || 'auto',
                client_name: clientMeta.client_name,
                client_version: clientMeta.client_version,
                client_platform: clientMeta.client_platform,
            };

            var toolsResponse = await executeToolsRequestWithFactFallback(data.toolsApiToken, baseUrl, payload);
            var output = toolsResponse.ok ? toolsResponse.response : toolsResponse.error;

            chrome.tabs.sendMessage(requestTabId, {type: 'GPT_RESPONSE', payload: output, ok: toolsResponse.ok});
            sendResponse({ok: toolsResponse.ok, error: toolsResponse.error || null});
        });
        return true;
    }

    if (req.type === 'FACEBOOK_ADMIN_INGEST') {
        chrome.storage.sync.get(['toolsApiToken', 'devMode'], async function (data) {
            if (!data.toolsApiToken) {
                var missingTokenMessage = 'Missing Tools API token. Save it in the extension popup first.';
                await appendDebugLog({level: 'error', category: 'facebook-admin-ingest', message: missingTokenMessage});
                sendResponse({ok: false, error: missingTokenMessage});
                return;
            }

            var baseUrl = getToolsBaseUrl(!!data.devMode);
            var ingestPayload = Array.isArray(req.entries) && req.entries.length
                ? {entries: req.entries}
                : (req.entry || {});
            var ingestResponse = await callFacebookAdminIngest(data.toolsApiToken, baseUrl, ingestPayload);
            sendResponse(ingestResponse);
        });
        return true;
    }

    if (req.type === 'SOUNDCLOUD_STATUS_UPDATE') {
        var statusTabId = sender && sender.tab ? sender.tab.id : null;
        var statusPayload = req.payload && typeof req.payload === 'object' ? req.payload : {};
        var updatedStatus = updateSoundCloudTabStatus(statusTabId, {
            pageUrl: statusPayload.pageUrl || (sender && sender.tab ? sender.tab.url || '' : ''),
            title: statusPayload.title || (sender && sender.tab ? sender.tab.title || '' : ''),
            isSoundCloudPage: !!statusPayload.isSoundCloudPage,
            isRelevantInsightsPage: !!statusPayload.isRelevantInsightsPage,
            networkMonitorInjected: !!statusPayload.networkMonitorInjected,
            hookReady: !!statusPayload.hookReady,
            stateText: statusPayload.stateText || '',
            captureCount: typeof statusPayload.captureCount === 'number' ? statusPayload.captureCount : ensureSoundCloudTabStatus(statusTabId).captureCount,
            lastCapture: statusPayload.lastCapture || ensureSoundCloudTabStatus(statusTabId).lastCapture,
            lastHookMeta: statusPayload.lastHookMeta || ensureSoundCloudTabStatus(statusTabId).lastHookMeta,
            pendingCaptureCount: typeof statusPayload.pendingCaptureCount === 'number' ? statusPayload.pendingCaptureCount : ensureSoundCloudTabStatus(statusTabId).pendingCaptureCount,
            lastFlush: statusPayload.lastFlush || ensureSoundCloudTabStatus(statusTabId).lastFlush,
        });
        sendResponse({ok: true, status: updatedStatus});
        return true;
    }

    if (req.type === 'SOUNDCLOUD_CAPTURE') {
        var captureTabId = sender && sender.tab ? sender.tab.id : null;
        var capturePayload = req.payload && typeof req.payload === 'object' ? req.payload : {};
        chrome.storage.sync.get(['toolsApiToken', 'devMode', 'soundcloudAutoIngestEnabled'], async function (data) {
            var normalizedPayload = normalizeSoundCloudCaptureForIngest(capturePayload);
            var ingestResult = {attempted: false, ok: false, reason: 'unsupported_operation'};
            var queueResult = null;

            if (normalizedPayload) {
                if (normalizedPayload.dataset_key !== 'lookup' && (!normalizedPayload.row_count || !Array.isArray(normalizedPayload.rows) || !normalizedPayload.rows.length)) {
                    ingestResult = {attempted: false, ok: false, reason: 'empty_normalized_rows'};
                } else {
                    queueResult = queueSoundCloudPendingCapture(captureTabId, capturePayload, normalizedPayload);
                    if (queueResult.duplicate) {
                        ingestResult = {
                            attempted: false,
                            ok: true,
                            reason: queueResult.reason,
                            duplicate_detected: true,
                            buffered_count: queueResult.pending_count,
                        };
                    } else if (data.soundcloudAutoIngestEnabled !== true) {
                        ingestResult = {
                            attempted: false,
                            ok: false,
                            reason: 'auto_ingest_disabled',
                            buffered_count: queueResult.pending_count,
                        };
                    } else if (!data.toolsApiToken) {
                        ingestResult = {
                            attempted: false,
                            ok: false,
                            reason: 'missing_tools_token',
                            buffered_count: queueResult.pending_count,
                        };
                    } else {
                        ingestResult = await flushSoundCloudPendingCapturesForTab(captureTabId, data.toolsApiToken, getToolsBaseUrl(!!data.devMode));
                    }
                }
            }

            var currentStatus = ensureSoundCloudTabStatus(captureTabId);
            updateSoundCloudTabStatus(captureTabId, {
                pageUrl: capturePayload && capturePayload.meta ? capturePayload.meta.frame || currentStatus.pageUrl || '' : currentStatus.pageUrl,
                title: sender && sender.tab ? sender.tab.title || currentStatus.title || '' : currentStatus.title,
                isSoundCloudPage: true,
                isRelevantInsightsPage: true,
                networkMonitorInjected: true,
                hookReady: true,
                stateText: normalizedPayload
                    ? ('Captured ' + normalizedPayload.dataset_key + ' via ' + (normalizedPayload.operation_name || 'SoundCloud GraphQL')
                        + (queueResult && queueResult.duplicate ? ' (duplicate ignored).' : (currentStatus.pendingCaptureCount ? '. Buffered ' + currentStatus.pendingCaptureCount + ' capture(s) pending.' : '.')))
                    : 'Observed SoundCloud GraphQL traffic, but it did not match a supported insights dataset.',
                captureCount: (currentStatus.captureCount || 0) + 1,
                lastCapture: normalizedPayload ? {
                    opName: normalizedPayload.operation_name,
                    datasetKey: normalizedPayload.dataset_key,
                    rowCount: normalizedPayload.row_count,
                    totalMetric: normalizedPayload.total_metric,
                    capturedAt: normalizedPayload.captured_at,
                } : currentStatus.lastCapture,
                lastIngest: ingestResult,
                lastHookMeta: capturePayload && capturePayload.meta ? capturePayload.meta : currentStatus.lastHookMeta,
                pendingCaptureCount: currentStatus.pendingCaptureCount || 0,
                duplicateCaptureCount: currentStatus.duplicateCaptureCount || 0,
                lastFlush: currentStatus.lastFlush || null,
            });
            rememberSoundCloudEvent(captureTabId, capturePayload, normalizedPayload, ingestResult);
            pushSoundCloudBufferStatusToTab(captureTabId);

            sendResponse({
                ok: true,
                ingest: ingestResult,
                pending_capture_count: currentStatus.pendingCaptureCount || 0,
                last_flush: currentStatus.lastFlush || null,
                normalized: normalizedPayload ? {
                    dataset_key: normalizedPayload.dataset_key,
                    operation_name: normalizedPayload.operation_name,
                    row_count: normalizedPayload.row_count,
                    total_metric: normalizedPayload.total_metric,
                } : null,
            });
        });
        return true;
    }

    if (req.type === 'GET_SOUNDCLOUD_ACTIVE_TAB_STATUS') {
        getSoundCloudActiveTabStatus().then(function (result) {
            sendResponse(result);
        });
        return true;
    }
});

chrome.storage.onChanged.addListener(function (changes, areaName) {
    if (areaName !== 'sync') {
        return;
    }

    if (changes.extensionUiLanguage) {
        setupExtensionContextMenus();
    }

    var shouldTryFlush = false;
    if (changes.soundcloudAutoIngestEnabled && changes.soundcloudAutoIngestEnabled.newValue === true) {
        shouldTryFlush = true;
    }
    if (changes.toolsApiToken && changes.toolsApiToken.newValue) {
        shouldTryFlush = true;
    }
    if (changes.devMode) {
        shouldTryFlush = true;
    }

    if (!shouldTryFlush) {
        return;
    }

    chrome.storage.sync.get(['toolsApiToken', 'devMode', 'soundcloudAutoIngestEnabled'], async function (data) {
        if (data.soundcloudAutoIngestEnabled !== true || !data.toolsApiToken) {
            return;
        }

        await flushAllPendingSoundCloudCaptures(data.toolsApiToken, getToolsBaseUrl(!!data.devMode));
    });
});

console.log('[' + EXTENSION_DISPLAY_NAME + '] Background SW ready for tools.tornevall.net / tools.tornevall.com');
