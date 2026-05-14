(function () {
    function getHost(locationObject) {
        return String(locationObject && locationObject.hostname ? locationObject.hostname : '').toLowerCase();
    }

    function getPath(locationObject) {
        return String(locationObject && locationObject.pathname ? locationObject.pathname : '').toLowerCase();
    }

    function isSupportedPage(locationObject) {
        var host = getHost(locationObject);
        var path = getPath(locationObject);

        if (host.indexOf('artists.soundcloud.com') !== -1
            || host.indexOf('insights.soundcloud.com') !== -1
            || host.indexOf('insights-ui.soundcloud.com') !== -1) {
            return true;
        }

        return /\/insights(?:\/|$)/.test(path)
            || /\/stats(?:\/|$)/.test(path)
            || /\/you\/insights(?:\/|$)/.test(path)
            || /\/for-artists(?:\/|$)/.test(path);
    }

    window.TNNetworksPlatformRegistry.register({
        id: 'soundcloud',
        label: 'SoundCloud',
        matchesHost: function (hostname) {
            return String(hostname || '').toLowerCase().indexOf('soundcloud.com') !== -1;
        },
        isSupportedPage: isSupportedPage,
        supportsComposerTarget: function () {
            return false;
        },
        detectResponderName: function () {
            return null;
        },
        enableNetworkCapture: true,
    });
}());

