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
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 1000  // Retry every 1 second, increasing exponentially
        }
    });

    const result = await job.finished();

    return result; // Return the result (true or false) after job completion
};

module.exports = { addSmsToQueue }