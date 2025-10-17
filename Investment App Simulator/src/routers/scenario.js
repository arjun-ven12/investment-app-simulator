const express = require('express');
const router = express.Router();
const scenarioController = require('../controllers/scenarioController');
const jwtMiddleware = require('../middlewares/jwtMiddleware');

// -------------------- Admin Routes --------------------
// Create a scenario
router.post('/', jwtMiddleware.verifyToken, scenarioController.createScenarioController);
// Update a scenario
router.put('/:id', jwtMiddleware.verifyToken, scenarioController.updateScenarioController);
// Delete a scenario
router.delete('/:id', jwtMiddleware.verifyToken, scenarioController.deleteScenarioController);
router.get('/joined', jwtMiddleware.verifyToken, scenarioController.getJoinedScenariosController);

// -------------------- User Routes --------------------
// Get all scenarios
router.get('/all', jwtMiddleware.verifyToken, scenarioController.getAllScenariosController);
// Get Stock Data
router.get("/:id/stocks/:symbol/data", scenarioController.getScenarioStockData);
// Get scenario by ID
router.get('/:id', jwtMiddleware.verifyToken, scenarioController.getScenarioByIdController);
// Join a scenario
router.post('/:id/join', jwtMiddleware.verifyToken, scenarioController.joinScenarioController);
// Get leaderboard for a scenario
router.get('/:id/leaderboard', jwtMiddleware.verifyToken, scenarioController.getLeaderboardController);
router.get('/:scenarioId/intraday/:symbol', jwtMiddleware.verifyToken, scenarioController.getScenarioIntradayController);
router.get('/getDetails/:scenarioId', jwtMiddleware.verifyToken, scenarioController.getScenarioDetailsController)

// Replay routes
router.get('/:scenarioId/stocks/:symbol/replay', jwtMiddleware.verifyToken, scenarioController.getReplayDataController);
router.get('/:scenarioId/stocks/:symbol/replay/progress/:userId', jwtMiddleware.verifyToken, scenarioController.getReplayProgressController);
router.post('/:scenarioId/stocks/:symbol/replay/save', jwtMiddleware.verifyToken, scenarioController.saveReplayProgressController);


// Submit market order
router.post('/:scenarioId/market-order', jwtMiddleware.verifyToken, scenarioController.submitMarketOrder);
// Limit orders
router.post('/:scenarioId/limit-orders', jwtMiddleware.verifyToken, scenarioController.createLimitOrderController);
// Process limit orders (admin / cron job)
router.post('/limit/process', jwtMiddleware.verifyToken, scenarioController.processLimitOrdersController);
// Get User Wallet
router.get("/:scenarioId/wallet", jwtMiddleware.verifyToken, scenarioController.getWalletController);


router.get("/:scenarioId/orders", jwtMiddleware.verifyToken, scenarioController.getOrderHistoryController);
// router.get("/:scenarioId/portfolio", jwtMiddleware.verifyToken, scenarioController.getPortfolioController);

// Replay routes
router.get('/:scenarioId/stocks/:symbol/replay/progress',jwtMiddleware.verifyToken, scenarioController.getReplayProgressController);

// Save progress
router.post('/:scenarioId/save-progress', jwtMiddleware.verifyToken, scenarioController.saveReplayProgressController);

// Get progress for a symbol
router.get('/:scenarioId/replay-progress', jwtMiddleware.verifyToken, scenarioController.getReplayProgressController);

// Load progress (optional symbol query)
router.get('/:scenarioId/load-progress', jwtMiddleware.verifyToken, scenarioController.loadProgressController);



router.get("/portfolio/:scenarioId",jwtMiddleware.verifyToken, scenarioController.getUserScenarioPortfolio);
router.get('/:scenarioId/user-data', jwtMiddleware.verifyToken, scenarioController.getUserScenarioData);
router.post("/end/:scenarioId",  jwtMiddleware.verifyToken, scenarioController.endScenarioController);

router.post('/:scenarioId/end-summary', jwtMiddleware.verifyToken, scenarioController.getScenarioEndingSummary);

// personal bests
router.get('/:scenarioId/personal-best', jwtMiddleware.verifyToken, scenarioController.getPersonalBest);
router.get('/me/personal-bests',       jwtMiddleware.verifyToken, scenarioController.listPersonalBests);

// attempts
router.post('/:scenarioId/attempts/start',  jwtMiddleware.verifyToken, scenarioController.startAttempt);
router.post('/:scenarioId/attempts/finish', jwtMiddleware.verifyToken, scenarioController.finishAttempt);
router.get('/:scenarioId/attempts', jwtMiddleware.verifyToken, scenarioController.listAttempts);
router.post( "/:scenarioId/attempts/ai-insights",jwtMiddleware.verifyToken,scenarioController.saveAIInsights);
router.get( "/:scenarioId/getChartData",jwtMiddleware.verifyToken,scenarioController.scenarioEndingDetailsCharts);
router.get("/:scenarioId/ai-insights-latest",jwtMiddleware.verifyToken, scenarioController.getLatestAIAdviceController);

module.exports = router;
