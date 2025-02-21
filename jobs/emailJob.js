const CommunicationHandling = require("../models/CommunicationHandling");
const ProactiveRoadmap = require("../models/ProactiveRoadmap");
const { applyDataToTemplate } = require("../controllers/dataController");
const { sendEmail } = require("../controllers/emailController");
const { createLog } = require("../controllers/logController");
const { v4: uuidv4 } = require('uuid');
const Unit = require("../models/Unit");
const { extractTemplate } = require("../controllers/templateController");
const Company = require("../models/Company");
const { prepareHTMLForTranslation, restoreBase64Images } = require("../helpers/helpers");
const { generateLedgerHtml } = require("../controllers/ledgerTemplateController");
const { scheduleNextStep } = require("../controllers/scheduleController");
// Email job function for the queue


require('dotenv').config();

const sendCommunicationEmail = async (jobData) => {

    const { unitId, proactiveId } = jobData;  // Access job data correctly
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



            await scheduleNextStep(unitId)

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


        console.error('Error sending email:', error);

        await ProactiveRoadmap
            .query()
            .where('id', proactiveId)
            .update({ status: -1, activity_sent_date: new Date() });


        await scheduleNextStep(unitId)

        await CommunicationHandling.query().insert({
            proactive_id: proactiveId,
            communication_type: 'Email',
            unit_id: unitId,
            result: -1,
            communication_webhook_id: '',
            reason: 'Internal Server Error.',
            communication_date: new Date(),
            status: 'Failed',
            notes: '',
            priority: 'High',
            created_at: new Date()
        })
        throw error;
        return false
    }
};



module.exports = { sendCommunicationEmail };
