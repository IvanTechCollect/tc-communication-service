const twilio = require("twilio");
const { applyDataToTemplate } = require("./dataController");
const { htmlToString } = require("../helpers/helpers");
const { extractTemplate } = require('./templateController');
const ProactiveRoadmap = require("../models/ProactiveRoadmap");
const Unit = require("../models/Unit");
require('dotenv').config();



const accountSid = process.env.TWILIO_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

const client = new twilio(accountSid, authToken);

const checkPhoneNumber = async (phoneNumber) => {
    try {
        const response = await client.lookups.v2.phoneNumbers(phoneNumber)
            .fetch({ type: ["carrier"] });

        console.log("Phone Number:", response.phoneNumber);
        console.log("Valid:", response.valid);


        return response.valid; // true if the number is valid, false otherwise
    } catch (error) {
        console.error("Error checking phone number:", error.message);
        return false;
    }
};



const makeCall = async (data) => {

    try {



        const { proactiveId, unitId } = data;

        const foundUnit = await Unit.query().where('id', unitId).first();
        const communityId = foundUnit.community;
        const companyId = foundUnit.company_id;
        const preferredLanguage = foundUnit.preferred_language;
        const phoneNumber = foundUnit.phone;

        const isValid = await checkPhoneNumber(phoneNumber);

        if (!isValid) {

            console.log("❌ Invalid phone number.");

            return res.status(400).json({ error: 'Invalid Phone Number' });
        }
        console.clear();
        console.log("✅ The phone number is valid!");

        const foundTimelineStep = await ProactiveRoadmap.query().where('id', proactiveId).first();

        const ruleId = foundTimelineStep.rule_id;

        const foundTemplate = await extractTemplate('CALL', ruleId, communityId, companyId);

        if (!foundTemplate) {

            return false;
        }

        let content = htmlToString(foundTemplate);


        const formattedTemplateData = await applyDataToTemplate(unitId, content);

        content = formattedTemplateData.content;

        if (preferredLanguage !== 'en') {

            const { translateToDifferentLanguage } = await import('./aiController.mjs');
            console.log('Using AI to translate');

            content = await translateToDifferentLanguage(content, preferredLanguage);
        }

        let voice = 'Polly.Matthew';
        let voiceLanguage = 'en-US';

        switch (preferredLanguage) {

            case 'es':
                voice = 'Polly.Miguel';
                voiceLanguage = 'es-MX';
                break;
            default:
                break;
        }


        const twiml = new twilio.twiml.VoiceResponse();

        if (content.includes('|PAUSE|')) {
            for (let portion of content.split('|PAUSE|')) {
                if (portion.trim().length > 0) { // Skip empty text portions
                    twiml.say({ language: voiceLanguage, voice: voice, }, portion);
                }
                twiml.pause({ length: 1 })
            }
        } else {
            twiml.say({ language: voiceLanguage, voice: voice, }, content);
        }



        const gather = twiml.gather({
            input: 'dtmf',
            numDigits: 1,
            timeout: 5,
            action: `https://tc-communications.onrender.com/webhooks/call/forward?` +
                `proactiveId=${encodeURIComponent(proactiveId)}&` +
                `userPhone=${encodeURIComponent(phoneNumber)}&` +
                `companyPhone=${encodeURIComponent('+15038805879')}`,
            method: "POST"
        });



        gather.say({ voice: 'Polly.Matthew', language: 'en-US' },
            "To speak with a representative, press 1 now.");

        twiml.pause({ length: 5 });
        twiml.hangup();


        const call = await client.calls
            .create({
                twiml: twiml.toString(),  // Directly pass TwiML instructions
                to: `+1${phoneNumber}`,  // Replace with recipient's phone number
                from: process.env.TWILIO_NUMBER, // Replace with your Twilio phone number
                statusCallbackEvent: ['answered', 'completed',],
                statusCallback: `https://tc-communications.onrender.com/webhooks/call?proactiveId=${proactiveId}`,
                statusCallbackMethod: "POST",
                machineDetection: "Enable", // Enable voicemail detection
            });



        await ProactiveRoadmap.query().where('id', proactiveId).update({
            sent_text_data: content.replaceAll('|PAUSE|', ''),
            voiceId: call.sid
        });

        return true;
    } catch (error) {

        console.log(error);;
    }

}


const forwardCallToClient = async (data) => {

    const { Digits, companyPhone } = data;

    const twiml = new twilio.twiml.VoiceResponse();

    if (Digits === "1") {
        console.log("📞 User pressed 1 - Forwarding call...");

        twiml.say("Connecting you to an agent now.");

        twiml.dial(companyPhone);

    } else {
        console.log("❌ User did not press 1 - Call ended.");
        twiml.say("Thank you for your time. Goodbye.");
    }


    return twiml.toString();


}


const sendSMS = async (data) => {

    try {

        const { proactiveId, unitId } = data;

        const foundUnit = await Unit.query().where('id', unitId).first();
        const communityId = foundUnit.community;
        const companyId = foundUnit.company_id;
        const preferredLanguage = foundUnit.preferred_language;
        const phoneNumber = foundUnit.phone;

        const isValid = await checkPhoneNumber(phoneNumber);

        if (!isValid) {

            console.log("❌ Invalid phone number.");
            await ProactiveRoadmap.query().where('id', proactiveId).update({ status: -1 });
            return res.status(400).json({ error: 'Invalid Phone Number' });
        }
        console.clear();
        console.log("✅ The phone number is valid!");

        const foundTimelineStep = await ProactiveRoadmap.query().where('id', proactiveId).first();

        const ruleId = foundTimelineStep.rule_id;

        const foundTemplate = await extractTemplate('CALL', ruleId, communityId, companyId);

        if (!foundTemplate) {

            return false;
        }

        let content = htmlToString(foundTemplate);


        const formattedTemplateData = await applyDataToTemplate(unitId, content);

        content = formattedTemplateData.content;

        if (preferredLanguage !== 'en') {

            const { translateToDifferentLanguage } = await import('./aiController.mjs');
            console.log('Using AI to translate');

            content = await translateToDifferentLanguage(content, preferredLanguage);
        }

        const twilioResponse = await client.messages.create({
            body: content,
            from: process.env.TWILIO_NUMBER,
            to: phoneNumber,
            statusCallback: `https://tc-communications.onrender.com/webhooks/sms?proactiveId=${proactiveId}`, // Your webhook URL
            statusCallbackMethod: 'POST'
        });

        if (!twilioResponse) {
            return false;
        }

        await ProactiveRoadmap.query().where('id', proactiveId).update({ sent_text_data: content, activity_sent_date: new Date() });
        console.log('SMS SENT');
        return true;

    } catch (error) {
        console.log(error);
        return false;
    }


}


module.exports = { makeCall, checkPhoneNumber, forwardCallToClient, sendSMS };