import assert from 'node:assert/strict';
import tls from 'node:tls';
import net from 'node:net';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { requestAsync } from '../../index.js';
import { createLocalServer } from '../helpers/local-server.js';

// Self-signed localhost certificate and private key used only by this fixture.
const key = "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCg+ZsFCwxgxmfJ\nhajBt1HBKX75P4t55Qq+rcpN56RgfxsyX1r6RnwoNPJE8vSs1P/HqC1PCN/fLtRD\nWqAAlr3G2I34UC2mdqCadaPFrZqxlwYiDHcryj2tXOQKnI7tlpgxWQTo2PeNBihd\nACQ9GTWsIw+wSZIumO7tt3HSl8mb6sZmKCbJL8pq0HDcqJih+DtXJ3mBWYxvCgGr\nQVnPQx02NrXYwve5p51WIoOzRPaOHu1l06snLnaA4SJ/0JXZEU0vYMev8mFJC43d\nrROflc8877ZWk8kj9fhM2GozNLCNZryKjRZk/uUr6LhG9Oho71x5ErlGiy3d/brA\nWzKy5WOFAgMBAAECggEAGQ+jFb7pl2tsHxCi/D2pCbSHIxDEix6gdJ0j4MsOaUOA\nnXAA/vPYQn4ztY5Jj1q903yYSTStfdaRj0bdoBnXw8xVFfKNmNvhFwr3i0AC1GEZ\nwFVGfFfJEGNk0U4cZlrKqOwd+o5Ew/zQbeImwihZlcoDmENr8bs3f2TO4KVm6tH7\n2J4mMNV/soEK9ZTkYDqeDViGi3GFpfoIDXUtyg5kvkmsT1XVSPvZoLYoi8LYD+h+\nXEdKlB/ajRiYcRwc3RldrflTUkIyoztQTVsUTLuOazdOhfA9Op4M109iwMIXolgB\n+uRNOb45dGcwdpFxxWlpB7vMpTMgqYLgl6QJphELAQKBgQDbeBV8NXXGXe6d9v9P\nkrPi067vVCJElvxb038dmTNl6TsSTAZFXtawBha76lKPmH5ksXExtmrMdnEX6p05\nYJ+Zugj6GCiaVUXYo8dPCZ/Gy50agQqrjqBYgI/9TcVgt6Eewg/ZYzhPKDVV+CZQ\n3uCMRBTLOpeKeuvCQuPEFImSRQKBgQC7xP/nPydfZ8RbEtQEDqo7W/BGbsBF+YhD\n4GjBdjav1Ono7NsXTI+tCpm2OTfB2BTY+bGdKL5HIniImHLQ75534nZOUYV1OJ9O\nSZg/FUZRvPpYqQfejye4zeh6I/bxLqB/xvoJS0FGPEoBsJZuN/TondmdOs06V2oi\n+w34Ay5AQQKBgQDBf9DBoIjkirD1yW41BE1h8e1Mycsk2lJJy+FJgWeVtNsGOM1W\noFV9AQFOUTzVqkfWE7SPdhwXhV4VDh/tFMniyelcR6yU1hYs+cmiYAPlTGSJl7iG\npcut/Dv3w3gA3CZMbiF3M0nUUMklsRJnPvqP8P68aD5wNAxlTIBwwwLAWQKBgQCn\n8W6VbZYQriYg8zkwm9FEoFnLFVnh/GsVksz/ZHVLVVsVm2vmbfL/6cBMDOdC+LrE\nyqhDEeMGit1WB0yCdh+9yI7aQ+3jR46tHgQPQD8R8r3TuPOx60ay83BgdnRzianC\nP7z5vRaX9GqZElGqKWBjAnRWPfa7nN3wha4byvR+QQKBgCWsRySzAHYHmC2IBrw7\n1lvA7416DLcZggm0kEQHIQ7tUVUK2BGlniFYLkDenuDEMDwJliBd39iNo8551o4F\nJWV2pz5mnDnOim6101rPfPDbx2bMzLeRKtPxvxOJMWHLIJe6+qCNZL2q++ekuQgB\nIO98T86j054PriNUPZ8x0en/\n-----END PRIVATE KEY-----\n";
const cert = "-----BEGIN CERTIFICATE-----\nMIIDCzCCAfOgAwIBAgIUHumpIX/jGSpzC6XtxtQoPwxNqAIwDQYJKoZIhvcNAQEL\nBQAwFDESMBAGA1UEAwwJbG9jYWxob3N0MCAXDTI2MDkzMDE5MzYzNVoYDzIxMjYw\nOTA2MTkzNjM1WjAUMRIwEAYDVQQDDAlsb2NhbGhvc3QwggEiMA0GCSqGSIb3DQEB\nAQUAA4IBDwAwggEKAoIBAQCg+ZsFCwxgxmfJhajBt1HBKX75P4t55Qq+rcpN56Rg\nfxsyX1r6RnwoNPJE8vSs1P/HqC1PCN/fLtRDWqAAlr3G2I34UC2mdqCadaPFrZqx\nlwYiDHcryj2tXOQKnI7tlpgxWQTo2PeNBihdACQ9GTWsIw+wSZIumO7tt3HSl8mb\n6sZmKCbJL8pq0HDcqJih+DtXJ3mBWYxvCgGrQVnPQx02NrXYwve5p51WIoOzRPaO\nHu1l06snLnaA4SJ/0JXZEU0vYMev8mFJC43drROflc8877ZWk8kj9fhM2GozNLCN\nZryKjRZk/uUr6LhG9Oho71x5ErlGiy3d/brAWzKy5WOFAgMBAAGjUzBRMB0GA1Ud\nDgQWBBQ1Zg/sYsYXfgUO31tlC0+P3VJYDjAfBgNVHSMEGDAWgBQ1Zg/sYsYXfgUO\n31tlC0+P3VJYDjAPBgNVHRMBAf8EBTADAQH/MA0GCSqGSIb3DQEBCwUAA4IBAQCY\nA6rhkZJQiX/B1NfWdU9jYNvk03BcvNCx1tTYxpVEpMgzp5rzcEPAf85eg0YX4PuR\nNslmgON4guEPhKRs001HJh4oXpd5oNMqYhKoYtY4wug5OLbHW6dN41C3L+R3BJUk\nBhlv4on+U0C+mdMPVC8atT0MvoAoLIS/AHW/UH8KDeaSlzkhAD00I3nuRgWNjmeL\n902oYF84kvCQggOE7zrjDD1p7abWn/OLztW7nJrjvdz3G4ePyt7YMOFiOksO86AP\nmRAan2pHp2q7kV6uH2SETLzHvjOq4aF846t697Z+UlcTdR160nBOscLPGsWJcYdb\nQ0LdV+uLB4kT7+/nTXKs\n-----END CERTIFICATE-----\n";

