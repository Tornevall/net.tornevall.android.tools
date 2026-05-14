(function () {
    if (window.__TN_NETWORK_MONITOR__) {
        return;
    }

    window.__TN_NETWORK_MONITOR__ = true;

    var NETWORK_MONITOR_STATE_ATTRIBUTE = 'data-tn-network-monitor-active';
    var SOUNDCLOUD_BUFFER_ELEMENT_ID = 'tn-networks-soundcloud-buffer';

    function markNetworkMonitorActive() {
        try {
            if (document.documentElement) {
                document.documentElement.setAttribute(NETWORK_MONITOR_STATE_ATTRIBUTE, '1');
            }
        } catch (e) {
        }
    }

    function getSoundCloudBufferElement() {
        var existing = document.getElementById(SOUNDCLOUD_BUFFER_ELEMENT_ID);
        if (existing) {
            return existing;
        }

        try {
            var node = document.createElement('script');
            node.id = SOUNDCLOUD_BUFFER_ELEMENT_ID;
            node.type = 'application/json';
            node.setAttribute('data-role', 'tn-soundcloud-buffer');
            node.textContent = '[]';
            (document.documentElement || document.head || document.body).appendChild(node);
            return node;
        } catch (e) {
            return null;
        }
    }

    function bufferSoundCloudPayload(payload) {
        if (!payload || !payload.soundcloud_capture) {
            return;
        }

        var node = getSoundCloudBufferElement();
        if (!node) {
            return;
        }

        try {
            var existing = safeJsonParse(node.textContent || '[]');
            var queue = Array.isArray(existing) ? existing : [];
            queue.push(payload);
            if (queue.length > 12) {
                queue = queue.slice(queue.length - 12);
            }
            node.textContent = JSON.stringify(queue);
        } catch (e) {
        }
    }

    markNetworkMonitorActive();

    function clip(value, limit) {
        var text = String(value || '');
        if (text.length <= limit) {
            return text;
        }

        return text.substring(0, limit) + '\n...[clipped]';
    }

    function safeJsonParse(value) {
        try {
            return JSON.parse(value);
        } catch (e) {
            return null;
        }
    }

    function normalizeWhitespace(value) {
        return String(value || '').replace(/\s+/g, ' ').trim();
    }

    function getCurrentAdminSourceUrl() {
        return (window.location.origin + window.location.pathname).replace(/\/+$/, '');
    }

    function getCurrentAdminSourceLabel() {
        var parts = String(document.title || '')
            .split('|')
            .map(function (part) {
                return normalizeWhitespace(part);
            })
            .filter(function (part) {
                return !!part && !/facebook/i.test(part) && !/admin[_\s-]*activit|activity log|aktivitetslogg|moderation/i.test(part);
            });

        if (!parts.length) {
            return null;
        }

        parts.sort(function (a, b) {
            return b.length - a.length;
        });

        return parts[0] || null;
    }

    function normalizeDigits(value) {
        var text = normalizeWhitespace(value);
        return /^\d{4,}$/.test(text) ? text : '';
    }

    function extractFacebookGroupPathIdentity(url) {
        try {
            var parsed = new URL(url, window.location.origin);
            var segments = parsed.pathname.replace(/^\/+|\/+$/g, '').split('/');
            var second = normalizeWhitespace(segments[1] || '');
            if (segments[0] !== 'groups' || !second) {
                return null;
            }

            return {
                source_url: (parsed.origin + parsed.pathname).replace(/\/+$/, ''),
                external_id: normalizeDigits(second) || '',
                external_slug: normalizeDigits(second) ? '' : second,
            };
        } catch (e) {
            return null;
        }
    }

    function mergeSourceIdentity(left, right) {
        var base = left && typeof left === 'object' ? {
            external_id: normalizeWhitespace(left.external_id || ''),
            external_slug: normalizeWhitespace(left.external_slug || ''),
            name: normalizeWhitespace(left.name || ''),
            source_url: normalizeWhitespace(left.source_url || ''),
            url_aliases: Array.isArray(left.url_aliases) ? left.url_aliases.slice() : [],
        } : {
            external_id: '',
            external_slug: '',
            name: '',
            source_url: '',
            url_aliases: [],
        };

        if (!right || typeof right !== 'object') {
            return base;
        }

        var nextId = normalizeDigits(right.external_id || '');
        var nextSlug = normalizeWhitespace(right.external_slug || '');
        var nextName = normalizeWhitespace(right.name || '');
        var nextSourceUrl = normalizeWhitespace(right.source_url || '');
        var nextAliases = Array.isArray(right.url_aliases) ? right.url_aliases.slice() : [];

        if (nextId) {
            base.external_id = nextId;
        }

        if (nextSlug && !normalizeDigits(nextSlug)) {
            base.external_slug = nextSlug;
        }

        if (nextName && (!base.name || nextName.length > base.name.length)) {
            base.name = nextName;
        }

        if (nextSourceUrl) {
            if (!base.source_url || (!base.external_slug && nextSourceUrl.indexOf('/groups/') !== -1 && nextSourceUrl.indexOf('/admin') !== -1)) {
                base.source_url = nextSourceUrl;
            }
            nextAliases.push(nextSourceUrl);
        }

        base.url_aliases = Array.from(new Set(base.url_aliases.concat(nextAliases).map(function (url) {
            return normalizeWhitespace(url);
        }).filter(Boolean)));

        if (!base.source_url && base.url_aliases.length) {
            base.source_url = base.url_aliases[0];
        }

        if (!base.external_id && base.external_slug && normalizeDigits(base.external_slug)) {
            base.external_id = base.external_slug;
            base.external_slug = '';
        }

        return base;
    }

    function buildSourceIdentityFromCandidate(candidate) {
        if (!candidate || typeof candidate !== 'object') {
            return null;
        }

        var sourceUrl = normalizeWhitespace(candidate.url || candidate.group_url || candidate.permalink_url || '');
        var urlIdentity = sourceUrl ? extractFacebookGroupPathIdentity(sourceUrl) : null;
        var externalId = normalizeDigits(candidate.id || candidate.legacy_fbid || candidate.group_id || candidate.groupID || candidate.groupId || '') || (urlIdentity && urlIdentity.external_id ? urlIdentity.external_id : '');
        var externalSlug = normalizeWhitespace(candidate.slug || candidate.vanity || candidate.username || '') || (urlIdentity && urlIdentity.external_slug ? urlIdentity.external_slug : '');

        if (externalSlug && normalizeDigits(externalSlug)) {
            if (!externalId) {
                externalId = externalSlug;
            }
            externalSlug = '';
        }

        return {
            external_id: externalId || '',
            external_slug: externalSlug || '',
            name: normalizeWhitespace(candidate.name || candidate.title || candidate.text || candidate.label || ''),
            source_url: (urlIdentity && urlIdentity.source_url) || sourceUrl || '',
            url_aliases: sourceUrl ? [sourceUrl] : [],
        };
    }

    function looksLikeSourceIdentityCandidate(candidate) {
        if (!candidate || typeof candidate !== 'object') {
            return false;
        }

        var typename = normalizeWhitespace(candidate.__typename || '').toLowerCase();
        var sourceUrl = normalizeWhitespace(candidate.url || candidate.group_url || candidate.permalink_url || '');

        return !!(
            candidate.group_id
            || candidate.groupID
            || candidate.groupId
            || candidate.management_activities
            || (sourceUrl && sourceUrl.indexOf('/groups/') !== -1)
            || (typename.indexOf('group') !== -1 && typename.indexOf('activity') === -1)
        );
    }

    function extractSourceIdentityFromValue(value) {
        if (!value || typeof value !== 'object') {
            return null;
        }

        var candidates = [];
        var directUrl = normalizeWhitespace(value.url || value.group_url || value.permalink_url || '');

        if (value.management_activity_log_target && typeof value.management_activity_log_target === 'object') {
            candidates.push(value.management_activity_log_target);
        }
        if (value.data && value.data.management_activity_log_target && typeof value.data.management_activity_log_target === 'object') {
            candidates.push(value.data.management_activity_log_target);
        }
        if (value.result && value.result.data && value.result.data.management_activity_log_target && typeof value.result.data.management_activity_log_target === 'object') {
            candidates.push(value.result.data.management_activity_log_target);
        }
        if (value.__bbox && value.__bbox.result && value.__bbox.result.data && value.__bbox.result.data.management_activity_log_target && typeof value.__bbox.result.data.management_activity_log_target === 'object') {
            candidates.push(value.__bbox.result.data.management_activity_log_target);
        }
        if (value.payload && value.payload.__bbox && value.payload.__bbox.result && value.payload.__bbox.result.data && value.payload.__bbox.result.data.management_activity_log_target && typeof value.payload.__bbox.result.data.management_activity_log_target === 'object') {
            candidates.push(value.payload.__bbox.result.data.management_activity_log_target);
        }
        if (value.next && value.next.result && value.next.result.data && value.next.result.data.management_activity_log_target && typeof value.next.result.data.management_activity_log_target === 'object') {
            candidates.push(value.next.result.data.management_activity_log_target);
        }
        if (value.next && value.next.payload && value.next.payload.__bbox && value.next.payload.__bbox.result && value.next.payload.__bbox.result.data && value.next.payload.__bbox.result.data.management_activity_log_target && typeof value.next.payload.__bbox.result.data.management_activity_log_target === 'object') {
            candidates.push(value.next.payload.__bbox.result.data.management_activity_log_target);
        }
        if (value.data && value.data.node && looksLikeSourceIdentityCandidate(value.data.node)) {
            candidates.push(value.data.node);
        }
        if (value.result && value.result.data && value.result.data.node && looksLikeSourceIdentityCandidate(value.result.data.node)) {
            candidates.push(value.result.data.node);
        }
        if (value.payload && value.payload.__bbox && value.payload.__bbox.result && value.payload.__bbox.result.data && value.payload.__bbox.result.data.node && looksLikeSourceIdentityCandidate(value.payload.__bbox.result.data.node)) {
            candidates.push(value.payload.__bbox.result.data.node);
        }
        if (value.next && value.next.result && value.next.result.data && value.next.result.data.node && looksLikeSourceIdentityCandidate(value.next.result.data.node)) {
            candidates.push(value.next.result.data.node);
        }
        if (value.next && value.next.payload && value.next.payload.__bbox && value.next.payload.__bbox.result && value.next.payload.__bbox.result.data && value.next.payload.__bbox.result.data.node && looksLikeSourceIdentityCandidate(value.next.payload.__bbox.result.data.node)) {
            candidates.push(value.next.payload.__bbox.result.data.node);
        }

        if (value.group_id || value.groupID || value.groupId || (directUrl && directUrl.indexOf('/groups/') !== -1)) {
            candidates.push(value);
        }

        return candidates.reduce(function (context, candidate) {
            return mergeSourceIdentity(context, buildSourceIdentityFromCandidate(candidate));
        }, null);
    }

    function detectHandledOutcome(text) {
        var lowered = normalizeWhitespace(text).toLowerCase();

        if (!lowered) {
            return null;
        }

        if (lowered.indexOf('godk') !== -1 || lowered.indexOf('approv') !== -1 || lowered.indexOf('published') !== -1 || lowered.indexOf('allowed') !== -1) {
            return 'approved';
        }

        if (lowered.indexOf('avvis') !== -1 || lowered.indexOf('reject') !== -1 || lowered.indexOf('declin') !== -1) {
            return 'rejected';
        }

        if (lowered.indexOf('tagit bort') !== -1 || lowered.indexOf('removed') !== -1 || lowered.indexOf('delete') !== -1) {
            return 'removed';
        }

        if (lowered.indexOf('rediger') !== -1 || lowered.indexOf('edit') !== -1 || lowered.indexOf('changed') !== -1) {
            return 'edited';
        }

        if (lowered.indexOf('lagt till') !== -1 || lowered.indexOf('added') !== -1) {
            return 'added';
        }

        if (lowered.indexOf('block') !== -1 || lowered.indexOf('banned') !== -1 || lowered.indexOf('ban ') !== -1) {
            return 'blocked';
        }

        if (lowered.indexOf('återkall') !== -1 || lowered.indexOf('revoked') !== -1) {
            return 'revoked';
        }

        return 'observed';
    }

    function detectHandledStatusText(text, isAutomatic, outcome) {
        if (isAutomatic) {
            return outcome ? outcome + '_automatically' : 'automatic';
        }

        return outcome || null;
    }

    function extractTitleNames(title) {
        var titleText = normalizeWhitespace(title && title.text ? title.text : '');
        var ranges = title && Array.isArray(title.ranges) ? title.ranges.slice() : [];
        var names = [];

        ranges.sort(function (a, b) {
            return (a && typeof a.offset === 'number' ? a.offset : 0) - (b && typeof b.offset === 'number' ? b.offset : 0);
        });

        ranges.forEach(function (range) {
            if (!range) {
                return;
            }

            var entityName = normalizeWhitespace(range.entity && (range.entity.name || range.entity.text) ? (range.entity.name || range.entity.text) : '');
            var slicedName = '';
            var shortName = normalizeWhitespace(range.entity && range.entity.short_name ? range.entity.short_name : '');

            if (!entityName && titleText && typeof range.offset === 'number' && typeof range.length === 'number') {
                slicedName = normalizeWhitespace(titleText.slice(range.offset, range.offset + range.length));
            }

            if (!slicedName && titleText && typeof range.offset === 'number' && typeof range.length === 'number') {
                slicedName = normalizeWhitespace(titleText.slice(range.offset, range.offset + range.length));
            }

            var name = entityName || slicedName || shortName;
            if (name && names.indexOf(name) === -1) {
                names.push(name);
            }
        });

        return names;
    }

    function isAdminActivityTypename(typename) {
        var value = normalizeWhitespace(typename);
        return value === 'GroupAdminActivity' || value === 'GroupsCometAdminActivity';
    }

    function parseActivityNode(node, sourceIdentity) {
        if (!node || !isAdminActivityTypename(node.__typename)) {
            return null;
        }

        var actionText = normalizeWhitespace(node.activity_title && node.activity_title.text ? node.activity_title.text : '');
        if (!actionText) {
            return null;
        }

        var names = extractTitleNames(node.activity_title);
        var lowered = actionText.toLowerCase();
        var isAutomatic = !!node.is_automatic_action || lowered.indexOf('automatiskt') !== -1 || lowered.indexOf('automatically') !== -1;
        var actorName = isAutomatic ? 'Automatic moderation' : (names[0] || '');
        var targetName = isAutomatic ? (names[0] || names[1] || '') : (names[1] || '');
        var handledOutcome = detectHandledOutcome(actionText);
        var sourceUrl = normalizeWhitespace(sourceIdentity && sourceIdentity.source_url ? sourceIdentity.source_url : '') || getCurrentAdminSourceUrl();
        var sourceName = normalizeWhitespace(sourceIdentity && sourceIdentity.name ? sourceIdentity.name : '') || getCurrentAdminSourceLabel();

        if (!actorName && names[0]) {
            actorName = names[0];
        }

        if (!actorName) {
            actorName = isAutomatic ? 'Automatic moderation' : 'Unknown actor';
        }

        return {
            key: [sourceUrl, String(node.id || ''), actorName, targetName || '', actionText].join('|'),
            source_url: sourceUrl,
            source_label: sourceName,
            activity_url: window.location.href,
            occurred_at: node.activity_time ? new Date(node.activity_time * 1000).toISOString() : null,
            facebook_activity_time: node.activity_time ? new Date(node.activity_time * 1000).toISOString() : null,
            actor_name: actorName,
            action_text: actionText,
            target_name: targetName || null,
            handled_outcome: handledOutcome,
            handled_status_text: detectHandledStatusText(actionText, isAutomatic, handledOutcome),
            raw_blue_segment: actionText,
            network_activity_id: node.id || null,
            source_external_id: sourceIdentity && sourceIdentity.external_id ? sourceIdentity.external_id : null,
            source_external_slug: sourceIdentity && sourceIdentity.external_slug ? sourceIdentity.external_slug : null,
            source_name: sourceName || null,
            is_automatic_action: isAutomatic
        };
    }

    function getActivityEdgeLists(value) {
        return [
            value.data && value.data.node && value.data.node.management_activities && value.data.node.management_activities.edges,
            value.data && value.data.management_activity_log_target && value.data.management_activity_log_target.management_activities && value.data.management_activity_log_target.management_activities.edges,
            value.result && value.result.data && value.result.data.management_activity_log_target && value.result.data.management_activity_log_target.management_activities && value.result.data.management_activity_log_target.management_activities.edges,
            value.__bbox && value.__bbox.result && value.__bbox.result.data && value.__bbox.result.data.management_activity_log_target && value.__bbox.result.data.management_activity_log_target.management_activities && value.__bbox.result.data.management_activity_log_target.management_activities.edges,
            value.payload && value.payload.__bbox && value.payload.__bbox.result && value.payload.__bbox.result.data && value.payload.__bbox.result.data.management_activity_log_target && value.payload.__bbox.result.data.management_activity_log_target.management_activities && value.payload.__bbox.result.data.management_activity_log_target.management_activities.edges,
            value.result && value.result.data && value.result.data.node && value.result.data.node.management_activities && value.result.data.node.management_activities.edges,
            value.next && value.next.result && value.next.result.data && value.next.result.data.management_activity_log_target && value.next.result.data.management_activity_log_target.management_activities && value.next.result.data.management_activity_log_target.management_activities.edges,
            value.next && value.next.result && value.next.result.data && value.next.result.data.node && value.next.result.data.node.management_activities && value.next.result.data.node.management_activities.edges,
            value.next && value.next.payload && value.next.payload.__bbox && value.next.payload.__bbox.result && value.next.payload.__bbox.result.data && value.next.payload.__bbox.result.data.management_activity_log_target && value.next.payload.__bbox.result.data.management_activity_log_target.management_activities && value.next.payload.__bbox.result.data.management_activity_log_target.management_activities.edges,
            value.next && value.next.payload && value.next.payload.__bbox && value.next.payload.__bbox.result && value.next.payload.__bbox.result.data && value.next.payload.__bbox.result.data.node && value.next.payload.__bbox.result.data.node.management_activities && value.next.payload.__bbox.result.data.node.management_activities.edges,
        ];
    }

    function walkForActivities(value, results, seenKeys, sourceIdentity) {
        if (!value) {
            return;
        }

        var resolvedSourceIdentity = mergeSourceIdentity(sourceIdentity, extractSourceIdentityFromValue(value));

        if (Array.isArray(value)) {
            value.forEach(function (item) {
                walkForActivities(item, results, seenKeys, resolvedSourceIdentity);
            });
            return;
        }

        if (typeof value !== 'object') {
            return;
        }

        if (isAdminActivityTypename(value.__typename)) {
            var parsedNode = parseActivityNode(value, resolvedSourceIdentity);
            if (parsedNode && !seenKeys[parsedNode.key]) {
                seenKeys[parsedNode.key] = true;
                results.push(parsedNode);
            }
        }

        getActivityEdgeLists(value).forEach(function (edges) {
            if (!Array.isArray(edges)) {
                return;
            }

            edges.forEach(function (edge) {
                var parsedNode = parseActivityNode(edge && edge.node ? edge.node : null, resolvedSourceIdentity);
                if (parsedNode && !seenKeys[parsedNode.key]) {
                    seenKeys[parsedNode.key] = true;
                    results.push(parsedNode);
                }
            });
        });

        Object.keys(value).forEach(function (key) {
            if (key === 'data' || key === 'result' || key === 'payload' || key === 'extensions' || key === '__bbox' || key === 'require' || key === 'handle' || key === 'next') {
                walkForActivities(value[key], results, seenKeys, resolvedSourceIdentity);
            }
        });
    }

    function parseDetectedEntriesFromResponse(text, sourceIdentity) {
        var raw = String(text || '');
        var lowered = raw.toLowerCase();
        var results = [];
        var seenKeys = {};
        var parsedChunks = [];

        if (!raw || (lowered.indexOf('groupadminactivity') === -1 && lowered.indexOf('groupscometadminactivity') === -1 && lowered.indexOf('management_activities') === -1 && lowered.indexOf('management_activity_log_target') === -1 && lowered.indexOf('admin_activities') === -1 && lowered.indexOf('relayprefetchedstreamcache') === -1 && lowered.indexOf('scheduledserverjs') === -1 && lowered.indexOf('cometgroupadminactivitiesactivitylogcontentqueryrelaypreloader') === -1 && lowered.indexOf('adp_cometgroupadminactivitiesactivitylogcontentqueryrelaypreloader') === -1 && lowered.indexOf('activity_title') === -1)) {
            return results;
        }

        raw.split(/\n+(?=\{)/g).forEach(function (part) {
            var parsed = safeJsonParse(part);
            if (parsed) {
                parsedChunks.push(parsed);
            }
        });

        if (!parsedChunks.length) {
            var singleParsed = safeJsonParse(raw);
            if (singleParsed) {
                parsedChunks.push(singleParsed);
            }
        }

        parsedChunks.forEach(function (parsed) {
            sourceIdentity = mergeSourceIdentity(sourceIdentity, extractSourceIdentityFromValue(parsed));
        });

        parsedChunks.forEach(function (parsed) {
            walkForActivities(parsed, results, seenKeys, sourceIdentity);
        });

        return results;
    }

    function extractCommentText(node) {
        var candidates = [
            node && node.body && node.body.text,
            node && node.preferred_body && node.preferred_body.text,
            node && node.message && node.message.text,
            node && node.comment_body && node.comment_body.text,
            node && node.text,
        ];

        for (var i = 0; i < candidates.length; i += 1) {
            var text = normalizeWhitespace(candidates[i]);
            if (text) {
                return text;
            }
        }

        return '';
    }

    function extractCommentAuthor(node) {
        var candidates = [
            node && node.author && node.author.name,
            node && node.user && node.user.name,
            node && node.actor && node.actor.name,
            node && node.owner && node.owner.name,
        ];

        for (var i = 0; i < candidates.length; i += 1) {
            var name = normalizeWhitespace(candidates[i]);
            if (name) {
                return name;
            }
        }

        return '';
    }

    function looksLikeCommentNode(node) {
        if (!node || typeof node !== 'object') {
            return false;
        }

        var typename = normalizeWhitespace(node.__typename || '').toLowerCase();
        var hasCommentType = typename.indexOf('comment') !== -1;
        var authorName = extractCommentAuthor(node);
        var bodyText = extractCommentText(node);
        var hasCommentShape = !!(node.author || node.user || node.body || node.preferred_body || node.message || node.comment_body);

        if (!authorName || !bodyText) {
            return false;
        }

        if (bodyText.length < 2) {
            return false;
        }

        return hasCommentType || hasCommentShape;
    }

    function parseCommentNode(node, batchId) {
        if (!looksLikeCommentNode(node)) {
            return null;
        }

        var authorName = extractCommentAuthor(node);
        var bodyText = extractCommentText(node);
        var commentId = normalizeWhitespace(node.id || node.legacy_fbid || node.comment_id || '');
        var parentCommentId = normalizeWhitespace(node.parent_comment_id || node.parent_id || '');

        return {
            key: ['comment', batchId, commentId || authorName, bodyText].join('|'),
            batch_id: batchId,
            comment_id: commentId || null,
            parent_comment_id: parentCommentId || null,
            author_name: authorName,
            body_text: bodyText,
            source_url: window.location.href,
        };
    }

    function walkForComments(value, results, seenKeys, batchId) {
        if (!value || results.length >= 120) {
            return;
        }

        if (Array.isArray(value)) {
            value.forEach(function (item) {
                walkForComments(item, results, seenKeys, batchId);
            });
            return;
        }

        if (typeof value !== 'object') {
            return;
        }

        var parsedComment = parseCommentNode(value, batchId);
        if (parsedComment && !seenKeys[parsedComment.key]) {
            seenKeys[parsedComment.key] = true;
            results.push(parsedComment);
        }

        Object.keys(value).forEach(function (key) {
            if (results.length >= 120) {
                return;
            }

            walkForComments(value[key], results, seenKeys, batchId);
        });
    }

    function parseDetectedCommentsFromResponse(text, batchId) {
        var raw = String(text || '');
        var lowered = raw.toLowerCase();
        var results = [];
        var seenKeys = {};

        if (!raw || (lowered.indexOf('comment') === -1 && lowered.indexOf('reply') === -1 && lowered.indexOf('feedback') === -1 && lowered.indexOf('ufi') === -1)) {
            return results;
        }

        raw.split(/\n+(?=\{)/g).forEach(function (part) {
            var parsed = safeJsonParse(part);
            if (parsed) {
                walkForComments(parsed, results, seenKeys, batchId);
            }
        });

        if (!results.length) {
            var singleParsed = safeJsonParse(raw);
            if (singleParsed) {
                walkForComments(singleParsed, results, seenKeys, batchId);
            }
        }

        return results;
    }

    function buildUrlMeta(url) {
        try {
            var parsed = new URL(url, window.location.origin);
            return {
                host: parsed.host,
                pathname: parsed.pathname,
                search: parsed.search,
                is_graphql: parsed.pathname.indexOf('/api/graphql') !== -1 || parsed.pathname.indexOf('graphql') !== -1,
            };
        } catch (e) {
            return {
                host: '',
                pathname: '',
                search: '',
                is_graphql: String(url || '').indexOf('graphql') !== -1,
            };
        }
    }

    function readBodyText(body) {
        if (!body) {
            return '';
        }

        if (typeof body === 'string') {
            return body;
        }

        if (typeof URLSearchParams !== 'undefined' && body instanceof URLSearchParams) {
            return body.toString();
        }

        if (typeof FormData !== 'undefined' && body instanceof FormData) {
            var params = new URLSearchParams();
            body.forEach(function (value, key) {
                params.append(key, String(value));
            });
            return params.toString();
        }

        if (typeof body === 'object') {
            try {
                return JSON.stringify(body);
            } catch (e) {
                return '[object body]';
            }
        }

        return String(body || '');
    }

    function parseBodyMeta(body) {
        var raw = readBodyText(body);
        var params = null;
        var json = null;
        var variables = null;
        var sourceIdentity = null;

        if (raw) {
            try {
                params = new URLSearchParams(raw);
            } catch (e) {
                params = null;
            }

            if (/^\s*[\[{]/.test(raw)) {
                json = safeJsonParse(raw);
            }
        }

        if (params && params.get('variables')) {
            variables = safeJsonParse(params.get('variables')) || clip(params.get('variables'), 500);
        } else if (json && json.variables) {
            variables = json.variables;
        }

        if (variables && typeof variables === 'object') {
            sourceIdentity = mergeSourceIdentity(sourceIdentity, extractSourceIdentityFromValue(variables));
        }

        if (json && typeof json === 'object') {
            sourceIdentity = mergeSourceIdentity(sourceIdentity, extractSourceIdentityFromValue(json));
        }

        return {
            raw: raw,
            preview: clip(raw, 1200),
            size: raw ? raw.length : 0,
            doc_id: (params && params.get('doc_id')) || (json && json.doc_id) || '',
            friendly_name: (params && (params.get('fb_api_req_friendly_name') || params.get('friendly_name'))) || (json && (json.fb_api_req_friendly_name || json.friendly_name || json.operationName)) || '',
            operation_name: (params && params.get('fb_api_req_friendly_name')) || (json && (json.operationName || json.fb_api_req_friendly_name)) || '',
            variables_object: variables && typeof variables === 'object' ? variables : null,
            variables_preview: variables ? clip(typeof variables === 'string' ? variables : JSON.stringify(variables), 800) : '',
            source_identity: sourceIdentity,
        };
    }

    function extractResponseHints(text) {
        var preview = clip(text, 2000);
        return {
            response_preview: preview,
            mentions_activity_log: /GroupAdminActivity|GroupsCometAdminActivity|management_activities|management_activity_log_target|admin_activities|RelayPrefetchedStreamCache|ScheduledServerJS|CometGroupAdminActivitiesActivityLogContentQueryRelayPreloader|adp_CometGroupAdminActivitiesActivityLogContentQueryRelayPreloader|activity_title|"__typename"\s*:\s*"GroupAdminActivity"|"__typename"\s*:\s*"GroupsCometAdminActivity"/i.test(String(text || '')),
        };
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
        }[normalizeWhitespace(operationName)] || null;
    }

    function safeArray(value) {
        return Array.isArray(value) ? value : [];
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

    function normalizeSoundCloudRows(datasetKey, data) {
        switch (datasetKey) {
            case 'tracks':
                return extractSoundCloudCollectionItems((data && data.topTracksByWindow) || (data && data.topTracksByRange)).map(function (item) {
                    return {
                        title: item && item.track && item.track.title ? item.track.title : '',
                        plays: item && typeof item.count !== 'undefined' ? Number(item.count) || 0 : 0,
                        url: item && item.track && item.track.permalinkUrl ? item.track.permalinkUrl : '',
                        artwork: item && item.track && item.track.artworkUrl ? item.track.artworkUrl : '',
                    };
                });
            case 'countries':
                return extractSoundCloudCollectionItems(data && data.topCountriesByWindow).map(function (item) {
                    return {
                        country: item && item.country && item.country.name ? item.country.name : '',
                        code: item && item.country && item.country.countryCode ? item.country.countryCode : '',
                        plays: item && typeof item.count !== 'undefined' ? Number(item.count) || 0 : 0,
                    };
                });
            case 'cities':
                return extractSoundCloudCollectionItems(data && data.topCitiesByWindow).map(function (item) {
                    return {
                        city: item && item.city && item.city.name ? item.city.name : '',
                        country: item && item.city && item.city.country && item.city.country.name ? item.city.country.name : '',
                        code: item && item.city && item.city.country && item.city.country.countryCode ? item.city.country.countryCode : '',
                        plays: item && typeof item.count !== 'undefined' ? Number(item.count) || 0 : 0,
                    };
                });
            case 'playlists':
                return extractSoundCloudCollectionItems(data && data.topPlaylistsByWindow).map(function (item) {
                    return {
                        playlist: item && item.playlist && item.playlist.title ? item.playlist.title : '',
                        user: item && item.playlist && item.playlist.user && item.playlist.user.username ? item.playlist.user.username : '',
                        count: item && typeof item.count !== 'undefined' ? Number(item.count) || 0 : 0,
                        url: item && item.playlist && item.playlist.permalinkUrl ? item.playlist.permalinkUrl : '',
                        artwork: item && item.playlist && item.playlist.artworkUrl ? item.playlist.artworkUrl : '',
                    };
                });
            case 'totals': {
                var totals = data && data.totalsByWindow && typeof data.totalsByWindow === 'object'
                    ? data.totalsByWindow
                    : {};
                return Object.keys(totals).map(function (metricKey) {
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
            }
            case 'isrcs':
                return extractSoundCloudCollectionItems(data && data.isrcsWithTracks).map(function (item) {
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
            case 'lookup':
                return data && data.trackByPermalink && typeof data.trackByPermalink === 'object'
                    ? [data.trackByPermalink]
                    : [];
            default:
                return [];
        }
    }

    function buildSoundCloudCapture(base, urlMeta, bodyMeta) {
        var requestUrl = String(base && base.url ? base.url : '');
        var requestHost = String(urlMeta && urlMeta.host ? urlMeta.host : '').toLowerCase();
        var currentHost = String(window.location.hostname || '').toLowerCase();
        var opName = normalizeWhitespace(base && base.operation_name ? base.operation_name : (bodyMeta && bodyMeta.operation_name ? bodyMeta.operation_name : ''));
        var datasetKey = supportedSoundCloudOperationToDataset(opName);

        if (!datasetKey) {
            return null;
        }

        if (requestHost.indexOf('soundcloud.com') === -1 && currentHost.indexOf('soundcloud.com') === -1 && requestUrl.indexOf('soundcloud.com') === -1) {
            return null;
        }

        if (!(urlMeta && urlMeta.is_graphql) && requestUrl.indexOf('graph.soundcloud.com/graphql') === -1) {
            return null;
        }

        var parsedResponse = base && base.response_json && typeof base.response_json === 'object'
            ? base.response_json
            : safeJsonParse(base && base.response_text ? base.response_text : '');
        var data = parsedResponse && typeof parsedResponse === 'object' && typeof parsedResponse.data !== 'undefined'
            ? parsedResponse.data
            : parsedResponse;
        if (!data || typeof data !== 'object') {
            return null;
        }

        var variables = bodyMeta && bodyMeta.variables_object && typeof bodyMeta.variables_object === 'object'
            ? bodyMeta.variables_object
            : {};
        var rows = normalizeSoundCloudRows(datasetKey, data);
        var totalMetric = datasetKey === 'lookup'
            ? null
            : sumSoundCloudMetric(rows, ['plays', 'count', 'listeners', 'stream_count']) || null;
        var meta = {
            frame: window.location.href,
            host: currentHost,
            via: base && base.transport ? base.transport : '',
            request_url: requestUrl,
            request_host: requestHost,
            status: base && typeof base.status !== 'undefined' ? base.status : null,
        };

        return {
            opName: opName,
            variables: variables,
            data: data,
            meta: meta,
            normalized_dataset: {
                source_url: meta.frame,
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
            }
        };
    }

    function isFacebookAdminActivitiesPage() {
        return window.location.hostname.indexOf('facebook.com') !== -1
            && /\/groups\/[^/]+\/admin_activities/.test(window.location.pathname || '');
    }

    function getBootstrapAdminScriptTextMatcher() {
        return /GroupAdminActivity|GroupsCometAdminActivity|management_activities|management_activity_log_target|admin_activities|RelayPrefetchedStreamCache|ScheduledServerJS|CometGroupAdminActivitiesActivityLogContentQueryRelayPreloader|adp_CometGroupAdminActivitiesActivityLogContentQueryRelayPreloader|activity_title/i;
    }

    function isStrongBootstrapAdminScriptText(raw) {
        var text = String(raw || '');
        return /adp_CometGroupAdminActivitiesActivityLogContentQueryRelayPreloader|CometGroupAdminActivitiesActivityLogContentQueryRelayPreloader/.test(text)
            || /"__typename"\s*:\s*"GroupAdminActivity"|"__typename"\s*:\s*"GroupsCometAdminActivity"/.test(text)
            || (/management_activity_log_target/.test(text) && /management_activities/.test(text) && /activity_title/.test(text));
    }

    function scoreBootstrapAdminActivityScriptNode(node, raw) {
        var text = String(raw || '');
        var type = normalizeWhitespace(node && node.getAttribute ? node.getAttribute('type') : '').toLowerCase();
        var score = 0;

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

    function summarizeBootstrapAdminScriptNode(node, raw, score) {
        var text = String(raw || '');
        return {
            type: normalizeWhitespace(node && node.getAttribute ? node.getAttribute('type') : '') || '(none)',
            has_data_sjs: !!(node && node.hasAttribute && node.hasAttribute('data-sjs')),
            score: typeof score === 'number' ? score : scoreBootstrapAdminActivityScriptNode(node, text),
            length: text.length,
            preview: clip(normalizeWhitespace(text), 220),
            has_preloader: /adp_CometGroupAdminActivitiesActivityLogContentQueryRelayPreloader|CometGroupAdminActivitiesActivityLogContentQueryRelayPreloader/.test(text),
            has_admin_typename: /"__typename"\s*:\s*"GroupAdminActivity"|"__typename"\s*:\s*"GroupsCometAdminActivity"/.test(text),
        };
    }

    function buildBootstrapAdminScanDebug(reason) {
        return {
            source: 'injected-monitor',
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

    function collectBootstrapAdminActivityScriptNodes(debugState) {
        var bodyRoot = document.body || null;
        var root = bodyRoot || document.documentElement;
        var results = [];
        var seenNodes = [];
        var matcher = getBootstrapAdminScriptTextMatcher();
        var targetedXpathQueries = [
            ".//script[@type='application/json' and contains(., 'adp_CometGroupAdminActivitiesActivityLogContentQueryRelayPreloader')]",
            ".//script[@type='application/json' and contains(., 'CometGroupAdminActivitiesActivityLogContentQueryRelayPreloader')]",
            ".//script[@type='application/json' and contains(., 'GroupAdminActivity')]",
            ".//script[@type='application/json' and contains(., 'management_activity_log_target')]"
        ];

        function appendNode(node) {
            if (!node || seenNodes.indexOf(node) !== -1) {
                return;
            }
            seenNodes.push(node);
            results.push(node);
        }

        function appendXPathMatches(scope, xpath) {
            if (!scope || typeof document.evaluate !== 'function' || typeof XPathResult === 'undefined') {
                return;
            }

            try {
                var snapshot = document.evaluate(xpath, scope, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
                if (debugState) {
                    debugState.xpath_hits[xpath] = snapshot.snapshotLength;
                }
                for (var index = 0; index < snapshot.snapshotLength; index += 1) {
                    appendNode(snapshot.snapshotItem(index));
                }
            } catch (error) {
                if (debugState) {
                    debugState.xpath_hits[xpath] = 'error';
                }
            }
        }

        if (bodyRoot) {
            targetedXpathQueries.forEach(function (xpath) {
                appendXPathMatches(bodyRoot, xpath);
            });
        }

        var primaryScripts = bodyRoot ? bodyRoot.querySelectorAll('script[type="application/json"]') : [];
        if (debugState) {
            debugState.body_available = !!bodyRoot;
            debugState.body_application_json_count = primaryScripts.length;
        }
        for (var i = 0; i < primaryScripts.length; i += 1) {
            var node = primaryScripts[i];
            var raw = node && typeof node.textContent === 'string' ? node.textContent : '';
            if (raw && raw.length >= 40 && (isStrongBootstrapAdminScriptText(raw) || matcher.test(raw))) {
                appendNode(node);
            }
        }

        if (!results.length && root) {
            if (debugState) {
                debugState.fallback_used = true;
            }
            var fallbackScripts = root.querySelectorAll('script[type="application/json"], script[data-sjs], script:not([src])');
            for (var j = 0; j < fallbackScripts.length; j += 1) {
                var fallbackNode = fallbackScripts[j];
                var fallbackRaw = fallbackNode && typeof fallbackNode.textContent === 'string' ? fallbackNode.textContent : '';
                if (fallbackRaw && fallbackRaw.length >= 40 && matcher.test(fallbackRaw)) {
                    appendNode(fallbackNode);
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

    function collectBootstrapAdminActivityEntries(reason) {
        if (!isFacebookAdminActivitiesPage()) {
            return null;
        }

        var debugState = buildBootstrapAdminScanDebug(reason);
        var scripts = collectBootstrapAdminActivityScriptNodes(debugState);
        var results = [];
        var seenKeys = {};
        var matcher = getBootstrapAdminScriptTextMatcher();

        for (var i = 0; i < scripts.length; i += 1) {
            var raw = scripts[i] && typeof scripts[i].textContent === 'string' ? scripts[i].textContent : '';
            if (!raw || raw.length < 40) {
                debugState.skipped_short += 1;
                continue;
            }
            if (!matcher.test(raw)) {
                debugState.skipped_matcher += 1;
                continue;
            }

            debugState.scripts_considered += 1;

            var parsedEntries = parseDetectedEntriesFromResponse(raw, null);
            if (parsedEntries.length) {
                debugState.scripts_with_entries += 1;
            }

            debugState.parsed_scripts.push({
                preview: clip(normalizeWhitespace(raw), 180),
                raw_length: raw.length,
                chunk_count: 0,
                used_single_parse: false,
                entry_count: parsedEntries.length,
                entry_preview: parsedEntries.length ? clip(parsedEntries.slice(0, 2).map(function (entry) {
                    return entry && entry.action_text ? entry.action_text : '';
                }).join(' · '), 180) : '',
            });

            parsedEntries.forEach(function (entry) {
                if (entry && !seenKeys[entry.key]) {
                    seenKeys[entry.key] = true;
                    results.push(entry);
                }
            });
        }

        debugState.entries_detected = results.length;
        debugState.detected_entry_preview = results.slice(0, 5).map(function (entry) {
            return clip(entry && entry.action_text ? entry.action_text : '', 180);
        });
        debugState.outcome = results.length
            ? 'entries-detected'
            : (debugState.matched_script_count
                ? 'matched-scripts-but-no-entries'
                : (debugState.body_application_json_count ? 'body-json-found-no-matches' : 'no-body-json-scripts'));

        return {
            entries: results,
            debug: debugState,
        };
    }

    function runBootstrapAdminActivityScan(reason) {
        var startedAt = Date.now();
        var scan = collectBootstrapAdminActivityEntries(reason);
        if (!scan) {
            return;
        }

        post(buildPayload({
            transport: 'bootstrap',
            method: 'DOM',
            url: window.location.href,
            is_graphql: false,
            status: 200,
            duration_ms: Date.now() - startedAt,
            content_type: 'text/html',
            response_type: 'document',
            friendly_name: 'bootstrap-dom-scan',
            operation_name: reason || 'bootstrap-scan',
            request_preview: 'bootstrap-scan:' + String(reason || 'bootstrap-scan'),
            response_preview: scan.debug && scan.debug.detected_entry_preview && scan.debug.detected_entry_preview.length
                ? scan.debug.detected_entry_preview.join(' · ')
                : (scan.debug && scan.debug.top_scripts && scan.debug.top_scripts.length && scan.debug.top_scripts[0].preview
                    ? scan.debug.top_scripts[0].preview
                    : ''),
            mentions_activity_log: true,
            detected_entries_override: scan.entries,
            detected_comments_override: [],
            bootstrap_debug: scan.debug,
        }));
    }

    function safeReadXhrResponseText(xhr) {
        var responseType;
        var contentType;

        try {
            responseType = String(xhr && xhr.responseType ? xhr.responseType : '');
        } catch (e) {
            responseType = '';
        }

        try {
            contentType = typeof xhr.getResponseHeader === 'function' ? String(xhr.getResponseHeader('content-type') || '') : '';
        } catch (e) {
            contentType = '';
        }

        if (!xhr) {
            return '';
        }

        if (responseType === '' || responseType === 'text') {
            try {
                return xhr.responseText || '';
            } catch (e) {
                return '[unavailable text response]';
            }
        }

        if (responseType === 'json') {
            try {
                return xhr.response ? JSON.stringify(xhr.response) : '';
            } catch (e) {
                return '[unavailable json response]';
            }
        }

        if (responseType === 'document') {
            try {
                return xhr.responseXML && xhr.responseXML.documentElement
                    ? xhr.responseXML.documentElement.outerHTML
                    : '[document response omitted]';
            } catch (e) {
                return '[document response omitted]';
            }
        }

        if (responseType === 'arraybuffer') {
            try {
                var byteLength = xhr.response && typeof xhr.response.byteLength === 'number' ? xhr.response.byteLength : 0;
                if (/json|text|javascript|graphql/i.test(contentType) && typeof TextDecoder !== 'undefined' && xhr.response) {
                    return new TextDecoder('utf-8').decode(new Uint8Array(xhr.response));
                }
                return '[arraybuffer response omitted' + (byteLength ? ' ' + byteLength + ' bytes' : '') + ']';
            } catch (e) {
                return '[arraybuffer response omitted]';
            }
        }

        if (responseType === 'blob') {
            try {
                var blobSize = xhr.response && typeof xhr.response.size === 'number' ? xhr.response.size : 0;
                return '[blob response omitted' + (blobSize ? ' ' + blobSize + ' bytes' : '') + ']';
            } catch (e) {
                return '[blob response omitted]';
            }
        }

        return '[response omitted for type ' + responseType + ']';
    }

    function buildPayload(base) {
        var urlMeta = buildUrlMeta(base.url || '');
        var bodyMeta = parseBodyMeta(base.request_body);
        var responseMeta = extractResponseHints(base.response_text || '');
        var soundcloudCapture = buildSoundCloudCapture(base, urlMeta, bodyMeta);
        var batchId = [Date.now(), Math.round(Math.random() * 1000000), clip(base.url || '', 120)].join(':');
        var shouldParseDetections = !!(urlMeta.is_graphql || responseMeta.mentions_activity_log || /admin_activities|management_activities|management_activity_log_target|groupadminactivity|groupscometadminactivity|relayprefetchedstreamcache|scheduledserverjs|cometgroupadminactivitiesactivitylogcontentqueryrelaypreloader|adp_cometgroupadminactivitiesactivitylogcontentqueryrelaypreloader|activity_title|"__typename"\s*:\s*"groupadminactivity"|"__typename"\s*:\s*"groupscometadminactivity"/i.test(String(bodyMeta.preview || '')));
        var detectedEntries = Array.isArray(base.detected_entries_override)
            ? base.detected_entries_override
            : (shouldParseDetections ? parseDetectedEntriesFromResponse(base.response_text || '', bodyMeta.source_identity) : []);
        var shouldParseComments = !!(urlMeta.is_graphql && /comment|reply|feedback|ufi/i.test(String(bodyMeta.preview || '') + ' ' + String(responseMeta.response_preview || '')));
        var detectedComments = Array.isArray(base.detected_comments_override)
            ? base.detected_comments_override
            : (shouldParseComments ? parseDetectedCommentsFromResponse(base.response_text || '', batchId) : []);

        return {
            transport: base.transport,
            method: base.method,
            url: base.url,
            host: urlMeta.host,
            pathname: urlMeta.pathname,
            search: urlMeta.search,
            is_graphql: !!(base.is_graphql || urlMeta.is_graphql),
            status: base.status,
            duration_ms: base.duration_ms,
            content_type: base.content_type || '',
            response_type: base.response_type || '',
            doc_id: base.doc_id || bodyMeta.doc_id,
            friendly_name: base.friendly_name || bodyMeta.friendly_name,
            operation_name: base.operation_name || bodyMeta.operation_name,
            request_size: bodyMeta.size,
            request_preview: base.request_preview || bodyMeta.preview,
            variables_preview: base.variables_preview || bodyMeta.variables_preview,
            response_preview: base.response_preview || responseMeta.response_preview,
            mentions_activity_log: !!(base.mentions_activity_log || responseMeta.mentions_activity_log),
            network_batch_id: batchId,
            detected_entries: detectedEntries,
            detected_count: detectedEntries.length,
            detected_comment_entries: detectedComments,
            detected_comment_count: detectedComments.length,
            soundcloud_capture: soundcloudCapture,
            bootstrap_debug: base.bootstrap_debug || null,
        };
    }

    function post(payload) {
        try {
            bufferSoundCloudPayload(payload);

            window.postMessage({
                source: 'tn-networks-social-media-tools',
                type: 'NETWORK_EVENT',
                payload: payload,
            }, '*');

            if (window.top && window.top !== window) {
                window.top.postMessage({
                    source: 'tn-networks-social-media-tools',
                    type: 'NETWORK_EVENT',
                    payload: payload,
                }, '*');
            }
        } catch (e) {
        }
    }

    window.addEventListener('message', function (event) {
        if (event.source !== window || !event.data || event.data.source !== 'tn-networks-social-media-tools-content') {
            return;
        }

        if (event.data.type === 'REQUEST_BOOTSTRAP_SCAN') {
            runBootstrapAdminActivityScan(event.data.reason || 'content-script-request');
        }
    });

    var originalFetch = window.fetch;
    if (typeof originalFetch === 'function') {
        window.fetch = function () {
            var args = Array.prototype.slice.call(arguments);
            var input = args[0];
            var init = args[1] || {};
            var url = typeof input === 'string' ? input : (input && input.url) || '';
            var method = init.method || (input && input.method) || 'GET';
            var startedAt = Date.now();
            var requestBody = init.body || null;
            var isSoundCloudGraphqlRequest = String(url || '').indexOf('graph.soundcloud.com/graphql') !== -1;

            return originalFetch.apply(this, args).then(function (response) {
                var basePayload = {
                    transport: 'fetch',
                    method: method,
                    url: url,
                    is_graphql: String(url || '').indexOf('graphql') !== -1,
                    status: response.status,
                    duration_ms: Date.now() - startedAt,
                    content_type: response.headers && response.headers.get ? (response.headers.get('content-type') || '') : '',
                    request_body: requestBody,
                };

                if (isSoundCloudGraphqlRequest) {
                    var jsonClone = response.clone();
                    var textClone = response.clone();

                    jsonClone.json().then(function (json) {
                        post(buildPayload(Object.assign({}, basePayload, {
                            response_json: json,
                            response_text: typeof json === 'undefined' ? '' : JSON.stringify(json),
                        })));
                    }).catch(function () {
                        textClone.text().then(function (bodyText) {
                            post(buildPayload(Object.assign({}, basePayload, {
                                response_json: safeJsonParse(bodyText),
                                response_text: bodyText,
                            })));
                        }).catch(function () {
                            post(buildPayload(Object.assign({}, basePayload, {
                                response_text: '[unavailable]',
                            })));
                        });
                    });
                } else {
                    var cloned = response.clone();
                    cloned.text().then(function (bodyText) {
                        post(buildPayload(Object.assign({}, basePayload, {
                            response_text: bodyText,
                        })));
                    }).catch(function () {
                        post(buildPayload(Object.assign({}, basePayload, {
                            response_text: '[unavailable]',
                        })));
                    });
                }

                return response;
            }).catch(function (error) {
                post(buildPayload({
                    transport: 'fetch',
                    method: method,
                    url: url,
                    is_graphql: String(url || '').indexOf('graphql') !== -1,
                    status: 0,
                    duration_ms: Date.now() - startedAt,
                    request_body: requestBody,
                    response_text: '[error] ' + clip(error && error.message ? error.message : 'Unknown fetch error', 500),
                }));
                throw error;
            });
        };
    }

    var originalOpen = XMLHttpRequest.prototype.open;
    var originalSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function (method, url) {
        this.__tnRequestMethod = method;
        this.__tnRequestUrl = url;
        this.__tnStartedAt = Date.now();
        return originalOpen.apply(this, arguments);
    };

    XMLHttpRequest.prototype.send = function (body) {
        var xhr = this;
        xhr.__tnRequestBody = body;
        xhr.addEventListener('loadend', function () {
            var responseType;
            var responseText;
            try {
                responseType = String(xhr.responseType || '');
            } catch (e) {
                responseType = '';
            }

            responseText = safeReadXhrResponseText(xhr);

            post(buildPayload({
                transport: 'xhr',
                method: xhr.__tnRequestMethod || 'GET',
                url: xhr.__tnRequestUrl || '',
                is_graphql: String(xhr.__tnRequestUrl || '').indexOf('graphql') !== -1,
                status: xhr.status || 0,
                duration_ms: xhr.__tnStartedAt ? Date.now() - xhr.__tnStartedAt : null,
                content_type: typeof xhr.getResponseHeader === 'function' ? (xhr.getResponseHeader('content-type') || '') : '',
                response_type: responseType,
                request_body: xhr.__tnRequestBody,
                response_json: safeJsonParse(responseText),
                response_text: responseText,
            }));
        });

        return originalSend.apply(this, arguments);
    };

    if (isFacebookAdminActivitiesPage()) {
        setTimeout(function () {
            if (isFacebookAdminActivitiesPage()) {
                runBootstrapAdminActivityScan('injected-startup');
            }
        }, 0);
    }
}());


