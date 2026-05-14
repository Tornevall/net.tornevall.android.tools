(function () {
    function detectResponderName() {
        var currentUser = document.querySelector('[data-testid="SideNav_AccountSwitcher_Button"] span');
        if (currentUser && currentUser.textContent) {
            return currentUser.textContent.trim();
        }

        var headings = document.querySelectorAll('[data-testid="UserName"] span');
        if (headings.length > 0 && headings[0].textContent) {
            return headings[0].textContent.trim();
        }

        return null;
    }

    function getPath(locationObject) {
        return String(locationObject && locationObject.pathname ? locationObject.pathname : '').toLowerCase();
    }

    function isSupportedPage(locationObject) {
        var path = getPath(locationObject);
        if (!path || path === '/' || path === '/home') {
            return true;
        }

        if (path.indexOf('/messages') === 0) {
            return false;
        }

        return /^\/compose(\/|$)/.test(path)
            || /^\/intent\/tweet/.test(path)
            || /^\/i\/flow\/compose/.test(path)
            || /^\/[^/]+\/status\/\d+/.test(path);
    }

    function supportsComposerTarget(node, locationObject) {
        if (!node || !isSupportedPage(locationObject)) {
            return false;
        }

        var hintText = [
            node.getAttribute && node.getAttribute('aria-label'),
            node.getAttribute && node.getAttribute('placeholder'),
        ].join(' ').toLowerCase();

        if (/search/.test(hintText)) {
            return false;
        }

        if (node.closest('[role="search"]')) {
            return false;
        }

        return !!node.closest('[data-testid="tweetTextarea_0"], [role="dialog"], form');
    }

    window.TNNetworksPlatformRegistry.register({
        id: 'x',
        label: 'X / Twitter',
        matchesHost: function (hostname) {
            return hostname.indexOf('x.com') !== -1 || hostname.indexOf('twitter.com') !== -1;
        },
        isSupportedPage: isSupportedPage,
        supportsComposerTarget: supportsComposerTarget,
        detectResponderName: detectResponderName,
        sendButtonSelectors: [
            '[data-testid="tweetButtonInline"]',
            '[data-testid="tweetButton"]',
            '[data-testid="tweetButtonInline"] [role="button"]',
            '[data-testid="tweetButton"] [role="button"]'
        ],
        enableNetworkCapture: true,
    });
}());

