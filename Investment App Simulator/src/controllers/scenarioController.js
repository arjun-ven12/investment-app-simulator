const scenarioModel = require('../models/scenario');
const chartsModel = require('../models/Charts');
const { broadcastPortfolioUpdate } = require('../socketBroadcast');
// --- CRUD Controllers ---
module.exports.createScenarioController = async (req, res) => {
  try {
    const scenario = await scenarioModel.createScenario(req.body);
    return res.status(201).json({ success: true, scenario });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
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
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
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
    res.json({ success: true, scenario });
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

module.exports.getScenarioEndingSummary = async (req, res) => {
  try {
    const scenarioId = Number(req.params.scenarioId);
    if (!scenarioId) return res.status(400).json({ error: "Scenario ID required" });

    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    // 1️⃣ Mark participant ended
    await scenarioModel.markScenarioEnded(userId, scenarioId);

    // 2️⃣ Fetch portfolio & wallet
    const portfolio = await scenarioModel.getUserScenarioPortfolio(userId, scenarioId);
    const wallet = await scenarioModel.getParticipantWallet(userId, scenarioId);

    // 3️⃣ Flatten trades from portfolio positions
    const trades = portfolio.positions.map(p => ({
      symbol: p.symbol,
      netQty: Number(p.quantity),
      totalBought: Number(p.totalInvested),
      realizedPnL: Number(p.realizedPnL),
      currentValue: Number(p.currentValue),
      unrealizedPnL: Number(p.unrealizedPnL),
      avgBuyPrice: Number(p.avgBuyPrice),
      currentPrice: Number(p.currentPrice),
    }));

    // 4️⃣ Extract symbols and intraday data
    const symbols = trades.map(t => t.symbol);
    const intradayData = await scenarioModel.fetchUserScenarioData(scenarioId, userId);

    // 5️⃣ Compute total portfolio value
    const totalPortfolioValue = trades.reduce(
      (acc, t) => acc + t.currentValue + t.realizedPnL,
      wallet
    );

    return res.status(200).json({
      wallet,
      trades,
      intraday: intradayData,
      totalPortfolioValue,
      summary: portfolio.summary,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
};
