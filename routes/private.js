const { sendCommunicationAttachemnt } = require('../controllers/cincCommunication');

const router = require('express').Router();


router.get('/sendCommunicationToPartner/:unitId/:proactiveId', sendCommunicationAttachemnt);

router.use('/emails', require('./email'));
router.use('/letters', require('./letter'));
router.use('/calls', require('./call'));
router.use('/sms', require('./sms'));



module.exports = router;