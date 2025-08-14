
import { createClient } from 'redis';
import { env } from '../dist/env_var.js';


const client = createClient({
    username: 'default',
    password: env.REDIS_PASS,
    socket: {
        host: 'redis-13669.c15.us-east-1-4.ec2.redns.redis-cloud.com',
        port: 13669
    }
});

client.on('error', err => console.log('Redis Client Error', err));

await client.connect();

export default client
