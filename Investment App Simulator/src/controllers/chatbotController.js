const chatbotModel = require("../models/chatbot");
const scenarioModel = require("../models/scenario");
const scenarioController = require("./scenarioController");
const prisma = require("../../prisma/prismaClient");
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
      fullPrompt += `\n\nUser portfolio summary (auto-generated):\n${JSON.stringify(
        summary,
        null,
        2
      )}\n\nUse this information to adapt your answer if relevant.`;
    }

    const aiText = await chatbotModel.generateResponse(
      fullPrompt,
      model,
      max_tokens
    );
    console.log("AI Response:", aiText);
    return res.status(200).json({ response: aiText });
  } catch (error) {
    console.error("Controller.generateResponse error:", error);
    return res
      .status(500)
      .json({ error: error.message || "Failed to generate response." });
  }
};

module.exports.generateResponseForChatbot = async (req, res) => {
  const { prompt, model = "gpt-4", max_tokens = 4000 } = req.body;

  if (!prompt) return res.status(400).json({ error: "Prompt is required." });

  try {
    const aiText = await chatbotModel.generateResponseForChatbot(
      prompt,
      model,
      max_tokens
    );
    console.log("AI Response:", aiText);
    return res.status(200).json({ response: aiText });
  } catch (error) {
    console.error("Controller.generateResponse error:", error);
    return res
      .status(500)
      .json({ error: error.message || "Failed to generate response." });
  }
};

module.exports.getUserPortfolio = async function (req, res) {
  const userId = Number(req.params.userId);

  if (!Number.isInteger(userId)) {
    return res.status(400).json({ error: "Invalid user ID." });
  }

  try {
    const portfolio = await chatbotModel.getUserPortfolio(userId);

    return res.status(200).json(portfolio);
  } catch (error) {
    console.error("Error fetching user portfolio:", error);

    if (error.message?.includes("not found")) {
      return res.status(404).json({ error: error.message });
    }

    return res.status(500).json({ error: error.message || "Server error" });
  }
};

/**
 * GET /api/chatbot/portfolio-advice/:userId
 * Dedicated portfolio-advice endpoint. Fetches portfolio, builds an advisor prompt, calls model and returns advice.
 */
module.exports.getPortfolioAdvice = async (req, res) => {
  const userId = Number(req.params.userId);
  if (!Number.isInteger(userId))
    return res.status(400).json({ error: "Invalid user ID." });

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
      select: {
        stockId: true,
        quantity: true,
        totalAmount: true,
        tradeType: true,
        tradeDate: true,
      },
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
                logo: true,
              },
            },
          },
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
          tradeDate: t.tradeDate,
        };
      })
    );

    const scenarioAnalysis = chatbotModel.buildScenarios(summary, [-10, -5, 5]);
    // 3️⃣ Precomputed metrics for advice
    const precomputed = chatbotModel.buildPrecomputed(summary);
    console.log(wallet);

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
    const advice = await chatbotModel.generateResponse(
      prompt,
      "gpt-4o-mini",
      1500
    );

    return res
      .status(200)
      .json({ advice, portfolio: summary, recentTrades, riskProfile });
  } catch (error) {
    console.error("Controller.getPortfolioAdvice error:", error);
    return res
      .status(500)
      .json({ error: error.message || "Failed to generate portfolio advice." });
  }
};

