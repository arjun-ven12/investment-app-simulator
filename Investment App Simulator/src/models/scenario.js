const prisma = require('./prismaClient');
const API_KEY = '26d603eb0f773cc49609fc81898d4b9c';


// --- SCENARIO CRUD ---
module.exports.createScenario = async (data) => {
  return prisma.scenario.create({
    data: {
      title: data.title,
      description: data.description,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      startingBalance: data.startingBalance,
      allowedStocks: data.allowedStocks || [],
      rules: data.rules || null,
    },
  });
};

module.exports.getAllScenarios = async () => {
  return prisma.scenario.findMany({
    orderBy: { startDate: 'asc' },
  });
};

module.exports.getScenarioById = async (id) => {
  const scenario = await prisma.scenario.findUnique({
    where: { id: Number(id) },
    include: { participants: true },
  });
  if (!scenario) throw new Error('Scenario not found');
  return scenario;
};

module.exports.updateScenario = async (id, data) => {
  return prisma.scenario.update({
    where: { id: Number(id) },
    data: {
      title: data.title,
      description: data.description,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      endDate: data.endDate ? new Date(data.endDate) : undefined,
      startingBalance: data.startingBalance,
      allowedStocks: data.allowedStocks,
      rules: data.rules,
    },
  });
};

module.exports.deleteScenario = async (id) => {
  return prisma.scenario.delete({ where: { id: Number(id) } });
};

// --- JOIN SCENARIO ---
module.exports.joinScenario = async (scenarioId, userId) => {
  const scenario = await prisma.scenario.findUnique({ where: { id: Number(scenarioId) } });
  if (!scenario) throw new Error('Scenario not found');

  const existing = await prisma.scenarioParticipant.findFirst({
    where: { scenarioId: Number(scenarioId), userId },
  });
  if (existing) throw new Error('Already joined');

  const participant = await prisma.scenarioParticipant.create({
    data: {
      scenarioId: Number(scenarioId),  // <-- convert to Int
      userId,
      cashBalance: scenario.startingBalance,
    }
  });

  return participant;
};


// --- LEADERBOARD ---
module.exports.getLeaderboard = async (scenarioId) => {
  return prisma.scenarioParticipant.findMany({
    where: { scenarioId: Number(scenarioId) },
    orderBy: { finalRank: 'asc' },
    include: { holdings: true },
  });
};

module.exports.getJoinedScenarios = async (userId) => {
  const joined = await prisma.scenarioParticipant.findMany({
    where: { userId },
    include: { scenario: true },
    orderBy: { joinedAt: 'desc' },
  });
  return joined.map((jp) => jp.scenario);
};

// --- REPLAY DATA ---
module.exports.getReplayData = async (symbol) => {
  const stock = await prisma.stock.findUnique({ where: { symbol } });
  if (!stock) throw new Error("Stock not found");

  const data = await prisma.intradayPrice3.findMany({
    where: { stockId: stock.stock_id },
    orderBy: { date: 'asc' },
  });

  return data.map(d => ({
    date: d.date,
    open: d.openPrice,
    high: d.highPrice,
    low: d.lowPrice,
    close: d.closePrice,
    volume: d.volume,
  }));
};

module.exports.getReplayProgress = async (userId, scenarioId, symbol) => {
  const progress = await prisma.scenarioReplayProgress.findUnique({
    where: { userId_scenarioId_symbol: { userId, scenarioId, symbol } },
  });
  return progress || { lastIndex: 0, speed: 1 };
};

module.exports.saveReplayProgress = async (userId, scenarioId, symbol, lastIndex, speed) => {
  return prisma.scenarioReplayProgress.upsert({
    where: { userId_scenarioId_symbol: { userId, scenarioId, symbol } },
    update: { lastIndex, speed, updatedAt: new Date() },
    create: { userId, scenarioId, symbol, lastIndex, speed },
  });
};



