'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

const fs = require('node:fs');
const node_url = require('node:url');
const nodeLibcurl = require('node-libcurl');

const SSL_ERROR_CODES = [58, 60, 83, 90, 91];
const CURL_ERROR_CODES = [3, 4, 23, 47];

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

const createPipeError = (cause) => {
  const error = new Error('500: Writable stream failed', cause ? { cause } : undefined);
  error.code = 23;
  error.status = 500;
  error.errorCode = 23;
  error.statusCode = 500;
  return error;
};

const createConfigurationError = (cause) => {
  const error = new Error('500: Invalid Curl configuration', { cause });
  error.code = 4;
  error.status = 500;
  error.errorCode = 4;
  error.statusCode = 500;
  return error;
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
  } catch (_err) {
    // we are good here
  }
};

const HTTP_TOKEN = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;

const getHeaderLines = (headers) => Object.entries(headers).map(([name, value]) => {
  if (!HTTP_TOKEN.test(name)) {
    throw new TypeError(`Invalid HTTP header name: "${name}"`);
  }
  if (value !== null && value !== undefined && value !== false && /[\r\n]/.test(String(value))) {
    throw new TypeError(`Invalid HTTP header value for "${name}"`);
  }
  return [name, value];
});

const normalizeOptions = (opts) => {
  if (!opts || typeof opts !== 'object' || Array.isArray(opts)) {
    throw new TypeError('{opts} expecting an Object as first argument');
  }

  const definedOptions = Object.fromEntries(
    Object.entries(opts).filter(([, value]) => value !== undefined)
  );
  const normalized = {
    ...request.defaultOptions,
    ...definedOptions,
    headers: {
      ...request.defaultOptions.headers,
      ...(definedOptions.headers || {})
    }
  };

  if (typeof normalized.method !== 'string' || !normalized.method.trim()) {
    throw new TypeError('{opts.method} expecting a non-empty String');
  }
  for (const key of ['timeout', 'retryDelay', 'maxRedirects', 'retries']) {
    if (!Number.isFinite(normalized[key]) || normalized[key] < 0) {
      throw new TypeError(`{opts.${key}} expecting a non-negative finite Number`);
    }
  }
  normalized.method = normalized.method.toUpperCase();
  return normalized;
};

