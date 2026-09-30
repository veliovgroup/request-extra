import { assert } from 'chai';
import strictAssert from 'node:assert/strict';
import { closeSync, openSync, readFileSync } from 'node:fs';
import { describe, it } from 'mocha';
import request, { requestAsync } from '../index.js';
import { createLocalServer, waitFor } from './helpers/local-server.js';
import { isNode26 } from './helpers/node26.js';

describe('local runtime', () => {
  it('exports callback and async request functions', () => {
    assert.isFunction(request);
    assert.isFunction(requestAsync);
  });

  it('performs a local async request', async () => {
    const server = await createLocalServer((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('local-ok');
    });

    try {
      const response = await requestAsync({ url: server.url, retry: false });
      assert.equal(response.statusCode, 200);
      strictAssert.equal(response.body, 'local-ok');
    } finally {
      await server.close();
    }
  });

  it('sends an empty string form with form headers', async () => {
    const server = await createLocalServer((incoming, res) => {
      let body = '';
      incoming.setEncoding('utf8');
      incoming.on('data', (chunk) => {
        body += chunk;
      });
      incoming.on('end', () => {
        res.end(JSON.stringify({ body, headers: incoming.headers }));
      });
    });

    try {
      const response = await requestAsync({
        url: server.url,
        method: 'POST',
        form: '',
        retry: false
      });
      const received = JSON.parse(response.body);
      assert.equal(received.body, '');
      assert.equal(received.headers['content-type'], 'application/x-www-form-urlencoded');
      assert.equal(received.headers['content-length'], '0');
    } finally {
      await server.close();
    }
  });

  it('rejects CRLF in request header values', async () => {
    await strictAssert.rejects(
      requestAsync({
        url: 'http://127.0.0.1:1',
        retry: false,
        headers: { 'X-Test': 'safe\r\nX-Injected: yes' }
      }),
      { name: 'TypeError', message: 'Invalid HTTP header value for "X-Test"' }
    );
  });

  it('rejects invalid request header names', async () => {
    await strictAssert.rejects(
      requestAsync({
        url: 'http://127.0.0.1:1',
        retry: false,
        headers: { 'Bad Header': 'value' }
      }),
      { name: 'TypeError', message: 'Invalid HTTP header name: "Bad Header"' }
    );
  });

  it('rejects invalid HTTP method tokens', () => {
    for (const method of ['', ' GET ', 'GET\r\nX-Injected: yes']) {
      strictAssert.throws(
        () => request({ url: 'http://127.0.0.1:1', method }),
        { name: 'TypeError', message: '{opts.method} expecting a valid HTTP token' }
      );
    }
  });

  it('does not share reusable error objects between requests', async () => {
    const firstUrlError = await requestAsync({ url: 'not-a-url' }).catch((error) => error);
    firstUrlError.statusCode = 599;
    const secondUrlError = await requestAsync({ url: 'not-a-url' }).catch((error) => error);
    assert.equal(secondUrlError.statusCode, 400);

    const firstAbortError = await new Promise((resolve) => {
      request({ url: 'http://127.0.0.1:1', wait: true }, resolve).abort();
    });
    firstAbortError.statusCode = 599;
    const secondAbortError = await new Promise((resolve) => {
      request({ url: 'http://127.0.0.1:1', wait: true }, resolve).abort();
    });
    assert.equal(secondAbortError.statusCode, 499);
  });

  it('validates headers before creating a waiting request', () => {
    strictAssert.throws(
      () => request({
        url: 'http://127.0.0.1:1',
        wait: true,
        headers: { 'Bad Header': 'value' }
      }),
      { name: 'TypeError', message: 'Invalid HTTP header name: "Bad Header"' }
    );
  });

  it('does not send inherited request headers', async () => {
    const headers = Object.create({ 'X-Inherited': 'blocked' });
    headers['X-Own'] = 'sent';
    const server = await createLocalServer((req, res) => {
      res.end(JSON.stringify(req.headers));
    });

    try {
      const response = await requestAsync({ url: server.url, headers, retry: false });
      const received = JSON.parse(response.body);
      assert.equal(received['x-own'], 'sent');
      assert.notProperty(received, 'x-inherited');
    } finally {
      await server.close();
    }
  });

  it('ignores inherited Curl options during configuration preflight', async () => {
    const curlOptions = Object.create({ URL: 1 });
    const server = await createLocalServer((_req, res) => {
      res.end('local-ok');
    });

    try {
      const response = await requestAsync({ url: server.url, curlOptions, retry: false });
      assert.equal(response.body, 'local-ok');
    } finally {
      await server.close();
    }
  });

  it('treats explicit undefined options as omitted', async () => {
    const server = await createLocalServer((req, res) => {
      res.end(req.method);
    });
    try {
      const response = await requestAsync({ url: server.url, method: undefined, retry: false });
      assert.equal(response.body, 'GET');
    } finally {
      await server.close();
    }
  });

  it('rejects negative retry and timeout values', () => {
    assert.throws(() => request({ url: 'http://127.0.0.1:1', retries: -1 }), TypeError, 'retries');
    assert.throws(() => request({ url: 'http://127.0.0.1:1', timeout: -1 }), TypeError, 'timeout');
  });

  it('rejects fractional attempt and redirect counts', () => {
    for (const key of ['retries', 'maxRedirects']) {
      strictAssert.throws(
        () => request({ url: 'http://127.0.0.1:1', [key]: 1.5 }),
        { name: 'TypeError', message: `{opts.${key}} expecting a non-negative integer` }
      );
    }
  });

  it('rejects invalid file descriptors', () => {
    for (const upload of [-1, 1.5]) {
      strictAssert.throws(
        () => request({ url: 'http://127.0.0.1:1', upload }),
        { name: 'TypeError', message: '{opts.upload} expecting a non-negative integer' }
      );
    }
  });

  it('rejects invalid documented option types during construction', () => {
    const invalidOptions = [
      ['url', { url: 1 }],
      ['uri', { url: 'http://127.0.0.1:1', uri: null }],
      ['auth', { url: 'http://127.0.0.1:1', auth: 1 }],
      ['form', { url: 'http://127.0.0.1:1', form: null }],
      ['upload', { url: 'http://127.0.0.1:1', upload: '1' }],
      ['pipeTo', { url: 'http://127.0.0.1:1', pipeTo: {} }],
      ['headers', { url: 'http://127.0.0.1:1', headers: [] }],
      ['header value', { url: 'http://127.0.0.1:1', headers: { 'X-Test': {} } }],
      ['proxy', { url: 'http://127.0.0.1:1', proxy: 1 }],
      ['badStatuses', { url: 'http://127.0.0.1:1', badStatuses: [503, '504'] }],
      ['isBadStatus', { url: 'http://127.0.0.1:1', isBadStatus: null }],
      ['curlOptions', { url: 'http://127.0.0.1:1', curlOptions: [] }],
      ['curlFeatures', { url: 'http://127.0.0.1:1', curlFeatures: [] }]
    ];

    for (const key of [
      'debug',
      'retry',
      'retryJitter',
      'respectRetryAfter',
      'keepAlive',
      'followRedirect',
      'rawBody',
      'noStorage',
      'wait',
      'rejectUnauthorized',
      'rejectUnauthorizedProxy'
    ]) {
      invalidOptions.push([key, { url: 'http://127.0.0.1:1', [key]: 'true' }]);
    }

    for (const [key, options] of invalidOptions) {
      strictAssert.throws(
        () => request({ ...options, curlOptions: options.curlOptions || { TIMEOUT_MS: 1 } }),
        { name: 'TypeError' },
        key
      );
    }
  });

  it('returns invalid Curl configuration without performing request', async () => {
    let attempts = 0;
    const server = await createLocalServer((_req, res) => {
      attempts++;
      res.end();
    });
    try {
      let error;
      await strictAssert.rejects(requestAsync({
        url: server.url,
        retry: false,
        curlOptions: { TIMEOUT_MS: 'invalid' }
      }), (caught) => {
        error = caught;
        return true;
      });
      assert.equal(error.code, 4);
      assert.equal(error.statusCode, 500);
      assert.equal(attempts, 0);
    } finally {
      await server.close();
    }
  });

  it('preflights invalid native Curl option values without performing request', async () => {
    let attempts = 0;
    const server = await createLocalServer((_req, res) => {
      attempts++;
      res.end();
    });
    try {
      const error = await new Promise((resolve) => {
        const requestInstance = request({
          url: server.url,
          wait: true,
          retry: false,
          curlOptions: { URL: 1 }
        }, resolve);
        assert.equal(requestInstance.opts._configurationError.code, 4);
        requestInstance.send();
        assert.equal(requestInstance.timeoutTimer, null);
      });
      assert.equal(error.errorCode, 4);
      assert.equal(error.status, 500);
      assert.equal(error.statusCode, 500);
      assert.equal(attempts, 0);
    } finally {
      await server.close();
    }
  });

  it('treats retries as additional attempts for HTTP statuses', async () => {
    let attempts = 0;
    const server = await createLocalServer((_req, res) => {
      attempts++;
      res.writeHead(500);
      res.end('retry');
    });
    try {
      const response = await requestAsync({
        url: server.url,
        retries: 1,
        retryDelay: 0
      });
      assert.equal(response.statusCode, 500);
      assert.equal(attempts, 2);
    } finally {
      await server.close();
    }
  });

  // node-libcurl file-descriptor uploads stall on Node.js 26 (docs/platform-notes.md).
  (isNode26 ? it.skip : it)('uploads from file descriptor zero', async () => {
    const { spawn } = await import('node:child_process');
    const file = new URL('./bb.jpg', import.meta.url);
    const expectedBytes = readFileSync(file).byteLength;
    const server = await createLocalServer((incoming, res) => {
      let receivedBytes = 0;
      incoming.on('data', (chunk) => {
        receivedBytes += chunk.byteLength;
      });
      incoming.on('end', () => res.end(String(receivedBytes)));
    });
    const input = openSync(file, 'r');

    try {
      const child = spawn(process.execPath, ['test/fixtures/stdin-upload.js', server.url], {
        cwd: process.cwd(),
        stdio: [input, 'pipe', 'pipe']
      });
      const stdout = [];
      const stderr = [];
      child.stdout.on('data', (chunk) => stdout.push(chunk));
      child.stderr.on('data', (chunk) => stderr.push(chunk));
      const exitCode = await new Promise((resolve) => child.once('exit', resolve));
      assert.equal(exitCode, 0, Buffer.concat(stderr).toString());
      const response = JSON.parse(Buffer.concat(stdout).toString());
      assert.equal(Number(response.body), expectedBytes);
    } finally {
      closeSync(input);
      await server.close();
    }
  });

  it('does not retry file-descriptor uploads', async () => {
    const file = new URL('./bb.jpg', import.meta.url);
    const expectedBytes = readFileSync(file).byteLength;
    const receivedBytes = [];
    let attempts = 0;
    const server = await createLocalServer((incoming, res) => {
      attempts++;
      let bytes = 0;
      incoming.on('data', (chunk) => {
        bytes += chunk.byteLength;
      });
      incoming.on('end', () => {
        receivedBytes.push(bytes);
        res.writeHead(503);
        res.end();
      });
    });
    const upload = openSync(file, 'r');

    try {
      const response = await requestAsync({
        url: server.url,
        method: 'PUT',
        upload,
        retries: 1,
        retryDelay: 0,
        retryJitter: false
      });
      assert.equal(response.statusCode, 503);
      assert.equal(attempts, 1);
      assert.deepEqual(receivedBytes, [expectedBytes]);
    } finally {
      closeSync(upload);
      await server.close();
    }
  });

  it('does not retry POST by default', async () => {
    let attempts = 0;
    const server = await createLocalServer((_req, res) => {
      attempts++;
      res.writeHead(503);
      res.end();
    });
    try {
      await requestAsync({ url: server.url, method: 'POST', form: '{}', retries: 2, retryDelay: 0 });
      assert.equal(attempts, 1);
    } finally {
      await server.close();
    }
  });

  it('retries POST when retryMethods explicitly includes POST', async () => {
    let attempts = 0;
    const server = await createLocalServer((_req, res) => {
      attempts++;
      res.writeHead(503);
      res.end();
    });
    try {
      await requestAsync({
        url: server.url,
        method: 'POST',
        form: '{}',
        retries: 1,
        retryDelay: 0,
        retryMethods: ['POST']
      });
      assert.equal(attempts, 2);
    } finally {
      await server.close();
    }
  });

  it('does not retry permanent client errors by default', async () => {
    let attempts = 0;
    const server = await createLocalServer((_req, res) => {
      attempts++;
      res.writeHead(400);
      res.end();
    });
    try {
      await requestAsync({ url: server.url, retries: 2, retryDelay: 0 });
      assert.equal(attempts, 1);
    } finally {
      await server.close();
    }
  });

  it('respects Retry-After zero without waiting for backoff', async () => {
    let attempts = 0;
    const server = await createLocalServer((_req, res) => {
      attempts++;
      res.writeHead(503, { 'Retry-After': '0' });
      res.end();
    });
    try {
      const started = Date.now();
      await requestAsync({
        url: server.url,
        retries: 1,
        retryDelay: 1000,
        retryJitter: false
      });
      assert.equal(attempts, 2);
      assert.isBelow(Date.now() - started, 500);
    } finally {
      await server.close();
    }
  });

  it('maps SSL connect failures to status 526', async () => {
    const server = await createLocalServer((_req, res) => res.end());
    try {
      let error;
      await strictAssert.rejects(requestAsync({
        url: server.url.replace('http:', 'https:'),
        rejectUnauthorized: false,
        retry: false
      }), (caught) => {
        error = caught;
        return true;
      });
      assert.equal(error.code, 35);
      assert.equal(error.statusCode, 526);
    } finally {
      await server.close();
    }
  });

  it('closes active retry handle when aborted', async () => {
    let attempts = 0;
    let activeRequest;
    let callbackCalls = 0;
    let callbackError;
    const server = await createLocalServer((incoming) => {
      attempts++;
      if (attempts === 1) {
        incoming.socket.destroy();
      } else {
        activeRequest = incoming;
      }
    });

    try {
      const req = request({
        url: server.url,
        retries: 1,
        retryDelay: 5,
        timeout: 2000
      }, (error) => {
        callbackCalls++;
        callbackError = error;
      });
      await waitFor(() => attempts === 2);
      req.abort();
      await waitFor(() => activeRequest.destroyed);
      await new Promise((resolve) => setTimeout(resolve, 25));
      assert.isTrue(activeRequest.destroyed);
      assert.equal(callbackCalls, 1);
      assert.equal(callbackError.code, 42);
    } finally {
      activeRequest?.destroy();
      await server.close();
    }
  });

  it('does not send after aborting a waiting request', async () => {
    let attempts = 0;
    const server = await createLocalServer((_req, res) => {
      attempts++;
      res.end();
    });

    try {
      const req = request({ url: server.url, wait: true }, () => {});
      req.abort();
      req.send();
      await new Promise((resolve) => setTimeout(resolve, 25));
      assert.equal(attempts, 0);
      assert.equal(req.sent, false);
      assert.equal(req.timeoutTimer, null);
      assert.isUndefined(req.curl);
    } finally {
      await server.close();
    }
  });

  it('does not retain timers after request-body serialization fails', async () => {
    const { spawn } = await import('node:child_process');
    const started = Date.now();
    const child = spawn(process.execPath, ['test/fixtures/circular-form.js'], {
      cwd: process.cwd(),
      stdio: 'inherit'
    });
    const exitCode = await new Promise((resolve) => child.once('exit', resolve));
    assert.equal(exitCode, 0);
    assert.isBelow(Date.now() - started, 1000);
  });

  it('returns a bad request when object serialization produces undefined', async () => {
    let attempts = 0;
    const server = await createLocalServer((_req, res) => {
      attempts++;
      res.end();
    });

    try {
      const error = await new Promise((resolve) => {
        const req = request({
          url: server.url,
          wait: true,
          retry: false,
          form: { toJSON() {} }
        }, resolve);
        req.send();
      });
      assert.equal(error.errorCode, 43);
      assert.equal(error.statusCode, 400);
      assert.equal(attempts, 0);
    } finally {
      await server.close();
    }
  });

  it('does not retain per-attempt timeout after manual abort', async () => {
    const { spawn } = await import('node:child_process');
    const started = Date.now();
    const child = spawn(process.execPath, ['test/fixtures/manual-abort.js'], {
      cwd: process.cwd(),
      stdio: 'inherit'
    });
    const exitCode = await new Promise((resolve) => child.once('exit', resolve));
    assert.equal(exitCode, 0);
    assert.isBelow(Date.now() - started, 750);
  });

  it('returns stream write errors without retrying', async () => {
    const { Writable } = await import('node:stream');
    let attempts = 0;
    const sink = new Writable({
      write(_chunk, _encoding, callback) {
        callback(new Error('disk full'));
      }
    });
    const server = await createLocalServer((_req, res) => {
      attempts++;
      res.end('body');
    });

    try {
      const error = await new Promise((resolve) => {
        request({ url: server.url, pipeTo: sink, retries: 2 }, resolve);
      });
      assert.equal(error.code, 23);
      assert.equal(error.statusCode, 500);
      assert.equal(error.cause.message, 'disk full');
      assert.equal(attempts, 1);
    } finally {
      await server.close();
    }
  });

  it('does not retry HTTP status failures after streaming a response', async () => {
    const { Writable } = await import('node:stream');
    let attempts = 0;
    let body = '';
    const sink = new Writable({
      write(chunk, _encoding, callback) {
        body += chunk.toString();
        callback();
      }
    });
    const server = await createLocalServer((_req, res) => {
      attempts++;
      if (attempts === 1) {
        res.writeHead(503);
        res.end('retry-body');
      } else {
        res.end('success-body');
      }
    });

    try {
      const response = await new Promise((resolve, reject) => {
        request({ url: server.url, pipeTo: sink, retries: 1, retryDelay: 0 }, (error, result) => {
          if (error) reject(error);
          else resolve(result);
        });
      });
      assert.equal(response.statusCode, 503);
      assert.equal(attempts, 1);
      assert.equal(body, 'retry-body');
      assert.isTrue(sink.writableEnded);
    } finally {
      await server.close();
    }
  });

  it('does not retry after invoking response stream callbacks', async () => {
    for (const hook of ['onData', 'onHeader']) {
      let attempts = 0;
      let callbackCalls = 0;
      const server = await createLocalServer((_req, res) => {
        attempts++;
        res.writeHead(503, { 'X-Attempt': String(attempts) });
        res.end('retry-body');
      });

      try {
        const req = await requestAsync({
          url: server.url,
          wait: true,
          retries: 1,
          retryDelay: 0
        });
        req[hook](() => callbackCalls++);
        const response = await req.sendAsync();
        assert.equal(response.statusCode, 503);
        assert.equal(attempts, 1, hook);
        assert.isAbove(callbackCalls, 0, hook);
      } finally {
        await server.close();
      }
    }
  });

  it('keeps a writable error listener while destroying it after a transport error', async () => {
    const { spawn } = await import('node:child_process');
    const child = spawn(process.execPath, ['test/fixtures/transport-stream-error.js'], {
      cwd: process.cwd(),
      stdio: 'inherit'
    });
    const exitCode = await new Promise((resolve) => child.once('exit', resolve));
    assert.equal(exitCode, 0);
  });

  it('cleans up transport error listeners when writable has no destroy method', async () => {
    const { EventEmitter } = await import('node:events');
    class MinimalSink extends EventEmitter {
      write() { return true; }
      end(_chunk, _encoding, callback) { callback(); }
    }
    const sink = new MinimalSink();
    const server = await createLocalServer((incoming) => incoming.socket.destroy());

    try {
      const error = await new Promise((resolve) => {
        request({ url: server.url, pipeTo: sink, retry: false }, resolve);
      });
      assert.equal(error.statusCode, 503);
      assert.equal(sink.listenerCount('error'), 0);
    } finally {
      await server.close();
    }
  });

  it('ignores inherited Location values when building redirect response headers', async () => {
    Object.prototype.Location = 'https://attacker.invalid/inherited';
    const server = await createLocalServer((_req, res) => {
      res.writeContinue();
      res.end('ok');
    });

    try {
      const response = await requestAsync({ url: server.url, retry: false });
      assert.notProperty(response.headers, 'location');
    } finally {
      delete Object.prototype.Location;
      await server.close();
    }
  });

  it('waits for writable drain before accepting more response chunks', async () => {
    const { EventEmitter } = await import('node:events');
    const events = [];
    class SlowSink extends EventEmitter {
      constructor() {
        super();
        this.destroyed = false;
        this.writes = 0;
      }

      write() {
        this.writes++;
        events.push(`write:${this.writes}`);
        if (this.writes === 1) {
          setTimeout(() => {
            events.push('drain');
            this.emit('drain');
          }, 100);
          return false;
        }
        return true;
      }

      end(_chunk, _encoding, callback) {
        callback();
      }

      destroy(error) {
        this.destroyed = true;
        if (error) this.emit('error', error);
      }
    }

    const sink = new SlowSink();
    const server = await createLocalServer((_req, res) => {
      res.flushHeaders();
      res.write('first');
      setTimeout(() => res.end('second'), 20);
    });
    try {
      await new Promise((resolve, reject) => {
        request({ url: server.url, pipeTo: sink, retry: false }, (error) => {
          if (error) reject(error);
          else resolve();
        });
      });
      assert.notEqual(events.indexOf('drain'), -1);
      assert.notEqual(events.indexOf('write:2'), -1);
      assert.isBelow(events.indexOf('drain'), events.indexOf('write:2'));
    } finally {
      await server.close();
    }
  });
});

