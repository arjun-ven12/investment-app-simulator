const stopLimitModel = require('../models/stopLimit');

exports.createStopLimitOrderController = async (req, res) => {
  const { stockId, quantity, triggerPrice, limitPrice, tradeType } = req.body;
  const userId = req.user.id;

  if (!stockId || !quantity || !triggerPrice || !limitPrice || !tradeType) {
    return res.status(400).json({ message: "All fields are required." });
  }

  try {
    const order = await stopLimitModel.createStopLimitOrder(userId, stockId, quantity, triggerPrice, limitPrice, tradeType);
    const io = req.app.get('io');
    io.to(`user_${userId}`).emit('broadcastStopLimitOrder', order);
    res.status(201).json({ message: "Stop-limit order created", order });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error creating stop-limit order", error: err.message });
  }
};

exports.getUserStopLimitOrdersController = async (req, res) => {
  const userId = parseInt(req.params.userId);
  if (!userId) return res.status(400).json({ message: "User ID is required" });

  try {
    const orders = await stopLimitModel.getUserStopLimitOrders(userId);
    res.status(200).json({ orders });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching stop-limit orders", error: err.message });
  }
};


