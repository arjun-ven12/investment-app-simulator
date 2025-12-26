require('dotenv').config();

const API_KEY= process.env.ALPACA_API_KEY;
const API_SECRET= process.env.ALPACA_API_SECRET;

const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY;
const POLYGON_API_KEY = process.env.POLYGON_API_KEY;
const prisma = require('./prismaClient'); // import the Prisma instance
const fetch = require('node-fetch');

const hardhat = require("hardhat");
const { ethers } = require("ethers");
const ledgerAbi = require("../../artifacts/contracts/optionsLedger.sol/OptionsLedger.json").abi;

// Hardhat Local Node Provider
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);

// Signer: Your Hardhat account
const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

// Smart Contract
const optionLedger = new ethers.Contract(process.env.OPTIONS_LEDGER_ADDRESS, 
  ledgerAbi, 
  signer);
//////////////////////////////////////////////////
/// GET OPTIONS CONTRACTS BY SYMBOL (ex AAPL)
/////////////////////////////////////////////////



// module.exports.getContractsBySymbol = async function getContractsBySymbol(symbol) {
//   if (!symbol || typeof symbol !== 'string') {
//     throw new Error(`Invalid stock symbol: ${symbol}`);
//   }

//   const upperSymbol = symbol.toUpperCase();

//   try {
//     // Ensure stock exists (upsert)
//     const stock = await prisma.stock.upsert({
//       where: { symbol: upperSymbol },
//       update: {},
//       create: { symbol: upperSymbol }
//     });
//     const stockId = stock.stock_id;

//     // Calculate date 3 months from today
//     const today = new Date();
//     const threeMonthsLater = new Date(today);
//     threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);
//     const expirationLte = threeMonthsLater.toISOString().split('T')[0];

//     // Fetch first page
//     const firstUrl = `https://paper-api.alpaca.markets/v2/options/contracts?underlying_symbols=${upperSymbol}&expiration_date_lte=${expirationLte}`;
//     const firstResponse = await fetch(firstUrl, {
//       method: 'GET',
//       headers: {
//         accept: 'application/json',
//         'APCA-API-KEY-ID': API_KEY,
//         'APCA-API-SECRET-KEY': API_SECRET,
//       },
//     });

//     if (!firstResponse.ok) throw new Error(`Alpaca API error: ${firstResponse.status}`);
//     const firstData = await firstResponse.json();
//     if (!firstData || !firstData.option_contracts) return { error: "No option contracts found." };

//     let allContracts = firstData.option_contracts;
//     let nextPageToken = firstData.next_page_token || null;

//     // Parallel fetch loop
//     const pagePromises = [];
//     while (nextPageToken) {
//       const url = `https://paper-api.alpaca.markets/v2/options/contracts?underlying_symbols=${upperSymbol}&expiration_date_lte=${expirationLte}&page_token=${nextPageToken}`;
//       pagePromises.push(fetch(url, {
//         method: 'GET',
//         headers: {
//           accept: 'application/json',
//           'APCA-API-KEY-ID': API_KEY,
//           'APCA-API-SECRET-KEY': API_SECRET,
//         },
//       }).then(res => res.json()));

//       // Temporarily break to avoid infinite loop; next tokens will be resolved in Promise.all
//       nextPageToken = null;
//     }

//     if (pagePromises.length > 0) {
//       const pagesData = await Promise.all(pagePromises);
//       for (const page of pagesData) {
//         if (page.option_contracts) allContracts = allContracts.concat(page.option_contracts);
//         if (page.next_page_token) {
//           // Recursively fetch additional pages if Alpaca returns a new next_page_token
//           let token = page.next_page_token;
//           while (token) {
//             const res = await fetch(
//               `https://paper-api.alpaca.markets/v2/options/contracts?underlying_symbols=${upperSymbol}&expiration_date_lte=${expirationLte}&page_token=${token}`,
//               {
//                 method: 'GET',
//                 headers: {
//                   accept: 'application/json',
//                   'APCA-API-KEY-ID': API_KEY,
//                   'APCA-API-SECRET-KEY': API_SECRET,
//                 },
//               }
//             );
//             const data = await res.json();
//             if (data.option_contracts) allContracts = allContracts.concat(data.option_contracts);
//             token = data.next_page_token || null;
//           }
//         }
//       }
//     }

//     // Filter valid contracts
//     const validContracts = allContracts.filter(
//       c => c.close_price !== null && parseInt(c.open_interest) >= 50
//     );

//     // Upsert into DB
//     const upsertPromises = validContracts.map(contract => {
//       const strikePrice = parseFloat(contract.strike_price);
//       const expirationDate = new Date(contract.expiration_date);
//       const size = contract.size ? parseInt(contract.size) : null;
//       const openInterest = contract.open_interest ? parseInt(contract.open_interest) : null;
//       const openInterestDate = contract.open_interest_date ? new Date(contract.open_interest_date) : null;
//       const closePrice = parseFloat(contract.close_price);
//       const closePriceDate = contract.close_price_date ? new Date(contract.close_price_date) : null;

//       return prisma.optionContract.upsert({
//         where: { symbol: contract.symbol },
//         update: {
//           stockId,
//           name: contract.name,
//           underlyingSymbol: contract.underlying_symbol,
//           rootSymbol: contract.root_symbol,
//           type: contract.type ? contract.type.toUpperCase() : null,
//           style: contract.style || null,
//           strikePrice,
//           expirationDate,
//           size,
//           openInterest,
//           openInterestDate,
//           closePrice,
//           closePriceDate,
//         },
//         create: {
//           stockId,
//           symbol: contract.symbol,
//           name: contract.name,
//           underlyingSymbol: contract.underlying_symbol,
//           rootSymbol: contract.root_symbol,
//           type: contract.type ? contract.type.toUpperCase() : null,
//           style: contract.style || null,
//           strikePrice,
//           expirationDate,
//           size,
//           openInterest,
//           openInterestDate,
//           closePrice,
//           closePriceDate,
//         },
//       });
//     });

//     const savedContracts = await Promise.all(upsertPromises);

//     // Group by expiration week
//     const groupedByWeek = savedContracts.reduce((acc, contract) => {
//       const week = getWeekStart(contract.expirationDate);
//       if (!acc[week]) acc[week] = [];
//       acc[week].push(contract);
//       return acc;
//     }, {});

//     return groupedByWeek;

