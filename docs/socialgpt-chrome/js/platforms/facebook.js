(function () {
    function getNestedValue(root, path) {
        return path.reduce(function (acc, key) {
            if (acc === null || typeof acc === 'undefined') {
                return undefined;
            }

            return typeof acc[key] === 'undefined' ? undefined : acc[key];
        }, root);
    }

    function detectResponderName() {
        var scripts = document.querySelectorAll('script[type="application/json"]');
        for (var i = 0; i < scripts.length; i += 1) {
            try {
                var json = JSON.parse(scripts[i].textContent);
                var name = getNestedValue(json, ['require', 0, 3, 0, '__bbox', 'require', 0, 3, 1, '__bbox', 'result', 'data', 'viewer', 'actor', 'name']);
                if (name) {
                    return name;
                }
            } catch (e) {
            }
        }

        var img = document.querySelector('img[alt][src*="scontent"]');
        if (img && img.alt && img.alt.length > 1) {
            return img.alt.trim();
        }

        var spans = [].slice.call(document.querySelectorAll('span'));
        for (var j = 0; j < spans.length; j += 1) {
            var txt = spans[j].textContent && typeof spans[j].textContent.trim === 'function' ? spans[j].textContent.trim() : '';
            if (txt && txt.length >= 4 && /^[A-ZÅÄÖ][a-zåäö]+(?: [A-ZÅÄÖ][a-zåäö]+)?$/.test(txt)) {
                return txt;
            }
        }

        return null;
    }

    function getPath(locationObject) {
        return String(locationObject && locationObject.pathname ? locationObject.pathname : '').toLowerCase();
    }

    function isSupportedPage(locationObject) {
        var path = getPath(locationObject);
        if (!path) {
            return true;
        }

        if (path.indexOf('/messages') === 0 || path.indexOf('/messenger') === 0) {
            return false;
        }

        return path.indexOf('/admin_activities') === -1;
    }

    function supportsComposerTarget(node, locationObject) {
        if (!node || !isSupportedPage(locationObject)) {
            return false;
        }

        var hintText = [
            node.getAttribute && node.getAttribute('aria-label'),
            node.getAttribute && node.getAttribute('placeholder'),
            node.getAttribute && node.getAttribute('title'),
        ].join(' ').toLowerCase();

        if (/search|sök/.test(hintText)) {
            return false;
        }

        if (node.closest('[role="search"]')) {
            return false;
        }

        if (node.closest('[data-pagelet*="Chat"], [data-pagelet*="Messenger"], [aria-label*="Messenger"], [aria-label*="Message thread"], [aria-label*="Konversation"]')) {
            return false;
        }

        return !!node.closest('[role="main"], [role="dialog"], [role="article"], [role="listitem"], form, [data-pagelet], [data-ad-preview="message"], [data-ad-comet-preview="message"]');
    }

    window.TNNetworksPlatformRegistry.register({
        id: 'facebook',
        label: 'Facebook',
        matchesHost: function (hostname) {
            return hostname.indexOf('facebook.com') !== -1;
        },
        isSupportedPage: isSupportedPage,
        supportsComposerTarget: supportsComposerTarget,
        detectResponderName: detectResponderName,
        enableNetworkCapture: true,
    });
}());

