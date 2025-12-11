const prisma = require('../../prisma/prismaClient');
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

// Create a stop-market order (BUY or SELL)

module.exports.createStopMarketOrder = async function (userId, stockId, quantity, triggerPrice, tradeType) {
    if (!userId) throw new Error("Missing userId");

    const latestPrice = await module.exports.getLatestPrice(stockId);

    // ---------------- BUY STOP-MARKET ----------------
    if (tradeType === "BUY") {

        if (triggerPrice <= latestPrice) {
            throw new Error(`Buy stop-market trigger (${triggerPrice}) must be higher than current market price (${latestPrice})`);
        }

        const user = await prisma.user.findUnique({ where: { id: userId } });
        const totalCost = quantity * parseFloat(triggerPrice);

        if (!user || user.wallet < totalCost) {
            throw new Error("Insufficient funds to place this buy stop-market order");
        }
    }

    // ---------------- SELL STOP-MARKET ----------------
    else if (tradeType === "SELL") {

        if (triggerPrice >= latestPrice) {
            throw new Error(`Sell stop-market trigger (${triggerPrice}) must be lower than current market price (${latestPrice})`);
        }

        // Read stockHoldings instead of reading trades
        const holding = await prisma.stockHolding.findUnique({
            where: { userId_stockId: { userId, stockId } }
        });

        const totalOwned = holding?.currentQuantity ?? 0;

        // Count pending SELL stop-market orders
        const pendingOrders = await prisma.stopMarketOrder.findMany({
            where: { userId, stockId, status: "PENDING", tradeType: "SELL" }
        });

        const totalPending = pendingOrders.reduce((sum, o) => sum + o.quantity, 0);

        if (quantity + totalPending > totalOwned) {
            throw new Error("Insufficient shares (including reserved shares) to place this sell stop-market order");
        }
    }

    // Create order
    return prisma.stopMarketOrder.create({
        data: {
            userId,
            stockId,
            quantity,
            triggerPrice,
            tradeType,
            status: "PENDING"
        }
    });
};


module.exports.processStopMarketOrders = async (stockId) => {
  const pendingOrders = await prisma.stopMarketOrder.findMany({
    where: { stockId, status: "PENDING" },
  });

  const executedOrders = [];

  let nonce = await provider.getTransactionCount(signer.address);

  for (const order of pendingOrders) {
    const latestPrice = await module.exports.getLatestPrice(order.stockId);

    const isBuyTriggered =
      order.tradeType === "BUY" && latestPrice >= parseFloat(order.triggerPrice);
    const isSellTriggered =
      order.tradeType === "SELL" && latestPrice <= parseFloat(order.triggerPrice);

    if (!isBuyTriggered && !isSellTriggered) continue;

    const totalAmount = latestPrice * order.quantity;

    // ---------------- WALLET UPDATE ----------------
    if (order.tradeType === "BUY") {
      await prisma.user.update({
        where: { id: order.userId },
        data: { wallet: { decrement: totalAmount } }
      });
    } else {
      await prisma.user.update({
        where: { id: order.userId },
        data: { wallet: { increment: totalAmount } }
      });
    }

    // ---------------- STOCK HOLDING UPDATE ----------------
    if (order.tradeType === "BUY") {
      await prisma.stockHolding.upsert({
        where: { userId_stockId: { userId: order.userId, stockId: order.stockId } },
        update: { currentQuantity: { increment: order.quantity } },
        create: {
          userId: order.userId,
          stockId: order.stockId,
          symbol: "", // optional if you want to fill symbol
          currentQuantity: order.quantity
        }
      });
    } else if (order.tradeType === "SELL") {
      await prisma.stockHolding.update({
        where: { userId_stockId: { userId: order.userId, stockId: order.stockId } },
        data: { currentQuantity: { decrement: order.quantity } }
      });
    }

    // ---------------- RECORD TRADE (same as before) ----------------
    const trade = await prisma.trade.create({
      data: {
        userId: order.userId,
        stockId: order.stockId,
        quantity: order.quantity,
        tradeType: order.tradeType,
        price: latestPrice,
        totalAmount,
      },
    });

    await prisma.stopMarketOrder.update({
      where: { id: order.id },
      data: { status: "EXECUTED", updatedAt: new Date() },
    });

    executedOrders.push(order.id);

    // ---------------- BLOCKCHAIN LOGIC (unchanged) ----------------
    try {
      const tx = await ledger.recordTrade(
        order.stockId.toString(),
        order.tradeType,
        order.quantity,
        Math.floor(latestPrice),
        { nonce }
      );
      const receipt = await tx.wait();

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

      nonce++;
    } catch (err) {
      console.error("Error recording trade on blockchain:", err);
    }
  }

  return executedOrders;
};


