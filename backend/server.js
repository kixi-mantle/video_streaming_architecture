import { fileURLToPath } from "url";
import { WebSocketServer } from "ws";
import { createServer } from "http";
import uploadRoutes from "./routes/upload.js"
import uploadedRoutes from "./routes/uploads.js"
import express from 'express';
import path from "path";
import client from "./scripts/redisConnection.js";


const app = express();
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)


app.use(express.json())
app.use(express.static(path.join(__dirname ,"..", "frontend")))

app.get('/uploaded_videos', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'uploaded_videos', 'index.html'));
});
app.use('/upload' , uploadRoutes)
app.use('/uploadedvid' ,uploadedRoutes)

const server = createServer(app);
const ws_s = new WebSocketServer({server});

const subscriptions = new Map();

ws_s.on('connection', async (socket, req) => {
    console.log('connection eastablished')


    socket.on('message' , async(rawMessage)=> {

        try {
            const message = JSON.parse(rawMessage)

            if(message.type === 'subscribe'&& message.videoId){
                const videoId  = message.videoId;

                let sub = subscriptions.get(videoId);

             if (!sub){
                    const sockets = new Set();
                    sockets.add(socket)
                    
                    
                    const redisSubscriber = client.duplicate();
                     

                    redisSubscriber.on('error', (err) => {
                        console.error(`Redis subscriber error for ${videoId}:`, err);
                    });


                    await redisSubscriber.connect();
                    await redisSubscriber.subscribe(`video:${videoId}:updates`, (msg) => {

                        for (const s of sockets) {
                            if (s.readyState === WebSocket.OPEN) {
                                s.send(msg);
                            }
                        }
                    });

                    sub = { sockets, redis: redisSubscriber };
                    subscriptions.set(videoId, sub);
                }

                sub.sockets.add(socket);
            }
        } catch (error) {

        }
    })

    socket.on('close', async () => {
    });
});



server.listen(3000, () => {
    console.log('HTTP and WebSocket server running on port 3000');
});