module.exports.getScenarioAnalysis = async (req, res) => {
  try {
    const scenarioId = Number(req.params.scenarioId);
    if (!scenarioId)
      return res.status(400).json({ error: "Scenario ID required" });

    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    // 🔹 Get scenario summary data from your existing logic
    const mockReq = { params: { scenarioId }, user: { id: userId } };
    const mockRes = {
      status: () => ({
        json: (data) => data,
      }),
    };
    const summaryData = await scenarioController.getScenarioEndingSummary(mockReq,null,true);

    // Then extract intraday separately
    const intradayData = summaryData.intraday;
    const scenarioDetails = await scenarioModel.getScenarioById(scenarioId);
    // If your controller returns through res.status().json(), extract the data
    const scenarioSummary = summaryData?.data || summaryData;
    const portfolio = await scenarioController.getUserScenarioPortfolio(
      mockReq,
      mockRes
    );
    const wallet = await scenarioModel.getParticipantWallet;
    // 🧠 Prepare prompt for AI
    const prompt = `
SYSTEM:
You are a friendly, mentor-style **financial coach** for paper traders participating in high-volatility scenario simulations.  
You analyze their portfolio performance, trading behavior, and risk exposure, providing **constructive, data-driven insights** to help them improve their strategy.  

### 🎯 TONE & STYLE
- Warm, encouraging, and mentor-like — never robotic or judgmental, and easy to understand..  
- Focus on *growth, learning, and practical improvement*.  
- Warn about risks calmly and factually.  
- Short sentences, easy to read.  
- Focus on growth and practical steps.  
- Always end with the line:  
  **"This advice is for educational purposes only and does not constitute financial advice."**

---

### 🧩 CONTEXT DATA AVAILABLE
You have access to:

1️⃣ **Scenario Information**  
- Title, description, market context, and duration.  
- Simulated intraday prices for all stocks.  
- Scenario-specific events, shocks, and volatility highlights.

2️⃣ **User Portfolio Data**  
- Executed trades, net positions, realized/unrealized P&L, average buy price, and cash balance.

3️⃣ **Scenario Wallet / Replay Progress**  
- Latest available price for each stock according to scenario replay.  
- Intraday high/low prices for each stock.  
- Use this data to dynamically compute cash buffer, position sizing, stop-loss, and limit-buy levels.

---

### 🧭 YOUR TASK
Provide a **detailed, personalized scenario-based critique** and **portfolio improvement plan**, **fully based on scenario prices and volatility**. Follow these rules:

1. **Compute volatility** for each stock using intraday price swings (e.g., standard deviation or high-low range).  
2. **Select the 3–5 highest-volatility U.S. stocks** for potential trading opportunities.  
3. **Compute unrealized P&L and realized P&L** using scenario intraday prices and the user’s executed trades.  
4. **Set stop-loss and limit-buy levels dynamically** using intraday price ranges (e.g., 5–10% below/above recent lows/highs).  
5. **Determine cash buffer and position sizing** based on available cash in the wallet and current portfolio value.  
6. Include **reflection guidance** on what the user could do if they tried this scenario again, and discuss the **risk exposure level they traded at** with suggestions on safe hypothetical risk experimentation.

---

### 🧭 STRUCTURE OUTPUT
1. **Scenario Overview**  
- Describe market type (high volatility, macro shocks, etc.) and relevant scenario events.  

2. **Portfolio Performance Review**  
- Analyze **realized/unrealized P&L**, cash usage, and exposure relative to intraday scenario prices.  
- Highlight strengths (disciplined entries, cash buffer usage) and weaknesses (missed high-volatility trades, overconcentration).

3. **Quantitative & Behavioral Insights**  
- Include computed volatility per stock, risk exposure, and potential emotional biases triggered by rapid swings.  
- Relate metrics to user behavior during the scenario.

4. **High-Volatility Stock Recommendations**  
- Rank **3–5 stocks by volatility** based on scenario intraday data.  
- For each, include:  
  - Rationale based on volatility  
  - Short-term vs long-term expected movement  
  - Risk score (0–100)  
  - Suggested position size **based on wallet and portfolio**  
  - Market Order & Limit Order guidance **computed from intraday data**  
  - Notes on scenario events driving volatility

5. **Reallocation & Cash Strategy**  
- Suggest portfolio adjustments using scenario prices, P&L, and volatility metrics.  
- Include approximate USD and % allocations relative to wallet and portfolio.  
- Recommend cash buffer dynamically based on available scenario wallet funds.

6. **Behavioral Finance Notes**  
- Discuss likely biases in high-volatility trading and reinforce good habits (measured sizing, patience, learning from scenario patterns).

7. **Scenario Reflection & Risk Guidance**  
- Discuss the **user’s risk exposure level during the scenario** (max positions, % of portfolio in high-volatility stocks).  
- Include **hypothetical “if you tried again” guidance**: suggest controlled experimentation with higher or lower risk, and lessons learned from observing volatility.  
- Encourage reviewing P&L, emotional responses, and position sizing to refine strategy in future scenario replays.

8. **Educational Wrap-Up**  
- Summarize key lessons and highlight learning points from trading high-volatility stocks.  
> **This advice is for educational purposes only and does not constitute financial advice.**

---

### ⚙️ RULES & CONSTRAINTS
1. Base all analysis strictly on **scenario intraday data, wallet, and user trades**.  
2. Recommend **only U.S. stocks with the highest volatility for learning purposes**.  
3. Do **not exceed realistic position sizing** relative to portfolio and available wallet cash.  
4. Stop-loss and limit-buy guidance must be **computed from intraday price ranges**, not arbitrary numbers.  
5. Maintain a mentor-style, educational, and conversational tone throughout.
6. Add in $ for all prices. 
7. Dont recommend other Trading types (Only Market order and Limit order)
---

### 🧩 INPUT DATA
Scenario Details:
${JSON.stringify(scenarioDetails, null, 2)}

Scenario Summary:
${JSON.stringify(scenarioSummary, null, 2)}

Scenario Wallet:
${JSON.stringify(wallet, null, 2)}

Portfolio:
${JSON.stringify(portfolio, null, 2)}

Intraday Data:
${JSON.stringify(intradayData, null, 2)}

`;

    const aiAdvice = await chatbotModel.generateResponse(
      prompt,
      "gpt-4o-mini",
      1500
    );

    return res.status(200).json({ aiAdvice, portfolio, intradayData });
  } catch (err) {
    console.error("Chatbot Analysis Error:", err);
    return res.status(500).json({ error: err.message });
  }
};

