(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/**
 * @author Manuel Mazzuola
 * https://github.com/manuelmazzuola/angular-ui-router-styles
 * Inspired by https://github.com/tennisgent/angular-route-styles
 */

(function() {
  'use strict';
  angular
    .module('uiRouterStyles', ['ui.router'])
    .directive('head', uiRouterStylesDirective);

  uiRouterStylesDirective.$inject = ['$rootScope', '$compile', '$state', '$interpolate'];
  function uiRouterStylesDirective($rootScope, $compile, $state, $interpolate) {
    var directive = {
      restrict: 'E',
      link: uiRouterStylesLink
    };

    return directive;

    function uiRouterStylesLink(scope, elem) {
      var start = $interpolate.startSymbol(), end = $interpolate.endSymbol();
      var html = '<link rel="stylesheet" ng-repeat="(k, css) in routeStyles track by k" ng-href="' + start + 'css' + end + '" >';

      scope.routeStyles = [];

      activate();

      ////

      function activate() {
        elem.append($compile(html)(scope));
        $rootScope.$on('$stateChangeSuccess', stateChangeSuccessCallback);
      }

      // Get the parent state
      function $$parentState(state) {
        // Check if state has explicit parent OR we try guess parent from its name
        var name = state.parent || (/^(.+)\.[^.]+$/.exec(state.name) || [])[1];
        // If we were able to figure out parent name then get this state
        return name && $state.get(name);
      }

      function stateChangeSuccessCallback(evt, toState) {
        // From current state to the root
        scope.routeStyles = [];
        for(var state = toState; state && state.name !== ''; state=$$parentState(state)) {
          if(state && state.data && state.data.css) {
            if(!Array.isArray(state.data.css)) {
              state.data.css = [state.data.css];
            }
            angular.forEach(state.data.css, function(css) {
              if(scope.routeStyles.indexOf(css) === -1) {
                scope.routeStyles.push(css);
              }
            });
          }
        }
        scope.routeStyles.reverse();
      }
    }
  }
})();

},{}],2:[function(require,module,exports){
/**
 * State-based routing for AngularJS
 * @version v0.3.1
 * @link http://angular-ui.github.com/
 * @license MIT License, http://www.opensource.org/licenses/MIT
 */

/* commonjs package manager support (eg componentjs) */
if (typeof module !== "undefined" && typeof exports !== "undefined" && module.exports === exports){
  module.exports = 'ui.router';
}

(function (window, angular, undefined) {
/*jshint globalstrict:true*/
/*global angular:false*/
'use strict';

var isDefined = angular.isDefined,
    isFunction = angular.isFunction,
    isString = angular.isString,
    isObject = angular.isObject,
    isArray = angular.isArray,
    forEach = angular.forEach,
    extend = angular.extend,
    copy = angular.copy,
    toJson = angular.toJson;

function inherit(parent, extra) {
  return extend(new (extend(function() {}, { prototype: parent }))(), extra);
}

function merge(dst) {
  forEach(arguments, function(obj) {
    if (obj !== dst) {
      forEach(obj, function(value, key) {
        if (!dst.hasOwnProperty(key)) dst[key] = value;
      });
    }
  });
  return dst;
}

/**
 * Finds the common ancestor path between two states.
 *
 * @param {Object} first The first state.
 * @param {Object} second The second state.
 * @return {Array} Returns an array of state names in descending order, not including the root.
 */
function ancestors(first, second) {
  var path = [];

  for (var n in first.path) {
    if (first.path[n] !== second.path[n]) break;
    path.push(first.path[n]);
  }
  return path;
}

/**
 * IE8-safe wrapper for `Object.keys()`.
 *
 * @param {Object} object A JavaScript object.
 * @return {Array} Returns the keys of the object as an array.
 */
function objectKeys(object) {
  if (Object.keys) {
    return Object.keys(object);
  }
  var result = [];

  forEach(object, function(val, key) {
    result.push(key);
  });
  return result;
}

/**
 * IE8-safe wrapper for `Array.prototype.indexOf()`.
 *
 * @param {Array} array A JavaScript array.
 * @param {*} value A value to search the array for.
 * @return {Number} Returns the array index value of `value`, or `-1` if not present.
 */
function indexOf(array, value) {
  if (Array.prototype.indexOf) {
    return array.indexOf(value, Number(arguments[2]) || 0);
  }
  var len = array.length >>> 0, from = Number(arguments[2]) || 0;
  from = (from < 0) ? Math.ceil(from) : Math.floor(from);

  if (from < 0) from += len;

  for (; from < len; from++) {
    if (from in array && array[from] === value) return from;
  }
  return -1;
}

/**
 * Merges a set of parameters with all parameters inherited between the common parents of the
 * current state and a given destination state.
 *
 * @param {Object} currentParams The value of the current state parameters ($stateParams).
 * @param {Object} newParams The set of parameters which will be composited with inherited params.
 * @param {Object} $current Internal definition of object representing the current state.
 * @param {Object} $to Internal definition of object representing state to transition to.
 */
function inheritParams(currentParams, newParams, $current, $to) {
  var parents = ancestors($current, $to), parentParams, inherited = {}, inheritList = [];

  for (var i in parents) {
    if (!parents[i] || !parents[i].params) continue;
    parentParams = objectKeys(parents[i].params);
    if (!parentParams.length) continue;

    for (var j in parentParams) {
      if (indexOf(inheritList, parentParams[j]) >= 0) continue;
      inheritList.push(parentParams[j]);
      inherited[parentParams[j]] = currentParams[parentParams[j]];
    }
  }
  return extend({}, inherited, newParams);
}

/**
 * Performs a non-strict comparison of the subset of two objects, defined by a list of keys.
 *
 * @param {Object} a The first object.
 * @param {Object} b The second object.
 * @param {Array} keys The list of keys within each object to compare. If the list is empty or not specified,
 *                     it defaults to the list of keys in `a`.
 * @return {Boolean} Returns `true` if the keys match, otherwise `false`.
 */
function equalForKeys(a, b, keys) {
  if (!keys) {
    keys = [];
    for (var n in a) keys.push(n); // Used instead of Object.keys() for IE8 compatibility
  }

  for (var i=0; i<keys.length; i++) {
    var k = keys[i];
    if (a[k] != b[k]) return false; // Not '===', values aren't necessarily normalized
  }
  return true;
}

/**
 * Returns the subset of an object, based on a list of keys.
 *
 * @param {Array} keys
 * @param {Object} values
 * @return {Boolean} Returns a subset of `values`.
 */
function filterByKeys(keys, values) {
  var filtered = {};

  forEach(keys, function (name) {
    filtered[name] = values[name];
  });
  return filtered;
}

// like _.indexBy
// when you know that your index values will be unique, or you want last-one-in to win
function indexBy(array, propName) {
  var result = {};
  forEach(array, function(item) {
    result[item[propName]] = item;
  });
  return result;
}

// extracted from underscore.js
// Return a copy of the object only containing the whitelisted properties.
function pick(obj) {
  var copy = {};
  var keys = Array.prototype.concat.apply(Array.prototype, Array.prototype.slice.call(arguments, 1));
  forEach(keys, function(key) {
    if (key in obj) copy[key] = obj[key];
  });
  return copy;
}

// extracted from underscore.js
// Return a copy of the object omitting the blacklisted properties.
function omit(obj) {
  var copy = {};
  var keys = Array.prototype.concat.apply(Array.prototype, Array.prototype.slice.call(arguments, 1));
  for (var key in obj) {
    if (indexOf(keys, key) == -1) copy[key] = obj[key];
  }
  return copy;
}

function pluck(collection, key) {
  var result = isArray(collection) ? [] : {};

  forEach(collection, function(val, i) {
    result[i] = isFunction(key) ? key(val) : val[key];
  });
  return result;
}

function filter(collection, callback) {
  var array = isArray(collection);
  var result = array ? [] : {};
  forEach(collection, function(val, i) {
    if (callback(val, i)) {
      result[array ? result.length : i] = val;
    }
  });
  return result;
}

function map(collection, callback) {
  var result = isArray(collection) ? [] : {};

  forEach(collection, function(val, i) {
    result[i] = callback(val, i);
  });
  return result;
}

/**
 * @ngdoc overview
 * @name ui.router.util
 *
 * @description
 * # ui.router.util sub-module
 *
 * This module is a dependency of other sub-modules. Do not include this module as a dependency
 * in your angular app (use {@link ui.router} module instead).
 *
 */
angular.module('ui.router.util', ['ng']);

/**
 * @ngdoc overview
 * @name ui.router.router
 *
 * @requires ui.router.util
 *
 * @description
 * # ui.router.router sub-module
 *
 * This module is a dependency of other sub-modules. Do not include this module as a dependency
 * in your angular app (use {@link ui.router} module instead).
 */
angular.module('ui.router.router', ['ui.router.util']);

/**
 * @ngdoc overview
 * @name ui.router.state
 *
 * @requires ui.router.router
 * @requires ui.router.util
 *
 * @description
 * # ui.router.state sub-module
 *
 * This module is a dependency of the main ui.router module. Do not include this module as a dependency
 * in your angular app (use {@link ui.router} module instead).
 *
 */
angular.module('ui.router.state', ['ui.router.router', 'ui.router.util']);

/**
 * @ngdoc overview
 * @name ui.router
 *
 * @requires ui.router.state
 *
 * @description
 * # ui.router
 *
 * ## The main module for ui.router
 * There are several sub-modules included with the ui.router module, however only this module is needed
 * as a dependency within your angular app. The other modules are for organization purposes.
 *
 * The modules are:
 * * ui.router - the main "umbrella" module
 * * ui.router.router -
 *
 * *You'll need to include **only** this module as the dependency within your angular app.*
 *
 * <pre>
 * <!doctype html>
 * <html ng-app="myApp">
 * <head>
 *   <script src="js/angular.js"></script>
 *   <!-- Include the ui-router script -->
 *   <script src="js/angular-ui-router.min.js"></script>
 *   <script>
 *     // ...and add 'ui.router' as a dependency
 *     var myApp = angular.module('myApp', ['ui.router']);
 *   </script>
 * </head>
 * <body>
 * </body>
 * </html>
 * </pre>
 */
angular.module('ui.router', ['ui.router.state']);

angular.module('ui.router.compat', ['ui.router']);

/**
 * @ngdoc object
 * @name ui.router.util.$resolve
 *
 * @requires $q
 * @requires $injector
 *
 * @description
 * Manages resolution of (acyclic) graphs of promises.
 */
$Resolve.$inject = ['$q', '$injector'];
function $Resolve(  $q,    $injector) {

  var VISIT_IN_PROGRESS = 1,
      VISIT_DONE = 2,
      NOTHING = {},
      NO_DEPENDENCIES = [],
      NO_LOCALS = NOTHING,
      NO_PARENT = extend($q.when(NOTHING), { $$promises: NOTHING, $$values: NOTHING });


  /**
   * @ngdoc function
   * @name ui.router.util.$resolve#study
   * @methodOf ui.router.util.$resolve
   *
   * @description
   * Studies a set of invocables that are likely to be used multiple times.
   * <pre>
   * $resolve.study(invocables)(locals, parent, self)
   * </pre>
   * is equivalent to
   * <pre>
   * $resolve.resolve(invocables, locals, parent, self)
   * </pre>
   * but the former is more efficient (in fact `resolve` just calls `study`
   * internally).
   *
   * @param {object} invocables Invocable objects
   * @return {function} a function to pass in locals, parent and self
   */
  this.study = function (invocables) {
    if (!isObject(invocables)) throw new Error("'invocables' must be an object");
    var invocableKeys = objectKeys(invocables || {});

    // Perform a topological sort of invocables to build an ordered plan
    var plan = [], cycle = [], visited = {};
    function visit(value, key) {
      if (visited[key] === VISIT_DONE) return;

      cycle.push(key);
      if (visited[key] === VISIT_IN_PROGRESS) {
        cycle.splice(0, indexOf(cycle, key));
        throw new Error("Cyclic dependency: " + cycle.join(" -> "));
      }
      visited[key] = VISIT_IN_PROGRESS;

      if (isString(value)) {
        plan.push(key, [ function() { return $injector.get(value); }], NO_DEPENDENCIES);
      } else {
        var params = $injector.annotate(value);
        forEach(params, function (param) {
          if (param !== key && invocables.hasOwnProperty(param)) visit(invocables[param], param);
        });
        plan.push(key, value, params);
      }

      cycle.pop();
      visited[key] = VISIT_DONE;
    }
    forEach(invocables, visit);
    invocables = cycle = visited = null; // plan is all that's required

    function isResolve(value) {
      return isObject(value) && value.then && value.$$promises;
    }

    return function (locals, parent, self) {
      if (isResolve(locals) && self === undefined) {
        self = parent; parent = locals; locals = null;
      }
      if (!locals) locals = NO_LOCALS;
      else if (!isObject(locals)) {
        throw new Error("'locals' must be an object");
      }
      if (!parent) parent = NO_PARENT;
      else if (!isResolve(parent)) {
        throw new Error("'parent' must be a promise returned by $resolve.resolve()");
      }

      // To complete the overall resolution, we have to wait for the parent
      // promise and for the promise for each invokable in our plan.
      var resolution = $q.defer(),
          result = resolution.promise,
          promises = result.$$promises = {},
          values = extend({}, locals),
          wait = 1 + plan.length/3,
          merged = false;

      function done() {
        // Merge parent values we haven't got yet and publish our own $$values
        if (!--wait) {
          if (!merged) merge(values, parent.$$values);
          result.$$values = values;
          result.$$promises = result.$$promises || true; // keep for isResolve()
          delete result.$$inheritedValues;
          resolution.resolve(values);
        }
      }

      function fail(reason) {
        result.$$failure = reason;
        resolution.reject(reason);
      }

      // Short-circuit if parent has already failed
      if (isDefined(parent.$$failure)) {
        fail(parent.$$failure);
        return result;
      }

      if (parent.$$inheritedValues) {
        merge(values, omit(parent.$$inheritedValues, invocableKeys));
      }

      // Merge parent values if the parent has already resolved, or merge
      // parent promises and wait if the parent resolve is still in progress.
      extend(promises, parent.$$promises);
      if (parent.$$values) {
        merged = merge(values, omit(parent.$$values, invocableKeys));
        result.$$inheritedValues = omit(parent.$$values, invocableKeys);
        done();
      } else {
        if (parent.$$inheritedValues) {
          result.$$inheritedValues = omit(parent.$$inheritedValues, invocableKeys);
        }
        parent.then(done, fail);
      }

      // Process each invocable in the plan, but ignore any where a local of the same name exists.
      for (var i=0, ii=plan.length; i<ii; i+=3) {
        if (locals.hasOwnProperty(plan[i])) done();
        else invoke(plan[i], plan[i+1], plan[i+2]);
      }

      function invoke(key, invocable, params) {
        // Create a deferred for this invocation. Failures will propagate to the resolution as well.
        var invocation = $q.defer(), waitParams = 0;
        function onfailure(reason) {
          invocation.reject(reason);
          fail(reason);
        }
        // Wait for any parameter that we have a promise for (either from parent or from this
        // resolve; in that case study() will have made sure it's ordered before us in the plan).
        forEach(params, function (dep) {
          if (promises.hasOwnProperty(dep) && !locals.hasOwnProperty(dep)) {
            waitParams++;
            promises[dep].then(function (result) {
              values[dep] = result;
              if (!(--waitParams)) proceed();
            }, onfailure);
          }
        });
        if (!waitParams) proceed();
        function proceed() {
          if (isDefined(result.$$failure)) return;
          try {
            invocation.resolve($injector.invoke(invocable, self, values));
            invocation.promise.then(function (result) {
              values[key] = result;
              done();
            }, onfailure);
          } catch (e) {
            onfailure(e);
          }
        }
        // Publish promise synchronously; invocations further down in the plan may depend on it.
        promises[key] = invocation.promise;
      }

      return result;
    };
  };

  /**
   * @ngdoc function
   * @name ui.router.util.$resolve#resolve
   * @methodOf ui.router.util.$resolve
   *
   * @description
   * Resolves a set of invocables. An invocable is a function to be invoked via
   * `$injector.invoke()`, and can have an arbitrary number of dependencies.
   * An invocable can either return a value directly,
   * or a `$q` promise. If a promise is returned it will be resolved and the
   * resulting value will be used instead. Dependencies of invocables are resolved
   * (in this order of precedence)
   *
   * - from the specified `locals`
   * - from another invocable that is part of this `$resolve` call
   * - from an invocable that is inherited from a `parent` call to `$resolve`
   *   (or recursively
   * - from any ancestor `$resolve` of that parent).
   *
   * The return value of `$resolve` is a promise for an object that contains
   * (in this order of precedence)
   *
   * - any `locals` (if specified)
   * - the resolved return values of all injectables
   * - any values inherited from a `parent` call to `$resolve` (if specified)
   *
   * The promise will resolve after the `parent` promise (if any) and all promises
   * returned by injectables have been resolved. If any invocable
   * (or `$injector.invoke`) throws an exception, or if a promise returned by an
   * invocable is rejected, the `$resolve` promise is immediately rejected with the
   * same error. A rejection of a `parent` promise (if specified) will likewise be
   * propagated immediately. Once the `$resolve` promise has been rejected, no
   * further invocables will be called.
   *
   * Cyclic dependencies between invocables are not permitted and will cause `$resolve`
   * to throw an error. As a special case, an injectable can depend on a parameter
   * with the same name as the injectable, which will be fulfilled from the `parent`
   * injectable of the same name. This allows inherited values to be decorated.
   * Note that in this case any other injectable in the same `$resolve` with the same
   * dependency would see the decorated value, not the inherited value.
   *
   * Note that missing dependencies -- unlike cyclic dependencies -- will cause an
   * (asynchronous) rejection of the `$resolve` promise rather than a (synchronous)
   * exception.
   *
   * Invocables are invoked eagerly as soon as all dependencies are available.
   * This is true even for dependencies inherited from a `parent` call to `$resolve`.
   *
   * As a special case, an invocable can be a string, in which case it is taken to
   * be a service name to be passed to `$injector.get()`. This is supported primarily
   * for backwards-compatibility with the `resolve` property of `$routeProvider`
   * routes.
   *
   * @param {object} invocables functions to invoke or
   * `$injector` services to fetch.
   * @param {object} locals  values to make available to the injectables
   * @param {object} parent  a promise returned by another call to `$resolve`.
   * @param {object} self  the `this` for the invoked methods
   * @return {object} Promise for an object that contains the resolved return value
   * of all invocables, as well as any inherited and local values.
   */
  this.resolve = function (invocables, locals, parent, self) {
    return this.study(invocables)(locals, parent, self);
  };
}

angular.module('ui.router.util').service('$resolve', $Resolve);


/**
 * @ngdoc object
 * @name ui.router.util.$templateFactory
 *
 * @requires $http
 * @requires $templateCache
 * @requires $injector
 *
 * @description
 * Service. Manages loading of templates.
 */
$TemplateFactory.$inject = ['$http', '$templateCache', '$injector'];
function $TemplateFactory(  $http,   $templateCache,   $injector) {

  /**
   * @ngdoc function
   * @name ui.router.util.$templateFactory#fromConfig
   * @methodOf ui.router.util.$templateFactory
   *
   * @description
   * Creates a template from a configuration object.
   *
   * @param {object} config Configuration object for which to load a template.
   * The following properties are search in the specified order, and the first one
   * that is defined is used to create the template:
   *
   * @param {string|object} config.template html string template or function to
   * load via {@link ui.router.util.$templateFactory#fromString fromString}.
   * @param {string|object} config.templateUrl url to load or a function returning
   * the url to load via {@link ui.router.util.$templateFactory#fromUrl fromUrl}.
   * @param {Function} config.templateProvider function to invoke via
   * {@link ui.router.util.$templateFactory#fromProvider fromProvider}.
   * @param {object} params  Parameters to pass to the template function.
   * @param {object} locals Locals to pass to `invoke` if the template is loaded
   * via a `templateProvider`. Defaults to `{ params: params }`.
   *
   * @return {string|object}  The template html as a string, or a promise for
   * that string,or `null` if no template is configured.
   */
  this.fromConfig = function (config, params, locals) {
    return (
      isDefined(config.template) ? this.fromString(config.template, params) :
      isDefined(config.templateUrl) ? this.fromUrl(config.templateUrl, params) :
      isDefined(config.templateProvider) ? this.fromProvider(config.templateProvider, params, locals) :
      null
    );
  };

  /**
   * @ngdoc function
   * @name ui.router.util.$templateFactory#fromString
   * @methodOf ui.router.util.$templateFactory
   *
   * @description
   * Creates a template from a string or a function returning a string.
   *
   * @param {string|object} template html template as a string or function that
   * returns an html template as a string.
   * @param {object} params Parameters to pass to the template function.
   *
   * @return {string|object} The template html as a string, or a promise for that
   * string.
   */
  this.fromString = function (template, params) {
    return isFunction(template) ? template(params) : template;
  };

  /**
   * @ngdoc function
   * @name ui.router.util.$templateFactory#fromUrl
   * @methodOf ui.router.util.$templateFactory
   *
   * @description
   * Loads a template from the a URL via `$http` and `$templateCache`.
   *
   * @param {string|Function} url url of the template to load, or a function
   * that returns a url.
   * @param {Object} params Parameters to pass to the url function.
   * @return {string|Promise.<string>} The template html as a string, or a promise
   * for that string.
   */
  this.fromUrl = function (url, params) {
    if (isFunction(url)) url = url(params);
    if (url == null) return null;
    else return $http
        .get(url, { cache: $templateCache, headers: { Accept: 'text/html' }})
        .then(function(response) { return response.data; });
  };

  /**
   * @ngdoc function
   * @name ui.router.util.$templateFactory#fromProvider
   * @methodOf ui.router.util.$templateFactory
   *
   * @description
   * Creates a template by invoking an injectable provider function.
   *
   * @param {Function} provider Function to invoke via `$injector.invoke`
   * @param {Object} params Parameters for the template.
   * @param {Object} locals Locals to pass to `invoke`. Defaults to
   * `{ params: params }`.
   * @return {string|Promise.<string>} The template html as a string, or a promise
   * for that string.
   */
  this.fromProvider = function (provider, params, locals) {
    return $injector.invoke(provider, null, locals || { params: params });
  };
}

angular.module('ui.router.util').service('$templateFactory', $TemplateFactory);

var $$UMFP; // reference to $UrlMatcherFactoryProvider

/**
 * @ngdoc object
 * @name ui.router.util.type:UrlMatcher
 *
 * @description
 * Matches URLs against patterns and extracts named parameters from the path or the search
 * part of the URL. A URL pattern consists of a path pattern, optionally followed by '?' and a list
 * of search parameters. Multiple search parameter names are separated by '&'. Search parameters
 * do not influence whether or not a URL is matched, but their values are passed through into
 * the matched parameters returned by {@link ui.router.util.type:UrlMatcher#methods_exec exec}.
 *
 * Path parameter placeholders can be specified using simple colon/catch-all syntax or curly brace
 * syntax, which optionally allows a regular expression for the parameter to be specified:
 *
 * * `':'` name - colon placeholder
 * * `'*'` name - catch-all placeholder
 * * `'{' name '}'` - curly placeholder
 * * `'{' name ':' regexp|type '}'` - curly placeholder with regexp or type name. Should the
 *   regexp itself contain curly braces, they must be in matched pairs or escaped with a backslash.
 *
 * Parameter names may contain only word characters (latin letters, digits, and underscore) and
 * must be unique within the pattern (across both path and search parameters). For colon
 * placeholders or curly placeholders without an explicit regexp, a path parameter matches any
 * number of characters other than '/'. For catch-all placeholders the path parameter matches
 * any number of characters.
 *
 * Examples:
 *
 * * `'/hello/'` - Matches only if the path is exactly '/hello/'. There is no special treatment for
 *   trailing slashes, and patterns have to match the entire path, not just a prefix.
 * * `'/user/:id'` - Matches '/user/bob' or '/user/1234!!!' or even '/user/' but not '/user' or
 *   '/user/bob/details'. The second path segment will be captured as the parameter 'id'.
 * * `'/user/{id}'` - Same as the previous example, but using curly brace syntax.
 * * `'/user/{id:[^/]*}'` - Same as the previous example.
 * * `'/user/{id:[0-9a-fA-F]{1,8}}'` - Similar to the previous example, but only matches if the id
 *   parameter consists of 1 to 8 hex digits.
 * * `'/files/{path:.*}'` - Matches any URL starting with '/files/' and captures the rest of the
 *   path into the parameter 'path'.
 * * `'/files/*path'` - ditto.
 * * `'/calendar/{start:date}'` - Matches "/calendar/2014-11-12" (because the pattern defined
 *   in the built-in  `date` Type matches `2014-11-12`) and provides a Date object in $stateParams.start
 *
 * @param {string} pattern  The pattern to compile into a matcher.
 * @param {Object} config  A configuration object hash:
 * @param {Object=} parentMatcher Used to concatenate the pattern/config onto
 *   an existing UrlMatcher
 *
 * * `caseInsensitive` - `true` if URL matching should be case insensitive, otherwise `false`, the default value (for backward compatibility) is `false`.
 * * `strict` - `false` if matching against a URL with a trailing slash should be treated as equivalent to a URL without a trailing slash, the default value is `true`.
 *
 * @property {string} prefix  A static prefix of this pattern. The matcher guarantees that any
 *   URL matching this matcher (i.e. any string for which {@link ui.router.util.type:UrlMatcher#methods_exec exec()} returns
 *   non-null) will start with this prefix.
 *
 * @property {string} source  The pattern that was passed into the constructor
 *
 * @property {string} sourcePath  The path portion of the source property
 *
 * @property {string} sourceSearch  The search portion of the source property
 *
 * @property {string} regex  The constructed regex that will be used to match against the url when
 *   it is time to determine which url will match.
 *
 * @returns {Object}  New `UrlMatcher` object
 */
function UrlMatcher(pattern, config, parentMatcher) {
  config = extend({ params: {} }, isObject(config) ? config : {});

  // Find all placeholders and create a compiled pattern, using either classic or curly syntax:
  //   '*' name
  //   ':' name
  //   '{' name '}'
  //   '{' name ':' regexp '}'
  // The regular expression is somewhat complicated due to the need to allow curly braces
  // inside the regular expression. The placeholder regexp breaks down as follows:
  //    ([:*])([\w\[\]]+)              - classic placeholder ($1 / $2) (search version has - for snake-case)
  //    \{([\w\[\]]+)(?:\:\s*( ... ))?\}  - curly brace placeholder ($3) with optional regexp/type ... ($4) (search version has - for snake-case
  //    (?: ... | ... | ... )+         - the regexp consists of any number of atoms, an atom being either
  //    [^{}\\]+                       - anything other than curly braces or backslash
  //    \\.                            - a backslash escape
  //    \{(?:[^{}\\]+|\\.)*\}          - a matched set of curly braces containing other atoms
  var placeholder       = /([:*])([\w\[\]]+)|\{([\w\[\]]+)(?:\:\s*((?:[^{}\\]+|\\.|\{(?:[^{}\\]+|\\.)*\})+))?\}/g,
      searchPlaceholder = /([:]?)([\w\[\].-]+)|\{([\w\[\].-]+)(?:\:\s*((?:[^{}\\]+|\\.|\{(?:[^{}\\]+|\\.)*\})+))?\}/g,
      compiled = '^', last = 0, m,
      segments = this.segments = [],
      parentParams = parentMatcher ? parentMatcher.params : {},
      params = this.params = parentMatcher ? parentMatcher.params.$$new() : new $$UMFP.ParamSet(),
      paramNames = [];

  function addParameter(id, type, config, location) {
    paramNames.push(id);
    if (parentParams[id]) return parentParams[id];
    if (!/^\w+([-.]+\w+)*(?:\[\])?$/.test(id)) throw new Error("Invalid parameter name '" + id + "' in pattern '" + pattern + "'");
    if (params[id]) throw new Error("Duplicate parameter name '" + id + "' in pattern '" + pattern + "'");
    params[id] = new $$UMFP.Param(id, type, config, location);
    return params[id];
  }

  function quoteRegExp(string, pattern, squash, optional) {
    var surroundPattern = ['',''], result = string.replace(/[\\\[\]\^$*+?.()|{}]/g, "\\$&");
    if (!pattern) return result;
    switch(squash) {
      case false: surroundPattern = ['(', ')' + (optional ? "?" : "")]; break;
      case true:
        result = result.replace(/\/$/, '');
        surroundPattern = ['(?:\/(', ')|\/)?'];
      break;
      default:    surroundPattern = ['(' + squash + "|", ')?']; break;
    }
    return result + surroundPattern[0] + pattern + surroundPattern[1];
  }

  this.source = pattern;

  // Split into static segments separated by path parameter placeholders.
  // The number of segments is always 1 more than the number of parameters.
  function matchDetails(m, isSearch) {
    var id, regexp, segment, type, cfg, arrayMode;
    id          = m[2] || m[3]; // IE[78] returns '' for unmatched groups instead of null
    cfg         = config.params[id];
    segment     = pattern.substring(last, m.index);
    regexp      = isSearch ? m[4] : m[4] || (m[1] == '*' ? '.*' : null);

    if (regexp) {
      type      = $$UMFP.type(regexp) || inherit($$UMFP.type("string"), { pattern: new RegExp(regexp, config.caseInsensitive ? 'i' : undefined) });
    }

    return {
      id: id, regexp: regexp, segment: segment, type: type, cfg: cfg
    };
  }

  var p, param, segment;
  while ((m = placeholder.exec(pattern))) {
    p = matchDetails(m, false);
    if (p.segment.indexOf('?') >= 0) break; // we're into the search part

    param = addParameter(p.id, p.type, p.cfg, "path");
    compiled += quoteRegExp(p.segment, param.type.pattern.source, param.squash, param.isOptional);
    segments.push(p.segment);
    last = placeholder.lastIndex;
  }
  segment = pattern.substring(last);

  // Find any search parameter names and remove them from the last segment
  var i = segment.indexOf('?');

  if (i >= 0) {
    var search = this.sourceSearch = segment.substring(i);
    segment = segment.substring(0, i);
    this.sourcePath = pattern.substring(0, last + i);

    if (search.length > 0) {
      last = 0;
      while ((m = searchPlaceholder.exec(search))) {
        p = matchDetails(m, true);
        param = addParameter(p.id, p.type, p.cfg, "search");
        last = placeholder.lastIndex;
        // check if ?&
      }
    }
  } else {
    this.sourcePath = pattern;
    this.sourceSearch = '';
  }

  compiled += quoteRegExp(segment) + (config.strict === false ? '\/?' : '') + '$';
  segments.push(segment);

  this.regexp = new RegExp(compiled, config.caseInsensitive ? 'i' : undefined);
  this.prefix = segments[0];
  this.$$paramNames = paramNames;
}

/**
 * @ngdoc function
 * @name ui.router.util.type:UrlMatcher#concat
 * @methodOf ui.router.util.type:UrlMatcher
 *
 * @description
 * Returns a new matcher for a pattern constructed by appending the path part and adding the
 * search parameters of the specified pattern to this pattern. The current pattern is not
 * modified. This can be understood as creating a pattern for URLs that are relative to (or
 * suffixes of) the current pattern.
 *
 * @example
 * The following two matchers are equivalent:
 * <pre>
 * new UrlMatcher('/user/{id}?q').concat('/details?date');
 * new UrlMatcher('/user/{id}/details?q&date');
 * </pre>
 *
 * @param {string} pattern  The pattern to append.
 * @param {Object} config  An object hash of the configuration for the matcher.
 * @returns {UrlMatcher}  A matcher for the concatenated pattern.
 */
UrlMatcher.prototype.concat = function (pattern, config) {
  // Because order of search parameters is irrelevant, we can add our own search
  // parameters to the end of the new pattern. Parse the new pattern by itself
  // and then join the bits together, but it's much easier to do this on a string level.
  var defaultConfig = {
    caseInsensitive: $$UMFP.caseInsensitive(),
    strict: $$UMFP.strictMode(),
    squash: $$UMFP.defaultSquashPolicy()
  };
  return new UrlMatcher(this.sourcePath + pattern + this.sourceSearch, extend(defaultConfig, config), this);
};

UrlMatcher.prototype.toString = function () {
  return this.source;
};

/**
 * @ngdoc function
 * @name ui.router.util.type:UrlMatcher#exec
 * @methodOf ui.router.util.type:UrlMatcher
 *
 * @description
 * Tests the specified path against this matcher, and returns an object containing the captured
 * parameter values, or null if the path does not match. The returned object contains the values
 * of any search parameters that are mentioned in the pattern, but their value may be null if
 * they are not present in `searchParams`. This means that search parameters are always treated
 * as optional.
 *
 * @example
 * <pre>
 * new UrlMatcher('/user/{id}?q&r').exec('/user/bob', {
 *   x: '1', q: 'hello'
 * });
 * // returns { id: 'bob', q: 'hello', r: null }
 * </pre>
 *
 * @param {string} path  The URL path to match, e.g. `$location.path()`.
 * @param {Object} searchParams  URL search parameters, e.g. `$location.search()`.
 * @returns {Object}  The captured parameter values.
 */
UrlMatcher.prototype.exec = function (path, searchParams) {
  var m = this.regexp.exec(path);
  if (!m) return null;
  searchParams = searchParams || {};

  var paramNames = this.parameters(), nTotal = paramNames.length,
    nPath = this.segments.length - 1,
    values = {}, i, j, cfg, paramName;

  if (nPath !== m.length - 1) throw new Error("Unbalanced capture group in route '" + this.source + "'");

  function decodePathArray(string) {
    function reverseString(str) { return str.split("").reverse().join(""); }
    function unquoteDashes(str) { return str.replace(/\\-/g, "-"); }

    var split = reverseString(string).split(/-(?!\\)/);
    var allReversed = map(split, reverseString);
    return map(allReversed, unquoteDashes).reverse();
  }

  var param, paramVal;
  for (i = 0; i < nPath; i++) {
    paramName = paramNames[i];
    param = this.params[paramName];
    paramVal = m[i+1];
    // if the param value matches a pre-replace pair, replace the value before decoding.
    for (j = 0; j < param.replace.length; j++) {
      if (param.replace[j].from === paramVal) paramVal = param.replace[j].to;
    }
    if (paramVal && param.array === true) paramVal = decodePathArray(paramVal);
    if (isDefined(paramVal)) paramVal = param.type.decode(paramVal);
    values[paramName] = param.value(paramVal);
  }
  for (/**/; i < nTotal; i++) {
    paramName = paramNames[i];
    values[paramName] = this.params[paramName].value(searchParams[paramName]);
    param = this.params[paramName];
    paramVal = searchParams[paramName];
    for (j = 0; j < param.replace.length; j++) {
      if (param.replace[j].from === paramVal) paramVal = param.replace[j].to;
    }
    if (isDefined(paramVal)) paramVal = param.type.decode(paramVal);
    values[paramName] = param.value(paramVal);
  }

  return values;
};

/**
 * @ngdoc function
 * @name ui.router.util.type:UrlMatcher#parameters
 * @methodOf ui.router.util.type:UrlMatcher
 *
 * @description
 * Returns the names of all path and search parameters of this pattern in an unspecified order.
 *
 * @returns {Array.<string>}  An array of parameter names. Must be treated as read-only. If the
 *    pattern has no parameters, an empty array is returned.
 */
UrlMatcher.prototype.parameters = function (param) {
  if (!isDefined(param)) return this.$$paramNames;
  return this.params[param] || null;
};

/**
 * @ngdoc function
 * @name ui.router.util.type:UrlMatcher#validates
 * @methodOf ui.router.util.type:UrlMatcher
 *
 * @description
 * Checks an object hash of parameters to validate their correctness according to the parameter
 * types of this `UrlMatcher`.
 *
 * @param {Object} params The object hash of parameters to validate.
 * @returns {boolean} Returns `true` if `params` validates, otherwise `false`.
 */
UrlMatcher.prototype.validates = function (params) {
  return this.params.$$validates(params);
};

/**
 * @ngdoc function
 * @name ui.router.util.type:UrlMatcher#format
 * @methodOf ui.router.util.type:UrlMatcher
 *
 * @description
 * Creates a URL that matches this pattern by substituting the specified values
 * for the path and search parameters. Null values for path parameters are
 * treated as empty strings.
 *
 * @example
 * <pre>
 * new UrlMatcher('/user/{id}?q').format({ id:'bob', q:'yes' });
 * // returns '/user/bob?q=yes'
 * </pre>
 *
 * @param {Object} values  the values to substitute for the parameters in this pattern.
 * @returns {string}  the formatted URL (path and optionally search part).
 */
UrlMatcher.prototype.format = function (values) {
  values = values || {};
  var segments = this.segments, params = this.parameters(), paramset = this.params;
  if (!this.validates(values)) return null;

  var i, search = false, nPath = segments.length - 1, nTotal = params.length, result = segments[0];

  function encodeDashes(str) { // Replace dashes with encoded "\-"
    return encodeURIComponent(str).replace(/-/g, function(c) { return '%5C%' + c.charCodeAt(0).toString(16).toUpperCase(); });
  }

  for (i = 0; i < nTotal; i++) {
    var isPathParam = i < nPath;
    var name = params[i], param = paramset[name], value = param.value(values[name]);
    var isDefaultValue = param.isOptional && param.type.equals(param.value(), value);
    var squash = isDefaultValue ? param.squash : false;
    var encoded = param.type.encode(value);

    if (isPathParam) {
      var nextSegment = segments[i + 1];
      var isFinalPathParam = i + 1 === nPath;

      if (squash === false) {
        if (encoded != null) {
          if (isArray(encoded)) {
            result += map(encoded, encodeDashes).join("-");
          } else {
            result += encodeURIComponent(encoded);
          }
        }
        result += nextSegment;
      } else if (squash === true) {
        var capture = result.match(/\/$/) ? /\/?(.*)/ : /(.*)/;
        result += nextSegment.match(capture)[1];
      } else if (isString(squash)) {
        result += squash + nextSegment;
      }

      if (isFinalPathParam && param.squash === true && result.slice(-1) === '/') result = result.slice(0, -1);
    } else {
      if (encoded == null || (isDefaultValue && squash !== false)) continue;
      if (!isArray(encoded)) encoded = [ encoded ];
      if (encoded.length === 0) continue;
      encoded = map(encoded, encodeURIComponent).join('&' + name + '=');
      result += (search ? '&' : '?') + (name + '=' + encoded);
      search = true;
    }
  }

  return result;
};

/**
 * @ngdoc object
 * @name ui.router.util.type:Type
 *
 * @description
 * Implements an interface to define custom parameter types that can be decoded from and encoded to
 * string parameters matched in a URL. Used by {@link ui.router.util.type:UrlMatcher `UrlMatcher`}
 * objects when matching or formatting URLs, or comparing or validating parameter values.
 *
 * See {@link ui.router.util.$urlMatcherFactory#methods_type `$urlMatcherFactory#type()`} for more
 * information on registering custom types.
 *
 * @param {Object} config  A configuration object which contains the custom type definition.  The object's
 *        properties will override the default methods and/or pattern in `Type`'s public interface.
 * @example
 * <pre>
 * {
 *   decode: function(val) { return parseInt(val, 10); },
 *   encode: function(val) { return val && val.toString(); },
 *   equals: function(a, b) { return this.is(a) && a === b; },
 *   is: function(val) { return angular.isNumber(val) isFinite(val) && val % 1 === 0; },
 *   pattern: /\d+/
 * }
 * </pre>
 *
 * @property {RegExp} pattern The regular expression pattern used to match values of this type when
 *           coming from a substring of a URL.
 *
 * @returns {Object}  Returns a new `Type` object.
 */
function Type(config) {
  extend(this, config);
}

/**
 * @ngdoc function
 * @name ui.router.util.type:Type#is
 * @methodOf ui.router.util.type:Type
 *
 * @description
 * Detects whether a value is of a particular type. Accepts a native (decoded) value
 * and determines whether it matches the current `Type` object.
 *
 * @param {*} val  The value to check.
 * @param {string} key  Optional. If the type check is happening in the context of a specific
 *        {@link ui.router.util.type:UrlMatcher `UrlMatcher`} object, this is the name of the
 *        parameter in which `val` is stored. Can be used for meta-programming of `Type` objects.
 * @returns {Boolean}  Returns `true` if the value matches the type, otherwise `false`.
 */
Type.prototype.is = function(val, key) {
  return true;
};

/**
 * @ngdoc function
 * @name ui.router.util.type:Type#encode
 * @methodOf ui.router.util.type:Type
 *
 * @description
 * Encodes a custom/native type value to a string that can be embedded in a URL. Note that the
 * return value does *not* need to be URL-safe (i.e. passed through `encodeURIComponent()`), it
 * only needs to be a representation of `val` that has been coerced to a string.
 *
 * @param {*} val  The value to encode.
 * @param {string} key  The name of the parameter in which `val` is stored. Can be used for
 *        meta-programming of `Type` objects.
 * @returns {string}  Returns a string representation of `val` that can be encoded in a URL.
 */
Type.prototype.encode = function(val, key) {
  return val;
};

/**
 * @ngdoc function
 * @name ui.router.util.type:Type#decode
 * @methodOf ui.router.util.type:Type
 *
 * @description
 * Converts a parameter value (from URL string or transition param) to a custom/native value.
 *
 * @param {string} val  The URL parameter value to decode.
 * @param {string} key  The name of the parameter in which `val` is stored. Can be used for
 *        meta-programming of `Type` objects.
 * @returns {*}  Returns a custom representation of the URL parameter value.
 */
Type.prototype.decode = function(val, key) {
  return val;
};

/**
 * @ngdoc function
 * @name ui.router.util.type:Type#equals
 * @methodOf ui.router.util.type:Type
 *
 * @description
 * Determines whether two decoded values are equivalent.
 *
 * @param {*} a  A value to compare against.
 * @param {*} b  A value to compare against.
 * @returns {Boolean}  Returns `true` if the values are equivalent/equal, otherwise `false`.
 */
Type.prototype.equals = function(a, b) {
  return a == b;
};

Type.prototype.$subPattern = function() {
  var sub = this.pattern.toString();
  return sub.substr(1, sub.length - 2);
};

Type.prototype.pattern = /.*/;

Type.prototype.toString = function() { return "{Type:" + this.name + "}"; };

/** Given an encoded string, or a decoded object, returns a decoded object */
Type.prototype.$normalize = function(val) {
  return this.is(val) ? val : this.decode(val);
};

/*
 * Wraps an existing custom Type as an array of Type, depending on 'mode'.
 * e.g.:
 * - urlmatcher pattern "/path?{queryParam[]:int}"
 * - url: "/path?queryParam=1&queryParam=2
 * - $stateParams.queryParam will be [1, 2]
 * if `mode` is "auto", then
 * - url: "/path?queryParam=1 will create $stateParams.queryParam: 1
 * - url: "/path?queryParam=1&queryParam=2 will create $stateParams.queryParam: [1, 2]
 */
Type.prototype.$asArray = function(mode, isSearch) {
  if (!mode) return this;
  if (mode === "auto" && !isSearch) throw new Error("'auto' array mode is for query parameters only");

  function ArrayType(type, mode) {
    function bindTo(type, callbackName) {
      return function() {
        return type[callbackName].apply(type, arguments);
      };
    }

    // Wrap non-array value as array
    function arrayWrap(val) { return isArray(val) ? val : (isDefined(val) ? [ val ] : []); }
    // Unwrap array value for "auto" mode. Return undefined for empty array.
    function arrayUnwrap(val) {
      switch(val.length) {
        case 0: return undefined;
        case 1: return mode === "auto" ? val[0] : val;
        default: return val;
      }
    }
    function falsey(val) { return !val; }

    // Wraps type (.is/.encode/.decode) functions to operate on each value of an array
    function arrayHandler(callback, allTruthyMode) {
      return function handleArray(val) {
        if (isArray(val) && val.length === 0) return val;
        val = arrayWrap(val);
        var result = map(val, callback);
        if (allTruthyMode === true)
          return filter(result, falsey).length === 0;
        return arrayUnwrap(result);
      };
    }

    // Wraps type (.equals) functions to operate on each value of an array
    function arrayEqualsHandler(callback) {
      return function handleArray(val1, val2) {
        var left = arrayWrap(val1), right = arrayWrap(val2);
        if (left.length !== right.length) return false;
        for (var i = 0; i < left.length; i++) {
          if (!callback(left[i], right[i])) return false;
        }
        return true;
      };
    }

    this.encode = arrayHandler(bindTo(type, 'encode'));
    this.decode = arrayHandler(bindTo(type, 'decode'));
    this.is     = arrayHandler(bindTo(type, 'is'), true);
    this.equals = arrayEqualsHandler(bindTo(type, 'equals'));
    this.pattern = type.pattern;
    this.$normalize = arrayHandler(bindTo(type, '$normalize'));
    this.name = type.name;
    this.$arrayMode = mode;
  }

  return new ArrayType(this, mode);
};



/**
 * @ngdoc object
 * @name ui.router.util.$urlMatcherFactory
 *
 * @description
 * Factory for {@link ui.router.util.type:UrlMatcher `UrlMatcher`} instances. The factory
 * is also available to providers under the name `$urlMatcherFactoryProvider`.
 */
function $UrlMatcherFactory() {
  $$UMFP = this;

  var isCaseInsensitive = false, isStrictMode = true, defaultSquashPolicy = false;

  // Use tildes to pre-encode slashes.
  // If the slashes are simply URLEncoded, the browser can choose to pre-decode them,
  // and bidirectional encoding/decoding fails.
  // Tilde was chosen because it's not a RFC 3986 section 2.2 Reserved Character
  function valToString(val) { return val != null ? val.toString().replace(/~/g, "~~").replace(/\//g, "~2F") : val; }
  function valFromString(val) { return val != null ? val.toString().replace(/~2F/g, "/").replace(/~~/g, "~") : val; }

  var $types = {}, enqueue = true, typeQueue = [], injector, defaultTypes = {
    "string": {
      encode: valToString,
      decode: valFromString,
      // TODO: in 1.0, make string .is() return false if value is undefined/null by default.
      // In 0.2.x, string params are optional by default for backwards compat
      is: function(val) { return val == null || !isDefined(val) || typeof val === "string"; },
      pattern: /[^/]*/
    },
    "int": {
      encode: valToString,
      decode: function(val) { return parseInt(val, 10); },
      is: function(val) { return isDefined(val) && this.decode(val.toString()) === val; },
      pattern: /\d+/
    },
    "bool": {
      encode: function(val) { return val ? 1 : 0; },
      decode: function(val) { return parseInt(val, 10) !== 0; },
      is: function(val) { return val === true || val === false; },
      pattern: /0|1/
    },
    "date": {
      encode: function (val) {
        if (!this.is(val))
          return undefined;
        return [ val.getFullYear(),
          ('0' + (val.getMonth() + 1)).slice(-2),
          ('0' + val.getDate()).slice(-2)
        ].join("-");
      },
      decode: function (val) {
        if (this.is(val)) return val;
        var match = this.capture.exec(val);
        return match ? new Date(match[1], match[2] - 1, match[3]) : undefined;
      },
      is: function(val) { return val instanceof Date && !isNaN(val.valueOf()); },
      equals: function (a, b) { return this.is(a) && this.is(b) && a.toISOString() === b.toISOString(); },
      pattern: /[0-9]{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[1-2][0-9]|3[0-1])/,
      capture: /([0-9]{4})-(0[1-9]|1[0-2])-(0[1-9]|[1-2][0-9]|3[0-1])/
    },
    "json": {
      encode: angular.toJson,
      decode: angular.fromJson,
      is: angular.isObject,
      equals: angular.equals,
      pattern: /[^/]*/
    },
    "any": { // does not encode/decode
      encode: angular.identity,
      decode: angular.identity,
      equals: angular.equals,
      pattern: /.*/
    }
  };

  function getDefaultConfig() {
    return {
      strict: isStrictMode,
      caseInsensitive: isCaseInsensitive
    };
  }

  function isInjectable(value) {
    return (isFunction(value) || (isArray(value) && isFunction(value[value.length - 1])));
  }

  /**
   * [Internal] Get the default value of a parameter, which may be an injectable function.
   */
  $UrlMatcherFactory.$$getDefaultValue = function(config) {
    if (!isInjectable(config.value)) return config.value;
    if (!injector) throw new Error("Injectable functions cannot be called at configuration time");
    return injector.invoke(config.value);
  };

  /**
   * @ngdoc function
   * @name ui.router.util.$urlMatcherFactory#caseInsensitive
   * @methodOf ui.router.util.$urlMatcherFactory
   *
   * @description
   * Defines whether URL matching should be case sensitive (the default behavior), or not.
   *
   * @param {boolean} value `false` to match URL in a case sensitive manner; otherwise `true`;
   * @returns {boolean} the current value of caseInsensitive
   */
  this.caseInsensitive = function(value) {
    if (isDefined(value))
      isCaseInsensitive = value;
    return isCaseInsensitive;
  };

  /**
   * @ngdoc function
   * @name ui.router.util.$urlMatcherFactory#strictMode
   * @methodOf ui.router.util.$urlMatcherFactory
   *
   * @description
   * Defines whether URLs should match trailing slashes, or not (the default behavior).
   *
   * @param {boolean=} value `false` to match trailing slashes in URLs, otherwise `true`.
   * @returns {boolean} the current value of strictMode
   */
  this.strictMode = function(value) {
    if (isDefined(value))
      isStrictMode = value;
    return isStrictMode;
  };

  /**
   * @ngdoc function
   * @name ui.router.util.$urlMatcherFactory#defaultSquashPolicy
   * @methodOf ui.router.util.$urlMatcherFactory
   *
   * @description
   * Sets the default behavior when generating or matching URLs with default parameter values.
   *
   * @param {string} value A string that defines the default parameter URL squashing behavior.
   *    `nosquash`: When generating an href with a default parameter value, do not squash the parameter value from the URL
   *    `slash`: When generating an href with a default parameter value, squash (remove) the parameter value, and, if the
   *             parameter is surrounded by slashes, squash (remove) one slash from the URL
   *    any other string, e.g. "~": When generating an href with a default parameter value, squash (remove)
   *             the parameter value from the URL and replace it with this string.
   */
  this.defaultSquashPolicy = function(value) {
    if (!isDefined(value)) return defaultSquashPolicy;
    if (value !== true && value !== false && !isString(value))
      throw new Error("Invalid squash policy: " + value + ". Valid policies: false, true, arbitrary-string");
    defaultSquashPolicy = value;
    return value;
  };

  /**
   * @ngdoc function
   * @name ui.router.util.$urlMatcherFactory#compile
   * @methodOf ui.router.util.$urlMatcherFactory
   *
   * @description
   * Creates a {@link ui.router.util.type:UrlMatcher `UrlMatcher`} for the specified pattern.
   *
   * @param {string} pattern  The URL pattern.
   * @param {Object} config  The config object hash.
   * @returns {UrlMatcher}  The UrlMatcher.
   */
  this.compile = function (pattern, config) {
    return new UrlMatcher(pattern, extend(getDefaultConfig(), config));
  };

  /**
   * @ngdoc function
   * @name ui.router.util.$urlMatcherFactory#isMatcher
   * @methodOf ui.router.util.$urlMatcherFactory
   *
   * @description
   * Returns true if the specified object is a `UrlMatcher`, or false otherwise.
   *
   * @param {Object} object  The object to perform the type check against.
   * @returns {Boolean}  Returns `true` if the object matches the `UrlMatcher` interface, by
   *          implementing all the same methods.
   */
  this.isMatcher = function (o) {
    if (!isObject(o)) return false;
    var result = true;

    forEach(UrlMatcher.prototype, function(val, name) {
      if (isFunction(val)) {
        result = result && (isDefined(o[name]) && isFunction(o[name]));
      }
    });
    return result;
  };

  /**
   * @ngdoc function
   * @name ui.router.util.$urlMatcherFactory#type
   * @methodOf ui.router.util.$urlMatcherFactory
   *
   * @description
   * Registers a custom {@link ui.router.util.type:Type `Type`} object that can be used to
   * generate URLs with typed parameters.
   *
   * @param {string} name  The type name.
   * @param {Object|Function} definition   The type definition. See
   *        {@link ui.router.util.type:Type `Type`} for information on the values accepted.
   * @param {Object|Function} definitionFn (optional) A function that is injected before the app
   *        runtime starts.  The result of this function is merged into the existing `definition`.
   *        See {@link ui.router.util.type:Type `Type`} for information on the values accepted.
   *
   * @returns {Object}  Returns `$urlMatcherFactoryProvider`.
   *
   * @example
   * This is a simple example of a custom type that encodes and decodes items from an
   * array, using the array index as the URL-encoded value:
   *
   * <pre>
   * var list = ['John', 'Paul', 'George', 'Ringo'];
   *
   * $urlMatcherFactoryProvider.type('listItem', {
   *   encode: function(item) {
   *     // Represent the list item in the URL using its corresponding index
   *     return list.indexOf(item);
   *   },
   *   decode: function(item) {
   *     // Look up the list item by index
   *     return list[parseInt(item, 10)];
   *   },
   *   is: function(item) {
   *     // Ensure the item is valid by checking to see that it appears
   *     // in the list
   *     return list.indexOf(item) > -1;
   *   }
   * });
   *
   * $stateProvider.state('list', {
   *   url: "/list/{item:listItem}",
   *   controller: function($scope, $stateParams) {
   *     console.log($stateParams.item);
   *   }
   * });
   *
   * // ...
   *
   * // Changes URL to '/list/3', logs "Ringo" to the console
   * $state.go('list', { item: "Ringo" });
   * </pre>
   *
   * This is a more complex example of a type that relies on dependency injection to
   * interact with services, and uses the parameter name from the URL to infer how to
   * handle encoding and decoding parameter values:
   *
   * <pre>
   * // Defines a custom type that gets a value from a service,
   * // where each service gets different types of values from
   * // a backend API:
   * $urlMatcherFactoryProvider.type('dbObject', {}, function(Users, Posts) {
   *
   *   // Matches up services to URL parameter names
   *   var services = {
   *     user: Users,
   *     post: Posts
   *   };
   *
   *   return {
   *     encode: function(object) {
   *       // Represent the object in the URL using its unique ID
   *       return object.id;
   *     },
   *     decode: function(value, key) {
   *       // Look up the object by ID, using the parameter
   *       // name (key) to call the correct service
   *       return services[key].findById(value);
   *     },
   *     is: function(object, key) {
   *       // Check that object is a valid dbObject
   *       return angular.isObject(object) && object.id && services[key];
   *     }
   *     equals: function(a, b) {
   *       // Check the equality of decoded objects by comparing
   *       // their unique IDs
   *       return a.id === b.id;
   *     }
   *   };
   * });
   *
   * // In a config() block, you can then attach URLs with
   * // type-annotated parameters:
   * $stateProvider.state('users', {
   *   url: "/users",
   *   // ...
   * }).state('users.item', {
   *   url: "/{user:dbObject}",
   *   controller: function($scope, $stateParams) {
   *     // $stateParams.user will now be an object returned from
   *     // the Users service
   *   },
   *   // ...
   * });
   * </pre>
   */
  this.type = function (name, definition, definitionFn) {
    if (!isDefined(definition)) return $types[name];
    if ($types.hasOwnProperty(name)) throw new Error("A type named '" + name + "' has already been defined.");

    $types[name] = new Type(extend({ name: name }, definition));
    if (definitionFn) {
      typeQueue.push({ name: name, def: definitionFn });
      if (!enqueue) flushTypeQueue();
    }
    return this;
  };

  // `flushTypeQueue()` waits until `$urlMatcherFactory` is injected before invoking the queued `definitionFn`s
  function flushTypeQueue() {
    while(typeQueue.length) {
      var type = typeQueue.shift();
      if (type.pattern) throw new Error("You cannot override a type's .pattern at runtime.");
      angular.extend($types[type.name], injector.invoke(type.def));
    }
  }

  // Register default types. Store them in the prototype of $types.
  forEach(defaultTypes, function(type, name) { $types[name] = new Type(extend({name: name}, type)); });
  $types = inherit($types, {});

  /* No need to document $get, since it returns this */
  this.$get = ['$injector', function ($injector) {
    injector = $injector;
    enqueue = false;
    flushTypeQueue();

    forEach(defaultTypes, function(type, name) {
      if (!$types[name]) $types[name] = new Type(type);
    });
    return this;
  }];

  this.Param = function Param(id, type, config, location) {
    var self = this;
    config = unwrapShorthand(config);
    type = getType(config, type, location);
    var arrayMode = getArrayMode();
    type = arrayMode ? type.$asArray(arrayMode, location === "search") : type;
    if (type.name === "string" && !arrayMode && location === "path" && config.value === undefined)
      config.value = ""; // for 0.2.x; in 0.3.0+ do not automatically default to ""
    var isOptional = config.value !== undefined;
    var squash = getSquashPolicy(config, isOptional);
    var replace = getReplace(config, arrayMode, isOptional, squash);

    function unwrapShorthand(config) {
      var keys = isObject(config) ? objectKeys(config) : [];
      var isShorthand = indexOf(keys, "value") === -1 && indexOf(keys, "type") === -1 &&
                        indexOf(keys, "squash") === -1 && indexOf(keys, "array") === -1;
      if (isShorthand) config = { value: config };
      config.$$fn = isInjectable(config.value) ? config.value : function () { return config.value; };
      return config;
    }

    function getType(config, urlType, location) {
      if (config.type && urlType) throw new Error("Param '"+id+"' has two type configurations.");
      if (urlType) return urlType;
      if (!config.type) return (location === "config" ? $types.any : $types.string);

      if (angular.isString(config.type))
        return $types[config.type];
      if (config.type instanceof Type)
        return config.type;
      return new Type(config.type);
    }

    // array config: param name (param[]) overrides default settings.  explicit config overrides param name.
    function getArrayMode() {
      var arrayDefaults = { array: (location === "search" ? "auto" : false) };
      var arrayParamNomenclature = id.match(/\[\]$/) ? { array: true } : {};
      return extend(arrayDefaults, arrayParamNomenclature, config).array;
    }

    /**
     * returns false, true, or the squash value to indicate the "default parameter url squash policy".
     */
    function getSquashPolicy(config, isOptional) {
      var squash = config.squash;
      if (!isOptional || squash === false) return false;
      if (!isDefined(squash) || squash == null) return defaultSquashPolicy;
      if (squash === true || isString(squash)) return squash;
      throw new Error("Invalid squash policy: '" + squash + "'. Valid policies: false, true, or arbitrary string");
    }

    function getReplace(config, arrayMode, isOptional, squash) {
      var replace, configuredKeys, defaultPolicy = [
        { from: "",   to: (isOptional || arrayMode ? undefined : "") },
        { from: null, to: (isOptional || arrayMode ? undefined : "") }
      ];
      replace = isArray(config.replace) ? config.replace : [];
      if (isString(squash))
        replace.push({ from: squash, to: undefined });
      configuredKeys = map(replace, function(item) { return item.from; } );
      return filter(defaultPolicy, function(item) { return indexOf(configuredKeys, item.from) === -1; }).concat(replace);
    }

    /**
     * [Internal] Get the default value of a parameter, which may be an injectable function.
     */
    function $$getDefaultValue() {
      if (!injector) throw new Error("Injectable functions cannot be called at configuration time");
      var defaultValue = injector.invoke(config.$$fn);
      if (defaultValue !== null && defaultValue !== undefined && !self.type.is(defaultValue))
        throw new Error("Default value (" + defaultValue + ") for parameter '" + self.id + "' is not an instance of Type (" + self.type.name + ")");
      return defaultValue;
    }

    /**
     * [Internal] Gets the decoded representation of a value if the value is defined, otherwise, returns the
     * default value, which may be the result of an injectable function.
     */
    function $value(value) {
      function hasReplaceVal(val) { return function(obj) { return obj.from === val; }; }
      function $replace(value) {
        var replacement = map(filter(self.replace, hasReplaceVal(value)), function(obj) { return obj.to; });
        return replacement.length ? replacement[0] : value;
      }
      value = $replace(value);
      return !isDefined(value) ? $$getDefaultValue() : self.type.$normalize(value);
    }

    function toString() { return "{Param:" + id + " " + type + " squash: '" + squash + "' optional: " + isOptional + "}"; }

    extend(this, {
      id: id,
      type: type,
      location: location,
      array: arrayMode,
      squash: squash,
      replace: replace,
      isOptional: isOptional,
      value: $value,
      dynamic: undefined,
      config: config,
      toString: toString
    });
  };

  function ParamSet(params) {
    extend(this, params || {});
  }

  ParamSet.prototype = {
    $$new: function() {
      return inherit(this, extend(new ParamSet(), { $$parent: this}));
    },
    $$keys: function () {
      var keys = [], chain = [], parent = this,
        ignore = objectKeys(ParamSet.prototype);
      while (parent) { chain.push(parent); parent = parent.$$parent; }
      chain.reverse();
      forEach(chain, function(paramset) {
        forEach(objectKeys(paramset), function(key) {
            if (indexOf(keys, key) === -1 && indexOf(ignore, key) === -1) keys.push(key);
        });
      });
      return keys;
    },
    $$values: function(paramValues) {
      var values = {}, self = this;
      forEach(self.$$keys(), function(key) {
        values[key] = self[key].value(paramValues && paramValues[key]);
      });
      return values;
    },
    $$equals: function(paramValues1, paramValues2) {
      var equal = true, self = this;
      forEach(self.$$keys(), function(key) {
        var left = paramValues1 && paramValues1[key], right = paramValues2 && paramValues2[key];
        if (!self[key].type.equals(left, right)) equal = false;
      });
      return equal;
    },
    $$validates: function $$validate(paramValues) {
      var keys = this.$$keys(), i, param, rawVal, normalized, encoded;
      for (i = 0; i < keys.length; i++) {
        param = this[keys[i]];
        rawVal = paramValues[keys[i]];
        if ((rawVal === undefined || rawVal === null) && param.isOptional)
          break; // There was no parameter value, but the param is optional
        normalized = param.type.$normalize(rawVal);
        if (!param.type.is(normalized))
          return false; // The value was not of the correct Type, and could not be decoded to the correct Type
        encoded = param.type.encode(normalized);
        if (angular.isString(encoded) && !param.type.pattern.exec(encoded))
          return false; // The value was of the correct type, but when encoded, did not match the Type's regexp
      }
      return true;
    },
    $$parent: undefined
  };

  this.ParamSet = ParamSet;
}

// Register as a provider so it's available to other providers
angular.module('ui.router.util').provider('$urlMatcherFactory', $UrlMatcherFactory);
angular.module('ui.router.util').run(['$urlMatcherFactory', function($urlMatcherFactory) { }]);

/**
 * @ngdoc object
 * @name ui.router.router.$urlRouterProvider
 *
 * @requires ui.router.util.$urlMatcherFactoryProvider
 * @requires $locationProvider
 *
 * @description
 * `$urlRouterProvider` has the responsibility of watching `$location`.
 * When `$location` changes it runs through a list of rules one by one until a
 * match is found. `$urlRouterProvider` is used behind the scenes anytime you specify
 * a url in a state configuration. All urls are compiled into a UrlMatcher object.
 *
 * There are several methods on `$urlRouterProvider` that make it useful to use directly
 * in your module config.
 */
$UrlRouterProvider.$inject = ['$locationProvider', '$urlMatcherFactoryProvider'];
function $UrlRouterProvider(   $locationProvider,   $urlMatcherFactory) {
  var rules = [], otherwise = null, interceptDeferred = false, listener;

  // Returns a string that is a prefix of all strings matching the RegExp
  function regExpPrefix(re) {
    var prefix = /^\^((?:\\[^a-zA-Z0-9]|[^\\\[\]\^$*+?.()|{}]+)*)/.exec(re.source);
    return (prefix != null) ? prefix[1].replace(/\\(.)/g, "$1") : '';
  }

  // Interpolates matched values into a String.replace()-style pattern
  function interpolate(pattern, match) {
    return pattern.replace(/\$(\$|\d{1,2})/, function (m, what) {
      return match[what === '$' ? 0 : Number(what)];
    });
  }

  /**
   * @ngdoc function
   * @name ui.router.router.$urlRouterProvider#rule
   * @methodOf ui.router.router.$urlRouterProvider
   *
   * @description
   * Defines rules that are used by `$urlRouterProvider` to find matches for
   * specific URLs.
   *
   * @example
   * <pre>
   * var app = angular.module('app', ['ui.router.router']);
   *
   * app.config(function ($urlRouterProvider) {
   *   // Here's an example of how you might allow case insensitive urls
   *   $urlRouterProvider.rule(function ($injector, $location) {
   *     var path = $location.path(),
   *         normalized = path.toLowerCase();
   *
   *     if (path !== normalized) {
   *       return normalized;
   *     }
   *   });
   * });
   * </pre>
   *
   * @param {function} rule Handler function that takes `$injector` and `$location`
   * services as arguments. You can use them to return a valid path as a string.
   *
   * @return {object} `$urlRouterProvider` - `$urlRouterProvider` instance
   */
  this.rule = function (rule) {
    if (!isFunction(rule)) throw new Error("'rule' must be a function");
    rules.push(rule);
    return this;
  };

  /**
   * @ngdoc object
   * @name ui.router.router.$urlRouterProvider#otherwise
   * @methodOf ui.router.router.$urlRouterProvider
   *
   * @description
   * Defines a path that is used when an invalid route is requested.
   *
   * @example
   * <pre>
   * var app = angular.module('app', ['ui.router.router']);
   *
   * app.config(function ($urlRouterProvider) {
   *   // if the path doesn't match any of the urls you configured
   *   // otherwise will take care of routing the user to the
   *   // specified url
   *   $urlRouterProvider.otherwise('/index');
   *
   *   // Example of using function rule as param
   *   $urlRouterProvider.otherwise(function ($injector, $location) {
   *     return '/a/valid/url';
   *   });
   * });
   * </pre>
   *
   * @param {string|function} rule The url path you want to redirect to or a function
   * rule that returns the url path. The function version is passed two params:
   * `$injector` and `$location` services, and must return a url string.
   *
   * @return {object} `$urlRouterProvider` - `$urlRouterProvider` instance
   */
  this.otherwise = function (rule) {
    if (isString(rule)) {
      var redirect = rule;
      rule = function () { return redirect; };
    }
    else if (!isFunction(rule)) throw new Error("'rule' must be a function");
    otherwise = rule;
    return this;
  };


  function handleIfMatch($injector, handler, match) {
    if (!match) return false;
    var result = $injector.invoke(handler, handler, { $match: match });
    return isDefined(result) ? result : true;
  }

  /**
   * @ngdoc function
   * @name ui.router.router.$urlRouterProvider#when
   * @methodOf ui.router.router.$urlRouterProvider
   *
   * @description
   * Registers a handler for a given url matching.
   *
   * If the handler is a string, it is
   * treated as a redirect, and is interpolated according to the syntax of match
   * (i.e. like `String.replace()` for `RegExp`, or like a `UrlMatcher` pattern otherwise).
   *
   * If the handler is a function, it is injectable. It gets invoked if `$location`
   * matches. You have the option of inject the match object as `$match`.
   *
   * The handler can return
   *
   * - **falsy** to indicate that the rule didn't match after all, then `$urlRouter`
   *   will continue trying to find another one that matches.
   * - **string** which is treated as a redirect and passed to `$location.url()`
   * - **void** or any **truthy** value tells `$urlRouter` that the url was handled.
   *
   * @example
   * <pre>
   * var app = angular.module('app', ['ui.router.router']);
   *
   * app.config(function ($urlRouterProvider) {
   *   $urlRouterProvider.when($state.url, function ($match, $stateParams) {
   *     if ($state.$current.navigable !== state ||
   *         !equalForKeys($match, $stateParams) {
   *      $state.transitionTo(state, $match, false);
   *     }
   *   });
   * });
   * </pre>
   *
   * @param {string|object} what The incoming path that you want to redirect.
   * @param {string|function} handler The path you want to redirect your user to.
   */
  this.when = function (what, handler) {
    var redirect, handlerIsString = isString(handler);
    if (isString(what)) what = $urlMatcherFactory.compile(what);

    if (!handlerIsString && !isFunction(handler) && !isArray(handler))
      throw new Error("invalid 'handler' in when()");

    var strategies = {
      matcher: function (what, handler) {
        if (handlerIsString) {
          redirect = $urlMatcherFactory.compile(handler);
          handler = ['$match', function ($match) { return redirect.format($match); }];
        }
        return extend(function ($injector, $location) {
          return handleIfMatch($injector, handler, what.exec($location.path(), $location.search()));
        }, {
          prefix: isString(what.prefix) ? what.prefix : ''
        });
      },
      regex: function (what, handler) {
        if (what.global || what.sticky) throw new Error("when() RegExp must not be global or sticky");

        if (handlerIsString) {
          redirect = handler;
          handler = ['$match', function ($match) { return interpolate(redirect, $match); }];
        }
        return extend(function ($injector, $location) {
          return handleIfMatch($injector, handler, what.exec($location.path()));
        }, {
          prefix: regExpPrefix(what)
        });
      }
    };

    var check = { matcher: $urlMatcherFactory.isMatcher(what), regex: what instanceof RegExp };

    for (var n in check) {
      if (check[n]) return this.rule(strategies[n](what, handler));
    }

    throw new Error("invalid 'what' in when()");
  };

  /**
   * @ngdoc function
   * @name ui.router.router.$urlRouterProvider#deferIntercept
   * @methodOf ui.router.router.$urlRouterProvider
   *
   * @description
   * Disables (or enables) deferring location change interception.
   *
   * If you wish to customize the behavior of syncing the URL (for example, if you wish to
   * defer a transition but maintain the current URL), call this method at configuration time.
   * Then, at run time, call `$urlRouter.listen()` after you have configured your own
   * `$locationChangeSuccess` event handler.
   *
   * @example
   * <pre>
   * var app = angular.module('app', ['ui.router.router']);
   *
   * app.config(function ($urlRouterProvider) {
   *
   *   // Prevent $urlRouter from automatically intercepting URL changes;
   *   // this allows you to configure custom behavior in between
   *   // location changes and route synchronization:
   *   $urlRouterProvider.deferIntercept();
   *
   * }).run(function ($rootScope, $urlRouter, UserService) {
   *
   *   $rootScope.$on('$locationChangeSuccess', function(e) {
   *     // UserService is an example service for managing user state
   *     if (UserService.isLoggedIn()) return;
   *
   *     // Prevent $urlRouter's default handler from firing
   *     e.preventDefault();
   *
   *     UserService.handleLogin().then(function() {
   *       // Once the user has logged in, sync the current URL
   *       // to the router:
   *       $urlRouter.sync();
   *     });
   *   });
   *
   *   // Configures $urlRouter's listener *after* your custom listener
   *   $urlRouter.listen();
   * });
   * </pre>
   *
   * @param {boolean} defer Indicates whether to defer location change interception. Passing
            no parameter is equivalent to `true`.
   */
  this.deferIntercept = function (defer) {
    if (defer === undefined) defer = true;
    interceptDeferred = defer;
  };

  /**
   * @ngdoc object
   * @name ui.router.router.$urlRouter
   *
   * @requires $location
   * @requires $rootScope
   * @requires $injector
   * @requires $browser
   *
   * @description
   *
   */
  this.$get = $get;
  $get.$inject = ['$location', '$rootScope', '$injector', '$browser', '$sniffer'];
  function $get(   $location,   $rootScope,   $injector,   $browser,   $sniffer) {

    var baseHref = $browser.baseHref(), location = $location.url(), lastPushedUrl;

    function appendBasePath(url, isHtml5, absolute) {
      if (baseHref === '/') return url;
      if (isHtml5) return baseHref.slice(0, -1) + url;
      if (absolute) return baseHref.slice(1) + url;
      return url;
    }

    // TODO: Optimize groups of rules with non-empty prefix into some sort of decision tree
    function update(evt) {
      if (evt && evt.defaultPrevented) return;
      var ignoreUpdate = lastPushedUrl && $location.url() === lastPushedUrl;
      lastPushedUrl = undefined;
      // TODO: Re-implement this in 1.0 for https://github.com/angular-ui/ui-router/issues/1573
      //if (ignoreUpdate) return true;

      function check(rule) {
        var handled = rule($injector, $location);

        if (!handled) return false;
        if (isString(handled)) $location.replace().url(handled);
        return true;
      }
      var n = rules.length, i;

      for (i = 0; i < n; i++) {
        if (check(rules[i])) return;
      }
      // always check otherwise last to allow dynamic updates to the set of rules
      if (otherwise) check(otherwise);
    }

    function listen() {
      listener = listener || $rootScope.$on('$locationChangeSuccess', update);
      return listener;
    }

    if (!interceptDeferred) listen();

    return {
      /**
       * @ngdoc function
       * @name ui.router.router.$urlRouter#sync
       * @methodOf ui.router.router.$urlRouter
       *
       * @description
       * Triggers an update; the same update that happens when the address bar url changes, aka `$locationChangeSuccess`.
       * This method is useful when you need to use `preventDefault()` on the `$locationChangeSuccess` event,
       * perform some custom logic (route protection, auth, config, redirection, etc) and then finally proceed
       * with the transition by calling `$urlRouter.sync()`.
       *
       * @example
       * <pre>
       * angular.module('app', ['ui.router'])
       *   .run(function($rootScope, $urlRouter) {
       *     $rootScope.$on('$locationChangeSuccess', function(evt) {
       *       // Halt state change from even starting
       *       evt.preventDefault();
       *       // Perform custom logic
       *       var meetsRequirement = ...
       *       // Continue with the update and state transition if logic allows
       *       if (meetsRequirement) $urlRouter.sync();
       *     });
       * });
       * </pre>
       */
      sync: function() {
        update();
      },

      listen: function() {
        return listen();
      },

      update: function(read) {
        if (read) {
          location = $location.url();
          return;
        }
        if ($location.url() === location) return;

        $location.url(location);
        $location.replace();
      },

      push: function(urlMatcher, params, options) {
         var url = urlMatcher.format(params || {});

        // Handle the special hash param, if needed
        if (url !== null && params && params['#']) {
            url += '#' + params['#'];
        }

        $location.url(url);
        lastPushedUrl = options && options.$$avoidResync ? $location.url() : undefined;
        if (options && options.replace) $location.replace();
      },

      /**
       * @ngdoc function
       * @name ui.router.router.$urlRouter#href
       * @methodOf ui.router.router.$urlRouter
       *
       * @description
       * A URL generation method that returns the compiled URL for a given
       * {@link ui.router.util.type:UrlMatcher `UrlMatcher`}, populated with the provided parameters.
       *
       * @example
       * <pre>
       * $bob = $urlRouter.href(new UrlMatcher("/about/:person"), {
       *   person: "bob"
       * });
       * // $bob == "/about/bob";
       * </pre>
       *
       * @param {UrlMatcher} urlMatcher The `UrlMatcher` object which is used as the template of the URL to generate.
       * @param {object=} params An object of parameter values to fill the matcher's required parameters.
       * @param {object=} options Options object. The options are:
       *
       * - **`absolute`** - {boolean=false},  If true will generate an absolute url, e.g. "http://www.example.com/fullurl".
       *
       * @returns {string} Returns the fully compiled URL, or `null` if `params` fail validation against `urlMatcher`
       */
      href: function(urlMatcher, params, options) {
        if (!urlMatcher.validates(params)) return null;

        var isHtml5 = $locationProvider.html5Mode();
        if (angular.isObject(isHtml5)) {
          isHtml5 = isHtml5.enabled;
        }

        isHtml5 = isHtml5 && $sniffer.history;

        var url = urlMatcher.format(params);
        options = options || {};

        if (!isHtml5 && url !== null) {
          url = "#" + $locationProvider.hashPrefix() + url;
        }

        // Handle special hash param, if needed
        if (url !== null && params && params['#']) {
          url += '#' + params['#'];
        }

        url = appendBasePath(url, isHtml5, options.absolute);

        if (!options.absolute || !url) {
          return url;
        }

        var slash = (!isHtml5 && url ? '/' : ''), port = $location.port();
        port = (port === 80 || port === 443 ? '' : ':' + port);

        return [$location.protocol(), '://', $location.host(), port, slash, url].join('');
      }
    };
  }
}

angular.module('ui.router.router').provider('$urlRouter', $UrlRouterProvider);

/**
 * @ngdoc object
 * @name ui.router.state.$stateProvider
 *
 * @requires ui.router.router.$urlRouterProvider
 * @requires ui.router.util.$urlMatcherFactoryProvider
 *
 * @description
 * The new `$stateProvider` works similar to Angular's v1 router, but it focuses purely
 * on state.
 *
 * A state corresponds to a "place" in the application in terms of the overall UI and
 * navigation. A state describes (via the controller / template / view properties) what
 * the UI looks like and does at that place.
 *
 * States often have things in common, and the primary way of factoring out these
 * commonalities in this model is via the state hierarchy, i.e. parent/child states aka
 * nested states.
 *
 * The `$stateProvider` provides interfaces to declare these states for your app.
 */
$StateProvider.$inject = ['$urlRouterProvider', '$urlMatcherFactoryProvider'];
function $StateProvider(   $urlRouterProvider,   $urlMatcherFactory) {

  var root, states = {}, $state, queue = {}, abstractKey = 'abstract';

  // Builds state properties from definition passed to registerState()
  var stateBuilder = {

    // Derive parent state from a hierarchical name only if 'parent' is not explicitly defined.
    // state.children = [];
    // if (parent) parent.children.push(state);
    parent: function(state) {
      if (isDefined(state.parent) && state.parent) return findState(state.parent);
      // regex matches any valid composite state name
      // would match "contact.list" but not "contacts"
      var compositeName = /^(.+)\.[^.]+$/.exec(state.name);
      return compositeName ? findState(compositeName[1]) : root;
    },

    // inherit 'data' from parent and override by own values (if any)
    data: function(state) {
      if (state.parent && state.parent.data) {
        state.data = state.self.data = inherit(state.parent.data, state.data);
      }
      return state.data;
    },

    // Build a URLMatcher if necessary, either via a relative or absolute URL
    url: function(state) {
      var url = state.url, config = { params: state.params || {} };

      if (isString(url)) {
        if (url.charAt(0) == '^') return $urlMatcherFactory.compile(url.substring(1), config);
        return (state.parent.navigable || root).url.concat(url, config);
      }

      if (!url || $urlMatcherFactory.isMatcher(url)) return url;
      throw new Error("Invalid url '" + url + "' in state '" + state + "'");
    },

    // Keep track of the closest ancestor state that has a URL (i.e. is navigable)
    navigable: function(state) {
      return state.url ? state : (state.parent ? state.parent.navigable : null);
    },

    // Own parameters for this state. state.url.params is already built at this point. Create and add non-url params
    ownParams: function(state) {
      var params = state.url && state.url.params || new $$UMFP.ParamSet();
      forEach(state.params || {}, function(config, id) {
        if (!params[id]) params[id] = new $$UMFP.Param(id, null, config, "config");
      });
      return params;
    },

    // Derive parameters for this state and ensure they're a super-set of parent's parameters
    params: function(state) {
      var ownParams = pick(state.ownParams, state.ownParams.$$keys());
      return state.parent && state.parent.params ? extend(state.parent.params.$$new(), ownParams) : new $$UMFP.ParamSet();
    },

    // If there is no explicit multi-view configuration, make one up so we don't have
    // to handle both cases in the view directive later. Note that having an explicit
    // 'views' property will mean the default unnamed view properties are ignored. This
    // is also a good time to resolve view names to absolute names, so everything is a
    // straight lookup at link time.
    views: function(state) {
      var views = {};

      forEach(isDefined(state.views) ? state.views : { '': state }, function (view, name) {
        if (name.indexOf('@') < 0) name += '@' + state.parent.name;
        view.resolveAs = view.resolveAs || state.resolveAs || '$resolve';
        views[name] = view;
      });
      return views;
    },

    // Keep a full path from the root down to this state as this is needed for state activation.
    path: function(state) {
      return state.parent ? state.parent.path.concat(state) : []; // exclude root from path
    },

    // Speed up $state.contains() as it's used a lot
    includes: function(state) {
      var includes = state.parent ? extend({}, state.parent.includes) : {};
      includes[state.name] = true;
      return includes;
    },

    $delegates: {}
  };

  function isRelative(stateName) {
    return stateName.indexOf(".") === 0 || stateName.indexOf("^") === 0;
  }

  function findState(stateOrName, base) {
    if (!stateOrName) return undefined;

    var isStr = isString(stateOrName),
        name  = isStr ? stateOrName : stateOrName.name,
        path  = isRelative(name);

    if (path) {
      if (!base) throw new Error("No reference point given for path '"  + name + "'");
      base = findState(base);

      var rel = name.split("."), i = 0, pathLength = rel.length, current = base;

      for (; i < pathLength; i++) {
        if (rel[i] === "" && i === 0) {
          current = base;
          continue;
        }
        if (rel[i] === "^") {
          if (!current.parent) throw new Error("Path '" + name + "' not valid for state '" + base.name + "'");
          current = current.parent;
          continue;
        }
        break;
      }
      rel = rel.slice(i).join(".");
      name = current.name + (current.name && rel ? "." : "") + rel;
    }
    var state = states[name];

    if (state && (isStr || (!isStr && (state === stateOrName || state.self === stateOrName)))) {
      return state;
    }
    return undefined;
  }

  function queueState(parentName, state) {
    if (!queue[parentName]) {
      queue[parentName] = [];
    }
    queue[parentName].push(state);
  }

  function flushQueuedChildren(parentName) {
    var queued = queue[parentName] || [];
    while(queued.length) {
      registerState(queued.shift());
    }
  }

  function registerState(state) {
    // Wrap a new object around the state so we can store our private details easily.
    state = inherit(state, {
      self: state,
      resolve: state.resolve || {},
      toString: function() { return this.name; }
    });

    var name = state.name;
    if (!isString(name) || name.indexOf('@') >= 0) throw new Error("State must have a valid name");
    if (states.hasOwnProperty(name)) throw new Error("State '" + name + "' is already defined");

    // Get parent name
    var parentName = (name.indexOf('.') !== -1) ? name.substring(0, name.lastIndexOf('.'))
        : (isString(state.parent)) ? state.parent
        : (isObject(state.parent) && isString(state.parent.name)) ? state.parent.name
        : '';

    // If parent is not registered yet, add state to queue and register later
    if (parentName && !states[parentName]) {
      return queueState(parentName, state.self);
    }

    for (var key in stateBuilder) {
      if (isFunction(stateBuilder[key])) state[key] = stateBuilder[key](state, stateBuilder.$delegates[key]);
    }
    states[name] = state;

    // Register the state in the global state list and with $urlRouter if necessary.
    if (!state[abstractKey] && state.url) {
      $urlRouterProvider.when(state.url, ['$match', '$stateParams', function ($match, $stateParams) {
        if ($state.$current.navigable != state || !equalForKeys($match, $stateParams)) {
          $state.transitionTo(state, $match, { inherit: true, location: false });
        }
      }]);
    }

    // Register any queued children
    flushQueuedChildren(name);

    return state;
  }

  // Checks text to see if it looks like a glob.
  function isGlob (text) {
    return text.indexOf('*') > -1;
  }

  // Returns true if glob matches current $state name.
  function doesStateMatchGlob (glob) {
    var globSegments = glob.split('.'),
        segments = $state.$current.name.split('.');

    //match single stars
    for (var i = 0, l = globSegments.length; i < l; i++) {
      if (globSegments[i] === '*') {
        segments[i] = '*';
      }
    }

    //match greedy starts
    if (globSegments[0] === '**') {
       segments = segments.slice(indexOf(segments, globSegments[1]));
       segments.unshift('**');
    }
    //match greedy ends
    if (globSegments[globSegments.length - 1] === '**') {
       segments.splice(indexOf(segments, globSegments[globSegments.length - 2]) + 1, Number.MAX_VALUE);
       segments.push('**');
    }

    if (globSegments.length != segments.length) {
      return false;
    }

    return segments.join('') === globSegments.join('');
  }


  // Implicit root state that is always active
  root = registerState({
    name: '',
    url: '^',
    views: null,
    'abstract': true
  });
  root.navigable = null;


  /**
   * @ngdoc function
   * @name ui.router.state.$stateProvider#decorator
   * @methodOf ui.router.state.$stateProvider
   *
   * @description
   * Allows you to extend (carefully) or override (at your own peril) the
   * `stateBuilder` object used internally by `$stateProvider`. This can be used
   * to add custom functionality to ui-router, for example inferring templateUrl
   * based on the state name.
   *
   * When passing only a name, it returns the current (original or decorated) builder
   * function that matches `name`.
   *
   * The builder functions that can be decorated are listed below. Though not all
   * necessarily have a good use case for decoration, that is up to you to decide.
   *
   * In addition, users can attach custom decorators, which will generate new
   * properties within the state's internal definition. There is currently no clear
   * use-case for this beyond accessing internal states (i.e. $state.$current),
   * however, expect this to become increasingly relevant as we introduce additional
   * meta-programming features.
   *
   * **Warning**: Decorators should not be interdependent because the order of
   * execution of the builder functions in non-deterministic. Builder functions
   * should only be dependent on the state definition object and super function.
   *
   *
   * Existing builder functions and current return values:
   *
   * - **parent** `{object}` - returns the parent state object.
   * - **data** `{object}` - returns state data, including any inherited data that is not
   *   overridden by own values (if any).
   * - **url** `{object}` - returns a {@link ui.router.util.type:UrlMatcher UrlMatcher}
   *   or `null`.
   * - **navigable** `{object}` - returns closest ancestor state that has a URL (aka is
   *   navigable).
   * - **params** `{object}` - returns an array of state params that are ensured to
   *   be a super-set of parent's params.
   * - **views** `{object}` - returns a views object where each key is an absolute view
   *   name (i.e. "viewName@stateName") and each value is the config object
   *   (template, controller) for the view. Even when you don't use the views object
   *   explicitly on a state config, one is still created for you internally.
   *   So by decorating this builder function you have access to decorating template
   *   and controller properties.
   * - **ownParams** `{object}` - returns an array of params that belong to the state,
   *   not including any params defined by ancestor states.
   * - **path** `{string}` - returns the full path from the root down to this state.
   *   Needed for state activation.
   * - **includes** `{object}` - returns an object that includes every state that
   *   would pass a `$state.includes()` test.
   *
   * @example
   * <pre>
   * // Override the internal 'views' builder with a function that takes the state
   * // definition, and a reference to the internal function being overridden:
   * $stateProvider.decorator('views', function (state, parent) {
   *   var result = {},
   *       views = parent(state);
   *
   *   angular.forEach(views, function (config, name) {
   *     var autoName = (state.name + '.' + name).replace('.', '/');
   *     config.templateUrl = config.templateUrl || '/partials/' + autoName + '.html';
   *     result[name] = config;
   *   });
   *   return result;
   * });
   *
   * $stateProvider.state('home', {
   *   views: {
   *     'contact.list': { controller: 'ListController' },
   *     'contact.item': { controller: 'ItemController' }
   *   }
   * });
   *
   * // ...
   *
   * $state.go('home');
   * // Auto-populates list and item views with /partials/home/contact/list.html,
   * // and /partials/home/contact/item.html, respectively.
   * </pre>
   *
   * @param {string} name The name of the builder function to decorate.
   * @param {object} func A function that is responsible for decorating the original
   * builder function. The function receives two parameters:
   *
   *   - `{object}` - state - The state config object.
   *   - `{object}` - super - The original builder function.
   *
   * @return {object} $stateProvider - $stateProvider instance
   */
  this.decorator = decorator;
  function decorator(name, func) {
    /*jshint validthis: true */
    if (isString(name) && !isDefined(func)) {
      return stateBuilder[name];
    }
    if (!isFunction(func) || !isString(name)) {
      return this;
    }
    if (stateBuilder[name] && !stateBuilder.$delegates[name]) {
      stateBuilder.$delegates[name] = stateBuilder[name];
    }
    stateBuilder[name] = func;
    return this;
  }

  /**
   * @ngdoc function
   * @name ui.router.state.$stateProvider#state
   * @methodOf ui.router.state.$stateProvider
   *
   * @description
   * Registers a state configuration under a given state name. The stateConfig object
   * has the following acceptable properties.
   *
   * @param {string} name A unique state name, e.g. "home", "about", "contacts".
   * To create a parent/child state use a dot, e.g. "about.sales", "home.newest".
   * @param {object} stateConfig State configuration object.
   * @param {string|function=} stateConfig.template
   * <a id='template'></a>
   *   html template as a string or a function that returns
   *   an html template as a string which should be used by the uiView directives. This property
   *   takes precedence over templateUrl.
   *
   *   If `template` is a function, it will be called with the following parameters:
   *
   *   - {array.&lt;object&gt;} - state parameters extracted from the current $location.path() by
   *     applying the current state
   *
   * <pre>template:
   *   "<h1>inline template definition</h1>" +
   *   "<div ui-view></div>"</pre>
   * <pre>template: function(params) {
   *       return "<h1>generated template</h1>"; }</pre>
   * </div>
   *
   * @param {string|function=} stateConfig.templateUrl
   * <a id='templateUrl'></a>
   *
   *   path or function that returns a path to an html
   *   template that should be used by uiView.
   *
   *   If `templateUrl` is a function, it will be called with the following parameters:
   *
   *   - {array.&lt;object&gt;} - state parameters extracted from the current $location.path() by
   *     applying the current state
   *
   * <pre>templateUrl: "home.html"</pre>
   * <pre>templateUrl: function(params) {
   *     return myTemplates[params.pageId]; }</pre>
   *
   * @param {function=} stateConfig.templateProvider
   * <a id='templateProvider'></a>
   *    Provider function that returns HTML content string.
   * <pre> templateProvider:
   *       function(MyTemplateService, params) {
   *         return MyTemplateService.getTemplate(params.pageId);
   *       }</pre>
   *
   * @param {string|function=} stateConfig.controller
   * <a id='controller'></a>
   *
   *  Controller fn that should be associated with newly
   *   related scope or the name of a registered controller if passed as a string.
   *   Optionally, the ControllerAs may be declared here.
   * <pre>controller: "MyRegisteredController"</pre>
   * <pre>controller:
   *     "MyRegisteredController as fooCtrl"}</pre>
   * <pre>controller: function($scope, MyService) {
   *     $scope.data = MyService.getData(); }</pre>
   *
   * @param {function=} stateConfig.controllerProvider
   * <a id='controllerProvider'></a>
   *
   * Injectable provider function that returns the actual controller or string.
   * <pre>controllerProvider:
   *   function(MyResolveData) {
   *     if (MyResolveData.foo)
   *       return "FooCtrl"
   *     else if (MyResolveData.bar)
   *       return "BarCtrl";
   *     else return function($scope) {
   *       $scope.baz = "Qux";
   *     }
   *   }</pre>
   *
   * @param {string=} stateConfig.controllerAs
   * <a id='controllerAs'></a>
   *
   * A controller alias name. If present the controller will be
   *   published to scope under the controllerAs name.
   * <pre>controllerAs: "myCtrl"</pre>
   *
   * @param {string|object=} stateConfig.parent
   * <a id='parent'></a>
   * Optionally specifies the parent state of this state.
   *
   * <pre>parent: 'parentState'</pre>
   * <pre>parent: parentState // JS variable</pre>
   *
   * @param {object=} stateConfig.resolve
   * <a id='resolve'></a>
   *
   * An optional map&lt;string, function&gt; of dependencies which
   *   should be injected into the controller. If any of these dependencies are promises,
   *   the router will wait for them all to be resolved before the controller is instantiated.
   *   If all the promises are resolved successfully, the $stateChangeSuccess event is fired
   *   and the values of the resolved promises are injected into any controllers that reference them.
   *   If any  of the promises are rejected the $stateChangeError event is fired.
   *
   *   The map object is:
   *
   *   - key - {string}: name of dependency to be injected into controller
   *   - factory - {string|function}: If string then it is alias for service. Otherwise if function,
   *     it is injected and return value it treated as dependency. If result is a promise, it is
   *     resolved before its value is injected into controller.
   *
   * <pre>resolve: {
   *     myResolve1:
   *       function($http, $stateParams) {
   *         return $http.get("/api/foos/"+stateParams.fooID);
   *       }
   *     }</pre>
   *
   * @param {string=} stateConfig.url
   * <a id='url'></a>
   *
   *   A url fragment with optional parameters. When a state is navigated or
   *   transitioned to, the `$stateParams` service will be populated with any
   *   parameters that were passed.
   *
   *   (See {@link ui.router.util.type:UrlMatcher UrlMatcher} `UrlMatcher`} for
   *   more details on acceptable patterns )
   *
   * examples:
   * <pre>url: "/home"
   * url: "/users/:userid"
   * url: "/books/{bookid:[a-zA-Z_-]}"
   * url: "/books/{categoryid:int}"
   * url: "/books/{publishername:string}/{categoryid:int}"
   * url: "/messages?before&after"
   * url: "/messages?{before:date}&{after:date}"
   * url: "/messages/:mailboxid?{before:date}&{after:date}"
   * </pre>
   *
   * @param {object=} stateConfig.views
   * <a id='views'></a>
   * an optional map&lt;string, object&gt; which defined multiple views, or targets views
   * manually/explicitly.
   *
   * Examples:
   *
   * Targets three named `ui-view`s in the parent state's template
   * <pre>views: {
   *     header: {
   *       controller: "headerCtrl",
   *       templateUrl: "header.html"
   *     }, body: {
   *       controller: "bodyCtrl",
   *       templateUrl: "body.html"
   *     }, footer: {
   *       controller: "footCtrl",
   *       templateUrl: "footer.html"
   *     }
   *   }</pre>
   *
   * Targets named `ui-view="header"` from grandparent state 'top''s template, and named `ui-view="body" from parent state's template.
   * <pre>views: {
   *     'header@top': {
   *       controller: "msgHeaderCtrl",
   *       templateUrl: "msgHeader.html"
   *     }, 'body': {
   *       controller: "messagesCtrl",
   *       templateUrl: "messages.html"
   *     }
   *   }</pre>
   *
   * @param {boolean=} [stateConfig.abstract=false]
   * <a id='abstract'></a>
   * An abstract state will never be directly activated,
   *   but can provide inherited properties to its common children states.
   * <pre>abstract: true</pre>
   *
   * @param {function=} stateConfig.onEnter
   * <a id='onEnter'></a>
   *
   * Callback function for when a state is entered. Good way
   *   to trigger an action or dispatch an event, such as opening a dialog.
   * If minifying your scripts, make sure to explicitly annotate this function,
   * because it won't be automatically annotated by your build tools.
   *
   * <pre>onEnter: function(MyService, $stateParams) {
   *     MyService.foo($stateParams.myParam);
   * }</pre>
   *
   * @param {function=} stateConfig.onExit
   * <a id='onExit'></a>
   *
   * Callback function for when a state is exited. Good way to
   *   trigger an action or dispatch an event, such as opening a dialog.
   * If minifying your scripts, make sure to explicitly annotate this function,
   * because it won't be automatically annotated by your build tools.
   *
   * <pre>onExit: function(MyService, $stateParams) {
   *     MyService.cleanup($stateParams.myParam);
   * }</pre>
   *
   * @param {boolean=} [stateConfig.reloadOnSearch=true]
   * <a id='reloadOnSearch'></a>
   *
   * If `false`, will not retrigger the same state
   *   just because a search/query parameter has changed (via $location.search() or $location.hash()).
   *   Useful for when you'd like to modify $location.search() without triggering a reload.
   * <pre>reloadOnSearch: false</pre>
   *
   * @param {object=} stateConfig.data
   * <a id='data'></a>
   *
   * Arbitrary data object, useful for custom configuration.  The parent state's `data` is
   *   prototypally inherited.  In other words, adding a data property to a state adds it to
   *   the entire subtree via prototypal inheritance.
   *
   * <pre>data: {
   *     requiredRole: 'foo'
   * } </pre>
   *
   * @param {object=} stateConfig.params
   * <a id='params'></a>
   *
   * A map which optionally configures parameters declared in the `url`, or
   *   defines additional non-url parameters.  For each parameter being
   *   configured, add a configuration object keyed to the name of the parameter.
   *
   *   Each parameter configuration object may contain the following properties:
   *
   *   - ** value ** - {object|function=}: specifies the default value for this
   *     parameter.  This implicitly sets this parameter as optional.
   *
   *     When UI-Router routes to a state and no value is
   *     specified for this parameter in the URL or transition, the
   *     default value will be used instead.  If `value` is a function,
   *     it will be injected and invoked, and the return value used.
   *
   *     *Note*: `undefined` is treated as "no default value" while `null`
   *     is treated as "the default value is `null`".
   *
   *     *Shorthand*: If you only need to configure the default value of the
   *     parameter, you may use a shorthand syntax.   In the **`params`**
   *     map, instead mapping the param name to a full parameter configuration
   *     object, simply set map it to the default parameter value, e.g.:
   *
   * <pre>// define a parameter's default value
   * params: {
   *     param1: { value: "defaultValue" }
   * }
   * // shorthand default values
   * params: {
   *     param1: "defaultValue",
   *     param2: "param2Default"
   * }</pre>
   *
   *   - ** array ** - {boolean=}: *(default: false)* If true, the param value will be
   *     treated as an array of values.  If you specified a Type, the value will be
   *     treated as an array of the specified Type.  Note: query parameter values
   *     default to a special `"auto"` mode.
   *
   *     For query parameters in `"auto"` mode, if multiple  values for a single parameter
   *     are present in the URL (e.g.: `/foo?bar=1&bar=2&bar=3`) then the values
   *     are mapped to an array (e.g.: `{ foo: [ '1', '2', '3' ] }`).  However, if
   *     only one value is present (e.g.: `/foo?bar=1`) then the value is treated as single
   *     value (e.g.: `{ foo: '1' }`).
   *
   * <pre>params: {
   *     param1: { array: true }
   * }</pre>
   *
   *   - ** squash ** - {bool|string=}: `squash` configures how a default parameter value is represented in the URL when
   *     the current parameter value is the same as the default value. If `squash` is not set, it uses the
   *     configured default squash policy.
   *     (See {@link ui.router.util.$urlMatcherFactory#methods_defaultSquashPolicy `defaultSquashPolicy()`})
   *
   *   There are three squash settings:
   *
   *     - false: The parameter's default value is not squashed.  It is encoded and included in the URL
   *     - true: The parameter's default value is omitted from the URL.  If the parameter is preceeded and followed
   *       by slashes in the state's `url` declaration, then one of those slashes are omitted.
   *       This can allow for cleaner looking URLs.
   *     - `"<arbitrary string>"`: The parameter's default value is replaced with an arbitrary placeholder of  your choice.
   *
   * <pre>params: {
   *     param1: {
   *       value: "defaultId",
   *       squash: true
   * } }
   * // squash "defaultValue" to "~"
   * params: {
   *     param1: {
   *       value: "defaultValue",
   *       squash: "~"
   * } }
   * </pre>
   *
   *
   * @example
   * <pre>
   * // Some state name examples
   *
   * // stateName can be a single top-level name (must be unique).
   * $stateProvider.state("home", {});
   *
   * // Or it can be a nested state name. This state is a child of the
   * // above "home" state.
   * $stateProvider.state("home.newest", {});
   *
   * // Nest states as deeply as needed.
   * $stateProvider.state("home.newest.abc.xyz.inception", {});
   *
   * // state() returns $stateProvider, so you can chain state declarations.
   * $stateProvider
   *   .state("home", {})
   *   .state("about", {})
   *   .state("contacts", {});
   * </pre>
   *
   */
  this.state = state;
  function state(name, definition) {
    /*jshint validthis: true */
    if (isObject(name)) definition = name;
    else definition.name = name;
    registerState(definition);
    return this;
  }

  /**
   * @ngdoc object
   * @name ui.router.state.$state
   *
   * @requires $rootScope
   * @requires $q
   * @requires ui.router.state.$view
   * @requires $injector
   * @requires ui.router.util.$resolve
   * @requires ui.router.state.$stateParams
   * @requires ui.router.router.$urlRouter
   *
   * @property {object} params A param object, e.g. {sectionId: section.id)}, that
   * you'd like to test against the current active state.
   * @property {object} current A reference to the state's config object. However
   * you passed it in. Useful for accessing custom data.
   * @property {object} transition Currently pending transition. A promise that'll
   * resolve or reject.
   *
   * @description
   * `$state` service is responsible for representing states as well as transitioning
   * between them. It also provides interfaces to ask for current state or even states
   * you're coming from.
   */
  this.$get = $get;
  $get.$inject = ['$rootScope', '$q', '$view', '$injector', '$resolve', '$stateParams', '$urlRouter', '$location', '$urlMatcherFactory'];
  function $get(   $rootScope,   $q,   $view,   $injector,   $resolve,   $stateParams,   $urlRouter,   $location,   $urlMatcherFactory) {

    var TransitionSuperseded = $q.reject(new Error('transition superseded'));
    var TransitionPrevented = $q.reject(new Error('transition prevented'));
    var TransitionAborted = $q.reject(new Error('transition aborted'));
    var TransitionFailed = $q.reject(new Error('transition failed'));

    // Handles the case where a state which is the target of a transition is not found, and the user
    // can optionally retry or defer the transition
    function handleRedirect(redirect, state, params, options) {
      /**
       * @ngdoc event
       * @name ui.router.state.$state#$stateNotFound
       * @eventOf ui.router.state.$state
       * @eventType broadcast on root scope
       * @description
       * Fired when a requested state **cannot be found** using the provided state name during transition.
       * The event is broadcast allowing any handlers a single chance to deal with the error (usually by
       * lazy-loading the unfound state). A special `unfoundState` object is passed to the listener handler,
       * you can see its three properties in the example. You can use `event.preventDefault()` to abort the
       * transition and the promise returned from `go` will be rejected with a `'transition aborted'` value.
       *
       * @param {Object} event Event object.
       * @param {Object} unfoundState Unfound State information. Contains: `to, toParams, options` properties.
       * @param {State} fromState Current state object.
       * @param {Object} fromParams Current state params.
       *
       * @example
       *
       * <pre>
       * // somewhere, assume lazy.state has not been defined
       * $state.go("lazy.state", {a:1, b:2}, {inherit:false});
       *
       * // somewhere else
       * $scope.$on('$stateNotFound',
       * function(event, unfoundState, fromState, fromParams){
       *     console.log(unfoundState.to); // "lazy.state"
       *     console.log(unfoundState.toParams); // {a:1, b:2}
       *     console.log(unfoundState.options); // {inherit:false} + default options
       * })
       * </pre>
       */
      var evt = $rootScope.$broadcast('$stateNotFound', redirect, state, params);

      if (evt.defaultPrevented) {
        $urlRouter.update();
        return TransitionAborted;
      }

      if (!evt.retry) {
        return null;
      }

      // Allow the handler to return a promise to defer state lookup retry
      if (options.$retry) {
        $urlRouter.update();
        return TransitionFailed;
      }
      var retryTransition = $state.transition = $q.when(evt.retry);

      retryTransition.then(function() {
        if (retryTransition !== $state.transition) return TransitionSuperseded;
        redirect.options.$retry = true;
        return $state.transitionTo(redirect.to, redirect.toParams, redirect.options);
      }, function() {
        return TransitionAborted;
      });
      $urlRouter.update();

      return retryTransition;
    }

    root.locals = { resolve: null, globals: { $stateParams: {} } };

    $state = {
      params: {},
      current: root.self,
      $current: root,
      transition: null
    };

    /**
     * @ngdoc function
     * @name ui.router.state.$state#reload
     * @methodOf ui.router.state.$state
     *
     * @description
     * A method that force reloads the current state. All resolves are re-resolved,
     * controllers reinstantiated, and events re-fired.
     *
     * @example
     * <pre>
     * var app angular.module('app', ['ui.router']);
     *
     * app.controller('ctrl', function ($scope, $state) {
     *   $scope.reload = function(){
     *     $state.reload();
     *   }
     * });
     * </pre>
     *
     * `reload()` is just an alias for:
     * <pre>
     * $state.transitionTo($state.current, $stateParams, {
     *   reload: true, inherit: false, notify: true
     * });
     * </pre>
     *
     * @param {string=|object=} state - A state name or a state object, which is the root of the resolves to be re-resolved.
     * @example
     * <pre>
     * //assuming app application consists of 3 states: 'contacts', 'contacts.detail', 'contacts.detail.item'
     * //and current state is 'contacts.detail.item'
     * var app angular.module('app', ['ui.router']);
     *
     * app.controller('ctrl', function ($scope, $state) {
     *   $scope.reload = function(){
     *     //will reload 'contact.detail' and 'contact.detail.item' states
     *     $state.reload('contact.detail');
     *   }
     * });
     * </pre>
     *
     * `reload()` is just an alias for:
     * <pre>
     * $state.transitionTo($state.current, $stateParams, {
     *   reload: true, inherit: false, notify: true
     * });
     * </pre>

     * @returns {promise} A promise representing the state of the new transition. See
     * {@link ui.router.state.$state#methods_go $state.go}.
     */
    $state.reload = function reload(state) {
      return $state.transitionTo($state.current, $stateParams, { reload: state || true, inherit: false, notify: true});
    };

    /**
     * @ngdoc function
     * @name ui.router.state.$state#go
     * @methodOf ui.router.state.$state
     *
     * @description
     * Convenience method for transitioning to a new state. `$state.go` calls
     * `$state.transitionTo` internally but automatically sets options to
     * `{ location: true, inherit: true, relative: $state.$current, notify: true }`.
     * This allows you to easily use an absolute or relative to path and specify
     * only the parameters you'd like to update (while letting unspecified parameters
     * inherit from the currently active ancestor states).
     *
     * @example
     * <pre>
     * var app = angular.module('app', ['ui.router']);
     *
     * app.controller('ctrl', function ($scope, $state) {
     *   $scope.changeState = function () {
     *     $state.go('contact.detail');
     *   };
     * });
     * </pre>
     * <img src='../ngdoc_assets/StateGoExamples.png'/>
     *
     * @param {string} to Absolute state name or relative state path. Some examples:
     *
     * - `$state.go('contact.detail')` - will go to the `contact.detail` state
     * - `$state.go('^')` - will go to a parent state
     * - `$state.go('^.sibling')` - will go to a sibling state
     * - `$state.go('.child.grandchild')` - will go to grandchild state
     *
     * @param {object=} params A map of the parameters that will be sent to the state,
     * will populate $stateParams. Any parameters that are not specified will be inherited from currently
     * defined parameters. Only parameters specified in the state definition can be overridden, new
     * parameters will be ignored. This allows, for example, going to a sibling state that shares parameters
     * specified in a parent state. Parameter inheritance only works between common ancestor states, I.e.
     * transitioning to a sibling will get you the parameters for all parents, transitioning to a child
     * will get you all current parameters, etc.
     * @param {object=} options Options object. The options are:
     *
     * - **`location`** - {boolean=true|string=} - If `true` will update the url in the location bar, if `false`
     *    will not. If string, must be `"replace"`, which will update url and also replace last history record.
     * - **`inherit`** - {boolean=true}, If `true` will inherit url parameters from current url.
     * - **`relative`** - {object=$state.$current}, When transitioning with relative path (e.g '^'),
     *    defines which state to be relative from.
     * - **`notify`** - {boolean=true}, If `true` will broadcast $stateChangeStart and $stateChangeSuccess events.
     * - **`reload`** (v0.2.5) - {boolean=false|string|object}, If `true` will force transition even if no state or params
     *    have changed.  It will reload the resolves and views of the current state and parent states.
     *    If `reload` is a string (or state object), the state object is fetched (by name, or object reference); and \
     *    the transition reloads the resolves and views for that matched state, and all its children states.
     *
     * @returns {promise} A promise representing the state of the new transition.
     *
     * Possible success values:
     *
     * - $state.current
     *
     * <br/>Possible rejection values:
     *
     * - 'transition superseded' - when a newer transition has been started after this one
     * - 'transition prevented' - when `event.preventDefault()` has been called in a `$stateChangeStart` listener
     * - 'transition aborted' - when `event.preventDefault()` has been called in a `$stateNotFound` listener or
     *   when a `$stateNotFound` `event.retry` promise errors.
     * - 'transition failed' - when a state has been unsuccessfully found after 2 tries.
     * - *resolve error* - when an error has occurred with a `resolve`
     *
     */
    $state.go = function go(to, params, options) {
      return $state.transitionTo(to, params, extend({ inherit: true, relative: $state.$current }, options));
    };

    /**
     * @ngdoc function
     * @name ui.router.state.$state#transitionTo
     * @methodOf ui.router.state.$state
     *
     * @description
     * Low-level method for transitioning to a new state. {@link ui.router.state.$state#methods_go $state.go}
     * uses `transitionTo` internally. `$state.go` is recommended in most situations.
     *
     * @example
     * <pre>
     * var app = angular.module('app', ['ui.router']);
     *
     * app.controller('ctrl', function ($scope, $state) {
     *   $scope.changeState = function () {
     *     $state.transitionTo('contact.detail');
     *   };
     * });
     * </pre>
     *
     * @param {string} to State name.
     * @param {object=} toParams A map of the parameters that will be sent to the state,
     * will populate $stateParams.
     * @param {object=} options Options object. The options are:
     *
     * - **`location`** - {boolean=true|string=} - If `true` will update the url in the location bar, if `false`
     *    will not. If string, must be `"replace"`, which will update url and also replace last history record.
     * - **`inherit`** - {boolean=false}, If `true` will inherit url parameters from current url.
     * - **`relative`** - {object=}, When transitioning with relative path (e.g '^'),
     *    defines which state to be relative from.
     * - **`notify`** - {boolean=true}, If `true` will broadcast $stateChangeStart and $stateChangeSuccess events.
     * - **`reload`** (v0.2.5) - {boolean=false|string=|object=}, If `true` will force transition even if the state or params
     *    have not changed, aka a reload of the same state. It differs from reloadOnSearch because you'd
     *    use this when you want to force a reload when *everything* is the same, including search params.
     *    if String, then will reload the state with the name given in reload, and any children.
     *    if Object, then a stateObj is expected, will reload the state found in stateObj, and any children.
     *
     * @returns {promise} A promise representing the state of the new transition. See
     * {@link ui.router.state.$state#methods_go $state.go}.
     */
    $state.transitionTo = function transitionTo(to, toParams, options) {
      toParams = toParams || {};
      options = extend({
        location: true, inherit: false, relative: null, notify: true, reload: false, $retry: false
      }, options || {});

      var from = $state.$current, fromParams = $state.params, fromPath = from.path;
      var evt, toState = findState(to, options.relative);

      // Store the hash param for later (since it will be stripped out by various methods)
      var hash = toParams['#'];

      if (!isDefined(toState)) {
        var redirect = { to: to, toParams: toParams, options: options };
        var redirectResult = handleRedirect(redirect, from.self, fromParams, options);

        if (redirectResult) {
          return redirectResult;
        }

        // Always retry once if the $stateNotFound was not prevented
        // (handles either redirect changed or state lazy-definition)
        to = redirect.to;
        toParams = redirect.toParams;
        options = redirect.options;
        toState = findState(to, options.relative);

        if (!isDefined(toState)) {
          if (!options.relative) throw new Error("No such state '" + to + "'");
          throw new Error("Could not resolve '" + to + "' from state '" + options.relative + "'");
        }
      }
      if (toState[abstractKey]) throw new Error("Cannot transition to abstract state '" + to + "'");
      if (options.inherit) toParams = inheritParams($stateParams, toParams || {}, $state.$current, toState);
      if (!toState.params.$$validates(toParams)) return TransitionFailed;

      toParams = toState.params.$$values(toParams);
      to = toState;

      var toPath = to.path;

      // Starting from the root of the path, keep all levels that haven't changed
      var keep = 0, state = toPath[keep], locals = root.locals, toLocals = [];

      if (!options.reload) {
        while (state && state === fromPath[keep] && state.ownParams.$$equals(toParams, fromParams)) {
          locals = toLocals[keep] = state.locals;
          keep++;
          state = toPath[keep];
        }
      } else if (isString(options.reload) || isObject(options.reload)) {
        if (isObject(options.reload) && !options.reload.name) {
          throw new Error('Invalid reload state object');
        }

        var reloadState = options.reload === true ? fromPath[0] : findState(options.reload);
        if (options.reload && !reloadState) {
          throw new Error("No such reload state '" + (isString(options.reload) ? options.reload : options.reload.name) + "'");
        }

        while (state && state === fromPath[keep] && state !== reloadState) {
          locals = toLocals[keep] = state.locals;
          keep++;
          state = toPath[keep];
        }
      }

      // If we're going to the same state and all locals are kept, we've got nothing to do.
      // But clear 'transition', as we still want to cancel any other pending transitions.
      // TODO: We may not want to bump 'transition' if we're called from a location change
      // that we've initiated ourselves, because we might accidentally abort a legitimate
      // transition initiated from code?
      if (shouldSkipReload(to, toParams, from, fromParams, locals, options)) {
        if (hash) toParams['#'] = hash;
        $state.params = toParams;
        copy($state.params, $stateParams);
        copy(filterByKeys(to.params.$$keys(), $stateParams), to.locals.globals.$stateParams);
        if (options.location && to.navigable && to.navigable.url) {
          $urlRouter.push(to.navigable.url, toParams, {
            $$avoidResync: true, replace: options.location === 'replace'
          });
          $urlRouter.update(true);
        }
        $state.transition = null;
        return $q.when($state.current);
      }

      // Filter parameters before we pass them to event handlers etc.
      toParams = filterByKeys(to.params.$$keys(), toParams || {});

      // Re-add the saved hash before we start returning things or broadcasting $stateChangeStart
      if (hash) toParams['#'] = hash;

      // Broadcast start event and cancel the transition if requested
      if (options.notify) {
        /**
         * @ngdoc event
         * @name ui.router.state.$state#$stateChangeStart
         * @eventOf ui.router.state.$state
         * @eventType broadcast on root scope
         * @description
         * Fired when the state transition **begins**. You can use `event.preventDefault()`
         * to prevent the transition from happening and then the transition promise will be
         * rejected with a `'transition prevented'` value.
         *
         * @param {Object} event Event object.
         * @param {State} toState The state being transitioned to.
         * @param {Object} toParams The params supplied to the `toState`.
         * @param {State} fromState The current state, pre-transition.
         * @param {Object} fromParams The params supplied to the `fromState`.
         *
         * @example
         *
         * <pre>
         * $rootScope.$on('$stateChangeStart',
         * function(event, toState, toParams, fromState, fromParams){
         *     event.preventDefault();
         *     // transitionTo() promise will be rejected with
         *     // a 'transition prevented' error
         * })
         * </pre>
         */
        if ($rootScope.$broadcast('$stateChangeStart', to.self, toParams, from.self, fromParams, options).defaultPrevented) {
          $rootScope.$broadcast('$stateChangeCancel', to.self, toParams, from.self, fromParams);
          //Don't update and resync url if there's been a new transition started. see issue #2238, #600
          if ($state.transition == null) $urlRouter.update();
          return TransitionPrevented;
        }
      }

      // Resolve locals for the remaining states, but don't update any global state just
      // yet -- if anything fails to resolve the current state needs to remain untouched.
      // We also set up an inheritance chain for the locals here. This allows the view directive
      // to quickly look up the correct definition for each view in the current state. Even
      // though we create the locals object itself outside resolveState(), it is initially
      // empty and gets filled asynchronously. We need to keep track of the promise for the
      // (fully resolved) current locals, and pass this down the chain.
      var resolved = $q.when(locals);

      for (var l = keep; l < toPath.length; l++, state = toPath[l]) {
        locals = toLocals[l] = inherit(locals);
        resolved = resolveState(state, toParams, state === to, resolved, locals, options);
      }

      // Once everything is resolved, we are ready to perform the actual transition
      // and return a promise for the new state. We also keep track of what the
      // current promise is, so that we can detect overlapping transitions and
      // keep only the outcome of the last transition.
      var transition = $state.transition = resolved.then(function () {
        var l, entering, exiting;

        if ($state.transition !== transition) return TransitionSuperseded;

        // Exit 'from' states not kept
        for (l = fromPath.length - 1; l >= keep; l--) {
          exiting = fromPath[l];
          if (exiting.self.onExit) {
            $injector.invoke(exiting.self.onExit, exiting.self, exiting.locals.globals);
          }
          exiting.locals = null;
        }

        // Enter 'to' states not kept
        for (l = keep; l < toPath.length; l++) {
          entering = toPath[l];
          entering.locals = toLocals[l];
          if (entering.self.onEnter) {
            $injector.invoke(entering.self.onEnter, entering.self, entering.locals.globals);
          }
        }

        // Run it again, to catch any transitions in callbacks
        if ($state.transition !== transition) return TransitionSuperseded;

        // Update globals in $state
        $state.$current = to;
        $state.current = to.self;
        $state.params = toParams;
        copy($state.params, $stateParams);
        $state.transition = null;

        if (options.location && to.navigable) {
          $urlRouter.push(to.navigable.url, to.navigable.locals.globals.$stateParams, {
            $$avoidResync: true, replace: options.location === 'replace'
          });
        }

        if (options.notify) {
        /**
         * @ngdoc event
         * @name ui.router.state.$state#$stateChangeSuccess
         * @eventOf ui.router.state.$state
         * @eventType broadcast on root scope
         * @description
         * Fired once the state transition is **complete**.
         *
         * @param {Object} event Event object.
         * @param {State} toState The state being transitioned to.
         * @param {Object} toParams The params supplied to the `toState`.
         * @param {State} fromState The current state, pre-transition.
         * @param {Object} fromParams The params supplied to the `fromState`.
         */
          $rootScope.$broadcast('$stateChangeSuccess', to.self, toParams, from.self, fromParams);
        }
        $urlRouter.update(true);

        return $state.current;
      }).then(null, function (error) {
        if ($state.transition !== transition) return TransitionSuperseded;

        $state.transition = null;
        /**
         * @ngdoc event
         * @name ui.router.state.$state#$stateChangeError
         * @eventOf ui.router.state.$state
         * @eventType broadcast on root scope
         * @description
         * Fired when an **error occurs** during transition. It's important to note that if you
         * have any errors in your resolve functions (javascript errors, non-existent services, etc)
         * they will not throw traditionally. You must listen for this $stateChangeError event to
         * catch **ALL** errors.
         *
         * @param {Object} event Event object.
         * @param {State} toState The state being transitioned to.
         * @param {Object} toParams The params supplied to the `toState`.
         * @param {State} fromState The current state, pre-transition.
         * @param {Object} fromParams The params supplied to the `fromState`.
         * @param {Error} error The resolve error object.
         */
        evt = $rootScope.$broadcast('$stateChangeError', to.self, toParams, from.self, fromParams, error);

        if (!evt.defaultPrevented) {
            $urlRouter.update();
        }

        return $q.reject(error);
      });

      return transition;
    };

    /**
     * @ngdoc function
     * @name ui.router.state.$state#is
     * @methodOf ui.router.state.$state
     *
     * @description
     * Similar to {@link ui.router.state.$state#methods_includes $state.includes},
     * but only checks for the full state name. If params is supplied then it will be
     * tested for strict equality against the current active params object, so all params
     * must match with none missing and no extras.
     *
     * @example
     * <pre>
     * $state.$current.name = 'contacts.details.item';
     *
     * // absolute name
     * $state.is('contact.details.item'); // returns true
     * $state.is(contactDetailItemStateObject); // returns true
     *
     * // relative name (. and ^), typically from a template
     * // E.g. from the 'contacts.details' template
     * <div ng-class="{highlighted: $state.is('.item')}">Item</div>
     * </pre>
     *
     * @param {string|object} stateOrName The state name (absolute or relative) or state object you'd like to check.
     * @param {object=} params A param object, e.g. `{sectionId: section.id}`, that you'd like
     * to test against the current active state.
     * @param {object=} options An options object.  The options are:
     *
     * - **`relative`** - {string|object} -  If `stateOrName` is a relative state name and `options.relative` is set, .is will
     * test relative to `options.relative` state (or name).
     *
     * @returns {boolean} Returns true if it is the state.
     */
    $state.is = function is(stateOrName, params, options) {
      options = extend({ relative: $state.$current }, options || {});
      var state = findState(stateOrName, options.relative);

      if (!isDefined(state)) { return undefined; }
      if ($state.$current !== state) { return false; }
      return params ? equalForKeys(state.params.$$values(params), $stateParams) : true;
    };

    /**
     * @ngdoc function
     * @name ui.router.state.$state#includes
     * @methodOf ui.router.state.$state
     *
     * @description
     * A method to determine if the current active state is equal to or is the child of the
     * state stateName. If any params are passed then they will be tested for a match as well.
     * Not all the parameters need to be passed, just the ones you'd like to test for equality.
     *
     * @example
     * Partial and relative names
     * <pre>
     * $state.$current.name = 'contacts.details.item';
     *
     * // Using partial names
     * $state.includes("contacts"); // returns true
     * $state.includes("contacts.details"); // returns true
     * $state.includes("contacts.details.item"); // returns true
     * $state.includes("contacts.list"); // returns false
     * $state.includes("about"); // returns false
     *
     * // Using relative names (. and ^), typically from a template
     * // E.g. from the 'contacts.details' template
     * <div ng-class="{highlighted: $state.includes('.item')}">Item</div>
     * </pre>
     *
     * Basic globbing patterns
     * <pre>
     * $state.$current.name = 'contacts.details.item.url';
     *
     * $state.includes("*.details.*.*"); // returns true
     * $state.includes("*.details.**"); // returns true
     * $state.includes("**.item.**"); // returns true
     * $state.includes("*.details.item.url"); // returns true
     * $state.includes("*.details.*.url"); // returns true
     * $state.includes("*.details.*"); // returns false
     * $state.includes("item.**"); // returns false
     * </pre>
     *
     * @param {string} stateOrName A partial name, relative name, or glob pattern
     * to be searched for within the current state name.
     * @param {object=} params A param object, e.g. `{sectionId: section.id}`,
     * that you'd like to test against the current active state.
     * @param {object=} options An options object.  The options are:
     *
     * - **`relative`** - {string|object=} -  If `stateOrName` is a relative state reference and `options.relative` is set,
     * .includes will test relative to `options.relative` state (or name).
     *
     * @returns {boolean} Returns true if it does include the state
     */
    $state.includes = function includes(stateOrName, params, options) {
      options = extend({ relative: $state.$current }, options || {});
      if (isString(stateOrName) && isGlob(stateOrName)) {
        if (!doesStateMatchGlob(stateOrName)) {
          return false;
        }
        stateOrName = $state.$current.name;
      }

      var state = findState(stateOrName, options.relative);
      if (!isDefined(state)) { return undefined; }
      if (!isDefined($state.$current.includes[state.name])) { return false; }
      return params ? equalForKeys(state.params.$$values(params), $stateParams, objectKeys(params)) : true;
    };


    /**
     * @ngdoc function
     * @name ui.router.state.$state#href
     * @methodOf ui.router.state.$state
     *
     * @description
     * A url generation method that returns the compiled url for the given state populated with the given params.
     *
     * @example
     * <pre>
     * expect($state.href("about.person", { person: "bob" })).toEqual("/about/bob");
     * </pre>
     *
     * @param {string|object} stateOrName The state name or state object you'd like to generate a url from.
     * @param {object=} params An object of parameter values to fill the state's required parameters.
     * @param {object=} options Options object. The options are:
     *
     * - **`lossy`** - {boolean=true} -  If true, and if there is no url associated with the state provided in the
     *    first parameter, then the constructed href url will be built from the first navigable ancestor (aka
     *    ancestor with a valid url).
     * - **`inherit`** - {boolean=true}, If `true` will inherit url parameters from current url.
     * - **`relative`** - {object=$state.$current}, When transitioning with relative path (e.g '^'),
     *    defines which state to be relative from.
     * - **`absolute`** - {boolean=false},  If true will generate an absolute url, e.g. "http://www.example.com/fullurl".
     *
     * @returns {string} compiled state url
     */
    $state.href = function href(stateOrName, params, options) {
      options = extend({
        lossy:    true,
        inherit:  true,
        absolute: false,
        relative: $state.$current
      }, options || {});

      var state = findState(stateOrName, options.relative);

      if (!isDefined(state)) return null;
      if (options.inherit) params = inheritParams($stateParams, params || {}, $state.$current, state);

      var nav = (state && options.lossy) ? state.navigable : state;

      if (!nav || nav.url === undefined || nav.url === null) {
        return null;
      }
      return $urlRouter.href(nav.url, filterByKeys(state.params.$$keys().concat('#'), params || {}), {
        absolute: options.absolute
      });
    };

    /**
     * @ngdoc function
     * @name ui.router.state.$state#get
     * @methodOf ui.router.state.$state
     *
     * @description
     * Returns the state configuration object for any specific state or all states.
     *
     * @param {string|object=} stateOrName (absolute or relative) If provided, will only get the config for
     * the requested state. If not provided, returns an array of ALL state configs.
     * @param {string|object=} context When stateOrName is a relative state reference, the state will be retrieved relative to context.
     * @returns {Object|Array} State configuration object or array of all objects.
     */
    $state.get = function (stateOrName, context) {
      if (arguments.length === 0) return map(objectKeys(states), function(name) { return states[name].self; });
      var state = findState(stateOrName, context || $state.$current);
      return (state && state.self) ? state.self : null;
    };

    function resolveState(state, params, paramsAreFiltered, inherited, dst, options) {
      // Make a restricted $stateParams with only the parameters that apply to this state if
      // necessary. In addition to being available to the controller and onEnter/onExit callbacks,
      // we also need $stateParams to be available for any $injector calls we make during the
      // dependency resolution process.
      var $stateParams = (paramsAreFiltered) ? params : filterByKeys(state.params.$$keys(), params);
      var locals = { $stateParams: $stateParams };

      // Resolve 'global' dependencies for the state, i.e. those not specific to a view.
      // We're also including $stateParams in this; that way the parameters are restricted
      // to the set that should be visible to the state, and are independent of when we update
      // the global $state and $stateParams values.
      dst.resolve = $resolve.resolve(state.resolve, locals, dst.resolve, state);
      var promises = [dst.resolve.then(function (globals) {
        dst.globals = globals;
      })];
      if (inherited) promises.push(inherited);

      function resolveViews() {
        var viewsPromises = [];

        // Resolve template and dependencies for all views.
        forEach(state.views, function (view, name) {
          var injectables = (view.resolve && view.resolve !== state.resolve ? view.resolve : {});
          injectables.$template = [ function () {
            return $view.load(name, { view: view, locals: dst.globals, params: $stateParams, notify: options.notify }) || '';
          }];

          viewsPromises.push($resolve.resolve(injectables, dst.globals, dst.resolve, state).then(function (result) {
            // References to the controller (only instantiated at link time)
            if (isFunction(view.controllerProvider) || isArray(view.controllerProvider)) {
              var injectLocals = angular.extend({}, injectables, dst.globals);
              result.$$controller = $injector.invoke(view.controllerProvider, null, injectLocals);
            } else {
              result.$$controller = view.controller;
            }
            // Provide access to the state itself for internal use
            result.$$state = state;
            result.$$controllerAs = view.controllerAs;
            result.$$resolveAs = view.resolveAs;
            dst[name] = result;
          }));
        });

        return $q.all(viewsPromises).then(function(){
          return dst.globals;
        });
      }

      // Wait for all the promises and then return the activation object
      return $q.all(promises).then(resolveViews).then(function (values) {
        return dst;
      });
    }

    return $state;
  }

  function shouldSkipReload(to, toParams, from, fromParams, locals, options) {
    // Return true if there are no differences in non-search (path/object) params, false if there are differences
    function nonSearchParamsEqual(fromAndToState, fromParams, toParams) {
      // Identify whether all the parameters that differ between `fromParams` and `toParams` were search params.
      function notSearchParam(key) {
        return fromAndToState.params[key].location != "search";
      }
      var nonQueryParamKeys = fromAndToState.params.$$keys().filter(notSearchParam);
      var nonQueryParams = pick.apply({}, [fromAndToState.params].concat(nonQueryParamKeys));
      var nonQueryParamSet = new $$UMFP.ParamSet(nonQueryParams);
      return nonQueryParamSet.$$equals(fromParams, toParams);
    }

    // If reload was not explicitly requested
    // and we're transitioning to the same state we're already in
    // and    the locals didn't change
    //     or they changed in a way that doesn't merit reloading
    //        (reloadOnParams:false, or reloadOnSearch.false and only search params changed)
    // Then return true.
    if (!options.reload && to === from &&
      (locals === from.locals || (to.self.reloadOnSearch === false && nonSearchParamsEqual(from, fromParams, toParams)))) {
      return true;
    }
  }
}

angular.module('ui.router.state')
  .factory('$stateParams', function () { return {}; })
  .constant("$state.runtime", { autoinject: true })
  .provider('$state', $StateProvider)
  // Inject $state to initialize when entering runtime. #2574
  .run(['$injector', function ($injector) {
    // Allow tests (stateSpec.js) to turn this off by defining this constant
    if ($injector.get("$state.runtime").autoinject) {
      $injector.get('$state');
    }
  }]);


$ViewProvider.$inject = [];
function $ViewProvider() {

  this.$get = $get;
  /**
   * @ngdoc object
   * @name ui.router.state.$view
   *
   * @requires ui.router.util.$templateFactory
   * @requires $rootScope
   *
   * @description
   *
   */
  $get.$inject = ['$rootScope', '$templateFactory'];
  function $get(   $rootScope,   $templateFactory) {
    return {
      // $view.load('full.viewName', { template: ..., controller: ..., resolve: ..., async: false, params: ... })
      /**
       * @ngdoc function
       * @name ui.router.state.$view#load
       * @methodOf ui.router.state.$view
       *
       * @description
       *
       * @param {string} name name
       * @param {object} options option object.
       */
      load: function load(name, options) {
        var result, defaults = {
          template: null, controller: null, view: null, locals: null, notify: true, async: true, params: {}
        };
        options = extend(defaults, options);

        if (options.view) {
          result = $templateFactory.fromConfig(options.view, options.params, options.locals);
        }
        return result;
      }
    };
  }
}

angular.module('ui.router.state').provider('$view', $ViewProvider);

/**
 * @ngdoc object
 * @name ui.router.state.$uiViewScrollProvider
 *
 * @description
 * Provider that returns the {@link ui.router.state.$uiViewScroll} service function.
 */
function $ViewScrollProvider() {

  var useAnchorScroll = false;

  /**
   * @ngdoc function
   * @name ui.router.state.$uiViewScrollProvider#useAnchorScroll
   * @methodOf ui.router.state.$uiViewScrollProvider
   *
   * @description
   * Reverts back to using the core [`$anchorScroll`](http://docs.angularjs.org/api/ng.$anchorScroll) service for
   * scrolling based on the url anchor.
   */
  this.useAnchorScroll = function () {
    useAnchorScroll = true;
  };

  /**
   * @ngdoc object
   * @name ui.router.state.$uiViewScroll
   *
   * @requires $anchorScroll
   * @requires $timeout
   *
   * @description
   * When called with a jqLite element, it scrolls the element into view (after a
   * `$timeout` so the DOM has time to refresh).
   *
   * If you prefer to rely on `$anchorScroll` to scroll the view to the anchor,
   * this can be enabled by calling {@link ui.router.state.$uiViewScrollProvider#methods_useAnchorScroll `$uiViewScrollProvider.useAnchorScroll()`}.
   */
  this.$get = ['$anchorScroll', '$timeout', function ($anchorScroll, $timeout) {
    if (useAnchorScroll) {
      return $anchorScroll;
    }

    return function ($element) {
      return $timeout(function () {
        $element[0].scrollIntoView();
      }, 0, false);
    };
  }];
}

angular.module('ui.router.state').provider('$uiViewScroll', $ViewScrollProvider);

/**
 * @ngdoc directive
 * @name ui.router.state.directive:ui-view
 *
 * @requires ui.router.state.$state
 * @requires $compile
 * @requires $controller
 * @requires $injector
 * @requires ui.router.state.$uiViewScroll
 * @requires $document
 *
 * @restrict ECA
 *
 * @description
 * The ui-view directive tells $state where to place your templates.
 *
 * @param {string=} name A view name. The name should be unique amongst the other views in the
 * same state. You can have views of the same name that live in different states.
 *
 * @param {string=} autoscroll It allows you to set the scroll behavior of the browser window
 * when a view is populated. By default, $anchorScroll is overridden by ui-router's custom scroll
 * service, {@link ui.router.state.$uiViewScroll}. This custom service let's you
 * scroll ui-view elements into view when they are populated during a state activation.
 *
 * *Note: To revert back to old [`$anchorScroll`](http://docs.angularjs.org/api/ng.$anchorScroll)
 * functionality, call `$uiViewScrollProvider.useAnchorScroll()`.*
 *
 * @param {string=} onload Expression to evaluate whenever the view updates.
 *
 * @example
 * A view can be unnamed or named.
 * <pre>
 * <!-- Unnamed -->
 * <div ui-view></div>
 *
 * <!-- Named -->
 * <div ui-view="viewName"></div>
 * </pre>
 *
 * You can only have one unnamed view within any template (or root html). If you are only using a
 * single view and it is unnamed then you can populate it like so:
 * <pre>
 * <div ui-view></div>
 * $stateProvider.state("home", {
 *   template: "<h1>HELLO!</h1>"
 * })
 * </pre>
 *
 * The above is a convenient shortcut equivalent to specifying your view explicitly with the {@link ui.router.state.$stateProvider#methods_state `views`}
 * config property, by name, in this case an empty name:
 * <pre>
 * $stateProvider.state("home", {
 *   views: {
 *     "": {
 *       template: "<h1>HELLO!</h1>"
 *     }
 *   }
 * })
 * </pre>
 *
 * But typically you'll only use the views property if you name your view or have more than one view
 * in the same template. There's not really a compelling reason to name a view if its the only one,
 * but you could if you wanted, like so:
 * <pre>
 * <div ui-view="main"></div>
 * </pre>
 * <pre>
 * $stateProvider.state("home", {
 *   views: {
 *     "main": {
 *       template: "<h1>HELLO!</h1>"
 *     }
 *   }
 * })
 * </pre>
 *
 * Really though, you'll use views to set up multiple views:
 * <pre>
 * <div ui-view></div>
 * <div ui-view="chart"></div>
 * <div ui-view="data"></div>
 * </pre>
 *
 * <pre>
 * $stateProvider.state("home", {
 *   views: {
 *     "": {
 *       template: "<h1>HELLO!</h1>"
 *     },
 *     "chart": {
 *       template: "<chart_thing/>"
 *     },
 *     "data": {
 *       template: "<data_thing/>"
 *     }
 *   }
 * })
 * </pre>
 *
 * Examples for `autoscroll`:
 *
 * <pre>
 * <!-- If autoscroll present with no expression,
 *      then scroll ui-view into view -->
 * <ui-view autoscroll/>
 *
 * <!-- If autoscroll present with valid expression,
 *      then scroll ui-view into view if expression evaluates to true -->
 * <ui-view autoscroll='true'/>
 * <ui-view autoscroll='false'/>
 * <ui-view autoscroll='scopeVariable'/>
 * </pre>
 *
 * Resolve data:
 *
 * The resolved data from the state's `resolve` block is placed on the scope as `$resolve` (this
 * can be customized using [[ViewDeclaration.resolveAs]]).  This can be then accessed from the template.
 *
 * Note that when `controllerAs` is being used, `$resolve` is set on the controller instance *after* the
 * controller is instantiated.  The `$onInit()` hook can be used to perform initialization code which
 * depends on `$resolve` data.
 *
 * Example usage of $resolve in a view template
 * <pre>
 * $stateProvider.state('home', {
 *   template: '<my-component user="$resolve.user"></my-component>',
 *   resolve: {
 *     user: function(UserService) { return UserService.fetchUser(); }
 *   }
 * });
 * </pre>
 */
$ViewDirective.$inject = ['$state', '$injector', '$uiViewScroll', '$interpolate', '$q'];
function $ViewDirective(   $state,   $injector,   $uiViewScroll,   $interpolate,   $q) {

  function getService() {
    return ($injector.has) ? function(service) {
      return $injector.has(service) ? $injector.get(service) : null;
    } : function(service) {
      try {
        return $injector.get(service);
      } catch (e) {
        return null;
      }
    };
  }

  var service = getService(),
      $animator = service('$animator'),
      $animate = service('$animate');

  // Returns a set of DOM manipulation functions based on which Angular version
  // it should use
  function getRenderer(attrs, scope) {
    var statics = function() {
      return {
        enter: function (element, target, cb) { target.after(element); cb(); },
        leave: function (element, cb) { element.remove(); cb(); }
      };
    };

    if ($animate) {
      return {
        enter: function(element, target, cb) {
          if (angular.version.minor > 2) {
            $animate.enter(element, null, target).then(cb);
          } else {
            $animate.enter(element, null, target, cb);
          }
        },
        leave: function(element, cb) {
          if (angular.version.minor > 2) {
            $animate.leave(element).then(cb);
          } else {
            $animate.leave(element, cb);
          }
        }
      };
    }

    if ($animator) {
      var animate = $animator && $animator(scope, attrs);

      return {
        enter: function(element, target, cb) {animate.enter(element, null, target); cb(); },
        leave: function(element, cb) { animate.leave(element); cb(); }
      };
    }

    return statics();
  }

  var directive = {
    restrict: 'ECA',
    terminal: true,
    priority: 400,
    transclude: 'element',
    compile: function (tElement, tAttrs, $transclude) {
      return function (scope, $element, attrs) {
        var previousEl, currentEl, currentScope, latestLocals,
            onloadExp     = attrs.onload || '',
            autoScrollExp = attrs.autoscroll,
            renderer      = getRenderer(attrs, scope),
            inherited     = $element.inheritedData('$uiView');

        scope.$on('$stateChangeSuccess', function() {
          updateView(false);
        });

        updateView(true);

        function cleanupLastView() {
          if (previousEl) {
            previousEl.remove();
            previousEl = null;
          }

          if (currentScope) {
            currentScope.$destroy();
            currentScope = null;
          }

          if (currentEl) {
            var $uiViewData = currentEl.data('$uiViewAnim');
            renderer.leave(currentEl, function() {
              $uiViewData.$$animLeave.resolve();
              previousEl = null;
            });

            previousEl = currentEl;
            currentEl = null;
          }
        }

        function updateView(firstTime) {
          var newScope,
              name            = getUiViewName(scope, attrs, $element, $interpolate),
              previousLocals  = name && $state.$current && $state.$current.locals[name];

          if (!firstTime && previousLocals === latestLocals) return; // nothing to do
          newScope = scope.$new();
          latestLocals = $state.$current.locals[name];

          /**
           * @ngdoc event
           * @name ui.router.state.directive:ui-view#$viewContentLoading
           * @eventOf ui.router.state.directive:ui-view
           * @eventType emits on ui-view directive scope
           * @description
           *
           * Fired once the view **begins loading**, *before* the DOM is rendered.
           *
           * @param {Object} event Event object.
           * @param {string} viewName Name of the view.
           */
          newScope.$emit('$viewContentLoading', name);

          var clone = $transclude(newScope, function(clone) {
            var animEnter = $q.defer(), animLeave = $q.defer();
            var viewAnimData = {
              $animEnter: animEnter.promise,
              $animLeave: animLeave.promise,
              $$animLeave: animLeave
            };

            clone.data('$uiViewAnim', viewAnimData);
            renderer.enter(clone, $element, function onUiViewEnter() {
              animEnter.resolve();
              if(currentScope) {
                currentScope.$emit('$viewContentAnimationEnded');
              }

              if (angular.isDefined(autoScrollExp) && !autoScrollExp || scope.$eval(autoScrollExp)) {
                $uiViewScroll(clone);
              }
            });
            cleanupLastView();
          });

          currentEl = clone;
          currentScope = newScope;
          /**
           * @ngdoc event
           * @name ui.router.state.directive:ui-view#$viewContentLoaded
           * @eventOf ui.router.state.directive:ui-view
           * @eventType emits on ui-view directive scope
           * @description
           * Fired once the view is **loaded**, *after* the DOM is rendered.
           *
           * @param {Object} event Event object.
           * @param {string} viewName Name of the view.
           */
          currentScope.$emit('$viewContentLoaded', name);
          currentScope.$eval(onloadExp);
        }
      };
    }
  };

  return directive;
}

$ViewDirectiveFill.$inject = ['$compile', '$controller', '$state', '$interpolate'];
function $ViewDirectiveFill (  $compile,   $controller,   $state,   $interpolate) {
  return {
    restrict: 'ECA',
    priority: -400,
    compile: function (tElement) {
      var initial = tElement.html();
      return function (scope, $element, attrs) {
        var current = $state.$current,
            name = getUiViewName(scope, attrs, $element, $interpolate),
            locals  = current && current.locals[name];

        if (! locals) {
          return;
        }

        $element.data('$uiView', { name: name, state: locals.$$state });
        $element.html(locals.$template ? locals.$template : initial);

        var resolveData = angular.extend({}, locals);
        scope[locals.$$resolveAs] = resolveData;

        var link = $compile($element.contents());

        if (locals.$$controller) {
          locals.$scope = scope;
          locals.$element = $element;
          var controller = $controller(locals.$$controller, locals);
          if (locals.$$controllerAs) {
            scope[locals.$$controllerAs] = controller;
            scope[locals.$$controllerAs][locals.$$resolveAs] = resolveData;
          }
          if (isFunction(controller.$onInit)) controller.$onInit();
          $element.data('$ngControllerController', controller);
          $element.children().data('$ngControllerController', controller);
        }

        link(scope);
      };
    }
  };
}

/**
 * Shared ui-view code for both directives:
 * Given scope, element, and its attributes, return the view's name
 */
function getUiViewName(scope, attrs, element, $interpolate) {
  var name = $interpolate(attrs.uiView || attrs.name || '')(scope);
  var uiViewCreatedBy = element.inheritedData('$uiView');
  return name.indexOf('@') >= 0 ?  name :  (name + '@' + (uiViewCreatedBy ? uiViewCreatedBy.state.name : ''));
}

angular.module('ui.router.state').directive('uiView', $ViewDirective);
angular.module('ui.router.state').directive('uiView', $ViewDirectiveFill);

function parseStateRef(ref, current) {
  var preparsed = ref.match(/^\s*({[^}]*})\s*$/), parsed;
  if (preparsed) ref = current + '(' + preparsed[1] + ')';
  parsed = ref.replace(/\n/g, " ").match(/^([^(]+?)\s*(\((.*)\))?$/);
  if (!parsed || parsed.length !== 4) throw new Error("Invalid state ref '" + ref + "'");
  return { state: parsed[1], paramExpr: parsed[3] || null };
}

function stateContext(el) {
  var stateData = el.parent().inheritedData('$uiView');

  if (stateData && stateData.state && stateData.state.name) {
    return stateData.state;
  }
}

function getTypeInfo(el) {
  // SVGAElement does not use the href attribute, but rather the 'xlinkHref' attribute.
  var isSvg = Object.prototype.toString.call(el.prop('href')) === '[object SVGAnimatedString]';
  var isForm = el[0].nodeName === "FORM";

  return {
    attr: isForm ? "action" : (isSvg ? 'xlink:href' : 'href'),
    isAnchor: el.prop("tagName").toUpperCase() === "A",
    clickable: !isForm
  };
}

function clickHook(el, $state, $timeout, type, current) {
  return function(e) {
    var button = e.which || e.button, target = current();

    if (!(button > 1 || e.ctrlKey || e.metaKey || e.shiftKey || el.attr('target'))) {
      // HACK: This is to allow ng-clicks to be processed before the transition is initiated:
      var transition = $timeout(function() {
        $state.go(target.state, target.params, target.options);
      });
      e.preventDefault();

      // if the state has no URL, ignore one preventDefault from the <a> directive.
      var ignorePreventDefaultCount = type.isAnchor && !target.href ? 1: 0;

      e.preventDefault = function() {
        if (ignorePreventDefaultCount-- <= 0) $timeout.cancel(transition);
      };
    }
  };
}

function defaultOpts(el, $state) {
  return { relative: stateContext(el) || $state.$current, inherit: true };
}

/**
 * @ngdoc directive
 * @name ui.router.state.directive:ui-sref
 *
 * @requires ui.router.state.$state
 * @requires $timeout
 *
 * @restrict A
 *
 * @description
 * A directive that binds a link (`<a>` tag) to a state. If the state has an associated
 * URL, the directive will automatically generate & update the `href` attribute via
 * the {@link ui.router.state.$state#methods_href $state.href()} method. Clicking
 * the link will trigger a state transition with optional parameters.
 *
 * Also middle-clicking, right-clicking, and ctrl-clicking on the link will be
 * handled natively by the browser.
 *
 * You can also use relative state paths within ui-sref, just like the relative
 * paths passed to `$state.go()`. You just need to be aware that the path is relative
 * to the state that the link lives in, in other words the state that loaded the
 * template containing the link.
 *
 * You can specify options to pass to {@link ui.router.state.$state#methods_go $state.go()}
 * using the `ui-sref-opts` attribute. Options are restricted to `location`, `inherit`,
 * and `reload`.
 *
 * @example
 * Here's an example of how you'd use ui-sref and how it would compile. If you have the
 * following template:
 * <pre>
 * <a ui-sref="home">Home</a> | <a ui-sref="about">About</a> | <a ui-sref="{page: 2}">Next page</a>
 *
 * <ul>
 *     <li ng-repeat="contact in contacts">
 *         <a ui-sref="contacts.detail({ id: contact.id })">{{ contact.name }}</a>
 *     </li>
 * </ul>
 * </pre>
 *
 * Then the compiled html would be (assuming Html5Mode is off and current state is contacts):
 * <pre>
 * <a href="#/home" ui-sref="home">Home</a> | <a href="#/about" ui-sref="about">About</a> | <a href="#/contacts?page=2" ui-sref="{page: 2}">Next page</a>
 *
 * <ul>
 *     <li ng-repeat="contact in contacts">
 *         <a href="#/contacts/1" ui-sref="contacts.detail({ id: contact.id })">Joe</a>
 *     </li>
 *     <li ng-repeat="contact in contacts">
 *         <a href="#/contacts/2" ui-sref="contacts.detail({ id: contact.id })">Alice</a>
 *     </li>
 *     <li ng-repeat="contact in contacts">
 *         <a href="#/contacts/3" ui-sref="contacts.detail({ id: contact.id })">Bob</a>
 *     </li>
 * </ul>
 *
 * <a ui-sref="home" ui-sref-opts="{reload: true}">Home</a>
 * </pre>
 *
 * @param {string} ui-sref 'stateName' can be any valid absolute or relative state
 * @param {Object} ui-sref-opts options to pass to {@link ui.router.state.$state#methods_go $state.go()}
 */
$StateRefDirective.$inject = ['$state', '$timeout'];
function $StateRefDirective($state, $timeout) {
  return {
    restrict: 'A',
    require: ['?^uiSrefActive', '?^uiSrefActiveEq'],
    link: function(scope, element, attrs, uiSrefActive) {
      var ref    = parseStateRef(attrs.uiSref, $state.current.name);
      var def    = { state: ref.state, href: null, params: null };
      var type   = getTypeInfo(element);
      var active = uiSrefActive[1] || uiSrefActive[0];
      var unlinkInfoFn = null;
      var hookFn;

      def.options = extend(defaultOpts(element, $state), attrs.uiSrefOpts ? scope.$eval(attrs.uiSrefOpts) : {});

      var update = function(val) {
        if (val) def.params = angular.copy(val);
        def.href = $state.href(ref.state, def.params, def.options);

        if (unlinkInfoFn) unlinkInfoFn();
        if (active) unlinkInfoFn = active.$$addStateInfo(ref.state, def.params);
        if (def.href !== null) attrs.$set(type.attr, def.href);
      };

      if (ref.paramExpr) {
        scope.$watch(ref.paramExpr, function(val) { if (val !== def.params) update(val); }, true);
        def.params = angular.copy(scope.$eval(ref.paramExpr));
      }
      update();

      if (!type.clickable) return;
      hookFn = clickHook(element, $state, $timeout, type, function() { return def; });
      element.bind("click", hookFn);
      scope.$on('$destroy', function() {
        element.unbind("click", hookFn);
      });
    }
  };
}

/**
 * @ngdoc directive
 * @name ui.router.state.directive:ui-state
 *
 * @requires ui.router.state.uiSref
 *
 * @restrict A
 *
 * @description
 * Much like ui-sref, but will accept named $scope properties to evaluate for a state definition,
 * params and override options.
 *
 * @param {string} ui-state 'stateName' can be any valid absolute or relative state
 * @param {Object} ui-state-params params to pass to {@link ui.router.state.$state#methods_href $state.href()}
 * @param {Object} ui-state-opts options to pass to {@link ui.router.state.$state#methods_go $state.go()}
 */
$StateRefDynamicDirective.$inject = ['$state', '$timeout'];
function $StateRefDynamicDirective($state, $timeout) {
  return {
    restrict: 'A',
    require: ['?^uiSrefActive', '?^uiSrefActiveEq'],
    link: function(scope, element, attrs, uiSrefActive) {
      var type   = getTypeInfo(element);
      var active = uiSrefActive[1] || uiSrefActive[0];
      var group  = [attrs.uiState, attrs.uiStateParams || null, attrs.uiStateOpts || null];
      var watch  = '[' + group.map(function(val) { return val || 'null'; }).join(', ') + ']';
      var def    = { state: null, params: null, options: null, href: null };
      var unlinkInfoFn = null;
      var hookFn;

      function runStateRefLink (group) {
        def.state = group[0]; def.params = group[1]; def.options = group[2];
        def.href = $state.href(def.state, def.params, def.options);

        if (unlinkInfoFn) unlinkInfoFn();
        if (active) unlinkInfoFn = active.$$addStateInfo(def.state, def.params);
        if (def.href) attrs.$set(type.attr, def.href);
      }

      scope.$watch(watch, runStateRefLink, true);
      runStateRefLink(scope.$eval(watch));

      if (!type.clickable) return;
      hookFn = clickHook(element, $state, $timeout, type, function() { return def; });
      element.bind("click", hookFn);
      scope.$on('$destroy', function() {
        element.unbind("click", hookFn);
      });
    }
  };
}


/**
 * @ngdoc directive
 * @name ui.router.state.directive:ui-sref-active
 *
 * @requires ui.router.state.$state
 * @requires ui.router.state.$stateParams
 * @requires $interpolate
 *
 * @restrict A
 *
 * @description
 * A directive working alongside ui-sref to add classes to an element when the
 * related ui-sref directive's state is active, and removing them when it is inactive.
 * The primary use-case is to simplify the special appearance of navigation menus
 * relying on `ui-sref`, by having the "active" state's menu button appear different,
 * distinguishing it from the inactive menu items.
 *
 * ui-sref-active can live on the same element as ui-sref or on a parent element. The first
 * ui-sref-active found at the same level or above the ui-sref will be used.
 *
 * Will activate when the ui-sref's target state or any child state is active. If you
 * need to activate only when the ui-sref target state is active and *not* any of
 * it's children, then you will use
 * {@link ui.router.state.directive:ui-sref-active-eq ui-sref-active-eq}
 *
 * @example
 * Given the following template:
 * <pre>
 * <ul>
 *   <li ui-sref-active="active" class="item">
 *     <a href ui-sref="app.user({user: 'bilbobaggins'})">@bilbobaggins</a>
 *   </li>
 * </ul>
 * </pre>
 *
 *
 * When the app state is "app.user" (or any children states), and contains the state parameter "user" with value "bilbobaggins",
 * the resulting HTML will appear as (note the 'active' class):
 * <pre>
 * <ul>
 *   <li ui-sref-active="active" class="item active">
 *     <a ui-sref="app.user({user: 'bilbobaggins'})" href="/users/bilbobaggins">@bilbobaggins</a>
 *   </li>
 * </ul>
 * </pre>
 *
 * The class name is interpolated **once** during the directives link time (any further changes to the
 * interpolated value are ignored).
 *
 * Multiple classes may be specified in a space-separated format:
 * <pre>
 * <ul>
 *   <li ui-sref-active='class1 class2 class3'>
 *     <a ui-sref="app.user">link</a>
 *   </li>
 * </ul>
 * </pre>
 *
 * It is also possible to pass ui-sref-active an expression that evaluates
 * to an object hash, whose keys represent active class names and whose
 * values represent the respective state names/globs.
 * ui-sref-active will match if the current active state **includes** any of
 * the specified state names/globs, even the abstract ones.
 *
 * @Example
 * Given the following template, with "admin" being an abstract state:
 * <pre>
 * <div ui-sref-active="{'active': 'admin.*'}">
 *   <a ui-sref-active="active" ui-sref="admin.roles">Roles</a>
 * </div>
 * </pre>
 *
 * When the current state is "admin.roles" the "active" class will be applied
 * to both the <div> and <a> elements. It is important to note that the state
 * names/globs passed to ui-sref-active shadow the state provided by ui-sref.
 */

/**
 * @ngdoc directive
 * @name ui.router.state.directive:ui-sref-active-eq
 *
 * @requires ui.router.state.$state
 * @requires ui.router.state.$stateParams
 * @requires $interpolate
 *
 * @restrict A
 *
 * @description
 * The same as {@link ui.router.state.directive:ui-sref-active ui-sref-active} but will only activate
 * when the exact target state used in the `ui-sref` is active; no child states.
 *
 */
$StateRefActiveDirective.$inject = ['$state', '$stateParams', '$interpolate'];
function $StateRefActiveDirective($state, $stateParams, $interpolate) {
  return  {
    restrict: "A",
    controller: ['$scope', '$element', '$attrs', '$timeout', function ($scope, $element, $attrs, $timeout) {
      var states = [], activeClasses = {}, activeEqClass, uiSrefActive;

      // There probably isn't much point in $observing this
      // uiSrefActive and uiSrefActiveEq share the same directive object with some
      // slight difference in logic routing
      activeEqClass = $interpolate($attrs.uiSrefActiveEq || '', false)($scope);

      try {
        uiSrefActive = $scope.$eval($attrs.uiSrefActive);
      } catch (e) {
        // Do nothing. uiSrefActive is not a valid expression.
        // Fall back to using $interpolate below
      }
      uiSrefActive = uiSrefActive || $interpolate($attrs.uiSrefActive || '', false)($scope);
      if (isObject(uiSrefActive)) {
        forEach(uiSrefActive, function(stateOrName, activeClass) {
          if (isString(stateOrName)) {
            var ref = parseStateRef(stateOrName, $state.current.name);
            addState(ref.state, $scope.$eval(ref.paramExpr), activeClass);
          }
        });
      }

      // Allow uiSref to communicate with uiSrefActive[Equals]
      this.$$addStateInfo = function (newState, newParams) {
        // we already got an explicit state provided by ui-sref-active, so we
        // shadow the one that comes from ui-sref
        if (isObject(uiSrefActive) && states.length > 0) {
          return;
        }
        var deregister = addState(newState, newParams, uiSrefActive);
        update();
        return deregister;
      };

      $scope.$on('$stateChangeSuccess', update);

      function addState(stateName, stateParams, activeClass) {
        var state = $state.get(stateName, stateContext($element));
        var stateHash = createStateHash(stateName, stateParams);

        var stateInfo = {
          state: state || { name: stateName },
          params: stateParams,
          hash: stateHash
        };

        states.push(stateInfo);
        activeClasses[stateHash] = activeClass;

        return function removeState() {
          var idx = states.indexOf(stateInfo);
          if (idx !== -1) states.splice(idx, 1);
        };
      }

      /**
       * @param {string} state
       * @param {Object|string} [params]
       * @return {string}
       */
      function createStateHash(state, params) {
        if (!isString(state)) {
          throw new Error('state should be a string');
        }
        if (isObject(params)) {
          return state + toJson(params);
        }
        params = $scope.$eval(params);
        if (isObject(params)) {
          return state + toJson(params);
        }
        return state;
      }

      // Update route state
      function update() {
        for (var i = 0; i < states.length; i++) {
          if (anyMatch(states[i].state, states[i].params)) {
            addClass($element, activeClasses[states[i].hash]);
          } else {
            removeClass($element, activeClasses[states[i].hash]);
          }

          if (exactMatch(states[i].state, states[i].params)) {
            addClass($element, activeEqClass);
          } else {
            removeClass($element, activeEqClass);
          }
        }
      }

      function addClass(el, className) { $timeout(function () { el.addClass(className); }); }
      function removeClass(el, className) { el.removeClass(className); }
      function anyMatch(state, params) { return $state.includes(state.name, params); }
      function exactMatch(state, params) { return $state.is(state.name, params); }

      update();
    }]
  };
}

angular.module('ui.router.state')
  .directive('uiSref', $StateRefDirective)
  .directive('uiSrefActive', $StateRefActiveDirective)
  .directive('uiSrefActiveEq', $StateRefActiveDirective)
  .directive('uiState', $StateRefDynamicDirective);

/**
 * @ngdoc filter
 * @name ui.router.state.filter:isState
 *
 * @requires ui.router.state.$state
 *
 * @description
 * Translates to {@link ui.router.state.$state#methods_is $state.is("stateName")}.
 */
$IsStateFilter.$inject = ['$state'];
function $IsStateFilter($state) {
  var isFilter = function (state, params) {
    return $state.is(state, params);
  };
  isFilter.$stateful = true;
  return isFilter;
}

/**
 * @ngdoc filter
 * @name ui.router.state.filter:includedByState
 *
 * @requires ui.router.state.$state
 *
 * @description
 * Translates to {@link ui.router.state.$state#methods_includes $state.includes('fullOrPartialStateName')}.
 */
$IncludedByStateFilter.$inject = ['$state'];
function $IncludedByStateFilter($state) {
  var includesFilter = function (state, params, options) {
    return $state.includes(state, params, options);
  };
  includesFilter.$stateful = true;
  return  includesFilter;
}

angular.module('ui.router.state')
  .filter('isState', $IsStateFilter)
  .filter('includedByState', $IncludedByStateFilter);
})(window, window.angular);
},{}],3:[function(require,module,exports){
"use strict";

require("angular-ui-router");

require("angular-ui-router-styles/ui-router-styles");

require("./modules/modules");

require("./modules/templates/templates.module");

require("./modules/(main-app)/");

require("./modules/home/");

require("./modules/cart/");

require("./modules/community/");

require("./modules/downtown/");

require("./modules/help/");

require("./modules/search/");

require("./modules/setting/");

require("./modules/signin/");

require("./modules/auth/");

require("./modules/[directives]/");

require("./modules/signout/");

require("./modules/user/");

},{"./modules/(main-app)/":4,"./modules/[directives]/":9,"./modules/auth/":15,"./modules/cart/":18,"./modules/community/":21,"./modules/downtown/":24,"./modules/help/":27,"./modules/home/":30,"./modules/modules":31,"./modules/search/":32,"./modules/setting/":35,"./modules/signin/":38,"./modules/signout/":41,"./modules/templates/templates.module":44,"./modules/user/":45,"angular-ui-router":2,"angular-ui-router-styles/ui-router-styles":1}],4:[function(require,module,exports){
"use strict";

var _mainApp = require("./main-app.constant");

var _mainApp2 = require("./main-app.controller");

var _mainApp3 = require("./main-app.config");

var _mainApp4 = require("./main-app.run");

/**
 * @ngdoc overview
 * @name MainApp
 *
 * @description
 * #Description
 * Top-level module of application.
 */
angular.module("MainApp").constant("MainAppConstant", _mainApp.MainAppConstant).config(_mainApp3.MainAppConfig).controller("MainController", _mainApp2.MainController).run(_mainApp4.MainAppRun);

//$(function () {
//    $('a[href="#search"]').on('click', function(event) {
//        event.preventDefault();
//        $('#search').addClass('open');
//        $('#search > form > input[type="search"]').focus();
//    });
//
//    $('#search, #search button.close').on('click keyup', function(event) {
//        if (event.target == this || event.target.className == 'close' || event.keyCode == 27) {
//            $(this).removeClass('open');
//        }
//    });
//
//
//    //Do not include! This prevents the form from submitting for DEMO purposes only!
//    $('form').submit(function(event) {
//        event.preventDefault();
//        return false;
//    })
//});

},{"./main-app.config":5,"./main-app.constant":6,"./main-app.controller":7,"./main-app.run":8}],5:[function(require,module,exports){
"use strict";

MainAppConfig.$inject = ["$urlRouterProvider", "$stateProvider", "$locationProvider"];
Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.MainAppConfig = MainAppConfig;
function MainAppConfig($urlRouterProvider, $stateProvider, $locationProvider) {
    "ngInject";

    $locationProvider.html5Mode(true);
    $urlRouterProvider.otherwise("/downtown");

    $stateProvider.state("main", {
        // url: "/",
        templateUrl: "modules/(main-app)/main.html",
        controller: "MainController",
        controllerAs: "main",

        data: {
            // css: "/css/cart/cart.css",
            //authenticate: true,
            //
        }
    });
};

},{}],6:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
/**
 * @ngdoc object
 * @name MainApp.MainAppConstant
 * @description
 * Contant object of MainApp module.
 *
 * This object has the following properties:
 *
 * - `appName` – `{string}` – Name of this application.
 */
var MainAppConstant = exports.MainAppConstant = {
  appName: "Sector 5",
  apiPath: "http://192.168.2.10:8000"
};

},{}],7:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * @ngdoc controller
 * @name Main.controller:MainController
 * @description Controller for Main module.
 */
