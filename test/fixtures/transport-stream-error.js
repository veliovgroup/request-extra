import assert from 'node:assert/strict';
import { Writable } from 'node:stream';
import request from '../../index.js';
import { createLocalServer } from '../helpers/local-server.js';

let attempts = 0;
const sink = new Writable({
  write(_chunk, _encoding, callback) {
    callback();
  }
});
const server = await createLocalServer((incoming) => {
  attempts++;
  incoming.socket.destroy();
});

try {
  const error = await new Promise((resolve) => {
    request({
      url: server.url,
      pipeTo: sink,
      retries: 2,
      retryDelay: 0,
      timeout: 250
    }, resolve);
  });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(error.statusCode, 503);
  assert.equal(attempts, 1);
  assert.equal(sink.destroyed, true);
} finally {
  await server.close();
}
