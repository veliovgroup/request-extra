'use strict';

const { URL } = require('url');
const { Curl, CurlFeature } = require('node-libcurl');
const EventEmitter = require('events');
const badUrlError = {
  code: 3,
  status: 400,
  message: '400: URL Malformed / Invalid URL',
  errorCode: 3,
  statusCode: 400
};

const badRequestError = {
  code: 43,
  status: 400,
  message: '400: Bad request',
  errorCode: 43,
  statusCode: 400
};

const _debug = (...args) => {
  // if (this.opts.debug) {
  console.info.call(console, '[DEBUG] [request-libcurl]', ...args);
  // }
};

const sendRequest = (libcurl, url, cb) => {
  _debug('[sendRequest]', url.href);

  if (libcurl.currentCurl && libcurl.currentCurl.close) {
    libcurl.currentCurl.close.call(libcurl.currentCurl);
    delete libcurl.currentCurl;
  }

  const opts       = libcurl.opts;
  const curl       = new Curl();
  let finished     = false;
  let timeoutTimer = null;

  const stopRequestTimeout = () => {
    if (timeoutTimer) {
      clearTimeout(timeoutTimer);
      timeoutTimer = null;
    }
  };

  if (opts.noStorage || opts.rawBody) {
    curl.enable(CurlFeature.NO_STORAGE);
  }

  curl.setOpt('URL', url.href);
  curl.setOpt(Curl.option.VERBOSE, opts.debug);

  if (opts.proxy && typeof opts.proxy === 'string') {
    curl.setOpt(Curl.option.PROXY, opts.proxy);
  } else if (opts.proxy === true) {
    curl.setOpt(Curl.option.PROXY, url.origin);
  }

  curl.setOpt(Curl.option.NOPROGRESS, true);
  curl.setOpt(Curl.option.TIMEOUT_MS, opts.timeout * 2);
  curl.setOpt(Curl.option.MAXREDIRS, opts.maxRedirects);
  curl.setOpt(Curl.option.CUSTOMREQUEST, opts.method);
  curl.setOpt(Curl.option.FOLLOWLOCATION, opts.followRedirect);
  curl.setOpt(Curl.option.SSL_VERIFYPEER, opts.rejectUnauthorized ? 1 : 0);
  curl.setOpt(Curl.option.SSL_VERIFYHOST, 0);
  curl.setOpt(Curl.option.CONNECTTIMEOUT_MS, opts.timeout);
  if (opts.keepAlive === true) {
    curl.setOpt(Curl.option.TCP_KEEPALIVE, 1);
  }
  curl.setOpt(Curl.option.ACCEPT_ENCODING, '');

  const customHeaders = [];
  if (url.hostname) {
    customHeaders.push(`Host: ${url.hostname}`);
  }

  for (let header in opts.headers) {
    if (opts.headers[header]) {
      customHeaders.push(`${header}: ${opts.headers[header]}`);
    }
  }

  if (opts.auth) {
    customHeaders.push(`Authorization: Basic ${Buffer.from(opts.auth).toString('base64')}`);
  }

  curl.on('end', (statusCode, body, _headers) => {
    _debug('[END EVENT]', opts.retries, url.href, statusCode);
    stopRequestTimeout();
    if (finished) { return; }

    finished = true;
    curl.close();

    const headers = {};
    if (_headers && _headers[0]) {
      delete _headers[0].result;
      for (let headerName in _headers[0]) {
        if (_headers[0][headerName]) {
          headers[headerName.toLowerCase()] = _headers[0][headerName];
        }
      }
    }

    cb(void 0, {statusCode, status: statusCode, body, headers});
  });

  curl.on('error', (error, errorCode) => {
    _debug('REQUEST ERROR:', opts.retries, url.href, {error, errorCode});
    stopRequestTimeout();
    if (finished) { return; }

    finished = true;
    curl.close();

    error.code       = errorCode;
    error.status     = 408;
    error.message    = typeof error.toString === 'function' ? error.toString() : 'Error occurred during request';
    error.errorCode  = errorCode;
    error.statusCode = 408;

    cb(error);
  });

  if (opts.method === 'POST' && opts.form) {
    if (typeof opts.form !== 'string') {
      try {
        opts.form = JSON.stringify(opts.form);
      } catch (e) {
        _debug('Can\'t stringify opts.form in POST request :', url.href, e);
        finished = true;
        process.nextTick(() => {
          curl.close();
          cb(badRequestError);
        });
        return curl;
      }
    }

    customHeaders.push('Content-Type: application/x-www-form-urlencoded');
    customHeaders.push(`Content-Length: ${Buffer.byteLength(opts.form)}`);
    curl.setOpt(Curl.option.POSTFIELDS, opts.form);
  }

  curl.setOpt(Curl.option.HTTPHEADER, customHeaders);

  if (!opts.wait) {
    process.nextTick(() => {
      libcurl.send();
    });
  }

  return curl;
};