var MainController = exports.MainController = function MainController() {
    "ngInject";

    _classCallCheck(this, MainController);
};

},{}],8:[function(require,module,exports){
"use strict";

MainAppRun.$inject = ["MainAppConstant", "$rootScope", "$state", "AuthService"];
Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.MainAppRun = MainAppRun;
function MainAppRun(MainAppConstant, $rootScope, $state, AuthService) {
    "ngInject";

    // change page title based on state

    $rootScope.$on('$stateChangeSuccess', function (event, next, toState) {
        $rootScope.setPageTitle(toState.title);

        if (AuthService.isRequireAuthenForView(next)) {
            //alert(!AuthService.isSignedIn());
            if (!AuthService.isSignedIn()) {
                //  alert("Go");
                $state.go("auth");
                //
                //alert("auth");
            } else if (!AuthService.hasPermissionForView(next)) {
                $state.go("forbidden");
                //alert("forbidden");
            }
        }
    });

    // Helper method for setting the page's title
    $rootScope.setPageTitle = function (title) {
        $rootScope.pageTitle = '';
        if (title) {
            $rootScope.pageTitle += title;
            $rootScope.pageTitle += " — ";
        }
        $rootScope.pageTitle += MainAppConstant.appName;
    };

    $rootScope.isUserLoggedIn = function () {
        return AuthService.isSignedIn();
    };
};

},{}],9:[function(require,module,exports){
"use strict";

var _permissions = require("./permissions/permissions");

/**
 * @ngdoc directive
 * @name Directives.directive:permissions
 *
 * @description
 * Restricting access to page content
 */
angular.module("Directives").directive("permissions", ["AuthService", _permissions.permissions]);

},{"./permissions/permissions":10}],10:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.permissions = permissions;
function permissions(AuthService) {
    return {
        restrict: 'A',
        scope: {
            permissions: '='
        },

        link: function link(scope, elem, attrs) {
            if (AuthService.userHasPermission(scope.permissions)) {
                elem.removeClass("ng-hide");
            } else {
                elem.addClass("ng-hide");
            }
        }
    };
};

},{}],11:[function(require,module,exports){
"use strict";

AuthConfig.$inject = ["$stateProvider", "$httpProvider"];
Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.AuthConfig = AuthConfig;
function AuthConfig($stateProvider, $httpProvider) {
    "ngInject";

    $httpProvider.interceptors.push("authInterceptor");

    $stateProvider.state("auth", {
        templateUrl: "modules/auth/auth.html",
        controller: "AuthController",
        controllerAs: "auth",
        title: "Authentication",
        data: {
            authenticate: false,
            css: "/css/auth/auth.css"
        }
    }).state("forbidden", {
        templateUrl: "modules/auth/forbidden.html",
        data: {
            authenticate: true
        }
    }).state("activate", {
        templateUrl: "modules/auth/activate.html",
        url: "/activate",
        controller: "AuthController",
        controllerAs: "auth",
        title: "Authentication",
        data: {
            authenticate: false,
            css: "/css/auth/auth.css"
        }
    });
};

},{}],12:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * @ngdoc controller
 * @name Auth.controller:AuthController
 * @description Controller for Auth module.
 */
