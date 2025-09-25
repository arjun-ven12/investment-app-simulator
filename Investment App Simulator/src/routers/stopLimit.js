const express = require('express');
const router = express.Router();
const stopLimitController = require('../controllers/stopLimitController');
const jwtMiddleware = require("../middlewares/jwtMiddleware");

router.post('/create', jwtMiddleware.verifyToken, stopLimitController.createStopLimitOrderController);
router.get('/user/:userId', jwtMiddleware.verifyToken, stopLimitController.getUserStopLimitOrdersController);

router.post('/process', jwtMiddleware.verifyToken, stopLimitController.processStopLimitOrdersController);

router.post('/cancel/:orderId', jwtMiddleware.verifyToken, stopLimitController.cancelStopLimitOrderController);
router.delete('/:orderId', jwtMiddleware.verifyToken, stopLimitController.deleteStopLimitOrderController);

module.exports = router;
