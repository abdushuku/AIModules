const express = require('express');
const bodyparser = require("body-parser");
const twilio = require("twilio");
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(bodyparser.urlencoded({ extended: false }))

const client = twilio(process.env.AUTH_SID, process.env.AUTH_TOKEN);

app.post('/voice', async (req, res) => {
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say('Please say something after the beep, and I will convert it to text.', { voice: 'alice' });
    twiml.record({
        action: '/handle-recording',
        method: 'POST',
        maxLength: 30,
        trim: 'do-not-trim'
    });

    res.type('text/xml');
    res.send(twiml.toString());
});

app.post('/handle-recording', async (req, res) => {
    const recordingUrl = req.body.RecordingUrl;
    try {
        const audioResponse = await axios.get(recordingUrl, { responseType: 'arraybuffer' });
        const audioBuffer = audioResponse.data;
        const speechToTextResponse = await axios.post(process.env.MOHIRAI_STT, audioBuffer, {
            headers: { 'Content-Type': 'audio/wav' }
        });
        const text = speechToTextResponse.data.text;
        const gptResponse = await axios.post(process.env.OPENAI_API_KEY, {
            text: text
        });
        const gptText = gptResponse.data.text;
        const textToSpeechResponse = await axios.post(process.env.MOHIRAI_TTS, {
            text: gptText
        });
        const finalAudioUrl = textToSpeechResponse.data.audio_url;
        const twiml = new twilio.twiml.VoiceResponse();
        twiml.play(finalAudioUrl);
        res.type('text/xml');
        res.send(twiml.toString());
    } catch (error) {
        console.error('Error processing the recording:', error);
        const twiml = new twilio.twiml.VoiceResponse();
        twiml.say('Sorry, there was an error processing your request.');

        res.type('text/xml');
        res.send(twiml.toString());
    }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});