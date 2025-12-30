// ======================================================
// IMPORTS & SETUP
// ======================================================
const { DateTime } = require('luxon'); // npm i luxon
const prisma = require('../../prisma/prismaClient');
const chartsModel = require('../models/Charts');
const { processLimitOrders } = require('../models/Charts');
const { processStopMarketOrders } = require('../models/stopMarket');
const { processStopLimitOrders } = require('../models/stopLimit');
const {
  executeBuyPutLimitOrders,
  settleBuyPutOrders,
  executeSellCallLimitOrders,
  settleExpiredSellCallTrades,
  executePendingLimitCalls,
  settleExpiredBuyCallTrades,
  executeSellPutLimitOrders,
  settleExpiredSellPutTrades,
} = require("../models/options");

// ----------------------------
// Helper to log with timestamp
// ----------------------------
function log(message) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

// ======================================================
// OPTION TRADE INTRADAY UPDATE
// ======================================================
async function updateOptionTradeStocksIntraday() {
  log("🔄 Starting option trade stock intraday update...");

  try {
    const tradedStocks = await prisma.optionTrade.findMany({
      distinct: ['contractId'],
      include: { contract: { include: { stock: true } } },
    });

    const symbols = tradedStocks.map(t => t.contract?.stock?.symbol).filter(Boolean);
    const uniqueSymbols = [...new Set(symbols)];

    if (!uniqueSymbols.length) {
      log("⚠️ No traded option symbols found.");
      return;
    }

    log(`🧩 Found ${uniqueSymbols.length} unique traded stocks: ${uniqueSymbols.join(', ')}`);

    for (const symbol of uniqueSymbols) {
      try {
        log(`📈 Updating intraday data for ${symbol}...`);
        await chartsModel.getIntradayData(symbol);
      } catch (err) {
        log(`❌ Failed to update ${symbol}: ${err.message}`);
      }
    }

    log("✅ Option trade stock intraday update completed.");
  } catch (error) {
    log(`🔥 Error in optionAutomation job: ${error.message}`);
  }
}

// ======================================================
// OPTION ORDERS AUTOMATION
// ======================================================
async function runOptionAutomationJobs() {
  try {
    log("⚙️ Running automated options settlement and execution tasks...");

    const results = {};
    results.executedBuyPuts = await executeBuyPutLimitOrders();
    results.settledBuyPuts = await settleBuyPutOrders();
    results.executedSellCalls = await executeSellCallLimitOrders();
    results.settledSellCalls = await settleExpiredSellCallTrades();
    results.executedBuyCalls = await executePendingLimitCalls();
    results.settledBuyCalls = await settleExpiredBuyCallTrades();
    results.executedSellPuts = await executeSellPutLimitOrders();
    results.settledSellPuts = await settleExpiredSellPutTrades();

    log(`✅ Completed automation cycle:
    - Executed Buy PUT Orders: ${results.executedBuyPuts.length}
    - Settled Buy PUT Orders: ${results.settledBuyPuts.length}
    - Executed Sell CALL Orders: ${results.executedSellCalls.length}
    - Settled Sell CALL Orders: ${results.settledSellCalls.length}
    - Executed Buy CALL Orders: ${results.executedBuyCalls.length}
    - Settled Buy CALL Orders: ${results.settledBuyCalls.length}
    - Executed Sell PUT Orders: ${results.executedSellPuts.length}
    - Settled Sell PUT Orders: ${results.settledSellPuts.length}`);
  } catch (error) {
    log(`❌ Error running option cron job: ${error.message}`);
  }
}

