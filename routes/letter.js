const { sendCommunicationEmail, sendCommunicationLetter } = require('../controllers/communicationController');

const router = require('express').Router();


router.post('/sendCommunicationLetter', sendCommunicationLetter);


module.exports = router;