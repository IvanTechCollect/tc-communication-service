const CommunicationHandling = require("../models/CommunicationHandling");
const ProactiveRoadmap = require("../models/ProactiveRoadmap");
const { applyDataToTemplate } = require("../controllers/dataController");
const { sendEmail } = require("../controllers/emailController");
const { createLog } = require("../controllers/logController");
const { v4: uuidv4 } = require('uuid');
const Queue = require('bull');
const redisUrL = require('../config/redisConfig');
const Unit = require("../models/Unit");
const { extractTemplate } = require("../controllers/templateController");
const Company = require("../models/Company");
const { prepareHTMLForTranslation, restoreBlobURLs, restoreBase64Images } = require("../helpers/helpers");
const { generateLedgerHtml } = require("../controllers/ledgerTemplateController");
const { scheduleNextStep } = require("../controllers/scheduleController");
// Email job function for the queue


require('dotenv').config();

const emailJobFunction = async (job) => {

    const { unitId, proactiveId } = job.data;  // Access job data correctly

    try {


        const foundUnit = await Unit.query().findById(unitId);
        const communityId = foundUnit.community;
        const companyId = foundUnit.company_id;
        const foundCompany = await Company.query().findById(companyId);

        const foundStep = await ProactiveRoadmap.query().findById(proactiveId);

        const ruleId = foundStep.rule_id;
        const to = foundUnit.email;
        const from = foundCompany.communication_email;
        const preferredLanguage = foundUnit.preferred_language;


        let templateData = await extractTemplate('EMAIL', ruleId, communityId, companyId);

        let html = templateData[0];
        let subject = templateData[1];
        let includeLedger = templateData[2];

        if (!subject || subject == '') {

            subject = 'Email Follow Up';
        }

        console.log([
            html,
            subject,
            includeLedger
        ]);

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
                    priority: 'Medium',
                });
            }





            await ProactiveRoadmap.query().update({ status: -1 }).where('id', proactiveId);


            await scheduleNextStep(unitId);

            console.error('Missing required fields: to, html, subject, or unitId.');

            return false;
        }

        const emailId = uuidv4();
        const metadata = {
            emailId: emailId,
            unitId: unitId,
            proactiveId: proactiveId,
            env: process.env.DB_ENV,
            emailType: 'Follow Up'
        };

        let { content, formattedSubject } = await applyDataToTemplate(unitId, html, subject);

        let htmlContent = content;

        if (!htmlContent) {

            console.log('Failed to send email. No htmlContent');
            return false;

        }

        if (preferredLanguage !== 'en') {

            const { translateToDifferentLanguage } = await import('../controllers/aiController.mjs');

            const preparedData = prepareHTMLForTranslation(htmlContent);

            htmlContent = preparedData.cleanedHTML;


            let translatedHTML = await translateToDifferentLanguage(htmlContent, preferredLanguage);


            htmlContent = restoreBase64Images(translatedHTML, preparedData.base64Images);


        }


        if (includeLedger == 1) {

            const ledgerHtml = await generateLedgerHtml(unitId);
            htmlContent = `<div> <div>${htmlContent}</div>  <div>${ledgerHtml}</div> </div>`;
        }

        const emailResult = await sendEmail(from, to, htmlContent, formattedSubject, metadata);

        if (!emailResult) {


            await ProactiveRoadmap.query().where('id', proactiveId).update({ status: -1, activity_sent_date: new Date() });

            const updatedRoadmap = await ProactiveRoadmap.query().findById(proactiveId);


            await scheduleNextStep(updatedRoadmap.unit_id)

            await CommunicationHandling.query().insert({
                proactive_id: proactiveId,
                communication_type: 'Email',
                unit_id: unitId,
                result: -1,
                communication_webhook_id: metadata.emailId,
                reason: 'Sender email address not verified',
                communication_date: new Date(),
                status: 'Failed',
                notes: '',
                priority: 'High',
                created_at: new Date()
            })

            return false
        }

        await createLog('Email Sent', `{"uuid":"${metadata.emailId}"}`, true, 'communication');
        await ProactiveRoadmap.query().update({ sent_text_data: htmlContent, activity_sent_date: new Date(), status: 2 }).where('id', proactiveId);
        await scheduleNextStep(unitId);

        return true;
    } catch (error) {

        await ProactiveRoadmap
            .query()
            .where('id', proactiveId)
            .update({ status: -1, activity_sent_date: new Date() });

        const updatedRoadmap = await ProactiveRoadmap.query().findById(proactiveId);



        await scheduleNextStep(updatedRoadmap.unit_id)

        await CommunicationHandling.query().insert({
            proactive_id: proactiveId,
            communication_type: 'Email',
            unit_id: updatedRoadmap.unit_id,
            result: -1,
            communication_webhook_id: '',
            reason: 'Internal Server Error.',
            communication_date: new Date(),
            status: 'Failed',
            notes: '',
            priority: 'High',
            created_at: new Date()
        })

        return false
    }
};

// Create the queue and define job processing
const emailQueue = new Queue('sendEmailQueue', redisUrL);

emailQueue.process(async (job) => {
    const result = await emailJobFunction(job);
    return result;// Pass the job to the emailJobFunction
});

// Add email job to the queue with retry and backoff logic
const addEmailToQueue = async (emailData) => {
    const job = await emailQueue.add(emailData, {
        attempts: 5,
        backoff: {
            type: 'fixed',
            delay: 30000  // Retry every 1 second, increasing exponentially
        },
        removeOnComplete: true,
        removeOnFail: false
    });

    const result = await job.finished();

    return result;
};


emailQueue.on('failed', async (job, err) => {
    console.error(`Job ${job.id} failed:`, err);

    // If the failure is due to a database issue, retry later
    if (err.code === 'ECONNRESET' || err.code === 'PROTOCOL_CONNECTION_LOST') {
        console.log(`Requeuing job ${job.id} after 30s...`);
        setTimeout(async () => {
            await job.retry();
        }, 31000);
    }
});


module.exports = { addEmailToQueue };
