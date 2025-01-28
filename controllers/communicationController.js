// communication controller

const { emailQueue } = require('../jobs/emailJob');

const sendCommunicationEmail = async (req, res) => {


    try {
        const { to, html, subject, unitId, proactiveId } = req.body;

        // Check required fields
        if (!to || !html || !subject || !unitId) {
            return res.status(400).json({ error: 'Missing required fields: to, html, subject, or unitId.' });
        }

        // Add the email job to the queue
        const jobData = { to, html, subject, unitId, proactiveId };
        await emailQueue.addJob(jobData, {
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 1000

            }
        });

        return res.status(200).json({ success: true, message: 'Email is queued for sending.' });

    } catch (error) {
        console.error('Error queuing email job:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }

}


module.exports = { sendCommunicationEmail }    