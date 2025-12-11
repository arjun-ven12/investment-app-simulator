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
module.exports.createStopLimitOrder = async function ({
  userId,
  stockId,
  quantity,
  triggerPrice, limitPrice,
  tradeType,
  currentPrice
 
}) {
    console.log (userId, stockId, quantity, triggerPrice, limitPrice, tradeType, currentPrice)
  
  if (!userId) throw new Error(`Missing userId ${userId}`);
  if (!["BUY", "SELL"].includes(tradeType)) throw new Error("Invalid trade type");
  if (!quantity || quantity <= 0) throw new Error("Invalid quantity");
  if (!triggerPrice || !limitPrice) throw new Error("Trigger and limit prices are required");

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");

  // BUY STOP-LIMIT
  if (tradeType === "BUY") {
    if (triggerPrice <= currentPrice) {
      throw new Error("BUY trigger must be ABOVE current price");
    }
    if (limitPrice > triggerPrice) {
      throw new Error("BUY limit must be ≤ trigger price");
    }

    const estimatedCost = limitPrice * quantity;
    if (user.wallet < estimatedCost) {
      throw new Error("Insufficient balance for BUY stop-limit order");
    }
  }

  // SELL STOP-LIMIT
  if (tradeType === "SELL") {
    if (triggerPrice >= currentPrice) {
      throw new Error("SELL trigger must be BELOW current price");
    }
    if (limitPrice > triggerPrice) {
      throw new Error("SELL limit must be ≤ trigger price");
    }

    const holding = await prisma.stockHolding.findUnique({
      where: { userId_stockId: { userId, stockId } }
    });

    const owned = holding?.currentQuantity || 0;

    const pendingOrders = await prisma.stopLimitOrder.findMany({
      where: { userId, stockId, status: "PENDING", tradeType: "SELL" }
    });

    const pending = pendingOrders.reduce((s, o) => s + o.quantity, 0);

    if (pending + quantity > owned) {
      throw new Error("Insufficient shares for SELL stop-limit order");
    }
  }

  // Create Order
  const stopOrder = await prisma.stopLimitOrder.create({
    data: {
      userId,
      stockId,
      tradeType,
      quantity,
      triggerPrice,
      limitPrice,
      status: "PENDING",
    }
  });

  return stopOrder;
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

  const totalSale = price * order.quantity;

  // 1️⃣ Decrease Holdings
  await prisma.stockHolding.update({
    where: { userId_stockId: { userId: order.userId, stockId: order.stockId }},
    data: { currentQuantity: { decrement: order.quantity } }
  });

  // 2️⃣ Credit Wallet
  await prisma.user.update({
    where: { id: order.userId },
    data: { wallet: { increment: totalSale } }
  });

  // 3️⃣ Record Trade
  await prisma.trade.create({
    data: {
      userId: order.userId,
      stockId: order.stockId,
      quantity: order.quantity,
      tradeType: "SELL",
      price,
      totalAmount: totalSale,
    },
  });
}

else if (order.tradeType === "BUY" && price >= order.triggerPrice && price <= order.limitPrice) {
  shouldExecute = true;

  // Wallet ↓
  await prisma.user.update({
    where: { id: order.userId },
    data: { wallet: { decrement: price * order.quantity } },
  });

  // Update holdings ↑
  await prisma.stockHolding.upsert({
    where: { userId_stockId: { userId: order.userId, stockId: order.stockId }},
    update: { currentQuantity: { increment: order.quantity }},
    create: {
      userId: order.userId,
      stockId: order.stockId,
      symbol: order.stockId.toString(), // or real symbol
      currentQuantity: order.quantity
    }
  });

  // Record trade
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