// Process all pending stop-market orders across all stocks with blockchain integration
module.exports.processAllPendingOrders = async () => {
  const pendingOrders = await prisma.stopMarketOrder.findMany({
    where: { status: "PENDING" },
  });

  const executedOrders = [];

  // Get current nonce from signer for sequential blockchain transactions
  let nonce = await provider.getTransactionCount(signer.address);

  for (const order of pendingOrders) {
    const latestPrice = await module.exports.getLatestPrice(order.stockId);

    const isBuyTriggered =
      order.tradeType === "BUY" && latestPrice >= parseFloat(order.triggerPrice);
    const isSellTriggered =
      order.tradeType === "SELL" && latestPrice <= parseFloat(order.triggerPrice);

    if (isBuyTriggered || isSellTriggered) {
      const totalAmount = latestPrice * order.quantity;

      // Update user wallet for BUY/SELL
if (order.tradeType === "BUY") {
  await prisma.user.update({
    where: { id: order.userId },
    data: { wallet: { decrement: totalAmount } },
  });

  await prisma.stockHolding.upsert({
    where: { userId_stockId: { userId: order.userId, stockId: order.stockId } },
    update: { currentQuantity: { increment: order.quantity } },
    create: {
      userId: order.userId,
      stockId: order.stockId,
      symbol: "",
      currentQuantity: order.quantity
    }
  });

} else if (order.tradeType === "SELL") {
  await prisma.user.update({
    where: { id: order.userId },
    data: { wallet: { increment: totalAmount } },
  });

  await prisma.stockHolding.update({
    where: { userId_stockId: { userId: order.userId, stockId: order.stockId } },
    data: { currentQuantity: { decrement: order.quantity } }
  });
}


      // Create DB trade
      const trade = await prisma.trade.create({
        data: {
          userId: order.userId,
          stockId: order.stockId,
          quantity: order.quantity,
          tradeType: order.tradeType,
          price: latestPrice,
          totalAmount,
        },
      });

      // Update stop-market order status
      await prisma.stopMarketOrder.update({
        where: { id: order.id },
        data: { status: "EXECUTED", updatedAt: new Date() },
      });

      executedOrders.push(order.id);
      console.log(
        `Executed ${order.tradeType} stop-market order ${order.id} at ${latestPrice}`
      );

      // Record trade on blockchain
      try {
        const tx = await ledger.recordTrade(
          order.stockId.toString(),
          order.tradeType,
          order.quantity,
          Math.floor(latestPrice), // convert to integer
          { nonce }
        );
        const receipt = await tx.wait();

        // Store blockchain transaction in DB
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
          `🧾 Recorded trade on blockchain: TxHash ${receipt.hash}, Gas: ${receipt.gasUsed}`
        );

        nonce++; // increment nonce for next transaction
      } catch (err) {
        console.error(
          `Error recording ${order.tradeType} stop-market order ${order.id} on blockchain:`,
          err
        );
      }
    }
  }

  return executedOrders;
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
    const order = await prisma.stopMarketOrder.findUnique({
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
    await prisma.stopMarketOrder.update({
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