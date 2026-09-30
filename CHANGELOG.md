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
