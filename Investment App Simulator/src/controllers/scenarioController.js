const scenarioModel = require('../models/scenario');
const chartsModel = require('../models/Charts');
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

    const chartData = await chartsModel.getIntradayData(symbol, from, to);

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

module.exports.saveReplayProgressController = async (req, res) => {
  try {
    const { scenarioId, symbol } = req.params;
    const { userId, lastIndex, speed } = req.body;
    await scenarioModel.saveReplayProgress(Number(userId), Number(scenarioId), symbol, lastIndex, speed);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};


module.exports.submitMarketOrder = async (req, res) => {
  try {
    const scenarioId = parseInt(req.params.scenarioId);
    const userId = req.user.id;
    const { side, symbol, quantity, price } = req.body;

    if (!side || !symbol || !quantity || !price) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const trade = await scenarioModel.executeMarketOrder(scenarioId, userId, {
      side,
      symbol,
      quantity,
      price,
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
    const { side, symbol, quantity, limitPrice, price } = req.body;

    // Pass scenarioId and userId correctly
    const order = await scenarioModel.createLimitOrder(
      Number(scenarioId),
      Number(userId), // make sure it's a number
      { side, symbol, quantity, limitPrice, price }
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
    const { symbol, currentPrice } = req.body;
    const executedOrders = await scenarioModel.processLimitOrders(symbol, currentPrice);
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

// module.exports.getScenarioPortfolioController = async (req, res) => {
//   try {
//     const scenarioId = Number(req.params.scenarioId);
//     const userId = req.user.id; // From JWT middleware

//     if (!Number.isInteger(scenarioId)) {
//       return res.status(400).json({ error: "Invalid scenario ID" });
//     }

//     // Let model resolve participantId
//     const participantId = await scenarioModel.getParticipantId(scenarioId, userId);

//     const portfolio = await scenarioModel.getScenarioPortfolio(participantId);
//     return res.status(200).json(portfolio);

//   } catch (error) {
//     console.error("Error fetching scenario portfolio:", error);
//     return res.status(500).json({ error: error.message || "Server error" });
//   }
// };


module.exports.getPortfolioController = async (req, res) => {
  const { scenarioId } = req.params;
  const userId = req.user.id;

  try {
    const portfolio = await scenarioModel.getScenarioPortfolio(scenarioId, userId);
    res.json({ success: true, portfolio });
  } catch (err) {
    console.error(err);
    res.status(400).json({ success: false, message: err.message });
  }
};

