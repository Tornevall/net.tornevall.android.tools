(function (global) {
    var DEFAULT_STORAGE_KEY = 'tn_social_tools_facebook_admin_reporter_v1';
    var DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;
    var DEFAULT_MAX_PERSISTED_ENTRIES = 1200;

    function normalizeWhitespace(value) {
        return String(value || '').replace(/\s+/g, ' ').trim();
    }

    function normalizeLowercase(value) {
        return normalizeWhitespace(value).toLowerCase();
    }

    function normalizeUrl(value) {
        var raw = normalizeWhitespace(value);
        if (!raw) {
            return '';
        }

        try {
            var parsed = new URL(raw, global.location && global.location.href ? global.location.href : undefined);
            return (parsed.origin + parsed.pathname).replace(/\/+$/, '');
        } catch (error) {
            return raw.replace(/[?#].*$/, '').replace(/\/+$/, '');
        }
    }

    function normalizeIsoTimestamp(value) {
        if (typeof value === 'number' && isFinite(value)) {
            var numericDate = new Date(value > 9999999999 ? value : value * 1000);
            return isNaN(numericDate.getTime()) ? '' : numericDate.toISOString();
        }

        var raw = normalizeWhitespace(value);
        if (!raw) {
            return '';
        }

        if (/^\d{10,13}$/.test(raw)) {
            var numericValue = Number(raw);
            if (isFinite(numericValue)) {
                var dateFromUnix = new Date(raw.length >= 13 ? numericValue : numericValue * 1000);
                if (!isNaN(dateFromUnix.getTime())) {
                    return dateFromUnix.toISOString();
                }
            }
        }

        var parsed = Date.parse(raw);
        if (!parsed) {
            return raw;
        }

        try {
            return new Date(parsed).toISOString();
        } catch (error) {
            return raw;
        }
    }

    function extractGroupIdFromUrl(url) {
        var normalizedUrl = normalizeUrl(url);
        if (!normalizedUrl) {
            return '';
        }

        try {
            var parsed = new URL(normalizedUrl, global.location && global.location.href ? global.location.href : undefined);
            var segments = parsed.pathname.replace(/^\/+|\/+$/g, '').split('/');
            if (segments[0] !== 'groups') {
                return '';
            }

            return normalizeWhitespace(segments[1] || '');
        } catch (error) {
            return '';
        }
    }

    function looksGenericTargetLabel(value) {
        var normalized = normalizeLowercase(value);
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

    function clipText(value, maxLength) {
        var text = String(value || '');
        if (text.length <= maxLength) {
            return text;
        }

        return text.slice(0, Math.max(0, maxLength - 1)).trim() + '…';
    }

    function getSessionStorageTarget() {
        if (!global) {
            return null;
        }

        try {
            return global.sessionStorage || null;
        } catch (error) {
            return null;
        }
    }

    function safeStorageGet(storageKey) {
        var storage = getSessionStorageTarget();
        if (!storage || typeof storage.getItem !== 'function') {
            return null;
        }

        try {
            return storage.getItem(storageKey);
        } catch (error) {
            return null;
        }
    }

    function safeStorageSet(storageKey, value) {
        var storage = getSessionStorageTarget();
        if (!storage || typeof storage.setItem !== 'function') {
            return false;
        }

        try {
            storage.setItem(storageKey, value);
            return true;
        } catch (error) {
            return false;
        }
    }

    function safeStorageRemove(storageKey) {
        var storage = getSessionStorageTarget();
        if (!storage || typeof storage.removeItem !== 'function') {
            return false;
        }

        try {
            storage.removeItem(storageKey);
            return true;
        } catch (error) {
            return false;
        }
    }

    function cloneEntry(entry) {
        return JSON.parse(JSON.stringify(entry));
    }

    function sortEntriesByRecency(entries) {
        return (entries || []).slice().sort(function (left, right) {
            var rightTime = Date.parse(right && (right.facebook_activity_time || right.occurred_at || right.last_detected_at || right.detected_at) || '') || 0;
            var leftTime = Date.parse(left && (left.facebook_activity_time || left.occurred_at || left.last_detected_at || left.detected_at) || '') || 0;
            if (rightTime !== leftTime) {
                return rightTime - leftTime;
            }

            return String(right && right.key || '').localeCompare(String(left && left.key || ''));
        });
    }

    function createFacebookAdminReporter(options) {
        var config = Object.assign({
            storageKey: DEFAULT_STORAGE_KEY,
            ttlMs: DEFAULT_TTL_MS,
            maxPersistedEntries: DEFAULT_MAX_PERSISTED_ENTRIES,
            debugEnabled: function () {
                return false;
            },
            log: function () {
            },
        }, options || {});

        var recordsByKey = new Map();
        var fallbackIndex = new Map();
        var totals = {
            discovered_unique: 0,
            duplicates_ignored: 0,
            sent_unique: 0,
            failed_attempts: 0,
            batches_started: 0,
            batches_succeeded: 0,
            batches_failed: 0,
        };
        var lastSubmission = null;
        var loadedFromStorage = false;

        function isDebugEnabled() {
            try {
                return !!config.debugEnabled();
            } catch (error) {
                return false;
            }
        }

        function log(category, message, meta) {
            if (!isDebugEnabled()) {
                return;
            }

            try {
                config.log(category, message, meta || {});
            } catch (error) {
            }
        }

        function touchExpiry(entry, now) {
            entry.expires_at = now + Math.max(60 * 1000, Number(config.ttlMs) || DEFAULT_TTL_MS);
        }

        function removeFallbackIndexEntry(entry) {
            if (!entry || !entry.fallback_fingerprint) {
                return;
            }

            var indexedKey = fallbackIndex.get(entry.fallback_fingerprint);
            if (indexedKey === entry.key) {
                fallbackIndex.delete(entry.fallback_fingerprint);
            }
        }

        function indexEntry(entry) {
            recordsByKey.set(entry.key, entry);
            if (entry.fallback_fingerprint) {
                fallbackIndex.set(entry.fallback_fingerprint, entry.key);
            }
        }

        function removeEntry(entry) {
            if (!entry) {
                return;
            }

            recordsByKey.delete(entry.key);
            removeFallbackIndexEntry(entry);
        }

        function resolveAction(entry, description) {
            return normalizeWhitespace(
                entry.action
                || entry.handled_status_text
                || entry.handled_outcome
                || description
            );
        }

        function normalizeEntry(entry) {
            if (!entry || typeof entry !== 'object') {
                return null;
            }

            var sourceUrl = normalizeUrl(entry.source_url || entry.activity_url || '');
            var activityUrl = normalizeUrl(entry.activity_url || entry.source_url || '');
            var groupId = normalizeWhitespace(
                entry.group_id
                || entry.source_external_id
                || entry.source_external_slug
                || extractGroupIdFromUrl(sourceUrl || activityUrl)
            );
            var facebookActivityTime = normalizeIsoTimestamp(entry.facebook_activity_time || entry.activity_time || entry.occurred_at || '');
            var actorName = normalizeWhitespace(entry.actor_name || '');
            var description = normalizeWhitespace(entry.description || entry.action_text || entry.raw_blue_segment || '');
            var action = resolveAction(entry, description);
            var targetName = normalizeWhitespace(entry.target_name || '');
            var targetType = normalizeWhitespace(entry.target_type || '');
            if (!targetType && looksGenericTargetLabel(targetName)) {
                targetType = targetName;
                targetName = '';
            }
            var normalizedKeyParts = [
                groupId || extractGroupIdFromUrl(sourceUrl || activityUrl) || sourceUrl || activityUrl,
                facebookActivityTime,
                actorName,
                description,
                action,
            ].map(normalizeLowercase);
            var fallbackKeyParts = [
                groupId || extractGroupIdFromUrl(sourceUrl || activityUrl) || sourceUrl || activityUrl,
                actorName,
                description,
                action,
            ].map(normalizeLowercase);
            var dedupeKey = normalizedKeyParts.join('|');
            var fallbackFingerprint = fallbackKeyParts.join('|');
            var nowIso = new Date().toISOString();

            if (!actorName || !description) {
                return null;
            }

            return {
                key: dedupeKey,
                dedupe_key: dedupeKey,
                fallback_fingerprint: fallbackFingerprint,
                group_id: groupId || extractGroupIdFromUrl(sourceUrl || activityUrl) || '',
                facebook_activity_time: facebookActivityTime || null,
                occurred_at: facebookActivityTime || null,
                source_url: sourceUrl,
                activity_url: activityUrl,
                actor_name: actorName,
                description: description,
                action_text: description,
                action: action,
                target_name: targetName || null,
                target_type: targetType || null,
                handled_outcome: normalizeWhitespace(entry.handled_outcome || '') || null,
                handled_status_text: normalizeWhitespace(entry.handled_status_text || '') || null,
                raw_blue_segment: normalizeWhitespace(entry.raw_blue_segment || description) || description,
                source_external_id: normalizeWhitespace(entry.source_external_id || '') || null,
                source_external_slug: normalizeWhitespace(entry.source_external_slug || '') || null,
                source_label: normalizeWhitespace(entry.source_label || entry.source_name || '') || null,
                network_activity_id: normalizeWhitespace(entry.network_activity_id || '') || null,
                client_event_key: normalizeWhitespace(entry.client_event_key || entry.dedupe_key || entry.key || '') || null,
                plugin_version: normalizeWhitespace(entry.plugin_version || '') || null,
                detected_at: normalizeIsoTimestamp(entry.detected_at || nowIso) || nowIso,
                first_detected_at: normalizeIsoTimestamp(entry.first_detected_at || entry.detected_at || nowIso) || nowIso,
                last_detected_at: normalizeIsoTimestamp(entry.last_detected_at || entry.detected_at || nowIso) || nowIso,
                state: normalizeWhitespace(entry.state || 'queued') || 'queued',
                send_attempts: Math.max(0, Number(entry.send_attempts) || 0),
                failure_count: Math.max(0, Number(entry.failure_count) || 0),
                last_error: normalizeWhitespace(entry.last_error || '') || null,
                last_state_at: normalizeIsoTimestamp(entry.last_state_at || nowIso) || nowIso,
                sent_at: normalizeIsoTimestamp(entry.sent_at || '') || null,
                queue_reason: normalizeWhitespace(entry.queue_reason || '') || null,
                batch_id: normalizeWhitespace(entry.batch_id || '') || null,
                expires_at: Math.max(0, Number(entry.expires_at) || 0),
            };
        }

        function serializeState() {
            return JSON.stringify({
                version: 1,
                saved_at: Date.now(),
                totals: totals,
                lastSubmission: lastSubmission,
                records: Array.from(recordsByKey.values())
                    .sort(function (left, right) {
                        return (Date.parse(right && right.last_detected_at || '') || 0) - (Date.parse(left && left.last_detected_at || '') || 0);
                    })
                    .slice(0, Math.max(50, Number(config.maxPersistedEntries) || DEFAULT_MAX_PERSISTED_ENTRIES))
            });
        }

        function persistState() {
            return safeStorageSet(config.storageKey, serializeState());
        }

        function restoreState() {
            if (loadedFromStorage) {
                return;
            }

            loadedFromStorage = true;
            var raw = safeStorageGet(config.storageKey);
            if (!raw) {
                return;
            }

            try {
                var parsed = JSON.parse(raw);
                var now = Date.now();
                var restoredTotals = parsed && parsed.totals && typeof parsed.totals === 'object' ? parsed.totals : {};
                totals.discovered_unique = Math.max(0, Number(restoredTotals.discovered_unique) || 0);
                totals.duplicates_ignored = Math.max(0, Number(restoredTotals.duplicates_ignored) || 0);
                totals.sent_unique = Math.max(0, Number(restoredTotals.sent_unique) || 0);
                totals.failed_attempts = Math.max(0, Number(restoredTotals.failed_attempts) || 0);
                totals.batches_started = Math.max(0, Number(restoredTotals.batches_started) || 0);
                totals.batches_succeeded = Math.max(0, Number(restoredTotals.batches_succeeded) || 0);
                totals.batches_failed = Math.max(0, Number(restoredTotals.batches_failed) || 0);
                lastSubmission = parsed && parsed.lastSubmission && typeof parsed.lastSubmission === 'object' ? parsed.lastSubmission : null;

                (Array.isArray(parsed && parsed.records) ? parsed.records : []).forEach(function (entry) {
                    var normalized = normalizeEntry(entry);
                    if (!normalized) {
                        return;
                    }

                    if (!normalized.expires_at || normalized.expires_at < now) {
                        return;
                    }

                    if (normalized.state === 'sending') {
                        normalized.state = 'failed';
                        normalized.last_error = normalized.last_error || 'Recovered from interrupted sending state.';
                        normalized.failure_count += 1;
                    }

                    indexEntry(normalized);
                });
            } catch (error) {
                safeStorageRemove(config.storageKey);
            }
        }

        function getExistingByFallback(fallbackFingerprint) {
            if (!fallbackFingerprint) {
                return null;
            }

            var existingKey = fallbackIndex.get(fallbackFingerprint);
            if (!existingKey) {
                return null;
            }

            return recordsByKey.get(existingKey) || null;
        }

        function mergeIntoExisting(existing, incoming, reason) {
            var nextState = existing.state;
            var replacement = Object.assign({}, existing, incoming, {
                key: incoming.facebook_activity_time && existing.facebook_activity_time !== incoming.facebook_activity_time
                    ? incoming.key
                    : existing.key,
                dedupe_key: incoming.facebook_activity_time && existing.facebook_activity_time !== incoming.facebook_activity_time
                    ? incoming.dedupe_key
                    : existing.dedupe_key,
                fallback_fingerprint: existing.fallback_fingerprint || incoming.fallback_fingerprint,
                first_detected_at: existing.first_detected_at || incoming.first_detected_at,
                last_detected_at: incoming.last_detected_at || new Date().toISOString(),
                state: nextState,
                send_attempts: existing.send_attempts || 0,
                failure_count: existing.failure_count || 0,
                sent_at: existing.sent_at || null,
                queue_reason: existing.queue_reason || reason || incoming.queue_reason || null,
                last_error: existing.last_error || null,
                batch_id: existing.batch_id || null,
            });
            var now = Date.now();
            touchExpiry(replacement, now);

            if (replacement.key !== existing.key) {
                removeEntry(existing);
            } else {
                removeFallbackIndexEntry(existing);
            }

            indexEntry(replacement);
            return replacement;
        }

        function discoverEntries(entries, meta) {
            restoreState();
            var discoveredEntries = Array.isArray(entries) ? entries : [];
            var reason = meta && meta.reason ? String(meta.reason) : 'unspecified';
            var addedEntries = [];
            var duplicateCount = 0;
            var now = Date.now();

            discoveredEntries.forEach(function (entry) {
                log('facebook-admin-detection', 'Facebook admin event discovered.', {
                    reason: reason,
                    actor_name: entry && entry.actor_name ? entry.actor_name : '',
                    description: clipText(entry && (entry.action_text || entry.description || entry.raw_blue_segment || ''), 180),
                });

                var normalized = normalizeEntry(entry);
                if (!normalized) {
                    return;
                }

                touchExpiry(normalized, now);
                normalized.queue_reason = reason;

                log('facebook-admin-detection', 'Generated Facebook admin dedupe key.', {
                    reason: reason,
                    dedupe_key: normalized.dedupe_key,
                    group_id: normalized.group_id,
                    facebook_activity_time: normalized.facebook_activity_time,
                    actor_name: normalized.actor_name,
                    action: normalized.action,
                });

                var existing = recordsByKey.get(normalized.key);
                if (!existing) {
                    existing = getExistingByFallback(normalized.fallback_fingerprint);
                }

                if (existing) {
                    mergeIntoExisting(existing, normalized, reason);
                    totals.duplicates_ignored += 1;
                    duplicateCount += 1;
                    log('facebook-admin-detection', 'Ignored duplicate Facebook admin event.', {
                        reason: reason,
                        dedupe_key: normalized.dedupe_key,
                        state: existing.state,
                    });
                    return;
                }

                normalized.state = 'queued';
                normalized.last_state_at = new Date(now).toISOString();
                normalized.send_attempts = 0;
                normalized.failure_count = 0;
                normalized.last_error = null;
                normalized.sent_at = null;
                normalized.batch_id = null;
                indexEntry(normalized);
                totals.discovered_unique += 1;
                addedEntries.push(cloneEntry(normalized));

                log('facebook-admin-queue', 'Added Facebook admin event to queue.', {
                    reason: reason,
                    dedupe_key: normalized.dedupe_key,
                    queue_size: getQueueSize(),
                });
            });

            persistState();

            return {
                added: addedEntries.length,
                duplicates: duplicateCount,
                entries: addedEntries,
            };
        }

        function getEntriesByState(states) {
            restoreState();
            var stateList = Array.isArray(states) ? states : [states];
            return Array.from(recordsByKey.values()).filter(function (entry) {
                return stateList.indexOf(entry.state) !== -1;
            });
        }

        function getQueueSize() {
            return getEntriesByState(['queued', 'sending', 'failed']).length;
        }

        function startNextBatch(maxBatchSize, meta) {
            restoreState();
            var reason = meta && meta.reason ? String(meta.reason) : 'unspecified';
            var batchSize = Math.max(1, Number(maxBatchSize) || 1);
            var eligible = sortEntriesByRecency(getEntriesByState(['queued', 'failed'])).slice(0, batchSize);
            if (!eligible.length) {
                return [];
            }

            var batchId = [Date.now(), Math.round(Math.random() * 1000000)].join(':');
            var now = Date.now();
            eligible.forEach(function (entry) {
                entry.state = 'sending';
                entry.batch_id = batchId;
                entry.send_attempts = Math.max(0, Number(entry.send_attempts) || 0) + 1;
                entry.last_state_at = new Date(now).toISOString();
                touchExpiry(entry, now);
                indexEntry(entry);
            });

            totals.batches_started += 1;
            lastSubmission = {
                status: 'sending',
                reason: reason,
                batch_id: batchId,
                attempted: eligible.length,
                queue_remaining: Math.max(0, getQueueSize() - eligible.length),
                started_at: new Date(now).toISOString(),
            };
            persistState();

            log('facebook-admin-ingest', 'Facebook admin bulk send started.', {
                reason: reason,
                batch_id: batchId,
                batch_size: eligible.length,
                queue_size: getQueueSize(),
            });

            return eligible.map(cloneEntry);
        }

        function markBatchSent(batchEntries, responseData, meta) {
            restoreState();
            var sentEntries = Array.isArray(batchEntries) ? batchEntries : [];
            var now = Date.now();
            var created = Math.max(0, Number(responseData && responseData.created) || 0);
            var updated = Math.max(0, Number(responseData && responseData.updated) || 0);
            var received = Math.max(0, Number(responseData && responseData.received) || sentEntries.length);
            var cleared = 0;
            var batchId = sentEntries.length && sentEntries[0] && sentEntries[0].batch_id ? sentEntries[0].batch_id : null;

            sentEntries.forEach(function (entry) {
                var existing = entry && entry.key ? recordsByKey.get(entry.key) : null;
                if (!existing) {
                    return;
                }

                existing.state = 'sent';
                existing.sent_at = new Date(now).toISOString();
                existing.last_state_at = existing.sent_at;
                existing.last_error = null;
                existing.batch_id = batchId || existing.batch_id || null;
                touchExpiry(existing, now);
                indexEntry(existing);
                cleared += 1;
            });

            totals.sent_unique += cleared;
            totals.batches_succeeded += 1;
            lastSubmission = {
                status: 'success',
                reason: meta && meta.reason ? String(meta.reason) : 'unspecified',
                batch_id: batchId,
                attempted: sentEntries.length,
                sent: cleared,
                received: received,
                created: created,
                updated: updated,
                queue_remaining: getQueueSize(),
                completed_at: new Date(now).toISOString(),
            };
            persistState();

            log('facebook-admin-ingest', 'Facebook admin bulk send succeeded.', {
                batch_id: batchId,
                attempted: sentEntries.length,
                sent: cleared,
                received: received,
                created: created,
                updated: updated,
                queue_remaining: getQueueSize(),
            });
            log('facebook-admin-queue', 'Facebook admin queue cleared after successful batch.', {
                batch_id: batchId,
                cleared: cleared,
                queue_remaining: getQueueSize(),
            });
        }

        function markBatchFailed(batchEntries, error, meta) {
            restoreState();
            var failedEntries = Array.isArray(batchEntries) ? batchEntries : [];
            var now = Date.now();
            var errorMessage = normalizeWhitespace(error && error.message ? error.message : error || 'Could not submit admin-log batch.');
            var batchId = failedEntries.length && failedEntries[0] && failedEntries[0].batch_id ? failedEntries[0].batch_id : null;
            var failedCount = 0;

            failedEntries.forEach(function (entry) {
                var existing = entry && entry.key ? recordsByKey.get(entry.key) : null;
                if (!existing) {
                    return;
                }

                existing.state = 'failed';
                existing.failure_count = Math.max(0, Number(existing.failure_count) || 0) + 1;
                existing.last_error = errorMessage;
                existing.last_state_at = new Date(now).toISOString();
                existing.batch_id = batchId || existing.batch_id || null;
                touchExpiry(existing, now);
                indexEntry(existing);
                failedCount += 1;
            });

            totals.failed_attempts += failedCount;
            totals.batches_failed += 1;
            lastSubmission = {
                status: 'failed',
                reason: meta && meta.reason ? String(meta.reason) : 'unspecified',
                batch_id: batchId,
                attempted: failedEntries.length,
                failed: failedCount,
                error: errorMessage,
                queue_remaining: getQueueSize(),
                completed_at: new Date(now).toISOString(),
            };
            persistState();

            log('facebook-admin-ingest', 'Facebook admin bulk send failed.', {
                batch_id: batchId,
                attempted: failedEntries.length,
                failed: failedCount,
                error: errorMessage,
                queue_remaining: getQueueSize(),
            });
        }

        function getSnapshot() {
            restoreState();
            var queuedEntries = sortEntriesByRecency(getEntriesByState(['queued']));
            var failedEntries = sortEntriesByRecency(getEntriesByState(['failed']));
            var sendingEntries = sortEntriesByRecency(getEntriesByState(['sending']));
            var sentEntries = sortEntriesByRecency(getEntriesByState(['sent']));
            var reportableEntries = sortEntriesByRecency(queuedEntries.concat(failedEntries));

            return {
                totals: {
                    detected: totals.discovered_unique,
                    duplicates_ignored: totals.duplicates_ignored,
                    queued: queuedEntries.length,
                    sending: sendingEntries.length,
                    failed: failedEntries.length,
                    pending: queuedEntries.length + sendingEntries.length + failedEntries.length,
                    sent: sentEntries.length,
                    batches_started: totals.batches_started,
                    batches_succeeded: totals.batches_succeeded,
                    batches_failed: totals.batches_failed,
                },
                reportable_entries: reportableEntries.map(cloneEntry),
                recent_sent_entries: sentEntries.slice(0, 5).map(cloneEntry),
                last_submission: lastSubmission ? cloneEntry(lastSubmission) : null,
                has_reportable_entries: reportableEntries.length > 0,
            };
        }

        function reset() {
            recordsByKey.clear();
            fallbackIndex.clear();
            totals.discovered_unique = 0;
            totals.duplicates_ignored = 0;
            totals.sent_unique = 0;
            totals.failed_attempts = 0;
            totals.batches_started = 0;
            totals.batches_succeeded = 0;
            totals.batches_failed = 0;
            lastSubmission = null;
            safeStorageRemove(config.storageKey);
        }

        restoreState();

        return {
            normalizeEntry: normalizeEntry,
            discoverEntries: discoverEntries,
            startNextBatch: startNextBatch,
            markBatchSent: markBatchSent,
            markBatchFailed: markBatchFailed,
            getSnapshot: getSnapshot,
            getQueueSize: getQueueSize,
            reset: reset,
        };
    }

    global.TNFacebookAdminReporter = {
        createReporter: createFacebookAdminReporter,
        normalizeWhitespace: normalizeWhitespace,
        normalizeUrl: normalizeUrl,
        normalizeIsoTimestamp: normalizeIsoTimestamp,
        extractGroupIdFromUrl: extractGroupIdFromUrl,
    };
}(typeof globalThis !== 'undefined' ? globalThis : window));


