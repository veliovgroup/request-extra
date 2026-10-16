import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import request, { requestAsync } from 'request-libcurl';

assert.equal(typeof request, 'function');
assert.equal(typeof requestAsync, 'function');
assert.equal(request.defaultOptions.rejectUnauthorized, false);
assert.equal(request.defaultOptions.rejectUnauthorizedProxy, false);

const require = createRequire(import.meta.url);
assert.equal(require('request-libcurl').default.defaultOptions, request.defaultOptions);
