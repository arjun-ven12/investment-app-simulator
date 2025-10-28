const express = require("express");
const router = express.Router();
const openAIController = require("../controllers/chatbotController");
const portfolioController = require("../controllers/chartsController")
const jwtMiddleware = require("../middlewares/jwtMiddleware");
router.post("/generate", openAIController.generateResponse);
router.post("/generateForAI", openAIController.generateResponseForChatbot);
// portfolio advice (dedicated)
router.get("/portfolio-advice/:userId", openAIController.getPortfolioAdvice);
router.get("/options/advice", jwtMiddleware.verifyToken, openAIController.getUserOptionAdvice);
router.get("/:scenarioId/scenario-analysis", jwtMiddleware.verifyToken, openAIController.getScenarioAnalysis);
router.get("/:scenarioId/scenario-analysis-summarised", jwtMiddleware.verifyToken, openAIController.getScenarioAnalysisSummarised);

router.post("/start", jwtMiddleware.verifyToken, openAIController.startChatSession);
router.post("/send", jwtMiddleware.verifyToken, openAIController.sendChatMessage);
router.get("/history", jwtMiddleware.verifyToken, openAIController.getChatHistory);
// End a chat session
router.post("/end", jwtMiddleware.verifyToken, openAIController.endChatSession);
module.exports = router;