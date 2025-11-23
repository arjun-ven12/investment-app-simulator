
const prisma = require('../../prisma/prismaClient');
const socketBroadcast = require('../socketBroadcast');
const { ethers } = require('ethers');
require("dotenv").config();

const ledgerAbi = require("../../artifacts/contracts/tradeLedger.sol/TradeLedger.json").abi;

// ✅ Hardhat Local Node Provider
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);

// ✅ Signer: Your first Hardhat account
const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

// ✅ Smart Contract
const ledgerContract = new ethers.Contract(
  process.env.LEDGER_ADDRESS,
  ledgerAbi,
  signer
);
const ledger = new ethers.Contract(process.env.LEDGER_ADDRESS, ledgerAbi, signer);

module.exports.createStopLimitOrder = async (userId, stockId, quantity, triggerPrice, limitPrice, tradeType) => {
  // Fetch latest market price
  const latestPriceData = await prisma.intradayPrice3.findFirst({
    where: { stockId },
    orderBy: { date: 'desc' }
  });
  if (!latestPriceData) throw new Error("Cannot fetch latest market price for this stock");
  const currentPrice = parseFloat(latestPriceData.closePrice);

  // Validate quantity
  if (!quantity || quantity <= 0) throw new Error("Quantity must be positive");

  if (tradeType === "SELL") {
    // Check holdings
    const trades = await prisma.trade.findMany({ where: { userId, stockId } });
    const totalOwned = trades.reduce((sum, t) => sum + t.quantity, 0);

    const pendingOrders = await prisma.StopLimitOrder.findMany({
      where: { userId, stockId, status: "PENDING", tradeType: "SELL" }
    });
    const totalPending = pendingOrders.reduce((sum, o) => sum + o.quantity, 0);

    if (quantity + totalPending > totalOwned) {
      throw new Error("Insufficient shares for this sell stop-limit order");
    }

    // SELL validations
    if (triggerPrice >= currentPrice) {
      throw new Error("SELL trigger price must be below current market price");
    }
    if (limitPrice > triggerPrice) {
      throw new Error("SELL limit price must be less than or equal to trigger price");
    }

  } else if (tradeType === "BUY") {
    // Check wallet
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.wallet < limitPrice * quantity) {
      throw new Error("Insufficient funds for this buy stop-limit order");
    }

    // BUY validations
    if (triggerPrice <= currentPrice) {
      throw new Error("BUY trigger price must be above current market price");
    }
    if (limitPrice < triggerPrice) {
      throw new Error("BUY limit price must be greater than or equal to trigger price");
    }
  }

  // Create stop-limit order
  return prisma.StopLimitOrder.create({
    data: { userId, stockId, quantity, triggerPrice, limitPrice, tradeType, status: "PENDING" }
  });
};


module.exports.getUserStopLimitOrders = async (userId) => {
  return prisma.stopLimitOrder.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      tradeType: true,       // already exists in schema
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


module.exports.processStopLimitOrders = async (stockId = null) => {
  const whereClause = { status: "PENDING" };
  if (stockId) whereClause.stockId = stockId;

  const pendingOrders = await prisma.stopLimitOrder.findMany({ where: whereClause });
  const executedOrders = [];

  // Get current nonce from signer for sequential blockchain tx
  let nonce = await provider.getTransactionCount(signer.address);

  for (const order of pendingOrders) {
    const latestPriceData = await prisma.intradayPrice3.findFirst({
      where: { stockId: order.stockId },
      orderBy: { date: "desc" },
    });
    if (!latestPriceData) continue;
    const price = parseFloat(latestPriceData.closePrice);

    let shouldExecute = false;
    if (order.tradeType === "SELL" && price <= order.triggerPrice && price >= order.limitPrice) {
      shouldExecute = true;
      // DB trade
      await prisma.trade.create({
        data: {
          userId: order.userId,
          stockId: order.stockId,
          quantity: order.quantity,
          tradeType: "SELL",
          price,
          totalAmount: price * order.quantity,
        },
      });
    } else if (order.tradeType === "BUY" && price >= order.triggerPrice && price <= order.limitPrice) {
      shouldExecute = true;
      // Update wallet first
      await prisma.user.update({
        where: { id: order.userId },
        data: { wallet: { decrement: price * order.quantity } },
      });
      // DB trade
      await prisma.trade.create({
        data: {
          userId: order.userId,
          stockId: order.stockId,
          quantity: order.quantity,
          tradeType: "BUY",
          price,
          totalAmount: price * order.quantity,
        },
      });
    }

    if (shouldExecute) {
      // Update stop-limit order status
      await prisma.stopLimitOrder.update({
        where: { id: order.id },
        data: { status: "EXECUTED", updatedAt: new Date() },
      });

      executedOrders.push(order);

      console.log(`Executed ${order.tradeType} stop-limit order ${order.id} at ${price}`);

      // Record on blockchain
      try {
        const tx = await ledger.recordTrade(
          order.stockId.toString(),
          order.tradeType,
          order.quantity,
          Math.floor(price), // integer for blockchain
          { nonce }
        );
        const receipt = await tx.wait();

        // Store blockchain tx in DB
        await prisma.blockchainTransaction.create({
          data: {
            userId: order.userId,
            symbol: order.stockId.toString(),
            tradeType: order.tradeType,
            gasUsed: Number(receipt.gasUsed),
            transactionHash: receipt.hash,
            blockNumber: receipt.blockNumber,
          },
        });

        console.log(
          `🧾 Recorded stop-limit trade on blockchain: TxHash ${receipt.hash}, Gas: ${receipt.gasUsed}`
        );

        nonce++; // increment nonce for next tx
      } catch (err) {
        console.error(
          `Error recording stop-limit order ${order.id} on blockchain:`,
          err
        );
      }
    }
  }

  // broadcast updates via socket
  if (executedOrders.length) {
    const users = [...new Set(executedOrders.map((o) => o.userId))];
    for (const userId of users) {
      const updatedOrders = await module.exports.getUserStopLimitOrders(userId);
      socketBroadcast.broadcastStopLimitUpdate(userId, updatedOrders);
    }
  }

  return executedOrders;
};


module.exports.getUserStopLimitOrders = async (userId) => {
  return prisma.stopLimitOrder.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      tradeType: true,
      quantity: true,
      triggerPrice: true,
      limitPrice: true,
      status: true,
      createdAt: true,
      stock: { select: { symbol: true } }
    }
  });
};


// Cancel a stop-limit order (soft cancel)
module.exports.cancelStopLimitOrder = async (userId, orderId) => {
  const order = await prisma.stopLimitOrder.findUnique({
    where: { id: orderId },
  });

  if (!order) throw new Error("Stop-limit order not found");

  if (order.userId !== userId) {
    throw new Error("You are not authorized to cancel this order");
  }

  if (order.status !== "PENDING") {
    throw new Error("Only pending orders can be cancelled");
  }

  await prisma.stopLimitOrder.update({
    where: { id: orderId },
    data: { status: "CANCELLED", updatedAt: new Date() },
  });

  return module.exports.getUserStopLimitOrders(userId);
};

// Delete a stop-limit order (hard delete)
module.exports.deleteStopLimitOrder = async (userId, orderId) => {
  const order = await prisma.stopLimitOrder.findUnique({
    where: { id: orderId },
  });

  if (!order) throw new Error("Stop-limit order not found");

  if (order.userId !== userId) {
    throw new Error("You are not authorized to delete this order");
  }

  await prisma.stopLimitOrder.delete({
    where: { id: orderId },
  });

  return module.exports.getUserStopLimitOrders(userId);
};
