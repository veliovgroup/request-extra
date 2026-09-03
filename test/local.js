import { assert } from 'chai';
import strictAssert from 'node:assert/strict';
import { describe, it } from 'mocha';
import request, { requestAsync } from '../index.js';
import { createLocalServer } from './helpers/local-server.js';

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
});
