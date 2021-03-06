// Generated by CoffeeScript 1.12.7

/*
Copyright 2016 Balena

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
 */

/**
 * @module request
 */
var Promise, assign, defaults, errors, fetchReadableStream, getRequest, isEmpty, noop, progress, rindle, urlLib, utils;

Promise = require('bluebird');

urlLib = require('url');

assign = require('lodash/assign');

noop = require('lodash/noop');

defaults = require('lodash/defaults');

isEmpty = require('lodash/isEmpty');

rindle = require('rindle');

fetchReadableStream = require('fetch-readablestream');

errors = require('balena-errors');

utils = require('./utils');

progress = require('./progress');

module.exports = getRequest = function(arg) {
  var auth, debug, debugRequest, exports, interceptRequestError, interceptRequestOptions, interceptRequestOrError, interceptResponse, interceptResponseError, interceptResponseOrError, interceptors, isBrowser, prepareOptions, ref, ref1, ref2, ref3, ref4, requestAsync, requestBrowserStream, retries;
  ref = arg != null ? arg : {}, auth = ref.auth, debug = (ref1 = ref.debug) != null ? ref1 : false, retries = (ref2 = ref.retries) != null ? ref2 : 0, isBrowser = (ref3 = ref.isBrowser) != null ? ref3 : false, interceptors = (ref4 = ref.interceptors) != null ? ref4 : [];
  requestAsync = utils.getRequestAsync();
  requestBrowserStream = utils.getRequestAsync(fetchReadableStream);
  debugRequest = !debug ? noop : utils.debugRequest;
  exports = {};
  prepareOptions = function(options) {
    var baseUrl;
    if (options == null) {
      options = {};
    }
    defaults(options, {
      method: 'GET',
      json: true,
      strictSSL: true,
      headers: {},
      sendToken: true,
      refreshToken: true,
      retries: retries
    });
    baseUrl = options.baseUrl;
    if (options.uri) {
      options.url = options.uri;
      delete options.uri;
    }
    if (urlLib.parse(options.url).protocol != null) {
      delete options.baseUrl;
    }
    return Promise["try"](function() {
      if (!((auth != null) && options.sendToken && options.refreshToken)) {
        return;
      }
      return utils.shouldRefreshKey(auth).then(function(shouldRefreshKey) {
        if (!shouldRefreshKey) {
          return;
        }
        return exports.refreshToken(options);
      });
    }).then(function() {
      if (options.sendToken) {
        return utils.getAuthorizationHeader(auth);
      }
    }).then(function(authorizationHeader) {
      if (authorizationHeader != null) {
        options.headers.Authorization = authorizationHeader;
      }
      if (!isEmpty(options.apiKey)) {
        options.url += urlLib.parse(options.url).query != null ? '&' : '?';
        options.url += "apikey=" + options.apiKey;
      }
      return options;
    });
  };
  interceptRequestOptions = function(requestOptions) {
    return interceptRequestOrError(Promise.resolve(requestOptions));
  };
  interceptRequestError = function(requestError) {
    return interceptRequestOrError(Promise.reject(requestError));
  };
  interceptResponse = function(response) {
    return interceptResponseOrError(Promise.resolve(response));
  };
  interceptResponseError = function(responseError) {
    return interceptResponseOrError(Promise.reject(responseError));
  };
  interceptRequestOrError = function(initialPromise) {
    return Promise.resolve(exports.interceptors.reduce(function(promise, arg1) {
      var request, requestError;
      request = arg1.request, requestError = arg1.requestError;
      if ((request != null) || (requestError != null)) {
        return promise.then(request, requestError);
      } else {
        return promise;
      }
    }, initialPromise));
  };
  interceptResponseOrError = function(initialPromise) {
    interceptors = exports.interceptors.slice().reverse();
    return Promise.resolve(interceptors.reduce(function(promise, arg1) {
      var response, responseError;
      response = arg1.response, responseError = arg1.responseError;
      if ((response != null) || (responseError != null)) {
        return promise.then(response, responseError);
      } else {
        return promise;
      }
    }, initialPromise));
  };

  /**
  	 * @summary Perform an HTTP request to balena
  	 * @function
  	 * @public
  	 *
  	 * @description
  	 * This function automatically handles authorization with balena.
  	 *
  	 * The module scans your environment for a saved session token. Alternatively, you may pass the `apiKey` option. Otherwise, the request is made anonymously.
  	 *
  	 * Requests can be aborted using an AbortController (with a polyfill like https://www.npmjs.com/package/abortcontroller-polyfill
  	 * if necessary). This is not well supported everywhere yet, is on a best-efforts basis, and should not be relied upon.
  	 *
  	 * @param {Object} options - options
  	 * @param {String} [options.method='GET'] - method
  	 * @param {String} options.url - relative url
  	 * @param {String} [options.apiKey] - api key
  	 * @param {String} [options.responseFormat] - explicit expected response format,
  	 * can be one of 'blob', 'json', 'text', 'none'. Defaults to sniffing the content-type
  	 * @param {AbortSignal} [options.signal] - a signal from an AbortController
  	 * @param {*} [options.body] - body
  	 *
  	 * @returns {Promise<Object>} response
  	 *
  	 * @example
  	 * request.send
  	 * 	method: 'GET'
  	 * 	baseUrl: 'https://api.balena-cloud.com'
  	 * 	url: '/foo'
  	 * .get('body')
  	 *
  	 * @example
  	 * request.send
  	 * 	method: 'POST'
  	 * 	baseUrl: 'https://api.balena-cloud.com'
  	 * 	url: '/bar'
  	 * 	data:
  	 * 		hello: 'world'
  	 * .get('body')
   */
  exports.send = function(options) {
    if (options == null) {
      options = {};
    }
    if (options.timeout == null) {
      options.timeout = 30000;
    }
    return prepareOptions(options).then(interceptRequestOptions, interceptRequestError).then(function(options) {
      return requestAsync(options)["catch"](function(error) {
        error.requestOptions = options;
        throw error;
      });
    }).then(function(response) {
      return utils.getBody(response, options.responseFormat).then(function(body) {
        var responseError;
        response = assign({}, response, {
          body: body
        });
        if (utils.isErrorCode(response.statusCode)) {
          responseError = utils.getErrorMessageFromResponse(response);
          debugRequest(options, response);
          throw new errors.BalenaRequestError(responseError, response.statusCode, options);
        }
        return response;
      });
    }).then(interceptResponse, interceptResponseError);
  };

  /**
  	 * @summary Stream an HTTP response from balena.
  	 * @function
  	 * @public
  	 *
  	 * @description
  	 * This function emits a `progress` event, passing an object with the following properties:
  	 *
  	 * - `Number percent`: from 0 to 100.
  	 * - `Number total`: total bytes to be transmitted.
  	 * - `Number received`: number of bytes transmitted.
  	 * - `Number eta`: estimated remaining time, in seconds.
  	 *
  	 * The stream may also contain the following custom properties:
  	 *
  	 * - `String .mime`: Equals the value of the `Content-Type` HTTP header.
  	 *
  	 * See `request.send()` for an explanation on how this function handles authentication, and details
  	 * on how to abort requests.
  	 *
  	 * @param {Object} options - options
  	 * @param {String} [options.method='GET'] - method
  	 * @param {String} options.url - relative url
  	 * @param {*} [options.body] - body
  	 *
  	 * @returns {Promise<Stream>} response
  	 *
  	 * @example
  	 * request.stream
  	 * 	method: 'GET'
  	 * 	baseUrl: 'https://img.balena-cloud.com'
  	 * 	url: '/download/foo'
  	 * .then (stream) ->
  	 * 	stream.on 'progress', (state) ->
  	 * 		console.log(state)
  	 *
  	 * 	stream.pipe(fs.createWriteStream('/opt/download'))
   */
  exports.stream = function(options) {
    var requestStream;
    if (options == null) {
      options = {};
    }
    requestStream = isBrowser ? requestBrowserStream : requestAsync;
    return prepareOptions(options).then(interceptRequestOptions, interceptRequestError).then(progress.estimate(requestStream, isBrowser)).then(function(download) {
      if (!utils.isErrorCode(download.response.statusCode)) {
        download.mime = download.response.headers.get('Content-Type');
        return download;
      }
      return rindle.extract(download).then(function(data) {
        var responseError;
        responseError = data || 'The request was unsuccessful';
        debugRequest(options, download.response);
        throw new errors.BalenaRequestError(responseError, download.response.statusCode);
      });
    }).then(interceptResponse, interceptResponseError);
  };

  /**
  	 * @summary Array of interceptors
  	 * @type {Interceptor[]}
  	 * @public
  	 *
  	 * @description
  	 * The current array of interceptors to use. Interceptors intercept requests made
  	 * by calls to `.stream()` and `.send()` (some of which are made internally) and
  	 * are executed in the order they appear in this array for requests, and in the
  	 * reverse order for responses.
  	 *
  	 * @example
  	 * request.interceptors.push(
  	 * 	requestError: (error) ->
  	 *		console.log(error)
  	 *		throw error
  	 * )
   */
  exports.interceptors = interceptors;

  /**
  	 * @typedef Interceptor
  	 * @type {object}
  	 *
  	 * @description
  	 * An interceptor implements some set of the four interception hook callbacks.
  	 * To continue processing, each function should return a value or a promise that
  	 * successfully resolves to a value.
  	 *
  	 * To halt processing, each function should throw an error or return a promise that
  	 * rejects with an error.
  	 *
  	 * @property {function} [request] - Callback invoked before requests are made. Called with
  	 * the request options, should return (or resolve to) new request options, or throw/reject.
  	 *
  	 * @property {function} [response] - Callback invoked before responses are returned. Called with
  	 * the response, should return (or resolve to) a new response, or throw/reject.
  	 *
  	 * @property {function} [requestError] - Callback invoked if an error happens before a request.
  	 * Called with the error itself, caused by a preceeding request interceptor rejecting/throwing
  	 * an error for the request, or a failing in preflight token validation. Should return (or resolve
  	 * to) new request options, or throw/reject.
  	 *
  	 * @property {function} [responseError] - Callback invoked if an error happens in the response.
  	 * Called with the error itself, caused by a preceeding response interceptor rejecting/throwing
  	 * an error for the request, a network error, or an error response from the server. Should return
  	 * (or resolve to) a new response, or throw/reject.
   */

  /**
  	 * @summary Refresh token on user request
  	 * @function
  	 * @public
  	 *
  	 * @description
  	 * This function automatically refreshes the authentication token.
  	 *
  	 * @param {String} options.url - relative url
  	 *
  	 * @returns {String} token - new token
  	 *
  	 * @example
  	 * request.refreshToken
  	 * 	baseUrl: 'https://api.balena-cloud.com'
   */
  exports.refreshToken = function(options) {
    var baseUrl;
    if (options == null) {
      options = {};
    }
    baseUrl = options.baseUrl;
    if (!(auth != null)) {
      throw new Error('Auth module not provided in initializer');
    }
    return exports.send({
      url: '/whoami',
      baseUrl: baseUrl,
      refreshToken: false
    })["catch"]({
      code: 'BalenaRequestError',
      statusCode: 401
    }, function() {
      return auth.getKey().tap(auth.removeKey).then(function(key) {
        throw new errors.BalenaExpiredToken(key);
      });
    }).get('body').tap(auth.setKey);
  };
  return exports;
};