describe('local coverage gaps', () => {
  // Observe delays chosen by real retries without replacing their scheduling.
  const observeDelays = (req, delays, now) => {
    const getDelay = req._getRetryDelay;
    req._getRetryDelay = function (result) {
      const originalNow = Date.now;
      try {
        if (now !== undefined) Date.now = () => now;
        const delay = getDelay.call(this, result);
        delays.push(delay);
        return delay;
      } finally {
        Date.now = originalNow;
      }
    };
  };

  for (const [label, header, expected] of [
    ['HTTP date', 'Tue, 01 Jan 2030 00:00:00 GMT', 20],
    ['HTTP date above cap', 'Tue, 01 Jan 2030 00:00:01 GMT', 40],
    ['negative', '-1', 3],
    ['non-numeric', 'nonsense', 3],
    ['past date', 'Thu, 01 Jan 1970 00:00:00 GMT', 3],
    ['above cap', '100', 40],
    ['repeated header', ['0', '100'], 40]
  ]) {
    it(`parses Retry-After ${label} on local retries`, async () => {
      let attempts = 0;
      const delays = [];
      const server = await createLocalServer((_req, res) => {
        attempts++;
        res.writeHead(attempts === 1 ? 503 : 200, { 'Retry-After': header });
        res.end('ok');
      });
      try {
        const req = await requestAsync({
          url: server.url, wait: true, retries: 1,
          retryDelay: 3, retryMaxDelay: 40, retryJitter: false
        });
        observeDelays(req, delays, 1893455999980);
        const response = await req.sendAsync();
        strictAssert.deepEqual(delays, [expected]);
        strictAssert.equal(attempts, 2);
        strictAssert.equal(response.statusCode, 200);
      } finally {
        await server.close();
      }
    });
  }

  for (const [label, retryDelay, retryMaxDelay, expected] of [
    ['attempts zero through three', 2, 100, [2, 4, 8, 16]],
    ['cap', 2, 5, [2, 4, 5, 5]],
    ['zero', 0, 100, [0, 0, 0, 0]]
  ]) {
    it(`computes exact retry delay ${label} without jitter`, async () => {
      let attempts = 0;
      const delays = [];
      const server = await createLocalServer((_req, res) => {
        attempts++;
        res.writeHead(503);
        res.end();
      });
      try {
        const req = await requestAsync({
          url: server.url, wait: true, retries: 4,
          retryDelay, retryMaxDelay, retryJitter: false
        });
        observeDelays(req, delays);
        strictAssert.equal((await req.sendAsync()).statusCode, 503);
        strictAssert.deepEqual(delays, expected);
        strictAssert.equal(attempts, 5);
      } finally {
        await server.close();
      }
    });
  }

  it('ignores Retry-After when respectRetryAfter is false', async () => {
    const delays = [];
    const server = await createLocalServer((_req, res) => {
      res.writeHead(503, { 'Retry-After': '100' });
      res.end();
    });
    try {
      const req = await requestAsync({
        url: server.url, wait: true, retries: 1, retryDelay: 2,
        retryJitter: false, retryMaxDelay: 5, respectRetryAfter: false
      });
      observeDelays(req, delays);
      await req.sendAsync();
      strictAssert.deepEqual(delays, [2]);
    } finally {
      await server.close();
    }
  });

  it('gives each stalled attempt its own timeout', async () => {
    let attempts = 0;
    const sockets = new Set();
    const server = await createLocalServer((incoming) => {
      attempts++;
      sockets.add(incoming.socket);
    });
    try {
      await strictAssert.rejects(requestAsync({
        url: server.url, timeout: 40, retries: 2, retryDelay: 0, retryJitter: false
      }), { errorCode: 28, statusCode: 408 });
      strictAssert.equal(attempts, 3);
    } finally {
      for (const socket of sockets) socket.destroy();
      await server.close();
    }
  });

  for (const mode of ['delay', 'transfer']) {
    it(`abortAsync settles once and clears timers during ${mode}`, async () => {
      const { spawn } = await import('node:child_process');
      const started = Date.now();
      const child = spawn(process.execPath, ['test/fixtures/async-abort.js', mode], {
        cwd: process.cwd(), stdio: ['ignore', 'pipe', 'pipe'], timeout: 1000
      });
      const stdout = [];
      const stderr = [];
      child.stdout.on('data', (chunk) => stdout.push(chunk));
      child.stderr.on('data', (chunk) => stderr.push(chunk));
      const exitCode = await new Promise((resolve, reject) => {
        child.once('error', reject);
        child.once('exit', resolve);
      });
      strictAssert.equal(exitCode, 0, Buffer.concat(stderr).toString());
      strictAssert.deepEqual(JSON.parse(Buffer.concat(stdout).toString()), {
        statusCode: 499, settlements: 1, attempts: 1, retryTimer: false, timeoutTimer: null
      });
      assert.isBelow(Date.now() - started, 750);
    });
  }

  it('pauses both piped writables until slow writable drains', async () => {
    const { EventEmitter } = await import('node:events');
    const events = [];
    let slowBody = '';
    let fastBody = '';
    class SlowSink extends EventEmitter {
      write(chunk) {
        slowBody += chunk;
        events.push('slow-write');
        if (events.filter((event) => event === 'slow-write').length === 1) {
          setTimeout(() => { events.push('drain'); this.emit('drain'); }, 100);
          return false;
        }
        return true;
      }
      end(_chunk, _encoding, callback) { callback(); }
    }
    const fast = {
      write(chunk) { fastBody += chunk; events.push('fast-write'); return true; },
      end(_chunk, _encoding, callback) { callback(); }
    };
    const server = await createLocalServer((_req, res) => {
      res.flushHeaders();
      res.write('first');
      setTimeout(() => res.end('second'), 20);
    });
    try {
      const req = await requestAsync({ url: server.url, wait: true, pipeTo: new SlowSink(), retry: false });
      strictAssert.equal(req.pipe(fast), req);
      await req.sendAsync();
      strictAssert.equal(slowBody, 'firstsecond');
      strictAssert.equal(fastBody, slowBody);
      strictAssert.ok(events.includes('drain'));
      strictAssert.ok(events.indexOf('drain') < events.lastIndexOf('fast-write'));
      strictAssert.ok(events.indexOf('drain') < events.lastIndexOf('slow-write'));
    } finally {
      await server.close();
    }
  });

  it('returns original cause when one of multiple writables fails mid-stream', async () => {
    const { Writable } = await import('node:stream');
    const cause = new Error('second chunk failed');
    let writes = 0;
    const failing = new Writable({
      write(_chunk, _encoding, callback) { callback(++writes === 2 ? cause : undefined); }
    });
    const sibling = new Writable({ write(_chunk, _encoding, callback) { callback(); } });
    const server = await createLocalServer((_req, res) => {
      res.write('first');
      setTimeout(() => res.end('second'), 20);
    });
    try {
      const req = await requestAsync({ url: server.url, wait: true, pipeTo: failing, retries: 2 });
      req.pipe(sibling);
      await strictAssert.rejects(req.sendAsync(), (error) => {
        strictAssert.equal(error.errorCode, 23);
        strictAssert.equal(error.statusCode, 500);
        strictAssert.equal(error.cause, cause);
        return true;
      });
      strictAssert.equal(writes, 2);
      strictAssert.equal(sibling.destroyed, true);
      strictAssert.equal(sibling.errored?.cause, cause);
    } finally {
      sibling.destroy();
      failing.destroy();
      await server.close();
    }
  });

  it('delivers raw headers to onHeader with a raw response body', async () => {
    const chunks = [];
    const server = await createLocalServer((_req, res) => {
      res.writeHead(200, { 'X-Raw-Test': 'present' });
      res.end('raw-body');
    });
    try {
      const req = await requestAsync({ url: server.url, wait: true, rawBody: true, retry: false });
      strictAssert.equal(req.onHeader((chunk) => chunks.push(Buffer.from(chunk))), req);
      const response = await req.sendAsync();
      strictAssert.ok(Buffer.isBuffer(response.body));
      strictAssert.equal(response.body.toString(), 'raw-body');
      strictAssert.match(Buffer.concat(chunks).toString(), /X-Raw-Test: present/i);
      strictAssert.equal(response.headers['x-raw-test'], 'present');
    } finally {
      await server.close();
    }
  });

  for (const maxRedirects of [0, 2]) {
    it(`maps redirect loop with maxRedirects ${maxRedirects} to 429 without retrying`, async () => {
      let attempts = 0;
      const headers = [];
      const server = await createLocalServer((_req, res) => {
        attempts++;
        res.writeHead(302, { Location: '/loop' });
        res.end();
      });
      try {
        const req = await requestAsync({ url: server.url, wait: true, maxRedirects, retries: 2 });
        req.onHeader((chunk) => headers.push(Buffer.from(chunk)));
        await strictAssert.rejects(req.sendAsync(), { errorCode: 47, statusCode: 429 });
        strictAssert.equal(attempts, maxRedirects + 1);
        strictAssert.match(Buffer.concat(headers).toString(), /Location: \/loop/i);
        // The error omits headers; onHeader exposes Location instead.
      } finally {
        await server.close();
      }
    });
  }

  for (const value of [false, null, undefined]) {
    it(`removes default header with ${String(value)}`, async () => {
      const server = await createLocalServer((incoming, res) => res.end(JSON.stringify(incoming.headers)));
      try {
        const response = await requestAsync({
          url: server.url, retry: false, headers: { Accept: value }
        });
        strictAssert.equal(Object.hasOwn(JSON.parse(response.body), 'accept'), false);
      } finally {
        await server.close();
      }
    });
  }

  it('merges same-case caller headers over defaults', async () => {
    const original = request.defaultOptions.headers;
    const server = await createLocalServer((incoming, res) => res.end(JSON.stringify(incoming.headers)));
    request.defaultOptions.headers = { ...original, 'Content-Type': 'default' };
    try {
      const response = await requestAsync({
        url: server.url, retry: false, headers: { 'Content-Type': 'caller' }
      });
      strictAssert.equal(JSON.parse(response.body)['content-type'], 'caller');
    } finally {
      request.defaultOptions.headers = original;
      await server.close();
    }
  });

  it('sends a waiting async request only once when sendAsync is called twice', async () => {
    let attempts = 0;
    const server = await createLocalServer((_req, res) => { attempts++; res.end('once'); });
    try {
      const req = await requestAsync({ url: server.url, wait: true, retry: false });
      strictAssert.equal(attempts, 0);
      const [first, second] = await Promise.all([req.sendAsync(), req.sendAsync()]);
      strictAssert.equal(first, second);
      strictAssert.equal(first.body, 'once');
      strictAssert.equal(attempts, 1);
    } finally {
      await server.close();
    }
  });

  it('rejects abort before async send and send after abort without transferring', async () => {
    let attempts = 0;
    const server = await createLocalServer((_req, res) => { attempts++; res.end(); });
    try {
      const req = await requestAsync({ url: server.url, wait: true });
      const aborted = req.abortAsync();
      const sent = req.sendAsync();
      const outcomes = await Promise.allSettled([aborted, sent, req.abortAsync()]);
      for (const outcome of outcomes) {
        strictAssert.equal(outcome.status, 'rejected');
        strictAssert.equal(outcome.reason.statusCode, 499);
        strictAssert.equal(outcome.reason, outcomes[0].reason);
      }
      strictAssert.equal(attempts, 0);
      strictAssert.equal(req.sent, false);
      strictAssert.equal(req.timeoutTimer, null);
    } finally {
      await server.close();
    }
  });

  it('loads CommonJS exports and performs one local request', async () => {
    const { createRequire } = await import('node:module');
    const cjs = createRequire(import.meta.url)('../index.cjs');
    strictAssert.equal(typeof cjs.default, 'function');
    strictAssert.equal(typeof cjs.requestAsync, 'function');
    let attempts = 0;
    const server = await createLocalServer((_req, res) => { attempts++; res.end('cjs-ok'); });
    try {
      const response = await cjs.requestAsync({ url: server.url, retry: false });
      strictAssert.equal(response.statusCode, 200);
      strictAssert.equal(response.body, 'cjs-ok');
      strictAssert.equal(attempts, 1);
    } finally {
      await server.close();
    }
  });

  it('rejects invalid retry arrays, delays and top-level options', () => {
    for (const opts of [null, [], 'url']) {
      strictAssert.throws(() => request(opts), TypeError);
    }
    for (const [key, value] of [
      ['retryMethods', 'GET'], ['retryMethods', [1]],
      ['retryMaxDelay', -1], ['retryMaxDelay', Infinity],
      ['retryDelay', NaN], ['timeout', Infinity]
    ]) {
      strictAssert.throws(() => request({ url: 'http://127.0.0.1:1', wait: true, [key]: value }), {
        name: 'TypeError',
        message: key === 'retryMethods'
          ? '{opts.retryMethods} expecting an Array of method names'
          : `{opts.${key}} expecting a non-negative finite Number`
      });
    }
  });

  it('rejects unknown Curl configuration and non-boolean features', async () => {
    for (const opts of [
      { curlOptions: { NOT_AN_OPTION: 1 } },
      { curlFeatures: { NOT_A_FEATURE: true } },
      { curlFeatures: { Raw: 1 } }
    ]) {
      await strictAssert.rejects(requestAsync({ url: 'http://127.0.0.1:1', ...opts }), {
        errorCode: 4, statusCode: 500
      });
    }
  });

  it('enables and disables Curl features after preflight', async () => {
    const server = await createLocalServer((_req, res) => res.end('features'));
    try {
      const response = await requestAsync({
        url: server.url, retry: false, curlFeatures: { Raw: false, NoDataParsing: true }
      });
      strictAssert.ok(Buffer.isBuffer(response.body));
      strictAssert.equal(response.body.toString(), 'features');
    } finally {
      await server.close();
    }
  });

  it('rejects invalid pipe and response callbacks and async methods on callback API', async () => {
    const req = request({ url: 'http://127.0.0.1:1', wait: true });
    strictAssert.throws(() => req.pipe({}), TypeError);
    strictAssert.throws(() => req.onData(null), TypeError);
    strictAssert.throws(() => req.onHeader(null), TypeError);
    await strictAssert.rejects(req.sendAsync(), /non-async API/);
    await strictAssert.rejects(req.abortAsync(), /non-async API/);
    req.abort();
  });

  it('supports uri and missing URL errors through async API', async () => {
    const server = await createLocalServer((_req, res) => res.end('uri'));
    try {
      strictAssert.equal((await requestAsync({ uri: server.url, retry: false })).body, 'uri');
      await strictAssert.rejects(requestAsync({}), { errorCode: 3, statusCode: 400 });
    } finally {
      await server.close();
    }
  });
});

