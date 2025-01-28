const createQueue = require("../config/bullQueue");
const CommunicationHandling = require("../models/CommunicationHandling");
const ProactiveRoadmap = require("../models/ProactiveRoadmap");
const Unit = require("../models/Unit");
const { applyDataToTemplate } = require("./dataController");
const { sendEmail } = require("./emailController");
const { createLog } = require("./logController")
const { v4: uuidv4 } = require('uuid');

const sendCommunicationEmail = async (req, res) => {


    try {
        const { to, html, subject, unitId, proactiveId } = req.body;

        if (!to || !html || !subject || !unitId) {

            if (!to) {
                await CommunicationHandling.query().insert({
                    proactive_id: proactiveId,
                    communication_webhook_id: '',
                    result: -1,
                    unit_id: unitId,
                    communication_type: 'Email',
                    status: 'Failed',
                    reason: 'Invalid email address.',
                    communication_date: new Date(),
                    notes: '',
                    priority: 'Medium'
                });
            }

            await ProactiveRoadmap.query().update({ status: -1 }).where('id', proactiveId);

            return res.status(400).json({ error: 'Missing required fields: to, html, subject, or unitId.' });
        }
        const emailId = uuidv4();

        const metadata = {
            emailId: emailId,
            unitId: unitId,
            proactiveId: proactiveId
        }


        const { htmlContent, formattedSubject } = await applyDataToTemplate(unitId, html, subject);

        if (!htmlContent) {
            return res.status(400).json({ error: 'Failed to send email. No htmlContent' });

        }

        const emailResult = await sendEmail(to, htmlContent, formattedSubject, metadata);


        await createLog('Email Sent', `{"uuid":"${metadata.emailId}"}`, true, 'communication');

        if (!emailResult) {

            return res.status(400).json({ error: 'Failed to send email. No Email Result ' });
        }

        return res.status(200).json({ success: true, message: 'Email sent successfully.', emailId: emailId });


    } catch (error) {
        console.error('Error sending communication email:', error);
        return res.status(500).json({ error: 'Internal server error.' });

    }

}


module.exports = { sendCommunicationEmail }    