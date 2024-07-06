'use strict';

const fs = require('fs');
const url = require('url');
const nodeLibcurl = require('node-libcurl');

const SSL_ERROR_CODES = [58, 60, 83, 90, 91];
const CURL_ERROR_CODES = [3, 4, 47];

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

const abortError = {
  code: 42,
  status: 499,
  message: '499: Client Closed Request',
  errorCode: 42,
  statusCode: 499
};

const noop = () => {};

const _debug = (...args) => {
  (console.info || console.log).call(console, '[DEBUG] [request-libcurl]', ...args);
};

const closeCurl = (curl) => {
  try {
    if (curl && curl.close) {
      curl.close.call(curl);
    }
  } catch (err) {
    // we are good here
  }
};

const sendRequest = (libcurl, url, cb) => {
  libcurl._debug('[sendRequest]', url.href);

  closeCurl(libcurl.curl);

  const opts = libcurl.opts;
  const curl = new nodeLibcurl.Curl();
  let finished = false;
  let timeoutTimer = null;
  let isJsonUpload = false;
  let hasContentType = false;
  let hasContentLength = false;
  let hasAcceptEncoding = false;

  const stopRequestTimeout = () => {
    if (timeoutTimer) {
      clearTimeout(timeoutTimer);
      timeoutTimer = null;
    }
  };

  timeoutTimer = setTimeout(() => {
    libcurl.abort();
  }, opts.timeout + 1000);

  if (opts.rawBody) {
    curl.enable(nodeLibcurl.CurlFeature.Raw);
  }

  if (opts.noStorage) {
    curl.enable(nodeLibcurl.CurlFeature.NoStorage);
  }

  curl.setOpt(nodeLibcurl.Curl.option.URL, url.href);
  curl.setOpt(nodeLibcurl.Curl.option.VERBOSE, opts.debug);

  if (opts.proxy && typeof opts.proxy === 'string') {
    curl.setOpt(nodeLibcurl.Curl.option.PROXY, opts.proxy);
  } else if (opts.proxy === true) {
    curl.setOpt(nodeLibcurl.Curl.option.PROXY, url.origin);
  }

  if (nodeLibcurl.Curl.option.NOPROGRESS !== undefined) {
    curl.setOpt(nodeLibcurl.Curl.option.NOPROGRESS, true);
  }
  if (nodeLibcurl.Curl.option.TIMEOUT_MS !== undefined) {
    curl.setOpt(nodeLibcurl.Curl.option.TIMEOUT_MS, opts.timeout);
  }
  if (nodeLibcurl.Curl.option.MAXREDIRS !== undefined) {
    curl.setOpt(nodeLibcurl.Curl.option.MAXREDIRS, opts.maxRedirects);
  }
  if (nodeLibcurl.Curl.option.CUSTOMREQUEST !== undefined) {
    curl.setOpt(nodeLibcurl.Curl.option.CUSTOMREQUEST, opts.method);
  }
  if (nodeLibcurl.Curl.option.FOLLOWLOCATION !== undefined) {
    curl.setOpt(nodeLibcurl.Curl.option.FOLLOWLOCATION, opts.followRedirect);
  }
  if (nodeLibcurl.Curl.option.SSL_VERIFYPEER !== undefined) {
    curl.setOpt(nodeLibcurl.Curl.option.SSL_VERIFYPEER, opts.rejectUnauthorized ? 1 : 0);
  }
  if (nodeLibcurl.Curl.option.PROXY_SSL_VERIFYPEER !== undefined) {
    curl.setOpt(nodeLibcurl.Curl.option.PROXY_SSL_VERIFYPEER, opts.rejectUnauthorizedProxy ? 1 : 0);
  }
  if (nodeLibcurl.Curl.option.SSL_VERIFYHOST !== undefined) {
    curl.setOpt(nodeLibcurl.Curl.option.SSL_VERIFYHOST, opts.rejectUnauthorized ? 2 : 0);
  }
  if (nodeLibcurl.Curl.option.PROXY_SSL_VERIFYHOST !== undefined) {
    curl.setOpt(nodeLibcurl.Curl.option.PROXY_SSL_VERIFYHOST, opts.rejectUnauthorizedProxy ? 2 : 0);
  }
  if (nodeLibcurl.Curl.option.CONNECTTIMEOUT_MS !== undefined) {
    curl.setOpt(nodeLibcurl.Curl.option.CONNECTTIMEOUT_MS, opts.timeout);
  }

  if (nodeLibcurl.Curl.option.TCP_KEEPALIVE !== undefined) {
    if (opts.keepAlive === true) {
      curl.setOpt(nodeLibcurl.Curl.option.TCP_KEEPALIVE, 1);
    } else {
      curl.setOpt(nodeLibcurl.Curl.option.TCP_KEEPALIVE, 0);
    }
  }

  const customHeaders = [];
  if (url.hostname) {
    customHeaders.push(`Host: ${url.hostname}`);
  }

  let lcHeader = '';
  for (let header in opts.headers) {
    if (typeof header === 'string') {
      lcHeader = header.toLowerCase();
      if (lcHeader === 'content-type') {
        hasContentType = true;
      } else if (lcHeader === 'content-length') {
        hasContentLength = true;
      } else if (lcHeader === 'accept-encoding') {
        hasAcceptEncoding = opts.headers[header];
      }
      if (opts.headers[header] === void 0 || opts.headers[header] === null || opts.headers[header] === false) {
        // UNSET DEFAULT HEADERS
        customHeaders.push(`${header}: `);
      } else {
        // SET CUSTOM HEADERS
        customHeaders.push(`${header}: ${opts.headers[header]}`);
      }
    }
  }

  if (nodeLibcurl.Curl.option.ACCEPT_ENCODING !== undefined) {
    if (!hasAcceptEncoding) {
      curl.setOpt(nodeLibcurl.Curl.option.ACCEPT_ENCODING, '');
    } else {
      curl.setOpt(nodeLibcurl.Curl.option.ACCEPT_ENCODING, hasAcceptEncoding);
    }
  }

  if (opts.auth) {
    customHeaders.push(`Authorization: Basic ${Buffer.from(opts.auth).toString('base64')}`);
  }

  if (libcurl._onHeader) {
    curl.on('header', libcurl._onHeader);
  }

  if ((libcurl.pipeTo && libcurl.pipeTo.length) || libcurl._onData) {
    curl.on('data', (data) => {
      if (!data) {
        return;
      }

      if (libcurl._onData) {
        libcurl._onData(data);
      }

      if (libcurl.pipeTo && libcurl.pipeTo.length) {
        for (const writableStream of libcurl.pipeTo) {
          if (!writableStream.destroyed) {
            try {
              writableStream.write(data);
            } catch (writableStreamError) {
              libcurl._debug('writableStream.write(data) throw an exception', writableStreamError);
            }
          }
        }
      }
    });
  }

  curl.on('end', (statusCode, body, _headers) => {
    libcurl._debug('[END EVENT]', opts.retries, url.href, finished, statusCode);
    stopRequestTimeout();
    if (finished) { return; }
    finished = true;

    const headers = {};
    // GET REPONSE HEADERS
    // IF REDIRECT IS IN PLACE AND FOLLOWED -
    // READ HEADERS ONLY FROM THE LATEST REQUEST
    const lastHeadersIndex = _headers.length - 1;
    if (_headers && _headers.length && _headers[lastHeadersIndex]) {
      delete _headers[lastHeadersIndex].result;
      for (let headerName in _headers[lastHeadersIndex]) {
        if (_headers[lastHeadersIndex][headerName]) {
          headers[headerName.toLowerCase()] = _headers[lastHeadersIndex][headerName];
        }
      }
    }

    // IF REDIRECT ARE FOLLOWED GET LAST `Location` HEADER
    // AND ADD IT TO THE FINAL `headers` OBJECT
    // UNLESS `.location` ALREADY EXISTS IN THE RESPONSE HEADERS' OBJECT
    if (!headers.location && lastHeadersIndex > 0 && _headers[_headers.length - 2]) {
      if (_headers[_headers.length - 2].Location || _headers[_headers.length - 2].location) {
        headers.location = _headers[_headers.length - 2].Location || _headers[_headers.length - 2].location;
      }
    }

    const finish = () => {
      curl.close();
      cb(void 0, {statusCode, status: statusCode, body, headers});
    };

    if (libcurl.pipeTo && libcurl.pipeTo.length) {
      let i = 0;
      const onStreamEnd = () => {
        if (++i === libcurl.pipeTo.length) {
          finish();
        }
      };
      for (const writableStream of libcurl.pipeTo) {
        libcurl._debug({'writableStream.destroyed': writableStream.destroyed});
        if (!writableStream.destroyed) {
          try {
            writableStream.end('', 'utf8', onStreamEnd);
          } catch (writableStreamError) {
            libcurl._debug('writableStream.end(\'\', \'urf8\', onStreamEnd) throw an exception', writableStreamError);
          }
        }
      }
    } else {
      finish();
    }
  });

  curl.on('error', (error, errorCode) => {
    libcurl._debug('REQUEST ERROR:', opts.retries, url.href, {error, errorCode});
    stopRequestTimeout();
    if (finished) { return; }

    finished = true;
    curl.close();
    let statusCode = 408;
    if (errorCode === 52) {
      statusCode = 503;
    } else if (errorCode === 47) {
      statusCode = 429;
    } else if (SSL_ERROR_CODES.includes(errorCode)) {
      statusCode = 526;
    }

    error.code = errorCode;
    error.status = statusCode;
    error.message = typeof error.toString === 'function' ? error.toString() : 'Error occurred during request';
    error.errorCode = errorCode;
    error.statusCode = statusCode;

    if (libcurl.pipeTo && libcurl.pipeTo.length) {
      for (const writableStream of libcurl.pipeTo) {
        if (!writableStream.destroyed) {
          try {
            writableStream.destroy(error);
          } catch (writableStreamError) {
            libcurl._debug('writableStream.destroy(error) throw an exception', writableStreamError);
          }
        }

        if (writableStream.path && typeof writableStream.path === 'string') {
          try {
            fs.unlinkSync(writableStream.path);
          } catch (e) {
            _debug(`Download interrupted, attempt to remove the file [fs.unlinkSync(${writableStream.path})] threw an Error:`, e);
          }
        }
      }
    }

    cb(error);
  });

  if (opts.form) {
    if (typeof opts.form === 'object') {
      isJsonUpload = true;
    }

    if (typeof opts.form !== 'string') {
      try {
        opts.form = JSON.stringify(opts.form);
      } catch (e) {
        libcurl._debug('Can\'t stringify opts.form in POST request:', url.href, e);
        finished = true;
        process.nextTick(() => {
          libcurl.finished = true;
          curl.close();
          cb(badRequestError);
        });
        return curl;
      }
    }

    if (!hasContentType) {
      if (isJsonUpload) {
        customHeaders.push('Content-Type: application/json');
      } else {
        customHeaders.push('Content-Type: application/x-www-form-urlencoded');
      }
    }

    if (!hasContentLength && typeof opts.form === 'string') {
      customHeaders.push(`Content-Length: ${Buffer.byteLength(Buffer.from(opts.form))}`);
    }

    curl.setOpt(nodeLibcurl.Curl.option.POSTFIELDS, opts.form);
  } else if (opts.upload) {
    curl.setOpt(nodeLibcurl.Curl.option.UPLOAD, true);
    curl.setOpt(nodeLibcurl.Curl.option.READDATA, opts.upload);
  }

  if (opts.curlOptions && typeof opts.curlOptions === 'object') {
    for (let option in opts.curlOptions) {
      if (nodeLibcurl.Curl.option[option] !== undefined) {
        try {
          curl.setOpt(nodeLibcurl.Curl.option[option], opts.curlOptions[option]);
        } catch (curlOptionError) {
          curlOptionError.code = 4;
          curlOptionError.status = 500;
          curlOptionError.errorCode = 4;
          curlOptionError.statusCode = 500;
          _debug('setOpt threw an error, due to current {curlOptions}', curlOptionError, option, opts.curlOptions[option], {curlOptions: opts.curlOptions });
        }
      }
    }
  }

  if (opts.curlFeatures && typeof opts.curlFeatures === 'object') {
    for (let option in opts.curlFeatures) {
      if (nodeLibcurl.CurlFeature[option] !== undefined) {
        try {
          if (opts.curlFeatures[option] === true) {
            curl.enable(nodeLibcurl.CurlFeature[option]);
          } else if (opts.curlFeatures[option] === false) {
            curl.disable(nodeLibcurl.CurlFeature[option]);
          }
        } catch (curlFeatureError) {
          curlFeatureError.code = 4;
          curlFeatureError.status = 500;
          curlFeatureError.errorCode = 4;
          curlFeatureError.statusCode = 500;
          _debug('.enable() or .disable() threw an error, due to current {curlFeatures}', curlFeatureError, option, opts.curlFeatures[option], {curlFeatures: opts.curlFeatures });
        }
      }
    }
  }

  curl.setOpt(nodeLibcurl.Curl.option.HTTPHEADER, customHeaders);

  process.nextTick(() => {
    if (!libcurl.finished) {
      curl.perform();
    }
  });

  return curl;
};


