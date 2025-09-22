const prisma = require('../../prisma/prismaClient');


module.exports.createStopMarketOrder = async (userId, stockId, quantity, triggerPrice, orderType) => {
    // Fetch user's current stock holdings
    const trades = await prisma.trade.findMany({
        where: { userId, stockId },
    });
    const totalOwned = trades.reduce((sum, t) => sum + t.quantity, 0);

    // Fetch user's pending stop-loss orders for this stock
    const pendingOrders = await prisma.stopLossOrder.findMany({
        where: {
            userId,
            stockId,
            status: "PENDING",
        },
    });
    const totalPending = pendingOrders.reduce((sum, o) => sum + o.quantity, 0);

    // Check if the new order exceeds available shares
    if (quantity + totalPending > totalOwned) {
        throw new Error("Insufficient shares to place this stop-loss order considering pending orders");
    }

    // Create the stop-market order
    const stopOrder = await prisma.stopLossOrder.create({
        data: {
            userId,
            stockId,
            quantity,
            triggerPrice,
            orderType,
            status: "PENDING",
        },
    });

    return stopOrder;
};

// Get user's stop-market orders
exports.getUserStopMarketOrders = async (userId) => {
    return prisma.StopLossOrder.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
    });
};

exports.processStopMarketOrders = async (stockId) => {
    const pendingOrders = await prisma.stopLossOrder.findMany({ 
        where: { status: 'PENDING', stockId } 
    });

    const executedOrders = [];

    for (const order of pendingOrders) {
        const latestPrice = await exports.getLatestPrice(order.stockId);

        if (latestPrice <= order.triggerPrice) {
            await prisma.trade.create({
                data: {
                    userId: order.userId,
                    stockId: order.stockId,
                    quantity: order.quantity,
                    tradeType: 'SELL',
                    price: latestPrice,
                    totalAmount: latestPrice * order.quantity,
                },
            });

            await prisma.stopLossOrder.update({
                where: { id: order.id },
                data: { status: 'EXECUTED', updatedAt: new Date() },
            });

            executedOrders.push(order.id);
            console.log(`Executed stop-loss order ${order.id} at ${latestPrice}`);
        }
    }

    return executedOrders;
};


exports.getLatestPrice = async (stockId) => {
    const price = await prisma.intradayPrice3.findFirst({
        where: { stockId },
        orderBy: { date: 'desc' }, // latest first
    });

    if (!price) throw new Error('No intraday price data for this stock');
    return parseFloat(price.closePrice); // use closePrice as the "latest" price
};