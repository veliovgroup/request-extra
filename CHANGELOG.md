# 5.0.0

- Added Promise API declarations for ESM, CommonJS, and Bun-style resolution.
- Corrected active-request cancellation, retry counts, timer cleanup, writable failures, and backpressure.
- Request headers now reject invalid names and CR/LF values.
- Retries now default to safe or idempotent methods and transient statuses. Add a method to `retryMethods` to opt in.
- TLS certificate verification remains disabled by default. Enable `rejectUnauthorized` and `rejectUnauthorizedProxy` for trusted HTTPS verification.
- Requires Node.js 22.14 or newer.

See full change-log at [releases on GitHub](https://github.com/veliovgroup/request-extra/releases).