describe('local defensive paths', () => {
  it('sends explicit content headers, encoding, auth and keep-alive through local proxy', async () => {
    const server = await createLocalServer((incoming, res) => {
      incoming.resume();
      incoming.on('end', () => res.end(JSON.stringify(incoming.headers)));
    });
    try {
      const response = await requestAsync({
        url: server.url, proxy: true, auth: 'user:pass', keepAlive: true,
        method: 'POST', form: 'body', retry: false,
        headers: { 'Content-Type': 'text/plain', 'Content-Length': 4, 'Accept-Encoding': 'identity' }
      });
      const headers = JSON.parse(response.body);
      strictAssert.equal(headers.authorization, 'Basic dXNlcjpwYXNz');
      strictAssert.equal(headers['content-type'], 'text/plain');
      strictAssert.equal(headers['content-length'], '4');
      strictAssert.equal(headers['accept-encoding'], 'identity');
    } finally {
      await server.close();
    }
  });

  it('exposes lowercase Location from followed redirect', async () => {
    const server = await createLocalServer((incoming, res) => {
      if (incoming.url === '/') {
        res.writeHead(302, { location: '/final' });
        res.end();
      } else res.end('final');
    });
    try {
      const response = await requestAsync({ url: server.url, retry: false });
      strictAssert.equal(response.body, 'final');
      strictAssert.equal(response.headers.location, '/final');
    } finally {
      await server.close();
    }
  });

  for (const operation of ['write', 'end', 'once']) {
    it(`returns synchronous writable ${operation} exceptions`, async () => {
      const cause = new Error(`${operation} failed`);
      const sink = {
        write() { if (operation === 'write') throw cause; return true; },
        end(_chunk, _encoding, callback) { if (operation === 'end') throw cause; callback(); }
      };
      if (operation === 'once') sink.once = () => { throw cause; };
      const server = await createLocalServer((_req, res) => {
        if (operation === 'write') res.write('body');
        else res.end('body');
      });
      try {
        await strictAssert.rejects(requestAsync({ url: server.url, pipeTo: sink }), (error) => {
          strictAssert.equal(error.errorCode, 23);
          strictAssert.equal(error.cause, cause);
          return true;
        });
      } finally {
        await server.close();
      }
    });
  }

  it('logs debug requests and resolves empty raw no-storage responses', async () => {
    const logs = [];
    const originalInfo = console.info;
    console.info = (...args) => logs.push(args);
    const server = await createLocalServer((_req, res) => res.end('discarded'));
    try {
      const response = await requestAsync({ url: server.url, debug: true, noStorage: true, retry: false });
      strictAssert.ok(Buffer.isBuffer(response.body));
      strictAssert.equal(response.body.length, 0);
      strictAssert.ok(logs.some((args) => args.includes('[constructor]')));
      strictAssert.ok(logs.some((args) => args.includes('[END EVENT]')));
    } finally {
      console.info = originalInfo;
      await server.close();
    }
  });
});

