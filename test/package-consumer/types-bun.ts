import request, { requestAsync, type RequestOptions } from 'request-libcurl';

const options: RequestOptions = {
  url: 'https://example.com',
  retryMethods: ['GET'],
  retryJitter: false
};
request({ ...options, url: options.url ?? 'https://example.com' }).abort();
await requestAsync({ ...options, url: options.url ?? 'https://example.com' });