module.exports.executeMarketOrder = async (scenarioId, userId, { side, symbol, quantity, price }) => {
  const totalCost = quantity * price;

  return await prisma.$transaction(async (tx) => {
    // 1. Get participant
    const participant = await tx.scenarioParticipant.findFirst({
      where: { userId, scenarioId },
    });
    if (!participant) throw new Error("Participant not found");

    const currentBalance = parseFloat(participant.cashBalance);

    // 1.5 Check for sufficient funds if buying
    if (side === 'buy' && totalCost > currentBalance) {
      throw new Error("Insufficient funds");
    }

    // 1.6 Check for sufficient holdings if selling
    if (side === 'sell') {
      const holding = await tx.scenarioHolding.findUnique({
        where: { participantId_symbol: { participantId: participant.id, symbol } },
      });
      const currentQty = holding ? parseFloat(holding.quantity) : 0;

      if (quantity > currentQty) {
        throw new Error(`Insufficient stocks to sell. You have ${currentQty} shares.`);
      }
    }

    // 2. Update holdings
    if (side === 'buy') {
      await tx.scenarioHolding.upsert({
        where: { participantId_symbol: { participantId: participant.id, symbol } },
        update: { quantity: { increment: quantity } },
        create: { participantId: participant.id, symbol, quantity },
      });
    } else if (side === 'sell') {
      await tx.scenarioHolding.update({
        where: { participantId_symbol: { participantId: participant.id, symbol } },
        data: { quantity: { decrement: quantity } },
      });
    }

    // 3. Update cash balance safely
    const newBalance = side === 'buy' ? currentBalance - totalCost : currentBalance + totalCost;

    await tx.scenarioParticipant.update({
      where: { id: participant.id },
      data: { cashBalance: newBalance.toFixed(2) }, // store as string with 2 decimals
    });

    // 4. Record the market order
    await tx.scenarioMarketOrder.create({
      data: {
        participantId: participant.id,
        side,
        symbol,
        quantity,
        executedPrice: price,
      },
    });

    return { success: true, newBalance: newBalance.toFixed(2) };
  });
};



// Get net holdings of a symbol for a participant
async function getHoldings(participantId, symbol) {
  const executedOrders = await prisma.scenarioMarketOrder.findMany({
    where: { participantId, symbol, status: 'EXECUTED' },
  });

  let netQty = 0;
  for (let order of executedOrders) {
    if (order.side === 'buy') {
      netQty += Number(order.quantity);
    } else if (order.side === 'sell') {
      netQty -= Number(order.quantity);
    }
  }

  return netQty;
}

async function getAvailableShares(participantId, symbol) {
  // Total executed holdings
  const executedQty = await getHoldings(participantId, symbol);

  // Total pending sell limit orders
  const pendingSellOrders = await prisma.scenarioLimitOrder.findMany({
    where: { participantId, symbol, side: 'sell', status: 'PENDING' },
  });

  const reservedQty = pendingSellOrders.reduce((sum, order) => sum + Number(order.quantity), 0);

  return executedQty - reservedQty; // available shares to sell
}


module.exports.createLimitOrder = async (scenarioId, userId, { side, symbol, quantity, limitPrice, price }) => {
  const participant = await prisma.scenarioParticipant.findFirst({
    where: { scenarioId: Number(scenarioId), userId },
  });
  if (!participant) throw new Error('User has not joined this scenario');

// Enforce limit price conditions using frontend price
if (side === 'buy' && price < limitPrice) {
  throw new Error(`Cannot place buy limit order: current price (${price}) is below your limit (${limitPrice})`);
}
if (side === 'sell' && price > limitPrice) {
  throw new Error(`Cannot place sell limit order: current price (${price}) is above your limit (${limitPrice})`);
}

  // Check available funds for buy
  if (side === 'buy') {
    const pendingBuyOrders = await prisma.scenarioLimitOrder.findMany({
      where: { participantId: participant.id, side: 'buy', status: 'PENDING' },
    });
    const reservedCash = pendingBuyOrders.reduce((sum, order) => sum + Number(order.limitPrice) * Number(order.quantity), 0);
    const availableCash = Number(participant.cashBalance) - reservedCash;
    if (quantity * limitPrice > availableCash) {
      throw new Error('Not enough cash to place this buy limit order considering existing pending orders');
    }
  }

  // Check available shares for sell
  if (side === 'sell') {
    const availableShares = await getAvailableShares(participant.id, symbol);
    if (quantity > availableShares) {
      throw new Error('Not enough shares to place this sell limit order considering existing pending orders');
    }
  }

  // Create limit order
  return prisma.scenarioLimitOrder.create({
    data: {
      participantId: participant.id,
      side,
      symbol,
      quantity,
      limitPrice,
      orderType: 'LIMIT',
      status: 'PENDING',
    },
  });
};



