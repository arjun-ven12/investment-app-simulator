const scenarioModel = require('../models/scenario');
const chartsModel = require('../models/Charts');
const { broadcastScenarioMarketUpdate, broadcastScenarioLimitUpdate, broadcastScenarioPortfolioUpdate } = require('../socketBroadcast');
// --- CRUD Controllers ---
module.exports.createScenarioController = async (req, res) => {
  try {
    console.log("📩 Incoming scenario request:", req.body);

    const scenario = await scenarioModel.createScenario(req.body);

    return res.status(201).json({
      success: true,
      message: "Scenario created successfully",
      scenario
    });
  } catch (err) {
    console.error("❌ Scenario creation error:", err);
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};



module.exports.getAllScenariosController = async (req, res) => {
  try {
    const scenarios = await scenarioModel.getAllScenarios(req.query);
    return res.status(200).json({ success: true, scenarios });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports.getScenarioByIdController = async (req, res) => {
  try {
    const scenario = await scenarioModel.getScenarioById(req.params.id);
    return res.status(200).json({ success: true, scenario });
  } catch (err) {
    console.error(err);
    const status = err.message === 'Scenario not found' ? 404 : 500;
    return res.status(status).json({ success: false, message: err.message });
  }
};

module.exports.updateScenarioController = async (req, res) => {
  try {
    const updated = await scenarioModel.updateScenario(req.params.id, req.body);
    return res.status(200).json({ success: true, scenario: updated });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports.deleteScenarioController = async (req, res) => {
  try {
    await scenarioModel.deleteScenario(req.params.id);
    return res.status(200).json({ success: true, message: 'Scenario deleted' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// --- JOIN scenario ---
module.exports.joinScenarioController = async (req, res) => {
  try {
    const participant = await scenarioModel.joinScenario(req.params.id, req.user.id);
    return res.status(200).json({ success: true, participant });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
};


// --- LEADERBOARD ---
module.exports.getLeaderboardController = async (req, res) => {
  try {
    const leaderboard = await scenarioModel.getLeaderboard(req.params.id);
    return res.status(200).json({ success: true, leaderboard });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
};


module.exports.getJoinedScenariosController = async (req, res) => {
  try {
    const userId = req.user.id; // from JWT
    const scenarios = await scenarioModel.getJoinedScenarios(userId);
    return res.status(200).json({ success: true, scenarios });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
};


module.exports.getScenarioStockData = async function (req, res) {
  const scenarioId = parseInt(req.params.id);
  const symbol = req.params.symbol;

  try {
    const scenario = await scenarioModel.getScenarioById(scenarioId);
    if (!scenario) return res.status(404).json({ error: "Scenario not found." });

    const { startDate, endDate } = scenario;
    const from = startDate.toISOString().split('T')[0];
    const to = endDate.toISOString().split('T')[0];

    console.log("Fetching intraday data for", symbol, "from", from, "to", to);

    const chartData = await scenarioModel.getScenarioIntradayDataFromAPI(scenarioId, symbol, from, to);

    return res.status(200).json({
      scenario: scenario.title,
      symbol,
      chartData
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
};


module.exports.getReplayDataController = async (req, res) => {
  try {
    const { scenarioId, symbol } = req.params;
    const data = await scenarioModel.getReplayData(symbol, Number(scenarioId));
    res.json({ replayData: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

module.exports.getReplayProgressController = async (req, res) => {
  try {
    const { scenarioId, symbol, userId } = req.params;
    const progress = await scenarioModel.getReplayProgress(Number(userId), Number(scenarioId), symbol);
    res.json(progress);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};


module.exports.submitMarketOrder = async (req, res) => {
  try {
    const scenarioId = parseInt(req.params.scenarioId);
    const userId = req.user.id;
    const { side, symbol, quantity, price, currentIndex } = req.body;

    if (!side || !symbol || !quantity || !price) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const trade = await scenarioModel.executeMarketOrder(scenarioId, userId, {
      side,
      symbol,
      quantity,
      price,
      currentIndex
    });
    // ✅ Broadcast trade to user’s scenario room
    broadcastScenarioMarketUpdate(userId, scenarioId, trade);

    const portfolio = await scenarioModel.getUserScenarioPortfolio(userId, scenarioId);
    broadcastScenarioPortfolioUpdate(userId, scenarioId, portfolio);
    return res.status(200).json({ success: true, trade });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
};


// Limit order controller
module.exports.createLimitOrderController = async (req, res) => {
  try {
    const { scenarioId } = req.params;
    const userId = req.user.id; // ✅ get from JWT middleware
    const { side, symbol, quantity, limitPrice, price, currentIndex } = req.body;

    // Pass scenarioId and userId correctly
    const order = await scenarioModel.createLimitOrder(
      Number(scenarioId),
      Number(userId), // make sure it's a number
      { side, symbol, quantity, limitPrice, price, currentIndex }
    );
    broadcastScenarioLimitUpdate(userId, scenarioId, order);

    return res.status(201).json({ success: true, order });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
};


module.exports.getWalletController = async (req, res) => {
  const { scenarioId } = req.params;
  const userId = req.user.id;

  try {
    const balance = await scenarioModel.getWalletBalance(scenarioId, userId);
    res.json({ success: true, cashBalance: balance.toString() });
  } catch (err) {
    console.error(err);
    res.status(400).json({ success: false, message: err.message });
  }
};

module.exports.processLimitOrdersController = async (req, res) => {
  try {
    const { symbol, currentPrice, currentIndex } = req.body;
    const executedOrders = await scenarioModel.processLimitOrders(symbol, currentPrice, currentIndex);
    return res.status(200).json({ success: true, executedOrders });

  } catch (err) {
    console.error("💥 Error in processLimitOrdersController:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Internal server error while processing limit orders.",
    });
  }
};



module.exports.getOrderHistoryController = async (req, res) => {
  const { scenarioId } = req.params;
  const userId = req.user.id;

  try {
    // Fetch order history (market + limit)
    const { marketOrders, limitOrders } = await scenarioModel.getOrderHistory(scenarioId, userId);

    res.json({ success: true, marketOrders, limitOrders });
  } catch (err) {
    console.error(err);
    res.status(400).json({ success: false, message: err.message });
  }
};

module.exports.getScenarioDetailsController = async (req, res) => {
  const { scenarioId } = req.params;

  try {
    const scenario = await scenarioModel.getScenarioDetails(scenarioId);

    // Convert BigInt and Prisma Decimal safely
    const safeScenario = JSON.parse(
      JSON.stringify(scenario, (_, v) => {
        if (typeof v === 'bigint') return v.toString();
        if (v && v.constructor && v.constructor.name === 'Decimal') return v.toString();
        return v;
      })
    );

    res.json({ success: true, scenario: safeScenario });
  } catch (err) {
    console.error(err);
    res.status(404).json({ success: false, message: err.message });
  }
};

// Save replay progress controller
module.exports.saveReplayProgressController = async (req, res) => {
  try {
    const { scenarioId } = req.params;
    const { symbols, currentIndex, currentSpeed } = req.body;
    const userId = req.user.id;

    if (!Array.isArray(symbols) || symbols.length === 0 || isNaN(Number(scenarioId))) {
      return res.status(400).json({ success: false, message: "Missing or invalid parameters" });
    }

    console.log("Saving replay progress for user:", userId, "scenario:", scenarioId);
    console.log("Symbols:", symbols, "lastIndex:", currentIndex, "speed:", currentSpeed);

    const results = [];
    for (const symbol of symbols) {
      const progress = await scenarioModel.saveReplayProgress(userId, Number(scenarioId), symbol, currentIndex, currentSpeed);
      results.push(progress);
      console.log(`Saved progress for symbol ${symbol}:`, progress);
    }

    return res.status(200).json({ success: true, progress: results });
  } catch (err) {
    console.error("Error saving replay progress:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports.loadProgressController = async (req, res) => {
  try {
    const { scenarioId } = req.params;
    const userId = req.user.id;
    const { symbol } = req.query; // optional single symbol

    // Fetch saved progress from DB
    const progress = await scenarioModel.loadProgress(Number(scenarioId), userId, symbol);

    if (!progress || progress.length === 0) {
      return res.status(404).json({ success: false, message: "No saved progress found" });
    }

    // Fetch intraday chart data
    const symbols = Array.isArray(progress) ? progress.map(p => p.symbol) : [progress.symbol];
    const symbolsData = await scenarioModel.loadIntradayData(Number(scenarioId), symbols);

    return res.status(200).json({
      success: true,
      symbols,
      currentIndex: progress[0]?.lastIndex || 0,
      currentSpeed: progress[0]?.speed || 3,
      data: symbolsData
    });
  } catch (err) {
    console.error("Error loading replay progress:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports.getScenarioIntradayController = async (req, res) => {
  const { scenarioId, symbol } = req.params;
  const userId = req.user.id; // make sure req.user exists
  if (!userId) return res.status(400).json({ success: false, message: "Missing user ID" });

  try {
    const data = await scenarioModel.getScenarioIntradayDataWithProgress(scenarioId, symbol, userId);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
};



module.exports.getUserScenarioPortfolio = async function (req, res) {
  const userId = req.user.id;
  const scenarioId = Number(req.params.scenarioId);

  if (!Number.isInteger(userId) || !Number.isInteger(scenarioId)) {
    return res.status(400).json({ error: "Invalid user ID or scenario ID." });
  }

  try {
    const portfolio = await scenarioModel.getUserScenarioPortfolio(userId, scenarioId);
    return res.status(200).json(portfolio);
  } catch (error) {
    console.error("Error fetching user scenario portfolio:", error);
    if (error.message?.includes("not a participant")) {
      return res.status(404).json({ error: error.message });
    }
    return res.status(500).json({ error: error.message || "Server error" });
  }
};


module.exports.endScenarioController = async function (req, res) {
  const scenarioId = Number(req.params.scenarioId);
  if (!scenarioId) return res.status(400).json({ error: "Scenario ID is required" });

  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    // Mark this participant as ended
    await scenarioModel.markScenarioEnded(userId, scenarioId);

    // Fetch this participant’s portfolio
    const portfolio = await scenarioModel.getUserScenarioPortfolio(userId, scenarioId);
    const wallet = parseFloat(await scenarioModel.getParticipantWallet(userId, scenarioId));


    // Combine wallet + portfolio total
    const totalPortfolioValue =
      wallet +
      parseFloat(portfolio.summary.totalInvested) +
      parseFloat(portfolio.summary.unrealizedPnL) +
      parseFloat(portfolio.summary.realizedPnL);

    // Fetch other participants
    const otherParticipants = await scenarioModel.getScenarioParticipants(scenarioId);
    const otherEndedParticipants = otherParticipants.filter(p => p.userId !== userId && p.ended);

    const finalPortfolios = await Promise.all(
      otherEndedParticipants.map(async (p) => {
        const pPortfolio = await scenarioModel.getUserScenarioPortfolio(p.userId, scenarioId);
        const pWallet = parseFloat(await scenarioModel.getParticipantWallet(p.userId, scenarioId));


        const pTotalPortfolioValue =
          pWallet +
          parseFloat(pPortfolio.summary.totalInvested) +
          parseFloat(pPortfolio.summary.unrealizedPnL) +
          parseFloat(pPortfolio.summary.realizedPnL);

        return {
          userId: p.userId,
          wallet: pWallet.toFixed(2),
          portfolio: pPortfolio,
          totalPortfolioValue: pTotalPortfolioValue.toFixed(2)
        };
      })
    );

    return res.status(200).json({
      message: `Scenario ${scenarioId} ended for user ${userId}.`,
      finalPortfolios: [
        {
          userId,
          wallet: wallet.toFixed(2),
          portfolio,
          totalPortfolioValue: totalPortfolioValue.toFixed(2),
        },
        ...finalPortfolios
      ],
    });
  } catch (error) {
    console.error("Error ending scenario:", error);
    return res.status(500).json({ error: error.message || "Server error" });
  }
};

module.exports.getUserScenarioData = async (req, res) => {
  try {
    const scenarioId = parseInt(req.params.scenarioId);
    const userId = req.user.id;

    if (!scenarioId) {
      return res.status(400).json({ success: false, message: 'Missing scenarioId' });
    }

    const data = await scenarioModel.fetchUserScenarioData(scenarioId, userId);

    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
};


module.exports.getScenarioEndingSummary = async (req, res = null, internal = false) => {
  try {
    const scenarioId = Number(req.params?.scenarioId);
    if (!scenarioId) {
      if (!internal && res) return res.status(400).json({ error: "Scenario ID required" });
      throw new Error("Scenario ID required");
    }

    const userId = req.user?.id;
    if (!userId) {
      if (!internal && res) return res.status(401).json({ error: "Unauthorized" });
      throw new Error("Unauthorized");
    }

    // 1️⃣ Mark participant ended
    await scenarioModel.markScenarioEnded(userId, scenarioId);

    // 2️⃣ Fetch portfolio & wallet
    const portfolio = await scenarioModel.getUserScenarioPortfolio(userId, scenarioId);
    const wallet = await scenarioModel.getParticipantWallet(userId, scenarioId);

    // 3️⃣ Flatten trades from portfolio positions (if any)
    const trades = (portfolio.positions || []).map(p => ({
      symbol: p.symbol,
      netQty: Number(p.quantity),
      totalBought: Number(p.totalInvested),
      realizedPnL: Number(p.realizedPnL),
      currentValue: Number(p.currentValue),
      unrealizedPnL: Number(p.unrealizedPnL),
      avgBuyPrice: Number(p.avgBuyPrice),
      currentPrice: Number(p.currentPrice),
    }));

    // 4️⃣ Fetch intraday data
    const intradayData = await scenarioModel.fetchUserScenarioData(scenarioId, userId);

    // 5️⃣ Compute total portfolio value
    const totalPortfolioValue =
      Number(wallet || 0) + trades.reduce((acc, t) => acc + Number(t.currentValue || 0), 0);

    // 6️⃣ Handle PB logic
    const attemptNumber = (portfolio.summary?.attemptNumber ?? 1);
    const pbResult = await scenarioModel.upsertPersonalBest({
      userId,
      scenarioId,
      attemptNumber,
      totalPortfolioValue,
      realizedPnL: Number(portfolio.summary?.realizedPnL || 0),
      unrealizedPnL: Number(portfolio.summary?.unrealizedPnL || 0),
    });

    // 7️⃣ Prepare return payload
    const summaryPayload = {
      wallet,
      trades,
      intradaySummary: summariseIntradayForAI(intradayData),
      totalPortfolioValue,
      summary: portfolio.summary,
      isPersonalBest: pbResult.isNewPB,
      personalBest: pbResult.record,
    };

    // ✅ If this was called internally (e.g., from chatbot), just return data
    if (internal || !res) {
      return summaryPayload;
    }

    // ✅ Otherwise respond normally via Express
    return res.status(200).json(summaryPayload);

  } catch (err) {
    console.error("❌ Error in getScenarioEndingSummary:", err);
    // 🔒 If called internally, throw instead of trying to res.status
    if (internal || !res) throw err;
    return res.status(500).json({ error: err.message });
  }
};


module.exports.scenarioEndingDetailsCharts = async (req, res = null, internal = false) => {
  try {
    const scenarioId = Number(req.params?.scenarioId);
    if (!scenarioId) {
      if (!internal && res) return res.status(400).json({ error: "Scenario ID required" });
      throw new Error("Scenario ID required");
    }

    const userId = req.user?.id;
    if (!userId) {
      if (!internal && res) return res.status(401).json({ error: "Unauthorized" });
      throw new Error("Unauthorized");
    }

    // 2️⃣ Fetch portfolio & wallet
    const portfolio = await scenarioModel.getUserScenarioPortfolio(userId, scenarioId);
    const wallet = await scenarioModel.getParticipantWallet(userId, scenarioId);

    // 3️⃣ Flatten trades from portfolio positions (if any)
    const trades = (portfolio.positions || []).map(p => ({
      symbol: p.symbol,
      netQty: Number(p.quantity),
      totalBought: Number(p.totalInvested),
      realizedPnL: Number(p.realizedPnL),
      currentValue: Number(p.currentValue),
      unrealizedPnL: Number(p.unrealizedPnL),
      avgBuyPrice: Number(p.avgBuyPrice),
      currentPrice: Number(p.currentPrice),
    }));

    // 4️⃣ Fetch intraday data
    const intradayData = await scenarioModel.fetchUserScenarioData(scenarioId, userId);

    // 5️⃣ Compute total portfolio value
    const totalPortfolioValue =
      Number(wallet || 0) + trades.reduce((acc, t) => acc + Number(t.currentValue || 0), 0);

    // 7️⃣ Prepare return payload
    const summaryPayload = {
      wallet,
      trades,
      intraday: intradayData,
      totalPortfolioValue,
      summary: portfolio.summary,
    };

    // ✅ Otherwise respond normally via Express
    return res.status(200).json(summaryPayload);

  } catch (err) {
    console.error("❌ Error in getScenarioEndingSummary:", err);
    // 🔒 If called internally, throw instead of trying to res.status
    if (internal || !res) throw err;
    return res.status(500).json({ error: err.message });
  }
};

function decToString(d) {
  if (d === null || d === undefined) return null;
  if (typeof d === 'object' && d.constructor?.name === 'Decimal') return d.toString();
  return String(d);
}

/** GET /scenarios/:scenarioId/personal-best */
module.exports.getPersonalBest = async (req, res) => {
  try {
    const userId = req.user.id;
    const scenarioId = Number(req.params.scenarioId);
    const pb = await scenarioModel.getPersonalBest(userId, scenarioId);

    if (!pb) {
      return res.status(404).json({ success: true, personalBest: null });
    }

    return res.json({
      success: true,
      personalBest: {
        attemptNumber: pb.bestAttemptNumber,
        totalValue: decToString(pb.bestTotalValue),
        returnPct: decToString(pb.bestReturnPct),
        realizedPnL: decToString(pb.bestRealizedPnL),
        unrealizedPnL: decToString(pb.bestUnrealizedPnL),
        achievedAt: pb.achievedAt,
      },
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: e.message });
  }
};

/** GET /scenarios/me/personal-bests */
module.exports.listPersonalBests = async (req, res) => {
  try {
    const userId = req.user.id;
    const items = await scenarioModel.listPersonalBests(userId);

    return res.json({
      success: true,
      items: items.map(pb => ({
        scenarioId: pb.scenarioId,
        scenarioTitle: pb.scenario.title,
        attemptNumber: pb.bestAttemptNumber,
        totalValue: decToString(pb.bestTotalValue),
        returnPct: decToString(pb.bestReturnPct),
        achievedAt: pb.achievedAt,
      })),
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: e.message });
  }
};

module.exports.startAttempt = async (req, res) => {
  try {
    const userId = req.user.id;
    const scenarioId = Number(req.params.scenarioId);

    // Always fetch and AWAIT a numeric balance
    const startingBalance = await scenarioModel.getScenarioStartBalance(scenarioId);
    if (startingBalance == null || Number.isNaN(Number(startingBalance))) {
      return res.status(500).json({ success: false, message: 'Invalid starting balance' });
    }

    const attemptNumber = await scenarioModel.startAttemptGuarded(
      userId,
      scenarioId,
      Number(startingBalance)
    );

    return res.status(200).json({
      success: true,
      message: 'New attempt started.',
      attemptNumber,
      startingBalance: Number(startingBalance),
    });
  } catch (e) {
    const status = e.status || 500;
    return res.status(status).json({ success: false, message: e.message });
  }
};


// FINISH attempt (idempotent)
module.exports.finishAttempt = async (req, res) => {
  try {
    const userId = req.user.id;
    const scenarioId = Number(req.params.scenarioId);

    // 1️⃣ Get active attempt FIRST
    const activeAttempt = await scenarioModel.getActiveAttempt(userId, scenarioId);
    if (!activeAttempt) {
      return res.status(409).json({
        success: false,
        message: "No active attempt to finish."
      });
    }

    const attemptNumber = activeAttempt.attemptNumber;

    // 2️⃣ Compute portfolio BEFORE cleanup
    const portfolio = await scenarioModel.getUserScenarioPortfolio(userId, scenarioId);
    const wallet = await scenarioModel.getParticipantWallet(userId, scenarioId);

    const totalPortfolioValue =
      Number(wallet) +
      Number(portfolio.summary.totalInvested) +
      Number(portfolio.summary.unrealizedPnL) +
      Number(portfolio.summary.realizedPnL);

    const startBalance = await scenarioModel.getScenarioStartBalance(scenarioId);
    const returnPct =
      startBalance > 0
        ? (totalPortfolioValue - startBalance) / startBalance
        : 0;

    // 3️⃣ UPDATE ScenarioAttempt (THIS FIXES YOUR NULLS)
    await scenarioModel.completeAttempt({
      userId,
      scenarioId,
      attemptNumber,
      totalValue: totalPortfolioValue,
      realizedPnL: Number(portfolio.summary.realizedPnL),
      unrealizedPnL: Number(portfolio.summary.unrealizedPnL),
      returnPct
    });

    // 4️⃣ SNAPSHOT analytics (historical)
    await scenarioModel.saveAttemptAnalytics({
      userId,
      scenarioId,
      attemptNumber,
      summary: portfolio.summary,
      positions: portfolio.positions
    });

    // 5️⃣ Personal best
    const pb = await scenarioModel.upsertPersonalBest({
      userId,
      scenarioId,
      attemptNumber,
      totalPortfolioValue,
      realizedPnL: Number(portfolio.summary.realizedPnL),
      unrealizedPnL: Number(portfolio.summary.unrealizedPnL),
    });

    // 6️⃣ Cleanup AFTER saving analytics
    await scenarioModel.finishAttemptOnce(userId, scenarioId);

    return res.status(200).json({
      success: true,
      attemptNumber,
      totalPortfolioValue,
      returnPct,
      wallet,
      summary: portfolio.summary,
      isPersonalBest: pb.isNewPB,
      personalBest: pb.record
    });

  } catch (e) {
    console.error("❌ finishAttempt error:", e);
    return res.status(500).json({ success: false, message: e.message });
  }
};


/** GET /scenarios/:scenarioId/attempts */
module.exports.listAttempts = async (req, res) => {
  try {
    const userId = req.user.id;
    const scenarioId = Number(req.params.scenarioId);
    const items = await scenarioModel.listAttempts(userId, scenarioId);

    return res.status(200).json({ success: true, items });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, message: e.message });
  }
};


module.exports.saveAIInsights = async (req, res) => {
  try {
    const userId = req.user.id;
    const scenarioId = Number(req.params.scenarioId);
    const { aiAdvice } = req.body;

    if (!aiAdvice) {
      return res.status(400).json({ success: false, message: "AI advice text is required." });
    }

    const result = await scenarioModel.saveAIInsights(userId, scenarioId, aiAdvice);

    if (!result) {
      return res.status(404).json({ success: false, message: "No active attempt found for this user." });
    }

    res.json({ success: true, message: "AI insights saved successfully.", data: result });
  } catch (err) {
    console.error("Error in saveAIInsights controller:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};


module.exports.getLatestAIAdviceController = async (req, res) => {
  try {
    const userId = req.user?.id;
    const scenarioId = Number(req.params.scenarioId);

    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    if (!scenarioId) return res.status(400).json({ error: "Invalid scenario ID" });

    const latestAdvice = await scenarioModel.getLatestAIAdvice(userId, scenarioId);

    if (!latestAdvice) {
      return res.status(404).json({ message: "No AI advice found for this scenario." });
    }

    return res.status(200).json({
      attemptNumber: latestAdvice.attemptNumber,
      aiInsights: latestAdvice.aiInsights,
      createdAt: latestAdvice.createdAt,
      endedAt: latestAdvice.endedAt,
    });
  } catch (err) {
    console.error("❌ Error fetching latest AI advice controller:", err);
    return res.status(500).json({ error: err.message });
  }
};


exports.leaveScenario = async (req, res) => {
  try {
    const userId = req.user.id;
    const scenarioId = Number(req.params.id);

    const result = await scenarioModel.removeUserScenario(userId, scenarioId);
    return res.json(result);
  } catch (err) {
    console.error("❌ Error leaving scenario:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while leaving scenario.",
    });
  }
};


function summariseIntradayForAI(intradayData) {
  if (!intradayData || typeof intradayData !== "object") return [];

  return Object.entries(intradayData)
    .map(([symbol, candles]) => {
      if (!Array.isArray(candles) || candles.length < 2) return null;

      const prices = candles
        .map(c => Number(c.close ?? c.c))
        .filter(n => !isNaN(n));

      if (prices.length < 2) return null;

      const high = Math.max(...prices);
      const low = Math.min(...prices);
      const last = prices[prices.length - 1];
      const rangePct = (high - low) / low;

      return {
        symbol,
        lastPrice: Number(last.toFixed(2)),
        high: Number(high.toFixed(2)),
        low: Number(low.toFixed(2)),
        rangePct: Number(rangePct.toFixed(4)),
        volatilityBucket:
          rangePct > 0.15 ? "very_high" :
          rangePct > 0.08 ? "high" :
          rangePct > 0.04 ? "moderate" :
          "low"
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.rangePct - a.rangePct);
}
