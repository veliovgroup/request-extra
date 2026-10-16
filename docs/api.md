# API reference

## Exports

Default export: `request`. Named export: `requestAsync`.

Types: `HeaderValue`, `BinaryData`, `WritableLike`, `RequestOptions`, `RequestInput`, `RequestDefaultOptions`, `Response`, `ResponseError`, `RequestCallback`, `DataCallback`, `HeaderCallback`, `LibCurlRequest`, and `RequestFunction`.

`HeaderValue` is `string | number | boolean | null | undefined`. `BinaryData` is a `Uint8Array` with `toString(encoding?)`. `WritableLike` has `write()` and `end()` methods, with optional `destroy()`, `once()`, `removeListener()`, `destroyed`, `path`, and `flags` members. The library listens for `close`, `drain`, and `error`. Streams passed to `pipe()` or `pipeTo` must satisfy this shape.

`RequestCallback` receives `(error?: ResponseError, response?: Response)`. `DataCallback` and `HeaderCallback` each receive one `BinaryData` chunk. `RequestFunction` is callable as `request(opts, cb?)` and exposes `defaultOptions`.

## `request(options, callback?)`

Creates and returns a `LibCurlRequest`. Unless `wait: true`, it schedules the transfer for the next tick. Synchronous chaining such as `request(options, callback).pipe(destination)` is supported. With callback form, success calls `callback(undefined, response)` and failure calls `callback(error)`.

## `requestAsync(options)`

Returns a `Promise<Response>` by default. Only an explicit `wait: true` returns `Promise<LibCurlRequest>` without sending; register handlers, then call `sendAsync()`. Unlike the callback API, `requestAsync()` ignores `request.defaultOptions.wait` so changing a global default cannot change its return shape or strand an unsent request.

## Request options

`RequestInput` requires `url` or `uri`; when both exist, `uri` wins. Both values are fully qualified URLs. `RequestOptions` is `RequestInput` before that requirement is applied.

| Option | Type | Meaning |
| --- | --- | --- |
| `url`, `uri` | `string` | Request URL. `uri` wins when both are present. |
| `method` | `string` | HTTP method token. Rejects whitespace and control characters, then normalizes to uppercase. |
| `auth` | `string` | Basic-auth value in `username:password` form. |
| `form` | `string \| object` | Request payload. Strings, including an empty string, get form URL-encoded content type; objects are JSON-stringified and get JSON content type unless header overrides it. |
| `upload` | `number` | Non-negative integer file descriptor used as libcurl upload input. Do not combine with `form`; `form` takes precedence. Uploads do not retry because a consumed descriptor cannot be replayed safely. |
| `pipeTo` | `WritableLike` | Writable destination for response data. Requests with a writable destination do not retry because response bytes cannot be rolled back after they are written. The response body is still kept in memory unless `noStorage: true`. |
| `headers` | `Record<string, HeaderValue>` | Merges with default headers; names match case-insensitively, so `content-type` replaces a default `Content-Type`. Set a default header to `false`, `null`, or `undefined` to remove it. Header names must be HTTP tokens; values cannot contain CR or LF. |
| `debug` | `boolean` | Enables request debug output. |
| `timeout` | `number` | Per-attempt timeout in milliseconds, from `0` through `2147482647`. A JavaScript fallback aborts after `timeout + 1000` ms; `0` disables the native timeout but retains this 1000 ms fallback. |
| `keepAlive` | `boolean` | Enables TCP keepalive probes. |
| `followRedirect` | `boolean` | Follows redirects. |
| `maxRedirects` | `number` | Non-negative safe integer redirect limit. |
| `badStatuses` | `number[]` | Statuses passed to `isBadStatus`. |
| `isBadStatus` | `(statusCode, badStatuses?) => boolean` | Decides whether a response status can retry. |
| `rawBody` | `boolean` | Returns `body` as a `Buffer` instead of a string. `headers` stays parsed; `onHeader()` still receives raw header lines. |
| `noStorage` | `boolean` | Disables accumulated response body and headers. Use `onData()` and `onHeader()`. |
| `wait` | `boolean` | Defers sending until `send()` or `sendAsync()`. |
| `proxy` | `string \| boolean` | Proxy URL, or `true` to use request origin as proxy. |
| `rejectUnauthorized` | `boolean` | Enables origin TLS certificate and host verification. |
| `rejectUnauthorizedProxy` | `boolean` | Enables proxy TLS certificate and host verification. |
| `curlOptions` | `Record<string, unknown>` | Valid `node-libcurl` options. Unknown names or invalid values fail request with configuration error. |
| `curlFeatures` | `Record<string, boolean>` | Valid `node-libcurl` feature flags. |