describe('local cleanup gaps', () => {
  it('returns asynchronous writable final errors after transfer end', async () => {
    const { Writable } = await import('node:stream');
    const cause = new Error('final failed');
    const sink = new Writable({
      write(_chunk, _encoding, callback) { callback(); },
      final(callback) { setImmediate(() => callback(cause)); }
    });
    let streamError;
    sink.on('error', (error) => { streamError = error; });
    const server = await createLocalServer((_req, res) => res.end('body'));
    try {
      await strictAssert.rejects(requestAsync({ url: server.url, pipeTo: sink }), (error) => {
        strictAssert.equal(error.errorCode, 23);
        strictAssert.equal(error.cause, cause);
        return true;
      });
      await new Promise((resolve) => setImmediate(resolve));
      strictAssert.equal(streamError, cause);
      strictAssert.equal(sink.listenerCount('error'), 1);
    } finally {
      await server.close();
    }
  });

  it('consumes writable final errors when caller has no error listener', async () => {
    const { Writable } = await import('node:stream');
    const cause = new Error('final failed');
    const sink = new Writable({
      write(_chunk, _encoding, callback) { callback(); },
      final(callback) { setImmediate(() => callback(cause)); }
    });
    const server = await createLocalServer((_req, res) => res.end('body'));
    try {
      await strictAssert.rejects(requestAsync({ url: server.url, pipeTo: sink }), { errorCode: 23, cause });
      await new Promise((resolve) => setImmediate(resolve));
      strictAssert.equal(sink.errored, cause);
    } finally {
      await server.close();
    }
  });

  it('cleans listeners when writable destroy throws on transport error', async () => {
    const { EventEmitter } = await import('node:events');
    class Sink extends EventEmitter {
      write() { return true; }
      end(_chunk, _encoding, callback) { callback(); }
      destroy() { throw new Error('destroy failed'); }
    }
    const sink = new Sink();
    const server = await createLocalServer((incoming) => incoming.socket.destroy());
    try {
      await strictAssert.rejects(requestAsync({ url: server.url, pipeTo: sink }), { statusCode: 503 });
      strictAssert.equal(sink.listenerCount('error'), 0);
    } finally {
      await server.close();
    }
  });

  for (const exists of [true, false]) {
    it(`cleans interrupted download path when file exists ${exists}`, async () => {
      const { mkdtempSync, writeFileSync, existsSync, rmSync } = await import('node:fs');
      const { tmpdir } = await import('node:os');
      const { join } = await import('node:path');
      const directory = mkdtempSync(join(tmpdir(), 'request-local-'));
      const path = join(directory, 'partial');
      if (exists) writeFileSync(path, 'partial');
      const logs = [];
      const originalInfo = console.info;
      console.info = (...args) => logs.push(args);
      const sink = { path, write() { return true; }, end() {} };
      const server = await createLocalServer((incoming) => incoming.socket.destroy());
      try {
        await strictAssert.rejects(requestAsync({ url: server.url, pipeTo: sink }), { statusCode: 503 });
        strictAssert.equal(existsSync(path), false);
        if (!exists) strictAssert.ok(logs.some((args) => args.some((arg) => String(arg).includes('fs.unlinkSync'))));
      } finally {
        console.info = originalInfo;
        rmSync(directory, { recursive: true, force: true });
        await server.close();
      }
    });
  }

  it('settles only once when abort races deferred serialization failure', async () => {
    const circular = {};
    circular.self = circular;
    let calls = 0;
    let observed;
    const server = await createLocalServer((_req, res) => res.end());
    try {
      const req = request({ url: server.url, wait: true, form: circular }, (error) => {
        calls++;
        observed = error;
      });
      req.send();
      req.abort();
      await new Promise((resolve) => setImmediate(resolve));
      strictAssert.equal(calls, 1);
      strictAssert.equal(observed.statusCode, 499);
    } finally {
      await server.close();
    }
  });

  it('aborts deferred configuration errors before their callback', async () => {
    let calls = 0;
    const server = await createLocalServer((_req, res) => res.end());
    try {
      const req = request({ url: server.url, curlOptions: { URL: 1 } }, (error) => {
        calls++;
        strictAssert.equal(error.statusCode, 499);
      });
      req.abort();
      await new Promise((resolve) => setImmediate(resolve));
      strictAssert.equal(calls, 1);
      strictAssert.equal(req.timeoutTimer, null);
    } finally {
      await server.close();
    }
  });
});

