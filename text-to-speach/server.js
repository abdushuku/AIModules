const express = require('express');
const bodyParser = require('body-parser');
const { VoiceResponse } = require('twilio').twiml;
const axios = require('axios');

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

const MOHIRAI_STT_API_KEY = process.env.MOHIR_STT;
const MOHIRAI_TTS_API_KEY = process.env.MOHIR_TTS;
const GPT_MODEL_API_KEY = process.env.OPENAI_API_KEY1;

app.post('/voice', (req, res) => {
    const twiml = new VoiceResponse();
    const gather = twiml.gather({
        input: 'speech',
        action: '/process_speech',
        speechTimeout: 'auto',
    });
    gather.say('Hello, how can I assist you today?');
    res.type('text/xml');
    res.send(twiml.toString());
});

app.post('/process_speech', async (req, res) => {
    const speechResult = req.body.SpeechResult;

    try {
        // Send speech result to MohirAI STT
        const sttResponse = await mohiraiStt(speechResult);

        // Process text with GPT model
        const gptResponse = await gptModelResponse(sttResponse);

        // Convert GPT response to speech with MohirAI TTS
        const ttsResponse = await mohiraiTts(gptResponse);

        const twiml = new VoiceResponse();
        twiml.say(ttsResponse);
        res.type('text/xml');
        res.send(twiml.toString());
    } catch (error) {
        console.error(error);
        res.status(500).send('An error occurred');
    }
});

async function mohiraiStt(audio) {
    try {
        // Replace this URL with the actual MohirAI STT API endpoint
        const url = 'https://mohir.ai/api/v1/stt';
        const response = await axios.post(url, { data: audio }, {
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${MOHIRAI_STT_API_KEY}`
            }
        });
        console.log('STT response data:', response.data);
        return response.data.text;
    } catch (error) {
        console.error('Error in mohiraiStt:', error.response ? error.response.data : error.message);
        throw error;
    }
}

async function gptModelResponse(text) {
    try {
        // Replace this URL with the actual GPT model API endpoint
        const url = '';
        const response = await axios.post(url, { text }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${GPT_MODEL_API_KEY}`
            }
        });
        console.log('GPT model response data:', response.data);
        return response.data.response;
    } catch (error) {
        console.error('Error in gptModelResponse:', error.response ? error.response.data : error.message);
        throw error;
    }
}

async function mohiraiTts(text) {
    try {
        // Replace this URL with the actual MohirAI TTS API endpoint
        const url = 'https://mohir.ai/api/v1/tts';
        const response = await axios.post(url, { text }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${MOHIRAI_TTS_API_KEY}`
            }
        });
        console.log('TTS response data:', response.data);
        return response.data.speech;
    } catch (error) {
        console.error('Error in mohiraiTts:', error.response ? error.response.data : error.message);
        throw error;
    }
}

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