const [endpoint, check] = process.argv.slice(2);
const directory = mkdtempSync(join(tmpdir(), 'request-tls-'));
const ca = join(directory, 'ca.pem');
writeFileSync(ca, cert);
const sockets = new Set();
const track = (socket) => {
  sockets.add(socket);
  socket.on('error', () => {});
  socket.on('close', () => sockets.delete(socket));
  return socket;
};
const listen = async (server) => {
  server.on('tlsClientError', () => {});
  server.on('connection', track);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return server.address().port;
};
const backend = await createLocalServer((_req, res) => res.end('tls-ok'));
const backendPort = Number(new URL(backend.url).port);
const target = tls.createServer({ key, cert }, (socket) => {
  const upstream = track(net.connect(backendPort, '127.0.0.1'));
  socket.pipe(upstream).pipe(socket);
  socket.on('close', () => upstream.destroy());
  upstream.on('close', () => socket.destroy());
});
const targetPort = await listen(target);
let proxy;
try {
  const options = { url: `https://localhost:${targetPort}`, retry: false, curlOptions: { NOPROXY: '*' } };
  if (endpoint === 'target') {
    options.rejectUnauthorized = true;
    if (check === 'host') {
      options.url = `https://127.0.0.1:${targetPort}`;
      options.curlOptions = { NOPROXY: '*', CAINFO_BLOB: null, CAINFO: ca };
    }
  } else {
    proxy = tls.createServer({ key, cert }, (socket) => {
      let request = Buffer.alloc(0);
      const onData = (chunk) => {
        request = Buffer.concat([request, chunk]);
        const end = request.indexOf('\r\n\r\n');
        if (end < 0) return;
        socket.removeListener('data', onData);
        const upstream = track(net.connect(targetPort, '127.0.0.1', () => {
          socket.write('HTTP/1.1 200 Connection established\r\n\r\n');
          const remaining = request.subarray(end + 4);
          if (remaining.length) upstream.write(remaining);
          socket.pipe(upstream).pipe(socket);
        }));
        socket.on('close', () => upstream.destroy());
        upstream.on('close', () => socket.destroy());
      };
      socket.on('data', onData);
    });
    const proxyPort = await listen(proxy);
    options.proxy = `https://${check === 'host' ? '127.0.0.1' : 'localhost'}:${proxyPort}`;
    options.rejectUnauthorizedProxy = true;
    options.curlOptions = { NOPROXY: '', ...(check === 'host' ? { PROXY_CAINFO: ca } : {}) };
  }
  await assert.rejects(requestAsync(options), { errorCode: 60, statusCode: 526 });
  // Disabling verification must make the same local endpoint usable.
  options.rejectUnauthorized = false;
  options.rejectUnauthorizedProxy = false;
  const response = await requestAsync(options);
  assert.equal(response.body, 'tls-ok');
  console.log('tls-ok');
} finally {
  for (const socket of sockets) socket.destroy();
  await Promise.all([
    new Promise((resolve) => target.close(resolve)),
    proxy ? new Promise((resolve) => proxy.close(resolve)) : Promise.resolve(),
    backend.close()
  ]);
  rmSync(directory, { recursive: true, force: true });
}
