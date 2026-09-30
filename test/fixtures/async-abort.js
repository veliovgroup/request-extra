import assert from 'node:assert/strict';
import { requestAsync } from '../../index.js';
import { createLocalServer, waitFor } from '../helpers/local-server.js';

const mode = process.argv[2];
let attempts = 0;
let settlements = 0;
const sockets = new Set();
const server = await createLocalServer((incoming, res) => {
  attempts++;
  sockets.add(incoming.socket);
  if (mode === 'delay') {
    res.writeHead(503);
    res.end();
  }
});
const req = await requestAsync({
  url: server.url, wait: true, timeout: 10000, retries: 2,
  retryDelay: 10000, retryJitter: false
});
const outcome = req.sendAsync().then(
  () => { throw new Error('Unexpected success'); },
  (error) => { settlements++; return error; }
);
await waitFor(() => mode === 'delay' ? Boolean(req.retryTimer) : attempts === 1);
await assert.rejects(req.abortAsync(), { statusCode: 499 });
const error = await outcome;
await assert.rejects(req.abortAsync(), (caught) => caught === error);
await assert.rejects(req.sendAsync(), (caught) => caught === error);
assert.equal(settlements, 1);
assert.equal(req.retryTimer, false);
assert.equal(req.timeoutTimer, null);
for (const socket of sockets) socket.destroy();
await server.close();
console.log(JSON.stringify({
  statusCode: error.statusCode, settlements, attempts,
  retryTimer: req.retryTimer, timeoutTimer: req.timeoutTimer
}));
