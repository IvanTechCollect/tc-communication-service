// communication controller.j
const { addCallToQueue } = require('../jobs/callJob');
const { addEmailToQueue } = require('../jobs/emailJob');
const { addLetterToQueue } = require('../jobs/letterJob');
const { addSmsToQueue } = require('../jobs/smsJob');
const CommunicationHandling = require('../models/CommunicationHandling');
const Community = require('../models/Community');
const Company = require('../models/Company');
const ProactiveRoadmap = require('../models/ProactiveRoadmap');
const Unit = require('../models/Unit');
const { getAzureFileSAS } = require('./azureController');

require('dotenv').config();

const Queue = require('bull');
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

// Send Email (Only starts if all queues are empty)
const sendCommunicationEmail = async (req, res) => {
    try {
        const { unitId, proactiveId } = req.body;
        if (!unitId || !proactiveId) {
            return res.status(400).json({ error: 'Missing required fields: unitId, proactiveId.' });
        }

        res.status(200).json({ success: true, message: 'Email is queued for sending.' });

        await waitForAllQueuesToBeEmpty(); // Ensure no jobs are running before starting
        const result = await addEmailToQueue({ unitId, proactiveId });
        console.log('Queue Result:', result);
    } catch (error) {
        console.error('Error queuing email job:', error);
    }
};

// Send Letter (Only starts if all queues are empty)
const sendCommunicationLetter = async (req, res) => {
    const { unitId, proactiveId } = req.body;
    res.sendStatus(200);

    await waitForAllQueuesToBeEmpty(); // Ensure no jobs are running before starting
    const result = await addLetterToQueue({ unitId, proactiveId });
    console.log('Queue Result:', result);
};

// Send Call (Only starts if all queues are empty)
const sendCommunicationCall = async (req, res) => {
    res.sendStatus(200);
    const data = req.body;

    await waitForAllQueuesToBeEmpty(); // Ensure no jobs are running before starting
    const result = await addCallToQueue(data);
    console.log('Queue Result:', result);
};

// Send SMS (Only starts if all queues are empty)
const sendCommunicationSMS = async (req, res) => {
    res.sendStatus(200);
    const data = req.body;

    await waitForAllQueuesToBeEmpty(); // Ensure no jobs are running before starting
    const result = await addSmsToQueue(data);
    console.log('Queue Result:', result);
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



module.exports = { sendCommunicationEmail, sendCommunicationLetter, sendCommunicationCall, sendCommunicationSMS, getCommunicationLetterSAS }    