describe('local header casing', () => {
  it('preserves differently cased caller Content-Type on wire', async () => {
    const original = request.defaultOptions.headers;
    request.defaultOptions.headers = { ...original, 'Content-Type': 'default' };
    const server = await createLocalServer((incoming, res) => res.end(JSON.stringify(incoming.rawHeaders)));
    try {
      const response = await requestAsync({
        url: server.url, retry: false, headers: { 'content-type': 'caller' }
      });
      const headers = JSON.parse(response.body);
      const index = headers.indexOf('content-type');
      strictAssert.ok(index >= 0);
      strictAssert.equal(headers[index + 1], 'caller');
      strictAssert.equal(headers.filter((name) => name.toLowerCase() === 'content-type').length, 1);
    } finally {
      request.defaultOptions.headers = original;
      await server.close();
    }
  });
});

describe('local timeout guards', () => {
  for (const retries of [0, 1]) {
    it(`clears fallback timeout guards with ${retries} retries`, async function () {
      this.timeout(3000);
      let attempts = 0;
      const sockets = new Set();
      const server = await createLocalServer((incoming) => {
        attempts++;
        sockets.add(incoming.socket);
      });
      try {
        const req = await requestAsync({
          url: server.url, wait: true, timeout: 0, retries, retryMaxDelay: 0,
          curlOptions: { TIMEOUT_MS: 0 }
        });
        await strictAssert.rejects(req.sendAsync(), { errorCode: 42, statusCode: 499 });
        strictAssert.equal(attempts, 1);
        strictAssert.equal(req.timeoutTimer, null);
        strictAssert.equal(req.retryTimer, false);
      } finally {
        for (const socket of sockets) socket.destroy();
        await server.close();
      }
    });
  }

  it('preflights negative and non-finite native timeouts', async () => {
    for (const TIMEOUT_MS of [-1, Infinity, NaN]) {
      await strictAssert.rejects(requestAsync({
        url: 'http://127.0.0.1:1', curlOptions: { TIMEOUT_MS }
      }), (error) => {
        strictAssert.equal(error.errorCode, 4);
        strictAssert.equal(error.statusCode, 500);
        strictAssert.equal(error.cause.message, 'Invalid Curl option value: TIMEOUT_MS');
        return true;
      });
    }
  });
});

