const stopMarketModel = require('../models/stopMarket');
const { broadcastStopMarketUpdate } = require('../socketBroadcast');


// Create stop-market order
exports.createStopMarketOrderController = async (req, res) => {
    const { stockId, quantity, triggerPrice, orderType } = req.body;
    const userId = req.user.id;

    if (!stockId || !quantity || !triggerPrice || !orderType) {
        return res.status(400).json({ message: "All fields are required." });
    }

    try {
        // 1️⃣ Create the new stop-market order
        await stopMarketModel.createStopMarketOrder(
            userId, stockId, quantity, triggerPrice, orderType
        );

        // 2️⃣ Process any pending stop-market orders for this stock
        await stopMarketModel.processStopMarketOrders(stockId);

        // 3️⃣ Fetch the full updated stop-market table for this user
        const updatedOrders = await stopMarketModel.getUserStopMarketOrders(userId);

        // 4️⃣ Broadcast the updated table to the frontend
        broadcastStopMarketUpdate(userId, updatedOrders);

        return res.status(201).json({
            message: "Stop-market order created and table updated",
            orders: updatedOrders
        });

    } catch (err) {
        console.error(err);

        if (err.message.includes("Buy stop-market trigger") ||
            err.message.includes("Sell stop-market trigger") ||
            err.message.includes("Insufficient")) {
            return res.status(400).json({ message: err.message });
        }

        return res.status(500).json({ message: "Internal server error", error: err.message });
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
// Process all pending stop-market orders (for cron)
exports.processStopMarketOrdersController = async (req, res) => {
    try {
        // Optional: accept stockId to process one stock, or leave empty for all
        const { stockId } = req.body;

        // If stockId is provided, process only that stock; otherwise process all pending orders
        const executedOrders = stockId
            ? await stopMarketModel.processStopMarketOrders(stockId)
            : await stopMarketModel.processAllPendingOrders();

        // Broadcast updated tables to all affected users
        if (executedOrders.length) {
            for (const userId of executedOrders.map(o => o.userId)) {
                const orders = await stopMarketModel.getUserStopMarketOrders(userId);
                broadcastStopMarketUpdate(userId, orders);
            }
        }

        res.status(200).json({ message: "Stop-market orders processed", executedOrders });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error processing stop-market orders", error: err.message });
    }
};

// Cancel stop-market order controller
exports.cancelStopMarketOrderController = async (req, res) => {
    const orderId = parseInt(req.params.orderId, 10);
    const userId = req.user.id;

    if (!orderId) return res.status(400).json({ message: "Order ID is required" });

    try {
        const updatedOrders = await stopMarketModel.cancelStopMarketOrder(userId, orderId);

        // Broadcast updated orders to frontend
        broadcastStopMarketUpdate(userId, updatedOrders);

        res.status(200).json({ message: "Stop-market order cancelled", orders: updatedOrders });
    } catch (err) {
        console.error(err);

        if (err.message.includes("not found") || err.message.includes("authorized") || err.message.includes("pending")) {
            return res.status(400).json({ message: err.message });
        }

        res.status(500).json({ message: "Internal server error", error: err.message });
    }
};

// Delete stop-market order controller
exports.deleteStopMarketOrderController = async (req, res) => {
    const orderId = req.params.id;
    const userId = req.user.id;

    if (!orderId) return res.status(400).json({ message: "Order ID is required" });

    try {
        const updatedOrders = await stopMarketModel.deleteStopMarketOrder(userId, parseInt(orderId));

        // Broadcast updated orders to frontend
        broadcastStopMarketUpdate(userId, updatedOrders);

        res.status(200).json({ message: "Stop-market order deleted", orders: updatedOrders });
    } catch (err) {
        console.error(err);

        if (err.message.includes("not found") || err.message.includes("authorized")) {
            return res.status(400).json({ message: err.message });
        }

        res.status(500).json({ message: "Internal server error", error: err.message });
    }
};