class LibCurlRequest extends Promise {
  constructor (opts, cb) {
    _debug('[constructor]', opts.url || opts.uri);
    Object.assign(this, Object.create(EventEmitter.prototype));
    this.cb         = cb || (() => {});
    this.retryTimer = false;

    this.sent     = false;
    this.finished = false;
    this.opts     = Object.assign({}, request.defaultOptions, opts);
    opts.method   = opts.method.toUpperCase();
    let isBadUrl  = false;
    let url;

    if (!this.opts.uri && !this.opts.url) {
      _debug('REQUEST: BAD URL PROVIDED ERROR:', opts);
      isBadUrl = true;
    }

    try {
      this.url = new URL(this.opts.uri || this.opts.url);
    } catch (urlError) {
      _debug('REQUEST: `new URL()` ERROR:', opts, urlError);
      isBadUrl = true;
    }

    super((resolve, reject) => {
      this._resolve = resolve;
      this._reject = reject;

      if (isBadUrl) {
        process.nextTick(() => {
          cb(badUrlError);
          reject(badUrlError);
        });
        return;
      }

      if (!this.opts.wait) {
        this.currentCurl = sendRequest(this, url, this.sendRequestCallback);
      }
    });
  }

  retry() {
    if (this.opts.retry === true && this.opts.retries > 0) {
      --this.opts.retries;
      this.retryTimer = setTimeout(() => {
        this.currentCurl = sendRequest(this, this.url, this.sendRequestCallback);
      }, this.opts.retryDelay);
      return true;
    }
    return false;
  }

  sendRequestCallback(error, result) {
    let isRetry    = false;
    let statusCode = false;

    if (error && error.statusCode) {
      statusCode = error.statusCode;
    }
    if (result && result.statusCode) {
      statusCode = result.statusCode;
    }

    if (error) {
      isRetry = this.retry();
    } else if ((this.opts.isBadStatus(statusCode || 408, this.opts.badStatuses)) && this.opts.retry === true && this.opts.retries > 1) {
      isRetry = this.retry();
    }

    if (!isRetry) {
      this.finished = true;
      if (error) {
        this.cb(error);
        this._reject(error);
      } else {
        this.cb(void 0, result);
        this._resolve(result);
      }
    }
  }

  then(onFulfilled, onRejected) {
    return super.then(onFulfilled, onRejected);
  }

  send() {
    if (this.sent) { return; }
    this.sent = true;
    this.currentCurl.perform.call(this.currentCurl);
  }

  abort() {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = false;
    }

    if (!this.finished) {
      if (this.currentCurl && this.currentCurl.close) {
        this.currentCurl.close.call(this.currentCurl);
        delete this.currentCurl;
      }

      this.finished = true;
    }
  }
}

function request (opts, cb) {
  return new LibCurlRequest(opts, cb);
}


// const request = function LibCurlRequest (_opts, cb, _promises) {


//   _debug('REQUEST:', url.href);

//   if (cb) {
//     console.log(">>>> HAS CB [cb]");
//     promises.last.catch((err) => {_debug(">>>>>>>>>> PLAIN PROMISE [CATCH]", err);});
//     promises.last.then((err) => {_debug(">>>>>>>>>> PLAIN PROMISE [THEN]", err);});
//   }

//   promises.last.request = curl;
//   promises.last.send    = _perform;
//   promises.last.abort   = () => {
//     if (finished) { return; }
//     _debug('[request.promise.abort()] URL:', url.href);
//     try {
//       curl.close();
//       finished = true;
//       const error = {
//         code: 42,
//         status: 499,
//         message: '499: Client Closed Request',
//         errorCode: 42,
//         statusCode: 499
//       };

//       cb(error);
//       reject(error);
//     } catch (error) {
//       // we're good here...
//       _debug('[request.promise.abort()] ERROR:', url.href, error);
//     }
//   };

//   console.log({_promises, promises});

//   return _promises ? promises : Promise.all(promises.values);
// };

request.defaultOptions  = {
  wait: false,
  proxy: false,
  retry: true,
  debug: true,
  method: 'GET',
  timeout: 6144,
  retries: 3,
  rawBody: false,
  keepAlive: false,
  noStorage: false,
  retryDelay: 256,
  maxRedirects: 4,
  followRedirect: true,
  rejectUnauthorized: false,
  badStatuses: [300, 303, 305, 400, 407, 408, 409, 410, 500, 510],
  isBadStatus(statusCode, badStatuses = request.defaultOptions.badStatuses) {
    return badStatuses.includes(statusCode) || statusCode >= 500;
  },
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/73.0.3683.103 Safari/537.36',
    Accept: '*/*'
  }
};

module.exports = request;
