const { sendCommunicationCall } = require('../controllers/communicationController')

const router = require('express').Router();


router.post('/sendCommunicationCall', sendCommunicationCall);


module.exports = router;