const express = require('express');
const router = express.Router();
const stopLossController = require('../controllers/stopLossController');
const jwtMiddleware = require("../middlewares/jwtMiddleware");
// Create a stop-market order
router.post('/create', jwtMiddleware.verifyToken, stopLossController.createStopMarketOrderController);

// Get all stop orders for a user
router.get('/user/:userId', jwtMiddleware.verifyToken, stopLossController.getUserStopOrdersController);

module.exports = router;
