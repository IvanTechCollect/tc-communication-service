const CommunicationHandling = require("../models/CommunicationHandling");
const ProactiveRoadmap = require("../models/ProactiveRoadmap");
const { applyDataToTemplate } = require("../controllers/dataController");
const { sendEmail } = require("../controllers/emailController");
const { createLog } = require("../controllers/logController");
const { v4: uuidv4 } = require('uuid');
const Queue = require('bull');
const redisUrL = require('../config/redisConfig');
// Email job function for the queue

const emailJobFunction = async (job) => {
    try {
        const { to, html, subject, unitId, proactiveId } = job.data;  // Access job data correctly

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

// Create the queue and define job processing
const emailQueue = new Queue('sendEmailQueue', redisUrL);

emailQueue.process(async (job) => {
    await emailJobFunction(job);  // Pass the job to the emailJobFunction
});

// Add email job to the queue with retry and backoff logic
const addEmailToQueue = async (emailData) => {
    await emailQueue.add(emailData, {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 1000  // Retry every 1 second, increasing exponentially
        }
    });
};

module.exports = { addEmailToQueue };
