const CommunicationHandling = require('../models/CommunicationHandling');
const ProactiveRoadmap = require('../models/ProactiveRoadmap');

const handleEmailWebhook = async (req, res) => {




    const { emailId, proactiveId, unitId, event, response, timestamp, reason } = req.body[0];

    if (unitId !== 1432) {

        return res.sendStatus(200);
    }

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
        await ProactiveRoadmap.query().update({ status: 1 }).where('id', proactiveId);
        result = 1;
    } else if (event === 'dropped' || event === 'failed') {
        commStatus = 'Failed';
        failedReason = reason;
        result = -1;
        shouldRecordResponse = true;
        priority = 'Medium';
        await ProactiveRoadmap.query().update({ status: -1 }).where('id', proactiveId);

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


module.exports = { handleEmailWebhook }