describe('local option gaps', () => {
  it('adds JSON content headers when serializing object form', async () => {
    const server = await createLocalServer((incoming, res) => {
      let body = '';
      incoming.on('data', (chunk) => { body += chunk; });
      incoming.on('end', () => res.end(JSON.stringify({ body, headers: incoming.headers })));
    });
    try {
      const response = await requestAsync({ url: server.url, method: 'POST', form: { value: 1 }, retry: false });
      const received = JSON.parse(response.body);
      strictAssert.equal(received.headers['content-type'], 'application/json');
      strictAssert.equal(received.headers['content-length'], String(Buffer.byteLength(received.body)));
      strictAssert.deepEqual(JSON.parse(received.body), { value: 1 });
    } finally {
      await server.close();
    }
  });

  it('uses explicit local proxy URL', async () => {
    let path;
    const server = await createLocalServer((incoming, res) => { path = incoming.url; res.end('proxy'); });
    try {
      // Empty NOPROXY overrides environment exclusions for loopback.
      const response = await requestAsync({
        url: `${server.url}/target`, proxy: server.url, retry: false, curlOptions: { NOPROXY: '' }
      });
      strictAssert.equal(response.body, 'proxy');
      strictAssert.equal(path, `${server.url}/target`);
    } finally {
      await server.close();
    }
  });

  it('returns malformed URL errors through callback API', async () => {
    const error = await new Promise((resolve) => request({ url: 'not-a-url' }, resolve));
    strictAssert.equal(error.errorCode, 3);
    strictAssert.equal(error.statusCode, 400);
  });

  for (const key of ['curlOptions']) {
    it(`returns configuration errors if caller mutates ${key} before send`, async () => {
      let attempts = 0;
      const options = {};
      const server = await createLocalServer((_req, res) => { attempts++; res.end(); });
      try {
        const req = await requestAsync({ url: server.url, wait: true, [key]: options });
        options.URL = 1;
        await strictAssert.rejects(req.sendAsync(), { errorCode: 4, statusCode: 500 });
        strictAssert.equal(attempts, 0);
        strictAssert.equal(req.timeoutTimer, null);
      } finally {
        await server.close();
      }
    });
  }
});

