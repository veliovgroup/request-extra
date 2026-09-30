import { requestAsync } from '../../index.js';

const response = await requestAsync({
  url: process.argv[2],
  method: 'POST',
  upload: 0,
  retry: false
});

process.stdout.write(JSON.stringify(response));
