// Generated by CoffeeScript 1.12.7

/*
Copyright 2016 Resin.io

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
var Headers, IS_BROWSER, Promise, UNSUPPORTED_REQUEST_PARAMS, assign, errors, includes, normalFetch, parseInt, processRequestOptions, qs, ref, requestAsync, urlLib;

Promise = require('bluebird');

ref = require('fetch-ponyfill')({
  Promise: Promise
}), normalFetch = ref.fetch, Headers = ref.Headers;

urlLib = require('url');

qs = require('qs');

parseInt = require('lodash/parseInt');

assign = require('lodash/assign');

includes = require('lodash/includes');

errors = require('resin-errors');

IS_BROWSER = typeof window !== "undefined" && window !== null;


/**
 * @module utils
 */

exports.TOKEN_REFRESH_INTERVAL = 1 * 1000 * 60 * 60;


/**
 * @summary Determine if the token should be updated
 * @function
 * @protected
 *
 * @description
 * This function makes use of a soft user-configurable setting called `tokenRefreshInterval`.
 * That setting doesn't express that the token is "invalid", but represents that it is a good time for the token to be updated *before* it get's outdated.
 *
 * @param {Object} tokenInstance - an instance of `resin-auth`
 * @returns {Promise<Boolean>} the token should be updated
 *
 * @example
 * tokenUtils.shouldRefreshKey(tokenInstance).then (shouldRefreshKey) ->
 *		if shouldRefreshKey
 *			console.log('Updating token!')
 */

exports.shouldRefreshKey = function(auth) {
  return auth.hasKey().then(function(hasKey) {
    if (!hasKey) {
      return false;
    }
    return auth.getType().then(function(type) {
      if (type !== 'JWT') {
        return false;
      }
      return auth.getAge().then(function(age) {
        return age >= exports.TOKEN_REFRESH_INTERVAL;
      });
    });
  });
};


/**
 * @summary Get authorization header content
 * @function
 * @protected
 *
 * @description
 * This promise becomes undefined if no saved token.
 *
 * @param {Object} tokenInstance - an instance of `resin-auth`
 * @returns {Promise<String>} authorization header
 *
 * @example
 * utils.getAuthorizationHeader(tokenInstance).then (authorizationHeader) ->
 *		headers =
 *			Authorization: authorizationHeader
 */

exports.getAuthorizationHeader = Promise.method(function(auth) {
  if (auth == null) {
    return;
  }
  return auth.hasKey().then(function(hasKey) {
    if (!hasKey) {
      return;
    }
    return auth.getKey().then(function(key) {
      return "Bearer " + key;
    });
  });
});


/**
 * @summary Get error message from response
 * @function
 * @protected
 *
 * @param {Object} response - node request response
 * @returns {String} error message
 *
 * @example
 * request
 *		method: 'GET'
 *		url: 'https://foo.bar'
 *	, (error, response) ->
 *		throw error if error?
 *		message = utils.getErrorMessageFromResponse(response)
 */

exports.getErrorMessageFromResponse = function(response) {
  var errorText, ref1;
  if (!response.body) {
    return 'The request was unsuccessful';
  }
  errorText = (ref1 = response.body.error) != null ? ref1.text : void 0;
  if (errorText != null) {
    return errorText;
  }
  return response.body;
};


/**
 * @summary Check if the status code represents an error
 * @function
 * @protected
 *
 * @param {Number} statusCode - status code
 * @returns {Boolean} represents an error
 *
 * @example
 * if utils.isErrorCode(400)
 *		console.log('400 is an error code!')
 */

exports.isErrorCode = function(statusCode) {
  return statusCode >= 400;
};


/**
 * @summary Check whether a response body is compressed
 * @function
 * @protected
 *
 * @param {Object} response - request response object
 * @returns {Boolean} whether the response body is compressed
 *
 * @example
 * if utils.isResponseCompressed(response)
 * 	console.log('The response body is compressed')
 */

exports.isResponseCompressed = function(response) {
  return response.headers.get('Content-Encoding') === 'gzip';
};


/**
 * @summary Get response compressed/uncompressed length
 * @function
 * @protected
 *
 * @param {Object} response - request response object
 * @returns {Object} response length
 *
 * @example
 * responseLength = utils.getResponseLength(response)
 * console.log(responseLength.compressed)
 * console.log(responseLength.uncompressed)
 */

exports.getResponseLength = function(response) {
  return {
    uncompressed: parseInt(response.headers.get('Content-Length'), 10) || void 0,
    compressed: parseInt(response.headers.get('X-Transfer-Length'), 10) || void 0
  };
};


/**
 * @summary Print debug information about a request/response.
 * @function
 * @protected
 *
 * @param {Object} options - request options
 * @param {Object} response - request response
 *
 * @example
 * options = {
 * 	method: 'GET'
 *	 url: '/foo'
 * }
 *
 * request(options).spread (response) ->
 * 	utils.debugRequest(options, response)
 */

exports.debugRequest = function(options, response) {
  return console.error(assign({
    statusCode: response.statusCode,
    duration: response.duration
  }, options));
};