module.exports.getWalletBalance = async (scenarioId, userId) => {
  const participant = await prisma.scenarioParticipant.findFirst({
    where: { scenarioId: Number(scenarioId), userId },
  });

  if (!participant) throw new Error("Participant not found");

  return participant.cashBalance;
};

function toNumber(value) {
  // Prisma Decimal has toNumber() for some setups; fallback to Number()
  if (value === null || value === undefined) return 0;
  if (typeof value === 'object' && typeof value.toNumber === 'function') return value.toNumber();
  return Number(value);
}

module.exports.processLimitOrders = async (symbol, latestPrice) => {
  // ensure latestPrice is a Number
  latestPrice = Number(latestPrice);
  const pendingOrders = await prisma.scenarioLimitOrder.findMany({
    where: { symbol, status: 'PENDING' },
    include: { participant: true },
  });

  const executedOrders = [];

  for (const order of pendingOrders) {
    const { id, side, limitPrice, quantity, participant } = order;
    if (!participant) {
      console.log(`Order ${id} has no participant, skipping`);
      continue;
    }

    // convert DB types to numbers for comparisons
    const limit = Number(limitPrice);
    const qty = Number(quantity);

    const shouldExecute = (side === 'buy' && limit >= latestPrice) || (side === 'sell' && limit <= latestPrice);
    if (!shouldExecute) continue;

    try {
      await prisma.$transaction(async (tx) => {
        // Re-fetch participant inside transaction
        const participantTx = await tx.scenarioParticipant.findUnique({ where: { id: participant.id } });
        if (!participantTx) {
          console.log(`participant ${participant.id} disappeared, skipping order ${id}`);
          return;
        }

        // Get holdings for participant for this symbol (read/write within tx)
        const holdingRow = await tx.scenarioHolding.findUnique({
          where: {
            participantId_symbol: { participantId: participantTx.id, symbol }
          }
        });

        const holdings = holdingRow ? Number(holdingRow.quantity) : 0;
        const cash = toNumber(participantTx.cashBalance);
        console.log(cash)

        // Check affordability / availability
        if (side === 'buy' && cash < qty * latestPrice) {
          console.log(`Not enough cash for participant ${participantTx.id} for order ${id}`);
          return;
        }
        if (side === 'sell' && holdings < qty) {
          console.log(`Not enough holdings for participant ${participantTx.id} for order ${id}`);
          return;
        }

        // compute new cash balance
        const newCash = side === 'buy'
          ? Number((cash - qty * latestPrice).toFixed(2))
          : Number((cash + qty * latestPrice).toFixed(2));

        // Update participant cash
        await tx.scenarioParticipant.update({
          where: { id: participantTx.id },
          data: { cashBalance: newCash }
        });

        // Update holdings: increment for buys, decrement for sells
        if (side === 'buy') {
          if (holdingRow) {
            await tx.scenarioHolding.update({
              where: { participantId_symbol: { participantId: participantTx.id, symbol } },
              data: { quantity: holdingRow.quantity + qty }
            });
          } else {
            await tx.scenarioHolding.create({
              data: { participantId: participantTx.id, symbol, quantity: qty }
            });
          }
        } else { // sell
          // holdings >= qty checked above
          await tx.scenarioHolding.update({
            where: { participantId_symbol: { participantId: participantTx.id, symbol } },
            data: { quantity: holdingRow.quantity - qty }
          });
        }

        // Mark limit order executed
        await tx.scenarioLimitOrder.update({
          where: { id },
          data: { status: 'EXECUTED', updatedAt: new Date() },
        });

        // Create scenario market order record (record executed trade)
        await tx.scenarioMarketOrder.create({
          data: {
            participantId: participantTx.id,
            side,
            symbol,
            quantity: qty,
            executedPrice: latestPrice,
            status: 'EXECUTED',
          },
        });
console.log(newCash)
        executedOrders.push({ id, side, symbol, quantity: qty, executedPrice: latestPrice });
      });
    } catch (txErr) {
      // unexpected transaction error — log it and continue
      console.error(`Transaction error executing limit order ${id}:`, txErr);
    }
  }

  return executedOrders;
};


