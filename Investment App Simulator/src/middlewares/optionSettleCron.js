
const cron = require("node-cron");
const {
  executeBuyPutLimitOrders,
  settleBuyPutOrders,
  executeSellCallLimitOrders,
  settleExpiredSellCallTrades,
  executePendingLimitCalls,
  settleExpiredBuyCallTrades,
  executeSellPutLimitOrders,
  settleExpiredSellPutTrades,
} = require("../models/options"); // adjust path if needed

// Helper to log with timestamp
function log(message) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

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
    console.error("❌ Error running option cron job:", error);
  }
}

// Schedule every 30 minutes
cron.schedule("*/30 * * * *", async () => {
  await runOptionAutomationJobs();
});

log("🕒 Option automation cron scheduled (every 30 minutes).");

// Optionally run once at startup
runOptionAutomationJobs();
