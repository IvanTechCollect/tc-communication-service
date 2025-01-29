// testJob
const Queue = require('bull');
require('dotenv').config();

const jobTest = async (jobData) => {

    console.log(jobData);
    return true;

}

const testQueue = new Queue('testQueue', process.env.REDIS_URL);

testQueue.process(async (job) => {
    try {
        console.log('Processing Job:', job.id);
        await jobTest(job.data);  // Process the job by passing the data to jobTest
        console.log('Job processed successfully');
    } catch (error) {
        console.error('Error processing job:', error);
    }
});



module.exports = { testQueue };