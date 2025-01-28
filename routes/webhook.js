const { handleEmailWebhook } = require('../controllers/webhookController');

const router = require('express').Router();


router.post('/email', handleEmailWebhook);

module.exports = router