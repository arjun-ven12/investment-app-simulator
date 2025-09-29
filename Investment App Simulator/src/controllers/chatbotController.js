const chatbotModel = require("../models/chatbot");
const prisma = require('../../prisma/prismaClient');
//////////////////////////////////////////////////////
// GENERATE AI RESPONSE
//////////////////////////////////////////////////////

module.exports.generateResponse = async (req, res) => {
  const { prompt, model = "gpt-3.5", max_tokens = 4000, userId } = req.body;

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
        const portfolio = await chatbotModel.getUserPortfolio(userId);


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
    const wallet = portfolio.wallet;
   console.log("Portfolio object:", portfolio);
console.log("Wallet value:", portfolio.wallet);
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
            industry: true,
            country: true,
            currency: true,
            exchange: true,
            marketCapitalization: true,
            website: true,
            logo: true
          }
        }
      }
    });

    return {
      symbol: stock?.symbol || "UNKNOWN",
      companyName: stock?.company?.name || "UNKNOWN",
      industry: stock?.company?.industry || "UNKNOWN",
      country: stock?.company?.country || "UNKNOWN",
      currency: stock?.company?.currency || "USD",
      exchange: stock?.company?.exchange || "UNKNOWN",
      marketCap: stock?.company?.marketCapitalization || 0,
      website: stock?.company?.website || "",
      logo: stock?.company?.logo || "",
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
    console.log(wallet)

    // 4️⃣ Construct LLM prompt
    const prompt = `
SYSTEM:
You are a friendly, mentor-style financial coach for paper traders. 
Tone: constructive, encouraging, mentor-like. Avoid alarmist words. Warn about risks but highlight positives and opportunities. 
Do NOT give legal or tax advice. Always include: "This advice is for educational purposes only and is not financial advice."
RULE: Recommend only individual stocks that exist in the portfolio or are commonly traded US stocks (no ETFs, crypto, or bonds).

CONTEXT:
You have access to the following data for the user:

1️⃣ Portfolio summary (top holdings, sector allocation, current value, weight percentages):
${JSON.stringify(summary)}

2️⃣ Precomputed metrics including:
- Risk score (0-100)
- Scenario simulations (portfolio-level and individual stock-level changes)
- Suggested stop-loss & limit-buy prices
- Volatility, beta, Sharpe ratio, probability of drawdowns
${JSON.stringify(precomputed)}

3️⃣ Last 5 trades (symbol, quantity, USD impact, trade type, trade date):
${JSON.stringify(recentTrades)}

User risk profile: ${riskProfile}
️⃣ User wallet (cash available to invest): $${wallet}
TASK:
Provide a detailed, **personalized portfolio critique** and actionable advice based on the user’s holdings, wallet (how much money they can invest), precomputed metrics, and recent trades. Tie recommendations to recent trades (e.g., how AAPL purchase affects tech exposure) and portfolio history.
 - Strengths
   - Weaknesses (concentration, ROE, sector allocation, cash level)
   - Scenario analysis (positive/neutral/negative outcomes in a table format)
Use the GOALS and RULES below to guide your response.
- Provide 3 specific stock recommendations for diversification. 
- Each recommendation must include: sector, rationale, expected risk/return, and fit with the user’s risk profile. 
- Do not recommend ETFs, bonds, or crypto.
- **Important**: For recommended stocks, do NOT include exact stock prices. Use approximate shares or percentages instead, e.g., "~10 shares at current market price" or "invest 5% of portfolio".
- Existing holdings, scenario analysis, and stop-loss/limit-buy guidance can remain exact numbers.
- Provide stop-loss / limit-buy guidance for recommended stocks as a % buffer (e.g., 5-10% below/above current price).
- Show numeric-backed reallocation recommendations (USD totals, % portfolio allocation).
- Highlight concentration risks (>40%), sector diversification, and cash allocation.


GOALS:
- Critique strengths and weaknesses using exact weights, USD values, and risk metrics.
- Provide **balanced scenario analysis**: show potential upside, downside, and neutral outcomes.
- Include **numeric-backed, actionable recommendations**:
    * Suggest reallocation by sector and by exact USD/percentage.
    * Highlight over-concentrated holdings (>40%).
    * Include stop-loss/limit-buy prices with rationale and USD impact.
    
- For each recommended stock, provide:
    * Short-term vs long-term suggested action
    * Expected return
    * Risk score (0-100)
    * Fit with user risk profile
- Make diversification actionable: which sectors to increase/decrease, effect on portfolio stability, expected return.
- Include behavioral finance notes (e.g., concentration risk, emotional biases).
- For each recommended stock, explain why it fits current market conditions or macro trends (e.g., oil prices, consumer spending, interest rates, global demand) in a concise 1-2 sentence rationale.
- Include both sector rationale and macro trend narrative for recommended stocks.
- Example format: "XOM: Energy sector exposure; benefits from rising oil prices and global demand.
- Show cash allocation concretely: how much remains after reallocations.
- Maintain short, clear, mentor-style sentences.


  
- Give actionable tips:
    * Stop-loss / limit-buy prices with rationale and USD impact
    * Rebalancing suggestions with expected effect on return & volatility
    * Sector diversification recommendations
    * Cash allocation advice for diversification
  

RULES:
- Reference recent trades explicitly and their effect on concentration or risk.
- Only recommend traded US stocks (no ETFs, crypto, or bonds).
- Provide multiple actionable recommendations with numeric justification.
- Do NOT invent exact numbers; only use values derivable from portfolio summary, trade history, and precomputed metrics.
- Prefer cross-sector diversification (e.g., if Pharma is heavy, consider Energy, Industrials, Financials, Consumer Discretionary).
- Use "~X shares at current market price" for stock recommendations.
- STRICT RULE: Do NOT recommend any stock in a sector that already represents more than 40% of the portfolio (e.g., Pharmaceuticals, Technology). Only pick stocks from underrepresented sectors: Energy, Industrials, Financials, Consumer Discretionary, or Utilities. Ensure the sector allocation improves diversification.
- Add in a disclaimer that this is only for educational purposes and not financial advice.
END
`;


    // 5️⃣ Call LLM
    const advice = await chatbotModel.generateResponse(prompt, "gpt-4o-mini", 1500);

    return res.status(200).json({ advice, portfolio: summary, recentTrades, riskProfile });
  } catch (error) {
    console.error("Controller.getPortfolioAdvice error:", error);
    return res.status(500).json({ error: error.message || "Failed to generate portfolio advice." });
  }
};
