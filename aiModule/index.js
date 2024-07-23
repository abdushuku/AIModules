import express from "express";
import bodyParser from "body-parser";
import axios from "axios";
import { Configuration, OpenAIApi } from "openai";
import { VoiceResponse } from "twilio";
import dotenv from 'dotenv';
dotenv.config();


const app = express();
const port = 3004;


app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const configuration = new Configuration({
    organization: "org-fCOHiO7g2QLhezgcgNEpkGws",
    apiKey: process.env.OPENAI_API_KEY
})
const openai = new OpenAIApi(configuration);

console.log('OpenAI API Key:', process.env.OPENAI_API_KEY);
console.log('MOHIRAI TTS URL:', process.env.MOHIRAI_TTS);
console.log('MOHIRAI API Key:', process.env.MOHIRAI_API_KEY);

// Retry mechanism with exponential backoff
async function retryRequest(config, retries = 5, backoff = 300) {
    try {
        const response = await axios(config);
        return response;
    } catch (error) {
        if (error.response && error.response.status === 429 && retries > 0) {
            console.warn(`Rate limit hit, retrying in ${backoff}ms...`);
            await new Promise(resolve => setTimeout(resolve, backoff));
            return retryRequest(config, retries - 1, backoff * 2);
        } else {
            console.error('Request failed:', error);
            throw error;
        }
    }
}

// Example usage of retryRequest
// async function getGPTResponse(userMessage) {
//     const config = {
//         method: 'post',
//         url: 'https://api.openai.com/v1/chat/completions',
//         headers: {
//             Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
//             'Content-Type': 'application/json'
//         },
//         data: {
//             model: 'gpt-3.5-turbo',
//             messages: [{ role: 'user', content: userMessage }]
//         }
//     };

//     try {
//         const response = await retryRequest(config);
//         return response.data.choices[0].message.content;
//     } catch (error) {
//         console.error('Error getting GPT response:', error);
//         throw error;
//     }
// }


const gptResponse = await openai.chat.completions.create({
    model: 'gpt-4-turbo',
    messages: [{ role: 'user', content: userMessage }],
});


// Define the TTS config
function ttsConfig(gptText) {
    return {
        method: 'post',
        url: process.env.MOHIRAI_TTS,
        headers: {
            Authorization: `Bearer ${process.env.MOHIRAI_API_KEY}`,
            'Content-Type': 'application/json'
        },
        data: {
            text: gptText,
            module: 'davron-neutral',
            blocking: 'true',
        }
    };
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

// Route to handle incoming calls
app.post('/voice', (req, res) => {
    const twiml = new VoiceResponse();
    twiml.say('Hello, how can I assist you today?');

    const gather = twiml.gather({
        input: 'speech',
        action: '/handle-gather-complete',
        speechTimeout: 'auto',
        speechModel: 'phone_call',
        language: 'uz-UZ'
    });

    gather.say('Please say something and I will assist you.');
    res.type('text/xml');
    res.send(twiml.toString());
});

// Route to handle the gather completion
app.post('/handle-gather-complete', async (req, res) => {
    const userMessage = req.body.SpeechResult;

    if (!userMessage) {
        console.error('No speech input provided');
        const response = new VoiceResponse();
        response.say('Sorry, I did not get that. Please try again.');
        const gather = response.gather({
            input: 'speech',
            action: '/handle-gather-complete',
            speechTimeout: 'auto',
            speechModel: 'phone_call',
            language: 'uz-UZ'
        });
        gather.say('Please say something and I will assist you.');
        res.type('text/xml');
        res.send(response.toString());
        return;
    }

    try {
        // Get the GPT response
        console.log('User message received:', userMessage);
        const gptResponse = await openai.chat.completions.create({
            model: 'gpt-4-turbo',
            messages: [{ role: 'user', content: userMessage }],
        });
        console.log('GPT response:', gptResponse);
        const ttsresponse = await ttsResponse(gptResponse);
        console.log('TTS response:', ttsresponse.data);

        const audioUrl = ttsresponse.data.audioUrl;
        console.log('Audio URL:', audioUrl);

        // Respond to Twilio with the generated speech
        const response = new VoiceResponse();
        response.play(audioUrl);

        // Continue the conversation
        const gather = response.gather({
            input: 'speech',
            action: '/handle-gather-complete',
            speechTimeout: 'auto',
            speechModel: 'phone_call',
            language: 'uz-UZ'
        });
        gather.say('Please say something and I will assist you.');

        res.type('text/xml');
        res.send(response.toString());
    } catch (error) {
        console.error('Error handling the gather completion:', error);
        const response = new VoiceResponse();
        response.say('Sorry, something went wrong. Please try again later.');
        res.type('text/xml');
        res.send(response.toString());
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
})
