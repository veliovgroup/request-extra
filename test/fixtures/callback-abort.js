import assert from 'node:assert/strict';
import http from 'node:http';
import { Writable } from 'node:stream';
import request from '../../index.js';

const mode = process.argv[2];
// A small body arrives as the final native chunk, so abort races the
// settlement node-libcurl queues for a completed transfer.
const small = process.argv[3] === 'small';
const chunk = Buffer.alloc(1024 * 1024, 97);
const server = http.createServer((_incoming, res) => {
  if (small) return res.end('ok');
  let written = 0;
  const write = () => {
    while (written < 8) {
      written++;
      if (!res.write(chunk)) return res.once('drain', write);
    }
    res.end();
  };
  write();
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const url = `http://127.0.0.1:${server.address().port}`;

const send = (setup) => new Promise((resolve) => {
  const req = request({ url, retry: false }, (error, response) => resolve({ error, response }));
  setup?.(req);
});

const abortInside = (req) => {
  if (mode === 'data') req.onData(() => req.abort());
  if (mode === 'header') req.onHeader(() => req.abort());
  if (mode === 'writable') {
    req.pipe(new Writable({
      write(_chunk, _encoding, callback) {
        req.abort();
        callback();
      }
    }));
  }
  if (mode === 'throwing-writable') {
    req.pipe({ write() { throw new Error('disk failure'); }, end() {} });
  }
};

try {
  if (mode === 'start') {
    let nested;
    const outer = await send((req) => req.onData(() => { nested ||= send(); }));
    assert.equal(outer.response.statusCode, 200);
    const inner = await nested;
    assert.equal(inner.error, undefined);
    assert.equal(inner.response.statusCode, 200);
  } else {
    const aborted = await send(abortInside);
    assert.equal(aborted.error.statusCode, mode === 'throwing-writable' ? 500 : 499);
    const next = await send();
    assert.equal(next.error, undefined);
    assert.equal(next.response.statusCode, 200);
  }
  console.log('callback-abort-ok');
} finally {
  server.closeAllConnections();
  server.close();
}