`RequestDefaultOptions` contains every request option except `url`, `uri`, `auth`, `form`, `upload`, `pipeTo`, `curlOptions`, and `curlFeatures`; its remaining fields are required and include `headers`.

## Retry options

| Option | Type | Meaning |
| --- | --- | --- |
| `retry` | `boolean` | Enables retries. |
| `retries` | `number` | Non-negative safe integer number of additional attempts. |
| `retryDelay` | `number` | Initial retry-delay ceiling in milliseconds, from `0` through `2147483647`. |
| `retryMethods` | `readonly string[]` | Methods eligible for retries. |
| `retryMaxDelay` | `number` | Maximum retry delay in milliseconds, from `0` through `2147483647`. |
| `retryJitter` | `boolean` | Randomizes each retry delay. |
| `respectRetryAfter` | `boolean` | Uses valid `Retry-After` headers. |

See [Retries and errors](./retries-and-errors.md).

## `LibCurlRequest`

`sent` reports whether `send()` has run. `finished` reports terminal completion. `opts` exposes normalized request options.

- `.pipe(writableStream)` adds a writable destination, disables retries for that request, and returns request. The response body is still kept in memory unless `noStorage: true`.
- `.onData(callback)` registers per-chunk response callback and returns request.
- `.onHeader(callback)` registers per-header callback and returns request.
- `.send()` starts request once and returns request.
- `.sendAsync()` starts Promise-mode request once and returns its Promise, which resolves with `Response` or rejects with `ResponseError`.
- `.abort()` aborts unfinished request, destroys active writable destinations that provide `destroy()`, and returns request. Writable error handlers remain attached until teardown completes.
- `.abortAsync()` aborts unfinished Promise-mode request. It rejects with abort error when request is still active; after completion, it returns existing settled Promise.

`sendAsync()` and `abortAsync()` only work on requests created by `requestAsync()`.

Register `.pipe()`, `.onData()`, and `.onHeader()` synchronously after construction or before sending a `wait: true` request. Registration after transfer setup starts throws instead of silently missing data. Use `wait: true` when setup crosses an asynchronous boundary. Registration on a request that settled before starting, such as one with an invalid URL or one aborted before sending, does nothing; the error arrives through the callback or Promise. A writable passed then is not ended or destroyed.

`abort()` is safe to call from `onData()`, `onHeader()`, and writable `write()` callbacks. A Promise from `requestAsync()` without `wait: true` has no controller, so it cannot be aborted; use `wait: true` to keep the `LibCurlRequest`.

Registering `onData()` or `onHeader()` disables retries. Callback output from an earlier attempt cannot be rolled back. On transport failure, or when one writable fails, library calls `destroy(error)` on every remaining writable that provides it. After a transport failure, a writable with a string `path` and string `flags` of `w`, `wx`, `xw`, `w+`, `wx+`, or `xw+` has that partial file removed; `fs.createWriteStream()` defaults to `w`. Append (`a`), read-write (`r+`), numeric flags, and writables without `flags` keep their file.

## Response

`Response` has `statusCode`, `status`, optional `body`, and `headers`. `status` aliases `statusCode`. `body` is `string | BinaryData` when stored. Header keys are lowercased; values are `string | string[]`.

## Errors

`ResponseError` has numeric `errorCode`, `code`, `statusCode`, and `status`, plus `message`; `name`, `stack`, and `cause` may exist. `code` aliases `errorCode`. `status` aliases `statusCode`.

Invalid URLs reject or call back with status 400. Aborts use status 499. Invalid curl configuration and writable-stream failures use status 500.

## Default options

```js
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
  retryMethods: ['GET', 'HEAD', 'OPTIONS', 'PUT', 'DELETE'],
  retryMaxDelay: 30000,
  retryJitter: true,
  respectRetryAfter: true,
  maxRedirects: 4,
  followRedirect: true,
  rejectUnauthorized: false,
  rejectUnauthorizedProxy: false,
  badStatuses: [408, 425, 429, 500, 502, 503, 504],
  isBadStatus(statusCode, badStatuses) {
    return badStatuses.includes(statusCode);
  },
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
    Accept: '*/*'
  }
};
```

Change fields on `request.defaultOptions` to set process-wide defaults. ESM `import` and CommonJS `require()` share the same object, so a change made through either entry point applies to both. TLS verification defaults remain disabled for compatibility.
