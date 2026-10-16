import assert from 'node:assert/strict';
import request, { requestAsync } from '../../index.js';

const options = {
  url: 'http://127.0.0.1:1',
  wait: true,
  retry: false,
  timeout: 10
};
if (process.argv[2] === 'callback') {
  let calls = 0;
  const error = await new Promise((resolve) => {
    const req = request(options, (error) => { calls++; resolve(error); });
    // opts is public; mutation after validation must not strand native resources.
    req.opts.method = 123;
    req.send();
  });
  assert.equal(error.errorCode, 4);
  assert.equal(calls, 1);
} else {
  const req = await requestAsync(options);
  req.opts.method = 123;
  await assert.rejects(req.sendAsync(), { errorCode: 4, statusCode: 500 });
}
// The child must exit without waiting for fallback timers or emitting a second rejection.
console.log('setup-error-ok');
