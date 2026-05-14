document.addEventListener('DOMContentLoaded', function () {
    var links = window.TNNetworksExtensionLinks || {};
    var forumLink = document.getElementById('forumLink');
    var openToolsDashboardLink = document.getElementById('openToolsDashboardLink');
    var toolsDashboardPath = links.TOOLS_SOCIAL_MEDIA_DASHBOARD_PATH || '/admin/social-media-tools/facebook';
    var toolsBaseUrl = 'https://tools.tornevall.net';

    if (forumLink) {
        forumLink.href = links.FORUM_URL || 'https://forum.tornevall.net';
    }

    chrome.storage.sync.get(['devMode'], function (data) {
        toolsBaseUrl = data && data.devMode ? 'https://tools.tornevall.com' : 'https://tools.tornevall.net';
        if (openToolsDashboardLink) {
            openToolsDashboardLink.href = toolsBaseUrl + toolsDashboardPath;
        }
    });
});