module.exports.getOrderHistory = async (scenarioId, userId) => {
  // Get participant ID
  const participant = await prisma.scenarioParticipant.findFirst({
    where: { scenarioId: Number(scenarioId), userId },
  });

  if (!participant) throw new Error("Participant not found");

  // Get market orders
  const marketOrders = await prisma.scenarioMarketOrder.findMany({
    where: { participantId: participant.id },
    orderBy: { createdAt: "desc" },
  });

  // Get limit orders
  const limitOrders = await prisma.scenarioLimitOrder.findMany({
    where: { participantId: participant.id },
    orderBy: { createdAt: "desc" },
  });

  return { marketOrders, limitOrders };
};


module.exports.getParticipantId = async function getParticipantId(scenarioId, userId) {
  const participant = await prisma.scenarioParticipant.findFirst({
    where: { scenarioId, userId },
  });
  if (!participant) throw new Error("Participant not found in this scenario");
  return participant.id;
}


// Save replay progress
module.exports.saveReplayProgress = async (userId, scenarioId, symbol, currentIndex, speed) => {
  return prisma.scenarioReplayProgress.upsert({
    where: { userId_scenarioId_symbol: { userId, scenarioId: Number(scenarioId), symbol } },
    update: { currentIndex, speed, updatedAt: new Date() },
    create: { userId, scenarioId: Number(scenarioId), symbol, currentIndex, speed },
  });
};

// Get replay progress
module.exports.getReplayProgress = async (userId, scenarioId, symbol) => {
  const progress = await prisma.scenarioReplayProgress.findUnique({
    where: { userId_scenarioId_symbol: { userId, scenarioId: Number(scenarioId), symbol } },
  });
  return progress || { currentIndex: 0, speed: 1 };
};


module.exports.loadProgress = async (scenarioId, userId, symbol) => {
  if (symbol) {
    // Load by symbol (composite key)
    const progress = await prisma.scenarioReplayProgress.findUnique({
      where: { userId_scenarioId_symbol: { userId, scenarioId: Number(scenarioId), symbol } },
    });
    return progress ? { lastIndex: progress.lastIndex, speed: progress.speed, symbol: progress.symbol } : null;
  } else {
    // Load all progress entries for this scenario/user
    const progresses = await prisma.scenarioReplayProgress.findMany({
      where: { userId, scenarioId: Number(scenarioId) },
    });
    return progresses.map(p => ({ lastIndex: p.lastIndex, speed: p.speed, symbol: p.symbol }));
  }
};
// module.exports.getScenarioPortfolio = async (scenarioId, userId) => {
//   // 1. Get participant
//   const participant = await prisma.scenarioParticipant.findFirst({
//     where: { scenarioId: Number(scenarioId), userId },
//   });
//   if (!participant) throw new Error("Participant not found");

//   // 2. Get current holdings (open positions)
//   const holdings = await prisma.scenarioHolding.findMany({
//     where: { participantId: participant.id },
//   });

//   // 3. Get all trades for this participant
//   const trades = await prisma.scenarioMarketOrder.findMany({
//     where: { participantId: participant.id },
//   });

//   // 4. Get latest stock prices
//   const symbols = [
//     ...new Set([...holdings.map(h => h.symbol), ...trades.map(t => t.symbol)]),
//   ];
//   const stocks = await prisma.stock.findMany({
//     where: { symbol: { in: symbols } },
//     select: { symbol: true, hist_prices: true, company: { select: { name: true } } },
//   });

