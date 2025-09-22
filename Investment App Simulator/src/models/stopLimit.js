const prisma = require('../../prisma/prismaClient');

module.exports.createStopLimitOrder = async (userId, stockId, quantity, triggerPrice, limitPrice, orderType) => {
    // Get user's current holdings
    const trades = await prisma.trade.findMany({ where: { userId, stockId } });
    const totalOwned = trades.reduce((sum, t) => sum + t.quantity, 0);

    // Check pending stop-limit orders
    const pendingOrders = await prisma.stopLossOrder.findMany({
        where: { userId, stockId, status: "PENDING", orderType: "STOP_LIMIT" }
    });
    const totalPending = pendingOrders.reduce((sum, o) => sum + o.quantity, 0);

    if (quantity + totalPending > totalOwned) {
        throw new Error("Insufficient shares to place this stop-limit order considering pending orders");
    }

    // Create the order
    return prisma.stopLossOrder.create({
        data: {
            userId,
            stockId,
            quantity,
            triggerPrice,
            limitPrice,
            orderType,
            status: "PENDING"
        }
    });
};

// Get user's stop-limit orders
module.exports.getUserStopLimitOrders = async (userId) => {
    return prisma.stopLossOrder.findMany({
        where: { userId, orderType: "STOP_LIMIT" },
        orderBy: { createdAt: 'desc' }
    });
};

// Process stop-limit orders
module.exports.processStopLimitOrders = async () => {
    const pendingOrders = await prisma.stopLossOrder.findMany({ where: { status: "PENDING", orderType: "STOP_LIMIT" } });

    for (const order of pendingOrders) {
        const latestPrice = await prisma.intradayPrice3.findFirst({
            where: { stockId: order.stockId },
            orderBy: { date: 'desc' }
        });
        if (!latestPrice) continue;
        const price = parseFloat(latestPrice.closePrice);

        // Trigger & limit check (SELL)
        if (price <= order.triggerPrice && price >= order.limitPrice) {
            await prisma.trade.create({
                data: {
                    userId: order.userId,
                    stockId: order.stockId,
                    quantity: order.quantity,
                    tradeType: 'SELL',
                    price,
                    totalAmount: price * order.quantity,
                },
            });

            await prisma.stopLossOrder.update({
                where: { id: order.id },
                data: { status: 'EXECUTED', updatedAt: new Date() }
            });

            console.log(`Executed stop-limit order ${order.id} at ${price}`);
        }
    }
};
