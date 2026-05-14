(function (global) {
    function normalizeFunction(value, fallback) {
        return typeof value === 'function' ? value : fallback;
    }

    function createSoundCloudPageBridge(options) {
        var config = options || {};
        var state = {
            statusText: 'SoundCloud insights capture is idle.',
            captureCount: 0,
            lastCapture: null,
            lastIngest: null,
            pendingCaptureCount: 0,
            lastFlush: null,
        };

        function isSoundCloudPage() {
            return !!normalizeFunction(config.isSoundCloudPage, function () {
                return false;
            })();
        }

        function isSupportedInsightsPage() {
            return !!normalizeFunction(config.isSupportedInsightsPage, function () {
                return false;
            })();
        }

        function getLocationHref() {
            return String(normalizeFunction(config.getLocationHref, function () {
                return global.location && global.location.href ? global.location.href : '';
            })() || '');
        }

        function getDocumentTitle() {
            return String(normalizeFunction(config.getDocumentTitle, function () {
                return global.document && global.document.title ? global.document.title : '';
            })() || '');
        }

        function isNetworkMonitorInjected() {
            return !!normalizeFunction(config.getNetworkMonitorInjected, function () {
                return false;
            })();
        }

        function isHookReady() {
            return !!normalizeFunction(config.getHookReady, function () {
                return false;
            })();
        }

        function getLastHookMeta() {
            var meta = normalizeFunction(config.getLastHookMeta, function () {
                return null;
            })();

            return meta && typeof meta === 'object' ? meta : null;
        }

        function sendRuntimeMessage(message) {
            return normalizeFunction(config.sendRuntimeMessage, function () {
                return false;
            })(message);
        }

        function sendRuntimeMessageWithResponse(message) {
            return normalizeFunction(config.sendRuntimeMessageWithResponse, function () {
                return Promise.resolve({ok: false, error: 'Runtime bridge unavailable.'});
            })(message);
        }

        function setStatusText(text) {
            state.statusText = String(text || '').trim() || 'SoundCloud insights capture is idle.';
            return state.statusText;
        }

        function buildLastCapture(capture, normalized) {
            if (normalized) {
                return {
                    opName: normalized.operation_name || (capture && capture.opName ? capture.opName : null),
                    datasetKey: normalized.dataset_key || null,
                    rowCount: typeof normalized.row_count === 'number' ? normalized.row_count : 0,
                    totalMetric: typeof normalized.total_metric === 'number' ? normalized.total_metric : null,
                    capturedAt: normalized.captured_at || new Date().toISOString(),
                };
            }

            return {
                opName: capture && capture.opName ? capture.opName : null,
                datasetKey: null,
                rowCount: 0,
                totalMetric: null,
                capturedAt: new Date().toISOString(),
            };
        }

        function buildPageStatusPayload() {
            return {
                ok: true,
                status: {
                    pageUrl: getLocationHref(),
                    title: getDocumentTitle(),
                    isSoundCloudPage: isSoundCloudPage(),
                    isRelevantInsightsPage: isSupportedInsightsPage(),
                    networkMonitorInjected: !!(isNetworkMonitorInjected() && isSupportedInsightsPage()),
                    hookReady: isHookReady(),
                    stateText: state.statusText,
                    captureCount: state.captureCount,
                    lastCapture: state.lastCapture,
                    lastIngest: state.lastIngest,
                    pendingCaptureCount: state.pendingCaptureCount,
                    lastFlush: state.lastFlush,
                    lastHookMeta: getLastHookMeta(),
                }
            };
        }

        function reportPageStatus() {
            if (!isSoundCloudPage()) {
                return false;
            }

            return sendRuntimeMessage({
                type: 'SOUNDCLOUD_STATUS_UPDATE',
                payload: buildPageStatusPayload().status,
            });
        }

        function applyIngestResponseStatus(response) {
            state.lastIngest = response && response.ingest ? response.ingest : null;
            state.pendingCaptureCount = response && typeof response.pending_capture_count === 'number'
                ? response.pending_capture_count
                : state.pendingCaptureCount;
            state.lastFlush = response && response.last_flush ? response.last_flush : state.lastFlush;

            if (!response || !response.ok) {
                setStatusText('SoundCloud capture forwarding failed: ' + ((response && response.error) || 'Unknown runtime error.'));
                reportPageStatus();
                return;
            }

            if (response.ingest && response.ingest.attempted === false) {
                setStatusText('Captured SoundCloud dataset, but ingest was not attempted: ' + (response.ingest.reason === 'empty_normalized_rows'
                    ? 'no normalized insight rows were found yet'
                    : (response.ingest.reason || 'unknown reason')) + '.');
            } else if (response.ingest && response.ingest.ok) {
                setStatusText('Captured and ingested SoundCloud dataset successfully.');
            } else if (response.ingest && response.ingest.attempted) {
                setStatusText('Captured SoundCloud dataset, but ingest failed' + (response.ingest.message ? ': ' + response.ingest.message : '.'));
            }

            reportPageStatus();
        }

        function handleNetworkEventPayload(payload) {
            var capture;
            var normalized;

            if (!isSoundCloudPage() || !payload || !payload.soundcloud_capture) {
                return false;
            }

            if (!isSupportedInsightsPage()) {
                setStatusText('Observed SoundCloud traffic outside supported insights pages. Capture ignored.');
                reportPageStatus();
                return true;
            }

            capture = payload.soundcloud_capture;
            normalized = capture && capture.normalized_dataset ? capture.normalized_dataset : null;

            state.captureCount += 1;
            state.lastCapture = buildLastCapture(capture, normalized);
            state.lastIngest = null;
            setStatusText(normalized
                ? ('Captured SoundCloud dataset ' + normalized.dataset_key + ' via ' + (normalized.operation_name || 'GraphQL') + '.')
                : 'Observed SoundCloud GraphQL traffic, but it did not match a supported dataset.');
            reportPageStatus();

            sendRuntimeMessageWithResponse({
                type: 'SOUNDCLOUD_CAPTURE',
                payload: capture,
            }).then(applyIngestResponseStatus);

            return true;
        }

        return {
            buildPageStatusPayload: buildPageStatusPayload,
            reportPageStatus: reportPageStatus,
            handleNetworkEventPayload: handleNetworkEventPayload,
            setStatusText: setStatusText,
        };
    }

    global.TNNetworksSoundCloudPageBridge = {
        create: createSoundCloudPageBridge,
    };
}(window));

