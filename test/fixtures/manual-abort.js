import http from 'node:http';
import request from '../../index.js';

let req;
const server = http.createServer(() => req.abort());
server.listen(0, '127.0.0.1', () => {
  const { port } = server.address();
  req = request({
    url: `http://127.0.0.1:${port}`,
    retry: false,
    timeout: 25
  }, (error) => {
    if (error.code !== 42) process.exitCode = 1;
    server.close();
  });
});
