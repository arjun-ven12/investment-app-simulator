const prisma = require('../../prisma/prismaClient');

module.exports.createStopLimitOrder = async (userId, stockId, quantity, triggerPrice, limitPrice, tradeType) => {
  if (tradeType === "SELL") {
    // Check user holdings
    const trades = await prisma.trade.findMany({ where: { userId, stockId } });
    const totalOwned = trades.reduce((sum, t) => sum + t.quantity, 0);

    const pendingOrders = await prisma.StopLimitOrder.findMany({
      where: { userId, stockId, status: "PENDING", tradeType: "SELL" }
    });
    const totalPending = pendingOrders.reduce((sum, o) => sum + o.quantity, 0);

    if (quantity + totalPending > totalOwned) {
      throw new Error("Insufficient shares for this sell stop-limit order");
    }
  } else if (tradeType === "BUY") {
    // Check user wallet
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.wallet < limitPrice * quantity) {
      throw new Error("Insufficient funds for this buy stop-limit order");
    }
  }

  return prisma.StopLimitOrder.create({
    data: { userId, stockId, quantity, triggerPrice, limitPrice, tradeType, status: "PENDING" }
  });
};

module.exports.getUserStopLimitOrders = async (userId) => {
  return prisma.StopLimitOrder.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' }
  });
};

module.exports.processStopLimitOrders = async () => {
  const pendingOrders = await prisma.StopLimitOrder.findMany({ where: { status: "PENDING" } });

  for (const order of pendingOrders) {
    const latestPriceData = await prisma.intradayPrice3.findFirst({
      where: { stockId: order.stockId },
      orderBy: { date: 'desc' }
    });
    if (!latestPriceData) continue;
    const price = parseFloat(latestPriceData.closePrice);

    if (order.tradeType === "SELL") {
      if (price <= order.triggerPrice && price >= order.limitPrice) {
        await prisma.trade.create({
          data: {
            userId: order.userId,
            stockId: order.stockId,
            quantity: order.quantity,
            tradeType: 'SELL',
            price,
            totalAmount: price * order.quantity
          }
        });
        await prisma.StopLimitOrder.update({
          where: { id: order.id },
          data: { status: 'EXECUTED', updatedAt: new Date() }
        });
        console.log(`Executed SELL stop-limit order ${order.id} at ${price}`);
      }
    } else if (order.tradeType === "BUY") {
      if (price >= order.triggerPrice && price <= order.limitPrice) {
        // Deduct wallet
        await prisma.user.update({
          where: { id: order.userId },
          data: { wallet: { decrement: price * order.quantity } }
        });
        await prisma.trade.create({
          data: {
            userId: order.userId,
            stockId: order.stockId,
            quantity: order.quantity,
            tradeType: 'BUY',
            price,
            totalAmount: price * order.quantity
          }
        });
        await prisma.StopLimitOrder.update({
          where: { id: order.id },
          data: { status: 'EXECUTED', updatedAt: new Date() }
        });
        console.log(`Executed BUY stop-limit order ${order.id} at ${price}`);
      }
    }
  }
};
