const { createClient } = require('redis');
const Queue = require('bull');

require('dotenv').config();

const PWD = process.env.REDIS_PWD;



const startRedis = () => {

    const client = createClient({
        username: 'default',
        password: PWD,
        socket: {
            host: 'redis-11145.c16.us-east-1-2.ec2.redns.redis-cloud.com',
            port: 11145
        }
    });

    client.on('error', err => console.log('Redis Client Error', err));


    client.connect().then(() => {

        console.log('client connected');
    });
}



module.exports = startRedis;
