const express = require('express');
const router = express.Router();
const stopMarketController = require('../controllers/stopMarketController');
const jwtMiddleware = require("../middlewares/jwtMiddleware");

// Create a stop-market order (BUY or SELL)
router.post('/create', jwtMiddleware.verifyToken, stopMarketController.createStopMarketOrderController);

// Get all stop-market orders for a user
router.get('/user/:userId', jwtMiddleware.verifyToken, stopMarketController.getUserStopOrdersController);
router.post('/process', jwtMiddleware.verifyToken, stopMarketController.processStopMarketOrdersController);
// Cancel a stop-market order
router.post('/cancel/:orderId', jwtMiddleware.verifyToken, stopMarketController.cancelStopMarketOrderController);
// Delete a stop-market order
router.delete('/:orderId', jwtMiddleware.verifyToken, stopMarketController.deleteStopMarketOrderController);


module.exports = router;
