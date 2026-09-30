# Migrating from v4 to v5

## Runtime

Version 5 requires Node.js 22.14 or newer and `node-libcurl` 5.1.2 or newer. Bun remains unsupported because its libuv compatibility layer cannot load `node-libcurl`.

## Imports

ES modules keep default and named imports:

```js
import request, { requestAsync } from 'request-libcurl';
```

CommonJS receives a module namespace. Read callback and Promise APIs from it:

```js
const { default: request, requestAsync } = require('request-libcurl');
```

TypeScript resolves separate ESM and CommonJS declaration files through package export conditions. No type-only compatibility package is required.

## Retries

`retries` counts additional attempts. Default `3` permits four total attempts.

Automatic retries now cover transient statuses `408`, `425`, `429`, `500`, `502`, `503`, and `504`. They apply only to `GET`, `HEAD`, `OPTIONS`, `PUT`, and `DELETE` by default. Opt in to a repeatable `POST` explicitly:

```js
await requestAsync({
  url: 'https://example.com/idempotent-operation',
  method: 'POST',
  form: { requestId: 'stable-idempotency-key' },
  retryMethods: ['POST']
});
```

Requests using `upload`, `pipeTo`, `.pipe()`, `onData()`, or `onHeader()` do not retry. These APIs expose or consume attempt data that cannot be replayed safely.

## Validation

Version 5 rejects malformed header names, CR/LF header values, invalid HTTP method tokens, unknown Curl options or features, fractional retry or redirect counts, and invalid upload descriptors before sending.

Empty string forms and upload descriptor `0` are valid:

```js
await requestAsync({
  url: 'https://example.com/empty',
  method: 'POST',
  form: '',
  retry: false
});
```

## TLS

Origin and proxy certificate verification still default to disabled for compatibility. Enable both defaults for normal HTTPS use:

```js
request.defaultOptions.rejectUnauthorized = true;
request.defaultOptions.rejectUnauthorizedProxy = true;
```
