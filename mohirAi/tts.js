const axios = require('axios');

const config = {
  method: 'post',
  url: 'https://mohir.ai/api/v1/tts',
  headers: {
    Authorization: 'MOHIRAI_API_KEY',
    "Content-type": "application/json"
  },
  data: {
    text: "Salom dunyo",
    model: "davron-neutral",
    blocking: "true",
    webhook_notification_url: "https://example.com"
  },
};
axios(config).then((res) => console.log(res.data));