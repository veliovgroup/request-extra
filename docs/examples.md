# Examples

Examples use `requestAsync()` and throw failures to caller unless noted.

## JSON request body

```js
import { requestAsync } from 'request-libcurl';

const response = await requestAsync({
  url: 'https://example.com/items',
  method: 'POST',
  form: { name: 'example' },
  retry: false
});
```

Objects passed as `form` are JSON-stringified and set `Content-Type: application/json` unless supplied headers override it.

## URL-encoded request body

```js
import { requestAsync } from 'request-libcurl';

const form = new URLSearchParams({ query: 'request libcurl', page: '1' }).toString();
const response = await requestAsync({
  url: 'https://example.com/search',
  method: 'POST',
  form,
  retry: false
});
```

Strings passed as `form` set `Content-Type: application/x-www-form-urlencoded` unless supplied headers override it.

## Basic authentication

```js
import { requestAsync } from 'request-libcurl';

const response = await requestAsync({
  url: 'https://example.com/private',
  auth: 'alice:correct-horse-battery-staple',
  retry: false
});
```

## Delayed send with `wait`

```js
import { requestAsync } from 'request-libcurl';

const request = await requestAsync({
  url: 'https://example.com/events',
  wait: true,
  retry: false
});

request.onHeader((chunk) => console.log(chunk.toString('utf8')));
const response = await request.sendAsync();
```

## Raw response chunks

```js
import { requestAsync } from 'request-libcurl';

const request = await requestAsync({
  url: 'https://example.com/archive',
  wait: true,
  rawBody: true,
  noStorage: true,
  retry: false
});

const chunks = [];
request.onData((chunk) => chunks.push(chunk));
request.onHeader((chunk) => console.log(chunk.toString('utf8')));
await request.sendAsync();
const body = Buffer.concat(chunks);
```

## Download to one or more writable streams

```js
import fs from 'node:fs';
import { once } from 'node:events';
import { requestAsync } from 'request-libcurl';

const first = fs.createWriteStream('/tmp/report.json');
const second = fs.createWriteStream('/tmp/report-copy.json');
const streamError = Promise.race([
  once(first, 'error').then(([error]) => { throw error; }),
  once(second, 'error').then(([error]) => { throw error; })
]);

try {
  const request = await requestAsync({
    url: 'https://example.com/report.json',
    wait: true,
    retry: false
  });
  request.pipe(first).pipe(second);
  await Promise.race([request.sendAsync(), streamError]);
} catch (error) {
  first.destroy(error);
  second.destroy(error);
  throw error;
}
```

## File-descriptor upload

```js
import fs from 'node:fs';
import { requestAsync } from 'request-libcurl';

const fd = fs.openSync('/tmp/archive.tar.gz', 'r');
try {
  await requestAsync({
    url: 'https://example.com/upload',
    method: 'POST',
    upload: fd,
    retry: false
  });
} catch (error) {
  console.error('upload failed', error);
  throw error;
} finally {
  fs.closeSync(fd);
}
```

## Multipart upload through `curlOptions`

```js
import { requestAsync } from 'request-libcurl';

try {
  await requestAsync({
    url: 'https://example.com/upload',
    method: 'POST',
    retry: false,
    curlFeatures: { NoDataParsing: true, NoHeaderParsing: true },
    curlOptions: {
      HTTPPOST: [
        { name: 'file', file: '/tmp/report.pdf', type: 'application/pdf' },
        { name: 'note', contents: 'monthly report' }
      ]
    }
  });
} catch (error) {
  console.error('multipart upload failed', error);
  throw error;
}
```

## Proxy and certificate settings

```js
import { requestAsync } from 'request-libcurl';

const response = await requestAsync({
  url: 'https://example.com/private',
  proxy: 'https://proxy.example.com:8443',
  rejectUnauthorized: true,
  rejectUnauthorizedProxy: true,
  retry: false
});
```

Both TLS verification settings default to `false`. Enable both for trusted HTTPS origin and HTTPS proxy traffic.
