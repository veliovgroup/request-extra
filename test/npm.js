const fs      = require('fs');
const http    = require('http');
const path    = require('path');
const request = require('../index.js');
const querystring = require('querystring');

const { assert }       = require('chai');
const { it, describe } = require('mocha');

const PORT = parseInt(process.env.PORT || 3003);
const DEBUG = (process.env.DEBUG === 'true') ? true : false;
const TEST_URL = `http://127.0.0.1:${PORT}`;

request.defaultOptions.debug = DEBUG;

const server = http.createServer(function (req, res) {
  let data = Buffer.from('');

  req.on('data', (chunkAsBuffer) => {
    data = Buffer.concat([data, chunkAsBuffer]);
  });

  req.on('end', () => {
    if (req.method === 'GET') {
      if (req.url.endsWith('text-plain')) {
        res.writeHead(200, {'Content-Type': 'text/plain; charset=UTF-8', Connection: 'close'});
        res.end('plain text response');
      } else if (req.url.endsWith('text-html')) {
        res.writeHead(200, {'Content-Type': 'text/html; charset=UTF-8', Connection: 'close'});
        res.end('<html><head></head><body></body></html>');
      } else if (req.url.endsWith('json')) {
        res.writeHead(200, {'Content-Type': 'application/json; charset=UTF-8', Connection: 'close'});
        res.end(JSON.stringify({key: 'value'}));
      } else if (req.url.endsWith('custom-header')) {
        res.writeHead(200, {'Content-Type': 'application/json; charset=UTF-8', Connection: 'close', 'x-custom-header': req.headers['x-custom-header']});
        res.end(JSON.stringify({'x-custom-header': req.headers['x-custom-header']}));
      } else if (req.url.endsWith('rfc2616.pdf')) {
        res.writeHead(200, {
          'Content-Type': 'application/pdf',
          'Accept-Ranges': 'bytes',
          'Content-Disposition': `attachment; filename="rfc2616.pdf"; filename*=UTF-8''rfc2616.pdf; charset=UTF-8`,
          Connection: 'close'
        });
        fs.createReadStream(path.resolve('.') + '/test/rfc2616.pdf').pipe(res);
      } else if (req.url.endsWith('bb.jpg')) {
        res.writeHead(200, {
          'Content-Type': 'image/jpeg',
          'Accept-Ranges': 'bytes',
          'Content-Disposition': `attachment; filename="bb.jpg"; filename*=UTF-8''bb.jpg; charset=UTF-8`,
          Connection: 'close'
        });
        fs.createReadStream(path.resolve('.') + '/test/bb.jpg').pipe(res);
      } else if (req.url.endsWith('no-response')) {
        // nothing happens here
      } else if (req.url.endsWith('no-response-timeout')) {
        req.setTimeout(1024);
      } else if (req.url.endsWith('destroy')) {
        req.destroy(400);
      } else {
        res.writeHead(204);
        res.end();
      }
    } else if (req.method === 'POST') {
      if (req.url.endsWith('plain-text')) {
        res.writeHead(200, {'Content-Type': 'application/json; charset=UTF-8', Connection: 'close'});
        const obj = {
          headers: req.headers,
          data: data.toString('utf8')
        };
        res.end(JSON.stringify(obj));
      } else if (req.url.endsWith('upload')) {
        res.writeHead(200, {'Content-Type': 'application/json; charset=UTF-8', Connection: 'close'});
        res.end(JSON.stringify({messageLength: data.length, headers: req.headers}));
      } else {
        res.writeHead(204);
        res.end();
      }
    }
  });
}).listen(PORT);
server.keepAliveTimeout = 0;

