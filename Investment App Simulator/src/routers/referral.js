const express = require('express');
const router = express.Router();

const referralController = require('../controllers/referralController');

router.get('/:userId', referralController.getReferralStats);
router.put('/:userId', referralController.updateReferral);
router.post('/', referralController.createReferral);

module.exports = router;