//   // 5. Map holdings to open positions
//   const openPositions = holdings.map(h => {
//     const stock = stocks.find(s => s.symbol === h.symbol);
//     const latestPrice = stock?.hist_prices?.slice(-1)[0]?.close_price || 0;
//     // calculate avg buy price from trades
//     const stockTrades = trades.filter(t => t.symbol === h.symbol && t.side === "BUY");
//     const totalBought = stockTrades.reduce((sum, t) => sum + Number(t.quantity), 0);
//     const totalCost = stockTrades.reduce((sum, t) => sum + Number(t.quantity) * Number(t.executedPrice), 0);
//     const avgBuyPrice = totalBought ? totalCost / totalBought : 0;

//     return {
//       symbol: h.symbol,
//       companyName: stock?.company?.name || "UNKNOWN",
//       quantity: h.quantity,
//       currentPrice: latestPrice.toFixed(2),
//       totalInvested: (avgBuyPrice * h.quantity).toFixed(2),
//       currentValue: (latestPrice * h.quantity).toFixed(2),
//       unrealizedProfitLoss: ((latestPrice - avgBuyPrice) * h.quantity).toFixed(2),
//       unrealizedProfitLossPercent: totalBought ? (((latestPrice - avgBuyPrice) / avgBuyPrice) * 100).toFixed(2) : "0",
//     };
//   });

//   // 6. Map closed positions from trades not in holdings (sold stocks)
//   const closedPositions = [];
//   const holdingSymbols = holdings.map(h => h.symbol);

//   // Group trades by symbol
//   const tradesBySymbol = {};
//   trades.forEach(t => {
//     if (!tradesBySymbol[t.symbol]) tradesBySymbol[t.symbol] = [];
//     tradesBySymbol[t.symbol].push(t);
//   });

//   for (const [symbol, symbolTrades] of Object.entries(tradesBySymbol)) {
//     if (!holdingSymbols.includes(symbol)) {
//       const stock = stocks.find(s => s.symbol === symbol);
//       const buyTrades = symbolTrades.filter(t => t.side === "BUY");
//       const sellTrades = symbolTrades.filter(t => t.side === "SELL");

//       const totalBought = buyTrades.reduce((sum, t) => sum + Number(t.quantity), 0);
//       const totalSpent = buyTrades.reduce((sum, t) => sum + Number(t.quantity) * Number(t.executedPrice), 0);
//       const totalSold = sellTrades.reduce((sum, t) => sum + Number(t.quantity), 0);
//       const totalReceived = sellTrades.reduce((sum, t) => sum + Number(t.quantity) * Number(t.executedPrice), 0);

//       const avgBuyPrice = totalBought ? totalSpent / totalBought : 0;
//       const avgSellPrice = totalSold ? totalReceived / totalSold : 0;
//       const profit = totalReceived - (avgBuyPrice * totalSold);

//       closedPositions.push({
//         symbol,
//         companyName: stock?.company?.name || "UNKNOWN",
//         quantity: totalSold,
//         avgSellPrice: avgSellPrice.toFixed(2),
//         realizedProfitLoss: profit.toFixed(2),
//         realizedProfitLossPercent: avgBuyPrice ? ((profit / (avgBuyPrice * totalSold)) * 100).toFixed(2) : "0",
//       });
//     }
//   }

//   return {
//     cash: Number(participant.cashBalance).toFixed(2),
//     openPositions,
//     closedPositions,
//   };
// };


// // module.exports.getScenarioPortfolio = async function getScenarioPortfolio(participantId) {
// //   if (!participantId || typeof participantId !== "number") {
// //     throw new Error(`Invalid participant ID: ${participantId}`);
// //   }

// //   // --- 1️⃣ Fetch executed scenario market orders ---
// //   const marketOrders = await prisma.scenarioMarketOrder.findMany({
// //     where: { participantId },
// //     select: { symbol: true, quantity: true, executedPrice: true, side: true },
// //   });

// //   // --- 2️⃣ Fetch executed scenario limit orders ---
// //   const limitOrders = await prisma.scenarioLimitOrder.findMany({
// //     where: { participantId, status: "EXECUTED" },
// //     select: { symbol: true, quantity: true, limitPrice: true, side: true },
// //   });

