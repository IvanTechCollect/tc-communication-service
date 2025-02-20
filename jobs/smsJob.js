const Queue = require('bull');
const redisUrl = require('../config/redisConfig');
const { sendSMS } = require('../controllers/twilioController');

const smsQueue = new Queue('sendSmsQueue', redisUrl);

smsQueue.process(async (job) => {
    try {
        console.log(`Processing SMS Job ID: ${job.id}`, job.data);

        const { result, error } = await sendSMS(job.data); // Get result object
        console.log(`SMS Job ID: ${job.id} - Result:`, result);

        if (!result) {
            console.error(`SMS Job ID: ${job.id} - Failed:`, error);
            throw new Error(error || "Unknown SMS error"); // Trigger retry
        }

        return { success: true, jobId: job.id, message: "SMS sent successfully." };

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
        return result; // Return structured result

    } catch (error) {
        console.error("Error adding SMS job to queue:", error);
        return { result: false, error: "Failed to add job to queue." };
    }
};

smsQueue.on('failed', async (job, err) => {
    console.error(`SMS Job ID: ${job.id} failed:`, err.message);
    console.error("Job Data:", job.data);
});

module.exports = { addSmsToQueue };
