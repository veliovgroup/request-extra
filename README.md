# Request-Extra

```shell
npm install --save request-libcurl
```

__This is a server-only package.__ This package was created due to a lack of stability in the Node's `http`/`https` *ClientRequest* modules. Since we've been looking for something tested by decades and generations, — our choice stopped on `libcurl`, later core library might be changed, but we would keep same API and idea about fast, sustainable and simple HTTP requests.

## Main features:

- 👷‍♂️ Follow `request` API;
- 📦 The single dependency on `node-libcurl` package;
- 😎 IDNs support (*internationalized domain names*);
- 😎 Repeat (*built-in retries*) request of connection was broken;
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
const request = require('request-extra');

//ES6 Style:
import request from 'request-extra';
```

## Note:

We build this package to serve our needs and solve our issues with Node's native API. It may have a lack of compatibility with `request()` module API, or compatible only partially. Use on your own risk or wait for stable `v1.0.0`.

## API:

```js
const request = require('request-extra');

const opts = {
  method: 'GET', // POST, GET
  uri: 'https://example.com', // String
  auth: 'username:password', // String
  form: '{"ops": "value"}', // String, can be JSON or any other type of payload
  headers: { // Object
    Accept: '*/*',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/73.0.3683.103 Safari/537.36'
  },

  debug: false, // Boolean
  retry: true, // Boolean
  retries: 3, // Number
  retryDelay: 256, // Number
  timeout: 6144, // Number
  followRedirect: true, // Boolean
  maxRedirects: 4, // Number
  rejectUnauthorized: false // Boolean
};

// Promise API v1
const promise = request(opts);

// Promise API v2
request(opts).then((resp) => {
  const { statusCode, body, headers } = resp;
}).catch((error) => {
  const { errorCode, code, statusCode, message } = error;
});

// Async/Await
async function get (opts) {
  const { statusCode, body, headers } = await request(opts);
  return body;
}

// Callback API
request(opts, (error, resp) => {
  if (error) {
    const { errorCode, code, statusCode, message } = error;
  } else {
    const { statusCode, body, headers } = resp;
  }
});
```

### Request options:

- `opts.uri` {*String*} - [__Required__] Fully qualified URI with protocol `http`/`https`;
- `opts.method` {*String*} - [Optional] HTTP Method name, you can use any valid method name from HTTP specs, tested with GET/POST, default: `GET`. If set to POST, `Content-Type: application/x-www-form-urlencoded` HTTP header would be set;
- `opts.auth` {*String*} - [Optional] value for HTTP Authorization header as plain string;
- `opts.form` {*String*|*Object*} - [Optional] Custom request body for POST request;
- `opts.headers` {*Object*} - [Optional] Custom request headers, default: `{ Accept: '*/*', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/73.0.3683.103 Safari/537.36' }`;
- `opts.debug` {*Boolean*} - [Optional] Enable debug and extra logging, default: `false`;
- `opts.retry` {*Boolean*} - [Optional] Retry request if connection is broken? Default: `true`;
- `opts.retries` {*Number*} - [Optional] How many times retry request if connection is broken, default: `3`;
- `opts.retryDelay` {*Number*} - [Optional] How long to wait between request retries (*ms*), default: `256`;
- `opts.timeout` {*Number*} - [Optional] How long to wait for response (*ms*), default: `6144`;
- `opts.followRedirect` {*Boolean*} - [Optional] Shall request follow redirects? Default: `true`;
- `opts.maxRedirects` {*Number*} - [Optional] How many redirects are supported during single request, default: `4`;
- `opts.badStatuses` {*[Number]*} - [Optional] Array of "bad" status codes responsible for triggering request retries, default: `[300, 303, 305, 400, 407, 408, 409, 410, 500, 510]`;
- `opts.isBadStatus` {*Function*} - [Optional] Function responsible for triggering request retries, default: *see at the bottom of examples section*;
- `opts.rawBody` and `opts.noStorage` {*Boolean*} - Disable all data processing, great option for *piping*, default: `false`;
- `opts.wait` {*Boolean*} - Disable all data processing, great option for *piping*, default: `false`;
- `opts.rejectUnauthorized` {*Boolean*} - [Optional] Shall request continue if SSL/TLS certificate can't be validated? Default: `false`.

### Response:

- `error.statusCode` {*Number*} - HTTP response/status code;
- `error.body` {*String*} - Body of HTTP response, not modified or processed, as it is — plain text;
- `error.headers` {*Object*} - HTTP response headers as plain *Object*.

### Error:

- `error.errorCode` {*Number*} - `libcurl` internal error code;
- `error.code` {*Number*} - `libcurl` internal error code, same as `errorCode`;
- `error.statusCode` {*Number*} - HTTP error code, if any;
- `error.message` {*String*} - Human-readable error.

### Returns {*Promise*}:

```js
const request = require('request-extra');
const promise = request({uri: 'https://example.com'});
````

- `promise.abort()` - Abort current request, request will return `499: Client Closed Request` HTTP error
- `promise.send()` - Send request, useful with `wait` and `rawBody`, when you need to delay sending request, for example to set event listeners
- `promise.request` {*ClientRequest*} - See [`node-libcurl` docs](https://github.com/JCMais/node-libcurl)
- `promise.then(resp)` - Callback triggered on successful response
  - `resp.statusCode` {*Number*} - HTTP status code
  - `resp.body` {*String*} - Body of HTTP response, not modified or processed, as it is — plain text;
  - `resp.headers` {*Object*} - Key-value plain *Object* with pairs of response headers
- `promise.catch(error)` - Callback triggered on failed request
  - `error.errorCode` {*Number*} - `libcurl` internal error code;
  - `error.code` {*Number*} - `libcurl` internal error code, same as `errorCode`;
  - `error.statusCode` {*Number*} - HTTP error code, if any;
  - `error.message` {*String*} - Human-readable error.

## Examples:

```js
const request = require('request-extra');

// Simple GET:
request({ uri: 'https://example.com' }, (error, resp) => {
  /* ... */
});

// Simple POST:
request({
  method: 'POST',
  uri: 'https://example.com',
  form: JSON.stringify({ myForm: 'data' })
}, (error, resp) => {
  /* ... */
});

// POST request with Authorization:
request({
  method: 'POST',
  uri: 'https://example.com',
  auth: 'username:passwd',
  form: JSON.stringify({ myForm: 'data' })
}, (error, resp) => {
  /* ... */
});

// Override default settings:
request.defaultOptions.timeout    = 7000;
request.defaultOptions.retries    = 12;
request.defaultOptions.retryDelay = 5000;
request.defaultOptions.followRedirect = false;

// Override bad statuses codes (used to trigger retries)
request.defaultOptions.badStatuses = [300, 303, 305, 400, 407, 408, 409, 410];

// Override function used to trigger retries based on status code
request.defaultOptions.isBadStatus = (statusCode, badStatuses = request.defaultOptions.badStatuses) => {
  return badStatuses.includes(statusCode) || statusCode >= 500;
};
```

## Running Tests

1. Clone this package
2. In Terminal (*Console*) go to directory where package is cloned
3. Then run:

```shell
# TBD
```

## Support our open source contribution:

This project wouldn't be possible without [ostr.io](https://ostr.io).

Using [ostr.io](https://ostr.io) you are not only [protecting domain names](https://ostr.io/info/domain-names-protection), [monitoring websites and servers](https://ostr.io/info/monitoring), using [Prerendering for better SEO](https://ostr.io/info/prerendering) of your JavaScript website, but support our Open Source activity, and great packages like this one are available for free.
