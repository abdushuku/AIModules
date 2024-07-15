const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const data = new FormData();
data.append('file', fs.createReadStream('./test.wav'));
data.append('return_offsets', 'false');
data.append('run_diarization', 'false');
data.append('language', 'uz');
data.append('blocking', 'false');
// data.append('webhook_notification_url', 'https://example.com');
const config = {
  method: 'post',
  url: 'https://mohir.ai/api/v1/stt',
  headers: {
    Authorization: 'MOHIRAI_API_KEY',
    ...data.getHeaders(),
  },
  data,
};
axios(config).then((res) => console.log(res.data));