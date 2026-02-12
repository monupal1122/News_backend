const redis = require('redis');

let client;
try {
    client = redis.createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379'
    });

    client.on('error', (err) => console.log('Redis Client Error', err));
    client.on('connect', () => console.log('Redis Client Connected'));
} catch (err) {
    console.error('Redis Initialization Error:', err.message);
}

const connectRedis = async () => {
    try {
        if (client && !client.isOpen) {
            await client.connect();
        }
    } catch (err) {
        console.error('*** Redis connection failed. Caching will be disabled. ***');
        console.error(err.message);
    }
};


module.exports = { client, connectRedis };
