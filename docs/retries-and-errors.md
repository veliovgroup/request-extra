# Retries and errors

Retries default to enabled for `GET`, `HEAD`, `OPTIONS`, `PUT`, and `DELETE`. `POST` is excluded. Opt in only when operation is safe to repeat:

```js
await requestAsync({
  url: 'https://example.com/idempotent-operation',
  method: 'POST',
  form: { requestId: 'stable-idempotency-key' },
  retryMethods: ['POST']
});
```

Callers remain responsible for idempotency keys and duplicate-side-effect prevention.

## Defaults

| Option | Default | Meaning |
| --- | --- | --- |
| `retry` | `true` | Enables retry logic. |
| `retries` | `3` | Additional attempts after original attempt. At most four total attempts. |
| `retryMethods` | `['GET', 'HEAD', 'OPTIONS', 'PUT', 'DELETE']` | Methods eligible for retries. |
| `badStatuses` | `[408, 425, 429, 500, 502, 503, 504]` | Retryable response statuses. |
| `retryDelay` | `256` | Initial exponential-delay ceiling in milliseconds. |
| `retryMaxDelay` | `30000` | Maximum retry delay in milliseconds. |
| `retryJitter` | `true` | Uses random delay from zero through calculated ceiling. |
| `respectRetryAfter` | `true` | Uses valid `Retry-After` response header. |

The default `isBadStatus(statusCode, badStatuses)` returns `badStatuses.includes(statusCode)`. Transport errors retry unless libcurl reports a non-retryable error code. Setting `retry: false`, setting `retries: 0`, or excluding method from `retryMethods` prevents retry.

Requests that use `pipeTo` or `.pipe()` do not retry. A writable destination may already contain bytes from the first response and may already be ended, so replaying another attempt into it is unsafe.

## Delay calculation

Without `Retry-After`, delay ceiling doubles for each retry: `retryDelay * 2^attempt`, capped at `retryMaxDelay`. With jitter enabled, actual delay is an integer from zero through that ceiling. Set `retryJitter: false` for exact exponential delays.

When response has `Retry-After`, library accepts non-negative seconds or future HTTP date and caps resulting delay at `retryMaxDelay`. Invalid, negative, or past values fall back to exponential delay. Set `respectRetryAfter: false` to ignore header.

## Error shape

Callback failures receive `ResponseError`; Promise requests reject with same shape. `errorCode` is libcurl error code and `code` aliases it. `statusCode` is mapped HTTP-style status and `status` aliases it.

- Invalid URL: status 400, error code 3.
- Invalid request body or curl configuration: status 400 or 500.
- Abort: status 499, error code 42.
- Writable-stream failure: status 500, error code 23.
- TLS failures map to status 526.

Check `errorCode` when handling libcurl-specific failures and `statusCode` when applying HTTP-style policy.
