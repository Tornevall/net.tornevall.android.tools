// Ported from the working sc4a-insights hook so SoundCloud GraphQL capture stays deterministic.
if (!window.__scx_hook_installed__) {
    window.__scx_hook_installed__ = true;

    (function () {
        var TARGET_SUBSTR = 'graph.soundcloud.com/graphql';
        var HOOK_READY_ATTRIBUTE = 'data-tn-soundcloud-hook-ready';
        var BUFFER_ELEMENT_ID = 'tn-soundcloud-direct-capture-buffer';

        function markHookReady() {
            try {
                if (document.documentElement) {
                    document.documentElement.setAttribute(HOOK_READY_ATTRIBUTE, '1');
                }
            } catch (error) {
            }
        }

        function getBufferElement() {
            var existing = document.getElementById(BUFFER_ELEMENT_ID);
            if (existing) {
                return existing;
            }

            try {
                var node = document.createElement('script');
                node.id = BUFFER_ELEMENT_ID;
                node.type = 'application/json';
                node.textContent = '[]';
                (document.documentElement || document.head || document.body).appendChild(node);
                return node;
            } catch (error) {
                return null;
            }
        }

        function bufferDetail(detail) {
            var node = getBufferElement();
            if (!node) {
                return;
            }

            try {
                var parsed = safeParseJSON(node.textContent || '[]');
                var queue = Array.isArray(parsed) ? parsed : [];
                queue.push(detail);
                if (queue.length > 12) {
                    queue = queue.slice(queue.length - 12);
                }
                node.textContent = JSON.stringify(queue);
            } catch (error) {
            }
        }

        function safeParseJSON(txt) {
            try {
                return JSON.parse(txt);
            } catch (error) {
                return null;
            }
        }

        function toRequestUrl(input) {
            if (typeof input === 'string') {
                return input;
            }

            if (input && typeof input.url === 'string') {
                return input.url;
            }

            return '';
        }

        function toRequestBody(body) {
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
                } catch (error) {
                    return '';
                }
            }

            return String(body || '');
        }

        function parseRequestMeta(rawBody) {
            var bodyText = String(rawBody || '');
            var jsonBody = safeParseJSON(bodyText);
            var opName = null;
            var variables = null;

            if (jsonBody && typeof jsonBody === 'object') {
                opName = jsonBody.operationName || null;
                variables = jsonBody.variables || null;
            } else if (bodyText) {
                try {
                    var params = new URLSearchParams(bodyText);
                    if (params.get('operationName')) {
                        opName = params.get('operationName');
                    }
                    if (params.get('variables')) {
                        variables = safeParseJSON(params.get('variables')) || null;
                    }
                } catch (error) {
                }
            }

            return {
                opName: opName,
                variables: variables,
            };
        }

        function emit(opName, variables, data, meta) {
            try {
                var detail = {
                    opName: opName,
                    variables: variables,
                    data: data,
                    meta: meta,
                };
                bufferDetail(detail);
                try {
                    if (window.top && window.top !== window && typeof window.top.postMessage === 'function') {
                        window.top.postMessage({
                            source: 'tn-networks-social-media-tools',
                            type: 'NETWORK_EVENT',
                            payload: {
                                soundcloud_capture: detail,
                            },
                        }, '*');
                    }
                } catch (forwardError) {
                }
                window.dispatchEvent(new CustomEvent('scx-graphql-capture', {
                    detail: detail
                }));
            } catch (error) {
            }
        }

        var originalFetch = window.fetch;
        if (typeof originalFetch === 'function') {
            window.fetch = async function () {
                var args = Array.prototype.slice.call(arguments);
                var input = args[0];
                var options = args[1] || {};
                var url = toRequestUrl(input);
                var isTarget = typeof url === 'string' && url.indexOf(TARGET_SUBSTR) !== -1;
                var requestMeta = parseRequestMeta(toRequestBody(options && typeof options === 'object' ? options.body : null));
                var response = await originalFetch.apply(this, args);

                if (isTarget) {
                    try {
                        var clone = response.clone();
                        clone.json().then(function (json) {
                            var data = json && typeof json.data !== 'undefined' ? json.data : (typeof json !== 'undefined' ? json : null);
                            emit(requestMeta.opName, requestMeta.variables, data, {
                                frame: location.href,
                                host: location.hostname,
                                via: 'fetch',
                                request_url: url,
                                status: response.status,
                            });
                        }).catch(function () {
                        });
                    } catch (error) {
                    }
                }

                return response;
            };
        }

        var originalOpen = XMLHttpRequest.prototype.open;
        var originalSend = XMLHttpRequest.prototype.send;

        XMLHttpRequest.prototype.open = function () {
            this.__scx_url = arguments[1];
            return originalOpen.apply(this, arguments);
        };

        XMLHttpRequest.prototype.send = function (body) {
            var isTarget = typeof this.__scx_url === 'string' && this.__scx_url.indexOf(TARGET_SUBSTR) !== -1;
            var requestMeta = parseRequestMeta(toRequestBody(body));

            if (isTarget) {
                this.addEventListener('load', function () {
                    try {
                        if (this.responseType === '' || this.responseType === 'text') {
                            var json = safeParseJSON(this.responseText);
                            emit(requestMeta.opName, requestMeta.variables, json && typeof json.data !== 'undefined' ? json.data : json, {
                                frame: location.href,
                                host: location.hostname,
                                via: 'xhr',
                                request_url: this.__scx_url,
                                status: this.status,
                            });
                        } else if (this.responseType === 'blob' && this.response instanceof Blob) {
                            var reader = new FileReader();
                            var xhr = this;
                            reader.onload = function () {
                                var json = safeParseJSON(reader.result);
                                emit(requestMeta.opName, requestMeta.variables, json && typeof json.data !== 'undefined' ? json.data : json, {
                                    frame: location.href,
                                    host: location.hostname,
                                    via: 'xhr-blob',
                                    request_url: xhr.__scx_url,
                                    status: xhr.status,
                                });
                            };
                            reader.readAsText(this.response);
                        }
                    } catch (error) {
                        try {
                            console.warn('[TN Social Tools] SoundCloud XHR intercept error', error);
                        } catch (noop) {
                        }
                    }
                });
            }

            return originalSend.apply(this, arguments);
        };

        markHookReady();

        try {
            window.dispatchEvent(new CustomEvent('scx-hook-ready', {
                detail: {
                    host: location.hostname,
                    href: location.href,
                }
            }));
        } catch (error) {
        }
    }());
}

