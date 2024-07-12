const twilio = require('twilio');
require('dotenv').config();
const client = twilio(process.env.accountSid, process.env.authToken);

const VoiceResponse = twilio.twiml.VoiceResponse;
const response = new VoiceResponse();
response.say("say something after beeep");
response.record({
    transcribe: true,
    transcribeCallback: 'https://c83f-84-54-83-231.ngrok-free.app/transcription',
    playBeep:true
})

client.calls.create({
    from: '+13217326295',
    to: '+998993016353',
    twiml: response.toString()
})
.then(call => console.log(call.sid))
.catch(error => console.error(error));