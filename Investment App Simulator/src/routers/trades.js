

const express = require('express');
const router = express.Router();

const chartsController = require('../controllers/chartsController');

router.get('/user-trades', chartsController.getUserTradesController);

router.get('/export', chartsController.exportTradeHistoryController);

router.get('/user-limit-orders', chartsController.getUserLimitOrdersController);


module.exports = router;
