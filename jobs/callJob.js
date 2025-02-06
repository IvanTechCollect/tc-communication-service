const Queue = require('bull');
const redisUrl = require('../config/redisConfig');
const { makeCall } = require('../controllers/twilioController');

const callQueue = new Queue('sendCallQueue', redisUrl);

callQueue.process(async (job) => {
    const result = await makeCall(job.data);
    return result; // Make sure result is returned from the processing job
});

const addCallToQueue = async (callData) => {
    const job = await callQueue.add(callData, {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 1000  // Retry every 1 second, increasing exponentially
        }
    });

    const result = await job.finished();

    return result; // Return the result (true or false) after job completion
};

module.exports = { addCallToQueue }