var AuthController = exports.AuthController = function () {
    AuthController.$inject = ["$http", "$window", "$location", "AuthService", "UserService"];
    function AuthController($http, $window, $location, AuthService, UserService) {
        "ngInject";

        _classCallCheck(this, AuthController);

        this._$http = $http;
        this._$window = $window;
        this._AuthService = AuthService;
        this._UserService = UserService;
        this._$location = $location;
        //this._FlashService = FlashService;
        this.error = {
            signin: false,
            duplicateUsername: false,
            passwordNotMatch: false
        };
    }

    _createClass(AuthController, [{
        key: "signin",
        value: function signin() {
            var _this = this;

            this._AuthService.signin(this.user.username, this.user.password).then(function () {
                //this._$window.location.href = "/home";
                _this._$location.path("/home");
            }, function (data) {
                _this.error.signin = true;
            });
        }
    }, {
        key: "signup",
        value: function signup() {
            var _this2 = this;

            var user = {
                firstname: this.user.firstname,
                lastname: this.user.lastname,
                email: this.user.email,
                password: this.user.password1,
                gender: this.user.gender
            };

            this._UserService.Create(user).then(function () {
                //success
                _this2._$location.path("/community");
            }, function () {//error
                //
            });
        }
    }, {
        key: "isDuplicateUsername",
        value: function isDuplicateUsername() {
            console.log("d");
            var is = this._UserService.isDuplicateUsername(this.user.email);
            this.error.duplicateUsername = is;

            return is;
        }
    }, {
        key: "isPasswordNotMatch",
        value: function isPasswordNotMatch() {
            var is = !(this.user.password1 == this.user.password2);
            this.error.passwordNotMatch = is;

            return is;
        }
    }, {
        key: "logout",
        value: function logout() {
            //        this._AuthService.signout();
            //
            //        this.welcome = '';
            //        this.message = '';
            //        this.isAuthenticated = false;
        }
    }, {
        key: "callRestricted",
        value: function callRestricted() {
            var _this3 = this;

            this._$http({
                url: 'http://localhost:8000/protected/restricted',
                method: 'GET'
            }).success(function (data, status, headers, config) {
                _this3.message = _this3.message + ' ' + data.name; // Should log 'foo'
            }).error(function (data, status, headers, config) {
                alert(status + ": " + data);
            });
        }
    }]);

    return AuthController;
}();

},{}],13:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.authInterceptor = authInterceptor;
function authInterceptor($rootScope, $q, $window) {
    return {
        request: function request(config) {
            config.headers = config.headers || {};
            if ($window.localStorage.token) {
                config.headers.Authorization = "Bearer " + $window.localStorage.token;
            }
            return config;
        },
        responseError: function responseError(rejection) {
            if (rejection.status === 401) {
                // handle the case where the user is not authenticated
            }
            return $q.reject(rejection);
        }
    };
};

},{}],14:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * @ngdoc service
 * @name Auth.service:AuthService
 * @description Service for Auth module.
 */