describe('local TLS verification', () => {
  for (const endpoint of ['target', 'proxy']) {
    for (const check of ['peer', 'host']) {
      it(`verifies local TLS ${endpoint} ${check}`, async () => {
        const { spawn } = await import('node:child_process');
        const child = spawn(process.execPath, ['test/fixtures/tls-verification.js', endpoint, check], {
          cwd: process.cwd(), stdio: ['ignore', 'pipe', 'pipe'], timeout: 1500
        });
        const stdout = [];
        const stderr = [];
        child.stdout.on('data', (chunk) => stdout.push(chunk));
        child.stderr.on('data', (chunk) => stderr.push(chunk));
        const exitCode = await new Promise((resolve, reject) => {
          child.once('error', reject);
          child.once('exit', resolve);
        });
        strictAssert.equal(exitCode, 0, Buffer.concat(stderr).toString());
        strictAssert.equal(Buffer.concat(stdout).toString().trim(), 'tls-ok');
      });
    }
  }
});

describe('local completion guards', () => {
  it('exposes uppercase Location from followed redirect', async () => {
    const server = await createLocalServer((incoming, res) => {
      if (incoming.url === '/') {
        res.writeHead(302, { Location: '/final' });
        res.end();
      } else res.end('final');
    });
    try {
      const response = await requestAsync({ url: server.url, retry: false });
      strictAssert.equal(response.body, 'final');
      strictAssert.equal(response.headers.location, '/final');
    } finally {
      await server.close();
    }
  });

  it('returns end callback error when writable emits error during completion', async () => {
    const { EventEmitter } = await import('node:events');
    const cause = new Error('completion failed');
    class Sink extends EventEmitter {
      write() { return true; }
      end(_chunk, _encoding, callback) {
        this.emit('error', cause);
        callback(cause);
      }
    }
    const server = await createLocalServer((_req, res) => res.end('body'));
    try {
      await strictAssert.rejects(requestAsync({ url: server.url, pipeTo: new Sink() }), (error) => {
        strictAssert.equal(error.errorCode, 23);
        strictAssert.equal(error.cause, cause);
        return true;
      });
    } finally {
      await server.close();
    }
  });
});

