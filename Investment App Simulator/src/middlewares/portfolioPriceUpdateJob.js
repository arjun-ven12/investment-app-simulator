// src/cron/portfolioPriceUpdateJob.js
const prisma = require('../../prisma/prismaClient');
const chartsModel = require('../models/Charts');

// =======================
// Market time helpers
// =======================
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

// =======================
// Get all symbols used in portfolios
// =======================
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

// =======================
// Update intraday prices
// =======================
async function updateIntradayPrices(symbols) {
  console.log(`📈 Updating ${symbols.length} symbols`);

  for (const symbol of symbols) {
    try {
      await chartsModel.getIntradayData(symbol);
      console.log(`✅ ${symbol}`);
    } catch (err) {
      console.error(`❌ ${symbol}:`, err.message);
    }
  }
}

// =======================
// Optional cache warm
// =======================
async function refreshPortfolios() {
  const users = await prisma.user.findMany({ select: { id: true } });

  for (const user of users) {
    try {
      await chartsModel.getUserPortfolio(user.id);
    } catch (err) {
      console.error(`❌ Portfolio ${user.id}:`, err.message);
    }
  }
}

// =======================
// Entry point (RUN ONCE)
// =======================
async function run() {
  console.log('🚀 Portfolio price updater started');

  if (!isMarketOpen()) {
    console.log('⏸ Market closed — exiting');
    return;
  }

  const symbols = await getAllActiveSymbols();

  if (!symbols.length) {
    console.log('ℹ️ No active symbols');
    return;
  }

  await updateIntradayPrices(symbols);
  await refreshPortfolios();

  console.log('🎉 Portfolio update complete');
}

run()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('🔥 Job failed:', err);
    process.exit(1);
  });