describe('LibCurlRequest', function () {
  this.slow(120000);
  this.timeout(180000);

  describe('request Object', () => {
    it('request is a Function', (done) => {
      assert.isFunction(request, 'request is a Function');
      done();
    });
  });

  describe('BASICS', () => {
    it('.abort()', (done) => {
      const req = request({
        url: 'http://яндекс.рф'
      }, (error, resp) => {
        assert.equal(resp, void 0, '`resp` is undefined');
        assert.isObject(error, 'error isObject');
        assert.equal(error.code, 42, 'error.code is 42');
        assert.equal(error.errorCode, 42, 'error.errorCode is 42');
        assert.equal(error.status, 499, 'error.status is 499');
        assert.equal(error.statusCode, 499, 'error.statusCode is 499');
        assert.equal(error.message, '499: Client Closed Request', 'error.message is correctly set');
        done();
      });

      assert.equal(req.finished, false, '.finished is false');
      process.nextTick(() => {
        req.abort();
        assert.equal(req.finished, true, '.finished is true');
      });
    });

    it('GET/HTTP/IP-ADDRESS', (done) => {
      request({
        url: 'http://1.1.1.1'
      }, (error, resp) => {
        assert.isOk(true, 'got response');
        assert.isUndefined(error, 'no error presented');
        assert.equal(resp.statusCode, 200, 'statusCode: 200');
        assert.equal(resp.status, 200, 'status: 200');
        assert.isObject(resp.headers, 'Headers Object is presented');
        assert.equal(resp.headers['content-type'], 'text/html', 'Correct content-type header');
        assert.equal(resp.headers.location, 'https://1.1.1.1/', 'Correct location header');
        done();
      });
    });

    it('GET/HTTPS/IP-ADDRESS', (done) => {
      request({
        url: 'https://1.1.1.1'
      }, (error, resp) => {
        assert.isOk(true, 'got response');
        assert.isUndefined(error, 'no error presented');
        assert.equal(resp.statusCode, 200, 'statusCode: 200');
        assert.equal(resp.status, 200, 'status: 200');
        assert.isObject(resp.headers, 'Headers Object is presented');
        assert.equal(resp.headers['content-type'], 'text/html', 'Correct content-type header');
        done();
      });
    });

    it('DELETE/HTTP/httpbin', (done) => {
      request({
        method: 'DELETE',
        url: 'http://httpbin.org/delete'
      }, (error, resp) => {
        assert.isOk(true, 'got response');
        assert.isUndefined(error, 'no error presented');
        const body = JSON.parse(resp.body);
        assert.isObject(body, 'Response body JSON is parsed to Object');
        assert.equal(body.headers.Accept, '*/*', 'Body isn\'t empty');
        assert.equal(resp.statusCode, 200, 'statusCode: 200');
        assert.equal(resp.status, 200, 'status: 200');
        assert.isObject(resp.headers, 'Headers Object is presented');
        assert.equal(resp.headers['content-type'], 'application/json', 'Correct content-type header');
        done();
      });
    });

    it('DELETE/HTTPS/httpbin', (done) => {
      request({
        method: 'DELETE',
        url: 'https://httpbin.org/delete'
      }, (error, resp) => {
        assert.isOk(true, 'got response');
        assert.isUndefined(error, 'no error presented');
        const body = JSON.parse(resp.body);
        assert.isObject(body, 'Response body JSON is parsed to Object');
        assert.equal(body.headers.Accept, '*/*', 'Body isn\'t empty');
        assert.equal(resp.statusCode, 200, 'statusCode: 200');
        assert.equal(resp.status, 200, 'status: 200');
        assert.isObject(resp.headers, 'Headers Object is presented');
        assert.equal(resp.headers['content-type'], 'application/json', 'Correct content-type header');
        done();
      });
    });

    it('GET/HTTP/httpbin', (done) => {
      request({
        method: 'GET',
        url: 'http://httpbin.org/get'
      }, (error, resp) => {
        assert.isOk(true, 'got response');
        assert.isUndefined(error, 'no error presented');
        const body = JSON.parse(resp.body);
        assert.isObject(body, 'Response body JSON is parsed to Object');
        assert.equal(body.headers.Accept, '*/*', 'Body isn\'t empty');
        assert.equal(resp.statusCode, 200, 'statusCode: 200');
        assert.equal(resp.status, 200, 'status: 200');
        assert.isObject(resp.headers, 'Headers Object is presented');
        assert.equal(resp.headers['content-type'], 'application/json', 'Correct content-type header');
        done();
      });
    });

    it('GET/HTTPS/httpbin', (done) => {
      request({
        method: 'GET',
        url: 'https://httpbin.org/get'
      }, (error, resp) => {
        assert.isOk(true, 'got response');
        assert.isUndefined(error, 'no error presented');
        const body = JSON.parse(resp.body);
        assert.isObject(body, 'Response body JSON is parsed to Object');
        assert.equal(body.headers.Accept, '*/*', 'Body isn\'t empty');
        assert.equal(resp.statusCode, 200, 'statusCode: 200');
        assert.equal(resp.status, 200, 'status: 200');
        assert.isObject(resp.headers, 'Headers Object is presented');
        assert.equal(resp.headers['content-type'], 'application/json', 'Correct content-type header');
        done();
      });
    });

    it('PATCH/HTTP/httpbin', (done) => {
      request({
        method: 'PATCH',
        url: 'http://httpbin.org/patch'
      }, (error, resp) => {
        assert.isOk(true, 'got response');
        assert.isUndefined(error, 'no error presented');
        const body = JSON.parse(resp.body);
        assert.isObject(body, 'Response body JSON is parsed to Object');
        assert.equal(body.headers.Accept, '*/*', 'Body isn\'t empty');
        assert.equal(resp.statusCode, 200, 'statusCode: 200');
        assert.equal(resp.status, 200, 'status: 200');
        assert.isObject(resp.headers, 'Headers Object is presented');
        assert.equal(resp.headers['content-type'], 'application/json', 'Correct content-type header');
        done();
      });
    });

    it('PATCH/HTTPS/httpbin', (done) => {
      request({
        method: 'PATCH',
        url: 'https://httpbin.org/patch'
      }, (error, resp) => {
        assert.isOk(true, 'got response');
        assert.isUndefined(error, 'no error presented');
        const body = JSON.parse(resp.body);
        assert.isObject(body, 'Response body JSON is parsed to Object');
        assert.equal(body.headers.Accept, '*/*', 'Body isn\'t empty');
        assert.equal(resp.statusCode, 200, 'statusCode: 200');
        assert.equal(resp.status, 200, 'status: 200');
        assert.isObject(resp.headers, 'Headers Object is presented');
        assert.equal(resp.headers['content-type'], 'application/json', 'Correct content-type header');
        done();
      });
    });

    const httpbinPostForm = { sampleKey: 'sampleValue' };
    it('POST/HTTP/httpbin/urlencoded', (done) => {
      request({
        method: 'POST',
        url: 'http://httpbin.org/post',
        form: querystring.stringify(httpbinPostForm)
      }, (error, resp) => {
        assert.isOk(true, 'got response');
        assert.isUndefined(error, 'no error presented');
        const body = JSON.parse(resp.body);
        assert.isObject(body, 'Response body JSON is parsed to Object');
        assert.equal(body.headers.Accept, '*/*', 'Accept.header');
        assert.equal(body.headers['Content-Type'], 'application/x-www-form-urlencoded', 'Content-Type header');
        assert.deepEqual(body.form, httpbinPostForm, 'Form received and returned as it is');
        assert.equal(resp.statusCode, 200, 'statusCode: 200');
        assert.equal(resp.status, 200, 'status: 200');
        assert.isObject(resp.headers, 'Headers Object is presented');
        assert.equal(resp.headers['content-type'], 'application/json', 'Correct content-type header');
        done();
      });
    });

    it('POST/HTTPS/httpbin/urlencoded', (done) => {
      request({
        method: 'POST',
        url: 'https://httpbin.org/post',
        form: querystring.stringify(httpbinPostForm)
      }, (error, resp) => {
        assert.isOk(true, 'got response');
        assert.isUndefined(error, 'no error presented');
        const body = JSON.parse(resp.body);
        assert.isObject(body, 'Response body JSON is parsed to Object');
        assert.equal(body.headers.Accept, '*/*', 'Accept.header');
        assert.equal(body.headers['Content-Type'], 'application/x-www-form-urlencoded', 'Content-Type header');
        assert.deepEqual(body.form, httpbinPostForm, 'Form received and returned as it is');
        assert.equal(resp.statusCode, 200, 'statusCode: 200');
        assert.equal(resp.status, 200, 'status: 200');
        assert.isObject(resp.headers, 'Headers Object is presented');
        assert.equal(resp.headers['content-type'], 'application/json', 'Correct content-type header');
        done();
      });
    });

    it('POST/HTTP/httpbin/json', (done) => {
      request({
        method: 'POST',
        url: 'http://httpbin.org/post',
        form: httpbinPostForm
      }, (error, resp) => {
        assert.isOk(true, 'got response');
        assert.isUndefined(error, 'no error presented');
        const body = JSON.parse(resp.body);
        assert.isObject(body, 'Response body JSON is parsed to Object');
        assert.equal(body.headers.Accept, '*/*', 'Accept.header');
        assert.equal(body.headers['Content-Type'], 'application/json', 'Content-Type header');
        assert.deepEqual(JSON.parse(body.data), httpbinPostForm, 'Form received and returned as it is');
        assert.deepEqual(body.json, httpbinPostForm, 'Form received and returned as it is');
        assert.equal(resp.statusCode, 200, 'statusCode: 200');
        assert.equal(resp.status, 200, 'status: 200');
        assert.isObject(resp.headers, 'Headers Object is presented');
        assert.equal(resp.headers['content-type'], 'application/json', 'Correct content-type header');
        done();
      });
    });

    it('POST/HTTPS/httpbin/json', (done) => {
      request({
        method: 'POST',
        url: 'https://httpbin.org/post',
        form: httpbinPostForm
      }, (error, resp) => {
        assert.isOk(true, 'got response');
        assert.isUndefined(error, 'no error presented');
        const body = JSON.parse(resp.body);
        assert.isObject(body, 'Response body JSON is parsed to Object');
        assert.equal(body.headers.Accept, '*/*', 'Accept.header');
        assert.equal(body.headers['Content-Type'], 'application/json', 'Content-Type header');
        assert.deepEqual(JSON.parse(body.data), httpbinPostForm, 'Form received and returned as it is');
        assert.deepEqual(body.json, httpbinPostForm, 'Form received and returned as it is');
        assert.equal(resp.statusCode, 200, 'statusCode: 200');
        assert.equal(resp.status, 200, 'status: 200');
        assert.isObject(resp.headers, 'Headers Object is presented');
        assert.equal(resp.headers['content-type'], 'application/json', 'Correct content-type header');
        done();
      });
    });

    it('POST/HTTP/httpbin/text/plain', (done) => {
      request({
        method: 'POST',
        url: 'http://httpbin.org/post',
        form: httpbinPostForm,
        headers: {
          'Content-Type': 'text/plain'
        }
      }, (error, resp) => {
        assert.isOk(true, 'got response');
        assert.isUndefined(error, 'no error presented');
        const body = JSON.parse(resp.body);
        assert.isObject(body, 'Response body JSON is parsed to Object');
        assert.equal(body.headers.Accept, '*/*', 'Accept.header');
        assert.equal(body.headers['Content-Type'], 'text/plain', 'Content-Type header');
        assert.deepEqual(JSON.parse(body.data), httpbinPostForm, 'Form received and returned as it is');
        assert.deepEqual(body.json, httpbinPostForm, 'Form received and returned as it is');
        assert.equal(resp.statusCode, 200, 'statusCode: 200');
        assert.equal(resp.status, 200, 'status: 200');
        assert.isObject(resp.headers, 'Headers Object is presented');
        assert.equal(resp.headers['content-type'], 'application/json', 'Correct content-type header');
        done();
      });
    });

    it('POST/HTTPS/httpbin/text/plain', (done) => {
      request({
        method: 'POST',
        url: 'https://httpbin.org/post',
        form: httpbinPostForm,
        headers: {
          'Content-Type': 'text/plain'
        }
      }, (error, resp) => {
        assert.isOk(true, 'got response');
        assert.isUndefined(error, 'no error presented');
        const body = JSON.parse(resp.body);
        assert.isObject(body, 'Response body JSON is parsed to Object');
        assert.equal(body.headers.Accept, '*/*', 'Accept.header');
        assert.equal(body.headers['Content-Type'], 'text/plain', 'Content-Type header');
        assert.deepEqual(JSON.parse(body.data), httpbinPostForm, 'Form received and returned as it is');
        assert.deepEqual(body.json, httpbinPostForm, 'Form received and returned as it is');
        assert.equal(resp.statusCode, 200, 'statusCode: 200');
        assert.equal(resp.status, 200, 'status: 200');
        assert.isObject(resp.headers, 'Headers Object is presented');
        assert.equal(resp.headers['content-type'], 'application/json', 'Correct content-type header');
        done();
      });
    });

    const httpbinPutForm = { samplePutKey: 'samplePutValue' };
    it('PUT/HTTP/httpbin/urlencoded', (done) => {
      request({
        method: 'PUT',
        url: 'http://httpbin.org/put',
        form: querystring.stringify(httpbinPutForm)
      }, (error, resp) => {
        assert.isOk(true, 'got response');
        assert.isUndefined(error, 'no error presented');
        const body = JSON.parse(resp.body);
        assert.isObject(body, 'Response body JSON is parsed to Object');
        assert.equal(body.headers.Accept, '*/*', 'Accept.header');
        assert.equal(body.headers['Content-Type'], 'application/x-www-form-urlencoded', 'Content-Type header');
        assert.deepEqual(body.form, httpbinPutForm, 'Form received and returned as it is');
        assert.equal(resp.statusCode, 200, 'statusCode: 200');
        assert.equal(resp.status, 200, 'status: 200');
        assert.isObject(resp.headers, 'Headers Object is presented');
        assert.equal(resp.headers['content-type'], 'application/json', 'Correct content-type header');
        done();
      });
    });

    it('PUT/HTTPS/httpbin/urlencoded', (done) => {
      request({
        method: 'PUT',
        url: 'https://httpbin.org/put',
        form: querystring.stringify(httpbinPutForm)
      }, (error, resp) => {
        assert.isOk(true, 'got response');
        assert.isUndefined(error, 'no error presented');
        const body = JSON.parse(resp.body);
        assert.isObject(body, 'Response body JSON is parsed to Object');
        assert.equal(body.headers.Accept, '*/*', 'Accept.header');
        assert.equal(body.headers['Content-Type'], 'application/x-www-form-urlencoded', 'Content-Type header');
        assert.deepEqual(body.form, httpbinPutForm, 'Form received and returned as it is');
        assert.equal(resp.statusCode, 200, 'statusCode: 200');
        assert.equal(resp.status, 200, 'status: 200');
        assert.isObject(resp.headers, 'Headers Object is presented');
        assert.equal(resp.headers['content-type'], 'application/json', 'Correct content-type header');
        done();
      });
    });

    it('PUT/HTTP/httpbin/json', (done) => {
      request({
        method: 'PUT',
        url: 'http://httpbin.org/put',
        form: httpbinPutForm,
      }, (error, resp) => {
        assert.isOk(true, 'got response');
        assert.isUndefined(error, 'no error presented');
        const body = JSON.parse(resp.body);
        assert.isObject(body, 'Response body JSON is parsed to Object');
        assert.equal(body.headers.Accept, '*/*', 'Accept.header');
        assert.equal(body.headers['Content-Type'], 'application/json', 'Content-Type header');
        assert.deepEqual(JSON.parse(body.data), httpbinPutForm, 'Form received and returned as it is');
        assert.deepEqual(body.json, httpbinPutForm, 'Form received and returned as it is');
        assert.equal(resp.statusCode, 200, 'statusCode: 200');
        assert.equal(resp.status, 200, 'status: 200');
        assert.isObject(resp.headers, 'Headers Object is presented');
        assert.equal(resp.headers['content-type'], 'application/json', 'Correct content-type header');
        done();
      });
    });

    it('PUT/HTTPS/httpbin/json', (done) => {
      request({
        method: 'PUT',
        url: 'https://httpbin.org/put',
        form: httpbinPutForm,
      }, (error, resp) => {
        assert.isOk(true, 'got response');
        assert.isUndefined(error, 'no error presented');
        const body = JSON.parse(resp.body);
        assert.isObject(body, 'Response body JSON is parsed to Object');
        assert.equal(body.headers.Accept, '*/*', 'Accept.header');
        assert.equal(body.headers['Content-Type'], 'application/json', 'Content-Type header');
        assert.deepEqual(JSON.parse(body.data), httpbinPutForm, 'Form received and returned as it is');
        assert.deepEqual(body.json, httpbinPutForm, 'Form received and returned as it is');
        assert.equal(resp.statusCode, 200, 'statusCode: 200');
        assert.equal(resp.status, 200, 'status: 200');
        assert.isObject(resp.headers, 'Headers Object is presented');
        assert.equal(resp.headers['content-type'], 'application/json', 'Correct content-type header');
        done();
      });
    });

    it('PUT/HTTP/httpbin/text/plain', (done) => {
      request({
        method: 'PUT',
        url: 'http://httpbin.org/put',
        form: httpbinPutForm,
        headers: {
          'Content-Type': 'text/plain'
        }
      }, (error, resp) => {
        assert.isOk(true, 'got response');
        assert.isUndefined(error, 'no error presented');
        const body = JSON.parse(resp.body);
        assert.isObject(body, 'Response body JSON is parsed to Object');
        assert.equal(body.headers.Accept, '*/*', 'Accept.header');
        assert.equal(body.headers['Content-Type'], 'text/plain', 'Content-Type header');
        assert.deepEqual(JSON.parse(body.data), httpbinPutForm, 'Form received and returned as it is');
        assert.deepEqual(body.json, httpbinPutForm, 'Form received and returned as it is');
        assert.equal(resp.statusCode, 200, 'statusCode: 200');
        assert.equal(resp.status, 200, 'status: 200');
        assert.isObject(resp.headers, 'Headers Object is presented');
        assert.equal(resp.headers['content-type'], 'application/json', 'Correct content-type header');
        done();
      });
    });

    it('PUT/HTTPS/httpbin/text/plain', (done) => {
      request({
        method: 'PUT',
        url: 'https://httpbin.org/put',
        form: httpbinPutForm,
        headers: {
          'Content-Type': 'text/plain'
        }
      }, (error, resp) => {
        assert.isOk(true, 'got response');
        assert.isUndefined(error, 'no error presented');
        const body = JSON.parse(resp.body);
        assert.isObject(body, 'Response body JSON is parsed to Object');
        assert.equal(body.headers.Accept, '*/*', 'Accept.header');
        assert.equal(body.headers['Content-Type'], 'text/plain', 'Content-Type header');
        assert.deepEqual(JSON.parse(body.data), httpbinPutForm, 'Form received and returned as it is');
        assert.deepEqual(body.json, httpbinPutForm, 'Form received and returned as it is');
        assert.equal(resp.statusCode, 200, 'statusCode: 200');
        assert.equal(resp.status, 200, 'status: 200');
        assert.isObject(resp.headers, 'Headers Object is presented');
        assert.equal(resp.headers['content-type'], 'application/json', 'Correct content-type header');
        done();
      });
    });

    it('GET/HTTP/httpbin/basic-auth', (done) => {
      request({
        method: 'GET',
        url: 'http://httpbin.org/basic-auth/uuuussssrrrr/ppppwwwwdddd',
        auth: 'uuuussssrrrr:ppppwwwwdddd'
      }, (error, resp) => {
        assert.isOk(true, 'got response');
        assert.isUndefined(error, 'no error presented');
        const body = JSON.parse(resp.body);
        assert.isObject(body, 'Response body JSON is parsed to Object');
        assert.isOk(body.authenticated, 'Successfully authenticated');
        assert.equal(body.user, 'uuuussssrrrr', 'returned correct username');
        assert.equal(resp.statusCode, 200, 'statusCode: 200');
        assert.equal(resp.status, 200, 'status: 200');
        assert.isObject(resp.headers, 'Headers Object is presented');
        assert.equal(resp.headers['content-type'], 'application/json', 'Correct content-type header');
        done();
      });
    });

    it('GET/HTTPS/httpbin/basic-auth', (done) => {
      request({
        method: 'GET',
        url: 'https://httpbin.org/basic-auth/uuuussssrrrr/ppppwwwwdddd',
        auth: 'uuuussssrrrr:ppppwwwwdddd'
      }, (error, resp) => {
        assert.isOk(true, 'got response');
        assert.isUndefined(error, 'no error presented');
        const body = JSON.parse(resp.body);
        assert.isObject(body, 'Response body JSON is parsed to Object');
        assert.isOk(body.authenticated, 'Successfully authenticated');
        assert.equal(body.user, 'uuuussssrrrr', 'returned correct username');
        assert.equal(resp.statusCode, 200, 'statusCode: 200');
        assert.equal(resp.status, 200, 'status: 200');
        assert.isObject(resp.headers, 'Headers Object is presented');
        assert.equal(resp.headers['content-type'], 'application/json', 'Correct content-type header');
        done();
      });
    });

    it('GET/HTTP/httpbin/hidden-basic-auth', (done) => {
      request({
        method: 'GET',
        url: 'http://httpbin.org/hidden-basic-auth/uuuussssrrrr/ppppwwwwdddd',
        auth: 'uuuussssrrrr:ppppwwwwdddd'
      }, (error, resp) => {
        assert.isOk(true, 'got response');
        assert.isUndefined(error, 'no error presented');
        const body = JSON.parse(resp.body);
        assert.isObject(body, 'Response body JSON is parsed to Object');
        assert.isOk(body.authenticated, 'Successfully authenticated');
        assert.equal(body.user, 'uuuussssrrrr', 'returned correct username');
        assert.equal(resp.statusCode, 200, 'statusCode: 200');
        assert.equal(resp.status, 200, 'status: 200');
        assert.isObject(resp.headers, 'Headers Object is presented');
        assert.equal(resp.headers['content-type'], 'application/json', 'Correct content-type header');
        done();
      });
    });

    it('GET/HTTPS/httpbin/hidden-basic-auth', (done) => {
      request({
        method: 'GET',
        url: 'https://httpbin.org/hidden-basic-auth/uuuussssrrrr/ppppwwwwdddd',
        auth: 'uuuussssrrrr:ppppwwwwdddd'
      }, (error, resp) => {
        assert.isOk(true, 'got response');
        assert.isUndefined(error, 'no error presented');
        const body = JSON.parse(resp.body);
        assert.isObject(body, 'Response body JSON is parsed to Object');
        assert.isOk(body.authenticated, 'Successfully authenticated');
        assert.equal(body.user, 'uuuussssrrrr', 'returned correct username');
        assert.equal(resp.statusCode, 200, 'statusCode: 200');
        assert.equal(resp.status, 200, 'status: 200');
        assert.isObject(resp.headers, 'Headers Object is presented');
        assert.equal(resp.headers['content-type'], 'application/json', 'Correct content-type header');
        done();
      });
    });

    it('GET/HTTP/httpbin/brotli', (done) => {
      request({
        method: 'GET',
        url: 'http://httpbin.org/brotli'
      }, (error, resp) => {
        assert.isOk(true, 'got response');
        assert.isUndefined(error, 'no error presented');
        try {
          const body = JSON.parse(resp.body);
          assert.isObject(body, 'Response body JSON is parsed to Object');
          assert.isOk(body.brotli, 'Is brotli');
          assert.equal(resp.statusCode, 200, 'statusCode: 200');
          assert.equal(resp.status, 200, 'status: 200');
          assert.isObject(resp.headers, 'Headers Object is presented');
          assert.equal(resp.headers['content-type'], 'application/json', 'Correct content-type header');
        } catch (e) {
          console.error('Your cURL module doesn\'t support "brotli" compression');
        }
        done();
      });
    });

    it('GET/HTTPS/httpbin/brotli', (done) => {
      request({
        method: 'GET',
        url: 'https://httpbin.org/brotli'
      }, (error, resp) => {
        assert.isOk(true, 'got response');
        assert.isUndefined(error, 'no error presented');
        try {
          const body = JSON.parse(resp.body);
          assert.isObject(body, 'Response body JSON is parsed to Object');
          assert.isOk(body.brotli, 'Is brotli');
          assert.equal(resp.statusCode, 200, 'statusCode: 200');
          assert.equal(resp.status, 200, 'status: 200');
          assert.isObject(resp.headers, 'Headers Object is presented');
          assert.equal(resp.headers['content-type'], 'application/json', 'Correct content-type header');
        } catch (e) {
          console.error('Your cURL module doesn\'t support "brotli" compression');
        }
        done();
      });
    });

    it('GET/HTTP/httpbin/deflate', (done) => {
      request({
        method: 'GET',
        url: 'http://httpbin.org/deflate'
      }, (error, resp) => {
        assert.isOk(true, 'got response');
        assert.isUndefined(error, 'no error presented');
        const body = JSON.parse(resp.body);
        assert.isObject(body, 'Response body JSON is parsed to Object');
        assert.isOk(body.deflated, 'Is deflate');
        assert.equal(resp.statusCode, 200, 'statusCode: 200');
        assert.equal(resp.status, 200, 'status: 200');
        assert.isObject(resp.headers, 'Headers Object is presented');
        assert.equal(resp.headers['content-type'], 'application/json', 'Correct content-type header');
        done();
      });
    });

    it('GET/HTTPS/httpbin/deflate', (done) => {
      request({
        method: 'GET',
        url: 'https://httpbin.org/deflate'
      }, (error, resp) => {
        assert.isOk(true, 'got response');
        assert.isUndefined(error, 'no error presented');
        const body = JSON.parse(resp.body);
        assert.isObject(body, 'Response body JSON is parsed to Object');
        assert.isOk(body.deflated, 'Is deflate');
        assert.equal(resp.statusCode, 200, 'statusCode: 200');
        assert.equal(resp.status, 200, 'status: 200');
        assert.isObject(resp.headers, 'Headers Object is presented');
        assert.equal(resp.headers['content-type'], 'application/json', 'Correct content-type header');
        done();
      });
    });

    it('GET/HTTP/httpbin/gzip', (done) => {
      request({
        method: 'GET',
        url: 'http://httpbin.org/gzip'
      }, (error, resp) => {
        assert.isOk(true, 'got response');
        assert.isUndefined(error, 'no error presented');
        const body = JSON.parse(resp.body);
        assert.isObject(body, 'Response body JSON is parsed to Object');
        assert.isOk(body.gzipped, 'Is gzip');
        assert.equal(resp.statusCode, 200, 'statusCode: 200');
        assert.equal(resp.status, 200, 'status: 200');
        assert.isObject(resp.headers, 'Headers Object is presented');
        assert.equal(resp.headers['content-type'], 'application/json', 'Correct content-type header');
        done();
      });
    });

    it('GET/HTTPS/httpbin/gzip', (done) => {
      request({
        method: 'GET',
        url: 'https://httpbin.org/gzip'
      }, (error, resp) => {
        assert.isOk(true, 'got response');
        assert.isUndefined(error, 'no error presented');
        const body = JSON.parse(resp.body);
        assert.isObject(body, 'Response body JSON is parsed to Object');
        assert.isOk(body.gzipped, 'Is gzip');
        assert.equal(resp.statusCode, 200, 'statusCode: 200');
        assert.equal(resp.status, 200, 'status: 200');
        assert.isObject(resp.headers, 'Headers Object is presented');
        assert.equal(resp.headers['content-type'], 'application/json', 'Correct content-type header');
        done();
      });
    });

    it('GET/HTTP/httpbin/absolute-redirect/4 [follow]', (done) => {
      request({
        method: 'GET',
        url: 'http://httpbin.org/absolute-redirect/4'
      }, (error, resp) => {
        assert.isOk(true, 'got response');
        if ((error && error.statusCode === 404) || (resp && resp.statusCode === 404)) {
          console.log('httpbin/absolute-redirect got broken, try to spawn your own instance for tests');
        } else {
          assert.isUndefined(error, 'no error presented');
          assert.equal(resp.statusCode, 200, 'statusCode: 200');
          assert.equal(resp.status, 200, 'status: 200');
          assert.isObject(resp.headers, 'Headers Object is presented');
          assert.equal(resp.headers.location, 'http://httpbin.org/absolute-redirect/3', 'Correct Location header');
        }
        done();
      });
    });

    it('GET/HTTPS/httpbin/absolute-redirect/4 [follow]', (done) => {
      request({
        method: 'GET',
        url: 'https://httpbin.org/absolute-redirect/4'
      }, (error, resp) => {
        assert.isOk(true, 'got response');
        if ((error && error.statusCode === 404) || (resp && resp.statusCode === 404)) {
          console.log('httpbin/absolute-redirect got broken, try to spawn your own instance for tests');
        } else {
          assert.isUndefined(error, 'no error presented');
          assert.equal(resp.statusCode, 200, 'statusCode: 200');
          assert.equal(resp.status, 200, 'status: 200');
          assert.isObject(resp.headers, 'Headers Object is presented');
          assert.equal(resp.headers.location, 'http://httpbin.org/absolute-redirect/3', 'Correct Location header');
        }
        done();
      });
    });

    it('GET/HTTP/httpbin/absolute-redirect/10 [follow]', (done) => {
      request({
        method: 'GET',
        url: 'http://httpbin.org/absolute-redirect/10'
      }, (error, resp) => {
        if ((error && error.statusCode === 404) || (resp && resp.statusCode === 404)) {
          console.log('httpbin/absolute-redirect got broken, try to spawn your own instance for tests');
        } else {
          assert.isUndefined(resp, 'no response');
          assert.equal(error.statusCode, 429, 'statusCode: 429');
          assert.equal(error.status, 429, 'status: 429');
        }
        done();
      });
    });

    it('GET/HTTPS/httpbin/absolute-redirect/10 [follow]', (done) => {
      request({
        method: 'GET',
        url: 'https://httpbin.org/absolute-redirect/10'
      }, (error, resp) => {
        if ((error && error.statusCode === 404) || (resp && resp.statusCode === 404)) {
          console.log('httpbin/absolute-redirect got broken, try to spawn your own instance for tests');
        } else {
          assert.isUndefined(resp, 'no response');
          assert.equal(error.statusCode, 429, 'statusCode: 429');
          assert.equal(error.status, 429, 'status: 429');
        }
        done();
      });
    });

    it('GET/HTTP/httpbin/absolute-redirect/4 [no follow]', (done) => {
      request({
        method: 'GET',
        url: 'http://httpbin.org/absolute-redirect/4',
        followRedirect: false
      }, (error, resp) => {
        assert.isOk(true, 'got response');
        if ((error && error.statusCode === 404) || (resp && resp.statusCode === 404)) {
          console.log('httpbin/absolute-redirect got broken, try to spawn your own instance for tests');
        } else {
          assert.isUndefined(error, 'no error presented');
          assert.isOk(resp.body.includes('Redirecting'), 'Redirecting... in body');
          assert.equal(resp.statusCode, 302, 'statusCode: 302');
          assert.equal(resp.status, 302, 'status: 302');
          assert.isObject(resp.headers, 'Headers Object is presented');
          assert.equal(resp.headers.location, 'http://httpbin.org/absolute-redirect/3', 'Correct Location header');
        }
        done();
      });
    });

    it('GET/HTTPS/httpbin/absolute-redirect/4 [no follow]', (done) => {
      request({
        method: 'GET',
        url: 'https://httpbin.org/absolute-redirect/4',
        followRedirect: false
      }, (error, resp) => {
        assert.isOk(true, 'got response');
        if ((error && error.statusCode === 404) || (resp && resp.statusCode === 404)) {
          console.log('httpbin/absolute-redirect got broken, try to spawn your own instance for tests');
        } else {
          assert.isUndefined(error, 'no error presented');
          assert.isOk(resp.body.includes('Redirecting'), 'Redirecting... in body');
          assert.equal(resp.statusCode, 302, 'statusCode: 302');
          assert.equal(resp.status, 302, 'status: 302');
          assert.isObject(resp.headers, 'Headers Object is presented');
          assert.equal(resp.headers.location, 'http://httpbin.org/absolute-redirect/3', 'Correct Location header');
        }
        done();
      });
    });
  });

  describe('POST', () => {
    it('POST/plain-text', (done) => {
      const form = 'Loremipsumdolorsitamet,consectetueradipiscingelit.Aeneancommodoligulaegetdolor.Aeneanmassa.Cumsociisnatoquepenatibusetmagnisdisparturientmontes,nasceturridiculusmus.Donecquamfelis,ultriciesnec,pellentesqueeu,pretiumquis,sem.Nullaconsequatmassaquisenim.Donecpedejusto,fringillavel,aliquetnec,vulputateeget,arcu.Inenimjusto,rhoncusut,imperdieta,venenatisvitae,justo.Nullamdictumfeliseupedemollispretium.Integertincidunt.Crasdapibus.Vivamuselementumsempernisi.Aeneanvulputateeleifendtellus.Aeneanleoligula,porttitoreu,consequatvitae,eleifendac,enim.Aliquamloremante,dapibusin,viverraquis,feugiata,tellus.Phasellusviverranullautmetusvariuslaoreet.Quisquerutrum.Aeneanimperdiet.Etiamultriciesnisivelaugue.Curabiturullamcorperultriciesnisi.Namegetdui.Etiamrhoncus.Maecenastempus,tellusegetcondimentumrhoncus,semquamsemperlibero,sitametadipiscingsemnequesedipsum.Namquamnunc,blanditvel,luctuspulvinar,hendreritid,lorem.Maecenasnecodioetantetincidunttempus.Donecvitaesapienutliberovenenatisfaucibus.Nullamquisante.Etiamsitametorciegeterosfaucibustincidunt.Duisleo.Sedfringillamaurissitametnibh.Donecsodalessagittismagna.Sedconsequat,leoegetbibendumsodales,auguevelitcursusnunc,';
      request({
        method: 'POST',
        url: TEST_URL + '/plain-text',
        form
      }, (error, resp) => {
        assert.isOk(true, 'got response');
        assert.isUndefined(error, 'no error presented');
        assert.equal(resp.statusCode, 200, 'statusCode: 200');
        assert.equal(resp.status, 200, 'status: 200');
        const body = JSON.parse(resp.body);
        assert.isObject(body, 'Response body is parsed to Object');
        assert.equal(body.data, form, 'Form received and returned correctly');
        assert.equal(body.headers['content-type'], 'application/x-www-form-urlencoded', 'Default POST content-type header');
        done();
      });
    });
  });

  describe('UPLOAD', () => {
    it('UPLOAD/POST/IMG', (done) => {
      const fileLocation = path.resolve('.') + '/test/bb.jpg';
      const origFile = fs.readFileSync(fileLocation);
      fs.open(fileLocation, 'r', function(err, fd) {
        if (err) {
          assert.isOk(false, `Can't open the file: ${fileLocation}`);
          return;
        }

        request({
          method: 'POST',
          url: TEST_URL + '/upload',
          upload: fd
        }, (error, resp) => {
          assert.isOk(true, 'got response');
          assert.isUndefined(error, 'no error presented');
          assert.equal(resp.statusCode, 200, 'statusCode: 200');
          assert.equal(resp.status, 200, 'status: 200');
          const body = JSON.parse(resp.body);
          assert.isObject(body, 'Response body is parsed to Object');
          assert.equal(body.messageLength, origFile.byteLength, 'Form received and returned correctly');
          done();
        });
      });
    });

    it('UPLOAD/POST/PDF', (done) => {
      const fileLocation = path.resolve('.') + '/test/rfc2616.pdf';
      const origFile = fs.readFileSync(fileLocation);
      fs.open(fileLocation, 'r', function(err, fd) {
        if (err) {
          assert.isOk(false, `Can't open the file: ${fileLocation}`);
          return;
        }

        request({
          method: 'POST',
          url: TEST_URL + '/upload',
          upload: fd
        }, (error, resp) => {
          assert.isOk(true, 'got response');
          assert.isUndefined(error, 'no error presented');
          assert.equal(resp.statusCode, 200, 'statusCode: 200');
          assert.equal(resp.status, 200, 'status: 200');
          const body = JSON.parse(resp.body);
          assert.isObject(body, 'Response body is parsed to Object');
          assert.equal(body.messageLength, origFile.byteLength, 'Form received and returned correctly');
          done();
        });
      });
    });

    it('UPLOAD/POST/PDF via MULTIPART and libcurl options', (done) => {
      const fileLocation = path.resolve('.') + '/test/rfc2616.pdf';

      request({
        method: 'POST',
        url: TEST_URL + '/upload',
        curlFeatures: {
          NoDataParsing: true,
          NoHeaderParsing: true
        },
        curlOptions: {
          HTTPPOST: [{
            name: 'rfc2616.pdf',
            file: fileLocation,
            type: 'application/pdf'
          }, {
            name: 'input-name',
            contents: 'Form contents string'
          }]
        }
      }, (error, resp) => {
        assert.isOk(true, 'got response');
        assert.isUndefined(error, 'no error presented');
        assert.isOk(resp.body instanceof Buffer, 'Body instanceof Buffer');
        const body = JSON.parse(resp.body.toString('utf8'));
        assert.isObject(body, 'Body is Object');
        assert.isObject(body.headers, 'Body.Headers is Object');
        assert.isOk(body.headers['content-type'].startsWith('multipart/form-data;'), '"content-type" header');
        assert.equal(resp.statusCode, 200, 'statusCode: 200');
        assert.equal(resp.status, 200, 'status: 200');
        assert.equal(body.messageLength, 272360, 'Form received and returned correctly');
        done();
      });
    });
  });

  describe('GET', () => {
    it('GET/empty', (done) => {
      request({
        url: TEST_URL
      }, (error, resp) => {
        assert.isOk(true, 'got response');
        assert.isUndefined(error, 'no error presented');
        assert.equal(resp.body, '', 'Body is empty');
        assert.equal(resp.statusCode, 204, 'statusCode: 204');
        assert.equal(resp.status, 204, 'status: 204');
        assert.isObject(resp.headers, 'Headers Object is presented');
        done();
      });
    });

    it('GET/text-plain', (done) => {
      request({
        url: TEST_URL + '/text-plain'
      }, (error, resp) => {
        assert.isOk(true, 'got response');
        assert.isUndefined(error, 'no error presented');
        assert.equal(resp.body, 'plain text response', 'Body content');
        assert.equal(resp.statusCode, 200, 'statusCode: 200');
        assert.equal(resp.status, 200, 'status: 200');
        assert.isOk(resp.headers['content-type'].includes('text/plain'), 'Correct headers Object is presented');
        done();
      });
    });

    it('GET/text-html', (done) => {
      request({
        url: TEST_URL + '/text-html'
      }, (error, resp) => {
        assert.isOk(true, 'got response');
        assert.isUndefined(error, 'no error presented');
        assert.equal(resp.body, '<html><head></head><body></body></html>', 'Body content');
        assert.equal(resp.statusCode, 200, 'statusCode: 200');
        assert.equal(resp.status, 200, 'status: 200');
        assert.isOk(resp.headers['content-type'].includes('text/html'), 'Correct headers Object is presented');
        done();
      });
    });

    it('GET/custom-header', (done) => {
      request({
        url: TEST_URL + '/custom-header',
        headers: {
          'X-Custom-Header': 'custom-header-value'
        }
      }, (error, resp) => {
        assert.isOk(true, 'got response');
        assert.isUndefined(error, 'no error presented');
        assert.equal(resp.statusCode, 200, 'statusCode: 200');
        assert.equal(resp.status, 200, 'status: 200');
        assert.isOk(resp.headers['content-type'].includes('application/json'), 'Correct content-type header is presented');
        assert.equal(resp.headers['x-custom-header'], 'custom-header-value', 'Correct x-custom-header header is presented');
        const jsonResp = JSON.parse(resp.body);
        assert.deepEqual(jsonResp, {'x-custom-header': 'custom-header-value'}, 'Correct body response');
        done();
      });
    });

    it('GET/json', (done) => {
      request({
        url: TEST_URL + '/json'
      }, (error, resp) => {
        assert.isOk(true, 'got response');
        assert.isUndefined(error, 'no error presented');
        assert.deepEqual(JSON.parse(resp.body), {key: 'value'}, 'Body content');
        assert.equal(resp.statusCode, 200, 'statusCode: 200');
        assert.equal(resp.status, 200, 'status: 200');
        assert.isOk(resp.headers['content-type'].includes('application/json'), 'Correct headers Object is presented');
        done();
      });
    });

    it('GET/HTTP/IDN', (done) => {
      request({
        url: 'http://яндекс.рф' //xn--d1acpjx3f.xn--p1ai
      }, (error, resp) => {
        assert.isOk(true, 'got response');
        assert.isUndefined(error, 'no error presented');
        assert.equal(resp.statusCode, 200, 'statusCode: 200');
        assert.equal(resp.status, 200, 'status: 200');
        assert.isOk(resp.headers['content-type'].includes('text/html'), 'Correct "content-type" header is presented');
        assert.equal(resp.headers.location, 'http://www.yandex.ru/', 'Correct "location" header is presented');
        done();
      });
    });

    it('GET/HTTPS/IDN', (done) => {
      request({
        url: 'https://i❤️.ws', //xn--i-7iq.ws
        rejectUnauthorized: true,
        rejectUnauthorizedProxy: true
      }, (error, resp) => {
        assert.isOk(true, 'got response');
        assert.isUndefined(error, 'no error presented');
        assert.equal(resp.statusCode, 200, 'statusCode: 200');
        assert.equal(resp.status, 200, 'status: 200');
        assert.isOk(resp.headers['content-type'].includes('text/html'), 'Correct "content-type" header is presented');
        done();
      });
    });

    it('GET/HTTP/T-IDN', (done) => {
      request({
        url: 'http://xn--d1acpjx3f.xn--p1ai' //яндекс.рф
      }, (error, resp) => {
        assert.isOk(true, 'got response');
        assert.isUndefined(error, 'no error presented');
        assert.equal(resp.statusCode, 200, 'statusCode: 200');
        assert.equal(resp.status, 200, 'status: 200');
        assert.isOk(resp.headers['content-type'].includes('text/html'), 'Correct "content-type" header is presented');
        assert.equal(resp.headers.location, 'http://www.yandex.ru/', 'Correct "location" header is presented');
        done();
      });
    });

    it('GET/HTTPS/T-IDN', (done) => {
      request({
        url: 'https://xn--i-7iq.ws', //i❤️.ws
        rejectUnauthorized: true,
        rejectUnauthorizedProxy: true
      }, (error, resp) => {
        assert.isOk(true, 'got response');
        assert.isUndefined(error, 'no error presented');
        assert.equal(resp.statusCode, 200, 'statusCode: 200');
        assert.equal(resp.status, 200, 'status: 200');
        assert.isOk(resp.headers['content-type'].includes('text/html'), 'Correct "content-type" header is presented');
        done();
      });
    });

    it('GET/no-response', (done) => {
      request({
        url: TEST_URL + '/no-response',
        timeout: 1024
      }, (error, resp) => {
        assert.isUndefined(resp, 'no response');
        assert.equal(error.statusCode, 408, 'statusCode: 408');
        assert.equal(error.status, 408, 'status: 408');
        assert.equal(error.errorCode, 28, 'status: 28');
        assert.equal(error.code, 28, 'code: 28');
        assert.equal(error.message, 'Error: Timeout was reached', 'error message is presented');
        done();
      });
    });

    it('GET/no-response-timeout', (done) => {
      request({
        url: TEST_URL + '/no-response-timeout',
        timeout: 10000
      }, (error, resp) => {
        assert.isUndefined(resp, 'no response');
        assert.equal(error.statusCode, 503, 'statusCode: 503');
        assert.equal(error.status, 503, 'status: 503');
        assert.equal(error.errorCode, 52, 'status: 52');
        assert.equal(error.code, 52, 'code: 52');
        assert.equal(error.message, 'Error: Server returned nothing (no headers, no data)', 'error message is presented');
        done();
      });
    });

    it('GET/destroy', (done) => {
      request({
        url: TEST_URL + '/destroy'
      }, (error, resp) => {
        assert.isUndefined(resp, 'no response');
        assert.equal(error.statusCode, 503, 'statusCode: 503');
        assert.equal(error.status, 503, 'status: 503');
        assert.equal(error.errorCode, 52, 'status: 52');
        assert.equal(error.code, 52, 'code: 52');
        assert.equal(error.message, 'Error: Server returned nothing (no headers, no data)', 'error message is presented');
        done();
      });
    });

    it('GET/download/jpeg with "wait" option', (done) => {
      const origFile = fs.readFileSync(path.resolve('.') + '/test/bb.jpg');
      let _body      = Buffer.from('');
      const _headers = {};
      const req = request({
        url: TEST_URL + '/bb.jpg',
        retry: false, // Do not retry with rawBody/noStorage, as it may mess up with headers and body inside `.onData()` and `.onHeader()` hooks
        rawBody: true,
        noStorage: true,
        wait: true
      }, (error, resp) => {
        assert.isOk(origFile.length === _body.length, 'correct body size');
        assert.isOk(origFile.byteLength === _body.byteLength, 'correct body size');
        assert.isUndefined(error, 'no error');
        assert.equal(resp.statusCode, 200, 'statusCode: 200');
        assert.equal(resp.status, 200, 'status: 200');
        assert.equal(_headers['content-disposition'], `attachment; filename="bb.jpg"; filename*=UTF-8''bb.jpg; charset=UTF-8`, 'has correct "content-disposition" header');
        assert.equal(_headers['content-type'], 'image/jpeg');
        done();
      });

      req.onData(function (chunkAsBuffer) {
        _body = Buffer.concat([_body, chunkAsBuffer]);
      });

      req.onHeader(function (chunkAsBuffer) {
        const header = chunkAsBuffer.toString('utf8');
        if (header.includes(':')) {
          const splitHeader = header.split(':');
          _headers[splitHeader[0].toLowerCase().trim()] = splitHeader[1].trim();
        }
      });

      req.send();
    });

    it('GET/download/pdf with "wait" option', (done) => {
      const origFile = fs.readFileSync(path.resolve('.') + '/test/rfc2616.pdf');
      let _body      = Buffer.from('');
      const _headers = {};
      const req = request({
        url: TEST_URL + '/rfc2616.pdf',
        retry: false, // Do not retry with rawBody/noStorage, as it may mess up with headers and body inside `.onData()` and `.onHeader()` hooks
        rawBody: true,
        noStorage: true,
        wait: true
      }, (error, resp) => {
        assert.isOk(origFile.length === _body.length, 'correct body size');
        assert.isOk(origFile.byteLength === _body.byteLength, 'correct body size');
        assert.isUndefined(error, 'no error');
        assert.equal(resp.statusCode, 200, 'statusCode: 200');
        assert.equal(resp.status, 200, 'status: 200');
        assert.equal(_headers['content-disposition'], `attachment; filename="rfc2616.pdf"; filename*=UTF-8''rfc2616.pdf; charset=UTF-8`, 'has correct "content-disposition" header');
        assert.equal(_headers['content-type'], 'application/pdf');
        done();
      });

      req.onData(function (chunkAsBuffer) {
        _body = Buffer.concat([_body, chunkAsBuffer]);
      });

      req.onHeader(function (chunkAsBuffer) {
        const header = chunkAsBuffer.toString('utf8');
        if (header.includes(':')) {
          const splitHeader = header.split(':');
          _headers[splitHeader[0].toLowerCase().trim()] = splitHeader[1].trim();
        }
      });

      req.send();
    });

    it('GET/download/jpeg via .pipe() to a single destination', (done) => {
      const origFile = fs.readFileSync(path.resolve('.') + '/test/bb.jpg');
      const pathtoFile = path.resolve('.') + '/test/bb_1.pdf';
      const writeableStream = fs.createWriteStream(pathtoFile, {flags: 'w'});

      const req = request({
        url: TEST_URL + '/bb.jpg',
        retry: false, // Do not retry with rawBody/noStorage, as it may mess up with headers and body inside `.onData()` and `.onHeader()` hooks
        wait: true
      }, (error, resp) => {
        assert.isUndefined(error, 'no error');

        const downloadedFile = fs.readFileSync(pathtoFile);

        assert.isOk(origFile.length === downloadedFile.length, 'correct body size');
        assert.isOk(origFile.byteLength === downloadedFile.byteLength, 'correct body size');

        assert.equal(resp.statusCode, 200, 'statusCode: 200');
        assert.equal(resp.status, 200, 'status: 200');
        assert.equal(resp.headers['content-disposition'], `attachment; filename="bb.jpg"; filename*=UTF-8''bb.jpg; charset=UTF-8`, 'has correct "content-disposition" header');
        assert.equal(resp.headers['content-type'], 'image/jpeg');

        fs.unlinkSync(pathtoFile);
        done();
      });

      req.pipe(writeableStream).send();
    });

    it('GET/download/jpeg via {opts.pipeTo} option', (done) => {
      const origFile = fs.readFileSync(path.resolve('.') + '/test/bb.jpg');
      const pathtoFile = path.resolve('.') + '/test/bb_1.pdf';
      const writeableStream = fs.createWriteStream(pathtoFile, {flags: 'w'});

      request({
        url: TEST_URL + '/bb.jpg',
        retry: false, // Do not retry with rawBody/noStorage, as it may mess up with headers and body inside `.onData()` and `.onHeader()` hooks
        pipeTo: writeableStream
      }, (error, resp) => {
        assert.isUndefined(error, 'no error');

        const downloadedFile = fs.readFileSync(pathtoFile);

        assert.isOk(origFile.length === downloadedFile.length, 'correct body size');
        assert.isOk(origFile.byteLength === downloadedFile.byteLength, 'correct body size');

        assert.equal(resp.statusCode, 200, 'statusCode: 200');
        assert.equal(resp.status, 200, 'status: 200');
        assert.equal(resp.headers['content-disposition'], `attachment; filename="bb.jpg"; filename*=UTF-8''bb.jpg; charset=UTF-8`, 'has correct "content-disposition" header');
        assert.equal(resp.headers['content-type'], 'image/jpeg');

        fs.unlinkSync(pathtoFile);
        done();
      });
    });

    it('GET/download/pdf via .pipe() to 2 destinations', (done) => {
      const origFile = fs.readFileSync(path.resolve('.') + '/test/rfc2616.pdf');
      const pathtoFile = path.resolve('.') + '/test/rfc2616_1.pdf';
      const pathtoFile2 = path.resolve('.') + '/test/rfc2616_2.pdf';
      const writeableStream = fs.createWriteStream(pathtoFile, {flags: 'w'});
      const writeableStream2 = fs.createWriteStream(pathtoFile2, {flags: 'w'});

      const req = request({
        url: TEST_URL + '/rfc2616.pdf',
        retry: false, // Do not retry with rawBody/noStorage, as it may mess up with headers and body inside `.onData()` and `.onHeader()` hooks
        wait: true
      }, (error, resp) => {
        assert.isUndefined(error, 'no error');

        const downloadedFile = fs.readFileSync(pathtoFile);
        const downloadedFile2 = fs.readFileSync(pathtoFile2);

        assert.isOk(origFile.length === downloadedFile.length, 'correct body size');
        assert.isOk(origFile.length === downloadedFile2.length, 'correct body size');
        assert.isOk(origFile.byteLength === downloadedFile.byteLength, 'correct body size');
        assert.isOk(origFile.byteLength === downloadedFile2.byteLength, 'correct body size');

        assert.equal(resp.statusCode, 200, 'statusCode: 200');
        assert.equal(resp.status, 200, 'status: 200');
        assert.equal(resp.headers['content-disposition'], `attachment; filename="rfc2616.pdf"; filename*=UTF-8''rfc2616.pdf; charset=UTF-8`, 'has correct "content-disposition" header');
        assert.equal(resp.headers['content-type'], 'application/pdf');

        fs.unlinkSync(pathtoFile);
        fs.unlinkSync(pathtoFile2);
        done();
      });

      req.pipe(writeableStream).pipe(writeableStream2).send();
    });

    it('GET/download/pdf via .pipe() and {opts.pipeTo} to 2 destinations', (done) => {
      const origFile = fs.readFileSync(path.resolve('.') + '/test/rfc2616.pdf');
      const pathtoFile = path.resolve('.') + '/test/rfc2616_1.pdf';
      const pathtoFile2 = path.resolve('.') + '/test/rfc2616_2.pdf';
      const writeableStream = fs.createWriteStream(pathtoFile, {flags: 'w'});
      const writeableStream2 = fs.createWriteStream(pathtoFile2, {flags: 'w'});

      const req = request({
        url: TEST_URL + '/rfc2616.pdf',
        retry: false, // Do not retry with rawBody/noStorage, as it may mess up with headers and body inside `.onData()` and `.onHeader()` hooks
        wait: true,
        pipeTo: writeableStream2
      }, (error, resp) => {
        assert.isUndefined(error, 'no error');

        const downloadedFile = fs.readFileSync(pathtoFile);
        const downloadedFile2 = fs.readFileSync(pathtoFile2);

        assert.isOk(origFile.length === downloadedFile.length, 'correct body size');
        assert.isOk(origFile.length === downloadedFile2.length, 'correct body size');
        assert.isOk(origFile.byteLength === downloadedFile.byteLength, 'correct body size');
        assert.isOk(origFile.byteLength === downloadedFile2.byteLength, 'correct body size');

        assert.equal(resp.statusCode, 200, 'statusCode: 200');
        assert.equal(resp.status, 200, 'status: 200');
        assert.equal(resp.headers['content-disposition'], `attachment; filename="rfc2616.pdf"; filename*=UTF-8''rfc2616.pdf; charset=UTF-8`, 'has correct "content-disposition" header');
        assert.equal(resp.headers['content-type'], 'application/pdf');

        fs.unlinkSync(pathtoFile);
        fs.unlinkSync(pathtoFile2);
        done();
      });

      req.pipe(writeableStream).send();
    });
  });

  describe('HTTPS/HANDLE ERRORS', () => {
    it('GET/HTTPS/ERROR/EXPIRED [no reject]', (done) => {
      request({
        url: 'https://expired.badssl.com/'
      }, (error, resp) => {
        assert.isUndefined(error, 'no error');
        assert.equal(resp.statusCode, 200, 'statusCode: 200');
        assert.equal(resp.status, 200, 'status: 200');
        assert.isOk(resp.body.includes('expired.badssl.com'), 'Has correct body response');
        done();
      });
    });

    it('GET/HTTPS/ERROR/EXPIRED [reject]', (done) => {
      request({
        url: 'https://expired.badssl.com/',
        rejectUnauthorized: true
      }, (error, resp) => {
        assert.isUndefined(resp, 'no response');
        assert.equal(error.statusCode, 526, 'statusCode: 526');
        assert.equal(error.status, 526, 'status: 526');
        assert.equal(error.errorCode, 60, 'status: 60');
        assert.equal(error.code, 60, 'code: 60');
        // Message is no reliable as can be different form OS and used version of cURL
        // assert.equal(error.message, 'Error: SSL peer certificate or SSH remote key was not OK', 'error message is presented');
        done();
      });
    });

    it('GET/HTTPS/ERROR/WRONG HOST [no reject]', (done) => {
      request({
        url: 'https://wrong.host.badssl.com/'
      }, (error, resp) => {
        assert.isUndefined(error, 'no error');
        assert.equal(resp.statusCode, 200, 'statusCode: 200');
        assert.equal(resp.status, 200, 'status: 200');
        assert.isOk(resp.body.includes('wrong.host.badssl.com'), 'Has correct body response');
        done();
      });
    });

    it('GET/HTTPS/ERROR/WRONG HOST [reject]', (done) => {
      request({
        url: 'https://wrong.host.badssl.com/',
        rejectUnauthorized: true
      }, (error, resp) => {
        assert.isUndefined(resp, 'no response');
        assert.equal(error.statusCode, 526, 'statusCode: 526');
        assert.equal(error.status, 526, 'status: 526');
        assert.equal(error.errorCode, 60, 'status: 60');
        assert.equal(error.code, 60, 'code: 60');
        // Message is no reliable as can be different form OS and used version of cURL
        // assert.equal(error.message, 'Error: SSL peer certificate or SSH remote key was not OK', 'error message is presented');
        done();
      });
    });

    it('GET/HTTPS/ERROR/SELF-SIGNED [no reject]', (done) => {
      request({
        url: 'https://self-signed.badssl.com/'
      }, (error, resp) => {
        assert.isUndefined(error, 'no error');
        assert.equal(resp.statusCode, 200, 'statusCode: 200');
        assert.equal(resp.status, 200, 'status: 200');
        assert.isOk(resp.body.includes('self-signed.badssl.com'), 'Has correct body response');
        done();
      });
    });

    it('GET/HTTPS/ERROR/SELF-SIGNED [reject]', (done) => {
      request({
        url: 'https://self-signed.badssl.com/',
        rejectUnauthorized: true
      }, (error, resp) => {
        assert.isUndefined(resp, 'no response');
        assert.equal(error.statusCode, 526, 'statusCode: 526');
        assert.equal(error.status, 526, 'status: 526');
        assert.equal(error.errorCode, 60, 'status: 60');
        assert.equal(error.code, 60, 'code: 60');
        // Message is no reliable as can be different form OS and used version of cURL
        // assert.equal(error.message, 'Error: SSL peer certificate or SSH remote key was not OK', 'error message is presented');
        done();
      });
    });

    it('GET/HTTPS/ERROR/UNTRUSTED-ROOT [no reject]', (done) => {
      request({
        url: 'https://untrusted-root.badssl.com/'
      }, (error, resp) => {
        assert.isUndefined(error, 'no error');
        assert.equal(resp.statusCode, 200, 'statusCode: 200');
        assert.equal(resp.status, 200, 'status: 200');
        assert.isOk(resp.body.includes('untrusted-root.badssl.com'), 'Has correct body response');
        done();
      });
    });

    it('GET/HTTPS/ERROR/UNTRUSTED-ROOT [reject]', (done) => {
      request({
        url: 'https://untrusted-root.badssl.com/',
        rejectUnauthorized: true
      }, (error, resp) => {
        assert.isUndefined(resp, 'no response');
        assert.equal(error.statusCode, 526, 'statusCode: 526');
        assert.equal(error.status, 526, 'status: 526');
        assert.equal(error.errorCode, 60, 'status: 60');
        assert.equal(error.code, 60, 'code: 60');
        // Message is no reliable as can be different form OS and used version of cURL
        // assert.equal(error.message, 'Error: SSL peer certificate or SSH remote key was not OK', 'error message is presented');
        done();
      });
    });

    it('GET/HTTPS/ERROR/REVOKED [no reject]', (done) => {
      request({
        url: 'https://revoked.badssl.com/'
      }, (error, resp) => {
        assert.isUndefined(error, 'no error');
        assert.equal(resp.statusCode, 200, 'statusCode: 200');
        assert.equal(resp.status, 200, 'status: 200');
        assert.isOk(resp.body.includes('revoked.badssl.com'), 'Has correct body response');
        done();
      });
    });

    it('GET/HTTPS/ERROR/REVOKED [reject]', (done) => {
      request({
        url: 'https://revoked.badssl.com/',
        rejectUnauthorized: true,
        curlOptions: {
          SSL_VERIFYSTATUS: 1 // Check certificate status via OCSP
        }
      }, (error, resp) => {
        if (error && error.statusCode === 500) {
          console.log('OCSP CHECK ERROR:', error.message);
        } else {
          assert.isUndefined(resp, 'no response');
          assert.equal(error.statusCode, 526, 'statusCode: 526');
          assert.equal(error.status, 526, 'status: 526');
          assert.equal(error.errorCode, 91, 'status: 91');
          assert.equal(error.code, 91, 'code: 91');
          // Message is no reliable as can be different form OS and used version of cURL/
          // assert.equal(error.message, 'Error: SSL server certificate status verification FAILED', 'error message is presented');
        }
        done();
      });
    });

    it('GET/HTTPS/ERROR/PINNING [no reject]', (done) => {
      request({
        url: 'https://pinning-test.badssl.com/'
      }, (error, resp) => {
        assert.isUndefined(error, 'no error');
        assert.equal(resp.statusCode, 200, 'statusCode: 200');
        assert.equal(resp.status, 200, 'status: 200');
        assert.isOk(resp.body.includes('pinning-test.badssl.com'), 'Has correct body response');
        done();
      });
    });

    it('GET/HTTPS/ERROR/PINNING [reject]', (done) => {
      request({
        url: 'https://pinning-test.badssl.com/',
        rejectUnauthorized: true,
        curlOptions: {
          SSL_VERIFYPEER: 1,
          SSL_VERIFYSTATUS: 1 // Check certificate status via OCSP
        }
      }, (error, resp) => {
        if (error && error.statusCode === 500) {
          console.log('OCSP CHECK ERROR:', error.message);
        } else {
          assert.isUndefined(resp, 'no response');
          assert.equal(error.statusCode, 526, 'statusCode: 526');
          assert.equal(error.status, 526, 'status: 526');
          assert.equal(error.errorCode, 91, 'status: 91');
          assert.equal(error.code, 91, 'code: 91');
          // Message is no reliable as can be different form OS and used version of cURL
          // assert.equal(error.message, 'Error: SSL server certificate status verification FAILED', 'error message is presented');
        }
        done();
      });
    });

    it('GET/HTTPS/ERROR/no-common-name [no reject]', (done) => {
      request({
        url: 'https://no-common-name.badssl.com/'
      }, (error, resp) => {
        assert.isUndefined(error, 'no error');
        assert.equal(resp.statusCode, 200, 'statusCode: 200');
        assert.equal(resp.status, 200, 'status: 200');
        assert.isOk(resp.body.includes('no-common-name.badssl.com'), 'Has correct body response');
        done();
      });
    });

    it('GET/HTTPS/ERROR/no-common-name [reject]', (done) => {
      request({
        url: 'https://no-common-name.badssl.com/',
        rejectUnauthorized: true,
        curlOptions: {
          SSL_VERIFYHOST: 1, // Check host name in the SSL certificate
          SSL_VERIFYSTATUS: 1, // Check certificate status via OCSP
        }
      }, (error, resp) => {
        if (error && error.statusCode === 500) {
          console.log('VERIFYHOST ERROR:', error.message);
        } else {
          assert.isUndefined(resp, 'no response');
          assert.equal(error.statusCode, 526, 'statusCode: 526');
          assert.equal(error.status, 526, 'status: 526');
          assert.equal(error.errorCode, 91, 'status: 91');
          assert.equal(error.code, 91, 'code: 91');
          assert.equal(error.message, 'Error: SSL server certificate status verification FAILED', 'error message is presented');
        }
        done();
      });
    });
  });
});
