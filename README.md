# Request-libcurl

<a href="https://www.patreon.com/bePatron?u=20396046">
  <img src="https://c5.patreon.com/external/logo/become_a_patron_button@2x.png" width="160">
</a>

```shell
npm install --save request-libcurl
```

__This is a server-only package.__ This package was created due to a lack of stability in the Node's `http`/`https` *ClientRequest* modules. Since we've been looking for something tested by decades and generations, — our choice stopped on `libcurl`, later core library might be changed, but we would keep same API and idea about fast, sustainable and simple HTTP requests.

## Main features:

- 👨‍💻 98% tests coverage + TDD;
- 👷‍♂️ Follow `request` API (*simplified*);
- 📦 The single dependency on `node-libcurl` package;
- 😎 IDNs support (*internationalized domain names*);
- 😎 Repeat (*built-in retries*) request on failed or broken connection;
- 😎 Send GET/POST with custom `body` and headers;
- 😎 Follow or deny redirects;
- 💪 Bulletproof design, during development we plan to avoid complex solutions.

## Install:

```shell
# ONLY for node@>=8.9.0
npm install request-libcurl --save
```

```js
// CommonJS
const request = require('request-libcurl');

//ES6 Style:
import request from 'request-libcurl';
```

## Note:

We build this package to serve our needs and solve our issues with Node's native API. It may have a lack of compatibility with `request()` module API, or compatible only partially. Use on your own risk or wait for stable `v1.1.x`.

## API:

```js
const request = require('request-libcurl');

const opts = {
  method: 'GET', // POST, GET
  url: 'https://example.com', // String
  auth: 'username:password', // String
  form: '{"ops": "value"}', // String, can be JSON or any other type of payload
  headers: { // Object
    Accept: '*/*',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/73.0.3683.103 Safari/537.36'
  },
  debug: false, // Boolean
  retry: true, // Boolean
  retries: 3, // Number
  timeout: 6144, // Number
  keepAlive: false, // Boolean
  retryDelay: 256, // Number
  followRedirect: true, // Boolean
  maxRedirects: 4, // Number
  rejectUnauthorized: false // Boolean
};

// Callback API
request(opts, (error, resp) => {
  if (error) {
    // Houston we got a problem! 😱
    const { errorCode, code, statusCode, message } = error;
  } else {
    // We've got successful response! 🥳
    const { statusCode, body, headers } = resp;
  }
});
```

### Request default options:

```js
const request = require('request-libcurl');

// Default "defaultOptions" Object:
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
  badStatuses: [ 300, 303, 305, 400, 407, 408, 409, 410, 500, 502, 503, 504, 510 ],
  isBadStatus(statusCode, badStatuses = request.defaultOptions.badStatuses) {
    return badStatuses.includes(statusCode) || statusCode >= 500;
  },
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/73.0.3683.103 Safari/537.36',
    Accept: '*/*'
  }
};

// Override default settings:
request.defaultOptions.timeout = 7000;
request.defaultOptions.retries = 12;
request.defaultOptions.retryDelay = 5000;
request.defaultOptions.followRedirect = false;

// Override bad statuses codes (used to trigger retries)
request.defaultOptions.badStatuses = [300, 303, 305, 400, 407, 408, 409, 410];

// Override function used to trigger retries based on status code
request.defaultOptions.isBadStatus = (statusCode, badStatuses = request.defaultOptions.badStatuses) => {
  return badStatuses.includes(statusCode) || statusCode >= 500;
};
```

### Request options:

