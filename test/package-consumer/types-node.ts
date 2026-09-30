import request, {
  requestAsync,
  type RequestInput,
  type Response
} from 'request-libcurl';
import { Writable } from 'node:stream';

const input: RequestInput = { url: 'https://example.com', retry: false };
request(input).abort();
const readonlyRetryOptions = {
  url: 'https://example.com',
  retryMethods: ['GET']
} as const;
request(readonlyRetryOptions).abort();
request({
  url: 'https://example.com',
  retry: false,
  pipeTo: new Writable({ write(_chunk, _encoding, callback) { callback(); } })
}).abort();
const response: Response = await requestAsync({ url: 'https://example.com', retry: false });
response.statusCode.toFixed();
