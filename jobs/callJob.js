const Queue = require('bull');
const redisUrl = require('../config/redisConfig');
const { makeCall } = require('../controllers/twilioController');

const callQueue = new Queue('sendCallQueue', redisUrl);

callQueue.process(async (job) => {
    try {
        const result = await makeCall(job.data);
        return result;// Pass the job to the emailJobFunction
    } catch (err) {
        console.error(`Error processing job ${job.id}:`, err);
        throw err; // This will trigger retries
    }
});

const addCallToQueue = async (callData) => {
    const job = await callQueue.add(callData, {
        attempts: 5, // Job will retry 5 times
        backoff: {
            type: 'fixed',
            delay: 30000  // Retry every 30 seconds
        },
        removeOnComplete: true,
        removeOnFail: false  // Keep failed jobs for debugging
    });

    return job.finished(); // Wait for job to complete
};

// Handle failures
callQueue.on('failed', async (job, err) => {
    console.error(`Job ${job.id} failed:`, err);
    console.error(job.data);
});

module.exports = { addCallToQueue };
