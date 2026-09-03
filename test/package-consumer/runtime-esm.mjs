import assert from 'node:assert/strict';
import request, { requestAsync } from 'request-libcurl';

assert.equal(typeof request, 'function');
assert.equal(typeof requestAsync, 'function');
assert.equal(request.defaultOptions.rejectUnauthorized, false);
assert.equal(request.defaultOptions.rejectUnauthorizedProxy, false);
