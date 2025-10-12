
// cronJobs/optionAutomation.js
const prisma = require('../../prisma/prismaClient'); // adjust path if needed
const chartsModel = require('../models/Charts'); // contains getIntradayData
const cron = require('node-cron');

async function updateOptionTradeStocksIntraday() {
  console.log("🔄 Starting option trade stock intraday update...");

  try {
    // 1️⃣ Fetch unique stock symbols from traded option contracts
    const tradedStocks = await prisma.optionTrade.findMany({
      distinct: ['contractId'],
      include: {
        contract: {
          include: {
            stock: true,
          },
        },
      },
    });

    const symbols = tradedStocks
      .map(t => t.contract?.stock?.symbol)
      .filter(Boolean);

    const uniqueSymbols = [...new Set(symbols)];

    if (uniqueSymbols.length === 0) {
      console.log("⚠️ No traded option symbols found.");
      return;
    }

    console.log(`🧩 Found ${uniqueSymbols.length} unique traded stocks:`, uniqueSymbols.join(', '));

    // 2️⃣ Loop through each symbol and upsert intraday data
    for (const symbol of uniqueSymbols) {
      try {
        console.log(`📈 Updating intraday data for ${symbol}...`);
        await chartsModel.getIntradayData(symbol); // your existing logic handles upsert
      } catch (err) {
        console.error(`❌ Failed to update ${symbol}:`, err.message);
      }
    }

    console.log("✅ Option trade stock intraday update completed.");

  } catch (error) {
    console.error("🔥 Error in optionAutomation job:", error);
  }
}

// 3️⃣ Run immediately on server start
updateOptionTradeStocksIntraday();

// 4️⃣ Schedule every hour (customize as needed)
cron.schedule('0 * * * *', updateOptionTradeStocksIntraday, {
  scheduled: true,
  timezone: "Asia/Singapore",
});

module.exports = { updateOptionTradeStocksIntraday };
