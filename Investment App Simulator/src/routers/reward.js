const express = require('express');
const router = express.Router();
const rewardController = require('../controllers/rewardController');

router.get('/rewards', rewardController.getAllRewards);
router.post('/redeem', rewardController.redeemReward);
router.get('/history/:userId', rewardController.getRedeemByUserId);
router.post('/spin', rewardController.spinReward);
router.get('/winners', rewardController.getGrandPrizeWinners);

module.exports = router;
