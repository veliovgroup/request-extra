import http from 'node:http';
import { afterAll, beforeAll, expect, test } from 'bun:test';

let server;
let url;

beforeAll(async () => {
  server = http.createServer((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('bun-compatible');
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });

  const { port } = server.address();
  url = `http://127.0.0.1:${port}`;
});

afterAll(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('requestAsync performs a local request under Bun', async () => {
  const { requestAsync } = await import('../index.js');
  const response = await requestAsync({ url, retry: false });

  expect(response.statusCode).toBe(200);
  expect(response.body).toBe('bun-compatible');
});
