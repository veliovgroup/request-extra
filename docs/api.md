# API reference

## Exports

Default export: `request`. Named export: `requestAsync`.

Types: `HeaderValue`, `BinaryData`, `WritableLike`, `RequestOptions`, `RequestInput`, `RequestDefaultOptions`, `Response`, `ResponseError`, `RequestCallback`, `DataCallback`, `HeaderCallback`, `LibCurlRequest`, and `RequestFunction`.

`HeaderValue` is `string | number | boolean | null | undefined`. `BinaryData` is a `Uint8Array` with `toString(encoding?)`. `WritableLike` has `write()` and `end()` methods, with optional `destroy()`, `once()`, `removeListener()`, `destroyed`, and `path` members. Streams passed to `pipe()` or `pipeTo` must satisfy this shape.

`RequestCallback` receives `(error?: ResponseError, response?: Response)`. `DataCallback` and `HeaderCallback` each receive one `BinaryData` chunk. `RequestFunction` is callable as `request(opts, cb?)` and exposes `defaultOptions`.

## `request(options, callback?)`

Creates and returns a `LibCurlRequest`. Unless `wait: true`, it starts immediately. With callback form, success calls `callback(undefined, response)` and failure calls `callback(error)`.

## `requestAsync(options)`

Returns a `Promise<Response>` by default. With `wait: true`, returns `Promise<LibCurlRequest>` without sending; register handlers, then call `sendAsync()`.

## Request options

`RequestInput` requires `url` or `uri`; when both exist, `uri` wins. Both values are fully qualified URLs. `RequestOptions` is `RequestInput` before that requirement is applied.

| Option | Type | Meaning |
| --- | --- | --- |
| `url`, `uri` | `string` | Request URL. `uri` wins when both are present. |
| `method` | `string` | HTTP method. Normalized to uppercase. |
| `auth` | `string` | Basic-auth value in `username:password` form. |
| `form` | `string \| object` | Request payload. Strings get form URL-encoded content type; objects are JSON-stringified and get JSON content type unless header overrides it. |
| `upload` | `number` | Open file descriptor used as libcurl upload input. Do not combine with `form`; `form` takes precedence. |
| `pipeTo` | `WritableLike` | Writable destination for response data. |
| `headers` | `Record<string, HeaderValue>` | Merges with default headers. Set a default header to `false`, `null`, or `undefined` to remove it. Header names must be HTTP tokens; values cannot contain CR or LF. |
| `debug` | `boolean` | Enables request debug output. |
| `timeout` | `number` | Per-attempt timeout in milliseconds. |
| `keepAlive` | `boolean` | Enables TCP keepalive probes. |
| `followRedirect` | `boolean` | Follows redirects. |
| `maxRedirects` | `number` | Redirect limit. |
| `badStatuses` | `number[]` | Statuses passed to `isBadStatus`. |
| `isBadStatus` | `(statusCode, badStatuses?) => boolean` | Decides whether a response status can retry. |
| `rawBody` | `boolean` | Enables raw libcurl body handling. Use `onHeader()` for headers. |
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
| `retries` | `number` | Number of additional attempts. |
| `retryDelay` | `number` | Initial retry-delay ceiling in milliseconds. |
| `retryMethods` | `string[]` | Methods eligible for retries. |
| `retryMaxDelay` | `number` | Maximum retry delay in milliseconds. |
| `retryJitter` | `boolean` | Randomizes each retry delay. |
| `respectRetryAfter` | `boolean` | Uses valid `Retry-After` headers. |

See [Retries and errors](./retries-and-errors.md).

## `LibCurlRequest`

`sent` reports whether `send()` has run. `finished` reports terminal completion. `opts` exposes normalized request options.

- `.pipe(writableStream)` adds a writable destination and returns request.
- `.onData(callback)` registers per-chunk response callback and returns request.
- `.onHeader(callback)` registers per-header callback and returns request.
- `.send()` starts request once and returns request.
- `.sendAsync()` starts Promise-mode request once and returns its Promise, which resolves with `Response` or rejects with `ResponseError`.
- `.abort()` aborts unfinished request and returns request.
- `.abortAsync()` aborts unfinished Promise-mode request. It rejects with abort error when request is still active; after completion, it returns existing settled Promise.

`sendAsync()` and `abortAsync()` only work on requests created by `requestAsync()`.

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

Change fields on `request.defaultOptions` to set process-wide defaults. TLS verification defaults remain disabled for compatibility.
