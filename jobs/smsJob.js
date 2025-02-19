const Queue = require('bull');
const redisUrl = require('../config/redisConfig');
const { sendSMS } = require('../controllers/twilioController');

const smsQueue = new Queue('sendSmsQueue', redisUrl);

smsQueue.process(async (job) => {
    const result = await sendSMS(job.data);
    return result; // Make sure result is returned from the processing job
});

const addSmsToQueue = async (smsData) => {
    const job = await smsQueue.add(smsData, {
        attempts: 5,
        backoff: {
            type: 'fixed',
            delay: 30000  // Retry every 1 second, increasing exponentially
        },
        removeOnComplete: true,
        removeOnFail: false
    });

    const result = await job.finished();

    return result; // Return the result (true or false) after job completion
};


smsQueue.on('failed', async (job, err) => {
    console.error(`Job ${job.id} failed:`, err);
    console.error(job.data);

});

module.exports = { addSmsToQueue }