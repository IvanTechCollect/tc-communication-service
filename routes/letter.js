const { sendCommunicationEmail, sendCommunicationLetter, getCommunicationLetterSAS } = require('../controllers/communicationController');

const router = require('express').Router();


router.post('/sendCommunicationLetter', sendCommunicationLetter);
router.get('/getCommunicationLetterLink/:unitId/:stepNumber', getCommunicationLetterSAS);

module.exports = router;