var AuthService = exports.AuthService = function () {
    AuthService.$inject = ["$http", "$window", "$q", "MainAppConstant"];
    function AuthService($http, $window, $q, MainAppConstant) {
        "ngInject";

        _classCallCheck(this, AuthService);

        this._$http = $http;
        this._$q = $q;
        this.localStorage = $window.localStorage;
        this._MainAppConstant = MainAppConstant;
    }

    _createClass(AuthService, [{
        key: "signin",
        value: function signin(shortcutUsername, password) {
            var _this = this;

            var username = this.getUsernameFromShortcut(shortcutUsername);console.log(username);
            var deferred = this._$q.defer();
            this._$http.post(this._MainAppConstant.apiPath + '/authenticate', { username: username, password: password }).then(function (respond) {
                _this.localStorage.token = respond.data.token;

                deferred.resolve();
            }, function (reason) {
                delete _this.localStorage.token;

                deferred.reject(reason.data);
            });
            return deferred.promise;
        }
    }, {
        key: "getUsernameFromShortcut",
        value: function getUsernameFromShortcut(shortcutName) {
            var user = void 0,
                domain = void 0;

            var indSymbol = -1;
            var posSymbol = -1;

            var listSymbol = ["@", "#", "$"];

            listSymbol.forEach(function (symbol, i) {
                if (shortcutName.includes(symbol)) {
                    if (indSymbol == -1 || shortcutName.indexOf(symbol) < posSymbol) {
                        indSymbol = i;
                        posSymbol = shortcutName.indexOf(symbol);
                    }
                }
            });

            if (indSymbol == -1) {
                user = shortcutName;
                domain = "muime.com";
            } else {
                user = shortcutName.substring(0, shortcutName.indexOf(listSymbol[indSymbol]));
                domain = function getDomainFromPart(partName) {
                    if (partName == '') {
                        return "muime.com";
                    } else if (partName.indexOf(".") < 0) {
                        return partName.toLowerCase() + ".com";
                    } else if (partName.substring(partName.indexOf(".") + 1) == "") {
                        return partName.toLowerCase() + "com";
                    } else {
                        return partName.toLowerCase();
                    }
                }(shortcutName.substring(shortcutName.indexOf(listSymbol[indSymbol]) + 1));
            }

            return user + "@" + domain;
        }

        //    signin(username, password) {
        //        let deferred = this._$q.defer();
        //        this._$http.post(this._MainAppConstant.apiPath+'/authenticate', { username, password }).then(
        //            (respond) => {
        //                this.localStorage.token = respond.data.token;
        //
        //                deferred.resolve();
        //            },
        //            (reason) => {
        //                delete this.localStorage.token;
        //
        //                deferred.reject(reason.data);
        //            }
        //        );
        //        return deferred.promise;
        //    }

        //    checkLogin() {
        //        var valid_user, valid_pass, domain;
        //
        //        var listSymbol = ["@", "#", "$"];
        //        var list_menuname = ["mail", "contacts", "calendar"];
        //        var indSymbol = -1;
        //        var posSymbol = -1;
        //        for (i = 0; i < listSymbol.length; i++) {
        //            if (user.value.contains(listSymbol[i])) {
        //                if (indSymbol == -1 || user.value.indexOf(listSymbol[i]) < posSymbol) {
        //                    indSymbol = i;
        //                    posSymbol = user.value.indexOf(listSymbol[i]);
        //                }
        //            }
        //        }
        //
        //        if (indSymbol == -1) {
        //            valid_user = (["i", "a", "ta", "s"].indexOf(user.value.toLowerCase()) >= 0 || (user.value.length >= 4 && user.value.length <= 15));
        //            domain = "muime.com";
        //        } else {
        //            var usr_part = user.value.substring(0, user.value.indexOf(listSymbol[indSymbol]));
        //            var domain_part = user.value.substring(user.value.indexOf(listSymbol[indSymbol]) + 1);
        //
        //            valid_user = (["i", "a", "ta", "s"].indexOf(usr_part.toLowerCase()) >= 0 || (usr_part.length >= 4 && usr_part.length <= 15));
        //            if (domain_part == '') {
        //                domain = "muime.com";
        //            } else if (domain_part.indexOf(".") < 0) {
        //                domain = domain_part.toLowerCase() + ".com";
        //            } else if (domain_part.substring(domain_part.indexOf(".") + 1) == "") {
        //                domain = domain_part.toLowerCase() + "com";
        //            } else {
        //                domain = domain_part.toLowerCase();
        //            }
        //        }
        //        valid_pass = (pass.value.length >= 6);
        //
        //        if (valid_user && valid_pass) {
        //            bt_enter.setStyle('visibility', 'hidden');
        //            var user_value = (indSymbol == -1) ? user.value : usr_part;
        //            var pass_value = pass.value;
        //            var tween_loading = new Fx.Tween(loading, {
        //                duration: 1000,
        //                property: 'visibility',
        //                onComplete: function () {
        //                    new Request({
        //                        url: 'ajax_login.php',
        //                        method: 'post',
        //                        data: 'do=login&user=' + user_value + '&pass=' + encodeURIComponent(pass_value) + '&domain=' + domain,
        //                        onSuccess: function (resp_txt) {
        //                            var found = resp_txt;
        //                            if (found) {
        //                                var url_go = "/main#";
        //                                if (indSymbol == -1) {
        //                                    url_go += list_menuname[0];
        //                                } else url_go += list_menuname[indSymbol];
        //                                window.location.assign(url_go);
        //                            } else {
        //                                pass_bg.setStyle('visibility', 'visible');
        //                                pass.value = '';
        //                                showErrDiag("login");
        //                            }
        //                        },
        //                        onFailure: function () {
        //                            pass_bg.setStyle('visibility', 'visible');
        //                            pass.value = '';
        //                            showErrDiag("network");
        //                        }
        //                    }).send();
        //                }
        //            });
        //            tween_loading.start('visible');
        //        } else {
        //            pass_bg.setStyle('visibility', 'visible');
        //            pass.value = '';
        //            showErrDiag("login");
        //        }
        //    }

    }, {
        key: "signout",
        value: function signout() {
            delete this.localStorage.token;
        }
    }, {
        key: "isSignedIn",
        value: function isSignedIn() {
            return this.localStorage.token != null;
        }
    }, {
        key: "isRequireAuthenForView",
        value: function isRequireAuthenForView(view) {
            //alert(Object.keys(view));
            if (view.data.authenticate == undefined) {
                return false;
            }
            return view.data.authenticate;
        }
    }, {
        key: "hasPermissionForView",
        value: function hasPermissionForView(view) {
            var _this2 = this;

            if (!view.data.permissions || !view.data.permissions.length) {
                return true;
            }

            var found = false;
            angular.forEach(view.data.permissions, function (permission) {
                if (_this2.profile.permissions.indexOf(permission) >= 0) {
                    found = true;
                    return;
                }
            });
            return found;
        }
    }, {
        key: "userHasPermission",
        value: function userHasPermission(permissions) {
            var _this3 = this;

            var found = false;
            angular.forEach(permissions, function (permission) {
                if (_this3.profile.permissions.indexOf(permission) >= 0) {
                    found = true;
                    return;
                }
            });
            return found;
        }
    }, {
        key: "profile",
        get: function get() {
            //this is used to parse the profile
            function url_base64_decode(str) {
                var output = str.replace('-', '+').replace('_', '/');
                switch (output.length % 4) {
                    case 0:
                        break;
                    case 2:
                        output += '==';
                        break;
                    case 3:
                        output += '=';
                        break;
                    default:
                        throw 'Illegal base64url string!';
                }
                return window.atob(output); //polifyll https://github.com/davidchambers/Base64.js
            }

            var encodedProfile = this.localStorage.token.split('.')[1];
            var profile = JSON.parse(url_base64_decode(encodedProfile));

            return profile;
        }
    }]);

    return AuthService;
}();

},{}],15:[function(require,module,exports){
"use strict";

var _auth = require("./auth.config");

var _auth2 = require("./auth.service");

var _auth3 = require("./auth.interceptor");

var _auth4 = require("./auth.controller");

/**
 * @ngdoc overview
 * @name Auth
 *
 * @description
 * #Description
 * Module for Auth page.
 */
angular.module("Auth").config(_auth.AuthConfig).service("AuthService", _auth2.AuthService).factory("authInterceptor", _auth3.authInterceptor).controller("AuthController", _auth4.AuthController);

},{"./auth.config":11,"./auth.controller":12,"./auth.interceptor":13,"./auth.service":14}],16:[function(require,module,exports){
"use strict";

CartConfig.$inject = ["$stateProvider"];
Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.CartConfig = CartConfig;
function CartConfig($stateProvider) {
    "ngInject";

    $stateProvider.state("main.cart", {
        url: "/cart",
        title: "Cart",
        data: {
            css: "/css/cart/cart.css",
            authenticate: true,
            permissions: ["restricted"]
        },
        views: {
            "top": {
                templateUrl: "modules/cart/cart-top.html",
                controller: "CartTopController",
                controllerAs: "cart"

            },
            "left": {
                templateUrl: "modules/cart/cart-left.html",
                controller: "CartLeftController",
                controllerAs: "cart"

            },
            "center": {
                templateUrl: "modules/cart/cart-center.html",
                controller: "CartCenterController",
                controllerAs: "cart"

            },
            "right": {
                templateUrl: "modules/cart/cart-right.html",
                controller: "CartRightController",
                controllerAs: "cart"

            }

        }

    });
};

},{}],17:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * @ngdoc controller
 * @name Cart.controller:CartController
 * @description Controller for Cart module.
 */
