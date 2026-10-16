import assert from 'node:assert/strict';
import http from 'node:http';
import { Writable } from 'node:stream';
import request from '../../index.js';

const mode = process.argv[2];
let req;
let settlements = 0;
let pendingCallbackFinished;
const pending = new Promise((resolve) => { pendingCallbackFinished = resolve; });
const abortDuringOperation = (callback) => {
  setImmediate(() => {
    if (mode === 'destroying') sink.destroy(new Error('disk failure'));
    req.abort();
  });
  setTimeout(() => {
    callback(new Error('late disk failure'));
    pendingCallbackFinished();
  }, 20);
};
const sink = new Writable({
  emitClose: mode !== 'no-close',
  write(_chunk, _encoding, callback) {
    if (mode === 'final') callback();
    else abortDuringOperation(callback);
  },
  final: abortDuringOperation
});
const server = http.createServer((_incoming, res) => {
  if (mode === 'final') res.end('body');
  else res.write('body');
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
try {
  const error = await new Promise((resolve) => {
    req = request({
      url: `http://127.0.0.1:${server.address().port}`,
      pipeTo: sink,
      retry: false
    }, (error) => { settlements++; resolve(error); });
  });
  await pending;
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(error.statusCode, 499);
  assert.equal(settlements, 1);
  assert.equal(sink.destroyed, true);
  assert.equal(sink.listenerCount('error'), 0);
  assert.equal(sink.listenerCount('drain'), 0);
  assert.equal(sink.listenerCount('close'), 0);
  console.log('abort-stream-ok');
} finally {
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
}
