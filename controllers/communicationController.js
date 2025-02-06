// communication controller.j
const { addCallToQueue } = require('../jobs/callJob');
const { emailQueue, addEmailToQueue } = require('../jobs/emailJob');
const { addLetterToQueue } = require('../jobs/letterJob');
const { addSmsToQueue } = require('../jobs/smsJob');
const ProactiveRoadmap = require('../models/ProactiveRoadmap');
require('dotenv').config();


const sendCommunicationEmail = async (req, res) => {


    try {
        const { unitId, proactiveId } = req.body;


        // Check required fields
        if (!unitId || !proactiveId) {
            return res.status(400).json({ error: 'Missing required fields:  unitId, proactiveId.' });
        }

        res.status(200).json({ success: true, message: 'Email is queued for sending.' });

        // Add the email job to the queue
        const jobData = { unitId, proactiveId };

        const result = await addEmailToQueue(jobData);
        console.log('Queue Result: ', result);

        if (result == false) {

            await ProactiveRoadmap.query().where('id', proactiveId).update({ status: -1 });

        }
    } catch (error) {
        console.error('Error queuing email job:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }

}

const sendCommunicationLetter = async (req, res) => {

    const { unitId, proactiveId } = req.body;

    res.sendStatus(200);

    const result = await addLetterToQueue({ unitId, proactiveId });
    console.log('Queue Result: ', result);




}


const sendCommunicationCall = async (req, res) => {

    res.sendStatus(200);

    const data = req.body;

    const result = await addCallToQueue(data);

    console.log('Queue Result: ', result);


}


const sendCommunicationSMS = async (req, res) => {


    res.sendStatus(200);

    const data = req.body;

    const result = await addSmsToQueue(data);

    console.log('Queue Result: ', result);
}





module.exports = { sendCommunicationEmail, sendCommunicationLetter, sendCommunicationCall, sendCommunicationSMS }    