var CartTopController = exports.CartTopController = function CartTopController() {
    "ngInject";

    _classCallCheck(this, CartTopController);
};

var CartLeftController = exports.CartLeftController = function CartLeftController() {
    "ngInject";

    _classCallCheck(this, CartLeftController);
};

var CartCenterController = exports.CartCenterController = function CartCenterController() {
    "ngInject";

    _classCallCheck(this, CartCenterController);
};

var CartRightController = exports.CartRightController = function CartRightController() {
    "ngInject";

    _classCallCheck(this, CartRightController);
};

},{}],18:[function(require,module,exports){
"use strict";

var _cart = require("./cart.config");

var _cart2 = require("./cart.controller");

angular.module("Cart").config(_cart.CartConfig).controller("CartTopController", _cart2.CartTopController).controller("CartLeftController", _cart2.CartLeftController).controller("CartCenterController", _cart2.CartCenterController).controller("CartRightController", _cart2.CartRightController);

},{"./cart.config":16,"./cart.controller":17}],19:[function(require,module,exports){
"use strict";

CommunityConfig.$inject = ["$stateProvider"];
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.CommunityConfig = CommunityConfig;
function CommunityConfig($stateProvider) {
  "ngInject";

  $stateProvider.state("main.community", {
    url: "/community",
    title: "Community",
    data: {
      css: "/css/community/community.css",
      authenticate: true,
      permissions: ["restricted"]
    },
    views: {
      "top": {
        templateUrl: "modules/community/community-top.html",
        controller: "CommunityTopController",
        controllerAs: "community"

      },
      "left": {
        templateUrl: "modules/community/community-left.html",
        controller: "CommunityLeftController",
        controllerAs: "community"

      },
      "center": {
        templateUrl: "modules/community/community-center.html",
        controller: "CommunityCenterController",
        controllerAs: "community"

      },
      "right": {
        templateUrl: "modules/community/community-right.html",
        controller: "CommunityRightController",
        controllerAs: "community"

      }

    }

  });
};

},{}],20:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * @ngdoc controller
 * @name Community.controller:CommunityController
 * @description Controller for Community module.
 */
var CommunityTopController = exports.CommunityTopController = function CommunityTopController() {
    "ngInject";

    _classCallCheck(this, CommunityTopController);
};

var CommunityLeftController = exports.CommunityLeftController = function CommunityLeftController() {
    "ngInject";

    _classCallCheck(this, CommunityLeftController);
};

var CommunityCenterController = exports.CommunityCenterController = function CommunityCenterController() {
    "ngInject";

    _classCallCheck(this, CommunityCenterController);
};

var CommunityRightController = exports.CommunityRightController = function CommunityRightController() {
    "ngInject";

    _classCallCheck(this, CommunityRightController);
};

},{}],21:[function(require,module,exports){
"use strict";

var _community = require("./community.config");

var _community2 = require("./community.controller");

angular.module("Community").config(_community.CommunityConfig).controller("CommunityTopController", _community2.CommunityTopController).controller("CommunityLeftController", _community2.CommunityLeftController).controller("CommunityCenterController", _community2.CommunityCenterController).controller("CommunityRightController", _community2.CommunityRightController);

},{"./community.config":19,"./community.controller":20}],22:[function(require,module,exports){
"use strict";

DowntownConfig.$inject = ["$stateProvider"];
Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.DowntownConfig = DowntownConfig;
function DowntownConfig($stateProvider) {
    "ngInject";

    $stateProvider.state("main.downtown", {
        url: "/downtown",
        title: "Downtown",
        data: {
            css: "/css/downtown/downtown.css",
            authenticate: false
        },
        views: {
            "top": {
                templateUrl: "modules/downtown/downtown-top.html",
                controller: "DowntownTopController",
                controllerAs: "downtown"

            },
            "left": {
                templateUrl: "modules/downtown/downtown-left.html",
                controller: "DowntownLeftController",
                controllerAs: "downtown"

            },
            "center": {
                templateUrl: "modules/downtown/downtown-center.html",
                controller: "DowntownCenterController",
                controllerAs: "downtown"

            },
            "right": {
                templateUrl: "modules/downtown/downtown-right.html",
                controller: "DowntownRightController",
                controllerAs: "downtown"

            }

        }

    });
};

},{}],23:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * @ngdoc controller
 * @name Downtown.controller:DowntownController
 * @description Controller for Downtown module.
 */
var DowntownTopController = exports.DowntownTopController = function DowntownTopController() {
    "ngInject";

    _classCallCheck(this, DowntownTopController);
};

var DowntownLeftController = exports.DowntownLeftController = function DowntownLeftController() {
    "ngInject";

    _classCallCheck(this, DowntownLeftController);
};

var DowntownCenterController = exports.DowntownCenterController = function DowntownCenterController() {
    "ngInject";

    _classCallCheck(this, DowntownCenterController);
};

var DowntownRightController = exports.DowntownRightController = function DowntownRightController() {
    "ngInject";

    _classCallCheck(this, DowntownRightController);
};

},{}],24:[function(require,module,exports){
"use strict";

var _downtown = require("./downtown.config");

var _downtown2 = require("./downtown.controller");

angular.module("Downtown").config(_downtown.DowntownConfig).controller("DowntownTopController", _downtown2.DowntownTopController).controller("DowntownLeftController", _downtown2.DowntownLeftController).controller("DowntownCenterController", _downtown2.DowntownCenterController).controller("DowntownRightController", _downtown2.DowntownRightController);

function openCity(evt, cityName) {
    var i, tabcontent, tablinks;
    tabcontent = document.getElementsByClassName("tabcontent");
    for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
    }
    tablinks = document.getElementsByClassName("tablinks");
    for (i = 0; i < tablinks.length; i++) {
        tablinks[i].className = tablinks[i].className.replace(" active", "");
    }
    document.getElementById(cityName).style.display = "block";
    evt.currentTarget.className += " active";
}

},{"./downtown.config":22,"./downtown.controller":23}],25:[function(require,module,exports){
"use strict";

HelpConfig.$inject = ["$stateProvider"];
Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.HelpConfig = HelpConfig;
function HelpConfig($stateProvider) {
    "ngInject";

    $stateProvider.state("main.help", {
        url: "/help",
        title: "Help",
        data: {
            css: "/css/help/help.css",
            authenticate: false
        },
        views: {

            "top": {
                templateUrl: "modules/help/help-top.html",
                controller: "HelpTopController",
                controllerAs: "help"
            },
            "left": {
                templateUrl: "modules/help/help-left.html",
                controller: "HelpLeftController",
                controllerAs: "help"
            },
            "center": {
                templateUrl: "modules/help/help-center.html",
                controller: "HelpCenterController",
                controllerAs: "help"

            },
            "right": {
                templateUrl: "modules/help/help-right.html",
                controller: "HelpRightController",
                controllerAs: "help"

            }

        }

    });
};

},{}],26:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * @ngdoc controller
 * @name Help.controller:HelpController
 * @description Controller for Help module.
 */
var HelpTopController = exports.HelpTopController = function HelpTopController() {
    "ngInject";

    _classCallCheck(this, HelpTopController);
};

var HelpLeftController = exports.HelpLeftController = function HelpLeftController() {
    "ngInject";

    _classCallCheck(this, HelpLeftController);
};

var HelpCenterController = exports.HelpCenterController = function HelpCenterController() {
    "ngInject";

    _classCallCheck(this, HelpCenterController);
};

var HelpRightController = exports.HelpRightController = function HelpRightController() {
    "ngInject";

    _classCallCheck(this, HelpRightController);
};

},{}],27:[function(require,module,exports){
"use strict";

var _help = require("./help.config");

var _help2 = require("./help.controller");

angular.module("Help").config(_help.HelpConfig).controller("HelpTopController", _help2.HelpTopController).controller("HelpLeftController", _help2.HelpLeftController).controller("HelpCenterController", _help2.HelpCenterController).controller("HelpRightController", _help2.HelpRightController);

},{"./help.config":25,"./help.controller":26}],28:[function(require,module,exports){
"use strict";

HomeConfig.$inject = ["$stateProvider"];
Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.HomeConfig = HomeConfig;
function HomeConfig($stateProvider) {
    "ngInject";

    $stateProvider.state("main.home", {
        url: "/home",
        title: "Home",
        data: {
            css: "/css/home/home.css",
            authenticate: true,
            permissions: ["restricted"]
        },
        views: {
            "top": {
                templateUrl: "modules/home/home-top.html",
                controller: "HomeTopController",
                controllerAs: "home"

            },
            "left": {
                templateUrl: "modules/home/home-left.html",
                controller: "HomeLeftController",
                controllerAs: "home"

            },
            "center": {
                templateUrl: "modules/home/home-center.html",
                controller: "HomeCenterController",
                controllerAs: "home"

            },
            "right": {
                templateUrl: "modules/home/home-right.html",
                controller: "HomeRightController",
                controllerAs: "home"

            }
        }

    });
};

},{}],29:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * @ngdoc controller
 * @name Home.controller:HomeController
 * @description Controller for Home module.
 */
var HomeTopController = exports.HomeTopController = function HomeTopController() {
    "ngInject";

    _classCallCheck(this, HomeTopController);
};

var HomeLeftController = exports.HomeLeftController = function HomeLeftController() {
    "ngInject";

    _classCallCheck(this, HomeLeftController);
};

var HomeCenterController = exports.HomeCenterController = function HomeCenterController() {
    "ngInject";

    _classCallCheck(this, HomeCenterController);
};

var HomeRightController = exports.HomeRightController = function HomeRightController() {
    "ngInject";

    _classCallCheck(this, HomeRightController);
};

},{}],30:[function(require,module,exports){
"use strict";

var _home = require("./home.config");

var _home2 = require("./home.controller");

angular.module("Home").config(_home.HomeConfig).controller("HomeTopController", _home2.HomeTopController).controller("HomeLeftController", _home2.HomeLeftController).controller("HomeCenterController", _home2.HomeCenterController).controller("HomeRightController", _home2.HomeRightController);

//(function(){
//
//  var chat = {
//    messageToSend: '',
//    messageResponses: [
//      'Why did the web developer leave the restaurant? Because of the table layout.',
//      'How do you comfort a JavaScript bug? You console it.',
//      'An SQL query enters a bar, approaches two tables and asks: "May I join you?"',
//      'What is the most used language in programming? Profanity.',
//      'What is the object-oriented way to become wealthy? Inheritance.',
//      'An SEO expert walks into a bar, bars, pub, tavern, public house, Irish pub, drinks, beer, alcohol'
//    ],
//    init: function() {
//      this.cacheDOM();
//      this.bindEvents();
//      this.render();
//    },
//    cacheDOM: function() {
//      this.$chatHistory = $('.chat-history');
//      this.$button = $('button');
//      this.$textarea = $('#message-to-send');
//      this.$chatHistoryList =  this.$chatHistory.find('ul');
//    },
//    bindEvents: function() {
//      this.$button.on('click', this.addMessage.bind(this));
//      this.$textarea.on('keyup', this.addMessageEnter.bind(this));
//    },
//    render: function() {
//      this.scrollToBottom();
//      if (this.messageToSend.trim() !== '') {
//        var template = Handlebars.compile( $("#message-template").html());
//        var context = {
//          messageOutput: this.messageToSend,
//          time: this.getCurrentTime()
//        };
//
//        this.$chatHistoryList.append(template(context));
//        this.scrollToBottom();
//        this.$textarea.val('');
//
//        // responses
//        var templateResponse = Handlebars.compile( $("#message-response-template").html());
//        var contextResponse = {
//          response: this.getRandomItem(this.messageResponses),
//          time: this.getCurrentTime()
//        };
//
//        setTimeout(function() {
//          this.$chatHistoryList.append(templateResponse(contextResponse));
//          this.scrollToBottom();
//        }.bind(this), 1500);
//
//      }
//
//    },
//
//    addMessage: function() {
//      this.messageToSend = this.$textarea.val()
//      this.render();
//    },
//    addMessageEnter: function(event) {
//        // enter was pressed
//        if (event.keyCode === 13) {
//          this.addMessage();
//        }
//    },
//    scrollToBottom: function() {
//       this.$chatHistory.scrollTop(this.$chatHistory[0].scrollHeight);
//    },
//    getCurrentTime: function() {
//      return new Date().toLocaleTimeString().
//              replace(/([\d]+:[\d]{2})(:[\d]{2})(.*)/, "$1$3");
//    },
//    getRandomItem: function(arr) {
//      return arr[Math.floor(Math.random()*arr.length)];
//    }
//
//  };
//
//  chat.init();
//
//  var searchFilter = {
//    options: { valueNames: ['name'] },
//    init: function() {
//      var userList = new List('people-list', this.options);
//      var noItems = $('<li id="no-items-found">No items found</li>');
//
//      userList.on('updated', function(list) {
//        if (list.matchingItems.length === 0) {
//          $(list.list).append(noItems);
//        } else {
//          noItems.detach();
//        }
//      });
//    }
//  };
//
//  searchFilter.init();
//
//})();

},{"./home.config":28,"./home.controller":29}],31:[function(require,module,exports){
"use strict";

angular.module("MainApp", ["uiRouterStyles", "templates", "Home", "Cart", "Community", "Downtown", "Help", "Search", "Setting", "Signin", "Auth", "Directives", "Signout", "User"]);

angular.module("Home", []);
angular.module("Cart", []);
angular.module("Community", []);
angular.module("Downtown", []);
angular.module("Help", []);
angular.module("Search", []);
angular.module("Setting", []);
angular.module("Signin", []);

angular.module("Auth", []);

angular.module("Directives", []);
angular.module("Signout", []);
angular.module("User", []);

},{}],32:[function(require,module,exports){
"use strict";

var _search = require("./search.config");

var _search2 = require("./search.controller");

angular.module("Search").config(_search.SearchConfig).controller("SearchController", _search2.SearchController);

//$(document).ready(function() {
//
//  var $searchc = $(".searchc"),
//      $input = $(".searchc-input"),
//      $close = $(".searchc-close"),
//      $svg = $(".searchc-svg"),
//      $path = $(".searchc-svg__path")[0],
//      initD = $svg.data("init"),
//      midD = $svg.data("mid"),
//      finalD = $svg.data("active"),
//      backDelay = 400,
//      midAnim = 200,
//      bigAnim = 400,
//      animating = false;
//
//  $(document).on("click", ".searchc:not(.active)", function() {
//    if (animating) return;
//    animating = true;
//    $searchc.addClass("active");
//
//    Snap($path).animate({"path": midD}, midAnim, mina.backin, function() {
//      Snap($path).animate({"path": finalD}, bigAnim, mina.easeinout, function() {
//        $input.addClass("visible");
//        $input.focus();
//        $close.addClass("visible");
//        animating = false;
//      });
//    });
//
//  });
//
//  $(document).on("click", ".searchc-close", function() {
//    if (animating) return;
//    animating = true;
//    $input.removeClass("visible");
//    $close.removeClass("visible");
//    $searchc.removeClass("active");
//
//    setTimeout(function() {
//      Snap($path).animate({"path": midD}, bigAnim, mina.easeinout, function() {
//        Snap($path).animate({"path": initD}, midAnim, mina.easeinout, function() {
//          animating = false;
//        });
//      });
//    }, backDelay);
//  });
//
//});
//

},{"./search.config":33,"./search.controller":34}],33:[function(require,module,exports){
"use strict";

SearchConfig.$inject = ["$stateProvider"];
Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.SearchConfig = SearchConfig;
function SearchConfig($stateProvider) {
    "ngInject";

    $stateProvider.state("main.search", {
        url: "/search",
        title: "Search",
        data: {
            css: "/css/search/search.css",
            authenticate: false,
            permissions: ["restricted"]
        },
        views: {

            "top": {
                templateUrl: "modules/search/search-top.html",
                controller: "SearchTopController",
                controllerAs: "search"

            },
            "left": {
                templateUrl: "modules/search/search-left.html",
                controller: "SearchLeftController",
                controllerAs: "search"

            },
            "center": {
                templateUrl: "modules/search/search-center.html",
                controller: "SearchCenterController",
                controllerAs: "search"

            },
            "right": {
                templateUrl: "modules/search/search-right.html",
                controller: "SearchRightController",
                controllerAs: "search"

            }
        }

    });
};

},{}],34:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * @ngdoc controller
 * @name Search.controller:SearchController
 * @description Controller for Search module.
 */
var SearchTopController = exports.SearchTopController = function SearchTopController() {
    "ngInject";

    _classCallCheck(this, SearchTopController);
};

var SearchLeftController = exports.SearchLeftController = function SearchLeftController() {
    "ngInject";

    _classCallCheck(this, SearchLeftController);
};

var SearchCenterController = exports.SearchCenterController = function SearchCenterController() {
    "ngInject";

    _classCallCheck(this, SearchCenterController);
};

var SearchRightController = exports.SearchRightController = function SearchRightController() {
    "ngInject";

    _classCallCheck(this, SearchRightController);
};

},{}],35:[function(require,module,exports){
"use strict";

var _setting = require("./setting.config");

var _setting2 = require("./setting.controller");

angular.module("Setting").config(_setting.SettingConfig).controller("SettingTopController", _setting2.SettingTopController).controller("SettingLeftController", _setting2.SettingLeftController).controller("SettingCenterController", _setting2.SettingCenterController).controller("SettingRightController", _setting2.SettingRightController);

},{"./setting.config":36,"./setting.controller":37}],36:[function(require,module,exports){
"use strict";

SettingConfig.$inject = ["$stateProvider"];
Object.defineProperty(exports, "__esModule", {
        value: true
});
exports.SettingConfig = SettingConfig;
function SettingConfig($stateProvider) {
        "ngInject";

        $stateProvider.state("main.setting", {
                url: "/setting",
                title: "Setting",
                data: {
                        css: "/css/setting/setting.css",
                        authenticate: true,
                        permissions: ["restricted"]
                },
                views: {

                        "top": {
                                templateUrl: "modules/setting/setting-top.html",
                                controller: "SettingTopController",
                                controllerAs: "setting"

                        },
                        "left": {
                                templateUrl: "modules/setting/setting-left.html",
                                controller: "SettingLeftController",
                                controllerAs: "setting"

                        },
                        "center": {
                                templateUrl: "modules/setting/setting-center.html",
                                controller: "SettingCenterController",
                                controllerAs: "setting"

                        },
                        "right": {
                                templateUrl: "modules/setting/setting-right.html",
                                controller: "SettingRightController",
                                controllerAs: "setting"

                        }

                }

        });
};

},{}],37:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * @ngdoc controller
 * @name Setting.controller:SettingController
 * @description Controller for Setting module.
 */
var SettingTopController = exports.SettingTopController = function SettingTopController() {
    "ngInject";

    _classCallCheck(this, SettingTopController);
};

var SettingLeftController = exports.SettingLeftController = function SettingLeftController() {
    "ngInject";

    _classCallCheck(this, SettingLeftController);
};

var SettingCenterController = exports.SettingCenterController = function SettingCenterController() {
    "ngInject";

    _classCallCheck(this, SettingCenterController);
};

