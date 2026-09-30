import request, {
  requestAsync,
  type LibCurlRequest,
  type RequestInput,
  type RequestOptions,
  type Response,
  type ResponseError,
  type WritableLike
} from 'request-libcurl';

const writable: WritableLike = {
  write(_chunk, _encoding, callback) {
    callback?.();
  },
  end(_chunk, _encoding, callback) {
    callback?.();
  }
};

const opts: RequestInput = {
  url: 'https://example.com',
  method: 'POST',
  form: { ok: true },
  headers: { Accept: '*/*' },
  pipeTo: writable
};

const retryOptions: RequestOptions = {
  retryMethods: ['POST'],
  retryMaxDelay: 30_000,
  retryJitter: false,
  respectRetryAfter: true
};
retryOptions.retryMethods?.includes('POST');

const readonlyRetryOptions = {
  url: 'https://example.com',
  retryMethods: ['GET']
} as const;
request(readonlyRetryOptions).abort();

const req: LibCurlRequest = request(opts, (error?: ResponseError, response?: Response) => {
  if (error) {
    error.statusCode.toFixed();
  }

  const contentType = response?.headers['content-type'];
  if (typeof contentType === 'string') {
    contentType.toLowerCase();
  }
});

req.onData((chunk) => chunk.toString('utf8'));
req.onHeader((chunk) => chunk.toString('utf8'));

const response: Response = await requestAsync({ url: 'https://example.com' });
response.statusCode.toFixed();

const repeatedHeaders: Response['headers'] = {
  'set-cookie': ['session=one', 'preference=two']
};
repeatedHeaders['set-cookie'];

const waited: LibCurlRequest = await requestAsync({ url: 'https://example.com', wait: true });
await waited.sendAsync();

// @ts-expect-error url or uri is required
request({ method: 'GET' });
