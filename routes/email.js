const { sendCommunicationEmail } = require('../controllers/communicationController');

const router = require('express').Router();


router.post('/sendCommunicationEmail', sendCommunicationEmail);

module.exports = router