

const express = require('express');
const router = express.Router();

const chartsController = require('../controllers/chartsController');


router.get('/comments', chartsController.getCommentsController);

router.post('/comments', chartsController.addCommentController);
router.get('/market-status', chartsController.getMarketStatusController);

// router.get('/', chartsController.getAllStocks);
router.get('/favorite', chartsController.getAllFavoriteStocks);
router.post('/favorite/:stockId', chartsController.toggleFavorite);
router.get('/search-stocks', chartsController.searchStocksController);
router.get('/favorite-api', chartsController.getFavoriteStocksController)

router.get('/:symbol', chartsController.getCompanyDetails);
router.post('/buytrade', chartsController.tradeStock);
// router.get('/buytrade', chartsController.tradeStock);
router.get('/id/:symbol', chartsController.getStockIdBySymbol)
router.get('/price/:stock_id', chartsController.getLatestPrice);
router.get('/portfolio/:userId', chartsController.getUserPortfolio);
router.post('/favorite-stock', chartsController.favoriteStockController);
// router.get('/favorite-search-stocks', chartsController.favoriteStockController);
// router.post('/limit-order', chartsController.createLimitOrderController);
// router.post('/process-limit-orders', chartsController.processLimitOrdersController);

router.put('/comments/:commentId', chartsController.updateCommentController);
router.delete('/comments/:commentId', chartsController.deleteCommentController);
router.delete('/favorite-api', chartsController.unfavoriteStockController);



module.exports = router;
