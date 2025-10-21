

const API_KEY= "PK60NYDKHQH512R4Q7SH"
const API_SECRET= "Oi4N2rq28YKLnti1lsRuFldwOhtwStQ1pJ56eURs"

const ALPHA_VANTAGE_API_KEY = "FEVHNHDH7GK3G3BF"
const POLYGON_API_KEY = "GmN8ThlyrYE40pn2cFY657cNad05nqgQ"
const prisma = require('./prismaClient'); // import the Prisma instance
const fetch = require('node-fetch');

const { ethers } = require("ethers");
const hardhat = require("hardhat");

//////////////////////////////////////////////////
/// GET OPTIONS CONTRACTS BY SYMBOL (ex AAPL)
/////////////////////////////////////////////////



// module.exports.getContractsBySymbol = async function getContractsBySymbol(symbol) {
//   if (!symbol || typeof symbol !== 'string') {
//     throw new Error(`Invalid stock symbol: ${symbol}`);
//   }

//   const upperSymbol = symbol.toUpperCase();

//   try {
//     // Fetch contracts from Alpaca
//     const url = `https://paper-api.alpaca.markets/v2/options/contracts?underlying_symbols=${upperSymbol}`;
//     const response = await fetch(url, {
//       method: 'GET',
//       headers: {
//         accept: 'application/json',
//         'APCA-API-KEY-ID': API_KEY,
//         'APCA-API-SECRET-KEY': API_SECRET,
//       },
//     });

//     if (!response.ok) {
//       throw new Error(`Alpaca API error: ${response.status}`);
//     }

//     const data = await response.json();
//     if (!data || !data.option_contracts) {
//       throw new Error(`No option contracts found for symbol "${upperSymbol}"`);
//     }

//     // Transform data into cleaner format (no DB upsert)
//     const contracts = data.option_contracts.map(contract => ({
//       symbol: contract.symbol,
//       name: contract.name,
//       underlyingSymbol: contract.underlying_symbol,
//       rootSymbol: contract.root_symbol,
//       type: contract.type,
//       style: contract.style || null,
//       strikePrice: parseFloat(contract.strike_price),
//       expirationDate: new Date(contract.expiration_date),
//       size: contract.size ? parseInt(contract.size) : null,
//       openInterest: contract.open_interest ? parseInt(contract.open_interest) : null,
//       openInterestDate: contract.open_interest_date ? new Date(contract.open_interest_date) : null,
//       closePrice: contract.close_price ? parseFloat(contract.close_price) : null,
//       closePriceDate: contract.close_price_date ? new Date(contract.close_price_date) : null,
//     }));

//     // Group contracts by expiration week
//     const groupedByWeek = contracts.reduce((acc, contract) => {
//       const week = getWeekStart(contract.expirationDate);
//       if (!acc[week]) acc[week] = [];
//       acc[week].push(contract);
//       return acc;
//     }, {});

//     // Return grouped contracts (no DB interaction)
//     return groupedByWeek;
//   } catch (error) {
//     console.error('Error fetching option contracts:', error);
//     return { error: error.message };
//   }
// };

// // Helper → get start of week (Monday)
// function getWeekStart(date) {
//   const d = new Date(date);
//   const day = d.getDay();
//   const diff = d.getDate() - day + (day === 0 ? -6 : 1);
//   const weekStart = new Date(d.setDate(diff));
//   return weekStart.toISOString().split('T')[0];
// }

