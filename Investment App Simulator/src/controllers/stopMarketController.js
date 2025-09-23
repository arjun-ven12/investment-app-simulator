const stopMarketModel = require('../models/stopMarket');

// Create stop-market order
exports.createStopMarketOrderController = async (req, res) => {
    const { stockId, quantity, triggerPrice, orderType } = req.body;
    const userId = req.user.id; // from JWT token

    if (!stockId || !quantity || !triggerPrice || !orderType) {
        return res.status(400).json({ message: "All fields are required." });
    }

    try {
        const stopOrder = await stopMarketModel.createStopMarketOrder(
            userId, stockId, quantity, triggerPrice, orderType
        );

        // Immediately attempt to execute orders for this stock
        const executedOrders = await stopMarketModel.processStopMarketOrders(stockId);

        return res.status(201).json({
            message: "Stop-market order created",
            stopOrder,
            executed: executedOrders.length > 0
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
        const orders = await stopMarketModel.getUserStopMarketOrders(userId);
        return res.status(200).json({ orders });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Error fetching stop-market orders", error: err.message });
    }
};
