const Queue = require('bull');
const redisUrl = require('../config/redisConfig');
const { sendSMS } = require('../controllers/twilioController');

const smsQueue = new Queue('sendSmsQueue', redisUrl);

smsQueue.process(async (job) => {
    try {
        const result = await sendSMS(job.data);
        return result;// Pass the job to the emailJobFunction
    } catch (err) {
        console.error(`Error processing job ${job.id}:`, err);
        throw err; // This will trigger retries
    }
});

const addSmsToQueue = async (smsData) => {
    const job = await smsQueue.add(smsData, {
        attempts: 5,
        backoff: {
            type: 'fixed',
            delay: 5000  // Retry every 1 second, increasing exponentially
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