module.exports.getContractsBySymbol = async function getContractsBySymbol(symbol) {
  if (!symbol || typeof symbol !== 'string') {
    throw new Error(`Invalid stock symbol: ${symbol}`);
  }

  const upperSymbol = symbol.toUpperCase();

  try {
    // ✅ Ensure stock exists (upsert)
    const stock = await prisma.stock.upsert({
      where: { symbol: upperSymbol },
      update: {},
      create: { symbol: upperSymbol }
    });
    const stockId = stock.stock_id;

    // Fetch contracts from Alpaca
    const url = `https://paper-api.alpaca.markets/v2/options/contracts?underlying_symbols=${upperSymbol}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        accept: 'application/json',
        'APCA-API-KEY-ID': API_KEY,
        'APCA-API-SECRET-KEY': API_SECRET,
      },
    });

    if (!response.ok) {
      throw new Error(`Alpaca API error: ${response.status}`);
    }

    const data = await response.json();
    if (!data || !data.option_contracts) {
      throw new Error(`No option contracts found for symbol "${upperSymbol}"`);
    }

    // Filter out contracts with null closePrice
    const validContracts = data.option_contracts.filter(c => c.close_price !== null);

    const upsertPromises = validContracts.map(contract => {
      const strikePrice = parseFloat(contract.strike_price);
      const expirationDate = new Date(contract.expiration_date);
      const size = contract.size ? parseInt(contract.size) : null;
      const openInterest = contract.open_interest ? parseInt(contract.open_interest) : null;
      const openInterestDate = contract.open_interest_date ? new Date(contract.open_interest_date) : null;
      const closePrice = parseFloat(contract.close_price);
      const closePriceDate = contract.close_price_date ? new Date(contract.close_price_date) : null;

      return prisma.optionContract.upsert({
        where: { symbol: contract.symbol },
        update: {
          stockId,
          name: contract.name,
          underlyingSymbol: contract.underlying_symbol,
          rootSymbol: contract.root_symbol,
          type: contract.type ? contract.type.toUpperCase() : null,
          style: contract.style || null,
          strikePrice,
          expirationDate,
          size,
          openInterest,
          openInterestDate,
          closePrice,
          closePriceDate,
        },
        create: {
          stockId,
          symbol: contract.symbol,
          name: contract.name,
          underlyingSymbol: contract.underlying_symbol,
          rootSymbol: contract.root_symbol,
          type: contract.type ? contract.type.toUpperCase() : null,
          style: contract.style || null,
          strikePrice,
          expirationDate,
          size,
          openInterest,
          openInterestDate,
          closePrice,
          closePriceDate,
        },
      });
    });

    const savedContracts = await Promise.all(upsertPromises);

    // Group saved contracts by week for return
    const groupedByWeek = savedContracts.reduce((acc, contract) => {
      const week = getWeekStart(contract.expirationDate);
      if (!acc[week]) acc[week] = [];
      acc[week].push(contract);
      return acc;
    }, {});

    return groupedByWeek;

  } catch (error) {
    console.error('Error fetching or saving option contracts:', error);
    return { error: error.message };
  }
};

// Helper → get start of week (Monday)
function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const weekStart = new Date(d.setDate(diff));
  return weekStart.toISOString().split('T')[0];
}


////////////////////////////////////////////////////////////////////////////////////
/// GET OPTIONS CONTRACT DETAILS BY SYMBOL (ex AAPL251003C00110000) - POLYGON API
////////////////////////////////////////////////////////////////////////////////////






// function formatDate(date) {
//   return date.toISOString().slice(0, 10); // YYYY-MM-DD
// }

// module.exports.getOptionOHLCBySymbol = async function getOptionOHLCBySymbol(symbol) {
//   if (!symbol || typeof symbol !== 'string') {
//     throw new Error(`Invalid options symbol: ${symbol}`);
//   }

//   const upperSymbol = symbol.toUpperCase();

//   // Calculate past 5 days
//   const toDate = new Date();
//   const fromDate = new Date();
//   fromDate.setDate(toDate.getDate() - 100);
//   const url = `https://api.polygon.io/v2/aggs/ticker/O:${upperSymbol}/range/1/day/${formatDate(fromDate)}/${formatDate(toDate)}?adjusted=true&sort=asc&limit=120&apiKey=${POLYGON_API_KEY}`;

//   try {
//     const response = await fetch(url);
//     if (!response.ok) {
//       throw new Error(`Polygon API error: ${response.status}`);
//     }

//     const data = await response.json();

//     if (!data.results || !Array.isArray(data.results)) {
//       throw new Error(`No OHLC data found for symbol "${upperSymbol}"`);
//     }

//     // Transform results into a cleaner format
//     const ohlc = data.results.map(item => ({
//       date: new Date(item.t).toISOString().slice(0, 10),
//       open: item.o,
//       high: item.h,
//       low: item.l,
//       close: item.c,
//       volume: item.v,
//       transactions: item.n || null,
//       vwap: item.vw || null,
//     }));

//     return ohlc;
//   } catch (error) {
//     console.error('Error fetching option OHLC:', error);
//     return { error: error.message };
//   }
// };


function formatDate(date) {
  return date.toISOString().slice(0, 10); // YYYY-MM-DD
}

// Fetch contract by symbol from OptionContract table
async function getContractBySymbol(symbol) {
  return prisma.optionContract.findFirst({
    where: { symbol: symbol.toUpperCase() }
  });
}

module.exports.getOptionOHLCBySymbol = async function (symbol) {
  if (!symbol || typeof symbol !== 'string') {
    throw new Error(`Invalid options symbol: ${symbol}`);
  }

  const upperSymbol = symbol.toUpperCase();

  // Find contractId in database
  const contract = await getContractBySymbol(upperSymbol);
  if (!contract) {
    throw new Error(`Option contract not found in DB for symbol "${upperSymbol}"`);
  }

  const contractId = contract.id;

  // Past 5 days
  const toDate = new Date();
  const fromDate = new Date();
  fromDate.setDate(toDate.getDate() - 5);

  const url = `https://api.polygon.io/v2/aggs/ticker/O:${upperSymbol}/range/1/day/${formatDate(fromDate)}/${formatDate(toDate)}?adjusted=true&sort=asc&limit=120&apiKey=${POLYGON_API_KEY}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Polygon API error: ${response.status}`);
    }

    const data = await response.json();
    if (!data.results || !Array.isArray(data.results)) {
      throw new Error(`No OHLC data found for symbol "${upperSymbol}"`);
    }

    // Upsert into OptionHistPrice
    const upsertPromises = data.results.map(item => {
      const date = new Date(item.t);
      return prisma.optionHistPrice.upsert({
        where: {
          contractId_date: {
            contractId,
            date,
          },
        },
        update: {
          openPrice: item.o,
          highPrice: item.h,
          lowPrice: item.l,
          closePrice: item.c,
          volume: item.v || null,
          numberOfTrades: item.n || null,
          vwap: item.vw || null,
        },
        create: {
          contractId,
          date,
          openPrice: item.o,
          highPrice: item.h,
          lowPrice: item.l,
          closePrice: item.c,
          volume: item.v || null,
          numberOfTrades: item.n || null,
          vwap: item.vw || null,
        },
      });
    });

    const savedRecords = await Promise.all(upsertPromises);
    return savedRecords;

  } catch (error) {
    console.error('Error fetching or saving OHLC data:', error);
    return { error: error.message };
  }
};














////////////////////////////////////////////////////
//// PLACE BUY CALL - MARKET/LIMIT ORDER
////////////////////////////////////////////////////


