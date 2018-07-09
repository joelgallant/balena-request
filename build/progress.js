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
var getProgressStream, noop, progress, stream, utils, webStreams, zlib;

noop = require('lodash/noop');

webStreams = require('node-web-streams');

progress = require('progress-stream');

zlib = require('zlib');

stream = require('stream');

utils = require('./utils');


/**
 * @module progress
 */


/**
 * @summary Get progress stream
 * @function
 * @private
 *
 * @param {Number} total - response total
 * @param {Function} [onState] - on state callback (state)
 * @returns {Stream} progress stream
 *
 * @example
 * progressStream = getProgressStream response, (state) ->
 * 	console.log(state)
 *
 * return responseStream.pipe(progressStream).pipe(output)
 */

getProgressStream = function(total, onState) {
  var progressStream;
  if (onState == null) {
    onState = noop;
  }
  progressStream = progress({
    time: 500,
    length: total
  });
  progressStream.on('progress', function(state) {
    if (state.length === 0) {
      return onState(void 0);
    }
    return onState({
      total: state.length,
      received: state.transferred,
      eta: state.eta,
      percentage: state.percentage
    });
  });
  return progressStream;
};


/**
 * @summary Make a node request with progress
 * @function
 * @protected
 *
 * @param {Object} options - request options
 * @returns {Promise<Stream>} request stream
 *
 * @example
 * progress.estimate(options).then (stream) ->
 *		stream.pipe(fs.createWriteStream('foo/bar'))
 *		stream.on 'progress', (state) ->
 *			console.log(state)
 */

exports.estimate = function(requestAsync, isBrowser) {
  return function(options) {
    var reader;
    if (requestAsync == null) {
      requestAsync = utils.getRequestAsync();
    }
    options.gzip = false;
    options.headers['Accept-Encoding'] = 'gzip, deflate';
    reader = null;
    if (options.signal != null) {
      options.signal.addEventListener('abort', function() {
        if (reader) {
          reader.cancel()["catch"](function() {});
          return reader.releaseLock();
        }
      }, {
        once: true
      });
    }
    return requestAsync(options).then(function(response) {
      var gunzip, output, progressStream, responseLength, responseStream, total;
      output = new stream.PassThrough();
      output.response = response;
      responseLength = utils.getResponseLength(response);
      total = responseLength.uncompressed || responseLength.compressed;
      if (response.body.getReader) {
        responseStream = webStreams.toNodeReadable(response.body);
        reader = responseStream._reader;
      } else {
        responseStream = response.body;
      }
      progressStream = getProgressStream(total, function(state) {
        return output.emit('progress', state);
      });
      if (!isBrowser && utils.isResponseCompressed(response)) {
        gunzip = new zlib.createGunzip();
        if ((responseLength.compressed != null) && (responseLength.uncompressed == null)) {
          responseStream.pipe(progressStream).pipe(gunzip).pipe(output);
        } else {
          responseStream.pipe(gunzip).pipe(progressStream).pipe(output);
        }
      } else {
        responseStream.pipe(progressStream).pipe(output);
      }
      responseStream.on('error', function(e) {
        return output.emit('error', e);
      });
      return output;
    });
  };
};
