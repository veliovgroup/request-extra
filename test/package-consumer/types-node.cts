import requestLibcurl = require('request-libcurl');

const request = requestLibcurl.default;
const { requestAsync } = requestLibcurl;
request({ url: 'https://example.com', retry: false }).abort();
requestAsync({ url: 'https://example.com', retry: false }).then((response) => {
  response.statusCode.toFixed();
});
