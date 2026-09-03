import request, {
  requestAsync,
  type RequestInput,
  type Response
} from 'request-libcurl';

const input: RequestInput = { url: 'https://example.com', retry: false };
request(input).abort();
const response: Response = await requestAsync({ url: 'https://example.com', retry: false });
response.statusCode.toFixed();