const sendRequest = (libcurl, url, cb) => {
  libcurl._debug('[sendRequest]', url.href);

  closeCurl(libcurl.curl);

  const curl = new nodeLibcurl.Curl();
  const opts = libcurl.opts;
  let finished = false;
  let pipeError = null;
  let timeoutTimer = null;
  let isJsonUpload = false;
  let hasContentType = false;
  let hasContentLength = false;
  let hasAcceptEncoding = false;
  let configurationError = null;

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

  for (const [header, value] of getHeaderLines(opts.headers)) {
    const lcHeader = header.toLowerCase();
    if (lcHeader === 'content-type') {
      hasContentType = true;
    } else if (lcHeader === 'content-length') {
      hasContentLength = true;
    } else if (lcHeader === 'accept-encoding') {
      hasAcceptEncoding = value;
    }
    if (value === undefined || value === null || value === false) {
      // UNSET DEFAULT HEADERS
      customHeaders.push(`${header}: `);
    } else {
      // SET CUSTOM HEADERS
      customHeaders.push(`${header}: ${value}`);
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
              pipeError ||= createPipeError(writableStreamError);
            }
          }
        }
      }
    });
  }

  curl.on('end', (statusCode, body, _headers) => {
    libcurl._debug('[END EVENT]', opts.retries, url.href, finished, statusCode);
    stopRequestTimeout();
    curl.removeAllListeners();
    if (finished) { return; }
    finished = true;

    const headers = {};
    // GET REPONSE HEADERS
    // IF REDIRECT IS IN PLACE AND FOLLOWED -
    // READ HEADERS ONLY FROM THE LATEST REQUEST
    const lastHeadersIndex = _headers.length - 1;
    if (_headers && _headers.length && _headers[lastHeadersIndex]) {
      delete _headers[lastHeadersIndex].result;
      for (const [headerName, value] of Object.entries(_headers[lastHeadersIndex])) {
        if (value) {
          headers[headerName.toLowerCase()] = value;
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
      if (pipeError) {
        cb(pipeError);
      } else {
        cb(void 0, {statusCode, status: statusCode, body, headers});
      }
    };

    if (libcurl.pipeTo && libcurl.pipeTo.length) {
      let i = 0;
      const writableStreams = libcurl.pipeTo.filter((writableStream) => !writableStream.destroyed);

      if (writableStreams.length !== libcurl.pipeTo.length) {
        pipeError = createPipeError();
      }

      if (!writableStreams.length) {
        finish();
        return;
      }

      const onStreamEnd = (writableStreamError) => {
        if (writableStreamError) {
          pipeError ||= createPipeError(writableStreamError);
        }
        if (++i === writableStreams.length) {
          finish();
        }
      };
      for (const writableStream of writableStreams) {
        libcurl._debug({'writableStream.destroyed': writableStream.destroyed});
        try {
          writableStream.end('', 'utf8', onStreamEnd);
        } catch (writableStreamError) {
          libcurl._debug('writableStream.end(\'\', \'utf8\', onStreamEnd) throw an exception', writableStreamError);
          pipeError ||= createPipeError(writableStreamError);
          onStreamEnd();
        }
      }
    } else {
      finish();
    }
  });

  curl.on('error', (error, errorCode) => {
    libcurl._debug('REQUEST ERROR:', opts.retries, url.href, {error, errorCode});
    stopRequestTimeout();
    curl.removeAllListeners();
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
    error.message = typeof error.toString === 'function'
      ? error.toString().replace(/^Error: Request failed: /, 'Error: ')
      : 'Error occurred during request';
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
    for (const [option, value] of Object.entries(opts.curlOptions)) {
      if (nodeLibcurl.Curl.option[option] === undefined) {
        configurationError ||= createConfigurationError(new TypeError(`Unknown Curl option: ${option}`));
      } else if (option === 'TIMEOUT_MS' && (!Number.isFinite(value) || value < 0)) {
        configurationError ||= createConfigurationError(new TypeError(`Invalid Curl option value: ${option}`));
      } else {
        try {
          curl.setOpt(nodeLibcurl.Curl.option[option], value);
        } catch (curlOptionError) {
          configurationError ||= createConfigurationError(curlOptionError);
          _debug('setOpt threw an error, due to current {curlOptions}', curlOptionError, option, value, {curlOptions: opts.curlOptions });
        }
      }
    }
  }

  if (opts.curlFeatures && typeof opts.curlFeatures === 'object') {
    for (const [option, value] of Object.entries(opts.curlFeatures)) {
      if (nodeLibcurl.CurlFeature[option] === undefined) {
        configurationError ||= createConfigurationError(new TypeError(`Unknown Curl feature: ${option}`));
      } else if (typeof value !== 'boolean') {
        configurationError ||= createConfigurationError(new TypeError(`Invalid Curl feature value: ${option}`));
      } else {
        try {
          if (value === true) {
            curl.enable(nodeLibcurl.CurlFeature[option]);
          } else {
            curl.disable(nodeLibcurl.CurlFeature[option]);
          }
        } catch (curlFeatureError) {
          configurationError ||= createConfigurationError(curlFeatureError);
          _debug('.enable() or .disable() threw an error, due to current {curlFeatures}', curlFeatureError, option, value, {curlFeatures: opts.curlFeatures });
        }
      }
    }
  }

  if (configurationError) {
    finished = true;
    stopRequestTimeout();
    process.nextTick(() => {
      closeCurl(curl);
      cb(configurationError);
    });
    return curl;
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

    this.opts = normalizeOptions(opts);

    if (!cb && this.opts.isPromise) {
      this.promise = new Promise((resolve, reject) => {
        this._resolve = resolve;
        this._reject = reject;
      });
    }

    this.cb = typeof cb === 'function' ? cb : noop;
    this.sent = false;
    this.pipeTo = [];
    this.finished = false;
    this.retryTimer = false;
    this.timeoutTimer = null;

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
        this.url = new node_url.URL(this.opts.url);
      } catch (urlError) {
        this._debug('REQUEST: `new URL()` ERROR:', opts, urlError);
        isBadUrl = true;
      }
    }

    if (isBadUrl) {
      this.sent = true;
      this.finished = true;
      process.nextTick(() => {
        if (this.opts.isPromise) {
          this._reject(badUrlError);
        } else {
          this.cb(badUrlError);
        }
      });
      return;
    }

    if (this.opts.pipeTo) {
      if (this.opts.pipeTo.write && this.opts.pipeTo.end) {
        this.pipeTo.push(this.opts.pipeTo);
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
        if (this.opts.isPromise) {
          this._reject(error);
        } else {
          this.cb(error);
        }
      } else {
        if (this.opts.isPromise) {
          this._resolve(result);
        } else {
          this.cb(void 0, result);
        }
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

  async sendAsync() {
    if (!this.opts.isPromise) {
      throw new Error('Calling .sendAsync() on non-async API, use requestAsync() to invoke async API');
    }
    this.send();
    return this.promise;
  }

  abort() {
    this._debug('[abort]', this.opts.url);
    this._stopRequestTimeout();
    this.curl?.removeAllListeners?.();

    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = false;
    }

    if (!this.finished) {
      closeCurl(this.curl);

      this.finished = true;
      if (this.opts.isPromise) {
        this._reject(abortError);
      } else {
        this.cb(abortError);
      }
    }
    return this;
  }

  async abortAsync() {
    if (!this.opts.isPromise) {
      throw new Error('Calling .abortAsync() on non-async API, use requestAsync() to invoke async API');
    }
    this.abort();
    return this.promise;
  }
}

function request (opts, cb) {
  return new LibCurlRequest(opts, cb);
}

async function requestAsync (opts) {
  if (opts.wait) {
    return new LibCurlRequest(Object.assign({}, opts, { isPromise: true }));
  }

  const req = new LibCurlRequest(Object.assign({}, opts, { isPromise: true }));
  return req.promise;
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
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
    Accept: '*/*'
  }
};

exports.default = request;
exports.requestAsync = requestAsync;
