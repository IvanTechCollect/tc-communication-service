const { runNextStep } = require('../controllers/communicationController');
const router = require('express').Router();


router.post('/runNextStep', runNextStep);


module.exports = router;