var SettingRightController = exports.SettingRightController = function SettingRightController() {
    "ngInject";

    _classCallCheck(this, SettingRightController);
};

},{}],38:[function(require,module,exports){
"use strict";

var _signin = require("./signin.config");

var _signin2 = require("./signin.controller");

angular.module("Signin").config(_signin.SigninConfig).controller("SigninController", _signin2.SigninController);

},{"./signin.config":39,"./signin.controller":40}],39:[function(require,module,exports){
"use strict";

SigninConfig.$inject = ["$stateProvider"];
Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.SigninConfig = SigninConfig;
function SigninConfig($stateProvider) {
    "ngInject";

    $stateProvider.state("signin", {
        url: "/signin",
        templateUrl: "modules/signin/signin.html",
        controller: "SigninController",
        controllerAs: "signin",
        title: "Signin",
        data: {
            css: "/css/signin/signin.css",
            authenticate: true,
            permissions: ["restricted"]

        }
    });
};

},{}],40:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * @ngdoc controller
 * @name Signin.controller:SigninController
 * @description Controller for Singin module.
 */

var SigninController = exports.SigninController = function () {
    SigninController.$inject = ["AuthService"];
    function SigninController(AuthService) {
        "ngInject";

        _classCallCheck(this, SigninController);

        this._AuthService = AuthService;
        this.user = {
            username: 'praewrung',
            password: 'prawrung'
        };
        // alert("a");


        //this.isAuthenticated = false;
        //this.welcome = '';
        //this.message = '';
    }

    _createClass(SigninController, [{
        key: 'submit',
        value: function submit() {
            //        this._AuthService.signin(this.user.username, this.user.password).then(
            //            () => {
            //                this.isAuthenticated = true;
            //
            //                let profile = this._AuthService.profile;
            //                this.welcome = 'Welcome ' + profile.first_name + ' ' + profile.last_name;
            //            },
            //            (data) => {
            //                // Erase the token if the user fails to log in
            //                this.isAuthenticated = false;
            //
            //                // Handle login errors here
            //                this.error = 'Error: '+data;
            //                this.welcome = '';
            //            }
            //        );


            if (this.user.username == "praewrung") {
                if (this.user.password == "prawrung") {
                    window.location.href = "/home";
                } else {
                    alert("Invalid Password");
                }
            } else {
                alert("Invalid UserID");
            }
        }
    }]);

    return SigninController;
}();

