const express = require('express');
const bodyParser = require('body-parser');
const twilio = require('twilio');
require('dotenv').config();
const  OpenAIApi = require('openai');

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

// Twilio Credentials
const client = new twilio(process.env.accountSid, process.env.authToken);

// OpenAI Credentials

const openai = new OpenAIApi({
    apiKey: process.env.OPENAI_API_KEY,
});

// Endpoint to handle incoming calls
app.post('/voice', async (req, res) => {
  const response = new twilio.twiml.VoiceResponse();
  response.say('Hello, you will be speaking with an AI.');

  response.record({
    transcribe: true,
    transcribeCallback: '/transcription',
  });

  res.type('text/xml');
  res.send(response.toString());
});

app.get("/", (req, res) => {
  res.send("Hello World!");
})

// Endpoint to handle transcriptions
app.post('/transcription', async (req, res) => {
  const transcriptionText = req.body.TranscriptionText;

  const gptResponse = await openai.createCompletion({
    model: 'text-davinci-003',
    prompt: transcriptionText,
    max_tokens: 150,
  });

  const aiResponse = gptResponse.data.choices[0].text.trim();

  // Respond with the AI-generated response
  const response = new twilio.twiml.VoiceResponse();
  response.say(aiResponse);
  res.type('text/xml');
  res.send(response.toString());
});

app.listen(process.env.PORT || 5000, () => {
  console.log(`http://localhost:${process.env.PORT || 5000}`);
});