- `opts.url` or `opts.uri` {*String*} - [__Required__] Fully qualified URI with protocol `http`/`https`;
- `opts.method` {*String*} - [Optional] HTTP Method name, you can use any valid method name from HTTP specs, tested with GET/POST, default: `GET`. If set to POST, by default `Content-Type: application/x-www-form-urlencoded` HTTP header will be set, __unless `Content-Type` header is passed to `opts.headers`__;
- `opts.auth` {*String*} - [Optional] value for HTTP Authorization header as plain string;
- `opts.form` {*String*|*Object*} - [Optional] Custom request body for POST request. If *String* is passed `Content-Type` will be set to `application/x-www-form-urlencoded`, by passing plain *Object* `Content-Type` will be set to `application/json`. To set custom `Content-Type` — pass it to `opts.headers` *Object*;
- `opts.headers` {*Object*} - [Optional] Custom request headers, default: `{ Accept: '*/*', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/73.0.3683.103 Safari/537.36' }`;
- `opts.debug` {*Boolean*} - [Optional] Enable debug and extra logging, default: `false`;
- `opts.retry` {*Boolean*} - [Optional] Retry request if connection is broken? Default: `true`;
- `opts.retries` {*Number*} - [Optional] How many times retry request if connection is broken, default: `3`;
- `opts.retryDelay` {*Number*} - [Optional] How long to wait between request retries (*ms*), default: `256`;
- `opts.timeout` {*Number*} - [Optional] How long to wait for response (*ms*), default: `6144`;
- `opts.followRedirect` {*Boolean*} - [Optional] Shall request follow redirects? Default: `true`;
- `opts.keepAlive` {*Boolean*} - [Optional] Turn on TCP keepalive probes, default: `false`;
- `opts.maxRedirects` {*Number*} - [Optional] How many redirects are supported during single request, default: `4`;
- `opts.badStatuses` {*[Number]*} - [Optional] Array of "bad" status codes responsible for triggering request retries, default: `[300, 303, 305, 400, 407, 408, 409, 410, 500, 502, 503, 504, 510]`;
- `opts.isBadStatus` {*Function*} - [Optional] Function responsible for triggering request retries, default: *see at the bottom of examples section*;
- `opts.rawBody` {*Boolean*} - Disable all data processing (`body` will be passed as *Buffer*, `headers` will be empty, use `.onHeaders()` hook to get headers with `rawBody` option), great option for *piping*, default: `false`;
- `opts.noStorage` {*Boolean*} - Disable all data processing and data concatenation (`headers` and `body` won't be passed to response), great option for *piping*, default: `false`;
- `opts.wait` {*Boolean*} - Do not send request immediately and wait until `.send()` method is called, set this option to `true` to register `.onHeaders()` and `.onBody()` hooks, default: `false`;
- `opts.proxy` {*String*} - Fully qualified URL to HTTP proxy, when this feature is enabled connections are going to start with `CONNECT` request, default: no proxy or system proxy is used;
- `opts.rejectUnauthorized` {*Boolean*} - [Optional] Shall request continue if SSL/TLS certificate can't be validated? Default: `false`.

__Note__: When using `opts.rawBody` or `opts.noStorage` callback won't return `headers` and `body`, to get headers and body use `onData` and `onHeaders` hooks:

```js
let _body    = Buffer.from('');
let _headers = Buffer.from('');
const headersObj = {};

const req = request({
  url: 'https://example.com',
  retry: false, // Do not retry with rawBody/noStorage, as it may mess up with headers and body inside `.onData()` and `.onHeader()` hooks
  rawBody: true,
  wait: true // Using 'wait' option to set `.onData()` and `.onHeader()` hooks
}, (error, resp) => {
  const body = _body.toString('utf8');
  const headers = _headers.toString('utf8');
});

req.onData((chunkAsBuffer) => {
  // Do something with a body
  // .pipe() for example
  _body = Buffer.concat([_body, chunkAsBuffer]);
});

req.onHeader((chunkAsBuffer) => {
  _headers = Buffer.concat([_headers, chunkAsBuffer]);

  // or convert it to headers Object:
  const header = chunkAsBuffer.toString('utf8');
  if (header.includes(':')) {
    const splitHeader = header.split(':');
    headersObj[splitHeader[0].toLowerCase().trim()] = splitHeader[1].trim();
  }
});

req.send();
```

### Response:

- `resp.statusCode` {*Number*} - HTTP response/status code;
- `resp.body` {*String*} - Body of HTTP response, not modified or processed, as it is — plain text;
- `resp.headers` {*Object*} - HTTP response headers as plain *Object*, all headers names are lower-cased.

### Error:

- `error.errorCode` {*Number*} - `libcurl` internal error code;
- `error.code` {*Number*} - `libcurl` internal error code, same as `errorCode`;
- `error.statusCode` {*Number*} - HTTP error code, if any;
- `error.message` {*String*} - Human-readable error.

### Returns `req` *Object*:

```js
const request = require('request-libcurl');
const req     = request({url: 'https://example.com'});
````

- `req.abort()` - Abort current request, request will return `499: Client Closed Request` HTTP error
- `req.send()` - Send request, use it with `wait`. For example with `rawBody`/`noStorage`, when you need to delay sending request, for example to set event listeners and/or hooks
- `req.onData(callback)` - Hook, called right after data is received, called for each data-chunk. Useful with `.pipe()`, `rawBody`/`noStorage` and hooks/events
- `req.onHeader(callback)` - Hook, called right after header is received, called for each header. Useful with `.pipe()`, `rawBody`/`noStorage` and hooks/events
- `callback(error, resp)` - Callback triggered on successful response
  - `error` {*undefined*};
  - `resp.statusCode` {*Number*} - HTTP status code;
  - `resp.body` {*String*} - Body of HTTP response, not modified or processed, as it is — plain text;
  - `resp.headers` {*Object*} - Key-value plain *Object* with pairs of response headers;
- `callback(error)` - Callback triggered on failed request
  - `error.errorCode` {*Number*} - `libcurl` internal error code;
  - `error.code` {*Number*} - `libcurl` internal error code, same as `errorCode`;
  - `error.statusCode` {*Number*} - HTTP error code, if any;
  - `error.message` {*String*} - Human-readable error.

## Examples:

```js
const request = require('request-libcurl');
const querystring = require('querystring');

// GET request:
request({ url: 'https://example.com' }, (error, resp) => {
  /* ... */
});

// POST (Content-Type: application/x-www-form-urlencoded):
// by passing an String or QueryString Object to `form`
request({
  method: 'POST',
  url: 'https://example.com',
  form: querystring.stringify({ myForm: 'data' })
}, (error, resp) => {
  /* ... */
});

// POST with Authorization (Content-Type: application/x-www-form-urlencoded):
// by passing an String or QueryString Object to `form`
request({
  method: 'POST',
  url: 'https://example.com',
  auth: 'username:passwd',
  form: querystring.stringify({ myForm: 'data' })
}, (error, resp) => {
  /* ... */
});

// POST (Content-Type: application/json):
// by passing an plain Object to `form`
request({
  method: 'POST',
  url: 'https://example.com',
  form: { myForm: 'data' }
}, (error, resp) => {
  /* ... */
});

// POST with Authorization (Content-Type: application/json):
// by passing an plain Object to `form`
request({
  method: 'POST',
  url: 'https://example.com',
  auth: 'username:passwd',
  form: { myForm: 'data' }
}, (error, resp) => {
  /* ... */
});

// Custom POST (Content-Type: text/plain):
// by passing an plain Object to `form`
request({
  method: 'POST',
  url: 'https://example.com',
  form: 'Plain String or Base64 String',
  headers: {
    'Content-Type': 'text/plain'
  }
}, (error, resp) => {
  /* ... */
});
```

## Running Tests

1. Clone this package
2. In Terminal (*Console*) go to directory where package is cloned
3. Then run:

```shell
# Install development NPM dependencies:
npm install --save-dev
# Install NPM dependencies:
npm install --save
# Run tests:
PORT=3003 npm test
# PORT env.var is required! And can be changed to any open port!
```

## Support our open source contribution:

- [Become a patron](https://www.patreon.com/bePatron?u=20396046) — support my open source contributions with monthly donation
- Use [ostr.io](https://ostr.io) — [Monitoring](https://snmp-monitoring.com), [Analytics](https://ostr.io/info/web-analytics), [WebSec](https://domain-protection.info), [Web-CRON](https://web-cron.info) and [Pre-rendering](https://prerendering.com) for a website
