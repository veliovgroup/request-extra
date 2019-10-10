'use strict';

const { URL } = require('url');
const { Curl, CurlFeature } = require('node-libcurl');

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
  status: 408,
  message: '408: Request aborted (timeout)',
  errorCode: 42,
  statusCode: 408
};

const noop = () => {};

const _debug = (...args) => {
  console.info.call(console, '[DEBUG] [request-libcurl]', ...args);
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

  const opts       = libcurl.opts;
  const curl       = new Curl();
  let finished     = false;
  let timeoutTimer = null;
  let isJsonUpload = false;
  let hasContentType    = false;
  let hasContentLength  = false;
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
    curl.enable(CurlFeature.Raw);
  }

  if (opts.noStorage) {
    curl.enable(CurlFeature.NoStorage);
  }

  curl.setOpt('URL', url.href);
  curl.setOpt(Curl.option.VERBOSE, opts.debug);

  if (opts.proxy && typeof opts.proxy === 'string') {
    curl.setOpt(Curl.option.PROXY, opts.proxy);
  } else if (opts.proxy === true) {
    curl.setOpt(Curl.option.PROXY, url.origin);
  }

  curl.setOpt(Curl.option.NOPROGRESS, true);
  curl.setOpt(Curl.option.TIMEOUT_MS, opts.timeout);
  curl.setOpt(Curl.option.MAXREDIRS, opts.maxRedirects);
  curl.setOpt(Curl.option.CUSTOMREQUEST, opts.method);
  curl.setOpt(Curl.option.FOLLOWLOCATION, opts.followRedirect);
  curl.setOpt(Curl.option.SSL_VERIFYPEER, opts.rejectUnauthorized ? 1 : 0);
  curl.setOpt(Curl.option.SSL_VERIFYHOST, 0);
  curl.setOpt(Curl.option.CONNECTTIMEOUT_MS, opts.timeout);

  if (opts.keepAlive === true) {
    curl.setOpt(Curl.option.TCP_KEEPALIVE, 1);
  } else {
    curl.setOpt(Curl.option.TCP_KEEPALIVE, 0);
  }

  const customHeaders = [];
  if (url.hostname) {
    customHeaders.push(`Host: ${url.hostname}`);
  }

  let lcHeader = '';
  for (let header in opts.headers) {
    if (opts.headers[header]) {
      lcHeader = header.toLowerCase();
      if (lcHeader === 'content-type') {
        hasContentType = true;
      } else if (lcHeader === 'content-length') {
        hasContentLength = true;
      } else if (lcHeader === 'accept-encoding') {
        hasAcceptEncoding = opts.headers[header];
      }
      customHeaders.push(`${header}: ${opts.headers[header]}`);
    }
  }

  if (!hasAcceptEncoding) {
    curl.setOpt(Curl.option.ACCEPT_ENCODING, '');
  } else {
    curl.setOpt(Curl.option.ACCEPT_ENCODING, hasAcceptEncoding);
  }

  if (opts.auth) {
    customHeaders.push(`Authorization: Basic ${Buffer.from(opts.auth).toString('base64')}`);
  }

  if (libcurl.onData) {
    curl.on('data', libcurl.onData);
  }

  if (libcurl.onHeader) {
    curl.on('header', libcurl.onHeader);
  }

  curl.on('end', (statusCode, body, _headers) => {
    libcurl._debug('[END EVENT]', opts.retries, url.href, finished, statusCode);
    stopRequestTimeout();
    libcurl.stopRequestTimeout();
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
    libcurl._debug('REQUEST ERROR:', opts.retries, url.href, {error, errorCode});
    stopRequestTimeout();
    libcurl.stopRequestTimeout();
    if (finished) { return; }

    finished = true;
    curl.close();

    let statusCode = 408;
    if (errorCode === 52) {
      statusCode = 503;
    } else if (errorCode === 47) {
      statusCode = 429;
    }

    error.code       = errorCode;
    error.status     = statusCode;
    error.message    = typeof error.toString === 'function' ? error.toString() : 'Error occurred during request';
    error.errorCode  = errorCode;
    error.statusCode = statusCode;

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
        libcurl._debug('Can\'t stringify opts.form in POST request :', url.href, e);
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

    if (!hasContentLength) {
      customHeaders.push(`Content-Length: ${Buffer.byteLength(opts.form)}`);
    }

    curl.setOpt(Curl.option.POSTFIELDS, opts.form);
  }

  curl.setOpt(Curl.option.HTTPHEADER, customHeaders);

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

    this.cb   = cb || noop;
    this.sent = false;
    this.finished     = false;
    this.retryTimer   = false;
    this.timeoutTimer = null;

    this.opts        = Object.assign({}, request.defaultOptions, opts);
    this.opts.method = this.opts.method.toUpperCase();

    if (this.opts.debug) {
      this._debug = _debug;
    } else {
      this._debug = noop;
    }

    this._debug('[constructor]', this.opts.uri || this.opts.url);

    this.stopRequestTimeout = () => {
      if (this.timeoutTimer) {
        clearTimeout(this.timeoutTimer);
        this.timeoutTimer = null;
      }
    };

    if (!this.opts.uri && !this.opts.url) {
      this._debug('REQUEST: NO URL PROVIDED ERROR:', opts);
      isBadUrl = true;
    } else {
      try {
        this.url = new URL(this.opts.uri || this.opts.url);
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

    if (!this.opts.wait) {
      this.send();
    }
  }

  onData(callback) {
    this.onData = callback;
  }

  onHeader(callback) {
    this.onHeader = callback;
  }

  _retry() {
    this._debug('[_retry]', this.opts.retry, this.opts.retries, this.opts.uri || this.opts.url);
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
    this._debug('[_sendRequestCallback]', this.opts.uri || this.opts.url);
    let isRetry    = false;
    let statusCode = 408;

    if (result && result.statusCode) {
      statusCode = result.statusCode;
    } else if (error && error.statusCode) {
      statusCode = error.statusCode;
    }

    if (error && error.errorCode !== 47) {
      isRetry = this._retry();
    } else if ((this.opts.isBadStatus(statusCode, this.opts.badStatuses)) && this.opts.retry === true && this.opts.retries > 1) {
      isRetry = this._retry();
    }

    if (!isRetry) {
      this.finished = true;
      if (error) {
        this.cb(error);
      } else {
        this.cb(void 0, result);
      }
    }
  }

  send() {
    this._debug('[send]', this.opts.uri || this.opts.url);
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
    this._debug('[abort]', this.opts.uri || this.opts.url);
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

request.defaultOptions  = {
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
  badStatuses: [300, 303, 305, 400, 407, 408, 409, 410, 500, 502, 503, 504, 510],
  isBadStatus(statusCode, badStatuses = request.defaultOptions.badStatuses) {
    return badStatuses.includes(statusCode) || statusCode >= 500;
  },
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/73.0.3683.103 Safari/537.36',
    Accept: '*/*'
  }
};

module.exports = request;
