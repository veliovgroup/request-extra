import request, { requestAsync } from 'request-libcurl';

const options = {
  url: 'https://example.com',
  method: 'GET',
  headers: {
    Accept: '*/*',
    'User-Agent': 'request-libcurl'
  }
} as const;

request(options).abort();

const response = await requestAsync(options);
response.body?.toString('utf8');
