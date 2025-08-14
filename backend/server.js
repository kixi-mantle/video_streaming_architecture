import { fileURLToPath } from "url";
import { WebSocketServer } from "ws";
import { createServer } from "http";
import uploadRoutes from "./routes/upload.js"
import uploadedRoutes from "./routes/uploads.js"
import express from 'express';
import path from "path";
import client from "./scripts/redisConnection.js";

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const app = express();
const server = createServer(app);
const ws_s = new WebSocketServer({server});

const subscriptions = new Map();

ws_s.on('connection', async (socket, req) => {
    const videoId = new URL(req.url, 'http://dummy').searchParams.get('videoId');
    if (!videoId) return;

    let sub = subscriptions.get(videoId);

    if (!sub) {
        const sockets = new Set();
        const redisSubscriber = client.duplicate();
        await redisSubscriber.connect();
        await redisSubscriber.subscribe(`video:${videoId}`, (message) => {
            for (const s of sockets) {
                if (s.readyState === WebSocket.OPEN) {
                    s.send(message);
                }
            }
        });

        sub = { sockets, redis: redisSubscriber };
        subscriptions.set(videoId, sub);
    }

    sub.sockets.add(socket);

    socket.on('close', async () => {
        sub.sockets.delete(socket);
        if (sub.sockets.size === 0) {
            await sub.redis.unsubscribe(`video:${videoId}`);
            await sub.redis.quit();
            subscriptions.delete(videoId);
        }
    });
});


app.use(express.json())
app.use(express.static(path.join(__dirname ,"..", "frontend")))
app.use('/upload' , uploadRoutes)
app.use('/uploadedvid' ,uploadedRoutes)
app.listen(3000, () => console.log('Server started on port 3000'));
