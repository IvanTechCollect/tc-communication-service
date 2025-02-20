const Queue = require('bull');
const redisUrl = require('../config/redisConfig');
const { sendSMS } = require('../controllers/twilioController');

const smsQueue = new Queue('sendSmsQueue', redisUrl);

smsQueue.process(async (job) => {
    try {
        console.log(`Processing SMS Job ID: ${job.id}`, job.data);

        const smsResult = await sendSMS(job.data); // Get full response object
        console.log(`SMS Job ID: ${job.id} - Result:`, smsResult);

        if (!smsResult.result) {
            console.error(`SMS Job ID: ${job.id} - Failed:`, smsResult.error);
            throw new Error(smsResult.error || "Unknown SMS error"); // Trigger retry
        }

        return smsResult; // Return full response object
    } catch (err) {
        console.error(`Error processing SMS Job ${job.id}:`, err);
        throw err; // This will trigger retries
    }
});

const addSmsToQueue = async (smsData) => {
    try {
        const job = await smsQueue.add(smsData, {
            attempts: 5,
            backoff: {
                type: 'fixed',
                delay: 5000  // Retry every 5 seconds
            },
            removeOnComplete: true,
            removeOnFail: false
        });

        const result = await job.finished();
        console.log('JOB FINISHED RESULT', result);
        return result; // Return structured result

    } catch (error) {
        console.error("Error adding SMS job to queue:", error);
        return { result: false, error: "Failed to add job to queue." };
    }
};

smsQueue.on('completed', async (job, result) => {

    console.log(`SMS Job ID: ${job.id} completed:`, result);
    console.log("Job Data:", job.data);

});

smsQueue.on('failed', async (job, err) => {
    console.error(`SMS Job ID: ${job.id} failed:`, err.message);
    console.error("Job Data:", job.data);
});

module.exports = { addSmsToQueue };
