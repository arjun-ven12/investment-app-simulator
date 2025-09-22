const cron = require('node-cron');
const { DateTime } = require('luxon'); // install: npm i luxon
const prisma = require('../../prisma/prismaClient');
const { processLimitOrders } = require('../models/Charts');
const { processStopMarketOrders } = require('../models/stopLoss');
const { processStopLimitOrders } = require('../models/stopLimit');

async function getAllStockIds() {
  const stocks = await prisma.stock.findMany({ select: { stock_id: true } });
  return stocks.map(s => s.stock_id);
}

// US Market hours in Eastern Time
const MARKET_OPEN_HOUR = 9.5; // 9:30 AM
const MARKET_CLOSE_HOUR = 16; // 4:00 PM

function isMarketOpenUS() {
  // Convert server time to US Eastern time
  const nowET = DateTime.now().setZone('America/New_York');
  const hour = nowET.hour + nowET.minute / 60;
  return hour >= MARKET_OPEN_HOUR && hour <= MARKET_CLOSE_HOUR;
}

cron.schedule('*/30 * * * *', async () => {
  try {
    if (!isMarketOpenUS()) {
      console.log('US Market closed. Skipping order processing.');
      return;
    }

    const stockIds = await getAllStockIds();
    for (const stockId of stockIds) {
      // Limit Orders
      const executedLimitOrders = await processLimitOrders(stockId);
      if (executedLimitOrders.length) {
        console.log(`Executed ${executedLimitOrders.length} LIMIT orders for stock ID ${stockId}`);
      }

      const executedStopLimitOrders = await processStopLimitOrders(stockId);
      if (executedStopLimitOrders && executedStopLimitOrders.length) {
        console.log(`Executed ${executedStopLimitOrders.length} STOP-LIMIT orders for stock ID ${stockId}`);
      }
      
      // Stop-Loss Orders
      const executedStopLossOrders = await processStopMarketOrders(stockId);
      if (executedStopLossOrders.length) {
        console.log(`Executed ${executedStopLossOrders.length} STOP-LOSS orders for stock ID ${stockId}`);
      }
    }

  } catch (err) {
    console.log('Error in order scheduler:', err);
  }
});