describe('local writable validation', () => {
  it('rechecks writable methods when caller getter changes after normalization', async () => {
    let reads = 0;
    const sink = {
      get write() { return ++reads === 1 ? () => true : undefined; },
      end() {}
    };
    const server = await createLocalServer((_req, res) => res.end());
    try {
      strictAssert.throws(() => request({ url: server.url, wait: true, pipeTo: sink }), {
        name: 'TypeError', message: '[request-libcurl] {opts.pipeTo} option expected to be {stream.Writable}'
      });
      strictAssert.equal(reads, 2);
    } finally {
      await server.close();
    }
  });
});

describe('local stream failure guard', () => {
  it('ignores remaining native chunks after synchronous writable failure', async () => {
    let writes = 0;
    const cause = new Error('write failed');
    const sink = {
      write() { writes++; throw cause; },
      end() {}
    };
    const server = await createLocalServer((_req, res) => res.write(Buffer.alloc(256 * 1024)));
    try {
      await strictAssert.rejects(requestAsync({ url: server.url, pipeTo: sink }), (error) => {
        strictAssert.equal(error.errorCode, 23);
        strictAssert.equal(error.cause, cause);
        return true;
      });
      strictAssert.equal(writes, 1);
    } finally {
      await server.close();
    }
  });
});