// Fetch latest option price
module.exports.getLatestOptionPrice = async function getLatestOptionPrice(symbol) {
  if (!symbol) throw new Error('Option symbol is required');

  const upperSymbol = symbol.toUpperCase();
  const toDate = new Date();
  const fromDate = new Date();
  fromDate.setDate(toDate.getDate() - 5); // last 5 days

  const url = `https://api.polygon.io/v2/aggs/ticker/O:${upperSymbol}/range/1/day/${formatDate(fromDate)}/${formatDate(toDate)}?adjusted=true&sort=desc&limit=1&apiKey=${POLYGON_API_KEY}`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Polygon API error: ${response.status}`);
    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      throw new Error(`No OHLC data found for symbol "${upperSymbol}"`);
    }

    return data.results[0].c; // latest close price
  } catch (error) {
    console.error('Error fetching latest option price:', error);
    throw error;
  }
};


// Helper
function formatDate(date) {
  return date.toISOString().slice(0, 10);
}


// Place Buy Call Order (Market or Limit)
module.exports.placeBuyCallOrder = async function ({ userId, contractId, symbol, quantity, price, orderType }) {
  if (!userId || !contractId || !quantity || !orderType) {
    throw new Error('Missing required trade data');
  }

  // 🔹 Resolve numeric contractId from symbol string
  const contract = await prisma.optionContract.findUnique({
    where: { symbol: contractId } // contractId here is actually the symbol string
  });

  if (!contract) throw new Error('Contract not found');

  const numericContractId = contract.id;
  const totalAmount = price * quantity * 100; // 1 contract = 100 shares

  if (orderType === 'MARKET') {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');
    if (user.wallet < totalAmount) throw new Error('Insufficient wallet balance');

    // Deduct premium from wallet
    await prisma.user.update({
      where: { id: userId },
      data: { wallet: user.wallet - totalAmount }
    });

    const trade = await prisma.optionTrade.create({
      data: {
        userId,
        contractId: numericContractId, // use numeric ID here
        tradeType: 'BUY',
        orderType,
        quantity,
        price,
        totalAmount
      }
    });

    return { trade, executed: true };
  }

  // LIMIT order: just store the order for now
  if (orderType === 'LIMIT') {
    const trade = await prisma.optionTrade.create({
      data: {
        userId,
        contractId: numericContractId, // use numeric ID here
        tradeType: 'BUY',
        orderType,
        quantity,
        price,
        totalAmount
      }
    });

    return { trade, executed: false };
  }

  throw new Error('Invalid order type');
};




// Auto-execute pending LIMIT Buy Call orders
module.exports.executePendingLimitCalls = async function () {
  // Find all pending LIMIT BUY orders
  const pendingOrders = await prisma.optionTrade.findMany({
    where: { tradeType: 'BUY', orderType: 'LIMIT' },
    include: { user: true, contract: true }
  });

  const executedOrders = [];

  for (const trade of pendingOrders) {
    // Fetch current market price directly from the option contract
    const currentPrice = trade.contract.closePrice;

    if (!currentPrice) continue; // skip if no closePrice available

    // Execute if contract closePrice <= limit buy price
    if (currentPrice <= trade.price) {
      const totalCost = currentPrice * trade.quantity * 100; // execute at market (closePrice)

      if (trade.user.wallet < totalCost) continue; // skip if insufficient funds

      // Deduct wallet balance
      await prisma.user.update({
        where: { id: trade.userId },
        data: { wallet: trade.user.wallet - totalCost }
      });

      // Mark trade as executed
      const executedTrade = await prisma.optionTrade.update({
        where: { id: trade.id },
        data: { orderType: 'MARKET', totalAmount: totalCost, price: currentPrice }
      });

      executedOrders.push(executedTrade);
    }
  }

  return executedOrders;
};


// Settle all Buy Call trades where the contract has expired
module.exports.settleExpiredBuyCallTrades = async function () {
  const now = new Date();

  // 1. Get all BUY CALL trades that have been executed (MARKET) and contract has expired
  const tradesToSettle = await prisma.optionTrade.findMany({
    where: {
      tradeType: 'BUY',
      orderType: 'MARKET',
      contract: { type: 'call', expirationDate: { lte: now } }
    },
    include: { contract: true, user: true }
  });

  const settledTrades = [];

  for (const trade of tradesToSettle) {
    const { contract, user, quantity, price } = trade;
    const strike = contract.strikePrice;

    // 🔹 Get underlying stock
    const stock = await prisma.stock.findUnique({
      where: { symbol: contract.underlyingSymbol },
      select: { stock_id: true }
    });

    if (!stock) continue;

    // 🔹 Fetch final close price of underlying from IntradayPrice3
    const latestPrice = await prisma.intradayPrice3.findFirst({
      where: { stockId: stock.stock_id },
      orderBy: { date: 'desc' },
      select: { closePrice: true }
    });

    if (!latestPrice) continue;
    const underlyingFinalPrice = Number(latestPrice.closePrice);

    // Calculate intrinsic value
    const intrinsicValue = Math.max(0, underlyingFinalPrice - strike);

    // Profit per share = intrinsic value - premium paid
    const pnlPerShare = intrinsicValue - price;
    const totalPnL = pnlPerShare * quantity * 100; // contract size = 100

    // Update user wallet
    await prisma.user.update({
      where: { id: user.id },
      data: { wallet: user.wallet + totalPnL }
    });

    // Update the trade as settled (store realized P&L)
    const settledTrade = await prisma.optionTrade.update({
      where: { id: trade.id },
      data: { totalAmount: totalPnL }
    });

    settledTrades.push({
      tradeId: trade.id,
      userId: trade.userId,
      symbol: contract.symbol,
      underlyingSymbol: contract.underlyingSymbol,
      strike,
      underlyingFinalPrice,
      premiumPaid: price,
      pnl: totalPnL
    });
  }

  return settledTrades;
};













////////////////////////////////////////////////////
//// PLACE SELL CALL - MARKET/LIMIT ORDER
////////////////////////////////////////////////////




module.exports.placeSellCallOrder = async function ({ userId, contractId, quantity, price, orderType }) {
  if (!userId || !contractId || !quantity || !orderType) {
    throw new Error('Missing required trade data');
  }

  // 🔹 Resolve numeric contractId from symbol if it's a string
  let numericContractId = contractId;
  if (typeof contractId === 'string') {
    const contract = await prisma.optionContract.findUnique({ where: { symbol: contractId } });
    if (!contract) throw new Error('Option contract not found');
    numericContractId = contract.id;
  }

  const totalAmount = price * quantity * 100; // premium collected = credited to seller wallet

  if (orderType === 'MARKET') {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    // Seller gets premium credited instantly
    await prisma.user.update({
      where: { id: userId },
      data: { wallet: user.wallet + totalAmount }
    });

    const trade = await prisma.optionTrade.create({
      data: {
        userId,
        contractId: numericContractId,
        tradeType: 'SELL',
        orderType,
        quantity,
        price,
        totalAmount
      }
    });

    return { trade, executed: true };
  }

  // LIMIT order: store only
  if (orderType === 'LIMIT') {
    const trade = await prisma.optionTrade.create({
      data: {
        userId,
        contractId: numericContractId,
        tradeType: 'SELL',
        orderType,
        quantity,
        price,
        totalAmount
      }
    });

    return { trade, executed: false };
  }

  throw new Error('Invalid order type');
};




module.exports.executeSellCallLimitOrders = async function () {
  // 1. Get all contracts that have at least one pending LIMIT SELL order
  const contractsWithOrders = await prisma.optionTrade.findMany({
    where: {
      tradeType: 'SELL',
      orderType: 'LIMIT'
    },
    select: { contractId: true },
    distinct: ['contractId']
  });

  const executedOrders = [];

  // 2. Loop through contracts that have pending LIMIT SELL orders
  for (const { contractId } of contractsWithOrders) {
    const contract = await prisma.optionContract.findUnique({ where: { id: contractId } });
    if (!contract || contract.closePrice === null) continue;

    const currentPrice = contract.closePrice; // fetch automatically

    // 3. Get pending LIMIT SELL orders for this contract
    const pendingOrders = await prisma.optionTrade.findMany({
      where: {
        contractId,
        tradeType: 'SELL',
        orderType: 'LIMIT'
      }
    });

    // 4. Process each order
    for (const order of pendingOrders) {
      if (currentPrice >= order.price) {
        const user = await prisma.user.findUnique({ where: { id: order.userId } });

        // Credit premium
        await prisma.user.update({
          where: { id: user.id },
          data: { wallet: user.wallet + order.totalAmount }
        });

        // Mark order as executed (switch to MARKET)
        const executed = await prisma.optionTrade.update({
          where: { id: order.id },
          data: { orderType: 'MARKET' }
        });

        executedOrders.push(executed);
      }
    }
  }

  return executedOrders;
};


module.exports.settleExpiredSellCallTrades = async function () {
  const now = new Date();

  // 1. Get all SELL CALL trades where contract has expired and order executed (MARKET)
  const tradesToSettle = await prisma.optionTrade.findMany({
    where: {
      tradeType: 'SELL',
      orderType: 'MARKET',
      contract: { type: 'call', expirationDate: { lte: now } }
    },
    include: { contract: true, user: true }
  });

  const settledTrades = [];

  for (const trade of tradesToSettle) {
    const { contract, user, quantity, price } = trade;
    const strike = contract.strikePrice;
    const contractSize = 100;

    // 🔹 Get the underlying stock ID
    const stock = await prisma.stock.findUnique({
      where: { symbol: contract.underlyingSymbol },
      select: { stock_id: true }
    });

    if (!stock) continue;

    // 🔹 Fetch the latest underlying close price from IntradayPrice3
    const latestPrice = await prisma.intradayPrice3.findFirst({
      where: { stockId: stock.stock_id },
      orderBy: { date: 'desc' },
      select: { closePrice: true }
    });

    if (!latestPrice) continue;
    const underlyingFinalPrice = Number(latestPrice.closePrice);

    let pnl = 0;

    if (underlyingFinalPrice <= strike) {
      // Option expires worthless → seller keeps premium
      pnl = price * quantity * contractSize; 
    } else {
      // Option exercised → seller loses
      const intrinsicLoss = (underlyingFinalPrice - strike) * quantity * contractSize;
      const premium = price * quantity * contractSize;
      pnl = premium - intrinsicLoss; // can be negative
    }

    // Update wallet with P&L
    await prisma.user.update({
      where: { id: user.id },
      data: { wallet: user.wallet + pnl }
    });

    // Mark trade as settled (update totalAmount with P&L)
    await prisma.optionTrade.update({
      where: { id: trade.id },
      data: { totalAmount: trade.totalAmount + pnl }
    });

    settledTrades.push({
      tradeId: trade.id,
      userId: trade.userId,
      symbol: contract.symbol,
      underlyingSymbol: contract.underlyingSymbol,
      strike,
      underlyingFinalPrice,
      premiumReceived: price,
      pnl
    });
  }

  return settledTrades;
};














////////////////////////////////////////////////////
//// PLACE BUY PUT - MARKET/LIMIT ORDER
////////////////////////////////////////////////////


/**
 * Place Buy Put Order (Market or Limit)
 */module.exports.placeBuyPutOrder = async function ({ userId, contractId, quantity, price, orderType }) {
  if (!userId || !contractId || !quantity || !orderType) {
    throw new Error('Missing required trade data');
  }

  // 🔹 Resolve numeric contractId from symbol string
  const contract = await prisma.optionContract.findUnique({
    where: { symbol: contractId } // contractId here is actually the symbol string
  });

  if (!contract) throw new Error('Contract not found');

  const numericContractId = contract.id;
  const totalAmount = price * quantity * 100; // premium paid upfront

  if (orderType === 'MARKET') {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');
    if (user.wallet < totalAmount) throw new Error('Insufficient wallet balance');

    // Deduct premium from wallet
    await prisma.user.update({
      where: { id: userId },
      data: { wallet: user.wallet - totalAmount }
    });

    const trade = await prisma.optionTrade.create({
      data: {
        userId,
        contractId: numericContractId, // use numeric ID here
        tradeType: 'BUY',
        orderType,
        quantity,
        price,
        totalAmount
      }
    });

    return { trade, executed: true };
  }

  // LIMIT → store only
  if (orderType === 'LIMIT') {
    const trade = await prisma.optionTrade.create({
      data: {
        userId,
        contractId: numericContractId, // use numeric ID here
        tradeType: 'BUY',
        orderType,
        quantity,
        price,
        totalAmount
      }
    });

    return { trade, executed: false };
  }

  throw new Error('Invalid order type');
};



module.exports.executeBuyPutLimitOrders = async function () {
  // 1. Get all contracts that have at least one pending LIMIT BUY order for puts
  const contractsWithOrders = await prisma.optionTrade.findMany({
    where: {
      tradeType: 'BUY',
      orderType: 'LIMIT',
      contract: { type: 'put' } // ensure only puts
    },
    select: { contractId: true },
    distinct: ['contractId']
  });

  const executedOrders = [];

  // 2. Loop through contracts with pending LIMIT BUY PUT orders
  for (const { contractId } of contractsWithOrders) {
    const contract = await prisma.optionContract.findUnique({ where: { id: contractId } });
    if (!contract || contract.closePrice === null) continue;

    const currentPrice = contract.closePrice; // automatically fetch current price

    // 3. Get pending LIMIT BUY PUT orders for this contract
    const pendingOrders = await prisma.optionTrade.findMany({
      where: {
        contractId,
        tradeType: 'BUY',
        orderType: 'LIMIT'
      },
      include: { user: true } // include user for wallet update
    });

    // 4. Process each pending order
    for (const order of pendingOrders) {
      // Execute if currentPrice <= limit price
      if (currentPrice <= order.price) {
        const totalCost = currentPrice * order.quantity * 100;

        if (order.user.wallet < totalCost) continue; // skip if insufficient funds

        // Deduct wallet balance
        await prisma.user.update({
          where: { id: order.userId },
          data: { wallet: order.user.wallet - totalCost }
        });

        // Mark order as executed (switch to MARKET)
        const executed = await prisma.optionTrade.update({
          where: { id: order.id },
          data: { orderType: 'MARKET', totalAmount: totalCost, price: currentPrice }
        });

        executedOrders.push(executed);
      }
    }
  }

  return executedOrders;
};





module.exports.settleBuyPutOrders = async function () {
  const now = new Date();

  // 1. Get all BUY PUT trades where contract has expired and order is MARKET (executed)
  const tradesToSettle = await prisma.optionTrade.findMany({
    where: {
      tradeType: 'BUY',
      orderType: 'MARKET',
      contract: { type: 'put', expirationDate: { lte: now } }
    },
    include: { contract: true, user: true }
  });

  const settledTrades = [];

  for (const trade of tradesToSettle) {
    const strike = trade.contract.strikePrice;
    const premiumPaid = trade.price;

    // 🔹 Get the underlying stock
    const stock = await prisma.stock.findUnique({
      where: { symbol: trade.contract.underlyingSymbol },
      select: { stock_id: true }
    });

    if (!stock) continue;

    // 🔹 Get the latest close price from IntradayPrice3
    const latestPrice = await prisma.intradayPrice3.findFirst({
      where: { stockId: stock.stock_id },
      orderBy: { date: 'desc' },
      select: { closePrice: true }
    });

    if (!latestPrice) continue;
    const underlyingPrice = Number(latestPrice.closePrice);

    // Calculate PnL
    let pnlPerShare = 0;
    if (underlyingPrice < strike) {
      // In-the-money: payoff = strike - underlying - premium
      pnlPerShare = (strike - underlyingPrice) - premiumPaid;
    } else {
      // Out-of-the-money: lose premium
      pnlPerShare = -premiumPaid;
    }

    const totalPnL = pnlPerShare * trade.quantity * 100;

    // Update user wallet
    await prisma.user.update({
      where: { id: trade.userId },
      data: { wallet: trade.user.wallet + totalPnL }
    });

    // Mark trade as settled (update totalAmount with PnL)
    await prisma.optionTrade.update({
      where: { id: trade.id },
      data: { totalAmount: trade.totalAmount + totalPnL }
    });

    settledTrades.push({
      tradeId: trade.id,
      userId: trade.userId,
      symbol: trade.contract.symbol,
      underlyingSymbol: trade.contract.underlyingSymbol,
      strike,
      underlyingPrice,
      premiumPaid,
      pnl: totalPnL
    });
  }

  return settledTrades;
};













////////////////////////////////////////////////////
//// PLACE SELL PUT - MARKET/LIMIT ORDER
////////////////////////////////////////////////////


// Place Sell Put Order (Market or Limit)
module.exports.placeSellPutOrder = async function ({ userId, contractId, quantity, price, orderType }) {
  if (!userId || !contractId || !quantity || !orderType) {
    throw new Error('Missing required trade data');
  }

  // 🔹 Resolve numeric contractId if frontend sends symbol string
  let numericContractId = contractId;
  if (typeof contractId === 'string') {
    const contract = await prisma.optionContract.findUnique({ where: { symbol: contractId } });
    if (!contract) throw new Error('Option contract not found');
    numericContractId = contract.id;
  }

  const premium = price * quantity * 100; // seller receives upfront premium

  if (orderType === 'MARKET') {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    // Credit premium to seller immediately
    await prisma.user.update({
      where: { id: userId },
      data: { wallet: user.wallet + premium }
    });

    const trade = await prisma.optionTrade.create({
      data: {
        userId,
        contractId: numericContractId,
        tradeType: 'SELL',
        orderType,
        quantity,
        price,
        totalAmount: premium
      }
    });

    return { trade, executed: true };
  }

  // LIMIT → record, but do not execute yet
  if (orderType === 'LIMIT') {
    const trade = await prisma.optionTrade.create({
      data: {
        userId,
        contractId: numericContractId,
        tradeType: 'SELL',
        orderType,
        quantity,
        price,
        totalAmount: premium
      }
    });

    return { trade, executed: false };
  }

  throw new Error('Invalid order type');
};




// Execute all pending Sell Put LIMIT orders automatically
module.exports.executeSellPutLimitOrders = async function () {
  // 1. Find all pending Sell Put LIMIT trades
  const trades = await prisma.optionTrade.findMany({
    where: {
      tradeType: 'SELL',
      orderType: 'LIMIT',
      contract: { type: 'put' }
    },
    include: { user: true, contract: true }
  });

  const executedOrders = [];

  for (const trade of trades) {
    if (!trade.contract || trade.contract.closePrice === null) continue;

    const currentPrice = trade.contract.closePrice;

    // 2. Check execution condition (buyer is willing if currentPrice >= limit)
    if (currentPrice >= trade.price) {
      const premium = trade.price * trade.quantity * 100;

      // Credit seller's wallet
      await prisma.user.update({
        where: { id: trade.userId },
        data: { wallet: trade.user.wallet + premium }
      });

      // Mark as executed (switch LIMIT → MARKET)
      const executedTrade = await prisma.optionTrade.update({
        where: { id: trade.id },
        data: {
          orderType: 'MARKET',
          price: trade.price, // execution at limit price
          totalAmount: premium
        }
      });

      executedOrders.push({
        tradeId: trade.id,
        userId: trade.userId,
        symbol: trade.contract.symbol,
        strike: trade.contract.strikePrice,
        currentPrice,
        premium,
        executed: true
      });
    }
  }

  return executedOrders;
};



// Settle all expired Sell Put MARKET trades automatically
module.exports.settleExpiredSellPutTrades = async function () {
  // 1. Find all sell put trades with MARKET order type where contract has expired
  const now = new Date();
  const trades = await prisma.optionTrade.findMany({
    where: {
      tradeType: 'SELL',
      orderType: 'MARKET',
      contract: {
        type: 'put',
        expirationDate: { lte: now }
      }
    },
    include: {
      user: true,
      contract: {
        include: { stock: true }
      }
    }
  });

  const settledResults = [];

  for (const trade of trades) {
    const { contract, user, quantity, price } = trade;
    const strike = contract.strikePrice;
    const contractSize = contract.size || 100; // default 100 if not set

    // 2. Find the latest underlying price from IntradayPrice3
    const latestPrice = await prisma.intradayPrice3.findFirst({
      where: { stockId: contract.stockId },
      orderBy: { date: 'desc' }
    });

    if (!latestPrice) continue; // skip if no price found

    const underlyingFinalPrice = parseFloat(latestPrice.closePrice);
    let pnl = 0;

    // 3. Calculate settlement
    if (underlyingFinalPrice >= strike) {
      // Option expires worthless → seller keeps premium
      pnl = price * quantity * contractSize; // already credited
    } else {
      // Option exercised → seller buys stock at strike
      const intrinsicLoss = (strike - underlyingFinalPrice) * quantity * contractSize;
      const premium = price * quantity * contractSize;
      pnl = premium - intrinsicLoss;

      // Update seller’s wallet with net P&L
      await prisma.user.update({
        where: { id: user.id },
        data: { wallet: user.wallet + pnl }
      });
    }

    // 4. Update trade record with settlement result
    const updatedTrade = await prisma.optionTrade.update({
      where: { id: trade.id },
      data: { totalAmount: pnl }
    });

    settledResults.push({
      tradeId: trade.id,
      userId: user.id,
      symbol: contract.underlyingSymbol,
      strike,
      underlyingFinalPrice,
      pnl
    });
  }

  return settledResults;
};

























////////////////////////////////////////////////////////////////
////// RETRIEVE OPTION TRADE HISTORY
////////////////////////////////////////////////////////////////

exports.getUserOptionTrades = function getUserOptionTrades(userId) {
  if (!userId || isNaN(userId)) {
    throw new Error("Invalid user ID");
  }

  return prisma.optionTrade
    .findMany({
      where: { userId: Number(userId) },
      include: {
        contract: {
          select: {
            symbol: true,
            underlyingSymbol: true,
            strikePrice: true,
            expirationDate: true,
            type: true,         // optional but useful ("call" or "put")
          },
        },
      },
      orderBy: {
        tradeDate: "desc", // latest first
      },
    })
    .catch((error) => {
      console.error("Error fetching option trades:", error);
      throw error;
    });
};




////////////////////////////////////////////////////////////////
////// OPTIONS PORTFOLIO
////////////////////////////////////////////////////////////////



// module.exports.getUserOptionPortfolio = async function (userId) {
//   if (!userId) throw new Error('Missing userId');

//   const now = new Date();

//   // 1. Get all user trades with contract and stock info
//   const trades = await prisma.optionTrade.findMany({
//     where: { userId },
//     include: {
//       contract: {
//         include: {
//           stock: true,
//         },
//       },
//     },
//   });

//   if (trades.length === 0) return { portfolio: [] };

//   // 2. Group by underlying symbol
//   const portfolio = {};

//   for (const trade of trades) {
//     const { contract, price, quantity, totalAmount, tradeType } = trade;
//     const symbol = contract.underlyingSymbol;
//     const strike = contract.strikePrice;
//     const contractSize = contract.size || 100;
//     const isExpired = new Date(contract.expirationDate) <= now;

//     // Get latest underlying stock price
//     const latestPrice = await prisma.intradayPrice3.findFirst({
//       where: { stockId: contract.stockId },
//       orderBy: { date: 'desc' },
//     });

//     const underlyingPrice = latestPrice
//       ? parseFloat(latestPrice.closePrice)
//       : null;

//     // Calculate unrealized PnL
//     let unrealizedPnL = 0;
//     let realizedPnL = 0;

//     // For expired contracts → realized
//     if (isExpired) {
//       realizedPnL = totalAmount;
//     } else if (underlyingPrice !== null) {
//       // For active ones → unrealized
//       if (contract.type === 'call') {
//         const intrinsic = Math.max(0, underlyingPrice - strike);
//         const optionValue = intrinsic * quantity * contractSize;
//         unrealizedPnL =
//           tradeType === 'BUY'
//             ? optionValue - price * quantity * contractSize
//             : price * quantity * contractSize - optionValue;
//       } else if (contract.type === 'put') {
//         const intrinsic = Math.max(0, strike - underlyingPrice);
//         const optionValue = intrinsic * quantity * contractSize;
//         unrealizedPnL =
//           tradeType === 'BUY'
//             ? optionValue - price * quantity * contractSize
//             : price * quantity * contractSize - optionValue;
//       }
//     }

//     if (!portfolio[symbol]) {
//       portfolio[symbol] = {
//         underlyingSymbol: symbol,
//         totalContracts: 0,
//         totalShares: 0,
//         activeContracts: 0,
//         expiredContracts: 0,
//         openPositions: 0,
//         closedPositions: 0,
//         realizedPnL: 0,
//         unrealizedPnL: 0,
//       };
//     }

//     portfolio[symbol].totalContracts += 1;
//     portfolio[symbol].totalShares += quantity * contractSize;
//     portfolio[symbol].realizedPnL += realizedPnL;
//     portfolio[symbol].unrealizedPnL += unrealizedPnL;

//     if (isExpired) {
//       portfolio[symbol].expiredContracts += 1;
//       portfolio[symbol].closedPositions += 1;
//     } else {
//       portfolio[symbol].activeContracts += 1;
//       portfolio[symbol].openPositions += 1;
//     }
//   }

//   return { portfolio: Object.values(portfolio) };
// };
module.exports.getUserOptionPortfolio = async function (userId) {
  if (!userId) throw new Error("Missing userId");
  const now = new Date();

  console.log("============== 🧾 OPTION PORTFOLIO CALCULATION STARTED ==============");
  console.log("User ID:", userId);
  console.log("Current Time:", now.toISOString());

  const trades = await prisma.optionTrade.findMany({
    where: {
      userId,
      orderType: "MARKET", // Only MARKET trades
    },
    include: {
      contract: {
        include: { stock: true },
      },
    },
  });

  console.log(`Fetched ${trades.length} MARKET trades for user ${userId}`);

  if (trades.length === 0) {
    console.log("⚠️ No option trades found. Returning empty portfolio.");
    return { portfolio: [] };
  }

  const portfolio = {};

  for (const [index, trade] of trades.entries()) {
    console.log("\n=====================================================");
    console.log(`📄 Processing Trade #${index + 1}: ${trade.id}`);
    console.log("Contract Symbol:", trade.contract.symbol);
    console.log("Underlying:", trade.contract.underlyingSymbol);
    console.log("Trade Type:", trade.tradeType);
    console.log("Order Type:", trade.orderType);
    console.log("Quantity:", trade.quantity);
    console.log("Trade Price:", trade.price);
    console.log("Strike Price:", trade.contract.strikePrice);
    console.log("Expiration Date:", trade.contract.expirationDate);

    const { contract, price, quantity, tradeType } = trade;
    const symbol = contract.underlyingSymbol;
    const strike = contract.strikePrice;
    const contractSize = contract.size || 100;
    const isExpired = new Date(contract.expirationDate) <= now;

    console.log("Contract Size:", contractSize);
    console.log("Is Expired?:", isExpired);

    let unrealizedPnL = 0;
    let realizedPnL = 0;
    let underlyingPrice = null;

    // ====================== EXPIRED OPTION ======================
    if (isExpired) {
      console.log("\n--- ⚰️ Expired Option Detected ---");

      const expirationDateTime = new Date(contract.expirationDate.getTime());
      expirationDateTime.setUTCHours(20, 0, 0, 0);

      console.log(`Adjusted Expiration Time (20:00 UTC): ${expirationDateTime.toISOString()}`);

      const expirationPriceRecord = await prisma.intradayPrice3.findFirst({
        where: {
          stockId: contract.stockId,
          date: { lte: expirationDateTime },
        },
        orderBy: { date: "desc" },
      });

      if (expirationPriceRecord) {
        console.log(`Found Underlying Price Record at Expiry: ${expirationPriceRecord.date}`);
        console.log(`Underlying Price at Expiry: ${expirationPriceRecord.closePrice}`);
      } else {
        console.log("⚠️ No underlying price found before expiry (20:00 UTC). Setting to 0.");
      }

      const underlyingPriceAtExpiry = expirationPriceRecord
        ? parseFloat(expirationPriceRecord.closePrice)
        : 0;

      console.log("Underlying Price Used for Expiry:", underlyingPriceAtExpiry);

      // --- Intrinsic Value Calculation ---
      let intrinsic = 0;
      if (contract.type === "CALL" || contract.type === "call") {
        intrinsic = Math.max(0, underlyingPriceAtExpiry - strike);
      } else if (contract.type === "PUT" || contract.type === "put") {
        intrinsic = Math.max(0, strike - underlyingPriceAtExpiry);
      }

      console.log("Intrinsic Value:", intrinsic);

      const finalValue = intrinsic * quantity * contractSize;
      console.log("Final Option Value at Expiry:", finalValue);

      // --- Realized PnL ---
      if (tradeType === "BUY") {
        realizedPnL = finalValue - price * quantity * contractSize;
      } else if (tradeType === "SELL") {
        realizedPnL = price * quantity * contractSize - finalValue;
      }

      console.log("✅ Realized PnL:", realizedPnL);
    }

    // ====================== ACTIVE OPTION ======================
    else {
      console.log("\n--- 🟢 Active Option ---");

      const latestPriceRecord = await prisma.intradayPrice3.findFirst({
        where: { stockId: contract.stockId },
        orderBy: { date: "desc" },
      });

      if (latestPriceRecord) {
        underlyingPrice = parseFloat(latestPriceRecord.closePrice);
        console.log("Latest Underlying Price Record Date:", latestPriceRecord.date);
        console.log("Underlying Latest Close Price:", underlyingPrice);
      } else {
        console.log("⚠️ No recent underlying price found. Skipping unrealized PnL calculation.");
      }

      if (underlyingPrice !== null) {
        let intrinsic = 0;
        if (contract.type === "CALL" || contract.type === "call") intrinsic = Math.max(0, underlyingPrice - strike);
        if (contract.type === "PUT" || contract.type === "put") intrinsic = Math.max(0, strike - underlyingPrice);

        console.log("Intrinsic Value (Active):", intrinsic);

        const optionValue = intrinsic * quantity * contractSize;
        console.log("Option Market Value:", optionValue);

        unrealizedPnL =
          tradeType === "BUY"
            ? optionValue - price * quantity * contractSize
            : price * quantity * contractSize - optionValue;

        console.log("💹 Unrealized PnL:", unrealizedPnL);
      }
    }

    // ====================== PORTFOLIO AGGREGATION ======================
    if (!portfolio[symbol]) {
      console.log(`\n🧩 Initializing portfolio entry for ${symbol}`);
      portfolio[symbol] = {
        underlyingSymbol: symbol,
        totalContracts: 0,
        totalShares: 0,
        activeContracts: 0,
        expiredContracts: 0,
        openPositions: 0,
        closedPositions: 0,
        realizedPnL: 0,
        unrealizedPnL: 0,
      };
    }

    portfolio[symbol].totalContracts += 1;
    portfolio[symbol].totalShares += quantity * contractSize;
    portfolio[symbol].realizedPnL += realizedPnL;
    portfolio[symbol].unrealizedPnL += unrealizedPnL;

    if (isExpired) {
      portfolio[symbol].expiredContracts += 1;
      portfolio[symbol].closedPositions += 1;
    } else {
      portfolio[symbol].activeContracts += 1;
      portfolio[symbol].openPositions += 1;
    }

    console.log(`📊 Updated Portfolio Entry for ${symbol}:`);
    console.log(JSON.stringify(portfolio[symbol], null, 2));
  }

  console.log("\n============== ✅ FINAL PORTFOLIO RESULT ==============");
  console.log(JSON.stringify(Object.values(portfolio), null, 2));
  console.log("=======================================================\n");

  return { portfolio: Object.values(portfolio) };
};









//////////////////////////////////////////////////////////////////
////// CANCEL LIMIT ORDER OPTIONS
//////////////////////////////////////////////////////////////////


exports.cancelOptionLimitOrder = async function cancelOptionLimitOrder(orderId, userId) {
  try {
    console.log("🔍 Attempting to cancel limit order:", { orderId, userId });

    // Find the order
    const order = await prisma.optionTrade.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      console.log("❌ Order not found");
      return null;
    }

    // Verify ownership
    if (order.userId !== userId) {
      console.log("❌ Order does not belong to this user");
      return null;
    }

    // Ensure order is still a pending LIMIT order
    if (order.orderType !== "LIMIT") {
      console.log(`❌ Cannot cancel — orderType is '${order.orderType}'`);
      return null;
    }

    // Update the order type to CANCELLED
    const cancelledOrder = await prisma.optionTrade.update({
      where: { id: orderId },
      data: {
        orderType: "CANCELLED",
      },
    });

    console.log("✅ Limit order cancelled successfully:", cancelledOrder);
    return cancelledOrder;
  } catch (error) {
    console.error("💥 cancelOptionLimitOrder error:", error);
    throw error;
  }
};
