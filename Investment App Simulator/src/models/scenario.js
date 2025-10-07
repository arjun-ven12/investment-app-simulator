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
    const scenario = await prisma.scenario.findUnique({
      where: { id: Number(scenarioId) },
      include: {
        // Include related info if needed, e.g., participants, orders
        participants: true,
        marketOrders: true,
        limitOrders: true,
      },
    });

    if (!scenario) {
      throw new Error('Scenario not found');
    }

    return scenario;
  }