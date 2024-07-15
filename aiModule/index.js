const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const FormData = require('form-data');
const { VoiceResponse } = require('twilio').twiml;
const OpenAi = require('openai');
require('dotenv').config();

const app = express();
const port = 3004;

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const openai = new OpenAi({
    apiKey: process.env.OPENAI_API_KEY,
    organization: "org-fCOHiO7g2QLhezgcgNEpkGws",
    project: 'proj_gazEt56784FLC9QEgvOzN3jN'
});

// Route to handle incoming calls
app.post('/voice', (req, res) => {
    const twiml = new VoiceResponse();
    twiml.say('Hello, how can I assist you today?');
    twiml.record({
        action: '/handle-recording-complete',
        recordingStatusCallback: '/handle-recording-status',
        recordingStatusCallbackMethod: 'POST'
    });
    res.type('text/xml');
    res.send(twiml.toString());
});

// Route to handle the recording status callback
app.post('/handle-recording-status', (req, res) => {
    const recordingUrl = req.body.RecordingUrl;
    console.log('Recording URL:', recordingUrl);
    console.log('Recording Status:', req.body.RecordingStatus);
    res.sendStatus(200);
});

// Route to handle the recording completion and send to STT module
app.post('/handle-recording-complete', async (req, res) => {
    const recordingUrl = req.body.RecordingUrl;

    if (!recordingUrl) {
        console.error('No recording URL provided');
        const response = new VoiceResponse();
        response.say('Sorry, something went wrong. Please try again later.');
        res.type('text/xml');
        res.send(response.toString());
        return;
    }

    try {
        const recordingResponse = await axios.get(recordingUrl, {
            auth: {
                username: process.env.AUTH_SID,
                password: process.env.AUTH_TOKEN
            },
            responseType: 'stream'
        });

        const data = new FormData();
        data.append('file', recordingResponse.data, 'recording.wav');
        data.append('return_offsets', 'false');
        data.append('run_diarization', 'false');
        data.append('language', 'uz');
        data.append('blocking', 'false');

        const sttResponse = await sttResponse(data);

        const userMessage = sttResponse.data.transcription;
        console.log(userMessage);

        // Send the transcribed text to the GPT model API
        const gptResponse = await openai.chat.completions.create({
            model: 'gpt-4-turbo',
            messages: [{ role: 'user', content: userMessage }],
        });

        const gptText = gptResponse.data.choices[0].message.content;
        const ttsResponse = await ttsResponse(gptText);

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

// Define the TTS config
function ttsConfig(gptText) {
    return {
        method: 'post',
        url: process.env.MOHIRAI_TTS,
        headers: {
            Authorization: `${process.env.MOHIRAI_API_KEY}`,
            'Content-Type': 'application/json'
        },
        data: {
            text: gptText,
            module: 'davron-neutral',
            blocking: 'true',
        }
    };
}

// Define the STT config
function sttConfig(formData) {
    return {
        method: 'post',
        url: process.env.MOHIRAI_STT,
        headers: {
            Authorization: `${process.env.MOHIRAI_API_KEY}`,
            ...formData.getHeaders(),
        },
        data: formData
    };
}

async function sttResponse(formData) {
    try {
        const response = await axios(sttConfig(formData));
        return response;
    } catch (error) {
        console.error(`STT Service Error: ${error.message}`);
        throw error;
    }
}

async function ttsResponse(gptText) {
    try {
        const response = await axios(ttsConfig(gptText));
        return response;
    } catch (error) {
        console.error(`TTS Service Error: ${error.message}`);
        throw error;
    }
}

// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
