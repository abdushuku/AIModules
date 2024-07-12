const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const FormData = require('form-data');
const { VoiceResponse } = require('twilio').twiml;
require("dotenv").config();

const app = express();
const port = 3003;

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Route to handle incoming calls
app.post('/voice', (req, res) => {
    const twiml = new VoiceResponse();
    const gather = twiml.gather({
        input: 'speech',
        action: '/handle-recording-complete',
        speechTimeout: 'auto',
    });
    gather.say('Hello, how can I assist you today?');
    res.type('text/xml');
    res.send(twiml.toString());
});

// Route to handle the recording completion and send to STT module
app.post('/handle-recording-complete', async (req, res) => {
    const recordingUrl = req.body.RecordingUrl;
    try {
        // Download the recording from Twilio
        const recordingResponse = await axios.get(recordingUrl, {
            responseType: 'stream'
        });

        // Create a FormData instance and append the downloaded audio file
        const formData = new FormData();
        formData.append('file', recordingResponse.data, 'recording.wav');

        // Send the recorded audio to the STT module API
        const sttResponse = await axios.post(
            'https://mohir.ai/api/v1/stt',
            formData,
            {
                headers: {
                    ...formData.getHeaders(),
                    Authorization: `Bearer MOHIR_AI_KEY`,
                },
            }
        );

        const userMessage = sttResponse.data.transcription;

        // Send the transcribed text to the GPT model API
        const gptResponse = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: 'gpt-4-turbo', // Specify the model
                messages: [{ role: 'user', content: userMessage }],
            },
            {
                headers: {
                Authorization: `Bearer OPENAI_API_KEY`,
                    'Content-Type': 'application/json',
                },
            }
        );

        const gptText = gptResponse.data.choices[0].message.content;

        // Convert the GPT model's response to speech using the TTS module
        const ttsResponse = await axios.post(
            'https://mohir.ai/api/v1/tts',
            { text: gptText },
            {
                headers: {
                    Authorization: `Bearer MOHIR_AI_KEY`,
                    'Content-Type': 'application/json',
                },
            }
        );

        const audioUrl = ttsResponse.data.audioUrl;

        // Respond to Twilio with the generated speech
        const response = new VoiceResponse();
        response.play(audioUrl);
        res.type('text/xml');
        res.send(response.toString());
    } catch (error) {
        console.error('Error handling the recording completion:', error);
        const response = new VoiceResponse();
        response.say('Sorry, something went wrong. Please try again later.');
        res.type('text/xml');
        res.send(response.toString());
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