class LibCurlRequest {
  constructor (opts, cb) {
    let isBadUrl = false;

    if (typeof opts !== 'object') {
      throw new TypeError('{opts} expecting an Object as first argument');
    }

    this.cb = typeof cb === 'function' ? cb : noop;
    this.sent = false;
    this.pipeTo = [];
    this.finished = false;
    this.retryTimer = false;
    this.timeoutTimer = null;

    this.opts = { ...request.defaultOptions, ...opts, headers: { ...request.defaultOptions.headers, ...opts.headers }};
    this.opts.method = this.opts.method.toUpperCase();

    if (this.opts.debug) {
      this._debug = _debug;
    } else {
      this._debug = noop;
    }

    if (typeof this.opts.uri === 'string') {
      this.opts.url = this.opts.uri;
    }

    this._debug('[constructor]', this.opts.url);

    this._stopRequestTimeout = () => {
      if (this.timeoutTimer) {
        clearTimeout(this.timeoutTimer);
        this.timeoutTimer = null;
      }
    };

    if (typeof this.opts.url !== 'string') {
      this._debug('REQUEST: NO URL PROVIDED ERROR:', opts);
      isBadUrl = true;
    } else {
      try {
        this.url = new url.URL(this.opts.url);
      } catch (urlError) {
        this._debug('REQUEST: `new URL()` ERROR:', opts, urlError);
        isBadUrl = true;
      }
    }

    if (isBadUrl) {
      this.sent = true;
      this.finished = true;
      process.nextTick(() => {
        this.cb(badUrlError);
      });
      return;
    }

    if (opts.pipeTo) {
      if (opts.pipeTo.write && opts.pipeTo.end) {
        this.pipeTo.push(opts.pipeTo);
      } else {
        throw new TypeError('[request-libcurl] {opts.pipeTo} option expected to be {stream.Writable}');
      }
    }

    if (!this.opts.wait) {
      this.send();
    }
  }