//   } catch (error) {
//     console.error('Error fetching or saving option contracts:', error);
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
  if (!symbol || typeof symbol !== "string") {
    throw new Error(`Invalid stock symbol: ${symbol}`);
  }

  const underlying = symbol.toUpperCase();

  try {
    // 1️⃣ Ensure stock exists
    const stock = await prisma.stock.upsert({
      where: { symbol: underlying },
      update: {},
      create: { symbol: underlying },
    });

    const stockId = stock.stock_id;

    // 2️⃣ Fetch options snapshot from Massive API
    const url = `https://api.massive.com/v3/snapshot/options/${underlying}?order=asc&limit=250&sort=ticker&apiKey=${POLYGON_API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Massive API error: ${res.status}`);

    const data = await res.json();
    const allContracts = data.results || [];

    if (allContracts.length === 0) {
      return { error: "No option contracts found." };
    }

    // 3️⃣ Batch upsert into database
    const BATCH_SIZE = 50;
    for (let i = 0; i < allContracts.length; i += BATCH_SIZE) {
      const batch = allContracts.slice(i, i + BATCH_SIZE);

      await prisma.$transaction(
        batch.map((contract) => {
          const d = contract.details || {};
          return prisma.optionContract.upsert({
            where: { symbol: d.ticker },
            update: {
              stockId,
              underlyingSymbol: underlying,
              rootSymbol: underlying,
              type: d.contract_type?.toUpperCase() || null,
              style: d.exercise_style || null,
              strikePrice: d.strike_price,
              expirationDate: new Date(d.expiration_date),
              size: d.shares_per_contract || 100,
              breakEvenPrice: contract.break_even_price || null,
              impliedVolatility: contract.implied_volatility || null,
              delta: contract.greeks?.delta || null,
              gamma: contract.greeks?.gamma || null,
              theta: contract.greeks?.theta || null,
              vega: contract.greeks?.vega || null,
              fmv: contract.fmv || null,
              openInterest: contract.open_interest || null,
            },
            create: {
              stockId,
              symbol: d.ticker,
              name: d.ticker,
              underlyingSymbol: underlying,
              rootSymbol: underlying,
              type: d.contract_type?.toUpperCase() || null,
              style: d.exercise_style || null,
              strikePrice: d.strike_price,
              expirationDate: new Date(d.expiration_date),
              size: d.shares_per_contract || 100,
              breakEvenPrice: contract.break_even_price || null,
              impliedVolatility: contract.implied_volatility || null,
              delta: contract.greeks?.delta || null,
              gamma: contract.greeks?.gamma || null,
              theta: contract.greeks?.theta || null,
              vega: contract.greeks?.vega || null,
              fmv: contract.fmv || null,
              openInterest: contract.open_interest || null,
            },
          });
        })
      );
    }

    // 4️⃣ Filter only active contracts with openInterest > 100
    const today = new Date();
    const activeContracts = allContracts
      .filter(c => c.details && c.open_interest > 100 && new Date(c.details.expiration_date) >= today)
      .map(c => ({
        symbol: c.details.ticker,
        underlyingSymbol: underlying,
        rootSymbol: underlying,
        type: c.details.contract_type,
        style: c.details.exercise_style,
        strikePrice: c.details.strike_price,
        expirationDate: c.details.expiration_date,
        size: c.details.shares_per_contract || 100,
        impliedVolatility: c.implied_volatility || null,
        delta: c.greeks?.delta || null,
        gamma: c.greeks?.gamma || null,
        theta: c.greeks?.theta || null,
        vega: c.greeks?.vega || null,
        openInterest: c.open_interest || null,

        day: c.day || null,
        underlyingAsset: c.underlying_asset || null
      }));

    return activeContracts;

  } catch (error) {
    console.error("Error fetching Massive option contracts:", error);
    return { error: error.message };
  }
};

// 📅 Helper: start of week (optional, not used here)
function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const weekStart = new Date(d.setDate(diff));
  return weekStart.toISOString().split("T")[0];
}




////////////////////////////////////////////////////////////////////////////////////
/// GET OPTIONS CONTRACT DETAILS BY SYMBOL (ex AAPL251003C00110000) - POLYGON API
////////////////////////////////////////////////////////////////////////////////////





function formatDate(date) {
  return date.toISOString().slice(0, 10); // YYYY-MM-DD
}

// Fetch contract by symbol
async function getContractBySymbol(symbol) {
  return prisma.optionContract.findFirst({
    where: { symbol: symbol.toUpperCase() },
  });
}

