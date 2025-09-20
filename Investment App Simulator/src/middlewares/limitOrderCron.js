
const cron = require('node-cron');
const prisma = require('../../prisma/prismaClient');
const { processLimitOrders } = require('../models/Charts'); // adjust path

async function getAllStockIds() {
  const stocks = await prisma.stock.findMany({ select: { stock_id: true } });
  return stocks.map(s => s.stock_id);
}

const MARKET_OPEN = 9.5;  // 9:30 AM
const MARKET_CLOSE = 16;  // 4:00 PM

function isMarketOpen() {
  const now = new Date();
  const hour = now.getHours() + now.getMinutes() / 60;
  return hour >= MARKET_OPEN && hour <= MARKET_CLOSE;
}

cron.schedule('*/30 * * * *', async () => {
  try {
    if (!isMarketOpen()) {
      console.log('Market closed. Skipping limit order processing.');
      return;
    }

    const stockIds = await getAllStockIds();
    for (const stockId of stockIds) {
      const executedOrders = await processLimitOrders(stockId);
      if (executedOrders.length) {
        console.log(`Executed ${executedOrders.length} orders for stock ID ${stockId}`);
      }
    }

  } catch (err) {
    console.log('Error in limit order scheduler:', err);
  }
});
