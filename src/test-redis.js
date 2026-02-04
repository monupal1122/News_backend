const redis = require('redis');
require('dotenv').config();

const testRedis = async () => {
    const client = redis.createClient({
        url: process.env.REDIS_URL
    });

    client.on('error', (err) => console.log('Redis Client Error', err));
    client.on('connect', () => console.log('Redis Client Connected'));

    try {
        console.log('Connecting to Redis...');
        await client.connect();
        console.log('Successfully connected to Redis!');

        await client.set('test_key', 'Hello from Node.js!');
        const value = await client.get('test_key');
        console.log('Redis GET test_key:', value);

        await client.disconnect();
        console.log('Disconnected from Redis.');
    } catch (err) {
        console.error('Redis test failed:', err.message);
    }
};

testRedis();