UNSUPPORTED_REQUEST_PARAMS = ['qsParseOptions', 'qsStringifyOptions', 'useQuerystring', 'form', 'formData', 'multipart', 'preambleCRLF', 'postambleCRLF', 'jsonReviver', 'jsonReplacer', 'auth', 'oauth', 'aws', 'httpSignature', 'followAllRedirects', 'maxRedirects', 'removeRefererHeader', 'encoding', 'jar', 'agent', 'agentClass', 'agentOptions', 'forever', 'pool', 'localAddress', 'proxy', 'proxyHeaderWhiteList', 'proxyHeaderExclusiveList', 'time', 'har', 'callback'];

processRequestOptions = function(options) {
  var body, headers, i, key, len, opts, params, url;
  if (options == null) {
    options = {};
  }
  url = options.url || options.uri;
  if (options.baseUrl) {
    url = urlLib.resolve(options.baseUrl, url);
  }
  if (options.qs) {
    params = qs.stringify(options.qs);
    url += (url.indexOf('?') >= 0 ? '&' : '?') + params;
  }
  opts = {};
  opts.timeout = options.timeout;
  opts.retries = options.retries;
  opts.method = options.method;
  opts.compress = options.gzip;
  opts.signal = options.signal;
  body = options.body, headers = options.headers;
  if (headers == null) {
    headers = {};
  }
  if (options.json && body) {
    body = JSON.stringify(body);
    headers['Content-Type'] = 'application/json';
  }
  opts.body = body;
  if (!IS_BROWSER) {
    headers['Accept-Encoding'] || (headers['Accept-Encoding'] = 'compress, gzip');
  }
  if (options.followRedirect) {
    opts.redirect = 'follow';
  }
  opts.headers = new Headers(headers);
  if (options.strictSSL === false) {
    throw new Error('`strictSSL` must be true or absent');
  }
  for (i = 0, len = UNSUPPORTED_REQUEST_PARAMS.length; i < len; i++) {
    key = UNSUPPORTED_REQUEST_PARAMS[i];
    if (options[key] != null) {
      throw new Error("The " + key + " param is not supported. Value: " + options[key]);
    }
  }
  opts.mode = 'cors';
  return [url, opts];
};


/**
 * @summary Extract the body from the server response
 * @function
 * @protected
 *
 * @param {Response} response
 * @param {String} [responseFormat] - explicit expected response format,
 * can be one of 'blob', 'json', 'text', 'none'. Defaults to sniffing the content-type
 *
 * @example
 * utils.getBody(response).then (body) ->
 * 	console.log(body)
 */

exports.getBody = function(response, responseFormat) {
  return Promise["try"](function() {
    var contentType;
    if (responseFormat === 'none') {
      return null;
    }
    contentType = response.headers.get('Content-Type');
    if (responseFormat === 'blob' || ((responseFormat == null) && includes(contentType, 'binary/octet-stream'))) {
      if (typeof response.blob === 'function') {
        return response.blob();
      }
      if (typeof response.buffer === 'function') {
        return response.buffer();
      }
      throw new Error('This `fetch` implementation does not support decoding binary streams.');
    }
    if (responseFormat === 'json' || ((responseFormat == null) && includes(contentType, 'application/json'))) {
      return response.json();
    }
    if ((responseFormat == null) || responseFormat === 'text') {
      return response.text();
    }
    throw new errors.ResinInvalidParameterError('responseFormat', responseFormat);
  });
};

requestAsync = function(fetch, options, retriesRemaining) {
  var opts, p, ref1, requestTime, url;
  ref1 = processRequestOptions(options), url = ref1[0], opts = ref1[1];
  if (retriesRemaining == null) {
    retriesRemaining = opts.retries;
  }
  requestTime = new Date();
  p = fetch(url, opts);
  if (opts.timeout && IS_BROWSER) {
    p = p.timeout(opts.timeout);
  }
  p = p.then(function(response) {
    var ref2, responseTime;
    if ((opts.signal != null) && ((ref2 = response.body) != null ? ref2.cancel : void 0)) {
      if (opts.signal.aborted) {
        response.body.cancel();
      } else {
        opts.signal.addEventListener('abort', function() {
          return response.body.cancel();
        });
      }
    }
    responseTime = new Date();
    response.duration = responseTime - requestTime;
    response.statusCode = response.status;
    response.request = {
      headers: options.headers,
      uri: urlLib.parse(url)
    };
    return response;
  });
  if (retriesRemaining > 0) {
    return p["catch"](function() {
      return requestAsync(fetch, options, retriesRemaining - 1);
    });
  } else {
    return p;
  }
};


/**
 * @summary The factory that returns the `requestAsync` function.
 * @function
 * @protected
 *
 * @param {Function} [fetch] - the fetch implementation, defaults to that returned by `fetch-ponyfill`.
 *
 * @description The returned function keeps partial compatibility with promisified `request`
 * but uses `fetch` behind the scenes.
 * It accepts the `options` object.
 *
 * @example
 * utils.getRequestAsync()({ url: 'http://example.com' }).then (response) ->
 * 	console.log(response)
 */

exports.getRequestAsync = function(fetch) {
  if (fetch == null) {
    fetch = normalFetch;
  }
  return function(options) {
    return requestAsync(fetch, options);
  };
};
