import request, { requestAsync, type RequestOptions } from 'request-libcurl';

const options = {
  url: 'https://example.com',
  method: 'GET',
  headers: {
    Accept: '*/*',
    'User-Agent': 'request-libcurl'
  }
} as const;

const retryOptions: RequestOptions = {
  retryMethods: ['POST'],
  retryMaxDelay: 30_000,
  retryJitter: false,
  respectRetryAfter: true
};
retryOptions.retryMethods?.includes('POST');

request(options).abort();

const response = await requestAsync(options);
response.body?.toString('utf8');
