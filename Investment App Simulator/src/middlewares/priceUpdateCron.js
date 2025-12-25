const cron = require('node-cron');
const prisma = require('../../prisma/prismaClient');
const chartsModel = require('../models/Charts');

// =======================
// Market time helpers
// =======================
const MARKET_OPEN = 9.5;  // 9:30 AM ET
const MARKET_CLOSE = 16;  // 4:00 PM ET

function isMarketOpen() {
  const now = new Date();
  const estNow = new Date(
    now.toLocaleString('en-US', { timeZone: 'America/New_York' })
  );

  const day = estNow.getDay(); // 0 = Sun, 6 = Sat
  const hour = estNow.getHours() + estNow.getMinutes() / 60;

  return day >= 1 && day <= 5 && hour >= MARKET_OPEN && hour <= MARKET_CLOSE;
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
    (row) => {
      if (row?.stock?.symbol) {
        symbols.add(row.stock.symbol);
      }
    }
  );

  return [...symbols];
}

// =======================
// Upsert intraday data using existing logic
// =======================
async function updateIntradayPrices(symbols) {
  if (!symbols.length) return;

  console.log(`📈 Updating intraday prices for ${symbols.length} symbols`);

  for (const symbol of symbols) {
    try {
      // This internally fetches + upserts IntradayPrice3
      await chartsModel.getIntradayData(symbol);

      console.log(`✅ Updated intraday data for ${symbol}`);
    } catch (err) {
      console.error(`❌ Failed updating intraday for ${symbol}:`, err.message);
    }
  }
}


// =======================
// (Optional) Warm portfolio cache
// =======================
async function refreshPortfolios() {
  const users = await prisma.user.findMany({
    select: { id: true },
  });

  for (const user of users) {
    try {
      await chartsModel.getUserPortfolio(user.id);
    } catch (err) {
      console.error(
        `❌ Failed refreshing portfolio for user ${user.id}:`,
        err.message
      );
    }
  }
}

// =======================
// Cron: Every 15 minutes
// =======================
cron.schedule('*/30 * * * *', async () => {
  try {
    // if (!isMarketOpen()) {
    //   console.log('⏸ Market closed. Skipping portfolio price update.');
    //   return;
    // }

    console.log('🚀 Portfolio price updater started');

    const symbols = await getAllActiveSymbols();

    if (!symbols.length) {
      console.log('ℹ️ No active symbols found. Skipping.');
      return;
    }

    await updateIntradayPrices(symbols);

    // Optional but recommended if you cache portfolio results
    await refreshPortfolios();

    console.log('✅ Portfolio price update complete');
  } catch (err) {
    console.error('🔥 Portfolio price updater failed:', err);
  }
});