//alert("a");
//function passuser() {
//    alert("b");
//    if (this.username.value=="praewrung")
//    {
//        if (form.password.value=="prawrung")
//        {
//            location="main.home"
//        }
//        else
//        {
//            alert("Invalid Password")
//        }
//    }
//    else
//    {  alert("Invalid UserID")
//    }
//}

},{}],41:[function(require,module,exports){
"use strict";

var _signout = require("./signout.config");

var _signout2 = require("./signout.controller");

angular.module("Signout").config(_signout.SignoutConfig).controller("SignoutController", _signout2.SignoutController);

},{"./signout.config":42,"./signout.controller":43}],42:[function(require,module,exports){
"use strict";

SignoutConfig.$inject = ["$stateProvider"];
Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.SignoutConfig = SignoutConfig;
function SignoutConfig($stateProvider) {
    "ngInject";

    $stateProvider.state("signout", {
        url: "/signout",
        templateUrl: "modules/signout/signout.html",
        controller: "SignoutController",
        controllerAs: "signout",
        title: "Signin",
        data: {
            css: "/css/signout/signout.css",
            authenticate: true
        }
    });
};

},{}],43:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var SignoutController = exports.SignoutController = ["$window", "$location", function SignoutController($window, $location) {
    "ngInject";

    _classCallCheck(this, SignoutController);

    delete $window.localStorage.token;

    $location.path("/downtown");
}];

},{}],44:[function(require,module,exports){
'use strict';angular.module('templates',[]).run(['$templateCache',function($templateCache){$templateCache.put('modules/(main-app)/main.html','<div class="row">\n\n\n    <div class="col-md-9">\n        <div ui-view="top" class="pagetop col-md-12">\n\n        </div>\n        <div ui-view="left" class="pageleft col-xs-9 col-sm-2 col-md-3">\n\n        </div>\n        <div ui-view="center" class="pagecenter col-xs-12 col-sm-8 col-md-9">\n\n        </div>\n    </div>\n\n    <div class="col-md-3 col-sm-3 col-xs-12">\n        <div ui-view="right" class="pageright col-xs-9 col-sm-2 col-md-12">\n\n        </div>\n    </div>\n\n</div>\n\n\n');$templateCache.put('modules/auth/activate.html','<div>\n\n    <div class="top-content">\n        \t\n            <div class="inner-bg">\n                <div class="container">\n                \t\n                    <div class="row">\n                        <div class="col-sm-8 col-sm-offset-2 text">\n\n                                <span>คุณได้ลงทะเบียนเรียบแล้ว สามารถเข้าระบบได้ทันที</span>\n                                <button>Sign in</button>\n                        </div>\n                    </div>\n                    \n                    \n                    \n                </div>\n            </div>\n            \n        </div>\n\n</div>\n');$templateCache.put('modules/auth/auth.html','<!--\r\n<div class="jumbotron text-center">\r\n    <span ng-show="auth.isAuthenticated">{{auth.welcome}}</span>\r\n    <form ng-show="!auth.isAuthenticated" ng-submit="auth.submit()">\r\n        <input ng-model="auth.user.username" type="text" name="user" placeholder="Username" />\r\n        <input ng-model="auth.user.password" type="password" name="pass" placeholder="Password" />\r\n        <input type="submit" value="Login" />\r\n    </form>\r\n    <div>{{auth.error}}</div>\r\n    <div ng-show="auth.isAuthenticated">\r\n        <a ng-click="auth.callRestricted()" href="">Shh, this is private!</a>\r\n        <br>\r\n        <div>{{auth.message}}</div>\r\n        <a ng-click="auth.logout()" href="">Logout</a>\r\n    </div>\r\n</div>\r\n-->\r\n\r\n\r\n\r\n\r\n<div>\r\n\r\n    <div class="top-content">\r\n        \t\r\n            <div class="inner-bg">\r\n                <div class="container">\r\n                \r\n<!--        show on mobile and tablet        \t-->\r\n                    <div class="row bodypadding visible-sm visible-xs hidden-md hidden-lg">\r\n                        <div class="col-md-6 col-md-offset-3">\r\n                            <div class="panel panel-login">\r\n                                <div class="panel-heading">\r\n                                    <div class="row">\r\n                                        <div class="col-xs-6">\r\n                                            <a href="#" class="active" id="login-form-link">Login</a>\r\n                                        </div>\r\n                                        <div class="col-xs-6">\r\n                                            <a href="#" id="register-form-link">Register</a>\r\n                                        </div>\r\n                                    </div>\r\n                                    <hr>\r\n                                </div>\r\n                                <div class="panel-body">\r\n                                    <div class="row">\r\n                                        <div class="col-lg-12">\r\n                                            <form name="signinForm" role="form" method="post" class="login-form" ng-submit="auth.signin()" novalidate id="login-form" style="display: block;">\r\n                                                <div class="form-group">\r\n                                                    <input type="text" name="username" id="username" tabindex="1" class="form-control" placeholder="Username" value="">\r\n                                                </div>\r\n                                                <div class="form-group">\r\n                                                    <input type="password" name="password" id="password" tabindex="2" class="form-control" placeholder="Password">\r\n                                                </div>\r\n                                                <div class="form-group text-center">\r\n                                                    <input type="checkbox" tabindex="3" class="" name="remember" id="remember">\r\n                                                    <label for="remember"> Remember Me</label>\r\n                                                </div>\r\n                                                <div class="form-group">\r\n                                                    <div class="row">\r\n                                                        <div class="col-sm-6 col-sm-offset-3">\r\n                                                            <button type="submit" name="login-submit" id="login-submit" tabindex="4" class="btn btn-login" value="Login" ng-disabled="signinForm.$invalid">Sign in!</button>\r\n                                                        </div>\r\n                                                    </div>\r\n                                                </div>\r\n                                                <div class="form-group">\r\n                                                    <div class="row">\r\n                                                        <div class="col-lg-12">\r\n                                                            <div class="text-center">\r\n                                                                <a href="http://phpoll.com/recover" tabindex="5" class="forgot-password">Forgot Password?</a>\r\n                                                            </div>\r\n                                                        </div>\r\n                                                    </div>\r\n                                                </div>\r\n                                            </form>\r\n                                            \r\n<!--\r\n                                            <form id="register-form" action="http://phpoll.com/register/process" method="post" role="form" style="display: none;">\r\n                                                <div class="form-group">\r\n                                                    <input type="text" name="username" id="username" tabindex="1" class="form-control" placeholder="Username" value="">\r\n                                                </div>\r\n                                                <div class="form-group">\r\n                                                    <input type="email" name="email" id="email" tabindex="1" class="form-control" placeholder="Email Address" value="">\r\n                                                </div>\r\n                                                <div class="form-group">\r\n                                                    <input type="password" name="password" id="password" tabindex="2" class="form-control" placeholder="Password">\r\n                                                </div>\r\n                                                <div class="form-group">\r\n                                                    <input type="password" name="confirm-password" id="confirm-password" tabindex="2" class="form-control" placeholder="Confirm Password">\r\n                                                </div>\r\n                                                <div class="form-group">\r\n                                                    <div class="row">\r\n                                                        <div class="col-sm-6 col-sm-offset-3">\r\n                                                            <input type="submit" name="register-submit" id="register-submit" tabindex="4" class="form-control btn btn-register" value="Register Now">\r\n                                                        </div>\r\n                                                    </div>\r\n                                                </div>\r\n                                            </form>\r\n-->\r\n                                            \r\n                                            \r\n                                            \r\n                                            <form id="register-form" name="signupForm" method="post" ng-submit="auth.signup()" style="display: none;" novalidate>\r\n                                                <div class="form-group" ng-class="{ \'has-error\': signupForm.firstname.$dirty && signupForm.firstname.$invalid }">\r\n                                                    <label class="sr-only" for="form-first-name">First name</label>\r\n                                                    <input type="text" name="firstname" placeholder="First name..." class="form-first-name form-control" id="firstname" ng-model="auth.user.firstname" ng-model-options="{ updateOn: \'blur\' }" required>\r\n                                                    <p ng-show="signupForm.firstname.$dirty && signupForm.firstname.$error.required" class="help-block">Required.</p>\r\n                                                </div>\r\n                                                <div class="form-group" ng-class="{ \'has-error\': signupForm.lastname.$dirty && signupForm.lastname.$invalid }">\r\n                                                    <label class="sr-only" for="form-last-name">Last name</label>\r\n                                                    <input type="text" name="lastname" placeholder="Last name..." class="form-last-name form-control" id="lastname" ng-model="auth.user.lastname" ng-model-options="{ updateOn: \'blur\' }" required>\r\n                                                    <p ng-show="signupForm.lastname.$dirty && signupForm.lastname.$error.required" class="help-block">Required.</p>\r\n                                                </div>\r\n        <!--\t\t\t\t                        <div class="form-group" ng-class="{ \'has-error\': signupForm.email.$dirty && (signupForm.email.$invalid || (auth.user.email && auth.isDuplicateUsername())) }">-->\r\n                                                <div class="form-group" ng-class="{ \'has-error\': signupForm.email.$dirty && (signupForm.email.$invalid || (auth.user.email && auth.isDuplicateUsername())) }">\r\n                                                    <label class="sr-only" for="form-email">Email</label>\r\n                                                    <input type="email" name="email" placeholder="Email..." class="form-email form-control" id="email" ng-model="auth.user.email" ng-model-options="{ updateOn: \'blur\' }" required>\r\n        <!--\t\t\t\t                        \t<span>@muime.com</span>-->\r\n                                                    <p ng-show="signupForm.email.$valid && auth.error.duplicateUsername" class="help-block">Already in used.</p>\r\n                                                    <p ng-show="signupForm.email.$dirty && signupForm.email.$error.required" class="help-block">Required.</p>\r\n                                                    <p ng-show="signupForm.email.$error.email" class="help-block">Not valid.</p>\r\n\r\n                                                </div>\r\n                                                <div class="form-group" ng-class="{ \'has-error\': signupForm.password1.$dirty && signupForm.password1.$invalid }">\r\n                                                    <label class="sr-only" for="form-password">Password</label>\r\n                                                    <input type="password" name="password1" placeholder="Password at least 6 characters..." class="form-password form-control" id="password1" ng-model="auth.user.password1" ng-model-options="{ updateOn: \'blur\' }" required ng-minlength="6">\r\n                                                    <p ng-show="signupForm.password1.$dirty && signupForm.password1.$error.required" class="help-block">Required.</p>\r\n                                                    <p ng-show="signupForm.password1.$error.minlength" class="help-block">Must no less than 6 characters.</p>\r\n                                                </div>\r\n                                                <div class="form-group" ng-class="{ \'has-error\': signupForm.password2.$dirty && (signupForm.password2.$invalid || (auth.user.password1 && auth.isPasswordNotMatch())) }">\r\n                                                    <label class="sr-only" for="form-password">Password</label>\r\n                                                    <input type="password" name="password2" placeholder="Confirm Password..." class="form-password form-control" id="password2" ng-model="auth.user.password2" ng-model-options="{ updateOn: \'blur\' }" required ng-minlength="6">\r\n                                                    <p ng-show="signupForm.password2.$valid && auth.error.passwordNotMatch" class="help-block">Re-password again.</p>\r\n                                                    <p ng-show="signupForm.password2.$dirty && signupForm.password2.$error.required" class="help-block">Required.</p>\r\n                                                    <p ng-show="signupForm.password2.$error.minlength" class="help-block">Must no less than 6 characters.</p>\r\n                                                </div>\r\n                                                <div class="form-group" ng-class="{ \'has-error\': signupForm.gender.$dirty && signupForm.gender.$invalid }">\r\n                                                    <label class="sr-only" for="form-gender">Gender</label>\r\n                                                    <select name="gender" class="form-gender form-control" ng-model="auth.user.gender" ng-model-options="{ updateOn: \'blur\' }" required>\r\n                                                        <option value="">Gender...</option>\r\n                                                        <option value="M">Mail</option>\r\n                                                        <option value="F">Female</option>\r\n                                                        <option value="O">Others</option>\r\n                                                    </select>\r\n                                                    <p ng-show="signupForm.gender.$dirty && signupForm.gender.$error.required" class="help-block">Required.</p>\r\n                                                </div>\r\n                                                <button type="submit" n name="register-submit" id="register-submit" tabindex="4" ng-disabled="signupForm.$invalid" class="btn btn-register">Sign me up!</button>\r\n\t\t\t\t                            </form>\r\n                                        </div>\r\n                                    </div>\r\n                                </div>\r\n                            </div>\r\n                        </div>\r\n                    </div>\r\n                    \r\n                    \r\n                    \r\n                    \r\n                    \r\n                    \r\n<!--        hidden on mobile and tablet            -->\r\n                    <div class="row hidden-xs hidden-sm">\r\n                        <div class="col-sm-5">\r\n                        \t\r\n                        \t<div class="form-box">\r\n\t                        \t<div class="form-top">\r\n\t                        \t\t<div class="form-top-left">\r\n\t                        \t\t\t<h3>Login to our site</h3>\r\n\t                            \t\t<p>Enter username and password to log on:</p>\r\n\t                        \t\t</div>\r\n\t                        \t\t<div class="form-top-right">\r\n\t                        \t\t\t<i class="fa fa-key"></i>\r\n\t                        \t\t</div>\r\n\t                            </div>\r\n\t                            <div class="form-bottom">\r\n\t\t\t\t                    <form name="signinForm" role="form" method="post" class="login-form" ng-submit="auth.signin()" novalidate>\r\n\t\t\t\t                    \t<div class="form-group">\r\n\t\t\t\t                    \t\t<label class="sr-only" for="form-username">E-mail</label>\r\n\t\t\t\t                        \t<input type="text" name="username" placeholder="E-mail..." class="form-username form-control" id="username" ng-model="auth.user.username" required>\r\n\t\t\t\t                        </div>\r\n                                        <div ng-class="{ \'has-error\': auth.error.signin }">\r\n                                            <p ng-show="auth.error.signin" class="help-block" style="text-align: center;">User or Password is invalid.</p>\r\n                                        </div>\r\n\t\t\t\t                        <div class="form-group">\r\n\t\t\t\t                        \t<label class="sr-only" for="form-password">Password</label>\r\n\t\t\t\t                        \t<input type="password" name="password" placeholder="Password..." class="form-password form-control" id="password" ng-model="auth.user.password" required>\r\n\t\t\t\t                        </div>\r\n\t\t\t\t                        <button type="submit" class="btn" value="Login" ng-disabled="signinForm.$invalid">Sign in!</button>\r\n\t\t\t\t                    </form>\r\n\t\t\t\t                    \r\n\t\t\t                    </div>\r\n\t\t                    </div>\r\n\t\t                \r\n\r\n\t                        \r\n                        </div>\r\n                        \r\n                        <div class="col-sm-1 middle-border"></div>\r\n                        <div class="col-sm-1"></div>\r\n                        \t\r\n                        <div class="col-sm-5">\r\n                        \t\r\n                        \t<div class="form-box">\r\n                        \t\t<div class="form-top">\r\n\t                        \t\t<div class="form-top-left">\r\n\t                        \t\t\t<h3>Sign up now</h3>\r\n\t                            \t\t<p>Fill in the form below to get instant access:</p>\r\n\t                        \t\t</div>\r\n\t                        \t\t<div class="form-top-right">\r\n\t                        \t\t\t<i class="fa fa-pencil"></i>\r\n\t                        \t\t</div>\r\n\t                            </div>\r\n\t                            <div class="form-bottom">\r\n\t\t\t\t                    <form name="signupForm" method="post" class="registration-form" ng-submit="auth.signup()" novalidate>\r\n                                        <div class="form-group" ng-class="{ \'has-error\': signupForm.firstname.$dirty && signupForm.firstname.$invalid }">\r\n\t\t\t\t                    \t\t<label class="sr-only" for="form-first-name">First name</label>\r\n\t\t\t\t                        \t<input type="text" name="firstname" placeholder="First name..." class="form-first-name form-control" id="firstname" ng-model="auth.user.firstname" ng-model-options="{ updateOn: \'blur\' }" required>\r\n                                            <p ng-show="signupForm.firstname.$dirty && signupForm.firstname.$error.required" class="help-block">Required.</p>\r\n\t\t\t\t                        </div>\r\n\t\t\t\t                        <div class="form-group" ng-class="{ \'has-error\': signupForm.lastname.$dirty && signupForm.lastname.$invalid }">\r\n\t\t\t\t                        \t<label class="sr-only" for="form-last-name">Last name</label>\r\n\t\t\t\t                        \t<input type="text" name="lastname" placeholder="Last name..." class="form-last-name form-control" id="lastname" ng-model="auth.user.lastname" ng-model-options="{ updateOn: \'blur\' }" required>\r\n                                            <p ng-show="signupForm.lastname.$dirty && signupForm.lastname.$error.required" class="help-block">Required.</p>\r\n\t\t\t\t                        </div>\r\n<!--\t\t\t\t                        <div class="form-group" ng-class="{ \'has-error\': signupForm.email.$dirty && (signupForm.email.$invalid || (auth.user.email && auth.isDuplicateUsername())) }">-->\r\n                                        <div class="form-group" ng-class="{ \'has-error\': signupForm.email.$dirty && (signupForm.email.$invalid || (auth.user.email && auth.isDuplicateUsername())) }">\r\n\t\t\t\t                        \t<label class="sr-only" for="form-email">Email</label>\r\n\t\t\t\t                        \t<input type="email" name="email" placeholder="Email..." class="form-email form-control" id="email" ng-model="auth.user.email" ng-model-options="{ updateOn: \'blur\' }" required>\r\n<!--\t\t\t\t                        \t<span>@muime.com</span>-->\r\n                                            <p ng-show="signupForm.email.$valid && auth.error.duplicateUsername" class="help-block">Already in used.</p>\r\n                                            <p ng-show="signupForm.email.$dirty && signupForm.email.$error.required" class="help-block">Required.</p>\r\n                                            <p ng-show="signupForm.email.$error.email" class="help-block">Not valid.</p>\r\n                                            \r\n\t\t\t\t                        </div>\r\n                                        <div class="form-group" ng-class="{ \'has-error\': signupForm.password1.$dirty && signupForm.password1.$invalid }">\r\n\t\t\t\t                        \t<label class="sr-only" for="form-password">Password</label>\r\n\t\t\t\t                        \t<input type="password" name="password1" placeholder="Password at least 6 characters..." class="form-password form-control" id="password1" ng-model="auth.user.password1" ng-model-options="{ updateOn: \'blur\' }" required ng-minlength="6">\r\n                                            <p ng-show="signupForm.password1.$dirty && signupForm.password1.$error.required" class="help-block">Required.</p>\r\n                                            <p ng-show="signupForm.password1.$error.minlength" class="help-block">Must no less than 6 characters.</p>\r\n\t\t\t\t                        </div>\r\n\t\t\t\t                        <div class="form-group" ng-class="{ \'has-error\': signupForm.password2.$dirty && (signupForm.password2.$invalid || (auth.user.password1 && auth.isPasswordNotMatch())) }">\r\n\t\t\t\t                        \t<label class="sr-only" for="form-password">Password</label>\r\n\t\t\t\t                        \t<input type="password" name="password2" placeholder="Confirm Password..." class="form-password form-control" id="password2" ng-model="auth.user.password2" ng-model-options="{ updateOn: \'blur\' }" required ng-minlength="6">\r\n                                            <p ng-show="signupForm.password2.$valid && auth.error.passwordNotMatch" class="help-block">Re-password again.</p>\r\n                                            <p ng-show="signupForm.password2.$dirty && signupForm.password2.$error.required" class="help-block">Required.</p>\r\n                                            <p ng-show="signupForm.password2.$error.minlength" class="help-block">Must no less than 6 characters.</p>\r\n\t\t\t\t                        </div>\r\n\t\t\t\t                        <div class="form-group" ng-class="{ \'has-error\': signupForm.gender.$dirty && signupForm.gender.$invalid }">\r\n                                            <label class="sr-only" for="form-gender">Gender</label>\r\n                                            <select name="gender" class="form-gender form-control" ng-model="auth.user.gender" ng-model-options="{ updateOn: \'blur\' }" required>\r\n                                                <option value="">Gender...</option>\r\n                                                <option value="M">Mail</option>\r\n                                                <option value="F">Female</option>\r\n                                                <option value="O">Others</option>\r\n                                            </select>\r\n                                            <p ng-show="signupForm.gender.$dirty && signupForm.gender.$error.required" class="help-block">Required.</p>\r\n                                        </div>\r\n\t\t\t\t                        <button type="submit" ng-disabled="signupForm.$invalid" class="btn">Sign me up!</button>\r\n\t\t\t\t                    </form>\r\n\t\t\t                    </div>\r\n                        \t</div>\r\n                        \t\r\n                        </div>\r\n                    </div>\r\n                    \r\n                </div>\r\n            </div>\r\n            \r\n        </div>\r\n\r\n</div>\r\n\r\n\r\n');$templateCache.put('modules/auth/forbidden.html','<h1>Forbidden</h1>');$templateCache.put('modules/auth/signupcomplete.html','');$templateCache.put('modules/cart/cart-center.html','<h1>My Shopping Bag (2)</h1>\n<script>$(document).ready(function(c) {\n    $(\'.close1\').on(\'click\', function(c){\n        $(\'.cart-header\').fadeOut(\'slow\', function(c){\n            $(\'.cart-header\').remove();\n        });\n        });\t  \n    });\n</script>\n<div class="cart-header">\n <div class="close1"> </div>\n <div class="cart-sec simpleCart_shelfItem">\n        <div class="cart-item cyc">\n             <img src="/images/8.jpg" class="img-responsive" alt=""/>\n        </div>\n       <div class="cart-item-info">\n        <h3><a href="#">Mountain Hopper(XS R034)</a><span>Model No: 3578</span></h3>\n        <ul class="qty">\n            <li><p>Size : 5</p></li>\n            <li><p>Qty : 1</p></li>\n        </ul>\n\n             <div class="delivery">\n             <p>Service Charges : Rs.100.00</p>\n             <span>Delivered in 2-3 bussiness days</span>\n             <div class="clearfix"></div>\n        </div>\t\n       </div>\n       <div class="clearfix"></div>\n\n  </div>\n</div>\n<script>$(document).ready(function(c) {\n    $(\'.close2\').on(\'click\', function(c){\n            $(\'.cart-header2\').fadeOut(\'slow\', function(c){\n        $(\'.cart-header2\').remove();\n    });\n    });\t  \n    });\n</script>\n<div class="cart-header2">\n <div class="close2"> </div>\n  <div class="cart-sec simpleCart_shelfItem">\n        <div class="cart-item cyc">\n             <img src="/images/11.jpg" class="img-responsive" alt=""/>\n        </div>\n       <div class="cart-item-info">\n        <h3><a href="#">Mountain Hopper(XS R034)</a><span>Model No: 3578</span></h3>\n        <ul class="qty">\n            <li><p>Size : 5</p></li>\n            <li><p>Qty : 1</p></li>\n        </ul>\n             <div class="delivery">\n             <p>Service Charges : Rs.100.00</p>\n             <span>Delivered in 2-3 bussiness days</span>\n             <div class="clearfix"></div>\n        </div>\t\n       </div>\n       <div class="clearfix"></div>\n\n  </div>\n</div>');$templateCache.put('modules/cart/cart-left.html','<a class="continue" href="#">Continue to basket</a>\n\n<div class="price-details">\n <h3>Price Details</h3>\n <span>Total</span>\n <span class="total1">6200.00</span>\n <span>Discount</span>\n <span class="total1">---</span>\n <span>Delivery Charges</span>\n <span class="total1">150.00</span>\n <div class="clearfix"></div>\t\t\t\t \n</div>\t\n<ul class="total_price">\n<li class="last_price"> <h4>TOTAL</h4></li>\t\n<li class="last_price"><span>6350.00</span></li>\n<div class="clearfix"> </div>\n</ul>\n\n\n<div class="clearfix"></div>\n<a class="order" href="#">Place Order</a>\n<div class="total-item">\n <h3>OPTIONS</h3>\n <h4>COUPONS</h4>\n <a class="cpns" href="#">Apply Coupons</a>\n <p><a href="#">Log In</a> to use accounts - linked coupons</p>\n</div>');$templateCache.put('modules/cart/cart-right.html','<div class="containert clearfix">\n    <div class="people-list" id="people-list">\n        <div class="search">\n            <input type="text" placeholder="search" />\n            <i class="fa fa-search"></i>\n        </div>\n        <ul class="list">\n            <li class="clearfix">\n                <img src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/195612/chat_avatar_01.jpg" alt="avatar" />\n                <div class="about">\n                    <div class="name">Vincent Porter</div>\n                    <div class="status">\n                        <i class="fa fa-circle online"></i> online\n                    </div>\n                </div>\n            </li>\n\n            <li class="clearfix">\n                <img src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/195612/chat_avatar_02.jpg" alt="avatar" />\n                <div class="about">\n                    <div class="name">Aiden Chavez</div>\n                    <div class="status">\n                        <i class="fa fa-circle offline"></i> left 7 mins ago\n                    </div>\n                </div>\n            </li>\n\n            <li class="clearfix">\n                <img src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/195612/chat_avatar_03.jpg" alt="avatar" />\n                <div class="about">\n                    <div class="name">Mike Thomas</div>\n                    <div class="status">\n                        <i class="fa fa-circle online"></i> online\n                    </div>\n                </div>\n            </li>\n\n            <li class="clearfix">\n                <img src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/195612/chat_avatar_04.jpg" alt="avatar" />\n                <div class="about">\n                    <div class="name">Erica Hughes</div>\n                    <div class="status">\n                        <i class="fa fa-circle online"></i> online\n                    </div>\n                </div>\n            </li>\n\n            <li class="clearfix">\n                <img src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/195612/chat_avatar_05.jpg" alt="avatar" />\n                <div class="about">\n                    <div class="name">Ginger Johnston</div>\n                    <div class="status">\n                        <i class="fa fa-circle online"></i> online\n                    </div>\n                </div>\n            </li>\n\n            <li class="clearfix">\n                <img src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/195612/chat_avatar_06.jpg" alt="avatar" />\n                <div class="about">\n                    <div class="name">Tracy Carpenter</div>\n                    <div class="status">\n                        <i class="fa fa-circle offline"></i> left 30 mins ago\n                    </div>\n                </div>\n            </li>\n\n            <li class="clearfix">\n                <img src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/195612/chat_avatar_07.jpg" alt="avatar" />\n                <div class="about">\n                    <div class="name">Christian Kelly</div>\n                    <div class="status">\n                        <i class="fa fa-circle offline"></i> left 10 hours ago\n                    </div>\n                </div>\n            </li>\n\n\n            <li class="clearfix">\n                <img src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/195612/chat_avatar_10.jpg" alt="avatar" />\n                <div class="about">\n                    <div class="name">Peyton Mckinney</div>\n                    <div class="status">\n                        <i class="fa fa-circle online"></i> online\n                    </div>\n                </div>\n            </li>\n        </ul>\n    </div>\n\n\n<!-- end chat -->\n\n</div>');$templateCache.put('modules/cart/cart-top.html','<div>\n    <h2>Cart</h2>\n</div>');$templateCache.put('modules/cart/cart.html','<div id="homepage " class="row">\n     <div class="col-md-9">\n        <div ui-view="top" class="pagetop col-md-12">\n           \n            \n        </div>\n        <div ui-view="left"  class="pageleft col-xs-9 col-sm-2 col-md-3 cart-total check">\n            <a class="continue" href="#">Continue to basket</a>\n\t\t\t <div class="price-details">\n\t\t\t\t <h3>Price Details</h3>\n\t\t\t\t <span>Total</span>\n\t\t\t\t <span class="total1">6200.00</span>\n\t\t\t\t <span>Discount</span>\n\t\t\t\t <span class="total1">---</span>\n\t\t\t\t <span>Delivery Charges</span>\n\t\t\t\t <span class="total1">150.00</span>\n\t\t\t\t <div class="clearfix"></div>\t\t\t\t \n\t\t\t </div>\t\n\t\t\t <ul class="total_price">\n\t\t\t   <li class="last_price"> <h4>TOTAL</h4></li>\t\n\t\t\t   <li class="last_price"><span>6350.00</span></li>\n\t\t\t   <div class="clearfix"> </div>\n\t\t\t </ul>\n\t\t\t\n\t\t\t \n\t\t\t <div class="clearfix"></div>\n\t\t\t <a class="order" href="#">Place Order</a>\n\t\t\t <div class="total-item">\n\t\t\t\t <h3>OPTIONS</h3>\n\t\t\t\t <h4>COUPONS</h4>\n\t\t\t\t <a class="cpns" href="#">Apply Coupons</a>\n\t\t\t\t <p><a href="#">Log In</a> to use accounts - linked coupons</p>\n\t\t\t </div>\n        </div>\n        \n        \n        <div ui-view="center" class="pagecenter col-xs-12 col-sm-8 col-md-9 cart-items check">\n            <h1>My Shopping Bag (2)</h1>\n\t\t\t\t<script>$(document).ready(function(c) {\n\t\t\t\t\t$(\'.close1\').on(\'click\', function(c){\n\t\t\t\t\t\t$(\'.cart-header\').fadeOut(\'slow\', function(c){\n\t\t\t\t\t\t\t$(\'.cart-header\').remove();\n\t\t\t\t\t\t});\n\t\t\t\t\t\t});\t  \n\t\t\t\t\t});\n\t\t\t   </script>\n\t\t\t <div class="cart-header">\n\t\t\t\t <div class="close1"> </div>\n\t\t\t\t <div class="cart-sec simpleCart_shelfItem">\n\t\t\t\t\t\t<div class="cart-item cyc">\n\t\t\t\t\t\t\t <img src="/images/8.jpg" class="img-responsive" alt=""/>\n\t\t\t\t\t\t</div>\n\t\t\t\t\t   <div class="cart-item-info">\n\t\t\t\t\t\t<h3><a href="#">Mountain Hopper(XS R034)</a><span>Model No: 3578</span></h3>\n\t\t\t\t\t\t<ul class="qty">\n\t\t\t\t\t\t\t<li><p>Size : 5</p></li>\n\t\t\t\t\t\t\t<li><p>Qty : 1</p></li>\n\t\t\t\t\t\t</ul>\n\t\t\t\t\t\t\n\t\t\t\t\t\t\t <div class="delivery">\n\t\t\t\t\t\t\t <p>Service Charges : Rs.100.00</p>\n\t\t\t\t\t\t\t <span>Delivered in 2-3 bussiness days</span>\n\t\t\t\t\t\t\t <div class="clearfix"></div>\n\t\t\t\t        </div>\t\n\t\t\t\t\t   </div>\n\t\t\t\t\t   <div class="clearfix"></div>\n\t\t\t\t\t\t\t\t\t\t\t\n\t\t\t\t  </div>\n\t\t\t </div>\n\t\t\t <script>$(document).ready(function(c) {\n\t\t\t\t\t$(\'.close2\').on(\'click\', function(c){\n\t\t\t\t\t\t\t$(\'.cart-header2\').fadeOut(\'slow\', function(c){\n\t\t\t\t\t\t$(\'.cart-header2\').remove();\n\t\t\t\t\t});\n\t\t\t\t\t});\t  \n\t\t\t\t\t});\n\t\t\t </script>\n\t\t\t <div class="cart-header2">\n\t\t\t\t <div class="close2"> </div>\n\t\t\t\t  <div class="cart-sec simpleCart_shelfItem">\n\t\t\t\t\t\t<div class="cart-item cyc">\n\t\t\t\t\t\t\t <img src="/images/11.jpg" class="img-responsive" alt=""/>\n\t\t\t\t\t\t</div>\n\t\t\t\t\t   <div class="cart-item-info">\n\t\t\t\t\t\t<h3><a href="#">Mountain Hopper(XS R034)</a><span>Model No: 3578</span></h3>\n\t\t\t\t\t\t<ul class="qty">\n\t\t\t\t\t\t\t<li><p>Size : 5</p></li>\n\t\t\t\t\t\t\t<li><p>Qty : 1</p></li>\n\t\t\t\t\t\t</ul>\n\t\t\t\t\t\t\t <div class="delivery">\n\t\t\t\t\t\t\t <p>Service Charges : Rs.100.00</p>\n\t\t\t\t\t\t\t <span>Delivered in 2-3 bussiness days</span>\n\t\t\t\t\t\t\t <div class="clearfix"></div>\n\t\t\t\t        </div>\t\n\t\t\t\t\t   </div>\n\t\t\t\t\t   <div class="clearfix"></div>\n\t\t\t\t\t\t\t\t\t\t\t\n\t\t\t\t  </div>\n\t\t\t  </div>\n            \n        </div>\n    </div>\n\n    <div class="col-md-3 col-sm-3 col-xs-12">\n        <div ui-view="right" class="pageright col-xs-9 col-sm-2 col-md-12">\n        \n            <div class="containert clearfix">\n                <div class="people-list" id="people-list">\n                    <div class="search">\n                        <input type="text" placeholder="search" />\n                        <i class="fa fa-search"></i>\n                    </div>\n                    <ul class="list">\n                        <li class="clearfix">\n                            <img src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/195612/chat_avatar_01.jpg" alt="avatar" />\n                            <div class="about">\n                                <div class="name">Vincent Porter</div>\n                                <div class="status">\n                                    <i class="fa fa-circle online"></i> online\n                                </div>\n                            </div>\n                        </li>\n\n                        <li class="clearfix">\n                            <img src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/195612/chat_avatar_02.jpg" alt="avatar" />\n                            <div class="about">\n                                <div class="name">Aiden Chavez</div>\n                                <div class="status">\n                                    <i class="fa fa-circle offline"></i> left 7 mins ago\n                                </div>\n                            </div>\n                        </li>\n\n                        <li class="clearfix">\n                            <img src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/195612/chat_avatar_03.jpg" alt="avatar" />\n                            <div class="about">\n                                <div class="name">Mike Thomas</div>\n                                <div class="status">\n                                    <i class="fa fa-circle online"></i> online\n                                </div>\n                            </div>\n                        </li>\n\n                        <li class="clearfix">\n                            <img src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/195612/chat_avatar_04.jpg" alt="avatar" />\n                            <div class="about">\n                                <div class="name">Erica Hughes</div>\n                                <div class="status">\n                                    <i class="fa fa-circle online"></i> online\n                                </div>\n                            </div>\n                        </li>\n\n                        <li class="clearfix">\n                            <img src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/195612/chat_avatar_05.jpg" alt="avatar" />\n                            <div class="about">\n                                <div class="name">Ginger Johnston</div>\n                                <div class="status">\n                                    <i class="fa fa-circle online"></i> online\n                                </div>\n                            </div>\n                        </li>\n\n                        <li class="clearfix">\n                            <img src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/195612/chat_avatar_06.jpg" alt="avatar" />\n                            <div class="about">\n                                <div class="name">Tracy Carpenter</div>\n                                <div class="status">\n                                    <i class="fa fa-circle offline"></i> left 30 mins ago\n                                </div>\n                            </div>\n                        </li>\n\n                        <li class="clearfix">\n                            <img src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/195612/chat_avatar_07.jpg" alt="avatar" />\n                            <div class="about">\n                                <div class="name">Christian Kelly</div>\n                                <div class="status">\n                                    <i class="fa fa-circle offline"></i> left 10 hours ago\n                                </div>\n                            </div>\n                        </li>\n\n                        \n                        <li class="clearfix">\n                            <img src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/195612/chat_avatar_10.jpg" alt="avatar" />\n                            <div class="about">\n                                <div class="name">Peyton Mckinney</div>\n                                <div class="status">\n                                    <i class="fa fa-circle online"></i> online\n                                </div>\n                            </div>\n                        </li>\n                    </ul>\n                </div>\n\n            \n            <!-- end chat -->\n\n        </div>\n        <!-- end container -->\n\n        <script id="message-template" type="text/x-handlebars-template">\n            <li class="clearfix">\n                <div class="message-data align-right">\n                    <span class="message-data-time">{{time}}, Today</span> &nbsp; &nbsp;\n                    <span class="message-data-name">Olia</span> <i class="fa fa-circle me"></i>\n                </div>\n                <div class="message other-message float-right">\n                    {{messageOutput}}\n                </div>\n            </li>\n        </script>\n\n        <script id="message-response-template" type="text/x-handlebars-template">\n            <li>\n                <div class="message-data">\n                    <span class="message-data-name"><i class="fa fa-circle online"></i> Vincent</span>\n                    <span class="message-data-time">{{time}}, Today</span>\n                </div>\n                <div class="message my-message">\n                    {{response}}\n                </div>\n            </li>\n        </script>\n        </div>\n    </div>\n    \n    \n</div>\n\n\n\n');$templateCache.put('modules/community/community-center.html','<div class="col-md-12 col-sm-12 col-xs-12">\n\n    <div class="twt-wrapper">\n        <div class="panel panel-info">\n\n            <div class="panel-body">\n                <textarea class="form-control" placeholder="What do you think?" rows="3"></textarea>\n                <br />\n                <a href="#" class="btn btn-primary btn-sm pull-right">Post</a>\n                <div class="clearfix"></div>\n                <hr />\n                <ul class="media-list">\n                    <li class="media">\n                        <a href="#" class="pull-left">\n                            <img src="/images/2.png" alt="" class="img-circle">\n                        </a>\n                        <div class="media-body">\n                            <span class="text-muted pull-right">\n                                <small class="text-muted">30 min ago</small>\n                            </span>\n                            <strong class="text-success">@ Rexona Kumi</strong>\n                            <p>\n                                Lorem ipsum dolor sit amet, consectetur adipiscing elit.\n                                Lorem ipsum dolor sit amet, <a href="#"># consectetur adipiscing </a>.\n                            </p>\n                        </div>\n                    </li>\n                    <li class="media">\n                        <a href="#" class="pull-left">\n                            <img src="/images/2.png" alt="" class="img-circle">\n                        </a>\n                        <div class="media-body">\n                            <span class="text-muted pull-right">\n                                <small class="text-muted">30 min ago</small>\n                            </span>\n                            <strong class="text-success">@ John Doe</strong>\n                            <p>\n                                Lorem ipsum dolor sit amet, consectetur adipiscing elit.\n                                Lorem ipsum dolor <a href="#"># ipsum dolor </a>adipiscing elit.\n                            </p>\n                        </div>\n                    </li>\n                    <li class="media">\n                        <a href="#" class="pull-left">\n                            <img src="/images/2.png" alt="" class="img-circle">\n                        </a>\n                        <div class="media-body">\n                            <span class="text-muted pull-right">\n                                <small class="text-muted">30 min ago</small>\n                            </span>\n                            <strong class="text-success">@ Madonae Jonisyi</strong>\n                            <p>\n                                Lorem ipsum dolor <a href="#"># sit amet</a> sit amet, consectetur adipiscing elit.\n                            </p>\n                        </div>\n                    </li>\n                </ul>\n                <span class="text-danger">237K users active</span>\n            </div>\n        </div>\n    </div>\n</div>');$templateCache.put('modules/community/community-left.html','<div align="center">\n    <img src="/images/img_avatar.png" class="img-circle img-responsive">\n</div>');$templateCache.put('modules/community/community-right.html','<div class="containert clearfix">\n    <div class="people-list" id="people-list">\n        <div class="search">\n            <input type="text" placeholder="search" />\n            <i class="fa fa-search"></i>\n        </div>\n        <ul class="list">\n            <li class="clearfix">\n                <img src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/195612/chat_avatar_01.jpg" alt="avatar" />\n                <div class="about">\n                    <div class="name">Vincent Porter</div>\n                    <div class="status">\n                        <i class="fa fa-circle online"></i> online\n                    </div>\n                </div>\n            </li>\n\n            <li class="clearfix">\n                <img src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/195612/chat_avatar_02.jpg" alt="avatar" />\n                <div class="about">\n                    <div class="name">Aiden Chavez</div>\n                    <div class="status">\n                        <i class="fa fa-circle offline"></i> left 7 mins ago\n                    </div>\n                </div>\n            </li>\n\n            <li class="clearfix">\n                <img src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/195612/chat_avatar_03.jpg" alt="avatar" />\n                <div class="about">\n                    <div class="name">Mike Thomas</div>\n                    <div class="status">\n                        <i class="fa fa-circle online"></i> online\n                    </div>\n                </div>\n            </li>\n\n            <li class="clearfix">\n                <img src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/195612/chat_avatar_04.jpg" alt="avatar" />\n                <div class="about">\n                    <div class="name">Erica Hughes</div>\n                    <div class="status">\n                        <i class="fa fa-circle online"></i> online\n                    </div>\n                </div>\n            </li>\n\n            <li class="clearfix">\n                <img src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/195612/chat_avatar_05.jpg" alt="avatar" />\n                <div class="about">\n                    <div class="name">Ginger Johnston</div>\n                    <div class="status">\n                        <i class="fa fa-circle online"></i> online\n                    </div>\n                </div>\n            </li>\n\n            <li class="clearfix">\n                <img src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/195612/chat_avatar_06.jpg" alt="avatar" />\n                <div class="about">\n                    <div class="name">Tracy Carpenter</div>\n                    <div class="status">\n                        <i class="fa fa-circle offline"></i> left 30 mins ago\n                    </div>\n                </div>\n            </li>\n\n            <li class="clearfix">\n                <img src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/195612/chat_avatar_07.jpg" alt="avatar" />\n                <div class="about">\n                    <div class="name">Christian Kelly</div>\n                    <div class="status">\n                        <i class="fa fa-circle offline"></i> left 10 hours ago\n                    </div>\n                </div>\n            </li>\n\n\n            <li class="clearfix">\n                <img src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/195612/chat_avatar_10.jpg" alt="avatar" />\n                <div class="about">\n                    <div class="name">Peyton Mckinney</div>\n                    <div class="status">\n                        <i class="fa fa-circle online"></i> online\n                    </div>\n                </div>\n            </li>\n        </ul>\n    </div>\n\n\n<!-- end chat -->\n\n</div>');$templateCache.put('modules/community/community-top.html','<div>\n    <h2>Community</h2>\n</div>');$templateCache.put('modules/community/community.html','<div id="homepage " class="row">\n     <div class="col-md-9">\n        <div ui-view="top" class="pagetop col-md-12 col-sm-12 col-xs-12">\n            <h2>Header</h2>\n        </div>\n        <div ui-view="left" class="pageleft col-md-3 col-sm-2 col-xs-9 ">\n            \n            <div align="center">\n                <img src="/images/img_avatar.png" class="img-circle img-responsive">\n            </div>\n            \n        </div>\n        <div ui-view="center" class="pagecenter  col-md-9 col-sm-8  col-xs-12">\n            <div class="col-md-12 col-sm-12 col-xs-12">\n                 \n                <div class="twt-wrapper">\n                    <div class="panel panel-info">\n                        \n                        <div class="panel-body">\n                            <textarea class="form-control" placeholder="What do you think?" rows="3"></textarea>\n                            <br />\n                            <a href="#" class="btn btn-primary btn-sm pull-right">Post</a>\n                            <div class="clearfix"></div>\n                            <hr />\n                            <ul class="media-list">\n                                <li class="media">\n                                    <a href="#" class="pull-left">\n                                        <img src="/images/2.png" alt="" class="img-circle">\n                                    </a>\n                                    <div class="media-body">\n                                        <span class="text-muted pull-right">\n                                            <small class="text-muted">30 min ago</small>\n                                        </span>\n                                        <strong class="text-success">@ Rexona Kumi</strong>\n                                        <p>\n                                            Lorem ipsum dolor sit amet, consectetur adipiscing elit.\n                                            Lorem ipsum dolor sit amet, <a href="#"># consectetur adipiscing </a>.\n                                        </p>\n                                    </div>\n                                </li>\n                                <li class="media">\n                                    <a href="#" class="pull-left">\n                                        <img src="/images/2.png" alt="" class="img-circle">\n                                    </a>\n                                    <div class="media-body">\n                                        <span class="text-muted pull-right">\n                                            <small class="text-muted">30 min ago</small>\n                                        </span>\n                                        <strong class="text-success">@ John Doe</strong>\n                                        <p>\n                                            Lorem ipsum dolor sit amet, consectetur adipiscing elit.\n                                            Lorem ipsum dolor <a href="#"># ipsum dolor </a>adipiscing elit.\n                                        </p>\n                                    </div>\n                                </li>\n                                <li class="media">\n                                    <a href="#" class="pull-left">\n                                        <img src="/images/2.png" alt="" class="img-circle">\n                                    </a>\n                                    <div class="media-body">\n                                        <span class="text-muted pull-right">\n                                            <small class="text-muted">30 min ago</small>\n                                        </span>\n                                        <strong class="text-success">@ Madonae Jonisyi</strong>\n                                        <p>\n                                            Lorem ipsum dolor <a href="#"># sit amet</a> sit amet, consectetur adipiscing elit.\n                                        </p>\n                                    </div>\n                                </li>\n                            </ul>\n                            <span class="text-danger">237K users active</span>\n                        </div>\n                    </div>\n                </div>\n            </div>\n        </div>\n    </div>\n    <div class="col-md-3 col-sm-3 col-xs-12">\n        <div ui-view="right" class="pageright col-xs-9 col-sm-2 col-md-12">\n        \n            <div class="containert clearfix">\n                <div class="people-list" id="people-list">\n                    <div class="search">\n                        <input type="text" placeholder="search" />\n                        <i class="fa fa-search"></i>\n                    </div>\n                    <ul class="list">\n                        <li class="clearfix">\n                            <img src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/195612/chat_avatar_01.jpg" alt="avatar" />\n                            <div class="about">\n                                <div class="name">Vincent Porter</div>\n                                <div class="status">\n                                    <i class="fa fa-circle online"></i> online\n                                </div>\n                            </div>\n                        </li>\n\n                        <li class="clearfix">\n                            <img src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/195612/chat_avatar_02.jpg" alt="avatar" />\n                            <div class="about">\n                                <div class="name">Aiden Chavez</div>\n                                <div class="status">\n                                    <i class="fa fa-circle offline"></i> left 7 mins ago\n                                </div>\n                            </div>\n                        </li>\n\n                        <li class="clearfix">\n                            <img src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/195612/chat_avatar_03.jpg" alt="avatar" />\n                            <div class="about">\n                                <div class="name">Mike Thomas</div>\n                                <div class="status">\n                                    <i class="fa fa-circle online"></i> online\n                                </div>\n                            </div>\n                        </li>\n\n                        <li class="clearfix">\n                            <img src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/195612/chat_avatar_04.jpg" alt="avatar" />\n                            <div class="about">\n                                <div class="name">Erica Hughes</div>\n                                <div class="status">\n                                    <i class="fa fa-circle online"></i> online\n                                </div>\n                            </div>\n                        </li>\n\n                        <li class="clearfix">\n                            <img src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/195612/chat_avatar_05.jpg" alt="avatar" />\n                            <div class="about">\n                                <div class="name">Ginger Johnston</div>\n                                <div class="status">\n                                    <i class="fa fa-circle online"></i> online\n                                </div>\n                            </div>\n                        </li>\n\n                        <li class="clearfix">\n                            <img src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/195612/chat_avatar_06.jpg" alt="avatar" />\n                            <div class="about">\n                                <div class="name">Tracy Carpenter</div>\n                                <div class="status">\n                                    <i class="fa fa-circle offline"></i> left 30 mins ago\n                                </div>\n                            </div>\n                        </li>\n\n                        <li class="clearfix">\n                            <img src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/195612/chat_avatar_07.jpg" alt="avatar" />\n                            <div class="about">\n                                <div class="name">Christian Kelly</div>\n                                <div class="status">\n                                    <i class="fa fa-circle offline"></i> left 10 hours ago\n                                </div>\n                            </div>\n                        </li>\n\n                        \n                        <li class="clearfix">\n                            <img src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/195612/chat_avatar_10.jpg" alt="avatar" />\n                            <div class="about">\n                                <div class="name">Peyton Mckinney</div>\n                                <div class="status">\n                                    <i class="fa fa-circle online"></i> online\n                                </div>\n                            </div>\n                        </li>\n                    </ul>\n                </div>\n\n            \n            <!-- end chat -->\n\n        </div>\n        <!-- end container -->\n\n        <script id="message-template" type="text/x-handlebars-template">\n            <li class="clearfix">\n                <div class="message-data align-right">\n                    <span class="message-data-time">{{time}}, Today</span> &nbsp; &nbsp;\n                    <span class="message-data-name">Olia</span> <i class="fa fa-circle me"></i>\n                </div>\n                <div class="message other-message float-right">\n                    {{messageOutput}}\n                </div>\n            </li>\n        </script>\n\n        <script id="message-response-template" type="text/x-handlebars-template">\n            <li>\n                <div class="message-data">\n                    <span class="message-data-name"><i class="fa fa-circle online"></i> Vincent</span>\n                    <span class="message-data-time">{{time}}, Today</span>\n                </div>\n                <div class="message my-message">\n                    {{response}}\n                </div>\n            </li>\n        </script>\n        </div>\n    </div>\n    \n    \n\n</div>\n\n\n\n\n\n<!--\n<div>\n    <div>This is Community page.</div>\n    <br>\n   \n\n\n\n    <div class="container">\n        \n\n        <div class="row">\n            <div class="col-lg-4 col-lg-offset-4 col-md-4 col-md-offset-4 col-sm-4 col-sm-offset-4">\n                 TWEET WRAPPER START \n                <div class="twt-wrapper">\n                    <div class="panel panel-info">\n                        <div class="panel-heading">\n                            Time line \n                        </div>\n                        <div class="panel-body">\n                            <textarea class="form-control" placeholder="What do you think?" rows="3"></textarea>\n                            <br />\n                            <a href="#" class="btn btn-primary btn-sm pull-right">Post</a>\n                            <div class="clearfix"></div>\n                            <hr />\n                            <ul class="media-list">\n                                <li class="media">\n                                    <a href="#" class="pull-left">\n                                        <img src="/images/2.png" alt="" class="img-circle">\n                                    </a>\n                                    <div class="media-body">\n                                        <span class="text-muted pull-right">\n                                            <small class="text-muted">30 min ago</small>\n                                        </span>\n                                        <strong class="text-success">@ Rexona Kumi</strong>\n                                        <p>\n                                            Lorem ipsum dolor sit amet, consectetur adipiscing elit.\n                                            Lorem ipsum dolor sit amet, <a href="#"># consectetur adipiscing </a>.\n                                        </p>\n                                    </div>\n                                </li>\n                                <li class="media">\n                                    <a href="#" class="pull-left">\n                                        <img src="/images/2.png" alt="" class="img-circle">\n                                    </a>\n                                    <div class="media-body">\n                                        <span class="text-muted pull-right">\n                                            <small class="text-muted">30 min ago</small>\n                                        </span>\n                                        <strong class="text-success">@ John Doe</strong>\n                                        <p>\n                                            Lorem ipsum dolor sit amet, consectetur adipiscing elit.\n                                            Lorem ipsum dolor <a href="#"># ipsum dolor </a>adipiscing elit.\n                                        </p>\n                                    </div>\n                                </li>\n                                <li class="media">\n                                    <a href="#" class="pull-left">\n                                        <img src="/images/2.png" alt="" class="img-circle">\n                                    </a>\n                                    <div class="media-body">\n                                        <span class="text-muted pull-right">\n                                            <small class="text-muted">30 min ago</small>\n                                        </span>\n                                        <strong class="text-success">@ Madonae Jonisyi</strong>\n                                        <p>\n                                            Lorem ipsum dolor <a href="#"># sit amet</a> sit amet, consectetur adipiscing elit.\n                                        </p>\n                                    </div>\n                                </li>\n                            </ul>\n                            <span class="text-danger">237K users active</span>\n                        </div>\n                    </div>\n                </div>\n               \n            </div>\n        </div>\n    </div>\n\n\n\n \n\n\n   \n\n</div>\n-->\n');$templateCache.put('modules/downtown/downtown-center.html','<div>\n    <img src="/images/mall.png" class="img-responsive">\n</div>');$templateCache.put('modules/downtown/downtown-left.html','<div>\n    <h2>Shop</h2>\n    <img src="/images/0.jpg" class="img-responsive">\n</div>\n           ');$templateCache.put('modules/downtown/downtown-right.html','<div class="containert clearfix">\n    <div class="people-list" id="people-list">\n        <div class="search">\n            <input type="text" placeholder="search" />\n            <i class="fa fa-search"></i>\n        </div>\n        <ul class="list">\n            <li class="clearfix">\n                <img src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/195612/chat_avatar_01.jpg" alt="avatar" />\n                <div class="about">\n                    <div class="name">Vincent Porter</div>\n                    <div class="status">\n                        <i class="fa fa-circle online"></i> online\n                    </div>\n                </div>\n            </li>\n\n            <li class="clearfix">\n                <img src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/195612/chat_avatar_02.jpg" alt="avatar" />\n                <div class="about">\n                    <div class="name">Aiden Chavez</div>\n                    <div class="status">\n                        <i class="fa fa-circle offline"></i> left 7 mins ago\n                    </div>\n                </div>\n            </li>\n\n            <li class="clearfix">\n                <img src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/195612/chat_avatar_03.jpg" alt="avatar" />\n                <div class="about">\n                    <div class="name">Mike Thomas</div>\n                    <div class="status">\n                        <i class="fa fa-circle online"></i> online\n                    </div>\n                </div>\n            </li>\n\n            <li class="clearfix">\n                <img src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/195612/chat_avatar_04.jpg" alt="avatar" />\n                <div class="about">\n                    <div class="name">Erica Hughes</div>\n                    <div class="status">\n                        <i class="fa fa-circle online"></i> online\n                    </div>\n                </div>\n            </li>\n\n            <li class="clearfix">\n                <img src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/195612/chat_avatar_05.jpg" alt="avatar" />\n                <div class="about">\n                    <div class="name">Ginger Johnston</div>\n                    <div class="status">\n                        <i class="fa fa-circle online"></i> online\n                    </div>\n                </div>\n            </li>\n\n            <li class="clearfix">\n                <img src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/195612/chat_avatar_06.jpg" alt="avatar" />\n                <div class="about">\n                    <div class="name">Tracy Carpenter</div>\n                    <div class="status">\n                        <i class="fa fa-circle offline"></i> left 30 mins ago\n                    </div>\n                </div>\n            </li>\n\n            <li class="clearfix">\n                <img src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/195612/chat_avatar_07.jpg" alt="avatar" />\n                <div class="about">\n                    <div class="name">Christian Kelly</div>\n                    <div class="status">\n                        <i class="fa fa-circle offline"></i> left 10 hours ago\n                    </div>\n                </div>\n            </li>\n\n\n            <li class="clearfix">\n                <img src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/195612/chat_avatar_10.jpg" alt="avatar" />\n                <div class="about">\n                    <div class="name">Peyton Mckinney</div>\n                    <div class="status">\n                        <i class="fa fa-circle online"></i> online\n                    </div>\n                </div>\n            </li>\n        </ul>\n    </div>\n\n\n<!-- end chat -->\n\n</div>');$templateCache.put('modules/downtown/downtown-top.html','<div>\n    <h2>\n        Downtown\n    </h2>\n</div>');$templateCache.put('modules/downtown/downtown.html','<div id="homepage " class="row">\n     <div class="col-md-9">\n        <div ui-view="top" class="pagetop col-md-12">\n            <h2>Top</h2>\n        </div>\n        <div ui-view="left" class="pageleft col-xs-9 col-sm-2 col-md-3">\n            <h2>Shop</h2>\n            <img src="/images/0.jpg" class="img-responsive">\n        </div>\n        <div ui-view="center" class="pagecenter col-xs-12 col-sm-8 col-md-9">\n            <img src="/images/mall.png" class="img-responsive">\n        </div>\n    </div>\n\n    <div class="col-md-3 col-sm-3 col-xs-12">\n        <div ui-view="right" class="pageright col-xs-9 col-sm-2 col-md-12">\n        \n            <div class="containert clearfix">\n                <div class="people-list" id="people-list">\n                    <div class="search">\n                        <input type="text" placeholder="search" />\n                        <i class="fa fa-search"></i>\n                    </div>\n                    <ul class="list">\n                        <li class="clearfix">\n                            <img src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/195612/chat_avatar_01.jpg" alt="avatar" />\n                            <div class="about">\n                                <div class="name">Vincent Porter</div>\n                                <div class="status">\n                                    <i class="fa fa-circle online"></i> online\n                                </div>\n                            </div>\n                        </li>\n\n                        <li class="clearfix">\n                            <img src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/195612/chat_avatar_02.jpg" alt="avatar" />\n                            <div class="about">\n                                <div class="name">Aiden Chavez</div>\n                                <div class="status">\n                                    <i class="fa fa-circle offline"></i> left 7 mins ago\n                                </div>\n                            </div>\n                        </li>\n\n                        <li class="clearfix">\n                            <img src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/195612/chat_avatar_03.jpg" alt="avatar" />\n                            <div class="about">\n                                <div class="name">Mike Thomas</div>\n                                <div class="status">\n                                    <i class="fa fa-circle online"></i> online\n                                </div>\n                            </div>\n                        </li>\n\n                        <li class="clearfix">\n                            <img src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/195612/chat_avatar_04.jpg" alt="avatar" />\n                            <div class="about">\n                                <div class="name">Erica Hughes</div>\n                                <div class="status">\n                                    <i class="fa fa-circle online"></i> online\n                                </div>\n                            </div>\n                        </li>\n\n                        <li class="clearfix">\n                            <img src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/195612/chat_avatar_05.jpg" alt="avatar" />\n                            <div class="about">\n                                <div class="name">Ginger Johnston</div>\n                                <div class="status">\n                                    <i class="fa fa-circle online"></i> online\n                                </div>\n                            </div>\n                        </li>\n\n                        <li class="clearfix">\n                            <img src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/195612/chat_avatar_06.jpg" alt="avatar" />\n                            <div class="about">\n                                <div class="name">Tracy Carpenter</div>\n                                <div class="status">\n                                    <i class="fa fa-circle offline"></i> left 30 mins ago\n                                </div>\n                            </div>\n                        </li>\n\n                        <li class="clearfix">\n                            <img src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/195612/chat_avatar_07.jpg" alt="avatar" />\n                            <div class="about">\n                                <div class="name">Christian Kelly</div>\n                                <div class="status">\n                                    <i class="fa fa-circle offline"></i> left 10 hours ago\n                                </div>\n                            </div>\n                        </li>\n\n                        \n                        <li class="clearfix">\n                            <img src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/195612/chat_avatar_10.jpg" alt="avatar" />\n                            <div class="about">\n                                <div class="name">Peyton Mckinney</div>\n                                <div class="status">\n                                    <i class="fa fa-circle online"></i> online\n                                </div>\n                            </div>\n                        </li>\n                    </ul>\n                </div>\n\n            \n            <!-- end chat -->\n\n        </div>\n        <!-- end container -->\n\n        <script id="message-template" type="text/x-handlebars-template">\n            <li class="clearfix">\n                <div class="message-data align-right">\n                    <span class="message-data-time">{{time}}, Today</span> &nbsp; &nbsp;\n                    <span class="message-data-name">Olia</span> <i class="fa fa-circle me"></i>\n                </div>\n                <div class="message other-message float-right">\n                    {{messageOutput}}\n                </div>\n            </li>\n        </script>\n\n        <script id="message-response-template" type="text/x-handlebars-template">\n            <li>\n                <div class="message-data">\n                    <span class="message-data-name"><i class="fa fa-circle online"></i> Vincent</span>\n                    <span class="message-data-time">{{time}}, Today</span>\n                </div>\n                <div class="message my-message">\n                    {{response}}\n                </div>\n            </li>\n        </script>\n        </div>\n    </div>\n    \n    \n</div>\n\n\n');$templateCache.put('modules/help/help-center.html','<div style="margin-top:30px;">\n    <h4>คุณสามารถเลือกติดต่อเรา ทีมงาน Sector5 ได้ดังต่อไปนี้</h4><br>\n    <span>Hot Line : โทร. 02-999-9999</span><br>\n    <span>E-mail : info@muime.com</span><br>\n    <span>ติดต่อสำนักงาน : 455 ซอย พึ่งมี23 ถ.สุขุมวิท93 แขวงบางจาก เขตพระโขนง กทม 10260</span><br>\n    <form class="form-horizontal" method="post">\n        <fieldset>\n            <legend class="text-center header">Contact us</legend>\n\n            <div class="form-group">\n                <span class="col-md-1 col-md-offset-2 text-center"><i class="fa fa-user bigicon"></i></span>\n                <div class="col-md-8">\n                    <input id="fname" name="name" type="text" placeholder="First Name" class="form-control">\n                </div>\n            </div>\n            <div class="form-group">\n                <span class="col-md-1 col-md-offset-2 text-center"><i class="fa fa-user bigicon"></i></span>\n                <div class="col-md-8">\n                    <input id="lname" name="name" type="text" placeholder="Last Name" class="form-control">\n                </div>\n            </div>\n\n            <div class="form-group">\n                <span class="col-md-1 col-md-offset-2 text-center"><i class="fa fa-envelope-o bigicon"></i></span>\n                <div class="col-md-8">\n                    <input id="email" name="email" type="text" placeholder="Email Address" class="form-control">\n                </div>\n            </div>\n\n            <div class="form-group">\n                <span class="col-md-1 col-md-offset-2 text-center"><i class="fa fa-phone-square bigicon"></i></span>\n                <div class="col-md-8">\n                    <input id="phone" name="phone" type="text" placeholder="Phone" class="form-control">\n                </div>\n            </div>\n\n            <div class="form-group">\n                <span class="col-md-1 col-md-offset-2 text-center"><i class="fa fa-pencil-square-o bigicon"></i></span>\n                <div class="col-md-8">\n                    <textarea class="form-control" id="message" name="message" placeholder="Enter your massage for us here. We will get back to you within 2 business days." rows="7"></textarea>\n                </div>\n            </div>\n\n            <div class="form-group">\n                <div class="col-md-12 text-center">\n                    <button type="submit" class="btn btn-primary btn-lg">Submit</button>\n                </div>\n            </div>\n        </fieldset>\n    </form>\n</div>');$templateCache.put('modules/help/help-left.html','<div>\n    <li style="margin-top:30px;">\n        <a href="#" style="text-decoration: none;"><h4>จะติดต่อเราได้อย่างไร?</h4></a>\n        <a href="#" style="text-decoration: none;"><h4>ฉันไม่สามารถเข้าสู่ระบบได้ ?</h4></a>\n        <a href="#" style="text-decoration: none;"><h4>นโยบายความเป็นส่วนตัว</h4></a>\n    </li>\n</div>');$templateCache.put('modules/help/help-right.html','<div class="containert clearfix">\n    <div class="people-list" id="people-list">\n        <div class="search">\n            <input type="text" placeholder="search" />\n            <i class="fa fa-search"></i>\n        </div>\n        <ul class="list">\n            <li class="clearfix">\n                <img src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/195612/chat_avatar_01.jpg" alt="avatar" />\n                <div class="about">\n                    <div class="name">Vincent Porter</div>\n                    <div class="status">\n                        <i class="fa fa-circle online"></i> online\n                    </div>\n                </div>\n            </li>\n\n            <li class="clearfix">\n                <img src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/195612/chat_avatar_02.jpg" alt="avatar" />\n                <div class="about">\n                    <div class="name">Aiden Chavez</div>\n                    <div class="status">\n                        <i class="fa fa-circle offline"></i> left 7 mins ago\n                    </div>\n                </div>\n            </li>\n\n            <li class="clearfix">\n                <img src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/195612/chat_avatar_03.jpg" alt="avatar" />\n                <div class="about">\n                    <div class="name">Mike Thomas</div>\n                    <div class="status">\n                        <i class="fa fa-circle online"></i> online\n                    </div>\n                </div>\n            </li>\n\n            <li class="clearfix">\n                <img src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/195612/chat_avatar_04.jpg" alt="avatar" />\n                <div class="about">\n                    <div class="name">Erica Hughes</div>\n                    <div class="status">\n                        <i class="fa fa-circle online"></i> online\n                    </div>\n                </div>\n            </li>\n\n            <li class="clearfix">\n                <img src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/195612/chat_avatar_05.jpg" alt="avatar" />\n                <div class="about">\n                    <div class="name">Ginger Johnston</div>\n                    <div class="status">\n                        <i class="fa fa-circle online"></i> online\n                    </div>\n                </div>\n            </li>\n\n            <li class="clearfix">\n                <img src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/195612/chat_avatar_06.jpg" alt="avatar" />\n                <div class="about">\n                    <div class="name">Tracy Carpenter</div>\n                    <div class="status">\n                        <i class="fa fa-circle offline"></i> left 30 mins ago\n                    </div>\n                </div>\n            </li>\n\n            <li class="clearfix">\n                <img src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/195612/chat_avatar_07.jpg" alt="avatar" />\n                <div class="about">\n                    <div class="name">Christian Kelly</div>\n                    <div class="status">\n                        <i class="fa fa-circle offline"></i> left 10 hours ago\n                    </div>\n                </div>\n            </li>\n\n\n            <li class="clearfix">\n                <img src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/195612/chat_avatar_10.jpg" alt="avatar" />\n                <div class="about">\n                    <div class="name">Peyton Mckinney</div>\n                    <div class="status">\n                        <i class="fa fa-circle online"></i> online\n                    </div>\n                </div>\n            </li>\n        </ul>\n    </div>\n\n\n<!-- end chat -->\n\n</div>');$templateCache.put('modules/help/help-top.html','<div>\n    <h2>Help</h2>\n</div>');$templateCache.put('modules/help/help.html','<div id="homepage " class="row  ">\n     <div class="col-md-9 col-sm-9 col-xs-12 ">\n        <div ui-view="top" class="pagetop col-md-12 col-sm-12 col-xs-12">\n           <div style="display:inline-block;width:100%;">\n               <h2>Help</h2>\n<!--\n               <p class="pull-right visible-xs">\n                <button type="button" class="btn btn-primary btn-xs" data-toggle="offcanvas">Toggle Chat</button>\n              </p>\n-->\n              \n           </div>\n            \n        </div>\n        <div ui-view="left" class="pageleft col-md-3 col-sm-3 col-xs-12 ">\n            <li style="margin-top:30px;">\n                <a href="#" style="text-decoration: none;"><h4>จะติดต่อเราได้อย่างไร?</h4></a>\n                <a href="#" style="text-decoration: none;"><h4>ฉันไม่สามารถเข้าสู่ระบบได้ ?</h4></a>\n                <a href="#" style="text-decoration: none;"><h4>นโยบายความเป็นส่วนตัว</h4></a>\n            </li>\n        </div>\n        <div ui-view="center" class="pagecenter col-md-9 col-sm-9 col-xs=12 ">\n           <div style="margin-top:30px;">\n               <h4>คุณสามารถเลือกติดต่อเรา ทีมงาน Sector5 ได้ดังต่อไปนี้</h4><br>\n                <span>Hot Line : โทร. 02-999-9999</span><br>\n                <span>E-mail : info@muime.com</span><br>\n                <span>ติดต่อสำนักงาน : 455 ซอย พึ่งมี23 ถ.สุขุมวิท93 แขวงบางจาก เขตพระโขนง กทม 10260</span><br>\n                <form class="form-horizontal" method="post">\n                    <fieldset>\n                        <legend class="text-center header">Contact us</legend>\n\n                        <div class="form-group">\n                            <span class="col-md-1 col-md-offset-2 text-center"><i class="fa fa-user bigicon"></i></span>\n                            <div class="col-md-8">\n                                <input id="fname" name="name" type="text" placeholder="First Name" class="form-control">\n                            </div>\n                        </div>\n                        <div class="form-group">\n                            <span class="col-md-1 col-md-offset-2 text-center"><i class="fa fa-user bigicon"></i></span>\n                            <div class="col-md-8">\n                                <input id="lname" name="name" type="text" placeholder="Last Name" class="form-control">\n                            </div>\n                        </div>\n\n                        <div class="form-group">\n                            <span class="col-md-1 col-md-offset-2 text-center"><i class="fa fa-envelope-o bigicon"></i></span>\n                            <div class="col-md-8">\n                                <input id="email" name="email" type="text" placeholder="Email Address" class="form-control">\n                            </div>\n                        </div>\n\n                        <div class="form-group">\n                            <span class="col-md-1 col-md-offset-2 text-center"><i class="fa fa-phone-square bigicon"></i></span>\n                            <div class="col-md-8">\n                                <input id="phone" name="phone" type="text" placeholder="Phone" class="form-control">\n                            </div>\n                        </div>\n\n                        <div class="form-group">\n                            <span class="col-md-1 col-md-offset-2 text-center"><i class="fa fa-pencil-square-o bigicon"></i></span>\n                            <div class="col-md-8">\n                                <textarea class="form-control" id="message" name="message" placeholder="Enter your massage for us here. We will get back to you within 2 business days." rows="7"></textarea>\n                            </div>\n                        </div>\n\n                        <div class="form-group">\n                            <div class="col-md-12 text-center">\n                                <button type="submit" class="btn btn-primary btn-lg">Submit</button>\n                            </div>\n                        </div>\n                    </fieldset>\n                </form>\n           </div>\n            \n        </div>\n      \n    </div>\n    <div class="col-md-3 col-sm-3 col-xs-12">\n        <div ui-view="right" class="pageright col-xs-9 col-sm-2 col-md-12">\n        \n            <div class="containert clearfix">\n                <div class="people-list" id="people-list">\n                    <div class="search">\n                        <input type="text" placeholder="search" />\n                        <i class="fa fa-search"></i>\n                    </div>\n                    <ul class="list" >\n                        <li class="clearfix">\n                            <img src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/195612/chat_avatar_01.jpg" alt="avatar" />\n                            <div class="about">\n                                <div class="name">Vincent Porter</div>\n                                <div class="status">\n                                    <i class="fa fa-circle online"></i> online\n                                </div>\n                            </div>\n                        </li>\n\n                        <li class="clearfix">\n                            <img src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/195612/chat_avatar_02.jpg" alt="avatar" />\n                            <div class="about">\n                                <div class="name">Aiden Chavez</div>\n                                <div class="status">\n                                    <i class="fa fa-circle offline"></i> left 7 mins ago\n                                </div>\n                            </div>\n                        </li>\n\n                        <li class="clearfix">\n                            <img src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/195612/chat_avatar_03.jpg" alt="avatar" />\n                            <div class="about">\n                                <div class="name">Mike Thomas</div>\n                                <div class="status">\n                                    <i class="fa fa-circle online"></i> online\n                                </div>\n                            </div>\n                        </li>\n\n                        <li class="clearfix">\n                            <img src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/195612/chat_avatar_04.jpg" alt="avatar" />\n                            <div class="about">\n                                <div class="name">Erica Hughes</div>\n                                <div class="status">\n                                    <i class="fa fa-circle online"></i> online\n                                </div>\n                            </div>\n                        </li>\n\n                        <li class="clearfix">\n                            <img src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/195612/chat_avatar_05.jpg" alt="avatar" />\n                            <div class="about">\n                                <div class="name">Ginger Johnston</div>\n                                <div class="status">\n                                    <i class="fa fa-circle online"></i> online\n                                </div>\n                            </div>\n                        </li>\n\n                        <li class="clearfix">\n                            <img src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/195612/chat_avatar_06.jpg" alt="avatar" />\n                            <div class="about">\n                                <div class="name">Tracy Carpenter</div>\n                                <div class="status">\n                                    <i class="fa fa-circle offline"></i> left 30 mins ago\n                                </div>\n                            </div>\n                        </li>\n\n                        <li class="clearfix">\n                            <img src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/195612/chat_avatar_07.jpg" alt="avatar" />\n                            <div class="about">\n                                <div class="name">Christian Kelly</div>\n                                <div class="status">\n                                    <i class="fa fa-circle offline"></i> left 10 hours ago\n                                </div>\n                            </div>\n                        </li>\n\n                        \n                        <li class="clearfix">\n                            <img src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/195612/chat_avatar_10.jpg" alt="avatar" />\n                            <div class="about">\n                                <div class="name">Peyton Mckinney</div>\n                                <div class="status">\n                                    <i class="fa fa-circle online"></i> online\n                                </div>\n                            </div>\n                        </li>\n                    </ul>\n                </div>\n\n            \n            <!-- end chat -->\n\n        </div>\n        <!-- end container -->\n\n        <script id="message-template" type="text/x-handlebars-template">\n            <li class="clearfix">\n                <div class="message-data align-right">\n                    <span class="message-data-time">{{time}}, Today</span> &nbsp; &nbsp;\n                    <span class="message-data-name">Olia</span> <i class="fa fa-circle me"></i>\n                </div>\n                <div class="message other-message float-right">\n                    {{messageOutput}}\n                </div>\n            </li>\n        </script>\n\n        <script id="message-response-template" type="text/x-handlebars-template">\n            <li>\n                <div class="message-data">\n                    <span class="message-data-name"><i class="fa fa-circle online"></i> Vincent</span>\n                    <span class="message-data-time">{{time}}, Today</span>\n                </div>\n                <div class="message my-message">\n                    {{response}}\n                </div>\n            </li>\n        </script>\n        </div>\n    </div>\n</div>\n\n\n\n\n\n<!--\n<div>\n    <div>This is Help page.</div>\n    <br>\n    <h2>Contact</h2>\n\n    <div class="card" >\n      <img align="center" src="/images/img_avatar.png" alt="Avatar" style="width:100%">\n      <div class="containerg" >\n        <h4><b>John Doe</b></h4>\n        <p>Architect & Engineer</p>\n      </div>\n    </div>\n\n\n</div>\n-->\n');$templateCache.put('modules/home/home-center.html','<div class="col-md-12 col-sm-12 col-xs-12">\n                 \n    <div class="twt-wrapper">\n        <div class="panel panel-info">\n\n            <div class="panel-body">\n                <textarea class="form-control" placeholder="What do you think?" rows="3"></textarea>\n                <br />\n                <a href="#" class="btn btn-primary btn-sm pull-right">Post</a>\n                <div class="clearfix"></div>\n                <hr />\n                <ul class="media-list">\n                    <li class="media">\n                        <a href="#" class="pull-left">\n                            <img src="/images/2.png" alt="" class="img-circle">\n                        </a>\n                        <div class="media-body">\n                            <span class="text-muted pull-right">\n                                <small class="text-muted">30 min ago</small>\n                            </span>\n                            <strong class="text-success">@ Rexona Kumi</strong>\n                            <p>\n                                Lorem ipsum dolor sit amet, consectetur adipiscing elit.\n                                Lorem ipsum dolor sit amet, <a href="#"># consectetur adipiscing </a>.\n                            </p>\n                        </div>\n                    </li>\n                    <li class="media">\n                        <a href="#" class="pull-left">\n                            <img src="/images/2.png" alt="" class="img-circle">\n                        </a>\n                        <div class="media-body">\n                            <span class="text-muted pull-right">\n                                <small class="text-muted">30 min ago</small>\n                            </span>\n                            <strong class="text-success">@ John Doe</strong>\n                            <p>\n                                Lorem ipsum dolor sit amet, consectetur adipiscing elit.\n                                Lorem ipsum dolor <a href="#"># ipsum dolor </a>adipiscing elit.\n                            </p>\n                        </div>\n                    </li>\n\n                </ul>\n\n            </div>\n        </div>\n    </div>\n</div>\n<div class="col-md-12 col-sm-12 col-xs-12">\n\n    <div class="twt-wrapper">\n        <div class="panel panel-info">\n\n            <div class="panel-body">\n                <div class="clearfix"></div>\n                <hr />\n                <ul class="media-list">\n                    <li class="media">\n\n                        <div class="media-body">\n\n                            <p>\n                               Enter your message here...\n                                To be or not to be,\n                                that is the question...\n                                maybe, I think,\n                                I\'m not sure\n                                wait, you\'re still reading this?\n                                Type a good message already!\n                            </p>\n                        </div>\n                    </li>\n\n\n                </ul>\n\n            </div>\n        </div>\n    </div>\n</div>');$templateCache.put('modules/home/home-left.html','\n<div align="center">\n    <img src="/images/img_avatar.png" class="img-circle img-responsive">\n</div>\n ');$templateCache.put('modules/home/home-right.html','<div class="containert clearfix">\n    <div class="people-list" id="people-list">\n        <div class="search">\n            <input type="text" placeholder="search" />\n            <i class="fa fa-search"></i>\n        </div>\n        <ul class="list">\n            <li class="clearfix">\n                <img src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/195612/chat_avatar_01.jpg" alt="avatar" />\n                <div class="about">\n                    <div class="name">Vincent Porter</div>\n                    <div class="status">\n                        <i class="fa fa-circle online"></i> online\n                    </div>\n                </div>\n            </li>\n\n            <li class="clearfix">\n                <img src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/195612/chat_avatar_02.jpg" alt="avatar" />\n                <div class="about">\n                    <div class="name">Aiden Chavez</div>\n                    <div class="status">\n                        <i class="fa fa-circle offline"></i> left 7 mins ago\n                    </div>\n                </div>\n            </li>\n\n            <li class="clearfix">\n                <img src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/195612/chat_avatar_03.jpg" alt="avatar" />\n                <div class="about">\n                    <div class="name">Mike Thomas</div>\n                    <div class="status">\n                        <i class="fa fa-circle online"></i> online\n                    </div>\n                </div>\n            </li>\n\n            <li class="clearfix">\n                <img src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/195612/chat_avatar_04.jpg" alt="avatar" />\n                <div class="about">\n                    <div class="name">Erica Hughes</div>\n                    <div class="status">\n                        <i class="fa fa-circle online"></i> online\n                    </div>\n                </div>\n            </li>\n\n            <li class="clearfix">\n                <img src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/195612/chat_avatar_05.jpg" alt="avatar" />\n                <div class="about">\n                    <div class="name">Ginger Johnston</div>\n                    <div class="status">\n                        <i class="fa fa-circle online"></i> online\n                    </div>\n                </div>\n            </li>\n\n            <li class="clearfix">\n                <img src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/195612/chat_avatar_06.jpg" alt="avatar" />\n                <div class="about">\n                    <div class="name">Tracy Carpenter</div>\n                    <div class="status">\n                        <i class="fa fa-circle offline"></i> left 30 mins ago\n                    </div>\n                </div>\n            </li>\n\n            <li class="clearfix">\n                <img src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/195612/chat_avatar_07.jpg" alt="avatar" />\n                <div class="about">\n                    <div class="name">Christian Kelly</div>\n                    <div class="status">\n                        <i class="fa fa-circle offline"></i> left 10 hours ago\n                    </div>\n                </div>\n            </li>\n\n\n            <li class="clearfix">\n                <img src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/195612/chat_avatar_10.jpg" alt="avatar" />\n                <div class="about">\n                    <div class="name">Peyton Mckinney</div>\n                    <div class="status">\n                        <i class="fa fa-circle online"></i> online\n                    </div>\n                </div>\n            </li>\n        </ul>\n    </div>\n\n\n<!-- end chat -->\n\n</div>');$templateCache.put('modules/home/home-top.html','\n<div >\n    <div align="left" class="col-md-3">\n        <h2>Rainny</h2>\n    </div>\n\n<!--\n    <div align="center" class="col-md-9">\n       <div class="col-md-2">\n            <a>Notification</a>\n        </div>\n        <div class="col-md-2">\n            <a>Mail</a>\n        </div>\n        <div class="col-md-2">\n            <a>Contacts</a>\n        </div>\n        <div class="col-md-2">\n            <a>Calendar</a>\n        </div>\n        <div class="col-md-2">\n            <a>Notes</a>\n        </div>\n        <div class="col-md-2">\n            <a>Photos</a>\n        </div>\n    </div>\n-->\n    <div class="navbar-header">\n        <button type="button" class="navbar-toggle collapsed" data-toggle="collapse" data-target="#bs-example">\n            <span class="sr-only">Toggle navigation</span> Menu <i class="fa fa-bars"></i>\n        </button>\n<!--                <a class="navbar-brand page-scroll" href="#page-top">Start Bootstrap</a>-->\n    </div>\n\n            <!-- Collect the nav links, forms, and other content for toggling -->\n    <div class="collapse navbar-collapse col-md-9" id="bs-example">\n        <ul class="nav navbar-nav navbar-right">\n            <li>\n                <a ui-sref="#">Notification</a>\n            </li>\n            <li>\n                <a  ui-sref="#">Mail</a>\n            </li>\n            <li>\n                <a ui-sref="#">Contacts</a>\n            </li>\n            <li>\n                <a href="#">Calendar</a>\n            </li>\n            <li>\n                <a ui-sref="#">Notes</a>\n            </li>\n            <li>\n                <a ui-sref="#">Photos</a>\n            </li>\n\n        </ul>\n    </div>\n</div>\n            \n           \n    ');$templateCache.put('modules/home/home.html','<div id="homepage " class="row">\n     <div class="col-md-9">\n        <div ui-view="top" class="pagetop col-md-12 col-sm-12 col-xs-12">\n        \n            \n           \n        </div>\n        <div ui-view="left" class="pageleft col-md-3 col-sm-2 ">\n            <div align="center">\n                <img src="/images/img_avatar.png" class="img-circle img-responsive">\n            </div>\n        </div>\n        <div ui-view="center" class="pagecenter col-xs-12 col-sm-8 col-md-9">\n            <div class="col-md-12 col-sm-12 col-xs-12">\n                 \n                <div class="twt-wrapper">\n                    <div class="panel panel-info">\n                        \n                        <div class="panel-body">\n                            <textarea class="form-control" placeholder="What do you think?" rows="3"></textarea>\n                            <br />\n                            <a href="#" class="btn btn-primary btn-sm pull-right">Post</a>\n                            <div class="clearfix"></div>\n                            <hr />\n                            <ul class="media-list">\n                                <li class="media">\n                                    <a href="#" class="pull-left">\n                                        <img src="/images/2.png" alt="" class="img-circle">\n                                    </a>\n                                    <div class="media-body">\n                                        <span class="text-muted pull-right">\n                                            <small class="text-muted">30 min ago</small>\n                                        </span>\n                                        <strong class="text-success">@ Rexona Kumi</strong>\n                                        <p>\n                                            Lorem ipsum dolor sit amet, consectetur adipiscing elit.\n                                            Lorem ipsum dolor sit amet, <a href="#"># consectetur adipiscing </a>.\n                                        </p>\n                                    </div>\n                                </li>\n                                <li class="media">\n                                    <a href="#" class="pull-left">\n                                        <img src="/images/2.png" alt="" class="img-circle">\n                                    </a>\n                                    <div class="media-body">\n                                        <span class="text-muted pull-right">\n                                            <small class="text-muted">30 min ago</small>\n                                        </span>\n                                        <strong class="text-success">@ John Doe</strong>\n                                        <p>\n                                            Lorem ipsum dolor sit amet, consectetur adipiscing elit.\n                                            Lorem ipsum dolor <a href="#"># ipsum dolor </a>adipiscing elit.\n                                        </p>\n                                    </div>\n                                </li>\n                               \n                            </ul>\n                        \n                        </div>\n                    </div>\n                </div>\n            </div>\n            <div class="col-md-12 col-sm-12 col-xs-12">\n                 \n                <div class="twt-wrapper">\n                    <div class="panel panel-info">\n                        \n                        <div class="panel-body">\n                            <div class="clearfix"></div>\n                            <hr />\n                            <ul class="media-list">\n                                <li class="media">\n                                    \n                                    <div class="media-body">\n                                        \n                                        <p>\n                                           Enter your message here...\n                                            To be or not to be,\n                                            that is the question...\n                                            maybe, I think,\n                                            I\'m not sure\n                                            wait, you\'re still reading this?\n                                            Type a good message already!\n                                        </p>\n                                    </div>\n                                </li>\n                                \n                               \n                            </ul>\n                        \n                        </div>\n                    </div>\n                </div>\n            </div>\n        ` </div>\n        </div>\n    \n         \n    \n    <div class="col-md-3 col-sm-3 col-xs-12">\n        <div ui-view="right" class="pageright col-xs-9 col-sm-2 col-md-12">\n        \n            <div class="containert clearfix">\n                <div class="people-list" id="people-list">\n                    <div class="search">\n                        <input type="text" placeholder="search" />\n                        <i class="fa fa-search"></i>\n                    </div>\n                    <ul class="list">\n                        <li class="clearfix">\n                            <img src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/195612/chat_avatar_01.jpg" alt="avatar" />\n                            <div class="about">\n                                <div class="name">Vincent Porter</div>\n                                <div class="status">\n                                    <i class="fa fa-circle online"></i> online\n                                </div>\n                            </div>\n                        </li>\n\n                        <li class="clearfix">\n                            <img src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/195612/chat_avatar_02.jpg" alt="avatar" />\n                            <div class="about">\n                                <div class="name">Aiden Chavez</div>\n                                <div class="status">\n                                    <i class="fa fa-circle offline"></i> left 7 mins ago\n                                </div>\n                            </div>\n                        </li>\n\n                        <li class="clearfix">\n                            <img src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/195612/chat_avatar_03.jpg" alt="avatar" />\n                            <div class="about">\n                                <div class="name">Mike Thomas</div>\n                                <div class="status">\n                                    <i class="fa fa-circle online"></i> online\n                                </div>\n                            </div>\n                        </li>\n\n                        <li class="clearfix">\n                            <img src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/195612/chat_avatar_04.jpg" alt="avatar" />\n                            <div class="about">\n                                <div class="name">Erica Hughes</div>\n                                <div class="status">\n                                    <i class="fa fa-circle online"></i> online\n                                </div>\n                            </div>\n                        </li>\n\n                        <li class="clearfix">\n                            <img src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/195612/chat_avatar_05.jpg" alt="avatar" />\n                            <div class="about">\n                                <div class="name">Ginger Johnston</div>\n                                <div class="status">\n                                    <i class="fa fa-circle online"></i> online\n                                </div>\n                            </div>\n                        </li>\n\n                        <li class="clearfix">\n                            <img src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/195612/chat_avatar_06.jpg" alt="avatar" />\n                            <div class="about">\n                                <div class="name">Tracy Carpenter</div>\n                                <div class="status">\n                                    <i class="fa fa-circle offline"></i> left 30 mins ago\n                                </div>\n                            </div>\n                        </li>\n\n                        <li class="clearfix">\n                            <img src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/195612/chat_avatar_07.jpg" alt="avatar" />\n                            <div class="about">\n                                <div class="name">Christian Kelly</div>\n                                <div class="status">\n                                    <i class="fa fa-circle offline"></i> left 10 hours ago\n                                </div>\n                            </div>\n                        </li>\n\n                        \n                        <li class="clearfix">\n                            <img src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/195612/chat_avatar_10.jpg" alt="avatar" />\n                            <div class="about">\n                                <div class="name">Peyton Mckinney</div>\n                                <div class="status">\n                                    <i class="fa fa-circle online"></i> online\n                                </div>\n                            </div>\n                        </li>\n                    </ul>\n                </div>\n\n            \n            <!-- end chat -->\n\n        </div>\n        <!-- end container -->\n\n        <script id="message-template" type="text/x-handlebars-template">\n            <li class="clearfix">\n                <div class="message-data align-right">\n                    <span class="message-data-time">{{time}}, Today</span> &nbsp; &nbsp;\n                    <span class="message-data-name">Olia</span> <i class="fa fa-circle me"></i>\n                </div>\n                <div class="message other-message float-right">\n                    {{messageOutput}}\n                </div>\n            </li>\n        </script>\n\n        <script id="message-response-template" type="text/x-handlebars-template">\n            <li>\n                <div class="message-data">\n                    <span class="message-data-name"><i class="fa fa-circle online"></i> Vincent</span>\n                    <span class="message-data-time">{{time}}, Today</span>\n                </div>\n                <div class="message my-message">\n                    {{response}}\n                </div>\n            </li>\n        </script>\n        </div>\n    </div>\n         \n    \n</div>\n');$templateCache.put('modules/search/search.html','<div id="homepage " class="row">\n     <div class="col-md-9">\n        <div ui-view="top" class="pagetop col-md-12">\n            <h2>Top</h2>\n<!--\n            <div class="searchc">\n              <svg class="searchc-svg" viewBox="0 0 320 70"\n                   data-init="M160,3 L160,3 a27,27 0 0,1 0,54 L160,57 a27,27 0 0,1 0,-54 M197,67 181.21,51.21"\n                   data-mid="M160,3 L160,3 a27,27 0 0,1 0,54 L160,57 a27,27 0 0,1 0,-54 M179.5,49.5 179.5,49.5"\n                   data-active="M27,3 L293,3 a27,27 0 0,1 0,54 L27,57 a27,27 0 0,1 0,-54 M179.5,49.5 179.5,49.5">\n                <path class="searchc-svg__path" d="M160,3 L160,3 a27,27 0 0,1 0,54 L160,57 a27,27 0 0,1 0,-54 M197,67 181.21,51.21" />\n              </svg>\n              <input type="text" class="searchc-input" />\n              <div class="searchc-close"></div>\n            </div>\n-->\n\n        </div>\n        <div ui-view="left" class="pageleft col-xs-9 col-sm-2 col-md-3">\n            <h2>\n                Search\n            </h2>\n        </div>\n        <div ui-view="center" class="pagecenter col-xs-12 col-sm-8 col-md-9">\n            fghgfhgfh\n        </div>\n    </div>\n\n    <div class="col-md-3 col-sm-3 col-xs-12">\n        <div ui-view="right" class="pageright col-xs-9 col-sm-2 col-md-12">\n        \n            <div class="containert clearfix">\n                <div class="people-list" id="people-list">\n                    <div class="search">\n                        <input type="text" placeholder="search" />\n                        <i class="fa fa-search"></i>\n                    </div>\n                    <ul class="list">\n                        <li class="clearfix">\n                            <img src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/195612/chat_avatar_01.jpg" alt="avatar" />\n                            <div class="about">\n                                <div class="name">Vincent Porter</div>\n                                <div class="status">\n                                    <i class="fa fa-circle online"></i> online\n                                </div>\n                            </div>\n                        </li>\n\n                        <li class="clearfix">\n                            <img src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/195612/chat_avatar_02.jpg" alt="avatar" />\n                            <div class="about">\n                                <div class="name">Aiden Chavez</div>\n                                <div class="status">\n                                    <i class="fa fa-circle offline"></i> left 7 mins ago\n                                </div>\n                            </div>\n                        </li>\n\n                        <li class="clearfix">\n                            <img src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/195612/chat_avatar_03.jpg" alt="avatar" />\n                            <div class="about">\n                                <div class="name">Mike Thomas</div>\n                                <div class="status">\n                                    <i class="fa fa-circle online"></i> online\n                                </div>\n                            </div>\n                        </li>\n\n                        <li class="clearfix">\n                            <img src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/195612/chat_avatar_04.jpg" alt="avatar" />\n                            <div class="about">\n                                <div class="name">Erica Hughes</div>\n                                <div class="status">\n                                    <i class="fa fa-circle online"></i> online\n                                </div>\n                            </div>\n                        </li>\n\n                        <li class="clearfix">\n                            <img src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/195612/chat_avatar_05.jpg" alt="avatar" />\n                            <div class="about">\n                                <div class="name">Ginger Johnston</div>\n                                <div class="status">\n                                    <i class="fa fa-circle online"></i> online\n                                </div>\n                            </div>\n                        </li>\n\n                        <li class="clearfix">\n                            <img src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/195612/chat_avatar_06.jpg" alt="avatar" />\n                            <div class="about">\n                                <div class="name">Tracy Carpenter</div>\n                                <div class="status">\n                                    <i class="fa fa-circle offline"></i> left 30 mins ago\n                                </div>\n                            </div>\n                        </li>\n\n                        <li class="clearfix">\n                            <img src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/195612/chat_avatar_07.jpg" alt="avatar" />\n                            <div class="about">\n                                <div class="name">Christian Kelly</div>\n                                <div class="status">\n                                    <i class="fa fa-circle offline"></i> left 10 hours ago\n                                </div>\n                            </div>\n                        </li>\n\n                        \n                        <li class="clearfix">\n                            <img src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/195612/chat_avatar_10.jpg" alt="avatar" />\n                            <div class="about">\n                                <div class="name">Peyton Mckinney</div>\n                                <div class="status">\n                                    <i class="fa fa-circle online"></i> online\n                                </div>\n                            </div>\n                        </li>\n                    </ul>\n                </div>\n\n            \n            <!-- end chat -->\n\n        </div>\n        <!-- end container -->\n\n        <script id="message-template" type="text/x-handlebars-template">\n            <li class="clearfix">\n                <div class="message-data align-right">\n                    <span class="message-data-time">{{time}}, Today</span> &nbsp; &nbsp;\n                    <span class="message-data-name">Olia</span> <i class="fa fa-circle me"></i>\n                </div>\n                <div class="message other-message float-right">\n                    {{messageOutput}}\n                </div>\n            </li>\n        </script>\n\n        <script id="message-response-template" type="text/x-handlebars-template">\n            <li>\n                <div class="message-data">\n                    <span class="message-data-name"><i class="fa fa-circle online"></i> Vincent</span>\n                    <span class="message-data-time">{{time}}, Today</span>\n                </div>\n                <div class="message my-message">\n                    {{response}}\n                </div>\n            </li>\n        </script>\n        </div>\n    </div>\n    \n    \n</div>\n\n\n');$templateCache.put('modules/setting/setting-center.html','<div>\n    <form class="form-horizontal" role="form">\n        <fieldset>\n\n          <!-- Form Name -->\n          <legend>Address Details</legend>\n\n          <!-- Text input-->\n          <div class="form-group">\n            <label class="col-sm-2 control-label" for="textinput">Line 1</label>\n            <div class="col-sm-10">\n              <input type="text" placeholder="Address Line 1" class="form-control">\n            </div>\n          </div>\n\n          <!-- Text input-->\n          <div class="form-group">\n            <label class="col-sm-2 control-label" for="textinput">Line 2</label>\n            <div class="col-sm-10">\n              <input type="text" placeholder="Address Line 2" class="form-control">\n            </div>\n          </div>\n\n          <!-- Text input-->\n          <div class="form-group">\n            <label class="col-sm-2 control-label" for="textinput">City</label>\n            <div class="col-sm-10">\n              <input type="text" placeholder="City" class="form-control">\n            </div>\n          </div>\n\n          <!-- Text input-->\n          <div class="form-group">\n            <label class="col-sm-2 control-label" for="textinput">State</label>\n            <div class="col-sm-4">\n              <input type="text" placeholder="State" class="form-control">\n            </div>\n\n            <label class="col-sm-2 control-label" for="textinput">Postcode</label>\n            <div class="col-sm-4">\n              <input type="text" placeholder="Post Code" class="form-control">\n            </div>\n          </div>\n\n\n\n          <!-- Text input-->\n          <div class="form-group">\n            <label class="col-sm-2 control-label" for="textinput">Country</label>\n            <div class="col-sm-10">\n              <input type="text" placeholder="Country" class="form-control">\n            </div>\n          </div>\n\n          <div class="form-group">\n            <div class="col-sm-offset-2 col-sm-10">\n              <div class="pull-right">\n                <button type="submit" class="btn btn-default">Cancel</button>\n                <button type="submit" class="btn btn-primary">Save</button>\n              </div>\n            </div>\n          </div>\n\n        </fieldset>\n      </form>\n</div>');$templateCache.put('modules/setting/setting-left.html','<div>\n    <li style="margin-top:30px;">\n        <a href="#" style="text-decoration: none;"><h4>เพิ่มที่อยู่จัดส่ง</h4></a>\n\n        <a href="#" style="text-decoration: none;"><h4>ตั้งค่าความเป็นส่วนตัว</h4></a>\n        <a href="#" style="text-decoration: none;"><h4>เปลี่ยนรหัสผ่าน</h4></a>\n\n    </li>\n</div>');$templateCache.put('modules/setting/setting-right.html','<div class="containert clearfix">\n    <div class="people-list" id="people-list">\n        <div class="search">\n            <input type="text" placeholder="search" />\n            <i class="fa fa-search"></i>\n        </div>\n        <ul class="list">\n            <li class="clearfix">\n                <img src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/195612/chat_avatar_01.jpg" alt="avatar" />\n                <div class="about">\n                    <div class="name">Vincent Porter</div>\n                    <div class="status">\n                        <i class="fa fa-circle online"></i> online\n                    </div>\n                </div>\n            </li>\n\n            <li class="clearfix">\n                <img src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/195612/chat_avatar_02.jpg" alt="avatar" />\n                <div class="about">\n                    <div class="name">Aiden Chavez</div>\n                    <div class="status">\n                        <i class="fa fa-circle offline"></i> left 7 mins ago\n                    </div>\n                </div>\n            </li>\n\n            <li class="clearfix">\n                <img src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/195612/chat_avatar_03.jpg" alt="avatar" />\n                <div class="about">\n                    <div class="name">Mike Thomas</div>\n                    <div class="status">\n                        <i class="fa fa-circle online"></i> online\n                    </div>\n                </div>\n            </li>\n\n            <li class="clearfix">\n                <img src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/195612/chat_avatar_04.jpg" alt="avatar" />\n                <div class="about">\n                    <div class="name">Erica Hughes</div>\n                    <div class="status">\n                        <i class="fa fa-circle online"></i> online\n                    </div>\n                </div>\n            </li>\n\n            <li class="clearfix">\n                <img src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/195612/chat_avatar_05.jpg" alt="avatar" />\n                <div class="about">\n                    <div class="name">Ginger Johnston</div>\n                    <div class="status">\n                        <i class="fa fa-circle online"></i> online\n                    </div>\n                </div>\n            </li>\n\n            <li class="clearfix">\n                <img src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/195612/chat_avatar_06.jpg" alt="avatar" />\n                <div class="about">\n                    <div class="name">Tracy Carpenter</div>\n                    <div class="status">\n                        <i class="fa fa-circle offline"></i> left 30 mins ago\n                    </div>\n                </div>\n            </li>\n\n            <li class="clearfix">\n                <img src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/195612/chat_avatar_07.jpg" alt="avatar" />\n                <div class="about">\n                    <div class="name">Christian Kelly</div>\n                    <div class="status">\n                        <i class="fa fa-circle offline"></i> left 10 hours ago\n                    </div>\n                </div>\n            </li>\n\n\n            <li class="clearfix">\n                <img src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/195612/chat_avatar_10.jpg" alt="avatar" />\n                <div class="about">\n                    <div class="name">Peyton Mckinney</div>\n                    <div class="status">\n                        <i class="fa fa-circle online"></i> online\n                    </div>\n                </div>\n            </li>\n        </ul>\n    </div>\n\n\n<!-- end chat -->\n\n</div>');$templateCache.put('modules/setting/setting-top.html','<div>\n    <h2>Setting</h2>\n</div>');$templateCache.put('modules/setting/setting.html','<div id="homepage " class="row">\n     <div class="col-md-9">\n        <div ui-view="top" class="pagetop col-md-12">\n            <h2>Setting</h2>\n        </div>\n        <div ui-view="left" class="pageleft col-xs-9 col-sm-2 col-md-3">\n            <li style="margin-top:30px;">\n                <a href="#" style="text-decoration: none;"><h4>เพิ่มที่อยู่จัดส่ง</h4></a>\n\n                <a href="#" style="text-decoration: none;"><h4>ตั้งค่าความเป็นส่วนตัว</h4></a>\n                <a href="#" style="text-decoration: none;"><h4>เปลี่ยนรหัสผ่าน</h4></a>\n\n            </li>\n        </div>\n        <div ui-view="center" class="pagecenter col-xs-12 col-sm-8 col-md-9">\n            <form class="form-horizontal" role="form">\n                <fieldset>\n\n                  <!-- Form Name -->\n                  <legend>Address Details</legend>\n\n                  <!-- Text input-->\n                  <div class="form-group">\n                    <label class="col-sm-2 control-label" for="textinput">Line 1</label>\n                    <div class="col-sm-10">\n                      <input type="text" placeholder="Address Line 1" class="form-control">\n                    </div>\n                  </div>\n\n                  <!-- Text input-->\n                  <div class="form-group">\n                    <label class="col-sm-2 control-label" for="textinput">Line 2</label>\n                    <div class="col-sm-10">\n                      <input type="text" placeholder="Address Line 2" class="form-control">\n                    </div>\n                  </div>\n\n                  <!-- Text input-->\n                  <div class="form-group">\n                    <label class="col-sm-2 control-label" for="textinput">City</label>\n                    <div class="col-sm-10">\n                      <input type="text" placeholder="City" class="form-control">\n                    </div>\n                  </div>\n\n                  <!-- Text input-->\n                  <div class="form-group">\n                    <label class="col-sm-2 control-label" for="textinput">State</label>\n                    <div class="col-sm-4">\n                      <input type="text" placeholder="State" class="form-control">\n                    </div>\n\n                    <label class="col-sm-2 control-label" for="textinput">Postcode</label>\n                    <div class="col-sm-4">\n                      <input type="text" placeholder="Post Code" class="form-control">\n                    </div>\n                  </div>\n\n\n\n                  <!-- Text input-->\n                  <div class="form-group">\n                    <label class="col-sm-2 control-label" for="textinput">Country</label>\n                    <div class="col-sm-10">\n                      <input type="text" placeholder="Country" class="form-control">\n                    </div>\n                  </div>\n\n                  <div class="form-group">\n                    <div class="col-sm-offset-2 col-sm-10">\n                      <div class="pull-right">\n                        <button type="submit" class="btn btn-default">Cancel</button>\n                        <button type="submit" class="btn btn-primary">Save</button>\n                      </div>\n                    </div>\n                  </div>\n\n                </fieldset>\n              </form>\n        </div>\n    </div>\n\n    <div class="col-md-3 col-sm-3 col-xs-12">\n        <div ui-view="right" class="pageright col-xs-9 col-sm-2 col-md-12">\n        \n            <div class="containert clearfix">\n                <div class="people-list" id="people-list">\n                    <div class="search">\n                        <input type="text" placeholder="search" />\n                        <i class="fa fa-search"></i>\n                    </div>\n                    <ul class="list">\n                        <li class="clearfix">\n                            <img src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/195612/chat_avatar_01.jpg" alt="avatar" />\n                            <div class="about">\n                                <div class="name">Vincent Porter</div>\n                                <div class="status">\n                                    <i class="fa fa-circle online"></i> online\n                                </div>\n                            </div>\n                        </li>\n\n                        <li class="clearfix">\n                            <img src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/195612/chat_avatar_02.jpg" alt="avatar" />\n                            <div class="about">\n                                <div class="name">Aiden Chavez</div>\n                                <div class="status">\n                                    <i class="fa fa-circle offline"></i> left 7 mins ago\n                                </div>\n                            </div>\n                        </li>\n\n                        <li class="clearfix">\n                            <img src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/195612/chat_avatar_03.jpg" alt="avatar" />\n                            <div class="about">\n                                <div class="name">Mike Thomas</div>\n                                <div class="status">\n                                    <i class="fa fa-circle online"></i> online\n                                </div>\n                            </div>\n                        </li>\n\n                        <li class="clearfix">\n                            <img src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/195612/chat_avatar_04.jpg" alt="avatar" />\n                            <div class="about">\n                                <div class="name">Erica Hughes</div>\n                                <div class="status">\n                                    <i class="fa fa-circle online"></i> online\n                                </div>\n                            </div>\n                        </li>\n\n                        <li class="clearfix">\n                            <img src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/195612/chat_avatar_05.jpg" alt="avatar" />\n                            <div class="about">\n                                <div class="name">Ginger Johnston</div>\n                                <div class="status">\n                                    <i class="fa fa-circle online"></i> online\n                                </div>\n                            </div>\n                        </li>\n\n                        <li class="clearfix">\n                            <img src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/195612/chat_avatar_06.jpg" alt="avatar" />\n                            <div class="about">\n                                <div class="name">Tracy Carpenter</div>\n                                <div class="status">\n                                    <i class="fa fa-circle offline"></i> left 30 mins ago\n                                </div>\n                            </div>\n                        </li>\n\n                        <li class="clearfix">\n                            <img src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/195612/chat_avatar_07.jpg" alt="avatar" />\n                            <div class="about">\n                                <div class="name">Christian Kelly</div>\n                                <div class="status">\n                                    <i class="fa fa-circle offline"></i> left 10 hours ago\n                                </div>\n                            </div>\n                        </li>\n\n                        \n                        <li class="clearfix">\n                            <img src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/195612/chat_avatar_10.jpg" alt="avatar" />\n                            <div class="about">\n                                <div class="name">Peyton Mckinney</div>\n                                <div class="status">\n                                    <i class="fa fa-circle online"></i> online\n                                </div>\n                            </div>\n                        </li>\n                    </ul>\n                </div>\n\n            \n            <!-- end chat -->\n\n        </div>\n        <!-- end container -->\n\n        <script id="message-template" type="text/x-handlebars-template">\n            <li class="clearfix">\n                <div class="message-data align-right">\n                    <span class="message-data-time">{{time}}, Today</span> &nbsp; &nbsp;\n                    <span class="message-data-name">Olia</span> <i class="fa fa-circle me"></i>\n                </div>\n                <div class="message other-message float-right">\n                    {{messageOutput}}\n                </div>\n            </li>\n        </script>\n\n        <script id="message-response-template" type="text/x-handlebars-template">\n            <li>\n                <div class="message-data">\n                    <span class="message-data-name"><i class="fa fa-circle online"></i> Vincent</span>\n                    <span class="message-data-time">{{time}}, Today</span>\n                </div>\n                <div class="message my-message">\n                    {{response}}\n                </div>\n            </li>\n        </script>\n        </div>\n    </div>\n    \n    \n</div>\n\n\n');$templateCache.put('modules/signin/signin.html','<!--\n<div>\n\n    <div class="top-content">\n        \t\n            <div class="inner-bg">\n                <div class="container">\n                \t\n                    <div class="row">\n                        <div class="col-sm-8 col-sm-offset-2 text">\n\n\n                        </div>\n                    </div>\n                    \n                    <div class="row">\n                        <div class="col-sm-5">\n                        \t\n                        \t<div class="form-box">\n\t                        \t<div class="form-top">\n\t                        \t\t<div class="form-top-left">\n\t                        \t\t\t<h3>Login to our site</h3>\n\t                            \t\t<p>Enter username and password to log on:</p>\n\t                        \t\t</div>\n\t                        \t\t<div class="form-top-right">\n\t                        \t\t\t<i class="fa fa-key"></i>\n\t                        \t\t</div>\n\t                            </div>\n\t                            <div class="form-bottom">\n\t\t\t\t                    <form name="login" role="form" method="post" class="login-form" ng-submit="signin.submit()">\n\t\t\t\t                    \t<div class="form-group">\n\t\t\t\t                    \t\t<label class="sr-only" for="form-username">Username</label>\n\t\t\t\t                        \t<input type="text" name="username" placeholder="Username..." class="form-username form-control" id="username" ng-model="signin.user.username">\n\t\t\t\t                        </div>\n\t\t\t\t                        <div class="form-group">\n\t\t\t\t                        \t<label class="sr-only" for="form-password">Password</label>\n\t\t\t\t                        \t<input type="password" name="password" placeholder="Password..." class="form-password form-control" id="password" ng-model="signin.user.password">\n\t\t\t\t                        </div>\n\t\t\t\t                        <button type="submit" class="btn" value="Login">Sign in!</button>\n\t\t\t\t                    </form>\n\t\t\t                    </div>\n\t\t                    </div>\n\t\t                \n\n\t                        \n                        </div>\n                        \n                        <div class="col-sm-1 middle-border"></div>\n                        <div class="col-sm-1"></div>\n                        \t\n                        <div class="col-sm-5">\n                        \t\n                        \t<div class="form-box">\n                        \t\t<div class="form-top">\n\t                        \t\t<div class="form-top-left">\n\t                        \t\t\t<h3>Sign up now</h3>\n\t                            \t\t<p>Fill in the form below to get instant access:</p>\n\t                        \t\t</div>\n\t                        \t\t<div class="form-top-right">\n\t                        \t\t\t<i class="fa fa-pencil"></i>\n\t                        \t\t</div>\n\t                            </div>\n\t                            <div class="form-bottom">\n\t\t\t\t                    <form role="form" action="" method="post" class="registration-form">\n\t\t\t\t                    \t<div class="form-group">\n\t\t\t\t                    \t\t<label class="sr-only" for="form-first-name">First name</label>\n\t\t\t\t                        \t<input type="text" name="form-first-name" placeholder="First name..." class="form-first-name form-control" id="form-first-name">\n\t\t\t\t                        </div>\n\t\t\t\t                        <div class="form-group">\n\t\t\t\t                        \t<label class="sr-only" for="form-last-name">Last name</label>\n\t\t\t\t                        \t<input type="text" name="form-last-name" placeholder="Last name..." class="form-last-name form-control" id="form-last-name">\n\t\t\t\t                        </div>\n\t\t\t\t                        <div class="form-group">\n\t\t\t\t                        \t<label class="sr-only" for="form-email">Email</label>\n\t\t\t\t                        \t<input type="text" name="form-email" placeholder="Email..." class="form-email form-control" id="form-email">\n\t\t\t\t                        </div>\n\t\t\t\t                        <div class="form-group">\n\t\t\t\t                        \t<label class="sr-only" for="form-about-yourself">About yourself</label>\n\t\t\t\t                        \t<textarea name="form-about-yourself" placeholder="About yourself..." \n\t\t\t\t                        \t\t\t\tclass="form-about-yourself form-control" id="form-about-yourself"></textarea>\n\t\t\t\t                        </div>\n\t\t\t\t                        <button type="submit" class="btn">Sign me up!</button>\n\t\t\t\t                    </form>\n\t\t\t                    </div>\n                        \t</div>\n                        \t\n                        </div>\n                    </div>\n                    \n                </div>\n            </div>\n            \n        </div>\n\n</div>\n-->\n');$templateCache.put('modules/signout/signout.html','<div>\n    <div class="row">\n       <div class="col-sm-5">\n                        \t\n            <div class="form-box">\n                <div class="form-top">\n                    <div class="form-top-left">\n                        <h3>Login to our site</h3>\n                        <p>Enter username and password to log out:</p>\n                    </div>\n                    <div class="form-top-right">\n                        <i class="fa fa-key"></i>\n                    </div>\n                </div>\n                <div class="form-bottom">\n                    <form name="login" role="form" method="post" class="login-form" ng-submit="auth.logout()">\n                        <div class="form-group">\n                            <label class="sr-only" for="form-username">Username</label>\n                            <input type="text" name="username" placeholder="Username..." class="form-username form-control" id="username" ng-model="signout.user.username">\n                        </div>\n                        <div class="form-group">\n                            <label class="sr-only" for="form-password">Password</label>\n                            <input type="password" name="password" placeholder="Password..." class="form-password form-control" id="password" ng-model="signout.user.password">\n                        </div>\n                        <button type="logout" class="btn" value="Logout">Sign Out!</button>\n                    </form>\n                </div>\n            </div>\n\n\n\n        </div>\n        \n    </div>\n</div>');$templateCache.put('modules/user/user.html','<div>\n    <div>This is user page.</div>\n    <div>\n        <button ng-click="$ctrl.listUsers()" class="btn">List</button>\n    </div>\n    <div>\n        <ui ng-repeat="user in $ctrl.list_user">\n            <li class="user-listitem">{{ user.name }} {{ user.position }}</li>\n        </ui>\n    </div>\n    <div class="emotion-disappoint"></div>\n</div>\n');}]);

},{}],45:[function(require,module,exports){
"use strict";

var _user = require("./user.service");

//import {UserController} from "./user.controller";

angular.module("User")
//.config(UserConfig)
.factory("UserService", _user.UserService);
//.controller("UserController", UserController);
//import {UserConfig} from "./user.config";

},{"./user.service":46}],46:[function(require,module,exports){
'use strict';

UserService.$inject = ["$timeout", "$filter", "$q", "$http", "MainAppConstant"];
Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.UserService = UserService;
/**
 * @ngdoc service
 * @name User.service:UserService
 * @description Service for User module.
 */
function UserService($timeout, $filter, $q, $http, MainAppConstant) {
    "ngInject";

    var service = {};

    service.GetAll = GetAll;
    service.GetById = GetById;
    //service.GetByUsername = GetByUsername;
    service.isDuplicateUsername = isDuplicateUsername;
    service.Create = Create;
    service.Update = Update;
    service.Delete = Delete;

    return service;

    function GetAll() {
        var deferred = $q.defer();
        deferred.resolve(getUsers());
        return deferred.promise;
    }

    function GetById(id) {
        var deferred = $q.defer();
        var filtered = $filter('filter')(getUsers(), { id: id });
        var user = filtered.length ? filtered[0] : null;
        deferred.resolve(user);
        return deferred.promise;
    }

    //        function GetByUsername(username) {
    //            var deferred = $q.defer();
    //            var filtered = $filter('filter')(getUsers(), { username: username });
    //            var user = filtered.length ? filtered[0] : null;
    //            deferred.resolve(user);
    //            return deferred.promise;
    //        }

    function isDuplicateUsername(username) {
        var result = void 0;
        jQuery.ajax(MainAppConstant.apiPath + '/users/duplicate/' + username, {
            type: "GET",
            async: false,
            success: function success(data) {
                result = data.is;
            }
        });
        return result;
    }

    function Create(user) {
        var deferred = $q.defer();
        $http.post(MainAppConstant.apiPath + '/users', user).then(function (respond) {
            localStorage.token = respond.data.token;

            deferred.resolve();
        }, function (reason) {
            delete localStorage.token;

            deferred.reject();
        });
        return deferred.promise;

        //            var deferred = $q.defer();              // simulate api call with $timeout
        //
        //            $timeout(function () {
        //                GetByUsername(user.username)                    .then(function (duplicateUser) {
        //                    if (duplicateUser !== null) {
        //                        deferred.resolve({
        //                            success: false,
        //                            message: 'Username "' + user.username + '" is already taken'
        //                        });
        //                    } else {
        //                        var users = getUsers();                              // assign id
        //
        //                        var lastUser = users[users.length - 1] || {
        //                            id: 0
        //                        };
        //                        user.id = lastUser.id + 1;                              // save to local storage
        //
        //                        users.push(user);
        //                        setUsers(users);
        //                        deferred.resolve({
        //                            success: true
        //                        });
        //                    }
        //                });
        //            }, 1000);
        //            return deferred.promise;
    }

    function Update(user) {
        var deferred = $q.defer();

        var users = getUsers();
        for (var i = 0; i < users.length; i++) {
            if (users[i].id === user.id) {
                users[i] = user;
                break;
            }
        }
        setUsers(users);
        deferred.resolve();

        return deferred.promise;
    }

    function Delete(id) {
        var deferred = $q.defer();

        var users = getUsers();
        for (var i = 0; i < users.length; i++) {
            var user = users[i];
            if (user.id === id) {
                users.splice(i, 1);
                break;
            }
        }
        setUsers(users);
        deferred.resolve();

        return deferred.promise;
    }

    // private functions

    function getUsers() {
        if (!localStorage.users) {
            localStorage.users = JSON.stringify([]);
        }

        return JSON.parse(localStorage.users);
    }

    function setUsers(users) {
        localStorage.users = JSON.stringify(users);
    }
}

},{}]},{},[3]);
