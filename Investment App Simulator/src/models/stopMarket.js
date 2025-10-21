const prisma = require('../../prisma/prismaClient');

// // Create a stop-market order (BUY or SELL)
// module.exports.createStopMarketOrder = async (userId, stockId, quantity, triggerPrice, tradeType) => {
//     const latestPrice = await module.exports.getLatestPrice(stockId);

//     if (tradeType === "BUY") {
//         if (triggerPrice <= latestPrice) {
//             throw new Error(`Buy stop-market trigger (${triggerPrice}) must be higher than current market price (${latestPrice})`);
//         }

//         const user = await prisma.user.findUnique({ where: { id: userId } });
//         const totalCost = quantity * parseFloat(triggerPrice);

//         if (!user || user.wallet < totalCost) {
//             throw new Error("Insufficient funds to place this buy stop-market order");
//         }

//     } else if (tradeType === "SELL") {
//         if (triggerPrice >= latestPrice) {
//             throw new Error(`Sell stop-market trigger (${triggerPrice}) must be lower than current market price (${latestPrice})`);
//         }

//         const trades = await prisma.trade.findMany({ where: { userId, stockId } });
//         const totalOwned = trades.reduce((sum, t) => sum + t.quantity, 0);

//         const pendingOrders = await prisma.stopMarketOrder.findMany({
//             where: { userId, stockId, status: "PENDING", tradeType: "SELL" }
//         });
//         const totalPending = pendingOrders.reduce((sum, o) => sum + o.quantity, 0);

//         if (quantity + totalPending > totalOwned) {
//             throw new Error("Insufficient shares to place this sell stop-market order considering pending orders");
//         }
//     }

//     return prisma.stopMarketOrder.create({
//         data: {
//             userId,
//             stockId,
//             quantity,
//             triggerPrice,
//             tradeType,   // ✅ FIXED
//             status: "PENDING"
//         }
//     });
// };

// // Get user's stop-market orders
// module.exports.getUserStopMarketOrders = async (userId) => {
//   return prisma.stopMarketOrder.findMany({
//     where: { userId },
//     orderBy: { createdAt: 'desc' },
//     select: {
//       id: true,
//       tradeType: true,       // currently STOP_MARKET or STOP_LIMIT
//       quantity: true,
//       triggerPrice: true,
//       limitPrice: true,
//       status: true,
//       createdAt: true,
//       stock: {
//         select: {
//           symbol: true,      // return stock symbol instead of stockId
//         },
//       },
//     },
//   });
// };
// // Process stop-market orders
// module.exports.processStopMarketOrders = async (stockId) => {
//     const pendingOrders = await prisma.StopMarketOrder.findMany({
//         where: { stockId, status: 'PENDING' }
//     });

//     const executedOrders = [];

//     for (const order of pendingOrders) {
//         const latestPrice = await module.exports.getLatestPrice(order.stockId);

//         if (order.tradeType === "BUY" && latestPrice >= parseFloat(order.triggerPrice)) {
//             await prisma.trade.create({
//                 data: {
//                     userId: order.userId,
//                     stockId: order.stockId,
//                     quantity: order.quantity,
//                     tradeType: 'BUY',
//                     price: latestPrice,
//                     totalAmount: latestPrice * order.quantity,
//                 },
//             });
//             await prisma.user.update({
//                 where: { id: order.userId },
//                 data: { wallet: { decrement: latestPrice * order.quantity } }
//             });
//             await prisma.StopMarketOrder.update({
//                 where: { id: order.id },
//                 data: { status: 'EXECUTED', updatedAt: new Date() }
//             });
//             executedOrders.push(order.id);
//             console.log(`Executed BUY stop-market order ${order.id} at ${latestPrice}`);
//         } else if (order.tradeType === "SELL" && latestPrice <= parseFloat(order.triggerPrice)) {
//             await prisma.trade.create({
//                 data: {
//                     userId: order.userId,
//                     stockId: order.stockId,
//                     quantity: order.quantity,
//                     tradeType: 'SELL',
//                     price: latestPrice,
//                     totalAmount: latestPrice * order.quantity,
//                 },
//             });
//             await prisma.StopMarketOrder.update({
//                 where: { id: order.id },
//                 data: { status: 'EXECUTED', updatedAt: new Date() }
//             });
//             executedOrders.push(order.id);
//             console.log(`Executed SELL stop-market order ${order.id} at ${latestPrice}`);
//         }
//     }

//     return executedOrders;
// };





const crypto = require("crypto");


// Create a stop-market order (BUY or SELL)
module.exports.createStopMarketOrder = async (userId, stockId, quantity, triggerPrice, tradeType) => {
  const latestPrice = await module.exports.getLatestPrice(stockId);

  if (tradeType === "BUY") {
    if (triggerPrice <= latestPrice) {
      throw new Error(
        `Buy stop-market trigger (${triggerPrice}) must be higher than current market price (${latestPrice})`
      );
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    const totalCost = quantity * parseFloat(triggerPrice);

    if (!user || user.wallet < totalCost) {
      throw new Error("Insufficient funds to place this buy stop-market order");
    }

  } else if (tradeType === "SELL") {
    if (triggerPrice >= latestPrice) {
      throw new Error(
        `Sell stop-market trigger (${triggerPrice}) must be lower than current market price (${latestPrice})`
      );
    }

    const trades = await prisma.trade.findMany({ where: { userId, stockId } });
    const totalOwned = trades.reduce((sum, t) => sum + t.quantity, 0);

    const pendingOrders = await prisma.stopMarketOrder.findMany({
      where: { userId, stockId, status: "PENDING", tradeType: "SELL" },
    });
    const totalPending = pendingOrders.reduce((sum, o) => sum + o.quantity, 0);

    if (quantity + totalPending > totalOwned) {
      throw new Error(
        "Insufficient shares to place this sell stop-market order considering pending orders"
      );
    }
  }

  return prisma.stopMarketOrder.create({
    data: {
      userId,
      stockId,
      quantity,
      triggerPrice,
      tradeType,
      status: "PENDING",
    },
  });
};

// Get user's stop-market orders
module.exports.getUserStopMarketOrders = async (userId) => {
  return prisma.stopMarketOrder.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      tradeType: true,
      quantity: true,
      triggerPrice: true,
      limitPrice: true,
      status: true,
      createdAt: true,
      stock: {
        select: {
          symbol: true,
        },
      },
    },
  });
};

