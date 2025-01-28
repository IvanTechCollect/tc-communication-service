const { createClient } = require('redis');

require('dotenv').config();




const startRedis = () => {

    const client = createClient({
        url: 'redis://red-cuckf19u0jms73caiptg:6379'
    });

    client.on('error', err => console.log('Redis Client Error', err));


    client.connect().then(() => {

        console.log('Redis client connected');
    });
}



module.exports = startRedis;
