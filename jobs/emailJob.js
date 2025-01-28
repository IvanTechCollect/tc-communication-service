
// EMAIL JOB
const createQueue = require("../config/bullQueue");
const CommunicationHandling = require("../models/CommunicationHandling");
const ProactiveRoadmap = require("../models/ProactiveRoadmap");
const { applyDataToTemplate } = require("../controllers/dataController");
const { sendEmail } = require("../controllers/emailController");
const { createLog } = require("../controllers/logController");
const { v4: uuidv4 } = require('uuid');

// Email job function for the queue
const emailJobFunction = async (jobData) => {
    try {
        const { to, html, subject, unitId, proactiveId } = jobData;

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
            throw new Error('Missing required fields: to, html, subject, or unitId.');
        }

        const emailId = uuidv4();
        const metadata = {
            emailId: emailId,
            unitId: unitId,
            proactiveId: proactiveId
        };

        const { htmlContent, formattedSubject } = await applyDataToTemplate(unitId, html, subject);

        if (!htmlContent) {
            throw new Error('Failed to send email. No htmlContent');
        }

        const emailResult = await sendEmail(to, htmlContent, formattedSubject, metadata);

        await createLog('Email Sent', `{"uuid":"${metadata.emailId}"}`, true, 'communication');
        await ProactiveRoadmap.query().update({ sent_text_data: htmlContent, activity_sent_date: new Date(), status: 2 }).where('id', proactiveId);

        if (!emailResult) {
            throw new Error('Failed to send email. No Email Result');
        }

        console.log('Email sent successfully', emailId);
    } catch (error) {
        console.error('Error processing email job:', error);
        throw error;  // Throw error so Bull can handle retries or logging
    }
};

// Create the queue
const emailQueue = createQueue('sendEmailQueue', emailJobFunction, {
    concurrency: 5,  // Number of parallel workers
    duration: 5000  // Timeout duration for each job (in ms)
});

// The API endpoint to add the email job to the queue


module.exports = { emailJobFunction, emailQueue };
