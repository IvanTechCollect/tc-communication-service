const { getCredentials, cleanHTML, createPDF, convertPDFToBase64 } = require("../helpers/helpers");
const Community = require("../models/Community");
const Company = require("../models/Company");
const Unit = require('../models/Unit');
const ProactiveRoadmap = require('../models/ProactiveRoadmap');


const axios = require('axios');
const { text } = require("express");
const TimelineRule = require("../models/TimelineRule");

const getCincToken = async (credentials) => {
    try {

        const clientId = credentials.clientId;
        const clientSecret = credentials.clientSecret;
        const tokenUrl = credentials.tokenUrl;


        const tokenHeaders = new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: clientId,
            client_secret: clientSecret,
        });

        const response = await axios.post(tokenUrl, tokenHeaders.toString(), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        });

        const tokenData = response.data;
        const token = tokenData.access_token;

        return token;

    } catch (error) {
        console.error('Error generating a token:', error.response?.data || error.message);
        return null;
    }
}

const sendCommunicationAttachemnt = async (req, res) => {

    try {
        const { unitId, proactiveId } = req.params;

        const foundUnit = await Unit.query().where('id', unitId).first();

        if (!foundUnit) {
            return res.status(404).send('We cant find unit for given unit Id');

        }

        if (foundUnit.company_id !== 396) {
            return res.status(404).send('We only support test companies for now!');

        }

        const foundCompany = await Company.query().where('id', foundUnit.company_id).first();

        if (!foundCompany) {
            return res.status(404).send('We cant find company for given unit Id');
        }

        const credentials = await getCredentials(foundCompany.id);



        if (!credentials) {

            return res.status(404).send('We cant find company for given unit Id');
        }

        if (credentials.partner !== 'Cinc') {
            return res.status(400).send('We only support Cinc Clients');

        }

        const token = await getCincToken(credentials);

        if (!token) {
            return res.status(400).send('We cant find company for given unit Id');

        }

        const foundCommunity = await Community.query().where('id', foundUnit.community);

        if (!foundCommunity) {
            return res.status(404).send('We cant find community for given unit Id');

        }

        // attempting to Post Correspondence

        const foundTimelineStep = await ProactiveRoadmap.query().where('id', proactiveId).first();

        if (!foundTimelineStep) {

            return res.status(404).send('We cant find timeline step for given unit Id');

        }


        let textData = '';  // for call / sms
        let fileData = ''; // for email / letter
        let fileToBeSent = false;
        let communicationName = ''; // if a custom step

        const communication = foundTimelineStep.communication;

        if (communication.includes('Call') || communication.includes('SMS')) {


            textData = cleanHTML(foundTimelineStep.sent_text_data);
        }

        if (communication.includes('Letter')) {
            fileToBeSent = true;
            fileData = foundTimelineStep.sent_text_data_letter;
        }

        if (communication.includes('Email')) {
            fileToBeSent = true;
            fileData = foundTimelineStep.sent_text_data;
        }



        const ruleId = foundTimelineStep.rule_id;

        if (isNaN(ruleId)) {
            communicationName = `TechCollect - ${communication}`
        } else {
            const foundRule = await TimelineRule.query().where('id', ruleId).first();
            communicationName = foundRule.name;
        }

        let base64Data = '';

        if (fileToBeSent) {
            let outputPath = 'output.pdf'
            const fileCreated = await createPDF(fileData, outputPath)
            if (fileCreated) {
                base64Data = await convertPDFToBase64(outputPath);
            }
        }



        let payload = {
            "AssocCode": foundCommunity.pield,
            "HoId": foundUnit.accountNo,
            "Description": `TechCollect ${communication} on day ${foundTimelineStep.days} `,
            "CorrespondenceType": "Collections",
            "NoteType": "Note",
            "Note": textData.length > 0 ? textData : `${communication} sent on ${new Date(foundTimelineStep.activity_sent_date).toISOString().split('T')[0]}`,
            "CorrespondenceStatus": "Approved",
        }

        if (fileData) {

            payload['FileName'] = `${communication} ${foundUnit.unit_name}.pdf`.replaceAll(' ', '_')
            payload['File'] = base64Data;
        }

        const url = `${credentials.url}/api/management/2/homeowners/accountCorrespondence`;

        const response = await axios.put(url, payload, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })

        if (response.status === 200) {

            return res.sendStatus(200);

        } else {
            return res.sendStatus(response.status);
        }


        //




    } catch (error) {
        console.log(error);
        res.sendStatus(500);
    }



}





module.exports = { sendCommunicationAttachemnt }