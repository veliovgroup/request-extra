const assert = require('node:assert/strict');
const { default: request, requestAsync } = require('request-libcurl');

assert.equal(typeof request, 'function');
assert.equal(typeof requestAsync, 'function');
assert.equal(request.defaultOptions.rejectUnauthorized, false);
assert.equal(request.defaultOptions.rejectUnauthorizedProxy, false);
assert.equal(require('request-libcurl/package.json').name, 'request-libcurl');
