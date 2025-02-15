const sendgridClient = require('@sendgrid/mail');
require('dotenv').config();

const sendEmail = async (from, to, html, subject, metadata, attachment) => {

    sendgridClient.setApiKey(process.env.SENDGRID_API_KEY);


    try {

        const message = {
            to: to,
            from: from, // Ensure a verified sender email is set
            subject: subject,
            html: html,
            customArgs: metadata || {}, // Ensure metadata is an object
        };

        // Attachments handling
        if (attachment) {
            message.attachments = Array.isArray(attachment) ? attachment : [attachment];
        }

        // Send the email
        await sendgridClient.send(message);

        return true;
    } catch (error) {

        console.log(error?.response?.body);
        return false;
    }


}


module.exports = { sendEmail }