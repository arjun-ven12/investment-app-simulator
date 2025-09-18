const express = require('express');
const router = express.Router();
const referralController = require('../controllers/referralController');

router.get('/:userId', referralController.getReferralController);
router.post('/', referralController.createReferralController);
router.put('/:userId/use', referralController.useReferralLinkController);

module.exports = router;
