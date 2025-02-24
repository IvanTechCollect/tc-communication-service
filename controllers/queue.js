require('dotenv').config();

const { Queue } = require('bullmq');
const IORedis = require('ioredis');

const connection = new IORedis(process.env.REDIS_URL);
const communicationQueue = new Queue('communicationQueue', { connection });
const webhookQueue = new Queue('webhookQueue', { connection });



const addWebhookJob = async (type, data) => {

    try {
        const job = await webhookQueue.add('handleWebhook', { type, data }, {
            attempts: 3, // Retries the job 3 times if it fails
            backoff: { type: 'fixed', delay: 5000 } // Wait 5 seconds before retrying
        });

        console.log(`✅ Webhook job added: ${job.id}`);
    } catch (error) {
        console.error("❌ Error adding webhook job:", error.message);
    }
}
async function addCommunicationJob(unitId, proactiveId, type) {
    const job = await communicationQueue.add('sendCommunication', { unitId, proactiveId, type }, {
        attempts: 3, // Retry 3 times if failed
        backoff: { type: "fixed", delay: 5000 } // Retry after 5 seconds
    });

    console.log(`📨 Job added with ID: ${job.id}`);
    return job.id;
}

async function getJobResult(jobId) {
    const job = await communicationQueue.getJob(jobId);
    if (!job) {
        console.log(`❌ Job ${jobId} not found.`);
        return null;
    }
    console.log(`🔍 Checking job ${jobId} state...`);
    // Wait for job to be completed
    const state = await job.getState();
    if (state !== 'completed') {
        console.log(`⏳ Job ${jobId} is still in state: ${state}`);
        return null;
    }

    // ✅ Fetch stored return value

    const result = await job.returnvalue;
    console.log(`📊 Job ${jobId} result:`, result);
    return result;
}

module.exports = { addCommunicationJob, getJobResult, addWebhookJob };
