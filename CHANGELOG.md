# 5.0.1

## What's new

Patch release for 5.0.0. It fixes crashes when `abort()` or a writable runs inside native callbacks, makes streaming registration and Promise deferral predictable, and bounds timer delays.

## Behavior changes

Some fixes tighten input that 5.0.0 accepted. Review these before upgrading:

- ⚠️ Registering `.pipe()`, `.onData()`, or `.onHeader()` after the transfer starts now throws. Register synchronously on the returned request, or pass `wait: true` and register before `sendAsync()`.
- ⚠️ `requestAsync()` returns a deferred request only when the call passes `wait: true`. `request.defaultOptions.wait` no longer changes its return shape.
- ⚠️ `timeout` above `2147482647` ms, and `retryDelay` or `retryMaxDelay` above `2147483647` ms, throw `TypeError` before sending.
- ⚠️ After a transport error, the library deletes a piped file only when its stream has string `flags` `w`, `wx`, `xw`, `w+`, `wx+`, or `xw+`. Append mode, read-write mode, numeric flags, and custom writables without `flags` keep their file.
- ⚠️ Aborting a transfer destroys active writable destinations that provide `destroy()`.
- ⚠️ ESM and CommonJS entry points share one `request.defaultOptions` object per process.

## Fixed

- 🔧 `abort()` inside `onData()`, `onHeader()`, or a writable `write()` no longer breaks later requests or crashes the process, including on the final chunk. A writable that throws on the final chunk no longer raises `Curl handle is closed`. Requests started from these callbacks work.
- 🔧 Native setup exceptions settle the callback or Promise, close the handle, and clear timers. Scalar `Accept-Encoding` values convert to strings.
- 🔧 JSON and form retries resend the same bytes with the same `Content-Type`, including custom serializers.
- 🔧 `HEAD` responses complete without waiting for the advertised body length.
- 🔧 `request(...).pipe(...).onData(...).onHeader(...)` chaining receives all response data and headers. Chaining onto a request that already failed, such as one with an invalid URL, no longer throws. The error arrives through the callback or Promise.
- 🔧 Overall deadlines longer than one Node timer run in chunks instead of overflowing into an immediate abort. Requests that cannot retry use a single-attempt budget.
- 🔧 A `wait: true` Promise request settled by an invalid URL or `abort()` no longer raises an unhandled rejection before `sendAsync()`.
- 🔧 Abort keeps writable error handlers until teardown finishes, so late writable errors no longer crash the process.
- 🔧 `request-libcurl/package.json` is exported.

## Types

- 📘 `WritableLike` accepts a `flags` property and the `close` event in `once()` and `removeListener()`.

## Docs and tooling

- 📔 Added guidance on memory use, timeout limits, HTTP status handling, error mapping, cancellation, and shared defaults. Added Node.js 26 notes: finished transfers can stall until other JavaScript runs, so use Node.js 22 or 24 in production.
- 🏗️ CI treats Bun probe test failures as informational. The test suite works around the Node.js 26 completion delay and tracks TLS fixture sockets to fix an `ECONNRESET` flake. Dev dependencies and GitHub Actions updated.

See the [v5 migration guide](./docs/migration-v5.md).

---

# 5.0.0

- Added Promise API declarations for ESM, CommonJS, and Bun-style resolution. Request options accept readonly `retryMethods` arrays while mutable defaults remain available.
- Corrected active-request cancellation, retry counts, timer cleanup, writable failures, and backpressure.
- Empty string forms and file descriptor `0` now upload correctly. File-descriptor uploads no longer retry because consumed descriptors cannot be replayed safely.
- `retries`, `maxRedirects`, and upload descriptors now reject fractional or negative values.
- Invalid HTTP method tokens are rejected before libcurl receives them.
- Request-body serialization failures now settle callbacks and Promises, and reusable errors no longer leak mutations between requests.
- Streaming callbacks now disable retries so callers never receive mixed data from multiple attempts.
- Request headers now reject invalid names and CR/LF values. Caller headers replace default headers case-insensitively instead of sending both.
- `rawBody` responses keep parsed `headers`; only `body` stays a `Buffer`.
- When one `pipeTo` writable fails, remaining writables are destroyed with the same error, and late writable errors no longer crash the process.
- Retries now default to safe or idempotent methods and transient statuses. Add a method to `retryMethods` to opt in.
- TLS certificate verification remains disabled by default. Enable `rejectUnauthorized` and `rejectUnauthorizedProxy` for trusted HTTPS verification.
- Requires Node.js 22.15 or newer.

See [v5 migration guide](./docs/migration-v5.md) and full change-log at [releases on GitHub](https://github.com/veliovgroup/request-extra/releases).
