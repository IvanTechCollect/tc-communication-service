// letterJob.js
require('dotenv').config();

const Queue = require("bull");
const {
    applyDataToTemplate,
} = require("../controllers/dataController");
const { uploadBlob } = require("../controllers/azureController");
const Unit = require("../models/Unit");
const Company = require("../models/Company");
const Community = require("../models/Community");
const redisUrl = require("../config/redisConfig");
const {
    saveLetterToZipFile,
    sendLetterToOsg,
} = require("../controllers/letterController");
const { convertHtmlToPdfFile } = require("../controllers/fileController");
const ProactiveRoadmap = require("../models/ProactiveRoadmap");
const { extractTemplate } = require("../controllers/templateController");
const {
    prepareHTMLForTranslation,
    restoreBase64Images,
} = require("../helpers/helpers");
const {
    generateLedgerHtml,
} = require("../controllers/ledgerTemplateController");
const TimelineSettings = require('../models/TimelineSettings');
const ScheduledStep = require('../models/ScheduledStep');
const { scheduleNextStep } = require('../controllers/scheduleController');

const env = process.env.DB_ENV;

const letterJobFunction = async (job) => {
    try {
        let { unitId, proactiveId } = job.data;

        const foundUnit = await Unit.query().where("id", unitId).first();
        const foundCompany = await Company.query()
            .where("id", foundUnit.company_id)
            .first();
        const foundCommunity = await Community.query()
            .where("id", foundUnit.community)
            .first();

        const foundStep = await ProactiveRoadmap.query()
            .where("id", proactiveId)
            .first();

        const ruleId = foundStep.rule_id;
        const step = foundStep.step;
        const preferredLanguage = foundUnit.preferred_language;

        let templateData = await extractTemplate(
            "LETTER",
            ruleId,
            foundCommunity.id,
            foundCompany.id
        );

        let html = templateData[0];
        const certified = templateData[1];
        const includeLedger = templateData[2];

        let { content } = await applyDataToTemplate(unitId, html);

        if (!html) {
            return res
                .status(400)
                .error({ error: "No Html template or invalid unit id." });
        }
        console.log(preferredLanguage);


        if (preferredLanguage != 'en') {
            const { translateToDifferentLanguage } = await import('../controllers/aiController.mjs');
            const { cleanedHTML, base64Images } = prepareHTMLForTranslation(content);

            let translatedHTML = await translateToDifferentLanguage(cleanedHTML, preferredLanguage);

            content = restoreBase64Images(translatedHTML, base64Images);
        }

        if (includeLedger == 1) {
            const ledgerHtml = await generateLedgerHtml(unitId);
            content = `<div> 
    ${content}  
    <div style="page-break-before: always; break-before: always;"></div>
    <div>${ledgerHtml}</div> 
</div>`;
        }

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
        let fileName = `${companyName}/${communityName}/${unitName}/letter_step_${step}.pdf`;

        const { pdfBuffer, numPages } = await convertHtmlToPdfFile(content, true);
        console.log("Num of Pages: ", numPages);
        if (!pdfBuffer) {
            return false;
        }

        const saveResult = await saveLetterToZipFile(
            pdfBuffer,
            foundUnit,
            foundCompany,
            foundCommunity,
            "tempLetter",
            fileName.split("/").reverse()[0].replace(".pdf", "")
        );

        if (!saveResult) {
            return false;
        }
        let osgResultArr = [];

        if (env === 'PROD') {
            osgResultArr = await sendLetterToOsg(certified, '12345678', '');
            if (osgResultArr[0] == false) {

                return false
            }
        }



        const blobResponse = await uploadBlob(content, fileName);
        if (blobResponse.result == false) {
            return false;
        }

        const updateResult = await ProactiveRoadmap.query().update({
            letter_portal_number: env === 'PROD' ? osgResultArr[1].portal_number : 'Not sending to Osg in Staging',
            status: 1,
            activity_sent_date: new Date(),
            sent_text_data_letter: content
        }).where('id', proactiveId);


        await scheduleNextStep(foundUnit.id, foundStep.elapsed_days);

        return true;
    } catch (error) {
        console.log(error);
        return false;
    }
};

const letterQueue = new Queue("sendLetterQueue", redisUrl);

letterQueue.process(async (job) => {
    const result = await letterJobFunction(job);
    return result; // Make sure result is returned from the processing job
});

const addLetterToQueue = async (letterData) => {
    const job = await letterQueue.add(letterData, {
        attempts: 3,
        backoff: {
            type: "exponential",
            delay: 1000, // Retry every 1 second, increasing exponentially
        },
    });

    const result = await job.finished();

    return result; // Return the result (true or false) after job completion
};




module.exports = { addLetterToQueue };
