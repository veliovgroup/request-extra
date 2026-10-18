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

Requests that use `upload` do not retry. Libcurl advances the supplied file descriptor while sending, and the library cannot safely rewind or recreate it for another attempt.

Requests with `onData()` or `onHeader()` callbacks do not retry. These callbacks expose attempt data immediately, so later retries would mix output from separate responses.

## Delay calculation

Without `Retry-After`, delay ceiling doubles for each retry: `retryDelay * 2^attempt`, capped at `retryMaxDelay`. With jitter enabled, actual delay is an integer from zero through that ceiling. Set `retryJitter: false` for exact exponential delays.

When response has `Retry-After`, library accepts non-negative seconds or future HTTP date and caps resulting delay at `retryMaxDelay`. Invalid, negative, or past values fall back to exponential delay. Set `respectRetryAfter: false` to ignore header.

## Timeout limits

`timeout` accepts finite values from `0` through `2147482647` milliseconds. The wrapper keeps a fallback abort timer for `timeout + 1000` ms, even if `curlOptions` overrides the native timeout. Consequently, `timeout: 0` is not an unlimited request: its fallback aborts after 1000 ms.

`retryDelay` and `retryMaxDelay` accept finite values from `0` through `2147483647` milliseconds. Larger values throw `TypeError` before sending instead of overflowing Node's timers. Retry and redirect counts must be non-negative safe integers.

The overall fallback budget includes attempts and retry delays. Budgets longer than one Node timer are scheduled in bounded chunks, not truncated to a millisecond. Disabling retries or selecting a method outside `retryMethods` uses a single-attempt budget.

## HTTP error statuses

HTTP responses do not reject merely because their status is `4xx` or `5xx`. Retryable statuses can trigger another attempt; after retries are exhausted, the last response resolves normally. Inspect `statusCode` to apply application policy:

```js
const response = await requestAsync({ url, retry: false });
if (response.statusCode >= 400) {
  throw new Error(`HTTP ${response.statusCode}`);
}
```

Transport, configuration, serialization, writable, and cancellation failures reject or call back with an error.

## Error shape

Callback failures receive `ResponseError`; Promise requests reject with same shape. `errorCode` is libcurl error code and `code` aliases it. `statusCode` is mapped HTTP-style status and `status` aliases it.

- Invalid URL: status 400, error code 3.
- Invalid request body or curl configuration: status 400 or 500.
- Abort: status 499, error code 42.
- Writable-stream failure: status 500, error code 23.
- Empty server reply (libcurl code 52): status 503.
- Too many redirects (libcurl code 47): status 429. It does not retry.
- TLS failures (libcurl codes 35, 58, 60, 83, 90, 91): status 526.
- Other libcurl errors: status 408.
- An exception thrown by an `onData()` or `onHeader()` callback ends the transfer with libcurl code 42 and status 408. The thrown error is in `cause`. A library abort also uses code 42, but with status 499.

Check `errorCode` when handling libcurl-specific failures and `statusCode` when applying HTTP-style policy.
