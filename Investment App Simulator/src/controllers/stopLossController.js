const stopLossModel = require('../models/stopLoss');

// Create stop-market order
exports.createStopMarketOrderController = async (req, res) => {
    const { stockId, quantity, triggerPrice, orderType } = req.body;
    const userId = req.user.id; // now comes from token

    if (!stockId || !quantity || !triggerPrice || !orderType) {
        return res.status(400).json({ message: "All fields are required." });
    }

    try {
        const stopOrder = await stopLossModel.createStopMarketOrder(userId, stockId, quantity, triggerPrice, orderType);

        // Immediately attempt to execute it
        const executedOrders = await stopLossModel.processStopMarketOrders(stockId); // pass stockId

        return res.status(201).json({
            message: "Stop-market order created",
            stopOrder,
            executed: executedOrders.length ? true : false
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Error creating stop-market order", error: err.message });
    }
};

// Get user's stop-market orders
exports.getUserStopOrdersController = async (req, res) => {
    const userId = parseInt(req.params.userId);
    if (!userId) return res.status(400).json({ message: "User ID is required" });

    try {
        const orders = await stopLossModel.getUserStopMarketOrders(userId);
        return res.status(200).json({ orders });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Error fetching stop-market orders", error: err.message });
    }
};
