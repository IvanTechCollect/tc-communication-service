const { sendCommunicationAttachemnt } = require('../controllers/cincCommunication');

const router = require('express').Router();


router.get('/sendCommunicationToPartner/:unitId/:proactiveId', sendCommunicationAttachemnt);

router.use('/emails', require('./email'));

router.get('/', async (req, res) => {

    res.send('Welcome');

})


module.exports = router;