module.exports.getOptionOHLCBySymbol = async function (symbol) {
  if (!symbol || typeof symbol !== "string") {
    throw new Error(`Invalid options symbol: ${symbol}`);
  }

  const upperSymbol = symbol.toUpperCase();
  const polygonTicker = `${upperSymbol}`;

  // 1️⃣ Validate contract exists in DB
  const contract = await getContractBySymbol(upperSymbol);
  if (!contract) {
    throw new Error(`Option contract not found in DB for symbol "${upperSymbol}"`);
  }

  const contractId = contract.id;

  // 2️⃣ Date range (last 30 calendar days)
  const toDate = new Date();
  const fromDate = new Date();
  fromDate.setDate(toDate.getDate() - 30);

  const from = formatDate(fromDate);
  const to = formatDate(toDate);

  const url = `https://api.massive.com/v2/aggs/ticker/${polygonTicker}/range/1/day/${from}/${to}?adjusted=true&sort=asc&limit=120&apiKey=${POLYGON_API_KEY}`;

  try {
const response = await fetch(url);

if (!response.ok) {
  console.error(`❌ Polygon HTTP error ${response.status} for ${polygonTicker} ${url}`);
  return [];
}

const data = await response.json();

if (!Array.isArray(data.results)) {
  console.warn(`⚠️ Polygon returned no results array for ${polygonTicker}`);
  return [];
}

if (data.results.length === 0) {
  console.log(`ℹ️ No trades yet for ${polygonTicker} in this date range`);
  return [];
}

    // 3️⃣ Upsert only days that traded
    const records = [];

    for (const bar of data.results) {
      const date = new Date(bar.t);

      const record = await prisma.optionHistPrice.upsert({
        where: {
          contractId_date: {
            contractId,
            date,
          },
        },
        update: {
          openPrice: bar.o,
          highPrice: bar.h,
          lowPrice: bar.l,
          closePrice: bar.c,
          volume: bar.v || null,
          numberOfTrades: bar.n || null,
          vwap: bar.vw || null,
        },
        create: {
          contractId,
          date,
          openPrice: bar.o,
          highPrice: bar.h,
          lowPrice: bar.l,
          closePrice: bar.c,
          volume: bar.v || null,
          numberOfTrades: bar.n || null,
          vwap: bar.vw || null,
        },
      });

      records.push(record);
    }

    return records;

  } catch (err) {
    console.error("Error fetching option aggregates:", err);
    return [];
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


// // Place Buy Call Order (Market or Limit)
// module.exports.placeBuyCallOrder = async function ({ userId, contractId, symbol, quantity, price, orderType }) {
//   if (!userId || !contractId || !quantity || !orderType) {
//     throw new Error('Missing required trade data');
//   }

//   // 🔹 Resolve numeric contractId from symbol string
//   const contract = await prisma.optionContract.findUnique({
//     where: { symbol: contractId } // contractId here is actually the symbol string
//   });

//   if (!contract) throw new Error('Contract not found');

//   const numericContractId = contract.id;
//   const totalAmount = price * quantity * 100; // 1 contract = 100 shares

//   if (orderType === 'MARKET') {
//     const user = await prisma.user.findUnique({ where: { id: userId } });
//     if (!user) throw new Error('User not found');
//     if (user.wallet < totalAmount) throw new Error('Insufficient wallet balance');

//     // Deduct premium from wallet
//     await prisma.user.update({
//       where: { id: userId },
//       data: { wallet: user.wallet - totalAmount }
//     });

//     const trade = await prisma.optionTrade.create({
//       data: {
//         userId,
//         contractId: numericContractId, // use numeric ID here
//         tradeType: 'BUY',
//         orderType,
//         quantity,
//         price,
//         totalAmount
//       }
//     });

//     return { trade, executed: true };
//   }

//   // LIMIT order: just store the order for now
//   if (orderType === 'LIMIT') {
//     const trade = await prisma.optionTrade.create({
//       data: {
//         userId,
//         contractId: numericContractId, // use numeric ID here
//         tradeType: 'BUY',
//         orderType,
//         quantity,
//         price,
//         totalAmount
//       }
//     });

//     return { trade, executed: false };
//   }

//   throw new Error('Invalid order type');
// };




module.exports.placeBuyCallOrder = async function ({
  userId,
  contractId,
  symbol,
  quantity,
  price,
  orderType
}) {
  if (!userId || !contractId || !quantity || !orderType) {
    throw new Error("Missing required trade data");
  }

  // Resolve numeric contractId from symbol
  const contract = await prisma.optionContract.findUnique({
    where: { symbol: contractId } // symbol passed in
  });
  if (!contract) throw new Error("Contract not found");
  const numericContractId = contract.id;

  const totalAmount = Math.round(price * quantity * 100); // 1 contract = 100 shares

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");

  // Check wallet for MARKET orders
  if (orderType === "MARKET" && user.wallet < totalAmount) {
    throw new Error("Insufficient wallet balance");
  }

    if (orderType === "LIMIT" && user.wallet < totalAmount) {
    throw new Error("Insufficient wallet balance");
  }

  // Deduct wallet if MARKET
  if (orderType === "MARKET") {
    await prisma.user.update({
      where: { id: userId },
      data: { wallet: user.wallet - totalAmount }
    });
  }

  // Create trade in DB
  const trade = await prisma.optionTrade.create({
    data: {
      userId,
      contractId: numericContractId,
      tradeType: "BUY",
      orderType,
      quantity,
      price,
      totalAmount
    }
  });

  console.log(`Option trade stored in DB: ${trade.id}`);

  // Send trade to blockchain for MARKET orders
if (orderType === "MARKET") {
  console.log("Sending option trade to blockchain...");

  // Send transaction through signer
  const txResponse = await optionLedger.recordOptionTrade(
  numericContractId,
  "BUY",
  "MARKET",
  quantity,
  Math.round(price * 100),
  totalAmount
);

// ethers v6: txResponse has hash, wait() returns receipt with gasUsed and blockNumber
const receipt = await txResponse.wait();

console.log("Blockchain Transaction Mined:");
console.log({
  txHash: txResponse.hash,       // use txResponse.hash
  gasUsed: receipt.gasUsed,
  blockNumber: receipt.blockNumber
});

// Store blockchain transaction
await prisma.optionBlockchainTransaction.create({
  data: {
    userId,
    symbol: contract.symbol,
    tradeType: "BUY",
    gasUsed: Number(receipt.gasUsed),
    blockNumber: receipt.blockNumber,
    underlyingSymbol: contract.underlyingSymbol,
    optionType: contract.type,
    strikePrice: contract.strikePrice,
    expirationDate: contract.expirationDate,
    contracts: quantity,
    premium: price,
    transactionHash: txResponse.hash, // <-- use txResponse.hash
  }
});


  console.log("Option trade recorded in blockchain DB");
}



  return { trade, executed: orderType === "MARKET" };
};




// Auto-execute pending LIMIT Buy Call orders
module.exports.executePendingLimitCalls = async function () {
  const now = new Date();

  // Find all pending LIMIT BUY orders
  const pendingOrders = await prisma.optionTrade.findMany({
    where: { tradeType: "BUY", orderType: "LIMIT" },
    include: { user: true, contract: true },
  });

  const executedOrders = [];

  for (const trade of pendingOrders) {
    const contract = trade.contract;
    const currentPrice = contract.closePrice;

    // Skip if no live price yet
    if (!currentPrice) continue;

    const isExpired = contract.expirationDate <= now;

    // 1️⃣ Handle expired contract → mark order as EXPIRED
    if (isExpired) {
      await prisma.optionTrade.update({
        where: { id: trade.id },
        data: {
          orderType: "EXPIRED",
          totalAmount: 0
        }
      });

      executedOrders.push({
        ...trade,
        status: "EXPIRED"
      });

      console.log(`❌ LIMIT BUY CALL order ${trade.id} expired and marked EXPIRED.`);

      continue; // ⛔ Skip further processing
    }

    // 2️⃣ Execute normal LIMIT BUY flow

    // Execute if closePrice <= LIMIT price
    if (currentPrice <= trade.price) {
      const totalCost = currentPrice * trade.quantity * 100; // 1 contract = 100 shares

      // Deduct wallet
      await prisma.user.update({
        where: { id: trade.userId },
        data: { wallet: trade.user.wallet - totalCost },
      });

      // Convert LIMIT → MARKET
      const executedTrade = await prisma.optionTrade.update({
        where: { id: trade.id },
        data: {
          orderType: "MARKET",
          totalAmount: totalCost,
          price: currentPrice,
        },
      });

      console.log(`💰 Executed LIMIT → MARKET Buy Call: ${executedTrade.id}`);

      // Blockchain call
      const txResponse = await optionLedger.recordOptionTrade(
        contract.id,
        "BUY",
        "MARKET",
        trade.quantity,
        Math.round(currentPrice * 100),
        totalCost
      );

      const receipt = await txResponse.wait();

      await prisma.optionBlockchainTransaction.create({
        data: {
          userId: trade.userId,
          symbol: contract.symbol,
          tradeType: "BUY",
          gasUsed: Number(receipt.gasUsed),
          blockNumber: receipt.blockNumber,
          underlyingSymbol: contract.underlyingSymbol,
          optionType: contract.type,
          strikePrice: contract.strikePrice,
          expirationDate: contract.expirationDate,
          contracts: trade.quantity,
          premium: currentPrice,
          transactionHash: txResponse.hash,
        },
      });

      executedOrders.push(executedTrade);
    }
  }

  return executedOrders;
};


module.exports.settleExpiredBuyCallTrades = async function () {
  const now = new Date();

  const tradesToSettle = await prisma.optionTrade.findMany({
    where: {
      tradeType: "BUY",
      orderType: "MARKET",
      contract: { type: "CALL", expirationDate: { lte: now } }
    },
    include: { contract: true, user: true }
  });

  const settledTrades = [];

  for (const trade of tradesToSettle) {
    const { contract, user, quantity, price } = trade;
    const contractSize = contract.size || 100;
    const strike = contract.strikePrice;

    // get underlying price at expiration
    const stock = await prisma.stock.findUnique({
      where: { symbol: contract.underlyingSymbol },
      select: { stock_id: true }
    });
    if (!stock) continue;

    const latestPrice = await prisma.intradayPrice3.findFirst({
      where: { stockId: stock.stock_id },
      orderBy: { date: "desc" },
      select: { closePrice: true }
    });
    if (!latestPrice) continue;

    const underlyingFinalPrice = Number(latestPrice.closePrice);

    // intrinsic value
    const intrinsicValue =
      underlyingFinalPrice > strike
        ? (underlyingFinalPrice - strike) * quantity * contractSize
        : 0;

    // -------------- CASE 1: ITM → exercise --------------
    if (underlyingFinalPrice > strike) {
      const shareCost = strike * quantity * contractSize;

      // Deduct cost to buy shares
      await prisma.user.update({
        where: { id: user.id },
        data: { wallet: user.wallet - shareCost }
      });

      // Add shares to holdings
// Fetch stock symbol once
const stockWithSymbol = await prisma.stock.findUnique({
  where: { stock_id: stock.stock_id },
  select: { symbol: true }
});
if (!stockWithSymbol) continue;

// Add shares to holdings
await prisma.stockHolding.upsert({
  where: {
    userId_stockId: {
      userId: user.id,
      stockId: stock.stock_id
    }
  },
  update: {
    currentQuantity: {
      increment: quantity * contractSize
    }
  },
  create: {
    userId: user.id,
    stockId: stock.stock_id,
    symbol: stockWithSymbol.symbol,
    currentQuantity: quantity * contractSize
  }
});


      console.log(
        `🏆 BUY CALL exercised for trade ${trade.id} → delivered ${quantity *
          contractSize} shares`
      );
    }

    // -------------- CASE 2: OTM → worthless, do nothing --------------

    // Mark trade as expired
    await prisma.optionTrade.update({
      where: { id: trade.id },
      data: {
        orderType: "EXPIRED",
        totalAmount: intrinsicValue - price * quantity * contractSize
      }
    });

    settledTrades.push({
      tradeId: trade.id,
      strike,
      underlyingFinalPrice,
      exercised: underlyingFinalPrice > strike,
      sharesDelivered: underlyingFinalPrice > strike ? quantity * contractSize : 0,
      pnl: intrinsicValue - price * quantity * contractSize
    });
  }

  return settledTrades;
};










////////////////////////////////////////////////////
//// PLACE SELL CALL - MARKET/LIMIT ORDER
////////////////////////////////////////////////////
module.exports.placeSellCallOrder = async function ({
  userId,
  contractId,
  quantity,
  price,
  orderType
}) {
  if (!userId || !contractId || !quantity || !orderType) {
    throw new Error("Missing required trade data");
  }

  // Resolve numeric contractId
  const contract = await prisma.optionContract.findUnique({
    where: { symbol: contractId }
  });
  if (!contract) throw new Error("Option contract not found");
  const numericContractId = contract.id;

  const sharesPerContract = 100; // standard contract size
  const totalSharesRequired = quantity * sharesPerContract;
  const totalAmount = Math.round(price * quantity * sharesPerContract);

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");

  // ✅ Check if user owns enough underlying shares
  const userHolding = await prisma.stockHolding.findUnique({
    where: {
      userId_stockId: {
        userId,
        stockId: contract.stockId // assuming contract has stockId
      }
    }
  });

  const ownedShares = userHolding ? userHolding.currentQuantity : 0;

  if (ownedShares < totalSharesRequired) {
    throw new Error(
      `Insufficient shares for sell call. You own ${ownedShares}, but need ${totalSharesRequired}.`
    );
  }

  // ✅ Credit wallet immediately if MARKET order
  if (orderType === "MARKET") {
    await prisma.user.update({
      where: { id: userId },
      data: { wallet: user.wallet + totalAmount }
    });

    // Deduct shares used for covered call
    await prisma.stockHolding.update({
      where: {
        userId_stockId: {
          userId,
          stockId: contract.stockId
        }
      },
      data: { currentQuantity: ownedShares - totalSharesRequired }
    });
  }

  // ✅ Create off-chain trade record
  const trade = await prisma.optionTrade.create({
    data: {
      userId,
      contractId: numericContractId,
      tradeType: "SELL",
      orderType,
      quantity,
      price,
      totalAmount
    }
  });

  // ✅ Send blockchain transaction for MARKET orders
  if (orderType === "MARKET") {
    console.log("Sending option trade to blockchain...");

    const txResponse = await optionLedger.recordOptionTrade(
      numericContractId,
      "SELL",
      "MARKET",
      quantity,
      Math.round(price * sharesPerContract),
      totalAmount
    );

    const receipt = await txResponse.wait();

    await prisma.optionBlockchainTransaction.create({
      data: {
        userId,
        symbol: contract.symbol,
        tradeType: "SELL",
        gasUsed: Number(receipt.gasUsed),
        blockNumber: receipt.blockNumber,
        underlyingSymbol: contract.underlyingSymbol,
        optionType: contract.type,
        strikePrice: contract.strikePrice,
        expirationDate: contract.expirationDate,
        contracts: quantity,
        premium: price,
        transactionHash: txResponse.hash
      }
    });
  }

  return { trade, executed: orderType === "MARKET" };
};
module.exports.executeSellCallLimitOrders = async function () {
  const now = new Date();

  // 1️⃣ Get all contracts that have pending LIMIT SELL orders
  const contractsWithOrders = await prisma.optionTrade.findMany({
    where: {
      tradeType: 'SELL',
      orderType: 'LIMIT'
    },
    select: { contractId: true },
    distinct: ['contractId']
  });

  const executedOrders = [];

  for (const { contractId } of contractsWithOrders) {
    const contract = await prisma.optionContract.findUnique({
      where: { id: contractId }
    });

    if (!contract) continue;

    const isExpired = contract.expirationDate <= now;

    // 2️⃣ Fetch pending LIMIT SELL orders for this contract
    const pendingOrders = await prisma.optionTrade.findMany({
      where: {
        contractId,
        tradeType: 'SELL',
        orderType: 'LIMIT'
      },
      include: { user: true }
    });

    // 3️⃣ Handle expiration OR execution
    for (const order of pendingOrders) {
      if (isExpired) {
        // 3a️⃣ Contract expired → mark order EXPIRED
        await prisma.optionTrade.update({
          where: { id: order.id },
          data: {
            orderType: 'EXPIRED',
            totalAmount: 0
          }
        });

        executedOrders.push({
          ...order,
          status: "EXPIRED"
        });

        continue; // ⛔ Skip further processing
      }

      // 3b️⃣ If not expired, continue with execution logic
      if (contract.closePrice === null) continue;

      const currentPrice = contract.closePrice;

      // LIMIT condition
      if (currentPrice >= order.price) {
        const totalAmount = currentPrice * order.quantity * 100;

        // Credit wallet
        await prisma.user.update({
          where: { id: order.userId },
          data: { wallet: order.user.wallet + totalAmount }
        });

        // Deduct underlying shares
        const holding = await prisma.stockHolding.findUnique({
          where: {
            userId_stockId: {
              userId: order.userId,
              stockId: contract.stock_id
            }
          }
        });

        if (!holding) {
          throw new Error(
            `UserHolding not found for user ${order.userId} and stock ${contract.underlyingSymbol}`
          );
        }

        await prisma.stockHolding.update({
          where: {
            userId_stockId: {
              userId: order.userId,
              stockId: contract.stock_id
            }
          },
          data: {
            currentQuantity: holding.currentQuantity - order.quantity * 100
          }
        });

        // Mark as executed (market)
        const executed = await prisma.optionTrade.update({
          where: { id: order.id },
          data: {
            orderType: 'MARKET',
            price: currentPrice,
            totalAmount
          }
        });

        executedOrders.push(executed);

        // Blockchain
        const txResponse = await optionLedger.recordOptionTrade(
          contractId,
          "SELL",
          "MARKET",
          order.quantity,
          Math.round(currentPrice * 100),
          totalAmount
        );

        const receipt = await txResponse.wait();

        await prisma.optionBlockchainTransaction.create({
          data: {
            userId: order.userId,
            symbol: contract.symbol,
            tradeType: "SELL",
            gasUsed: Number(receipt.gasUsed),
            blockNumber: receipt.blockNumber,
            underlyingSymbol: contract.underlyingSymbol,
            optionType: contract.type,
            strikePrice: contract.strikePrice,
            expirationDate: contract.expirationDate,
            contracts: order.quantity,
            premium: currentPrice,
            transactionHash: txResponse.hash
          }
        });
      }
    }
  }

  return executedOrders;
};

module.exports.settleExpiredSellCallTrades = async function () {
  const now = new Date();

  // 1️⃣ Find all SELL CALL trades that have expired
  const tradesToSettle = await prisma.optionTrade.findMany({
    where: {
      tradeType: 'SELL',
      orderType: 'MARKET',
      contract: {
        type: 'CALL',
        expirationDate: { lte: now }
      }
    },
    include: {
      contract: true,
      user: true
    }
  });

  const settledTrades = [];

  for (const trade of tradesToSettle) {
    const { contract, user, quantity, price } = trade;
    const strike = contract.strikePrice;
    const contractSize = contract.size || 100;
    const totalShares = quantity * contractSize;

    // 2️⃣ Fetch underlying stock (via symbol)
    const stock = await prisma.stock.findUnique({
      where: { symbol: contract.underlyingSymbol },
      select: { stock_id: true }
    });
    if (!stock) continue;

    // 3️⃣ Get latest underlying close price
    const latestPrice = await prisma.intradayPrice3.findFirst({
      where: { stockId: stock.stock_id },
      orderBy: { date: 'desc' },
      select: { closePrice: true }
    });
    if (!latestPrice) continue;

    const underlyingFinalPrice = Number(latestPrice.closePrice);

    // 4️⃣ Calculate wallet credit
    const premium = price * quantity * contractSize;
    let walletCredit = 0;

if (underlyingFinalPrice <= strike) {
  // OTM → Option expires worthless
  // Shares were reserved earlier → return them
  await prisma.stockHolding.updateMany({
    where: {
      userId: user.id,
      symbol: contract.underlyingSymbol
    },
    data: { currentQuantity: { increment: totalShares } }
  });

  // No wallet change (premium was already received)
  walletCredit = 0;

} else {
  // ITM → Shares are taken permanently, user receives strike * shares
  walletCredit = strike * totalShares;

  // DO NOT add premium again
}


    // 5️⃣ Update user's wallet
    await prisma.user.update({
      where: { id: user.id },
      data: { wallet: user.wallet + walletCredit } // no premium added again
    });
    

    // 6️⃣ Mark trade as settled/expired
    await prisma.optionTrade.update({
      where: { id: trade.id },
      data: {
        orderType: 'EXPIRED',
        totalAmount: walletCredit
      }
    });

    // 7️⃣ Blockchain settlement
    try {
      console.log(`Settling Sell CALL trade ${trade.id} on blockchain...`);

      const txResponse = await optionLedger.settleOptionTrade(
        contract.id,
        'SELL',
        quantity,
        Math.round(strike * 100),
        Math.round(underlyingFinalPrice * 100),
        BigInt(Math.round(walletCredit))
      );

      const receipt = await txResponse.wait();

      console.log(`Blockchain settlement confirmed for trade ${trade.id}`);
      console.log(`   TxHash: ${txResponse.hash}, Gas: ${receipt.gasUsed}, Block: ${receipt.blockNumber}`);

      // Store blockchain transaction in DB
      await prisma.optionBlockchainTransaction.create({
        data: {
          userId: trade.userId,
          symbol: contract.symbol,
          tradeType: 'SELL',
          gasUsed: Number(receipt.gasUsed),
          blockNumber: receipt.blockNumber,
          underlyingSymbol: contract.underlyingSymbol,
          optionType: contract.type,
          strikePrice: strike,
          expirationDate: contract.expirationDate,
          contracts: quantity,
          premium: price,
          transactionHash: txResponse.hash
        }
      });

      console.log(`Blockchain settlement stored for trade ${trade.id}`);
    } catch (err) {
      console.error(`Blockchain settlement failed for trade ${trade.id}:`, err);
    }

    // 8️⃣ Add result to output
    settledTrades.push({
      tradeId: trade.id,
      userId: trade.userId,
      symbol: contract.symbol,
      underlyingSymbol: contract.underlyingSymbol,
      strike,
      underlyingFinalPrice,
      premium,
      walletCredit,
      totalShares
    });
  }

  return settledTrades;
};



////////////////////////////////////////////////////
//// PLACE BUY PUT - MARKET/LIMIT ORDER
////////////////////////////////////////////////////



module.exports.placeBuyPutOrder = async function ({ userId, contractId, quantity, price, orderType }) {
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

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('User not found');

  // Check wallet for MARKET orders
  if (orderType === 'MARKET' && user.wallet < totalAmount) {
    throw new Error('Insufficient wallet balance');
  }


    if (orderType === 'LIMIT' && user.wallet < totalAmount) {
    throw new Error('Insufficient wallet balance');
  }



  // Deduct wallet if MARKET
  if (orderType === 'MARKET') {
    await prisma.user.update({
      where: { id: userId },
      data: { wallet: user.wallet - totalAmount }
    });
  }

  // Create trade in DB
  const trade = await prisma.optionTrade.create({
    data: {
      userId,
      contractId: numericContractId,
      tradeType: 'BUY',
      orderType,
      quantity,
      price,
      totalAmount
    }
  });

  console.log(`Buy PUT option trade stored in DB: ${trade.id}`);

  // Send trade to blockchain for MARKET orders
  if (orderType === 'MARKET') {
    try {
      console.log('Sending Buy PUT option trade to blockchain...');
      const txResponse = await optionLedger.recordOptionTrade(
        numericContractId,
        'BUY',
        'MARKET',
        quantity,
        Math.round(price * 100),
        totalAmount
      );

      const receipt = await txResponse.wait();

      console.log('Blockchain Transaction Mined:');
      console.log({
        txHash: txResponse.hash,
        gasUsed: receipt.gasUsed,
        blockNumber: receipt.blockNumber
      });

      // Store blockchain transaction
      await prisma.optionBlockchainTransaction.create({
        data: {
          userId,
          symbol: contract.symbol,
          tradeType: 'BUY',
          gasUsed: Number(receipt.gasUsed),
          blockNumber: receipt.blockNumber,
          underlyingSymbol: contract.underlyingSymbol,
          optionType: contract.type,
          strikePrice: contract.strikePrice,
          expirationDate: contract.expirationDate,
          contracts: quantity,
          premium: price,
          transactionHash: txResponse.hash
        }
      });

      console.log('Buy PUT option trade recorded in blockchain DB');
    } catch (err) {
      console.error('Blockchain transaction failed:', err);
    }
  }

  return { trade, executed: orderType === 'MARKET' };
};


module.exports.executeBuyPutLimitOrders = async function () {
  const now = new Date();

  // 1. Get all contracts with pending LIMIT BUY PUT orders
  const contractsWithOrders = await prisma.optionTrade.findMany({
    where: {
      tradeType: 'BUY',
      orderType: 'LIMIT',
      contract: { type: 'PUT' }
    },
    select: { contractId: true },
    distinct: ['contractId']
  });

  const executedOrders = [];

  // 2. Loop through contracts
  for (const { contractId } of contractsWithOrders) {
    const contract = await prisma.optionContract.findUnique({
      where: { id: contractId }
    });

    if (!contract || contract.closePrice === null) continue;

    const currentPrice = contract.closePrice;
    const isExpired = contract.expirationDate <= now;

    // 3. Get pending LIMIT BUY PUT orders for this contract
    const pendingOrders = await prisma.optionTrade.findMany({
      where: {
        contractId,
        tradeType: 'BUY',
        orderType: 'LIMIT'
      },
      include: { user: true }
    });

    // 4. Process each pending LIMIT order
    for (const order of pendingOrders) {

      // 4️⃣ If contract expired → mark EXPIRED and skip
      if (isExpired) {
        await prisma.optionTrade.update({
          where: { id: order.id },
          data: {
            orderType: 'EXPIRED',
            totalAmount: 0
          }
        });

        executedOrders.push({
          ...order,
          status: 'EXPIRED'
        });

        console.log(`❌ LIMIT BUY PUT order ${order.id} expired → marked EXPIRED`);
        continue; // Stop here for expired orders
      }

      // 5️⃣ Normal LIMIT execution: Buy PUT if currentPrice <= limit price
      if (currentPrice <= order.price) {
        const totalCost = currentPrice * order.quantity * 100;
        const user = order.user;

        if (user.wallet < totalCost) continue; // insufficient funds

        // Deduct wallet
        await prisma.user.update({
          where: { id: user.id },
          data: { wallet: user.wallet - totalCost }
        });

        // Convert LIMIT → MARKET
        const executedTrade = await prisma.optionTrade.update({
          where: { id: order.id },
          data: {
            orderType: 'MARKET',
            totalAmount: totalCost,
            price: currentPrice
          }
        });

        executedOrders.push(executedTrade);

        // 🔹 Blockchain execution
        try {
          console.log(`Sending executed Buy PUT ${order.id} to blockchain...`);

          const txResponse = await optionLedger.recordOptionTrade(
            contract.id,
            'BUY',
            'MARKET',
            order.quantity,
            Math.round(currentPrice * 100),
            totalCost
          );

          const receipt = await txResponse.wait();

          console.log(`Blockchain Mined: ${txResponse.hash}`);

          // Store blockchain metadata
          await prisma.optionBlockchainTransaction.create({
            data: {
              userId: user.id,
              symbol: contract.symbol,
              tradeType: 'BUY',
              gasUsed: Number(receipt.gasUsed),
              blockNumber: receipt.blockNumber,
              underlyingSymbol: contract.underlyingSymbol,
              optionType: contract.type,
              strikePrice: contract.strikePrice,
              expirationDate: contract.expirationDate,
              contracts: order.quantity,
              premium: currentPrice,
              transactionHash: txResponse.hash
            }
          });

        } catch (err) {
          console.error(`Blockchain TX failed for ${order.id}:`, err);
        }
      }
    }
  }

  return executedOrders;
};

module.exports.settleBuyPutOrders = async function () {
  const now = new Date();

  // 1. Get all executed BUY PUT trades whose contracts have now expired
  const tradesToSettle = await prisma.optionTrade.findMany({
    where: {
      tradeType: 'BUY',
      orderType: 'MARKET',
      contract: {
        type: 'PUT',
        expirationDate: { lte: now }
      }
    },
    include: { contract: true, user: true }
  });

  const settledTrades = [];
  const contractSize = 100;

  for (const trade of tradesToSettle) {
    const { contract, user, quantity, price } = trade;
    const strike = contract.strikePrice;
    const premiumPerContract = price; // already correct
    const premiumTotal = premiumPerContract * quantity * contractSize;

    // Get underlying stock id
    const stock = await prisma.stock.findUnique({
      where: { symbol: contract.underlyingSymbol },
      select: { stock_id: true }
    });
    if (!stock) continue;

    // Get latest underlying closing price
    const latestPrice = await prisma.intradayPrice3.findFirst({
      where: { stockId: stock.stock_id },
      orderBy: { date: "desc" },
      select: { closePrice: true }
    });
    if (!latestPrice) continue;

    const underlyingPrice = Number(latestPrice.closePrice);

    // -----------------------------
    // 2. Compute PnL (correct logic)
    // -----------------------------
    let pnl = 0;

    if (underlyingPrice < strike) {
      // ITM → buyer profits
      const intrinsic = (strike - underlyingPrice) * quantity * contractSize;
      pnl = intrinsic - premiumTotal;
    } else {
      // OTM → buyer loses entire premium
      pnl = -premiumTotal;
    }

    // -----------------------------
    // 3. Update wallet correctly
    // -----------------------------
    await prisma.user.update({
      where: { id: user.id },
      data: { wallet: user.wallet + pnl }
    });

    // -----------------------------
    // 4. Mark trade as settled
    // -----------------------------
    await prisma.optionTrade.update({
      where: { id: trade.id },
      data: {
        totalAmount: pnl,        // ← CORRECT (net PnL only)
        orderType: "EXPIRED"
      }
    });

    // -----------------------------
    // 5. Send settlement to blockchain
    // -----------------------------
    try {
      const txResponse = await optionLedger.settleOptionTrade(
        contract.id,
        'BUY',
        quantity,
        Math.round(strike * 100),
        Math.round(underlyingPrice * 100),
        pnl
      );

      const receipt = await txResponse.wait();

      await prisma.optionBlockchainTransaction.create({
        data: {
          userId: user.id,
          symbol: contract.symbol,
          tradeType: 'SETTLE',
          gasUsed: Number(receipt.gasUsed),
          blockNumber: receipt.blockNumber,
          underlyingSymbol: contract.underlyingSymbol,
          optionType: contract.type,
          strikePrice: strike,
          expirationDate: contract.expirationDate,
          contracts: quantity,
          premium: premiumPerContract,
          transactionHash: txResponse.hash
        }
      });

    } catch (e) {
      console.error(`Blockchain settlement failed for Buy PUT trade ${trade.id}:`, e);
    }

    // Push summary of settlement
    settledTrades.push({
      tradeId: trade.id,
      userId: user.id,
      symbol: contract.symbol,
      underlyingSymbol: contract.underlyingSymbol,
      strike,
      underlyingPrice,
      premiumPaid: premiumPerContract,
      pnl
    });
  }

  return settledTrades;
};














////////////////////////////////////////////////////
//// PLACE SELL PUT - MARKET/LIMIT ORDER
////////////////////////////////////////////////////
module.exports.placeSellPutOrder = async function ({ userId, contractId, quantity, price, orderType }) {
  if (!userId || !contractId || !quantity || !orderType) {
    throw new Error("Missing required trade data");
  }

  // Resolve contract by symbol or ID
  let numericContractId = contractId;
  const contract =
    typeof contractId === "string"
      ? await prisma.optionContract.findUnique({ where: { symbol: contractId } })
      : await prisma.optionContract.findUnique({ where: { id: contractId } });

  if (!contract) throw new Error("Option contract not found");
  if (typeof contractId === "string") numericContractId = contract.id;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");

  const contractSize = contract.size || 100;
  const premium = price * quantity * contractSize;

  // SELL PUT requires collateral = strikePrice * quantity * contractSize
  const requiredCollateral = contract.strikePrice * quantity * contractSize;

  if (user.wallet < requiredCollateral) {
    throw new Error("Insufficient wallet balance to cover potential PUT obligation");
  }

  // ============================================================
  // 1️⃣ Deduct collateral ONCE for both MARKET and LIMIT
  // ============================================================
  const userAfterCollateral = await prisma.user.update({
    where: { id: userId },
    data: { wallet: user.wallet - requiredCollateral }
  });

  console.log(`Collateral deducted: ${requiredCollateral} for user ${userId}`);


  // ============================================================
  // 2️⃣ MARKET ORDER → executes immediately
  // ============================================================
  if (orderType === "MARKET") {
    const userAfterPremium = await prisma.user.update({
      where: { id: userId },
      data: { wallet: userAfterCollateral.wallet + premium }
    });

    console.log(`Premium credited: ${premium} for user ${userId}`);

    // Store MARKET trade
    const trade = await prisma.optionTrade.create({
      data: {
        userId,
        contractId: numericContractId,
        tradeType: "SELL",
        orderType: "MARKET",
        quantity,
        price,
        totalAmount: premium
      }
    });

    console.log(`MARKET Sell PUT trade stored: ${trade.id}`);

    // Send to blockchain
    try {
      const txResponse = await optionLedger.recordOptionTrade(
        numericContractId,
        "SELL",
        "MARKET",
        quantity,
        Math.round(price * 100),
        premium
      );
      const receipt = await txResponse.wait();

      await prisma.optionBlockchainTransaction.create({
        data: {
          userId,
          symbol: contract.symbol,
          tradeType: "SELL",
          gasUsed: Number(receipt.gasUsed),
          blockNumber: receipt.blockNumber,
          underlyingSymbol: contract.underlyingSymbol,
          optionType: contract.type,
          strikePrice: contract.strikePrice,
          expirationDate: contract.expirationDate,
          contracts: quantity,
          premium: price,
          transactionHash: txResponse.hash
        }
      });
    } catch (err) {
      console.error(`Blockchain transaction failed for Sell PUT MARKET:`, err);
    }

    return { trade, executed: true };
  }


  // ============================================================
  // 3️⃣ LIMIT ORDER → store only (premium added later)
  // ============================================================
  if (orderType === "LIMIT") {
    const trade = await prisma.optionTrade.create({
      data: {
        userId,
        contractId: numericContractId,
        tradeType: "SELL",
        orderType: "LIMIT",
        quantity,
        price,
        totalAmount: premium
      }
    });

    console.log(`LIMIT Sell PUT stored (pending execution): ${trade.id}`);

    return { trade, executed: false };
  }

  throw new Error("Invalid order type");
};


module.exports.executeSellPutLimitOrders = async function () {
  // 1. Find all pending Sell Put LIMIT trades
  const trades = await prisma.optionTrade.findMany({
    where: {
      tradeType: 'SELL',
      orderType: 'LIMIT',
      contract: { type: 'PUT' }
    },
    include: { user: true, contract: true }
  });

  const executedOrders = [];

  for (const trade of trades) {
    if (!trade.contract || trade.contract.closePrice === null) continue;

    const currentPrice = trade.contract.closePrice;

    // 2. Check execution condition (execute if currentPrice >= limit price)
    if (currentPrice >= trade.price) {
      const premium = trade.price * trade.quantity * 100;

      // Credit seller's wallet
      await prisma.user.update({
        where: { id: trade.userId },
        data: { wallet: trade.user.wallet + premium }
      });

      // Mark as executed (LIMIT → MARKET)
      const executedTrade = await prisma.optionTrade.update({
        where: { id: trade.id },
        data: {
          orderType: 'MARKET',
          price: trade.price,
          totalAmount: premium
        }
      });

      // 3. Send executed trade to blockchain
      try {
        console.log(`Sending executed Sell PUT trade ${trade.id} to blockchain...`);

        const txResponse = await optionLedger.recordOptionTrade(
          trade.contractId,
          'SELL',
          'MARKET',
          trade.quantity,
          Math.round(trade.price * 100),
          premium
        );

        const receipt = await txResponse.wait();

        console.log(`Blockchain Transaction Mined for trade ${trade.id}:`, {
          txHash: txResponse.hash,
          gasUsed: receipt.gasUsed,
          blockNumber: receipt.blockNumber
        });

        // Store blockchain transaction
        await prisma.optionBlockchainTransaction.create({
          data: {
            userId: trade.userId,
            symbol: trade.contract.symbol,
            tradeType: 'SELL',
            gasUsed: Number(receipt.gasUsed),
            blockNumber: receipt.blockNumber,
            underlyingSymbol: trade.contract.underlyingSymbol,
            optionType: trade.contract.type,
            strikePrice: trade.contract.strikePrice,
            expirationDate: trade.contract.expirationDate,
            contracts: trade.quantity,
            premium: trade.price,
            transactionHash: txResponse.hash
          }
        });

        console.log(`Sell PUT trade ${trade.id} recorded in blockchain DB`);
      } catch (err) {
        console.error(`Blockchain transaction failed for Sell PUT trade ${trade.id}:`, err);
      }

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
  const now = new Date();

  // 1️⃣ Find all SELL PUT trades where contract is expired
  const trades = await prisma.optionTrade.findMany({
    where: {
      tradeType: "SELL",
      orderType: "MARKET",
      contract: {
        type: "PUT",
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
    const { contract, user, quantity, collateral } = trade;

    const strike = contract.strikePrice;
    const contractSize = contract.size || 100;
    const totalShares = quantity * contractSize;

    // 2️⃣ Fetch latest underlying price
    const latestPrice = await prisma.intradayPrice3.findFirst({
      where: { stockId: contract.stockId },
      orderBy: { date: "desc" }
    });

    if (!latestPrice) continue;

    const underlyingFinalPrice = parseFloat(latestPrice.closePrice);

    let assigned = false;

    // Start wallet update with collateral release
    let walletUpdate = collateral; // always return collateral

    // 3️⃣ Settlement logic

    if (underlyingFinalPrice >= strike) {
      // PUT expires worthless
      // Only collateral returned (already in walletUpdate)

    } else {
      // PUT is assigned — seller must buy the shares
      assigned = true;

      const costToBuyShares = strike * totalShares;

      // Release collateral + spend cash to buy shares
      walletUpdate = walletUpdate - costToBuyShares;

      // Add shares to user's holdings
      await prisma.stockHolding.upsert({
        where: { userId_stockId: { userId: user.id, stockId: contract.stockId } },
        create: {
          userId: user.id,
          stockId: contract.stockId,
          symbol: contract.symbol,
          currentQuantity: totalShares
        },
        update: {
          currentQuantity: { increment: totalShares }
        }
      });
    }

    // 4️⃣ Update wallet (premium was already added on trade creation)
    await prisma.user.update({
      where: { id: user.id },
      data: { wallet: user.wallet + walletUpdate }
    });

    // 5️⃣ Mark trade as expired
    const updatedTrade = await prisma.optionTrade.update({
      where: { id: trade.id },
      data: {
        orderType: "EXPIRED",
        totalAmount: 0 // settlement does not add PnL
      }
    });

    // 6️⃣ Blockchain settlement
    try {
      console.log(`Settling Sell PUT trade ${trade.id} on blockchain...`);

      const tx = await optionLedger.settleOptionTrade(
        trade.contractId,
        "SELL",
        quantity,
        Math.round(strike * 100),
        Math.round(underlyingFinalPrice * 100),
        BigInt(0) // settlement PnL is always 0
      );

      const receipt = await tx.wait();

      await prisma.optionBlockchainTransaction.create({
        data: {
          userId: trade.userId,
          symbol: contract.symbol,
          tradeType: "SELL",
          gasUsed: Number(receipt.gasUsed),
          blockNumber: receipt.blockNumber,
          underlyingSymbol: contract.underlyingSymbol,
          optionType: "put",
          strikePrice: strike,
          expirationDate: contract.expirationDate,
          contracts: quantity,
          premium: trade.price, // original premium
          transactionHash: tx.hash
        }
      });
    } catch (err) {
      console.error(`Blockchain settlement failed for Sell PUT trade ${trade.id}:`, err);
    }

    // 7️⃣ Return settlement output
    settledResults.push({
      tradeId: trade.id,
      userId: user.id,
      symbol: contract.symbol,
      underlyingSymbol: contract.underlyingSymbol,
      strike,
      underlyingFinalPrice,
      assigned,
      sharesReceived: assigned ? totalShares : 0,
      collateralReturned: collateral,
      cashSpentOnAssignment: assigned ? strike * totalShares : 0
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




module.exports.getUserOptionPortfolio = async function (userId) {
  if (!userId) throw new Error("Missing userId");
  const now = new Date();

  console.log("============== 🧾 OPTION PORTFOLIO CALCULATION STARTED ==============");
  console.log("User ID:", userId);
  console.log("Current Time:", now.toISOString());

  const trades = await prisma.optionTrade.findMany({
    where: {
      userId,
      orderType: { in: ["MARKET", "EXPIRED"] }, // Only MARKET trades
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