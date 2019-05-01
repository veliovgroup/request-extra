'use strict';

const { URL }  = require('url');
const { Curl } = require('node-libcurl');

const request = function LibCurlRequest (_opts, cb) {
  const opts       = Object.assign({}, request.defaultOptions, _opts);
  opts.method      = opts.method.toUpperCase();
  let finished     = false;
  let timeoutTimer = null;
  let retryTimer   = null;
  const curl       = new Curl();
  const url        = new URL(opts.uri);

  curl.setOpt('URL', url.href);
  // Uncomment to show more debug information.
  curl.setOpt(Curl.option.VERBOSE, opts.debug);

  curl.setOpt(Curl.option.NOPROGRESS, true);
  curl.setOpt(Curl.option.TIMEOUT, opts.timeout * 2);
  curl.setOpt(Curl.option.MAXREDIRS, opts.maxRedirects);
  curl.setOpt(Curl.option.CUSTOMREQUEST, opts.method);
  curl.setOpt(Curl.option.CONNECTTIMEOUT, opts.timeout);
  curl.setOpt(Curl.option.FOLLOWLOCATION, opts.followRedirect);
  curl.setOpt(Curl.option.SSL_VERIFYPEER, opts.rejectUnauthorized ? 1 : 0);
  curl.setOpt(Curl.option.SSL_VERIFYHOST, 0);
  curl.setOpt(Curl.option.CONNECTTIMEOUT_MS, opts.timeout);
  curl.setOpt(Curl.option.ACCEPT_ENCODING, '');

  const customHeaders = [`Host: ${url.hostname}`, 'Accept: */*'];
  for (let header in opts.headers) {
    if (opts.headers[header]) {
      customHeaders.push(`${header}: ${opts.headers[header]}`);
    }
  }

  if (opts.auth) {
    customHeaders.push(`Authorization: Basic ${Buffer.from(opts.auth).toString('base64')}`);
  }

  opts.debug && console.info('[request-libcurl] REQUEST:', opts, url, customHeaders);

  const stopRetryTimeout = () => {
    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }
  };

  const stopRequestTimeout = () => {
    if (timeoutTimer) {
      clearTimeout(timeoutTimer);
      timeoutTimer = null;
    }
    stopRetryTimeout();
  };

  const retry = () => {
    stopRetryTimeout();
    retryTimer = setTimeout(() => {
      --opts.retries;
      request(opts, cb);
    }, opts.retryDelay);
  };

  const promise = new Promise((resolve, reject) => {
    curl.on('end', (statusCode, body, headers) => {
      stopRequestTimeout();
      if (finished) { return; }
      curl.close();

      if ((request.isBadStatus(statusCode || 408, opts.badStatuses)) && opts.retry === true && opts.retries > 0) {
        retry();
      } else {
        finished = true;
        cb ? cb(void 0, {statusCode, body, headers}) : resolve({statusCode, body, headers});
      }
    });

    curl.on('error', (error, errorCode) => {
      stopRequestTimeout();
      if (finished) { return; }
      curl.close();
      error.code = errorCode;
      error.message = 'Error occurred during request';
      error.errorCode = errorCode;
      error.statusCode = 408;

      if (opts.retry === true && opts.retries > 0) {
        retry();
      } else {
        finished = true;
        cb ? cb(error) : reject(error);
      }
    });

    if (opts.method === 'POST' && opts.form) {
      if (typeof opts.form !== 'string') {
        try {
          opts.form = JSON.stringify(opts.form);
        } catch (e) {
          throw new Error('Can\'t stringify opts.form in POST request ' + e);
        }
      }

      customHeaders.push('Content-Type: application/x-www-form-urlencoded');
      customHeaders.push(`Content-Length: ${Buffer.byteLength(opts.form)}`);
      curl.setOpt(Curl.option.POSTFIELDS, opts.form);
    }

    curl.setOpt(Curl.option.HTTPHEADER, customHeaders);

    timeoutTimer = setTimeout(() => {
      stopRequestTimeout();
      if (!finished) {
        curl.close();
        if (opts.retries > 0) {
          retry();
        } else {
          finished = true;
          const error = {
            code: 28,
            message: '408: host unreachable, request timeout',
            errorCode: 28,
            statusCode: 408
          };
          cb ? cb(error) : reject(error);
        }
      }
    }, opts.timeout + 2500);

    curl.perform();
  });

  promise.abort = () => {
    curl.close();
  };
  return promise;
};

request.defaultOptions  = {
  retry: true,
  debug: true,
  method: 'GET',
  timeout: 6144,
  retries: 3,
  retryDelay: 256,
  maxRedirects: 4,
  followRedirect: true,
  rejectUnauthorized: false,
  badStatuses: [300, 303, 305, 400, 407, 408, 409, 410, 500, 510],
  isBadStatus(statusCode, badStatuses = request.defaultOptions.badStatuses) {
    return badStatuses.includes(statusCode) || statusCode >= 500;
  },
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/73.0.3683.103 Safari/537.36'
  }
};

module.exports = request;