// ======================================================
// US STOCK ORDERS PROCESSING
// ======================================================
async function processUSStockOrders() {
  try {
    const MARKET_OPEN_HOUR = 9.5; // 9:30 AM
    const MARKET_CLOSE_HOUR = 16; // 4:00 PM

    const nowET = DateTime.now().setZone('America/New_York');
    const hour = nowET.hour + nowET.minute / 60;

    if (hour < MARKET_OPEN_HOUR || hour > MARKET_CLOSE_HOUR) {
      log("US Market closed. Skipping order processing.");
      return;
    }

    const stocks = await prisma.stock.findMany({ select: { stock_id: true } });
    const stockIds = stocks.map(s => s.stock_id);

    for (const stockId of stockIds) {
      const executedLimitOrders = await processLimitOrders(stockId);
      if (executedLimitOrders.length)
        log(`Executed ${executedLimitOrders.length} LIMIT orders for stock ID ${stockId}`);

      const executedStopLimitOrders = await processStopLimitOrders(stockId);
      if (executedStopLimitOrders && executedStopLimitOrders.length)
        log(`Executed ${executedStopLimitOrders.length} STOP-LIMIT orders for stock ID ${stockId}`);

      const executedStopLossOrders = await processStopMarketOrders(stockId);
      if (executedStopLossOrders.length)
        log(`Executed ${executedStopLossOrders.length} STOP-LOSS orders for stock ID ${stockId}`);
    }

    log("✅ US stock order processing completed.");
  } catch (err) {
    log(`❌ Error in US stock order scheduler: ${err.message}`);
  }
}

// ======================================================
// PORTFOLIO INTRADAY PRICE UPDATES
// ======================================================
const MARKET_OPEN = 9.5;
const MARKET_CLOSE = 16;

function isMarketOpen() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(now);

  const day = parts.find(p => p.type === 'weekday').value;
  const hour = Number(parts.find(p => p.type === 'hour').value);
  const minute = Number(parts.find(p => p.type === 'minute').value);
  const time = hour + minute / 60;

  return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].includes(day)
    && time >= MARKET_OPEN
    && time <= MARKET_CLOSE;
}

async function getAllActiveSymbols() {
  const [
    trades,
    limitOrders,
    stopMarketOrders,
    stopLimitOrders,
  ] = await Promise.all([
    prisma.trade.findMany({
      select: { stock: { select: { symbol: true } } },
      distinct: ['stockId'],
    }),
    prisma.limitOrder.findMany({
      where: { status: 'PENDING' },
      select: { stock: { select: { symbol: true } } },
      distinct: ['stockId'],
    }),
    prisma.stopMarketOrder.findMany({
      where: { status: 'PENDING' },
      select: { stock: { select: { symbol: true } } },
      distinct: ['stockId'],
    }),
    prisma.stopLimitOrder.findMany({
      where: { status: 'PENDING' },
      select: { stock: { select: { symbol: true } } },
      distinct: ['stockId'],
    }),
  ]);

  const symbols = new Set();
  [...trades, ...limitOrders, ...stopMarketOrders, ...stopLimitOrders].forEach(
    row => row?.stock?.symbol && symbols.add(row.stock.symbol)
  );

  return [...symbols];
}

async function updateIntradayPrices(symbols) {
  log(`📈 Updating ${symbols.length} symbols`);
  for (const symbol of symbols) {
    try {
      await chartsModel.getIntradayData(symbol);
      log(`✅ ${symbol}`);
    } catch (err) {
      log(`❌ ${symbol}: ${err.message}`);
    }
  }
}

async function refreshPortfolios() {
  const users = await prisma.user.findMany({ select: { id: true } });
  for (const user of users) {
    try {
      await chartsModel.getUserPortfolio(user.id);
    } catch (err) {
      log(`❌ Portfolio ${user.id}: ${err.message}`);
    }
  }
}

async function runPortfolioUpdates() {
  log('🚀 Portfolio price updater started');

  if (!isMarketOpen()) {
    log('⏸ Market closed — skipping portfolio updates');
    return;
  }

  const symbols = await getAllActiveSymbols();
  if (!symbols.length) {
    log('ℹ️ No active symbols');
    return;
  }

  await updateIntradayPrices(symbols);
  await refreshPortfolios();

  log('🎉 Portfolio update complete');
}

// ======================================================
// MAIN FUNCTION FOR RENDER CRON
// ======================================================
async function main() {
  log("🚀 Running all cron jobs...");

  await updateOptionTradeStocksIntraday();
  await runOptionAutomationJobs();
  await processUSStockOrders();
  await runPortfolioUpdates();

  log("🎉 All cron jobs completed successfully!");
}

// ======================================================
// RUN
// ======================================================
main(); 