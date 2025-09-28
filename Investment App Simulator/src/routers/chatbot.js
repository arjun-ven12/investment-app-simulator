const express = require("express");
const router = express.Router();
const openAIController = require("../controllers/chatbotController");
const portfolioController = require("../controllers/chartsController")

router.post("/generate", openAIController.generateResponse);

// portfolio advice (dedicated)
router.get("/portfolio-advice/:userId", openAIController.getPortfolioAdvice);

module.exports = router;