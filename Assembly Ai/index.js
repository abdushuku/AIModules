const WebSocket = require('ws');
const express = require('express');
const path = require('path');
const WaveFile = require('wavefile').WaveFile;


const app = express();
const server = require('http').createServer(app);
const wss = new WebSocket.Server({ server });

let assembly;
let chunks =[];

wss.on('connection', function connection(ws) {
    console.log('new connection');

    ws.on('message', function incoming(message) {
        if(!assembly){
            return console.error("AssemblyAI's WebSocket connection is not open");
        }
        const msg = JSON.parse(message);
        switch (msg.event){
            case "connected":
                console.log('A new call has connected');
                assembly.onerror = console.error;
                const texts = {};
                assembly.onmessage = (assemblyMsg) => {
                    const res = JSON.parse(assemblyMsg.data);
                    texts[res.audio_start] = res.text;
                    const keys = Object.keys*=(texts);
                    keys.sort((a,b) => a - b);
                    let msg = '';
                    for(const key of keys){
                        if(texts[key]){
                            msg += texts[key];
                        }
                    }
                    console.log(msg);
                    wss.clients.forEach(client => {
                        if(client.readyState === WebSocket.OPEN){
                            client.send(
                               JSON.stringify({
                                event: "interim-transcription",
                                text: msg
                               }) 
                            )
                        }
                    })
                }
                break;
            case "start":
                console.log(`Starting Media Stream ${msg.streamSid}`);
                break;
            case "media":
                console.log(`Receiving Audio`);
                const twilioData = msg.media.payload
                let wav = new WaveFile();
                wav.fromScratch(1, 8000, "8m", Buffer.from(twilioData, "base64"));
                wav.fromMuLaw()
                const twilio64Encoded = wav.toDataURI().split("base64,")[1];
                const twilioAudioBuffer = Buffer.from(twilio64Encoded, "base64");
                
                chunks.push(twilioAudioBuffer.slice(44));

                if(chunks.length >= 5){
                    const audioBuffer = Buffer.concat(chunks);
                    const encodedAuduio = audioBuffer.toString("base64");
                    assembly.send(JSON.stringify({audio_data:encodedAuduio}));
                    chunks = [];
                }
                break;
            case "stop":
                console.log(`Call has Ended`);
                assembly.send(JSON.stringify({ terminate_session: true}))
                break;           
        }
    });
});

app.get("/", (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.post("/", async (req, res) => {
    assembly = new WebSocket(
        "wss://api.assemblyai.com/v2/realtime/ws?sample_rate=8000",
        { headers: { Authorization: "da7536239c5c47efa7c502edd1d709f2" } }
    )
    res.set('Content-Type', 'text/xml');
    res.send(
        `
        <Response>
            <Start>
                <Stream url='wss://${req.headers.host}' />
            </Start>
            <Say>
                Start speaking to see your audio trancribed in the console
            </Say>
            <Pouse length='30'/>
        </Response>
        `
    )
})

console.log('Listening on port 8080');
server.listen(8080) ;