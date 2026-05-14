(function () {
    var registry = [];

    function register(definition) {
        registry.push(definition);
    }

    function getActive(hostname) {
        for (var i = 0; i < registry.length; i += 1) {
            if (typeof registry[i].matchesHost === 'function' && registry[i].matchesHost(hostname)) {
                return registry[i];
            }
        }

        return null;
    }

    window.TNNetworksPlatformRegistry = {
        register: register,
        getActive: getActive,
        list: function () {
            return registry.slice();
        }
    };
}());


