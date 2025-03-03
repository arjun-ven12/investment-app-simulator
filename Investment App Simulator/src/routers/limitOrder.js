

const express = require('express');
const router = express.Router();

const chartsController = require('../controllers/chartsController');

router.get('/export', chartsController.exportLimitOrderHistoryController);


router.get('/recommendation', chartsController.getRecommendationsController);

router.get('/:symbol', chartsController.getCompanyDetails);

router.post('/buytrade', chartsController.tradeStock);

// router.get('/favorite-search-stocks', chartsController.favoriteStockController);
router.post('/limit-order', chartsController.createLimitOrderController);
router.post('/process-limit-orders', chartsController.processLimitOrdersController);

router.get('/user-trades', chartsController.getUserTradesController);




module.exports = router;
