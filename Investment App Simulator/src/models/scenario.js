const prisma = require('./prismaClient');
const API_KEY = '26d603eb0f773cc49609fc81898d4b9c';
const { Prisma } = require('@prisma/client');

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


module.exports.startScenarioAttempt = async (userId, scenarioId) => {
  const last = await prisma.scenarioAttempt.findFirst({
    where: { userId, scenarioId },
    orderBy: { attemptNumber: "desc" },
  });
  const nextAttempt = (last?.attemptNumber ?? 0) + 1;

  return await prisma.scenarioAttempt.create({
    data: {
      userId,
      scenarioId,
      attemptNumber: nextAttempt,
    },
  });
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
module.exports.getReplayData = async (scenarioId, symbol) => {
  if (!scenarioId) throw new Error("Scenario ID is required");
  if (!symbol) throw new Error("Stock symbol is required");

  const data = await prisma.scenarioIntradayPrice.findMany({
    where: {
      scenarioId: scenarioId,
      symbol: symbol
    },
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


module.exports.saveReplayProgress = async (userId, scenarioId, symbol, currentIndex, currentSpeed) => {
  symbol = symbol.toUpperCase();
  return prisma.scenarioReplayProgress.upsert({
    where: { userId_scenarioId_symbol: { userId, scenarioId, symbol } },
    update: {
      lastIndex: currentIndex,
      speed: currentSpeed,
      updatedAt: new Date(),
    },
    create: {
      userId,
      scenarioId,
      symbol,
      lastIndex: currentIndex,
      speed: currentSpeed,
    },
  });
};

module.exports.executeMarketOrder = async (scenarioId, userId, { side, symbol, quantity, price, currentIndex }) => {
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
        currentIndex
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


module.exports.createLimitOrder = async (scenarioId, userId, { side, symbol, quantity, limitPrice, price, currentIndex }) => {
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
      currentIndex
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

module.exports.processLimitOrders = async (symbol, latestPrice, currentIndex) => {
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
          data: { status: 'EXECUTED', executedIndex: currentIndex, updatedAt: new Date() },
        });

        // // Create scenario market order record (record executed trade)
        // await tx.scenarioMarketOrder.create({
        //   data: {
        //     participantId: participantTx.id,
        //     side,
        //     symbol,
        //     quantity: qty,
        //     executedPrice: latestPrice,
        //     status: 'EXECUTED',
        //     currentIndex
        //   },
        // });
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




// Get replay progress for a single symbol
module.exports.getReplayProgress = async (userId, scenarioId, symbol) => {
  symbol = symbol.toUpperCase();
  const progress = await prisma.scenarioReplayProgress.findUnique({
    where: { userId_scenarioId_symbol: { userId, scenarioId: Number(scenarioId), symbol } },
  });
  return progress || { lastIndex: 0, speed: 1, symbol };
};

// Load replay progress for a user, scenario, and optional symbol
module.exports.loadProgress = async (scenarioId, userId, symbol) => {
  const whereClause = { userId, scenarioId };
  if (symbol) whereClause.symbol = symbol.toUpperCase();

  return prisma.scenarioReplayProgress.findMany({
    where: whereClause,
    orderBy: { updatedAt: "desc" }
  });
};

// Load intraday chart data for one or more symbols
module.exports.loadIntradayData = async (scenarioId, symbols) => {
  const data = {};
  for (const symbol of symbols) {
    const chartData = await prisma.scenarioIntradayPrice.findMany({
      where: { scenarioId, symbol },
      orderBy: { date: "asc" },
      select: { date: true, closePrice: true }
    });

    data[symbol] = chartData.map(d => ({ x: d.date, c: parseFloat(d.closePrice) }));
  }
  return data;
};


module.exports.getScenarioIntradayDataFromAPI = async function (scenarioId, symbol, dateFrom, dateTo) {
  if (!symbol) throw new Error('Stock symbol is required.');
  if (!scenarioId) throw new Error('Scenario ID is required.');
  // Default to past 7 days if no dates provided
  const now = new Date();
  const defaultTo = now.toISOString().split('T')[0];
  const defaultFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  const params = new URLSearchParams({
    access_key: API_KEY,
    symbols: symbol,
    sort: 'ASC',
    interval: '15min',
    limit: 1000,
    date_from: dateFrom || defaultFrom,
    date_to: dateTo || defaultTo
  });

  const url = `https://api.marketstack.com/v1/intraday?${params.toString()}`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Marketstack API error: ${response.status}`);
    const data = await response.json();

    if (!data.data || data.data.length === 0) {
      throw new Error('No intraday data found for this symbol.');
    }

    // Upsert stock in DB
    const stock = await prisma.stock.upsert({
      where: { symbol: symbol },
      update: {},
      create: { symbol: symbol }
    });

    console.log(`Processing ${data.data.length} intraday prices for stock: ${symbol} (ID: ${stock.stock_id})`);

    // Upsert each intraday price into IntradayPrice3 table
    for (const item of data.data) {
      try {
        const dateObj = new Date(item.date);
        dateObj.setMilliseconds(0); // normalize milliseconds
        dateObj.setSeconds(0); // optional: normalize seconds

        await prisma.scenarioIntradayPrice.upsert({
          where: {
            scenarioId_symbol_date: {
              scenarioId: scenarioId,
              symbol: symbol,
              date: dateObj
            }
          },
          update: {
            openPrice: item.open,
            highPrice: item.high,
            lowPrice: item.low,
            closePrice: item.close,
            volume: item.volume
          },
          create: {
            scenarioId: scenarioId,
            symbol: symbol,
            date: dateObj,
            openPrice: item.open,
            highPrice: item.high,
            lowPrice: item.low,
            closePrice: item.close,
            volume: item.volume
          }
        });

      } catch (err) {
        console.error(`Failed to upsert intraday price for ${symbol} at ${item.date}:`, err);
      }
    }

    // Return OHLC array for candlestick chart
    const ohlcData = data.data.map(item => ({
      date: item.date,
      openPrice: item.open,
      highPrice: item.high,
      lowPrice: item.low,
      closePrice: item.close
    }));

    return ohlcData;

  } catch (err) {
    console.error('Error fetching intraday data:', err);
    throw err;
  }
};


module.exports.getScenarioIntradayDataWithProgress = async (scenarioId, symbol, userId) => {
  // Fetch all intraday prices
  const intradayData = await prisma.scenarioIntradayPrice.findMany({
    where: {
      scenarioId: Number(scenarioId),
      symbol: symbol.toUpperCase(),
    },
    orderBy: { date: 'asc' },
  });

  // Fetch user's last replay progress
  const progress = await prisma.scenarioReplayProgress.findUnique({
    where: {
      userId_scenarioId_symbol: {
        userId: Number(userId),
        scenarioId: Number(scenarioId),
        symbol: symbol.toUpperCase(),
      },
    },
  });

  return {
    intradayData,
    lastIndex: progress?.lastIndex || 0,
    speed: progress?.speed || 1,
  };
};

module.exports.getScenarioDetails = async (scenarioId) => {
  const id = Number(scenarioId);

  const scenario = await prisma.scenario.findUnique({
    where: { id },
    include: {
      // these ARE relations on Scenario
      ScenarioIntradayPrice: true,
      ScenarioAttemptAnalytics: true,

      // orders hang off participants, not Scenario
      participants: {
        include: {
          user: true, // if you want participant user details
          ScenarioMarketOrder: true,
          ScenarioLimitOrder: true,
          ScenarioHolding: true,
        },
      },
    },
  });

  if (!scenario) throw new Error('Scenario not found');
  return scenario;
};


module.exports.getScenarioPortfolio = async (scenarioId, userId) => {
  // 1. Get participant
  const participant = await prisma.scenarioParticipant.findFirst({
    where: { scenarioId: Number(scenarioId), userId },
  });
  if (!participant) throw new Error("Participant not found");

  const cashBalance = Number(participant.cashBalance);

  // 2. Get holdings
  const holdings = await prisma.scenarioHolding.findMany({
    where: { participantId: participant.id },
    select: {
      symbol: true,
      quantity: true
    },
  });

  // 3. Return raw holdings + cash balance
  return { cashBalance, holdings };
};


module.exports.getUserScenarioPortfolio = async function getUserScenarioPortfolio(userId, scenarioId) {
  if (!userId || !scenarioId) {
    throw new Error("User ID and Scenario ID are required.");
  }

  // --- Confirm user belongs to scenario ---
  const participant = await prisma.scenarioParticipant.findFirst({
    where: { userId, scenarioId },
    select: { id: true },
  });

  if (!participant) {
    throw new Error(`User ${userId} is not a participant in scenario ${scenarioId}.`);
  }

  const participantId = participant.id;

  // --- Fetch all executed trades (Market + Limit) ---
  const [marketOrders, limitOrders] = await Promise.all([
    prisma.scenarioMarketOrder.findMany({
      where: { participantId, status: "EXECUTED" },
      orderBy: { createdAt: "asc" },
    }),
    prisma.scenarioLimitOrder.findMany({
      where: { participantId, status: "EXECUTED" },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  // --- Combine all executed trades ---
  const allTrades = [
    ...marketOrders.map(t => ({
      symbol: t.symbol,
      side: t.side.toUpperCase(),
      quantity: parseFloat(t.quantity),
      price: parseFloat(t.executedPrice),
      createdAt: t.createdAt,
    })),
    ...limitOrders.map(t => ({
      symbol: t.symbol,
      side: t.side.toUpperCase(),
      quantity: parseFloat(t.quantity),
      price: parseFloat(t.limitPrice),
      createdAt: t.createdAt,
    })),
  ];

  if (allTrades.length === 0) {
    return {
      summary: { openShares: 0, totalShares: 0, totalInvested: 0, unrealizedPnL: 0, realizedPnL: 0 },
      positions: [],
    };
  }

  // --- Group trades by stock symbol ---
  const stockMap = new Map();

  for (const trade of allTrades) {
    const { symbol, side, quantity, price } = trade;

    if (!stockMap.has(symbol)) {
      stockMap.set(symbol, {
        buyQueue: [],
        netQuantity: 0,
        totalBoughtQty: 0,
        totalBoughtValue: 0,
        totalSoldValue: 0,
        realizedPnL: 0,
      });
    }

    const stock = stockMap.get(symbol);

    if (side === "BUY") {
      stock.buyQueue.push({ quantity, price });
      stock.netQuantity += quantity;
      stock.totalBoughtQty += quantity;
      stock.totalBoughtValue += quantity * price;
    } else if (side === "SELL") {
      let sellQty = quantity;
      const sellProceeds = quantity * price;
      stock.totalSoldValue += sellProceeds;

      // FIFO logic for realized P&L
      while (sellQty > 0 && stock.buyQueue.length > 0) {
        const buy = stock.buyQueue[0];
        if (buy.quantity <= sellQty) {
          stock.realizedPnL += (price - buy.price) * buy.quantity;
          sellQty -= buy.quantity;
          stock.buyQueue.shift();
        } else {
          stock.realizedPnL += (price - buy.price) * sellQty;
          buy.quantity -= sellQty;
          sellQty = 0;
        }
      }

      stock.netQuantity -= quantity;
    }
  }

  // --- Preload replay progress + all intraday prices for all symbols ---
  const symbols = Array.from(stockMap.keys());

  const [replayProgress, intradayPrices] = await Promise.all([
    prisma.scenarioReplayProgress.findMany({
      where: { userId, scenarioId, symbol: { in: symbols } },
      select: { symbol: true, lastIndex: true },
    }),
    prisma.scenarioIntradayPrice.findMany({
      where: { scenarioId, symbol: { in: symbols } },
      orderBy: { date: "asc" },
      select: { symbol: true, closePrice: true },
    }),
  ]);

  // Organize data for quick lookup
  const replayMap = new Map(replayProgress.map(r => [r.symbol, r.lastIndex]));
  const priceMap = new Map();

  for (const sym of symbols) {
    priceMap.set(sym, intradayPrices.filter(p => p.symbol === sym).map(p => parseFloat(p.closePrice)));
  }

  // --- Compute portfolio metrics ---
  // --- Compute portfolio metrics ---
  const positions = [];
  let totalOpenShares = 0;
  let totalShares = 0;
  let totalInvested = 0;
  let totalUnrealizedPnL = 0;
  let totalRealizedPnL = 0;

  for (const [symbol, stock] of stockMap.entries()) {
    const { buyQueue, netQuantity, realizedPnL, totalBoughtQty, totalBoughtValue } = stock;

    // Determine latest price based on replay progress
    const allPrices = priceMap.get(symbol) || [];
    const lastIndex = replayMap.get(symbol);

    // ✅ FIX: if lastIndex exists, use that candle’s close price (not the next one)
    // fallback to last available price if not found
    const priceIndex =
      lastIndex !== undefined
        ? Math.max(0, Math.min(lastIndex - 1, allPrices.length - 1))
        : allPrices.length - 1;

    const latestPrice = allPrices[priceIndex] || 0;

    const investedOpen = buyQueue.reduce((sum, b) => sum + b.quantity * b.price, 0);
    const currentValue = latestPrice * netQuantity;
    const unrealizedPnL = currentValue - investedOpen;

    totalOpenShares += netQuantity;
    totalShares += totalBoughtQty;
    totalInvested += totalBoughtValue;
    totalUnrealizedPnL += unrealizedPnL;
    totalRealizedPnL += realizedPnL;

    positions.push({
      symbol,
      quantity: netQuantity.toFixed(6),
      totalShares: totalBoughtQty.toFixed(6),
      avgBuyPrice: totalBoughtQty ? (totalBoughtValue / totalBoughtQty).toFixed(2) : "0.00",
      currentPrice: latestPrice.toFixed(2),
      totalInvested: totalBoughtValue.toFixed(2),
      currentValue: currentValue.toFixed(2),
      unrealizedPnL: unrealizedPnL.toFixed(2),
      realizedPnL: realizedPnL.toFixed(2),
    });
  }


  return {
    summary: {
      openShares: totalOpenShares.toFixed(6),
      totalShares: totalShares.toFixed(6),
      totalInvested: totalInvested.toFixed(2),
      unrealizedPnL: totalUnrealizedPnL.toFixed(2),
      realizedPnL: totalRealizedPnL.toFixed(2),
    },
    positions,
  };
};

module.exports.getParticipantWallet = async function (userId, scenarioId) {
  const participant = await prisma.scenarioParticipant.findFirst({
    where: { userId, scenarioId },
    select: { cashBalance: true },
  });
  if (!participant) throw new Error("Participant not found");
  return parseFloat(participant.cashBalance); // ensures it's a number
};

// --- Get all participants for a scenario ---
module.exports.getScenarioParticipants = async function getScenarioParticipants(scenarioId) {
  return prisma.scenarioParticipant.findMany({
    where: { scenarioId },
    select: { id: true, userId: true },
  });
};

// --- End scenario for a participant ---
module.exports.markScenarioEnded = async function markScenarioEnded(userId, scenarioId) {
  // Ensure participant exists
  const participant = await prisma.scenarioParticipant.findFirst({
    where: { userId, scenarioId },
  });

  if (!participant) {
    throw new Error(`User ${userId} is not a participant in scenario ${scenarioId}.`);
  }

  return prisma.scenarioParticipant.update({
    where: { id: participant.id },
    data: { ended: true }, // mark only this participant as done
  });
};

function serializeBigInt(obj) {
  if (Array.isArray(obj)) {
    return obj.map(serializeBigInt);
  } else if (obj && typeof obj === 'object') {
    const newObj = {};
    for (const key in obj) {
      if (typeof obj[key] === 'bigint') {
        newObj[key] = obj[key].toString(); // convert BigInt to string
      } else {
        newObj[key] = serializeBigInt(obj[key]);
      }
    }
    return newObj;
  } else {
    return obj;
  }
}

module.exports.fetchUserScenarioData = async (scenarioId, userId) => {
  // 1. Get participant
  const participant = await prisma.scenarioParticipant.findFirst({
    where: { scenarioId, userId },
  });
  if (!participant) throw new Error("Participant not found");

  // 2. Get holdings
  const holdings = await prisma.scenarioHolding.findMany({
    where: { participantId: participant.id },
  });

  // 3. Get market orders
  const marketOrders = await prisma.scenarioMarketOrder.findMany({
    where: { participantId: participant.id },
    orderBy: { currentIndex: 'asc' },
  });

  // 4. Get limit orders
  const limitOrders = await prisma.scenarioLimitOrder.findMany({
    where: { participantId: participant.id },
    orderBy: { currentIndex: 'asc' },
  });

  // 5. Combine all symbols from holdings, marketOrders, and limitOrders
  const symbols = [
    ...holdings.map(h => h.symbol),
    ...marketOrders.map(o => o.symbol),
    ...limitOrders.map(o => o.symbol),
  ];
  const uniqueSymbols = [...new Set(symbols)];

  // 6. Get intraday prices for all symbols
  const intradayPrices = await prisma.scenarioIntradayPrice.findMany({
    where: { scenarioId, symbol: { in: uniqueSymbols } },
    orderBy: { date: 'asc' },
  });

  // 7. Add index to intraday prices
  const intradayBySymbol = {};
  uniqueSymbols.forEach(symbol => {
    const prices = intradayPrices.filter(p => p.symbol === symbol);
    intradayBySymbol[symbol] = prices.map((p, idx) => ({
      ...p,
      date: p.date.toISOString(),
      createdAt: p.createdAt.toISOString(),
      openPrice: p.openPrice !== null ? Number(p.openPrice) : null,
      highPrice: p.highPrice !== null ? Number(p.highPrice) : null,
      lowPrice: p.lowPrice !== null ? Number(p.lowPrice) : null,
      closePrice: Number(p.closePrice),
      volume: p.volume !== null ? Number(p.volume) : null,
      index: idx
    }));
  });

  // 8. Build data object indexed by symbol
  const dataBySymbol = {};
  uniqueSymbols.forEach(symbol => {
    const holding = holdings.find(h => h.symbol === symbol);
    dataBySymbol[symbol] = {
      holding: holding
        ? { ...holding, quantity: Number(holding.quantity) }
        : { quantity: 0 },

      marketOrders: marketOrders
        .filter(o => o.symbol === symbol)
        .map(o => ({
          ...o,
          quantity: Number(o.quantity),
          executedPrice: Number(o.executedPrice),
          createdAt: o.createdAt.toISOString()
        })),

      limitOrders: limitOrders
        .filter(o => o.symbol === symbol)
        .map(o => ({
          ...o,
          quantity: Number(o.quantity),
          limitPrice: Number(o.limitPrice),
          createdAt: o.createdAt.toISOString(),
          updatedAt: o.updatedAt.toISOString()
        })),

      intraday: intradayBySymbol[symbol] || []
    };
  });

  return serializeBigInt(dataBySymbol);
};

// === Idempotency / state helpers ===
module.exports.getParticipantRow = async function getParticipantRow(userId, scenarioId) {
  const p = await prisma.scenarioParticipant.findFirst({
    where: { userId, scenarioId: Number(scenarioId) },
    select: { id: true, ended: true, cashBalance: true },
  });
  if (!p) throw new Error(`User ${userId} is not a participant in scenario ${scenarioId}.`);
  return p;
};

/**
 * Atomically mark an attempt finished (ended=true) if it's currently active (ended=false).
 * Returns true if we flipped it, false if it was already ended.
 */
module.exports.finishAttemptOnce = async function finishAttemptOnce(userId, scenarioId) {
  const p = await module.exports.getParticipantRow(userId, scenarioId);
  if (!p) throw new Error(`No participant found for user ${userId}, scenario ${scenarioId}`);

  console.log(`🔹 Finishing attempt for participant ${p.id} (ended=${p.ended})`);

  // Atomically flip participant flag
  const res = await prisma.scenarioParticipant.updateMany({
    where: { id: p.id, ended: false },
    data: { ended: true },
  });

  if (res.count === 0) {
    console.warn(`⚠️ Participant ${p.id} already marked ended.`);
    return false;
  }

  // ✅ Clean up transient attempt data in one atomic transaction
  await prisma.$transaction(async (tx) => {
    // 1️⃣ Cancel pending limit orders first (so they aren’t executed mid-cleanup)
    await tx.scenarioLimitOrder.updateMany({
      where: { participantId: p.id, status: "PENDING" },
      data: { status: "CANCELLED" },
    });

    // 2️⃣ Delete ALL limit orders for this participant
    await tx.scenarioLimitOrder.deleteMany({
      where: { participantId: p.id },
    });

    // 3️⃣ Delete all market orders
    await tx.scenarioMarketOrder.deleteMany({
      where: { participantId: p.id },
    });

    // 4️⃣ Delete all holdings (close portfolio)
    await tx.scenarioHolding.deleteMany({
      where: { participantId: p.id },
    });

    // 5️⃣ Delete replay progress
    await tx.scenarioReplayProgress.deleteMany({
      where: { userId, scenarioId },
    });

    // 6️⃣ Mark all open attempts as ended
    await tx.scenarioAttempt.updateMany({
      where: { userId, scenarioId, endedAt: null },
      data: { endedAt: new Date() },
    });
  });

  console.log(`✅ Cleaned up active trading, limit orders, and replay data for participant ${p.id}`);
  return true;
};



/**
 * Ensure you can't start a new attempt while one is active.
 * Returns the next attempt number when it succeeds.
 */
module.exports.startAttemptGuarded = async function startAttemptGuarded(userId, scenarioId, startingBalance) {
  // ensure participant row exists & is ended
  const participant = await prisma.scenarioParticipant.findFirst({
    where: { userId, scenarioId: Number(scenarioId) },
    select: { id: true, ended: true },
  });
  if (!participant) {
    const err = new Error(`User ${userId} is not a participant in scenario ${scenarioId}.`);
    err.status = 404;
    throw err;
  }
  if (participant.ended === false) {
    const hasAttempt = await prisma.scenarioAttempt.findFirst({
      where: { userId, scenarioId: Number(scenarioId), endedAt: null },
    });
    if (hasAttempt) {
      const err = new Error('Attempt already in progress. Finish it before starting a new one.');
      err.status = 409;
      throw err;
    }
  }


  // compute next attempt number (use ScenarioAttempt or ScenarioAttemptAnalytics — either is fine)
  const lastAttempt = await prisma.scenarioAttempt.findFirst({
    where: { userId, scenarioId: Number(scenarioId) },
    orderBy: { attemptNumber: 'desc' },
    select: { attemptNumber: true },
  });
  const nextAttempt = (lastAttempt?.attemptNumber ?? 0) + 1;

  // reset state + set starting balance + mark active, then create attempt row
  await prisma.$transaction(async (tx) => {
    await tx.scenarioLimitOrder.deleteMany({
      where: { participantId: participant.id, status: 'PENDING' },
    });
    await tx.scenarioMarketOrder.deleteMany({ where: { participantId: participant.id } });
    await tx.scenarioHolding.deleteMany({ where: { participantId: participant.id } });

    await tx.scenarioParticipant.update({
      where: { id: participant.id },
      data: {
        cashBalance: new Prisma.Decimal(Number(startingBalance)),
        ended: false,
      },
    });

    await tx.scenarioAttempt.create({
      data: {
        userId,
        scenarioId: Number(scenarioId),
        attemptNumber: nextAttempt,
        startedAt: new Date(),
      },
    });
  });

  return nextAttempt;
};


/** ——— helpers ——— */
async function getParticipant(userId, scenarioId) {
  const p = await prisma.scenarioParticipant.findFirst({
    where: { userId, scenarioId: Number(scenarioId) },
  });
  if (!p) throw new Error(`User ${userId} is not a participant in scenario ${scenarioId}.`);
  return p;
}

async function getScenarioStartBalance(scenarioId) {
  const sc = await prisma.scenario.findUnique({
    where: { id: Number(scenarioId) },
    select: { startingBalance: true },
  });
  if (!sc) throw new Error('Scenario not found');
  return Number(sc.startingBalance);
}


module.exports.getScenarioStartBalance = async function getScenarioStartBalance(scenarioId) {
  const sc = await prisma.scenario.findUnique({
    where: { id: Number(scenarioId) },
    select: { startingBalance: true },
  });
  if (!sc) throw new Error('Scenario not found');
  return Number(sc.startingBalance);
};

/** ——— start attempt ——— */
module.exports.startAttempt = async function startAttempt(userId, scenarioId) {
  const [participant, startingBalance] = await Promise.all([
    getParticipant(userId, scenarioId),
    getScenarioStartBalance(scenarioId),
  ]);

  // next attempt number
  const last = await prisma.scenarioAttemptAnalytics.findFirst({
    where: { userId, scenarioId: Number(scenarioId) },
    orderBy: { attemptNumber: 'desc' },
    select: { attemptNumber: true },
  });
  const nextAttempt = (last?.attemptNumber ?? 0) + 1;

  // reset state for a fresh run
  await prisma.$transaction(async (tx) => {
    await tx.scenarioLimitOrder.deleteMany({
      where: { participantId: participant.id, status: 'PENDING' },
    });
    await tx.scenarioMarketOrder.deleteMany({ where: { participantId: participant.id } });
    await tx.scenarioHolding.deleteMany({ where: { participantId: participant.id } });

    await tx.scenarioParticipant.update({
      where: { id: participant.id },
      data: { cashBalance: startingBalance, ended: false },
    });
  });

  return { attemptNumber: nextAttempt, startingBalance };
};

/** ——— finish attempt helpers you’ll call from controller ——— */
module.exports.markScenarioEnded = async function markScenarioEnded(userId, scenarioId) {
  const p = await getParticipant(userId, scenarioId);
  return prisma.scenarioParticipant.update({
    where: { id: p.id },
    data: { ended: true },
  });
};

module.exports.getParticipantWallet = async function getParticipantWallet(userId, scenarioId) {
  const p = await getParticipant(userId, scenarioId);
  return Number(p.cashBalance);
};

// if you already have these two in your model, keep your versions and delete these:
/** minimal getUserScenarioPortfolio used by finishAttempt */
module.exports.getUserScenarioPortfolio = async function getUserScenarioPortfolio(userId, scenarioId) {
  const participant = await prisma.scenarioParticipant.findFirst({
    where: { userId, scenarioId: Number(scenarioId) },
    select: { id: true },
  });
  if (!participant) throw new Error('Participant not found');

  const [marketOrders, limitOrders, prices] = await Promise.all([
    prisma.scenarioMarketOrder.findMany({
      where: { participantId: participant.id, status: 'EXECUTED' },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.scenarioLimitOrder.findMany({
      where: { participantId: participant.id, status: 'EXECUTED' },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.scenarioIntradayPrice.findMany({
      where: { scenarioId: Number(scenarioId) },
      orderBy: { date: 'asc' },
      select: { symbol: true, closePrice: true },
    }),
  ]);

  const allTrades = [
    ...marketOrders.map(o => ({ symbol: o.symbol, side: o.side.toUpperCase(), quantity: Number(o.quantity), price: Number(o.executedPrice) })),
    ...limitOrders.map(o => ({ symbol: o.symbol, side: o.side.toUpperCase(), quantity: Number(o.quantity), price: Number(o.limitPrice) })),
  ];

  if (allTrades.length === 0) {
    return { summary: { openShares: 0, totalShares: 0, totalInvested: 0, unrealizedPnL: 0, realizedPnL: 0 }, positions: [] };
  }

  const priceMap = new Map();
  for (const p of prices) {
    const arr = priceMap.get(p.symbol) || [];
    arr.push(Number(p.closePrice));
    priceMap.set(p.symbol, arr);
  }

  // aggregate FIFO
  const buckets = new Map();
  for (const t of allTrades) {
    if (!buckets.has(t.symbol)) {
      buckets.set(t.symbol, { buyQueue: [], net: 0, totalBuyQty: 0, totalBuyVal: 0, realized: 0 });
    }
    const b = buckets.get(t.symbol);
    if (t.side === 'BUY') {
      b.buyQueue.push({ q: t.quantity, p: t.price });
      b.net += t.quantity;
      b.totalBuyQty += t.quantity;
      b.totalBuyVal += t.quantity * t.price;
    } else {
      let remain = t.quantity;
      while (remain > 0 && b.buyQueue.length) {
        const head = b.buyQueue[0];
        const used = Math.min(head.q, remain);
        b.realized += (t.price - head.p) * used;
        head.q -= used;
        remain -= used;
        if (head.q === 0) b.buyQueue.shift();
      }
      b.net -= t.quantity;
    }
  }

  const positions = [];
  let sumInvested = 0, sumUnreal = 0, sumReal = 0, sumOpen = 0, sumTotalShares = 0;
  for (const [symbol, b] of buckets.entries()) {
    const latestPrices = priceMap.get(symbol) || [];
    const lastPrice = latestPrices.at(-1) || 0;

    const investedOpen = b.buyQueue.reduce((s, x) => s + x.q * x.p, 0);
    const currentValue = b.net * lastPrice;
    const unreal = currentValue - investedOpen;

    positions.push({
      symbol,
      quantity: b.net.toFixed(6),
      totalShares: b.totalBuyQty.toFixed(6),
      avgBuyPrice: b.totalBuyQty ? (b.totalBuyVal / b.totalBuyQty).toFixed(2) : '0.00',
      currentPrice: lastPrice.toFixed(2),
      totalInvested: b.totalBuyVal.toFixed(2),
      currentValue: currentValue.toFixed(2),
      unrealizedPnL: unreal.toFixed(2),
      realizedPnL: b.realized.toFixed(2),
    });

    sumInvested += b.totalBuyVal;
    sumUnreal += unreal;
    sumReal += b.realized;
    sumOpen += b.net;
    sumTotalShares += b.totalBuyQty;
  }

  return {
    summary: {
      openShares: sumOpen.toFixed(6),
      totalShares: sumTotalShares.toFixed(6),
      totalInvested: sumInvested.toFixed(2),
      unrealizedPnL: sumUnreal.toFixed(2),
      realizedPnL: sumReal.toFixed(2),
    },
    positions,
  };
};

/** ——— analytics & attempts ——— */
module.exports.saveAttemptAnalytics = async function saveAttemptAnalytics({ userId, scenarioId, attemptNumber, summary, positions }) {
  return prisma.scenarioAttemptAnalytics.create({
    data: {
      userId,
      scenarioId: Number(scenarioId),
      attemptNumber,
      summary,
      positions,
    },
  });
};

module.exports.listAttempts = async function listAttempts(userId, scenarioId) {
  return prisma.scenarioAttemptAnalytics.findMany({
    where: { userId, scenarioId: Number(scenarioId) },
    orderBy: { attemptNumber: 'desc' },
  });
};

/** ——— personal bests ——— */
module.exports.upsertPersonalBest = async function upsertPersonalBest({ userId, scenarioId, attemptNumber, totalPortfolioValue, realizedPnL, unrealizedPnL }) {
  const start = await getScenarioStartBalance(scenarioId);
  const retPct = start > 0 ? (Number(totalPortfolioValue) - start) / start : 0;

  return prisma.$transaction(async (tx) => {
    const existing = await tx.scenarioPersonalBest.findUnique({
      where: { userId_scenarioId: { userId, scenarioId: Number(scenarioId) } },
    });

    if (!existing) {
      const created = await tx.scenarioPersonalBest.create({
        data: {
          userId,
          scenarioId: Number(scenarioId),
          bestAttemptNumber: attemptNumber,
          bestTotalValue: Number(totalPortfolioValue),
          bestReturnPct: retPct,
          bestRealizedPnL: Number(realizedPnL),
          bestUnrealizedPnL: Number(unrealizedPnL),
          achievedAt: new Date(),
        },
      });
      return { record: created, isNewPB: true };
    }

    const isNewPB = Number(existing.bestTotalValue) < Number(totalPortfolioValue);
    if (!isNewPB) return { record: existing, isNewPB: false };

    const updated = await tx.scenarioPersonalBest.update({
      where: { userId_scenarioId: { userId, scenarioId: Number(scenarioId) } },
      data: {
        bestAttemptNumber: attemptNumber,
        bestTotalValue: Number(totalPortfolioValue),
        bestReturnPct: retPct,
        bestRealizedPnL: Number(realizedPnL),
        bestUnrealizedPnL: Number(unrealizedPnL),
        achievedAt: new Date(),
      },
    });
    return { record: updated, isNewPB: true };
  });
};

module.exports.getPersonalBest = async function getPersonalBest(userId, scenarioId) {
  return prisma.scenarioPersonalBest.findUnique({
    where: { userId_scenarioId: { userId, scenarioId: Number(scenarioId) } },
  });
};

module.exports.listPersonalBests = async function listPersonalBests(userId) {
  return prisma.scenarioPersonalBest.findMany({
    where: { userId },
    include: { scenario: { select: { id: true, title: true } } },
    orderBy: { achievedAt: 'desc' },
  });
};



module.exports.saveAIInsights = async (userId, scenarioId, aiAdvice) => {
  try {
    const latestAttempt = await prisma.scenarioAttempt.findFirst({
      where: { userId, scenarioId },
      orderBy: { attemptNumber: "desc" },
    });

    if (!latestAttempt) return null;

    const updated = await prisma.scenarioAttempt.update({
      where: { id: latestAttempt.id },
      data: {
        aiInsights: {
          summary: aiAdvice,
          generatedAt: new Date(),
        },
      },
    });

    return updated;
  } catch (err) {
    console.error("❌ saveAIInsights error:", err);
    throw err;
  }
};

module.exports.upsertAIAdvice = async (userId, scenarioId, aiAdvice) => {
  try {
    console.log("🧩 upsertAIAdvice received:", { userId, scenarioId, aiAdviceLength: aiAdvice?.length });

    if (!userId || !scenarioId || isNaN(scenarioId)) {
      throw new Error(`Invalid userId (${userId}) or scenarioId (${scenarioId})`);
    }

    // ✅ Step 1: find the latest attempt
    const latestAttempt = await prisma.scenarioAttempt.findFirst({
      where: { userId, scenarioId },
      orderBy: { attemptNumber: "desc" },
    });

    if (!latestAttempt) {
      console.log("🆕 Creating first attempt with AI insights...");
      return await prisma.scenarioAttempt.create({
        data: {
          userId,
          scenarioId,
          attemptNumber: 1,
          aiInsights: aiAdvice, // ✅ FIXED field name
        },
      });
    }

    console.log(`✏️ Updating attempt #${latestAttempt.attemptNumber}`);
    return await prisma.scenarioAttempt.update({
      where: {
        scenarioId_userId_attemptNumber: {
          scenarioId,
          userId,
          attemptNumber: latestAttempt.attemptNumber,
        },
      },
      data: { aiInsights: aiAdvice }, // ✅ FIXED field name
    });

  } catch (err) {
    console.error("❌ Error in upsertAIAdvice:", err);
    throw err;
  }
};


module.exports.getLatestAIAdvice = async (userId, scenarioId) => {
  try {
    if (!userId || !scenarioId) {
      throw new Error("Missing userId or scenarioId");
    }

    // ✅ Find the latest attempt that actually HAS aiInsights
    const latestAttempt = await prisma.scenarioAttempt.findFirst({
      where: {
        userId,
        scenarioId,
        aiInsights: {
          not: null, // only attempts that have AI insights
        },
      },
      orderBy: {
        attemptNumber: "desc", // latest one
      },
      select: {
        attemptNumber: true,
        aiInsights: true,
        endedAt: true,
      },
    });

    if (!latestAttempt) {
      console.log("ℹ️ No past attempts with AI insights found.");
      return null;
    }

    return latestAttempt;
  } catch (err) {
    console.error("❌ Error fetching latest AI advice:", err);
    throw err;
  }
};
