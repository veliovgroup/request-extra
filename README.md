[![support](https://img.shields.io/badge/support-GitHub-white)](https://github.com/sponsors/dr-dimitru)
[![support](https://img.shields.io/badge/support-PayPal-white)](https://paypal.me/veliovgroup)
<a href="https://ostr.io/info/built-by-developers-for-developers?ref=github-request-extra-repo-top"><img src="https://ostr.io/apple-touch-icon-60x60.png" height="20"></a>
<a href="https://meteor-files.com/?ref=github-request-extra-repo-top"><img src="https://meteor-files.com/apple-touch-icon-60x60.png" height="20"></a>

# Request-libcurl

```shell
npm install --save request-libcurl
```

__This is a server-only package.__ `request-libcurl` package was created due to a lack of stability in the Node's `http`/`https` *ClientRequest* and simplicity of `fetch` modules. Since we've been looking for something tested by decades and generations, — our choice stopped on `libcurl`. Hence `request-libcurl` package incorporates stability and performance of `libcurl` with simplicity of `request` API

## Main features

- 👨‍💻 98% tests coverage + TDD (*only for http(s)*);
- 👷‍♂️ Follow `request` API (*simplified*);
- 🚀 Async/Await API + callback API
- 📦 The single dependency on `node-libcurl` package;
- ㊗️ IDNs support (*internationalized domain names*);
- 🛡 Repeat (*built-in retries*) request on failed or broken connection;
- 😎 HTTP/2 support;
- 🤘 HTTP/3 support!
- 🎒 Send GET/POST with custom `body` and headers;
- 🗂 Pipe to the file;
- 🚦 Follow or deny redirects;
- 📤 [Upload files with a single line](https://github.com/veliovgroup/request-extra#file-upload);
- 🔐 Ignore or deny "broken" SSL/TLS certificates;
- 💪 Bulletproof design, during development we avoid complex solutions.

## ToC:

- [Installation](https://github.com/veliovgroup/request-extra#install)
- [API](https://github.com/veliovgroup/request-extra#api)
- [Request options *detailed* description](https://github.com/veliovgroup/request-extra#request-options):
  - [response description (*success*)](https://github.com/veliovgroup/request-extra#response)
  - [error description (*fail*)](https://github.com/veliovgroup/request-extra#error)
  - [*LibCurlRequest* API](https://github.com/veliovgroup/request-extra#returns-req-object)
- [List of default request options](https://github.com/veliovgroup/request-extra#request-default-options)
- [Examples](https://github.com/veliovgroup/request-extra#examples):
  - [GET](https://github.com/veliovgroup/request-extra#get-request)
  - [POST](https://github.com/veliovgroup/request-extra#post-request)
  - [POST (*advanced*)](https://github.com/veliovgroup/request-extra#post-request-with-extra-options)
  - [File download via `.pipe()`](https://github.com/veliovgroup/request-extra#file-download)
  - [File upload](https://github.com/veliovgroup/request-extra#file-upload)
  - [File upload (*multipart*)](https://github.com/veliovgroup/request-extra#file-upload-multipartform-data)
- [Known Issues](https://github.com/veliovgroup/request-extra#known-issues)
- [Running tests](https://github.com/veliovgroup/request-extra#running-tests)
  - [Tests](https://github.com/veliovgroup/request-extra/blob/master/test/npm.js)
- [Support](https://github.com/veliovgroup/request-extra#support-our-open-source-contribution)

## Install

```shell
# ONLY for node@>=18
npm install request-libcurl --save

# for node@>=16.14 || >=18 || >=20 || >=21 (no async API)
npm install request-libcurl@4.0.0 --save

# for node@^14.14 || >=16 || <16.14 (no async API)
npm install request-libcurl@3.0.0 --save

# for node@>=9.0.0 (no async API)
npm install request-libcurl@2.3.4 --save
```

```js
// Import
import request, { requestAsync } from 'request-libcurl';

// CommonJS
const { default: request, requestAsync } = require('request-libcurl');
// OR
const request = require('request-libcurl').default;
const requestAsync = require('request-libcurl').requestAsync;
```

## Basic usage

```js
const { status, headers, body } = await requestAsync({ url: 'https://api.example.com/data.json' });
```

## Note

We build this package to serve our needs and solve our issues with Node's native API. It may have a lack of compatibility with `request()` module API, or be compatible only partially. [PRs, suggestions, and discussions](https://github.com/veliovgroup/request-extra/issues) are always welcome.

## API

```js
import request, { requestAsync } from 'request-libcurl';

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

// Async API
try {
  const { statusCode, body, headers } = await requestAsync(opts);
} catch (error) {
  // Houston we got a problem! 😱
  const { errorCode, code, statusCode, message } = error;
}

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

### Request default options

```js
import request from 'request-libcurl';

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
  rejectUnauthorizedProxy: false,
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

### Request options

- `opts.url` or `opts.uri` {*String*} - [__Required__] Fully qualified URI with protocol `http`/`https`;
- `opts.method` {*String*} - [Optional] HTTP Method name, you can use any valid method name from HTTP specs, tested with GET/POST, default: `GET`;
- `opts.auth` {*String*} - [Optional] value for HTTP Authorization header as plain string in a form of `username:password`;
- `opts.form` {*String*|*Object*} - [Optional] Custom request body for POST request. If {*String*} is passed `Content-Type` will be set to `application/x-www-form-urlencoded`, by passing plain {*Object*} `Content-Type` will be set to `application/json`. To set custom `Content-Type` — pass it to `opts.headers` *Object*;
- `opts.upload` {*Integer*} - [Optional] To upload a file pass an *Integer* representing the *file descriptor*. See [this example](https://github.com/veliovgroup/request-extra#file-upload) for reference;
- `opts.pipeTo` {*stream.Writable*} - [Optional] Pass response data to *writableStream*, for example download a file to FS via `{pipeTo: fs.createWriteStream('/path/to/file.pdf')}`;
- `opts.headers` {*Object*} - [Optional] Custom request headers, default: `{ Accept: '*/*', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/73.0.3683.103 Safari/537.36' }`. Note: setting custom request headers will replace default ones;
- `opts.debug` {*Boolean*} - [Optional] Enable debug and extra logging, default: `false`;
- `opts.retry` {*Boolean*} - [Optional] Retry request if connection is broken? Default: `true`;
- `opts.retries` {*Number*} - [Optional] How many times retry request if connection is broken, default: `3`;
- `opts.retryDelay` {*Number*} - [Optional] How long to wait between request retries (*ms*), default: `256`;
- `opts.timeout` {*Number*} - [Optional] How long to wait for response (*ms*), default: `6144`;
- `opts.followRedirect` {*Boolean*} - [Optional] Shall request follow redirects? Default: `true`;
- `opts.keepAlive` {*Boolean*} - [Optional] Turn on TCP keepalive probes, default: `false`;
- `opts.maxRedirects` {*Number*} - [Optional] How many redirects are supported during single request, default: `4`;
- `opts.badStatuses` {*[Number]*} - [Optional] Array of "bad" status codes responsible for triggering request retries, default: `[300, 303, 305, 400, 407, 408, 409, 410, 500, 502, 503, 504, 510]`;
- `opts.isBadStatus` {*Function*} - [Optional] Function responsible for triggering request retries, [default (*at the bottom of code-block*)](https://github.com/veliovgroup/request-extra#request-default-options);
- `opts.rawBody` {*Boolean*} - Disable all data processing (`body` will be passed as *Buffer*, `headers` will be empty, use `.onHeader()` callback to get headers with `rawBody` option), great option for *piping*, default: `false`;
- `opts.noStorage` {*Boolean*} - Disable all data processing and data concatenation (`headers` and `body` won't be passed to response), great option for *piping*, default: `false`;
- `opts.wait` {*Boolean*} - Do not send request immediately and wait until `.send()` method is called, set this option to `true` to register `.onHeader()` and `.onBody()` callbacks, default: `false`;
- `opts.proxy` {*String*} - Fully qualified URL to HTTP proxy, when this feature is enabled connections are going to start with `CONNECT` request, default: no proxy or system proxy is used;
- `opts.rejectUnauthorized` {*Boolean*} - [Optional] Shall request be rejected if SSL/TLS certificate can't be validated? Default: `false`;
- `opts.rejectUnauthorizedProxy` {*Boolean*} - [Optional] Shall request be rejected if SSL/TLS certificate of a __proxy host__ can't be validated? Default: `false`;
- `opts.curlOptions` {*Object*} - [Optional] Explicitly set `libcurl` options, full list of options available [here](https://curl.haxx.se/libcurl/c/curl_easy_setopt.html) and [here](https://github.com/JCMais/node-libcurl/blob/32647acc28b026bbd03aa1e3abea9cbbc8f7d43b/lib/generated/CurlOption.ts#L3286);
- `opts.curlFeatures` {*Object*} - [Optional] Explicitly __enable__ or __disable__ `libcurl` features. To __enable__ a feature pass `true` as a value, example: `{NoDataParsing: true}`. To __disable__ pass `false` as a value, example: `{NoDataParsing: false}`. Full list of available features is available [here](https://github.com/JCMais/node-libcurl/blob/249323f0f3883f8cbf6d0e91a89bfecb5862da53/lib/enum/CurlFeature.ts#L7).

__Notes__:

- When using `opts.rawBody` callback won't return `headers`, to get headers use `onHeader` callback;
- When using `opts.noStorage` callback won't return `headers` and `body`, to get headers and body use `onData` and `onHeader` callbacks;
- `opts.upload` and `opts.form` __can not be used together__, there won't be exception thrown, if both presented — `opts.form` will be used instead;
- When using `opts.upload` or __any other request where server returns__ `expect: '100-continue'` HTTP header — callback won't return `headers`, to get headers use `onHeader` callback;
- This package is build on top of [`libcurl`](https://curl.haxx.se/libcurl/) and [`node-libcurl`](https://github.com/JCMais/node-libcurl) it's the way more powerful than just sending requests via `http` and `https` protocol. Libcurl can work with IMAP/SMTP protocols getting/sending emails. Libcurl can serve as fully-featured FTP-client. Here's full list of supported protocols: `DICT`, `FILE`, `FTP`, `FTPS`, `Gopher`, `HTTP`, `HTTPS`, `IMAP`, `IMAPS`, `LDAP`, `LDAPS`, `POP3`, `POP3S`, `RTMP`, `RTSP`, `SCP`, `SFTP`, `SMTP`, `SMTPS`, `Telnet` and `TFTP`. To learn more on how to utilize all available power and features see docs of [`node-libcurl`](https://github.com/JCMais/node-libcurl#node-libcurl) and [`libcurl`](https://curl.haxx.se/libcurl/) itself.

### Response

- `resp.statusCode` {*Number*} - HTTP response/status code;
- `resp.body` {*String*} - Body of HTTP response, not modified or processed, as it is — plain text;
- `resp.headers` {*Object*} - HTTP response headers as plain *Object*, all headers names are lower-cased.

### Error

- `error.errorCode` {*Number*} - `libcurl` internal error code;
- `error.code` {*Number*} - `libcurl` internal error code, same as `errorCode`;
- `error.statusCode` {*Number*} - HTTP error code, if any;
- `error.message` {*String*} - Human-readable error.

### Returns `req` *Object*

- `request()` and `requestAsync({ wait: true })` return `req` instance of {*LibCurlRequest*}
- `requestAsync()` (*without wait*) and `req.sendAsync()` return {*Response*} upon resolve

#### Using async API

```js
import { requestAsync } from 'request-libcurl';

// WITH { wait: true }
const req = await requestAsync({ url: 'https://example.com', wait: true });
try {
  const { statusCode, body, headers } = await req.sendAsync();
} catch (error) {
  const { errorCode, code, statusCode, message } = error;
}

// GET RESPONSE RIGHT AWAY
try {
  const resp = await requestAsync({ url: 'https://example.com' });
  const { statusCode, body, headers } = resp;
} catch (error) {
  const { errorCode, code, statusCode, message } = error;
}
```

- `req` {*LibCurlRequest*} - The *LibCurlRequest* instance returned only with `{ wait: true }` option, otherwise it returns *Response* (`resp` in the docs) right away
- `req.abortAsync()` {*Promise*} - Abort current request, request will throw `499: Client Closed Request` HTTP error
- `req.sendAsync()` {*Promise*} - Send request, use it with `{ wait: true }`. For example with `rawBody`/`noStorage`, when you need to delay sending request, for example to set event listeners and/or callbacks
- `req.pipe(stream.Writable)` {*Function*} - Pipe response to a *WritableStream*, for example download a file to FS. Use with `{wait: true, retry: false}` options, and `.sendAsync()` method
- `req.onData(callback)` {*Function*} - Hook, called right after data is received, called for each data-chunk. Useful with `.pipe()`, `rawBody`/`noStorage` and callbacks/events
- `req.onHeader(callback)` {*Function*} - Hook, called right after header is received, called for each header. Useful with `.pipe()`, `rawBody`/`noStorage` and callbacks/events
- `resp` {*Response*} - Successful response
  - `error` {*undefined*};
  - `resp.statusCode` {*Number*} - HTTP status code;
  - `resp.body` {*String*} - Body of HTTP response, not modified or processed, as it is — plain text;
  - `resp.headers` {*Object*} - Key-value plain *Object* with pairs of response headers;
- `error` {*ResponseError*} - Failed response
  - `error.errorCode` {*Number*} - `libcurl` internal error code;
  - `error.code` {*Number*} - `libcurl` internal error code, same as `errorCode`;
  - `error.statusCode` {*Number*} - HTTP error code, if any;
  - `error.message` {*String*} - Human-readable error.

#### Using callback API

```js
import request from 'request-libcurl';
const req = request({ url: 'https://example.com' }, callback);
```

- `req.abort()` - Abort current request, request will return `499: Client Closed Request` HTTP error
- `req.send()` - Send request, use it with `{ wait: true }`. For example with `rawBody`/`noStorage`, when you need to delay sending request, for example to set event listeners and/or callbacks
- `callback(error, resp)` - Callback triggered on successful response
  - `error` {*undefined*};
  - `resp` {*Response*}
- `callback(error)` - Callback triggered on failed request
  - `error` {*ResponseError*};
- The rest of methods match async API

## Examples

Send GET and POST requests, download and upload files — all just in few lines of code.

### GET request

By default `request-libcurl` will take care of chunked responses and encoding:

```js
import { requestAsync } from 'request-libcurl';

// GET request:
const { body } = await requestAsync({ url: 'https://example.com' });
```

For full control over request/response streams, chunks, and encoding use `{rawBody: true, wait: true, retry: false}` options with `.onData()` and `.onHeader()` callbacks:

```js
let responseBody = Buffer.from('');
let responseHeaders = Buffer.from('');
const headersObj = {};

const req = await requestAsync({
  url: 'https://example.com',
  retry: false, // Do not retry with rawBody/noStorage, as it may mess up with headers and body inside `.onData()` and `.onHeader()` callbacks
  rawBody: true,
  wait: true // Using 'wait' option to set `.onData()` and `.onHeader()` callbacks
});

req.onData((chunkAsBuffer) => {
  // Do something with a body
  // .pipe() for example
  responseBody = Buffer.concat([responseBody, chunkAsBuffer]);
});

req.onHeader((chunkAsBuffer) => {
  responseHeaders = Buffer.concat([responseHeaders, chunkAsBuffer]);

  // Or convert it to headers Object
  // Headers received one-by-one, line-by-line
  const header = chunkAsBuffer.toString('utf8');
  if (header.includes(':')) {
    const splitHeader = header.split(':');
    headersObj[splitHeader[0].toLowerCase().trim()] = splitHeader[1].trim();
  }
});

await req.sendAsync();
// Body as plain-string
const body = responseBody.toString('utf8');
// All headers as plain multi-line string
const headers = responseHeaders.toString('utf8');
// All headers as plain-Object
console.log(headersObj);
```

### POST request

```js
import request, { requestAsync } from 'request-libcurl';
import querystring from 'querystring';

// POST (Content-Type: application/x-www-form-urlencoded):
// by passing a String or formatted "Query String" to `form`
const resp = await requestAsync({
  method: 'POST',
  url: 'https://example.com',
  form: querystring.stringify({ myForm: 'data' })
};

// POST with Authorization (Content-Type: application/x-www-form-urlencoded):
// by passing a String or formatted "Query String" to `form`
const resp = await requestAsync({
  method: 'POST',
  url: 'https://example.com',
  auth: 'username:passwd',
  form: querystring.stringify({ myForm: 'data' })
});

// POST (Content-Type: application/json):
// by passing plain Object to `form`
// calling via callback API
request({
  method: 'POST',
  url: 'https://example.com',
  form: { myForm: 'data' }
}, (error, resp) => {
  /* ... */
});
```

### POST request with extra options

```js
import { requestAsync } from 'request-libcurl';

// POST with Authorization (Content-Type: application/json):
// by passing plain Object to `form`
const resp = await requestAsync({
  method: 'POST',
  url: 'https://example.com',
  auth: 'username:passwd',
  form: {
    myJSON: 'data'
  }
});

// Custom POST (Content-Type: text/plain):
// by passing custom Headers
const resp = await requestAsync({
  method: 'POST',
  url: 'https://example.com',
  form: 'Plain String or Base64 String or any other String',
  headers: {
    'Content-Type': 'text/plain'
  }
});
```

### File download

Download a file to the FileSystem by passing {*stream.Writable*}

#### File download using `pipeTo` option

Download a file to the FileSystem by passing {*stream.Writable*} to `pipeTo` option:

```js
import fs from 'fs';
import request from 'request-libcurl';

const req = request({
  url: 'https://example.com/file.pdf',
  pipeTo: fs.createWriteStream('/path/to/file.pdf', {flags: 'w'}),
  retry: false // Do not retry when download!
}, (error, resp) => {
  if (error) {
    throw error;
  } else {
    // File successfully downloaded
    fs.stat('/path/to/file.pdf', (error, stats) => {
      // do something with downloaded file
    });
  }
});
```

#### File download via `.pipe()` method

Download a file to the FileSystem using `.pipe()` method:

```js
import fs from 'node:fs/promises';
import { requestAsync } from 'request-libcurl';

const req = await requestAsync({
  url: 'https://example.com/file.pdf',
  wait: true,
  retry: false // Do not retry when download!
});

req.pipe(fs.createWriteStream('/path/to/file.pdf', { flags: 'w' }));
// .pipe() method can be used to pass download to a multiple WritableStream(s):
// req.pipe(fs.createWriteStream('/backup/downloads/file.pdf', {flags: 'w'}));

await req.sendAsync();
// File successfully downloaded

const stats = await fs.stat('/path/to/file.pdf');
// do something with downloaded file
```

### File upload

```js
import fs from 'node:fs/promises';
import { requestAsync } from 'request-libcurl';

await requestAsync({
  method: 'POST',
  url: 'https://example.com/upload',
  upload: await fs.open('/path/to/a/file', 'r'),
  retry: false,
});
// File successfully uploaded
```

### File upload (`multipart/form-data`)

In this example we are going to use [`HTTPPOST` libcurl option](https://curl.haxx.se/libcurl/c/CURLOPT_HTTPPOST.html) passing `Object[]` (*array of Objects* representing files, note: multiple files can be passed in a single request) via `curlOptions`

```js
import { requestAsync } from 'request-libcurl';
const fileLocation = '/full/absolute/path/to/a/file.ext';

await requestAsync({
  method: 'POST', // Can be used with PUT
  url: 'https://example.com/upload.php',
  retry: false,
  curlOptions: {
    HTTPPOST: [{
      name: 'file.ext', // File's name
      file: fileLocation, // Full absolute path to a file on FS
      type: 'application/ext' // File's mime-type
    } /*, {...multiple files here...} */]
  }
});
// File(s) successfully uploaded
```

## Known Issues

Got an issue? Start with checking "Known Issues" section below.

### 1. SSL connect error code: 35

To address most common issue with SSL certificates and speed up response time — SSL/TLS certificates validation is disabled in this package by default. But on edge cases this may return error-code `35` on SNI-enabled hosts. To solve this issue add `{ rejectUnauthorized: true }` to request object.

To change `rejectUnauthorized` option globally use:

```js
request.defaultOptions.rejectUnauthorized = true;
```

### 2. Compiled against Different Node.js version

Due to single dependency on `node-libcurl` which shipped with statically built binaries, you may encounter `This module was compiled against a different Node.js version using NODE_MODULE_VERSION` error. This may happen on edge cases, like running the very latest release of node.js (*while bundled builds aren't shipped yet*), then you may want to build this package locally, use one of next commands:

```shell
# First: ensure node.js version is matching supported request-libcurl version
# See "Install" section at the top of this document to check supported versions
# package might require downgrade installing explicit version

# Please see options below, in dependence from version of NPM and Node.js
# one of this options should solve this issue

# Option 1: Update and rebuild locally installed binaries
npm rebuild --update-binary --build-from-source

# Option 2: Build library
npm install --save request-libcurl --build-from-source

# Option 3: Build library and curl executables:
npm install --save request-libcurl --build-from-source --curl_static_build=true

# In case if you encounter errors during building package locally:
# 1. Execute same command as "sudo" (e.g. administrator), and try again
# 2. Install globally node-gyp and node-pre-gyp NPM packages, and try again
```

### 3. Missing libraries

Some of indirect dependencies of `libcurl` might be missing. Errors related to missing dependencies include `Library not loaded`, and `image not found` in error's description/output.

#### zstd

One of `curl` dependency libraries is [`zstd`](https://github.com/facebook/zstd). See installation instruction below or [build from source](https://github.com/facebook/zstd#build-instructions)

```shell
# Error: Library not loaded: /usr/local/opt/zstd/lib/libzstd.1.dylib
# Reason: image not found

# Solution 1: macOS Install via brew
brew install zstd

# Solution 2: Linux/Debian/Ubuntu Install via apt-get
apt-get update
apt-get install zstd

# Solution 3: Linux/CentOS/RHEL Install via yum
yum install zstd

# Solution 4: Unix build from source
# Up to date docs — https://github.com/facebook/zstd#build-instructions
# Download latest release from here — https://github.com/facebook/zstd/releases
# For example as of 2020-06-02 — zstd-1.4.8.tar.gz
curl https://github.com/facebook/zstd/releases/download/v1.4.8/zstd-1.4.8.tar.gz -O
make
make install # might require sudo/root permissions
# Optionally test compiled binary with:
make check
```

For more details and instructions for different platforms read `node-libcurl` [official docs](https://github.com/JCMais/node-libcurl#important-notes-on-prebuilt-binaries--direct-installation). __Note__: It's highly recommended to [run tests](https://github.com/veliovgroup/request-extra#running-tests) after building package locally.

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
# Run tests and output debugging details:
DEBUG=true PORT=3003 npm test
# PORT env.var is required! And can be changed to any open port!
# Note: The Internet connection is required to perform tests
# Note: Test-suite includes "no response" and "timing out responses"
# if a test looks stuck — give it another minute before interrupting it
```

## Support our open source contribution

- Upload and share files using [☄️ meteor-files.com](https://meteor-files.com/?ref=github-request-extra-repo-footer) — Continue interrupted file uploads without losing any progress. There is nothing that will stop Meteor from delivering your file to the desired destination
- Use [▲ ostr.io](https://ostr.io?ref=github-request-extra-repo-footer) for [Server Monitoring](https://snmp-monitoring.com), [Web Analytics](https://ostr.io/info/web-analytics?ref=github-request-extra-repo-footer), [WebSec](https://domain-protection.info), [Web-CRON](https://web-cron.info) and [SEO Pre-rendering](https://prerendering.com) of a website
- Star on [GitHub](https://github.com/veliovgroup/request-extra)
- Star on [NPM](https://www.npmjs.com/package/request-libcurl)
- [Sponsor maintainer via GitHub](https://github.com/sponsors/dr-dimitru) — support open source with one-time contribution or on a regular basis
- [Sponsor veliovgroup via GitHub](https://github.com/sponsors/veliovgroup) — support company behind this package
- [Support via PayPal](https://paypal.me/veliovgroup) — support our open source contributions
