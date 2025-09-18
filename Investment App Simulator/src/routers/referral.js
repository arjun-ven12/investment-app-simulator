const express = require('express');
const router = express.Router();
const referralController = require('../controllers/referralController');

router.get('/:userId', referralController.getReferralController);
router.post('/', referralController.createReferralController);
router.put('/:userId/use', referralController.useReferralLinkController);

router.get('/:userId/history', referralController.getReferralHistoryController);
module.exports = router;
