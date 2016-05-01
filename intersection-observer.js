(function () {

    if (typeof window.IntersectionObserver !== 'undefined') {
        return;
    }

    var mutationObserverAvailable = typeof window.MutationObserver !== 'undefined',
        ClientRect = window.ClientRect || window.DOMRect,
        
        IntersectionObserverEntry = function (boundingClientRect, intersectionRect, rootBounds, target, time) {
            checkArgs(arguments, [null, null, null, 'Element']);
            this.boundingClientRect = boundingClientRect;
            this.intersectionRect = intersectionRect;
            this.rootBounds = rootBounds;
            this.target = target;
            this.time = time || Date.now();
        },

        IntersectionObserver = function (callback, options) {
            checkArgs(arguments, 'Function');
            setupMutationObserver(this);
            this._changes = null;
            this._queue = [];
            this._eventBound = false;
            this._callback = callback;
            options = options || {};
            this.root = options.root || null;
            this.rootMargin = options.rootMargin || '0px';
            this.threshold = options.threshold || [0];
            this._windowListener = windowListener.bind(this);
        },
        publics = {
            observe: function (target) {
                checkArgs(arguments, 'Element');
                var elRect = getElementRect(target),
                    rootRect = getElementRect(this.root);

                this._queue.push(new IntersectionObserverEntry(
                    elRect,
                    getIntersectionRect(elRect, rootRect),
                    rootRect,
                    target
                ));
                this._eventBound = eventBinding(this._eventBound, this._queue.length, this.root, this._windowListener);
            },
            unobserve: function (target) {
                checkArgs(arguments, 'Element');
                this._queue.some(function (item, index, array) {
                    if (item.target === target) {
                        array.splice(index, 1);
                        this._eventBound = eventBinding(this._eventBound, array.length, this.root, this._windowListener);
                        return true;
                    }
                }, this);
            },
            disconnect: function () {
                this._queue = [];
                this._eventBound = eventBinding(this._eventBound, this._queue.length, this.root, this._windowListener, true);
            },
            takeRecords: function () {
                var queueCopy = this._queue.slice();
                this.disconnect();
                return queueCopy;
            }
        };

    Object.keys(publics).forEach(function (name) {
        Object.defineProperty(IntersectionObserver.prototype, name, {value: publics[name]});
    });

    function checkArgs(args, instances) {
        var argsLength = args.length, i;

        instances = Array.isArray(instances) ? instances : [instances];
        if (argsLength < instances.length) {
            throw new TypeError(instances.length + ' argument(s) required, but only ' + argsLength + ' present.');
        }
        for (i = 0; i < argsLength; i++) {
            if (!instances[i]) {
                continue;
            }
            if (!(args[i] instanceof window[instances[i]]) && typeof args[i] !== instances[i]) {
                throw new TypeError('The argument provided as parameter ' + (i+1) + ' is not a ' + instances[i] + '.');
            }
        }
    }

    function invokeCallback() {
        if (this._changes) {
            this._callback(this._changes.slice(), this);
        }
    }

    function setupMutationObserver(instance) {
        instance._invokeCallback = invokeCallback.bind(instance);
        if (!mutationObserverAvailable) {
            return;
        }
        instance._mutationObserver = new MutationObserver(instance._invokeCallback);
        instance._fakeElement = document.createElement('div');
        instance._mutationObserver.observe(instance._fakeElement, {
            attributes: true,
            attributeFilter: ['lang']
        });
    }

    function eventBinding(eventBound, queueLength, root, handler, forceUnbind) {
        if (eventBound && queueLength === 0 || forceUnbind) {
            (root || window).removeEventListener('scroll', handler);
            window.removeEventListener('resize', handler);
            return false;
        } else if (!eventBound && queueLength > 0 && !forceUnbind) {
            (root || window).addEventListener('scroll', handler);
            window.addEventListener('resize', handler);
            return true;
        }

        return eventBound;
    }

    function windowListener() {
        var changes = [],
            now = Date.now(),
            rootRect = getElementRect(this.root),
            entry,
            i,
            intersectionRect;

        for (i = 0; i < this._queue.length; i++) {
            entry = this._queue[i];
            intersectionRect = getIntersectionRect(
                entry.boundingClientRect = getElementRect(entry.target),
                entry.rootBounds = rootRect
            );

            if ((isEmptyRect(intersectionRect) ^ isEmptyRect(entry.intersectionRect))) {
                entry.intersectionRect = intersectionRect;
                entry.time = now;
                changes.push(entry);
            }
        }
        if (changes.length !== 0) {
            this._changes = changes;
            notify(this._fakeElement, this);
        }
    }

    function notify(fake, instance) {
        if (mutationObserverAvailable) {
            fake.setAttribute('lang', fake.getAttribute('data') === 'a' ? 'b' : 'a');
        } else {
            setTimeout(instance._invokeCallback, 0);
        }
    }

    function getElementRect(el) {
        return el ? 
            el.getBoundingClientRect() : 
            createClientRect(0, 0, 0, 0, window.innerWidth, window.innerHeight);
    }

    function getIntersectionRect(rect1, rect2) {
        var intersection = {
            x1: Math.max(rect1.left, rect2.left),
            y1: Math.max(rect1.top, rect2.top),
            x2: Math.min(rect1.left + rect1.width, rect2.left + rect2.width),
            y2: Math.min(rect1.top + rect1.height, rect2.top + rect2.height)
        };

        if (intersection.x1 < intersection.x2 && intersection.y1 < intersection.y2) {
            return createClientRect(intersection.y1, 0, 0, intersection.x1, intersection.x2-intersection.x1, intersection.y2-intersection.y1);
        }

        return createClientRect();
    }

    function createClientRect(top, right, bottom, left, width, height) {
        return Object.create(ClientRect.prototype, {
            top: {value: top || 0},
            right: {value: right || 0},
            bottom: {value: bottom || 0},
            left: {value: left || 0},
            width: {value: width || 0},
            height: {value: height || 0}
        });
    }

    function isEmptyRect(rect) {
        return rect.top + rect.bottom + rect.left + rect.right + rect.width + rect.height === 0;
    }

    window.IntersectionObserver = IntersectionObserver;
    window.IntersectionObserverEntry = IntersectionObserverEntry;

})();