module.exports.getScenarioAnalysisSummarised = async (req, res) => {
  try {
    const scenarioId = Number(req.params.scenarioId);
    if (!scenarioId)
      return res.status(400).json({ error: "Scenario ID required" });

    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    // 🔹 Get scenario summary data from your existing logic
    const mockReq = { params: { scenarioId }, user: { id: userId } };
    const mockRes = {
      status: () => ({
        json: (data) => data,
      }),
    };
    const summaryData = await scenarioController.getScenarioEndingSummary(
      mockReq,
      mockRes
    );
    const scenarioDetails = await scenarioModel.getScenarioById(scenarioId);
    // If your controller returns through res.status().json(), extract the data
    const scenarioSummary = summaryData?.data || summaryData;
    const portfolio = await scenarioController.getUserScenarioPortfolio(
      mockReq,
      mockRes
    );
    const wallet = await scenarioModel.getParticipantWallet;

    const prompt = `
SYSTEM:
You are a friendly, mentor-style **financial coach** for paper traders in simulations.  

The scenario has ended. Generate a **short, clear, and actionable popup summary**. Focus on:  
1️⃣ What happened in the market.  
2️⃣ How the user's portfolio performed.  
3️⃣ A short suggestion for the next simulation.  
4. Only recommend suggestions about market orders and limit orders (Other types of orders are not available)

**Important:** If the scenario is high-volatility, emphasize risk management (cash buffer, smaller positions, diversification).  
If the scenario is normal volatility, emphasize general trade improvement (taking profits, holding positions, experimenting).  

Always end with:  
"This advice is for educational purposes only and does not constitute financial advice."

---

### CONTEXT AVAILABLE
- Scenario title, key events, market volatility (e.g., high, normal).  
- User portfolio: positions, trades, realized/unrealized P&L, cash balance.

---

### OUTPUT FORMAT
Provide in **JSON**:

{
  "title": "Scenario Complete: [Scenario Title]",
  "recap": "[2-3 sentence market summary]",
  "portfolioHighlights": {
    "topGainers": ["..."],
    "topLosers": ["..."],
    "totalUnrealizedPL": "...",
    "cashRemaining": "..."
  },
  "nextTimeTry": [
    "[1-3 short, actionable tips for next scenario]"
  ],
  "disclaimer": "This advice is for educational purposes only and does not constitute financial advice."
}

---

### RULES
- Keep it **short and sweet**; max 100 words.  
- Focus on **actionable guidance**.  
- Tailor nextTimeTry based on volatility. 
- Add in $ for all prices. 

### INPUT DATA
Scenario Details:
${JSON.stringify(scenarioDetails, null, 2)}

Scenario Summary:
${JSON.stringify(scenarioSummary, null, 2)}

Scenario Wallet:
${JSON.stringify(wallet, null, 2)}

Portfolio:
${JSON.stringify(portfolio, null, 2)}

`;

    const aiAdvice = await chatbotModel.generateResponse(
      prompt,
      "gpt-4o-mini",
      1500
    );

    return res.status(200).json({ aiAdvice, portfolio });
  } catch (err) {
    console.error("Chatbot Analysis Error:", err);
    return res.status(500).json({ error: err.message });
  }
};
