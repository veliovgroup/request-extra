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
});
