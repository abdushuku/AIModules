const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const { twiml: { VoiceResponse } } = require('twilio');

const app = express();
const port = 3003;

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Route to handle incoming calls
app.post('/incoming-call', (req, res) => {
  const response = new VoiceResponse();
  response.record({
    action: '/handle-recording',
    recordingStatusCallback: '/handle-recording-complete',
    recordingStatusCallbackMethod: 'POST'
  });
  res.type('text/xml');
  res.send(response.toString());
});

// Route to handle the recording completion and send to STT module
app.post('/handle-recording-complete', async (req, res) => {
  const recordingUrl = req.body.RecordingUrl;

  // Send the recorded audio to the STT module API
  const sttResponse = await axios.post('https://mohir.ai/api/v1/stt', { url: recordingUrl , header:{Authorization:`Bearer f3086c8e-28ae-4ea2-b86c-71247bf977e9:0412adb3-190d-460a-8b53-e32a1c830072`, 'Content-Type': 'application/json'}});
  const userMessage = sttResponse.data.transcription;

  // Send the transcribed text to the GPT model API
  const gptResponse = await axios.post('https://api.openai.com/v1/chat/completions', { text: userMessage });
  const gptText = gptResponse.data.response;

  // Convert the GPT model's response to speech using the TTS module
  const ttsResponse = await axios.post('https://mohir.ai/api/v1/tts', { text: gptText });
  const audioUrl = ttsResponse.data.audioUrl;

  // Respond to Twilio with the generated speech
  const response = new VoiceResponse();
  response.play(audioUrl);
  res.type('text/xml');
  res.send(response.toString());
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
