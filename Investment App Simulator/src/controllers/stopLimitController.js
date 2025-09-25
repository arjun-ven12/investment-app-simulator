const stopLimitModel = require('../models/stopLimit');
const socketBroadcast = require('../socketBroadcast');

exports.createStopLimitOrderController = async (req, res) => {
  const { stockId, quantity, triggerPrice, limitPrice, tradeType } = req.body;
  const userId = req.user.id;

  if (!stockId || !quantity || !triggerPrice || !limitPrice || !tradeType) {
    return res.status(400).json({ message: "All fields are required." });
  }

  try {
    // Create the new order
    await stopLimitModel.createStopLimitOrder(userId, stockId, quantity, triggerPrice, limitPrice, tradeType);

    // Get the full table after creation
    const updatedTable = await stopLimitModel.getUserStopLimitOrders(userId);

    // Broadcast the full table via sockets
    socketBroadcast.broadcastStopLimitUpdate(userId, updatedTable);

    res.status(201).json({ message: "Stop-limit order created", orders: updatedTable });
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


exports.processStopLimitOrdersController = async (req, res) => {
  try {
    const { stockId } = req.body; // optional, process only this stock if provided
    await stopLimitModel.processStopLimitOrders(stockId);
    res.status(200).json({ message: 'Stop-limit orders processed successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error processing stop-limit orders', error: err.message });
  }
};


// Cancel stop-limit order
exports.cancelStopLimitOrderController = async (req, res) => {
  const { orderId } = req.params;
  const userId = req.user.id;

  if (!orderId) return res.status(400).json({ message: "Order ID is required" });

  try {
    const updatedOrders = await stopLimitModel.cancelStopLimitOrder(userId, parseInt(orderId));
    socketBroadcast.broadcastStopLimitUpdate(userId, updatedOrders);

    res.status(200).json({ message: "Stop-limit order cancelled", orders: updatedOrders });
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: err.message });
  }
};

// Delete stop-limit order
exports.deleteStopLimitOrderController = async (req, res) => {
  const { orderId } = req.params;
  const userId = req.user.id;

  if (!orderId) return res.status(400).json({ message: "Order ID is required" });

  try {
    const updatedOrders = await stopLimitModel.deleteStopLimitOrder(userId, parseInt(orderId));
    socketBroadcast.broadcastStopLimitUpdate(userId, updatedOrders);

    res.status(200).json({ message: "Stop-limit order deleted", orders: updatedOrders });
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: err.message });
  }
};
