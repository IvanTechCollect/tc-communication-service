const Queue = require('bull');
require('dotenv').config();

// Default Redis configuration
const redisConfig = {
    host: 'redis://red-cuckf19u0jms73caiptg:6379',
    port: 6379,
};
const withTimeout = (func, duration) => async (data) => {
    const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Job processing timed out')), duration)
    );
    return Promise.race([func(data), timeout]);
};
// Create and configure a queue
const createQueue = (queueName, jobFunction, options = {}) => {

    // this should have a timeout

    if (!queueName) throw new Error('Queue name is required');
    if (typeof jobFunction !== 'function') throw new Error('jobFunction must be a valid function');

    const jobQueue = new Queue(queueName, { redis: redisConfig });

    jobQueue.process(options.concurrency || 1, async (job) => {
        try {
            console.log(`Processing job on queue "${queueName}":`, job.id);
            const jobWithTimeout = withTimeout(jobFunction, options.duration || 100);
            await jobWithTimeout(job.data);
            console.log(`Job ${job.id} completed successfully`);
        } catch (err) {
            console.error(`Job ${job.id} failed:`, err);
            throw err;
        }
    });

    jobQueue.on('completed', (job) => {
        console.log(`Job ${job.id} on queue "${queueName}" has completed`);
    });

    jobQueue.on('failed', (job, err) => {
        console.error(`Job ${job.id} on queue "${queueName}" failed:`, err);
    });

    return {
        addJob: (data, opts = {}) => jobQueue.add(data, opts), // 
        queue: jobQueue, // 
    };
};

module.exports = createQueue;
