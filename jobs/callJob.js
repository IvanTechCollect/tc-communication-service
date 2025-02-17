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
        attempts: 5,
        backoff: {
            type: 'fixed',
            delay: 30000  // Retry every 1 second, increasing exponentially
        },
        removeOnComplete: true,
        removeOnFail: false
    });

    const result = await job.finished();

    return result;

};


callQueue.on('failed', async (job, err) => {
    console.error(`Job ${job.id} failed:`, err);

    // If the failure is due to a database issue, retry later
    if (err.code === 'ECONNRESET' || err.code === 'PROTOCOL_CONNECTION_LOST') {
        console.log(`Requeuing job ${job.id} after 30s...`);
        setTimeout(async () => {
            await job.retry();
        }, 31000);
    }
});

module.exports = { addCallToQueue }