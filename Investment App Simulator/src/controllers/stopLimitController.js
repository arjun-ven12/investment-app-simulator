const stopLimitModel = require('../models/stopLimit');
const socketBroadcast = require('../socketBroadcast');

exports.createStopLimitOrderController = async (req, res) => {
  const { stockId, quantity, triggerPrice, limitPrice, tradeType, userId, currentPrice } = req.body;

  if (!stockId || !quantity || !triggerPrice || !limitPrice || !tradeType || !userId, !currentPrice) {
    return res.status(400).json({ message: "All fields are required." });
  }

  try {
    // Create the new order
    console.log (userId, stockId, quantity, triggerPrice, limitPrice, tradeType, currentPrice)
    await stopLimitModel.createStopLimitOrder({ userId, stockId, quantity, triggerPrice, limitPrice, tradeType, currentPrice});

    // Get the full table after creation
    const updatedTable = await stopLimitModel.getUserStopLimitOrders(userId);

    // Broadcast the full table via sockets
    socketBroadcast.broadcastStopLimitUpdate(userId, updatedTable);

    res.status(201).json({ message: "Stop-limit order created", orders: updatedTable });
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: "Error creating stop-limit order", error: err.message });
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


const { Parser } = require("json2csv");

exports.exportStopLimitHistoryController = async function (req, res) {
  let { userId } = req.query;
  if (!userId) {
    return res.status(400).json({ message: "User ID is required" });
  }

  userId = parseInt(userId, 10);
  if (isNaN(userId)) {
    return res.status(400).json({ message: "Invalid User ID" });
  }

  try {
    const orders = await stopLimitModel.getUserStopLimitOrders(userId);

    if (!orders || orders.length === 0) {
      return res.status(404).json({ message: "No stop limit orders found for this user." });
    }

    // Define CSV fields (customize labels as needed)
    const fields = [
      { label: "Date Created (SGT)", value: "createdAt" },
      { label: "Stock Symbol", value: "stock.symbol" },
      { label: "Trade Type", value: "tradeType" },
      { label: "Quantity", value: "quantity" },
      { label: "Trigger Price", value: "triggerPrice" },
      { label: "Limit Price", value: "limitPrice" },
      { label: "Status", value: "status" },
    ];

    const opts = { fields };
    const parser = new Parser(opts);
    const csv = parser.parse(orders);

    // Set response headers for file download
    res.header("Content-Type", "text/csv");
    res.attachment(`stop_limit_orders_user_${userId}.csv`);
    return res.send(csv);
  } catch (error) {
    console.error("Error exporting stop limit orders:", error);
    return res.status(500).json({
      message: "Error exporting stop limit order history",
      error: error.message,
    });
  }
};