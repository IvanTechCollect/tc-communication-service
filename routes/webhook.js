const { handleEmailWebhook, handleCallWebhook, callForwardWebhook, handleSmsWebhook } = require('../controllers/webhookController');

const router = require('express').Router();


router.post('/email', handleEmailWebhook);
router.post('/call', handleCallWebhook);
router.post('/call/forward', callForwardWebhook);
router.post('/sms', handleSmsWebhook);
module.exports = router