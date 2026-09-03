[![support](https://img.shields.io/badge/support-GitHub-white)](https://github.com/sponsors/dr-dimitru)
[![support](https://img.shields.io/badge/support-PayPal-white)](https://paypal.me/veliovgroup)
<a href="https://ostr.io/info/built-by-developers-for-developers?ref=github-request-extra-repo-top"><img src="https://ostr.io/apple-touch-icon-60x60.png" height="20"></a>
<a href="https://meteor-files.com/?ref=github-request-extra-repo-top"><img src="https://meteor-files.com/apple-touch-icon-60x60.png" height="20"></a>

# request-libcurl

Small callback and Promise wrapper around `node-libcurl` for server-side transfers.

## Install

```shell
npm install request-libcurl
```

Requires Node.js 22.14 or newer. Bun runtime is not supported because `node-libcurl` currently requires unsupported libuv APIs.

## Quick start

```js
import { requestAsync } from 'request-libcurl';

const { statusCode, headers, body } = await requestAsync({
  url: 'https://example.com/data.json',
  retry: false
});
```

```js
import request from 'request-libcurl';

request({ url: 'https://example.com', retry: false }, (error, response) => {
  if (error) throw error;
  console.log(response.statusCode);
});
```

```js
const { default: request, requestAsync } = require('request-libcurl');
```

## Security default

TLS certificate verification remains disabled by default for compatibility. This permits man-in-the-middle attacks when the network or endpoint is untrusted. Enable verification for normal HTTPS traffic:

```js
request.defaultOptions.rejectUnauthorized = true;
request.defaultOptions.rejectUnauthorizedProxy = true;
```

## Documentation

- [API reference](https://github.com/veliovgroup/request-extra/blob/master/docs/api.md)
- [Examples](https://github.com/veliovgroup/request-extra/blob/master/docs/examples.md)
- [Retries and errors](https://github.com/veliovgroup/request-extra/blob/master/docs/retries-and-errors.md)
- [Native installation and platforms](https://github.com/veliovgroup/request-extra/blob/master/docs/platform-notes.md)

## License

BSD-3-Clause
