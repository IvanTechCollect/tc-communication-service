
const { sendCommunicationSMS } = require('../controllers/communicationController');

const router = require('express').Router();


router.post('/sendCommunicationSMS', sendCommunicationSMS);


module.exports = router;