

const express = require('express');
// const { getAllPersons } = require('../models/Person.model');
const router = express.Router();

const optionsController = require('../controllers/optionsController');


router.get('/contracts/:symbol', optionsController.getContractsBySymbol);

router.get('/ohlc/:symbol', optionsController.getOptionOHLCBySymbol);

router.get('/trades', optionsController.getUserOptionTradesController);

router.get('/portfolio', optionsController.getUserOptionPortfolio);

router.post('/cancel/:id', optionsController.cancelOptionLimitOrderController);

// Place a Buy Call order (Market or Limit)
router.post('/buy-call', optionsController.placeBuyCallOrder);

// Execute pending limit Buy Call orders
router.post('/execute-buy-call-limit', optionsController.executePendingLimitCalls);

// Settle a Buy Call trade (calculate P/L)
router.post('/settle-buy-call', optionsController.settleExpiredBuyCallTrades);

// Place Sell Call (MARKET or LIMIT)
router.post('/sell-call/', optionsController.placeSellCallOrder);

// Execute pending Sell Call LIMIT orders
router.post('/execute-sell-call-limit', optionsController.executeSellCallLimitOrders);

// Settle Sell Call at expiration
router.post('/settle-sell-call', optionsController.settleExpiredSellCallTrades);


router.post('/buy-put', optionsController.placeBuyPutOrder);

router.post('/execute-buy-put-limit', optionsController.executeBuyPutLimitOrders);

router.post('/settle-buy-put', optionsController.settleBuyPutOrders);

// Place a new Sell Put order (Market or Limit)
router.post('/sell-put', optionsController.placeSellPutOrder);

// Execute all pending Sell Put LIMIT orders
router.post('/execute-sell-put-limit', optionsController.executeSellPutLimitOrders);

// Settle all expired Sell Put MARKET trades
router.post('/settle-sell-put', optionsController.settleExpiredSellPutTrades);

router.get('/export', optionsController.exportOptionTradeHistoryController);

module.exports = router;