// //   if ((!marketOrders || marketOrders.length === 0) && (!limitOrders || limitOrders.length === 0)) {
// //     return { openPositions: [], closedPositions: [] };
// //   }

// //   // --- 3️⃣ Collect unique symbols to fetch stock info ---
// //   const symbols = [...new Set([
// //     ...marketOrders.map(o => o.symbol),
// //     ...limitOrders.map(o => o.symbol),
// //   ])];

// //   const stocks = await prisma.stock.findMany({
// //     where: { symbol: { in: symbols } },
// //     select: { symbol: true, company: { select: { name: true } } },
// //   });

// //   const symbolCompanyMap = new Map(stocks.map(s => [s.symbol, s.company?.name ?? "UNKNOWN"]));

// //   // --- 4️⃣ Prepare stock map for FIFO calculations ---
// //   const stockMap = new Map();

// //   const processOrder = (order, priceField) => {
// //     const { symbol, quantity, side } = order;
// //     const price = priceField === "executedPrice" ? Number(order.executedPrice) : Number(order.limitPrice);

// //     if (!stockMap.has(symbol)) {
// //       stockMap.set(symbol, {
// //         buyQueue: [],
// //         netQuantity: 0,
// //         realizedProfitLoss: 0,
// //         totalBoughtQty: 0,
// //         totalBoughtValue: 0,
// //         totalSoldValue: 0,
// //       });
// //     }

// //     const group = stockMap.get(symbol);

// //     if (side.toUpperCase() === "BUY") {
// //       group.buyQueue.push({ quantity, pricePerShare: price });
// //       group.netQuantity += quantity;
// //       group.totalBoughtQty += quantity;
// //       group.totalBoughtValue += quantity * price;
// //     } else if (side.toUpperCase() === "SELL") {
// //       let sellQty = quantity;
// //       group.totalSoldValue += quantity * price;

// //       while (sellQty > 0 && group.buyQueue.length > 0) {
// //         const buy = group.buyQueue[0];
// //         if (buy.quantity <= sellQty) {
// //           group.realizedProfitLoss += (buy.quantity * price) - (buy.quantity * buy.pricePerShare);
// //           sellQty -= buy.quantity;
// //           group.buyQueue.shift();
// //         } else {
// //           group.realizedProfitLoss += (sellQty * price) - (sellQty * buy.pricePerShare);
// //           buy.quantity -= sellQty;
// //           sellQty = 0;
// //         }
// //       }

// //       group.netQuantity -= quantity;
// //     }
// //   };

// //   marketOrders.forEach(order => processOrder(order, "executedPrice"));
// //   limitOrders.forEach(order => processOrder(order, "limitPrice"));

// //   // --- 5️⃣ Build open and closed positions arrays ---
// //   const openPositions = [];
// //   const closedPositions = [];

// //   for (const [symbol, group] of stockMap.entries()) {
// //     const { netQuantity, realizedProfitLoss, totalBoughtQty, totalBoughtValue, totalSoldValue } = group;
// //     const companyName = symbolCompanyMap.get(symbol) ?? "UNKNOWN";

// //  if (netQuantity > 0) {
// //   openPositions.push({
// //     symbol,
// //     companyName,
// //     quantity: netQuantity,                    // number
// //     totalBoughtQty: group.totalBoughtQty,    // total bought quantity
// //     totalBoughtValue: group.totalBoughtValue.toFixed(2), // total invested
// //     realizedProfitLoss: realizedProfitLoss.toFixed(2),   // already exists
// //   });
// // }

// //     if (realizedProfitLoss !== 0 || totalSoldValue > 0) {
// //       closedPositions.push({
// //         symbol,
// //         companyName,
// //         totalBoughtQty,
// //         totalBoughtValue: totalBoughtValue.toFixed(2),
// //         totalSoldValue: totalSoldValue.toFixed(2),
// //         realizedProfitLoss: realizedProfitLoss.toFixed(2),
// //       });
// //     }
// //   }

// //   return { openPositions, closedPositions };
// // };

