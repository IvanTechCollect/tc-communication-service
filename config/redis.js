const { createClient } = require('redis');

const startRedis = async () => {
    // Connect to your internal Redis instance using the REDIS_URL environment variable
    // The REDIS_URL is set to the internal Redis URL e.g. redis://red-343245ndffg023:6379
    const client = createClient({
        url: 'redis://default:kjhqwzzFQTHdqzrIkHPbzcXZPEAvDJiR@junction.proxy.rlwy.net:18442'
    });

    client.on('error', (err) => console.log('Redis Client Error', err));

    await client.connect();

    // Send and retrieve some values
    await client.set('key', 'node redis');
    const value = await client.get('key');

    console.log("found value: ", value)
};

module.exports = startRedis 