  pipe(writableStream) {
    if (writableStream.write && writableStream.end) {
      this.pipeTo.push(writableStream);
    } else {
      throw new TypeError('[request-libcurl] [.pipe()] method accepts only {stream.Writable}');
    }
    return this;
  }

  onData(callback) {
    if (typeof callback === 'function') {
      this._onData = callback;
    } else {
      throw new TypeError('[request-libcurl] [.onData()] method accepts only {Function}');
    }
    return this;
  }

  onHeader(callback) {
    if (typeof callback === 'function') {
      this._onHeader = callback;
    } else {
      throw new TypeError('[request-libcurl] [.onHeader()] method accepts only {Function}');
    }
    return this;
  }

  _retry() {
    this._debug('[_retry]', this.opts.retry, this.opts.retries, this.opts.url);
    if (this.opts.retry === true && this.opts.retries > 0) {
      --this.opts.retries;
      this.retryTimer = setTimeout(() => {
        this.currentCurl = sendRequest(this, this.url, this._sendRequestCallback.bind(this));
      }, this.opts.retryDelay);
      return true;
    }
    return false;
  }

  _sendRequestCallback(error, result) {
    this._debug('[_sendRequestCallback]', this.opts.url);
    let isRetry = false;
    let statusCode = 408;

    if (result && result.statusCode) {
      statusCode = result.statusCode;
    } else if (error && error.statusCode) {
      statusCode = error.statusCode;
    }

    if (error) {
      if (!CURL_ERROR_CODES.includes(error.errorCode)) {
        isRetry = this._retry();
      }
    } else if (this.opts.isBadStatus(statusCode, this.opts.badStatuses) && this.opts.retry === true && this.opts.retries > 1) {
      isRetry = this._retry();
    }

    if (!isRetry) {
      this.finished = true;
      this._stopRequestTimeout();
      if (error) {
        this.cb(error);
      } else {
        this.cb(void 0, result);
      }
    }
  }

  send() {
    this._debug('[send]', this.opts.url);
    if (this.sent) {
      return this;
    }

    this.sent = true;
    this.timeoutTimer = setTimeout(() => {
      this.abort();
    }, ((this.opts.timeout + this.opts.retryDelay) * (this.opts.retries + 1)));
    this.curl = sendRequest(this, this.url, this._sendRequestCallback.bind(this));
    return this;
  }

  abort() {
    this._debug('[abort]', this.opts.url);
    this._stopRequestTimeout();

    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = false;
    }

    if (!this.finished) {
      closeCurl(this.curl);

      this.finished = true;
      this.cb(abortError);
    }
    return this;
  }
}

function request (opts, cb) {
  return new LibCurlRequest(opts, cb);
}

request.defaultOptions = {
  wait: false,
  proxy: false,
  retry: true,
  debug: false,
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
  rejectUnauthorizedProxy: false,
  badStatuses: [300, 303, 305, 400, 407, 408, 409, 410, 500, 502, 503, 504, 510],
  isBadStatus(statusCode, badStatuses = request.defaultOptions.badStatuses) {
    return badStatuses.includes(statusCode) || statusCode >= 500;
  },
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    Accept: '*/*'
  }
};

module.exports = request;
