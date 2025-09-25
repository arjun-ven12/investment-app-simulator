const prisma = require('../../prisma/prismaClient');

// Create a stop-market order (BUY or SELL)
module.exports.createStopMarketOrder = async (userId, stockId, quantity, triggerPrice, tradeType) => {
    const latestPrice = await module.exports.getLatestPrice(stockId);

    if (tradeType === "BUY") {
        if (triggerPrice <= latestPrice) {
            throw new Error(`Buy stop-market trigger (${triggerPrice}) must be higher than current market price (${latestPrice})`);
        }

        const user = await prisma.user.findUnique({ where: { id: userId } });
        const totalCost = quantity * parseFloat(triggerPrice);

        if (!user || user.wallet < totalCost) {
            throw new Error("Insufficient funds to place this buy stop-market order");
        }

    } else if (tradeType === "SELL") {
        if (triggerPrice >= latestPrice) {
            throw new Error(`Sell stop-market trigger (${triggerPrice}) must be lower than current market price (${latestPrice})`);
        }

        const trades = await prisma.trade.findMany({ where: { userId, stockId } });
        const totalOwned = trades.reduce((sum, t) => sum + t.quantity, 0);

        const pendingOrders = await prisma.stopMarketOrder.findMany({
            where: { userId, stockId, status: "PENDING", tradeType: "SELL" }
        });
        const totalPending = pendingOrders.reduce((sum, o) => sum + o.quantity, 0);

        if (quantity + totalPending > totalOwned) {
            throw new Error("Insufficient shares to place this sell stop-market order considering pending orders");
        }
    }

    return prisma.stopMarketOrder.create({
        data: {
            userId,
            stockId,
            quantity,
            triggerPrice,
            tradeType,   // ✅ FIXED
            status: "PENDING"
        }
    });
};

// Get user's stop-market orders
module.exports.getUserStopMarketOrders = async (userId) => {
  return prisma.stopMarketOrder.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      tradeType: true,       // currently STOP_MARKET or STOP_LIMIT
      quantity: true,
      triggerPrice: true,
      limitPrice: true,
      status: true,
      createdAt: true,
      stock: {
        select: {
          symbol: true,      // return stock symbol instead of stockId
        },
      },
    },
  });
};
// Process stop-market orders
module.exports.processStopMarketOrders = async (stockId) => {
    const pendingOrders = await prisma.StopMarketOrder.findMany({
        where: { stockId, status: 'PENDING' }
    });

    const executedOrders = [];

    for (const order of pendingOrders) {
        const latestPrice = await module.exports.getLatestPrice(order.stockId);

        if (order.tradeType === "BUY" && latestPrice >= parseFloat(order.triggerPrice)) {
            await prisma.trade.create({
                data: {
                    userId: order.userId,
                    stockId: order.stockId,
                    quantity: order.quantity,
                    tradeType: 'BUY',
                    price: latestPrice,
                    totalAmount: latestPrice * order.quantity,
                },
            });
            await prisma.user.update({
                where: { id: order.userId },
                data: { wallet: { decrement: latestPrice * order.quantity } }
            });
            await prisma.StopMarketOrder.update({
                where: { id: order.id },
                data: { status: 'EXECUTED', updatedAt: new Date() }
            });
            executedOrders.push(order.id);
            console.log(`Executed BUY stop-market order ${order.id} at ${latestPrice}`);
        } else if (order.tradeType === "SELL" && latestPrice <= parseFloat(order.triggerPrice)) {
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
            await prisma.StopMarketOrder.update({
                where: { id: order.id },
                data: { status: 'EXECUTED', updatedAt: new Date() }
            });
            executedOrders.push(order.id);
            console.log(`Executed SELL stop-market order ${order.id} at ${latestPrice}`);
        }
    }

    return executedOrders;
};

// Get latest stock price
module.exports.getLatestPrice = async (stockId) => {
    const price = await prisma.intradayPrice3.findFirst({
        where: { stockId },
        orderBy: { date: 'desc' }
    });
    if (!price) throw new Error('No intraday price data for this stock');
    return parseFloat(price.closePrice);
};
