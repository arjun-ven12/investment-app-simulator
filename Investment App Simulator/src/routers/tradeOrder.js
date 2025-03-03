

const express = require('express');
const router = express.Router();

const chartsController = require('../controllers/chartsController');


router.get('/latest-trade-order-buy', chartsController.getLatestLimitOrderControllerBuy);
router.get('/latest-trade-order-sell', chartsController.getLatestLimitOrderControllerSell);


module.exports = router;
