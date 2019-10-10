const fs      = require('fs');
const http    = require('http');
const path    = require('path');
const request = require('../index.js');
const querystring = require('querystring');

const { assert }       = require('chai');
const { it, describe } = require('mocha');

const PORT = parseInt(process.env.PORT || 3003);
const TEST_URL = `http://127.0.0.1:${PORT}`;

const server = http.createServer(function (req, res) {
  let data = Buffer.from('');

  req.on('data', (chunkAsBuffer) => {
    data = Buffer.concat([data, chunkAsBuffer]);
  });

  req.on('end', () => {
    if (req.method === 'GET') {
      if (req.url.endsWith('text-plain')) {
        res.writeHead(200, {'Content-Type': 'text/plain; charset=UTF-8'});
        res.end('plain text response');
      } else if (req.url.endsWith('text-html')) {
        res.writeHead(200, {'Content-Type': 'text/html; charset=UTF-8'});
        res.end('<html><head></head><body></body></html>');
      } else if (req.url.endsWith('json')) {
        res.writeHead(200, {'Content-Type': 'application/json; charset=UTF-8'});
        res.end(JSON.stringify({key: 'value'}));
      } else if (req.url.endsWith('custom-header')) {
        res.writeHead(200, {'Content-Type': 'application/json; charset=UTF-8', 'x-custom-header': req.headers['x-custom-header']});
        res.end(JSON.stringify({'x-custom-header': req.headers['x-custom-header']}));
      } else if (req.url.endsWith('rfc2616.pdf')) {
        res.writeHead(200, {
          'Content-Type': 'application/pdf',
          'Accept-Ranges': 'bytes',
          'Content-Disposition': `attachment; filename="rfc2616.pdf"; filename*=UTF-8''rfc2616.pdf; charset=UTF-8`
        });
        fs.createReadStream(path.resolve('.') + '/test/rfc2616.pdf').pipe(res);
      } else if (req.url.endsWith('bb.jpg')) {
        res.writeHead(200, {
          'Content-Type': 'image/jpeg',
          'Accept-Ranges': 'bytes',
          'Content-Disposition': `attachment; filename="bb.jpg"; filename*=UTF-8''bb.jpg; charset=UTF-8`
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
        res.writeHead(200, {'Content-Type': 'application/json; charset=UTF-8'});
        const obj = {
          headers: req.headers,
          data: data.toString('utf8')
        };
        res.end(JSON.stringify(obj));
      } else if (req.url.endsWith('upload')) {
        res.writeHead(200, {'Content-Type': 'application/json; charset=UTF-8'});
        res.end(JSON.stringify({messageLength: data.length}));
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
        const body = JSON.parse(resp.body);
        assert.isObject(body, 'Response body JSON is parsed to Object');
        assert.isOk(body.brotli, 'Is brotli');
        assert.equal(resp.statusCode, 200, 'statusCode: 200');
        assert.equal(resp.status, 200, 'status: 200');
        assert.isObject(resp.headers, 'Headers Object is presented');
        assert.equal(resp.headers['content-type'], 'application/json', 'Correct content-type header');
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
        const body = JSON.parse(resp.body);
        assert.isObject(body, 'Response body JSON is parsed to Object');
        assert.isOk(body.brotli, 'Is brotli');
        assert.equal(resp.statusCode, 200, 'statusCode: 200');
        assert.equal(resp.status, 200, 'status: 200');
        assert.isObject(resp.headers, 'Headers Object is presented');
        assert.equal(resp.headers['content-type'], 'application/json', 'Correct content-type header');
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
        assert.isUndefined(error, 'no error presented');
        assert.equal(resp.statusCode, 200, 'statusCode: 200');
        assert.equal(resp.status, 200, 'status: 200');
        assert.isObject(resp.headers, 'Headers Object is presented');
        assert.equal(resp.headers.location, 'http://httpbin.org/absolute-redirect/3', 'Correct Location header');
        done();
      });
    });

    it('GET/HTTPS/httpbin/absolute-redirect/4 [follow]', (done) => {
      request({
        method: 'GET',
        url: 'https://httpbin.org/absolute-redirect/4'
      }, (error, resp) => {
        assert.isOk(true, 'got response');
        assert.isUndefined(error, 'no error presented');
        assert.equal(resp.statusCode, 200, 'statusCode: 200');
        assert.equal(resp.status, 200, 'status: 200');
        assert.isObject(resp.headers, 'Headers Object is presented');
        assert.equal(resp.headers.location, 'http://httpbin.org/absolute-redirect/3', 'Correct Location header');
        done();
      });
    });

    it('GET/HTTP/httpbin/absolute-redirect/10 [follow]', (done) => {
      request({
        method: 'GET',
        url: 'http://httpbin.org/absolute-redirect/10'
      }, (error, resp) => {
        assert.isUndefined(resp, 'no response');
        assert.equal(error.statusCode, 429, 'statusCode: 429');
        assert.equal(error.status, 429, 'status: 429');
        done();
      });
    });

    it('GET/HTTPS/httpbin/absolute-redirect/10 [follow]', (done) => {
      request({
        method: 'GET',
        url: 'https://httpbin.org/absolute-redirect/10'
      }, (error, resp) => {
        assert.isUndefined(resp, 'no response');
        assert.equal(error.statusCode, 429, 'statusCode: 429');
        assert.equal(error.status, 429, 'status: 429');
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
        assert.isUndefined(error, 'no error presented');
        assert.isOk(resp.body.includes('Redirecting'), 'Redirecting... in body');
        assert.equal(resp.statusCode, 302, 'statusCode: 302');
        assert.equal(resp.status, 302, 'status: 302');
        assert.isObject(resp.headers, 'Headers Object is presented');
        assert.equal(resp.headers.location, 'http://httpbin.org/absolute-redirect/3', 'Correct Location header');
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
        assert.isUndefined(error, 'no error presented');
        assert.isOk(resp.body.includes('Redirecting'), 'Redirecting... in body');
        assert.equal(resp.statusCode, 302, 'statusCode: 302');
        assert.equal(resp.status, 302, 'status: 302');
        assert.isObject(resp.headers, 'Headers Object is presented');
        assert.equal(resp.headers.location, 'http://httpbin.org/absolute-redirect/3', 'Correct Location header');
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
  });
});
