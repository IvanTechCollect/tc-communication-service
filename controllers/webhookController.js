const CommunicationHandling = require('../models/CommunicationHandling');
const ProactiveRoadmap = require('../models/ProactiveRoadmap');
const VoiceCallback = require('../models/VoiceCallback');
const { sendEmail } = require('./emailController');
const { addWebhookJob } = require('./queue');
const { scheduleNextStep } = require('./scheduleController');
const { forwardCallToClient } = require('./twilioController');


const handleEmailWebhook = async (req, res) => {

    res.sendStatus(200);

    const data = req.body[0];

    await addWebhookJob('Email', data);



}

const handleCommunicationWebhooks = async (event, emailId, proactiveId, reason, unitId, timestamp, res) => {


    const foundCommunicationResponse = await CommunicationHandling.query().where('communication_webhook_id', emailId).first();

    if (foundCommunicationResponse) {

        await CommunicationHandling.query().delete().where('communication_webhook_id', emailId);
    }
    await CommunicationHandling.query().delete().where('proactive_id', proactiveId);

    const commType = 'Email';

    let commStatus = '';
    let notes = '';
    let result = 0;
    let priority = 'Low';
    let failedReason = '';

    let shouldRecordResponse = false;

    console.log('Event: ', event);

    if (event == 'delivered') {

        commStatus = 'Delivered';
        result = 1;
        shouldRecordResponse = true;
        await ProactiveRoadmap.query().update({ status: 1, }).where('id', proactiveId);
        result = 1;
    } else if (event === 'dropped' || event === 'failed' || event == 'deferred') {
        commStatus = 'Failed';
        failedReason = reason;
        result = -1;
        shouldRecordResponse = true;
        priority = 'Medium';
        await ProactiveRoadmap.query().update({ status: -1, }).where('id', proactiveId);


    } else {
        shouldRecordResponse = false;
    }


    if (shouldRecordResponse) {

        await CommunicationHandling.query().insert({
            communication_type: commType,
            unit_id: unitId,
            result: result,
            reason: failedReason,
            communication_date: new Date(timestamp * 1000),
            status: commStatus,
            notes: notes,
            priority: priority,
            communication_webhook_id: emailId,
            proactive_id: proactiveId

        })

    }

    res.sendStatus(200);

}


const handleCallWebhook = async (req, res) => {

    res.sendStatus(200);

    let data = req.body;
    const { proactiveId } = req.query;

    data.proactiveId = proactiveId;


    await addWebhookJob('Call', data);

    return;



}

const callForwardWebhook = async (req, res) => {

    const { userPhone, companyPhone } = req.query;

    const Digits = req.body.Digits;

    const result = await forwardCallToClient({ Digits, companyPhone });


    res.type('text/xml').send(result);
}


const handleSmsWebhook = async (req, res) => {

    res.sendStatus(200);
    let data = req.body;
    const { proactiveId } = req.query;

    data.proactiveId = proactiveId;

    await addWebhookJob('SMS', data);

    return;
}

const handleSystemWebhook = async (event, res) => {

    if (event !== 'delivered') {

        const to = 'support@techcollect.ai';
        const html = '';

        const result = await sendEmail(to, html, 'Failed Sending System Email')

        if (!result) {
            await res.status(500).json({ error: 'Cant Send System Notification Email' });
        }

        await res.sendStatus(200);

    }

}


module.exports = { handleEmailWebhook, handleCallWebhook, callForwardWebhook, handleSmsWebhook }