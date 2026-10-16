# 5.0.0

## What's new

Promise declarations for Node ESM/CommonJS, method-aware retries, and fixes for cancellation, streaming, payload replay, and native setup failures.

## Major changes

- ⚠️ Requires Node.js 22.15 or newer. Use Node 22 or 24 in production while upstream Node 26 issues remain unresolved.
- ⚠️ Retries now default to safe or idempotent methods and transient statuses. Add a method to `retryMethods` to opt in.
- ⚠️ Header names, CR/LF values, HTTP method tokens, native options, and upload descriptors are validated before transfer. Retry and redirect counts must be non-negative safe integers. `timeout` is limited to `2147482647` ms; retry delays to `2147483647` ms.
- ⚠️ `requestAsync()` defers only for explicit `wait: true`; it ignores the global wait default to preserve its declared return shape.
- ⚠️ Streaming registration after transfer setup starts now throws. Register synchronously or use `wait: true` before sending.
- ⚠️ Aborting a transfer destroys active writable destinations that provide `destroy()`, retaining error handlers through teardown.
- ⚠️ After a transport error, a piped file is removed only when its stream has string `flags` `w`, `wx`, `xw`, `w+`, `wx+`, or `xw+`. Append, read-write, numeric flags, and custom writables without `flags` keep their file.
- ⚠️ ESM and CommonJS entry points share one `request.defaultOptions` object per process.

## Other Changes

### Added

- ✨ Added Promise API declarations for ESM, CommonJS, and Bun-style type resolution. Request options accept readonly `retryMethods` arrays; defaults remain mutable. Bun runtime remains unsupported.

### Fixed

- 🔧 Corrected retry counts, active-request cancellation, timer cleanup, writable failures, and backpressure.
- 🔧 Native setup exceptions settle callbacks and Promises without leaving handles, timers, or unhandled rejections behind. Scalar `Accept-Encoding` values are converted to strings.
- 🔧 JSON retries preserve serialized bytes and content type, including custom serializers.
- 🔧 HEAD responses complete without waiting for the advertised response body length.
- 🔧 Immediate `.pipe()`, `.onData()`, and `.onHeader()` chaining receives response data and headers.
- 🔧 Large overall deadlines use bounded timer chunks instead of overflowing into immediate aborts. Retry-disabled requests use a single-attempt fallback budget.
- 🔧 Empty string forms and descriptor `0` upload correctly. Descriptor uploads, writable destinations, and streaming callbacks do not retry.
- 🔧 Serialization failures settle requests; reusable error objects no longer leak caller mutations.
- 🔧 Caller headers replace defaults case-insensitively. `rawBody` keeps parsed headers while returning a Buffer body.
- 🔧 A failed writable destroys its peers; pending writable errors after cancellation are consumed through teardown.
- 🔧 Calling `abort()` inside `onData()`, `onHeader()`, or a writable `write()` no longer breaks later requests or crashes the process, including on the final chunk. A writable that throws on the final chunk no longer crashes with `Curl handle is closed`. Requests started from these callbacks also work.
- 🔧 A `wait: true` Promise request settled by an invalid URL or `abort()` no longer raises an unhandled rejection before `sendAsync()`.
- 🔧 Chaining `.pipe()`, `.onData()`, or `.onHeader()` onto a request with an invalid URL no longer throws; the error arrives through the callback or Promise.
- 🔧 `request-libcurl/package.json` is exported.

### Docs

- 📔 Added secure quick starts, memory-efficient download examples, timeout limits, and HTTP-status handling guidance. TLS verification remains disabled by default for compatibility; enable `rejectUnauthorized` and `rejectUnauthorizedProxy` for normal HTTPS use.

See the [v5 migration guide](./docs/migration-v5.md) and [earlier releases](https://github.com/veliovgroup/request-extra/releases).
