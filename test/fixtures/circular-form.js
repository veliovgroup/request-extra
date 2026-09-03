import request from '../../index.js';

const form = {};
form.self = form;
request({ url: 'http://127.0.0.1:1', form }, (error) => {
  if (error.code !== 43) process.exitCode = 1;
});
