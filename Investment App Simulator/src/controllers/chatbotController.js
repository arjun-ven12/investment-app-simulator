const chatbotModel = require("../models/chatbot");
const prisma = require('../../prisma/prismaClient');
//////////////////////////////////////////////////////
// GENERATE AI RESPONSE
//////////////////////////////////////////////////////

module.exports.generateResponse = async (req, res) => {
  const { prompt, model = "gpt-4o-mini", max_tokens = 200, userId } = req.body;

  if (!prompt) return res.status(400).json({ error: "Prompt is required." });

  try {
    let fullPrompt = prompt;

    if (userId) {
      const portfolio = await chatbotModel.getUserPortfolio(Number(userId));
      const summary = chatbotModel.buildPortfolioSummary(portfolio);
      fullPrompt += `\n\nUser portfolio summary (auto-generated):\n${JSON.stringify(summary, null, 2)}\n\nUse this information to adapt your answer if relevant.`;
    }
    

    const aiText = await chatbotModel.generateResponse(fullPrompt, model, max_tokens);
    console.log("AI Response:", aiText);
    return res.status(200).json({ response: aiText });
  } catch (error) {
    console.error("Controller.generateResponse error:", error);
    return res.status(500).json({ error: error.message || "Failed to generate response." });
  }
};



module.exports.getUserPortfolio = async function (req, res) {
    const userId = Number(req.params.userId);

    if (!Number.isInteger(userId)) {
        return res.status(400).json({ error: 'Invalid user ID.' });
    }

    try {
        const portfolio = await chatModel.getUserPortfolio(userId);


        return res.status(200).json(portfolio);
    } catch (error) {
        console.error('Error fetching user portfolio:', error);

        if (error.message?.includes('not found')) {
            return res.status(404).json({ error: error.message });
        }

        return res.status(500).json({ error: error.message || 'Server error' });
    }
};



/**
 * GET /api/chatbot/portfolio-advice/:userId
 * Dedicated portfolio-advice endpoint. Fetches portfolio, builds an advisor prompt, calls model and returns advice.
 */
module.exports.getPortfolioAdvice = async (req, res) => {
  const userId = Number(req.params.userId);
  if (!Number.isInteger(userId)) return res.status(400).json({ error: "Invalid user ID." });

  // Accept user preferences (riskProfile: 'conservative'|'moderate'|'aggressive')
  const { riskProfile } = req.query;

  try {
    // 1️⃣ Fetch portfolio & summary
    const portfolio = await chatbotModel.getUserPortfolio(userId);
    const summary = chatbotModel.buildPortfolioSummary(portfolio);

    // 2️⃣ Fetch last 5 trades with enriched stock info
    const recentTradesRaw = await prisma.trade.findMany({
      where: { userId },
      orderBy: { tradeDate: "desc" },
      take: 5,
      select: { stockId: true, quantity: true, totalAmount: true, tradeType: true, tradeDate: true }
    });

    const recentTrades = await Promise.all(
      recentTradesRaw.map(async (t) => {
        const stock = await prisma.stock.findUnique({
          where: { stock_id: t.stockId },
          select: {
            symbol: true,
            company: {
              select: {
                name: true,
                industry: true // get industry from Company table
              }
            }
          }
        });

        return {
          symbol: stock?.symbol || "UNKNOWN",
          companyName: stock?.company?.Name || "UNKNOWN",
          industry: stock?.company?.Industry || "UNKNOWN", // replaced sector
          quantity: t.quantity,
          totalAmount: t.totalAmount,
          tradeType: t.tradeType,
          tradeDate: t.tradeDate
        };
      })
    );
const scenarioAnalysis = chatbotModel.buildScenarios(summary, [-10, -5, 5]);
    // 3️⃣ Precomputed metrics for advice
    const precomputed = chatbotModel.buildPrecomputed(summary);

    // 4️⃣ Construct LLM prompt
    const prompt = `
SYSTEM:
You are a friendly, mentor-style financial coach for paper traders. 
Tone: constructive, encouraging, mentor-like. 
Avoid alarmist words. Warn about risks but highlight positives and opportunities. 
Do NOT give legal or tax advice. Always include: "This advice is for educational purposes only and is not financial advice."
RULE: Recommend only individual stocks that exist in the portfolio or are commonly traded US stocks (no ETFs, crypto, or bonds).

CONTEXT:
You have access to:
1) Portfolio summary (top holdings, sector allocation, current value, weight percentages)
2) Precomputed metrics including:
   - Risk score (0-100)
   - Scenario simulations (multi-stock correlated moves)
   - Suggested stop-loss & limit-buy prices
   - Volatility, beta, Sharpe ratio, probability of drawdowns
3) Last 5 trades (symbol, quantity, USD impact, trade type, trade date)
User risk profile: ${riskProfile}
Portfolio summary: ${JSON.stringify(summary, null, 2)}
Scenario analysis: ${JSON.stringify(scenarioAnalysis, null, 2)}
Precomputed metrics: ${JSON.stringify(precomputed, null, 2)}

TASK:
Provide a detailed portfolio critique and actionable advice based on the data provided. 
Use the GOALS and RULES below to guide your response.

GOALS:
- Critique the portfolio accurately but mentor-style; recognize strengths.
- Personalize using exact percentages, USD impact, risk metrics (Sharpe, beta, volatility).
- Provide **scenario analysis**:
    * Portfolio-level impact of multi-stock or sector moves
    * Expected return vs worst-case drawdown
    * Probabilistic drawdowns (% chance of X% loss)
- Give **actionable tips**:
    * Stop-loss / limit-buy prices with rationale and USD impact
    * Rebalancing suggestions with expected effect on return & volatility
    * Sector diversification recommendations
    * Cash allocation advice for diversification
- Include **behavioral finance notes** and optional tax/fees notes where relevant.
- Format JSON strictly according to the existing schema.

RULES:
- Mention recent trades and their effect on concentration or risk.
- Highlight holdings >40% and their USD exposure.
- Keep sentences short, mentor-style, and educational.
- Provide multiple actionable recommendations with numeric justification.
- Balance warnings with positive reinforcement.
RULE: Recommend only individual stocks that exist in the portfolio or are commonly traded US stocks (no ETFs, crypto, or bonds).


DATA:
--- RISK PROFILE ---
${riskProfile.toUpperCase()}
--- PORTFOLIO SUMMARY ---
${JSON.stringify(summary, null, 2)}

--- RECENT TRADES ---
${JSON.stringify(recentTrades, null, 2)}

--- PRECOMPUTED METRICS ---
${JSON.stringify(precomputed, null, 2)}
END
`;

    // 5️⃣ Call LLM
    const advice = await chatbotModel.generateResponse(prompt, "gpt-4o-mini", 600);

    return res.status(200).json({ advice, portfolio: summary, recentTrades, riskProfile });
  } catch (error) {
    console.error("Controller.getPortfolioAdvice error:", error);
    return res.status(500).json({ error: error.message || "Failed to generate portfolio advice." });
  }
};
