
const Community = require('../models/Community');
const Company = require('../models/Company');
const Unit = require('../models/Unit');
const { getAzureFileSAS } = require('./azureController');

require('dotenv').config();

const Queue = require('bull');
const { addCommunicationJob, getJobResult } = require('./queue');
const redisUrl = process.env.REDIS_URL;


const emailQueue = new Queue("sendEmailQueue", redisUrl);
const letterQueue = new Queue("sendLetterQueue", redisUrl);
const callQueue = new Queue("sendCallQueue", redisUrl);
const smsQueue = new Queue("sendSmsQueue", redisUrl);

const areAllQueuesEmpty = async () => {
    const activeEmail = await emailQueue.getActiveCount();
    const activeLetter = await letterQueue.getActiveCount();
    const activeCall = await callQueue.getActiveCount();
    const activeSMS = await smsQueue.getActiveCount();

    return (activeEmail + activeLetter + activeCall + activeSMS) === 0;
};

const waitForAllQueuesToBeEmpty = async () => {
    while (!(await areAllQueuesEmpty())) {
        console.log(`Waiting for all communication jobs to finish...`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
    }
};


const runNextStep = async (req, res) => {
    try {
        // Extract data from request
        const data = req.body;

        // Add job to the queue
        const jobId = await addCommunicationJob(data.unitId, data.proactiveId, data.type);

        // Respond immediately to avoid request timeout
        res.status(202).json({ message: "Job added", jobId });

        console.log(`📨 Job ${jobId} added for unitId: ${data.unitId}, proactiveId: ${data.proactiveId}`);

        // Wait for job to complete and fetch result
        let jobResult = null;
        while (!jobResult) {
            await new Promise(resolve => setTimeout(resolve, 2000)); // Poll every 2 seconds
            jobResult = await getJobResult(jobId);
        }

        console.log(`✅ Final Job Result for ${jobId}:`, jobResult);

    } catch (error) {
        console.error("❌ Error in runNextStep:", error.message);
    }
};



const getCommunicationLetterSAS = async (req, res) => {

    const { unitId, stepNumber } = req.params;

    if (!unitId || !stepNumber) {

        return res.sendStatus(404);
    }

    try {
        const foundUnit = await Unit.query().where("id", unitId).first();
        const foundCompany = await Company.query()
            .where("id", foundUnit.company_id)
            .first();
        const foundCommunity = await Community.query()
            .where("id", foundUnit.community)
            .first();

        let companyName = foundCompany.company_name
            .replace(/[.,:\s-]/g, "_")
            .toLowerCase()
            .trim();
        let communityName = foundCommunity.community_name
            .replace(/[.,:\s-]/g, "_")
            .toLowerCase()
            .trim();
        let unitName = foundUnit.unit_name
            .replace(/[.,:\s-]/g, "_")
            .toLowerCase()
            .trim();

        // Ensure no leading or trailing slashes
        companyName = companyName.replace(/^\/|\/$/g, "");
        communityName = communityName.replace(/^\/|\/$/g, "");
        unitName = unitName.replace(/^\/|\/$/g, "");

        // Build the final file name
        let fileName = `${companyName}/${communityName}/${unitName}/letter_step_${stepNumber}.pdf`;

        const downloadLink = await getAzureFileSAS(fileName);

        return res.status(200).json({ downloadLink });

    } catch (error) {

        console.log(error);

        return res.sendStatus(500);
    }



}



module.exports = { runNextStep, getCommunicationLetterSAS }    