// Process stop-market orders (execute + log blockchain transaction)
module.exports.processStopMarketOrders = async (stockId) => {
  if (!stockId) throw new Error("Stock ID is required.");

  const pendingOrders = await prisma.stopMarketOrder.findMany({
    where: { stockId, status: "PENDING" },
  });

  const executedOrders = [];

  for (const order of pendingOrders) {
    const latestPrice = await module.exports.getLatestPrice(order.stockId);

    let executed = false;
    let tradeType = order.tradeType;

    if (tradeType === "BUY" && latestPrice >= parseFloat(order.triggerPrice)) {
      await prisma.trade.create({
        data: {
          userId: order.userId,
          stockId: order.stockId,
          quantity: order.quantity,
          tradeType: "BUY",
          price: latestPrice,
          totalAmount: latestPrice * order.quantity,
        },
      });

      await prisma.user.update({
        where: { id: order.userId },
        data: { wallet: { decrement: latestPrice * order.quantity } },
      });

      executed = true;
    } else if (tradeType === "SELL" && latestPrice <= parseFloat(order.triggerPrice)) {
      await prisma.trade.create({
        data: {
          userId: order.userId,
          stockId: order.stockId,
          quantity: order.quantity,
          tradeType: "SELL",
          price: latestPrice,
          totalAmount: latestPrice * order.quantity,
        },
      });

      executed = true;
    }

    if (executed) {
      await prisma.stopMarketOrder.update({
        where: { id: order.id },
        data: { status: "EXECUTED", updatedAt: new Date() },
      });

      // 🔹 Simulate blockchain transaction
      const txHash = "0x" + crypto.randomBytes(16).toString("hex");
      const gasUsed = Math.round(Math.random() * 1000);
      const blockNumber = Math.floor(Math.random() * 1000000);

      try {
        await prisma.blockchainTransaction.create({
          data: {
            userId: order.userId,
            symbol: stockId.toString(),
            tradeType,
            gasUsed,
            transactionHash: txHash,
            blockNumber,
          },
        });

        console.log(
          `✅ Blockchain transaction logged for ${tradeType} stop-market order ${order.id}: ${txHash}`
        );
      } catch (err) {
        console.error("⚠️ Error creating blockchain transaction:", err.message);
      }

      executedOrders.push(order.id);
    }
  }

  return executedOrders;
};

// Process all pending stop-market orders across all stocks
module.exports.processAllPendingOrders = async () => {
    const pendingOrders = await prisma.StopMarketOrder.findMany({ where: { status: 'PENDING' } });
    const executedOrders = [];

    for (const order of pendingOrders) {
        const latestPrice = await module.exports.getLatestPrice(order.stockId);

        if ((order.tradeType === "BUY" && latestPrice >= order.triggerPrice) ||
            (order.tradeType === "SELL" && latestPrice <= order.triggerPrice)) {

            if (order.tradeType === "BUY") {
                await prisma.user.update({ where: { id: order.userId }, data: { wallet: { decrement: latestPrice * order.quantity } } });
            }

            await prisma.trade.create({
                data: { userId: order.userId, stockId: order.stockId, quantity: order.quantity, tradeType: order.tradeType, price: latestPrice, totalAmount: latestPrice * order.quantity }
            });

            await prisma.StopMarketOrder.update({ where: { id: order.id }, data: { status: 'EXECUTED', updatedAt: new Date() } });
            executedOrders.push(order);
            console.log(`Executed ${order.tradeType} stop-market order ${order.id} at ${latestPrice}`);
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


// Cancel a stop-market order
module.exports.cancelStopMarketOrder = async (userId, orderId) => {
    // Find the order
    const order = await prisma.StopMarketOrder.findUnique({
        where: { id: orderId },
    });

    if (!order) {
        throw new Error("Stop-market order not found");
    }

    // Ensure only the owner can cancel
    if (order.userId !== userId) {
        throw new Error("You are not authorized to cancel this order");
    }

    // Only PENDING orders can be cancelled
    if (order.status !== "PENDING") {
        throw new Error("Only pending orders can be cancelled");
    }

    // Update status to CANCELLED
    await prisma.StopMarketOrder.update({
        where: { id: orderId },
        data: { status: "CANCELLED", updatedAt: new Date() },
    });

    // Optionally return updated orders for broadcasting
    return module.exports.getUserStopMarketOrders(userId);
};


// Delete a stop-market order (hard delete from DB)
module.exports.deleteStopMarketOrder = async (userId, orderId) => {
    // Find order
    const order = await prisma.stopMarketOrder.findUnique({
        where: { id: orderId },
    });

    if (!order) {
        throw new Error("Stop-market order not found");
    }

    // Ensure only the owner can delete
    if (order.userId !== userId) {
        throw new Error("You are not authorized to delete this order");
    }

    // Hard delete from DB
    await prisma.stopMarketOrder.delete({
        where: { id: orderId },
    });

    // Return updated orders for broadcasting
    return module.exports.getUserStopMarketOrders(userId);
};
