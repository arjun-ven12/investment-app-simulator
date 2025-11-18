const chatbotModel = require("../models/chatbot");
const scenarioModel = require("../models/scenario");
const scenarioController = require("./scenarioController");
const prisma = require("../../prisma/prismaClient");
const optionsModel = require('../models/options');
const optionsController = require('../controllers/optionsController');
const { broadcastChatbotMessage } = require("../socketBroadcast");
function getToneProfile(tone) {
  switch (tone) {
    case "friendly":
      return "Warm, friendly, supportive, encouraging.";
    case "strict":
      return "Firm, disciplined, direct, focused on rules.";
    case "professional":
      return "Formal, objective, concise, structured.";
    case "educational":
      return "Clear, step-by-step, teaching-oriented with explanations.";
    default:
      return "Neutral, balanced, helpful.";
  }
}

//////////////////////////////////////////////////////
// GENERATE AI RESPONSE
//////////////////////////////////////////////////////
async function loadUserAISettings(userId) {
  const settings = await prisma.aISetting.findUnique({
    where: { userId: Number(userId) },
  });

  return settings || {
    riskTolerance: "moderate",
    aiTone: "professional",
  };
}


module.exports.generateResponse = async (req, res) => {
  const { prompt, model = "gpt-3.5", max_tokens = 4000, userId } = req.body;

  if (!prompt) return res.status(400).json({ error: "Prompt is required." });
  let fullPrompt = prompt;
  try {
    if (userId) {
      const settings = await loadUserAISettings(userId);

      fullPrompt =
        `User AI Settings:\n` +
        `- Risk Tolerance: ${settings.riskTolerance}\n` +
        `- Tone: ${settings.aiTone}\n\n` +
        fullPrompt;

      const portfolio = await chatbotModel.getUserPortfolio(Number(userId));
      const summary = chatbotModel.buildPortfolioSummary(portfolio);

      fullPrompt += `\n\nUser portfolio summary:\n${JSON.stringify(summary, null, 2)}`;
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

  const settings = await loadUserAISettings(userId);

  const aiPrefBlock = `
USER PREFERENCES:
- Risk Tolerance: ${settings.riskTolerance}
- Tone: ${settings.aiTone}
`;


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
    const settings = await loadUserAISettings(userId);
    const riskProfile = settings.riskTolerance;
    // 4️⃣ Construct LLM prompt
    const prompt = `
    ${aiPrefBlock}
SYSTEM:
SYSTEM:
You are a financial coach for paper traders.
Tone Style: ${getToneProfile(settings.aiTone)}
Risk Style: ${settings.riskTolerance}
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
- Separate each major section with '---' so that front-end markdown rendering creates clear spacing.
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
    const summaryData = await scenarioController.getScenarioEndingSummary(req, null, true);
    const aiSettings = await loadUserAISettings(userId);
    const prefBlock = `
USER PREFERENCES:
- Risk Tolerance: ${aiSettings.riskTolerance}
- Tone: ${aiSettings.aiTone}
`;
    // Then extract intraday separately
    const intradayData = summaryData.intraday;
    const scenarioDetails = await scenarioModel.getScenarioById(scenarioId);
    // If your controller returns through res.status().json(), extract the data
    const scenarioSummary = summaryData?.data || summaryData;
    const portfolio = await scenarioController.getUserScenarioPortfolio(
      mockReq,
      mockRes
    );
   const wallet = await scenarioModel.getParticipantWallet(userId, scenarioId);
    // 🧠 Prepare prompt for AI
    const prompt = `
    ${prefBlock}
SYSTEM:
You are a financial strategy assistant for fast-paced scenario simulations.
Tone: ${getToneProfile(aiSettings.aiTone)}
Risk Style: ${aiSettings.riskTolerance} 
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

    const aiAdvice = await chatbotModel.generateScenarioAIAdviceDetailed(
      userId,
      scenarioId,
      prompt,
      "gpt-4o-mini",
      1500
    );

    return res.status(200).json({ aiAdvice });
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
    // ⭐ FIX — load settings
    const aiSettings = await loadUserAISettings(userId);
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
You are a **financial coach** for paper traders in simulations. 
Tone: ${getToneProfile(aiSettings.aiTone)}
Risk Style: ${aiSettings.riskTolerance}
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
    await upsertAIAdvice(userId, scenarioId, aiAdvice);
    return res.status(200).json({ aiAdvice, portfolio });
  } catch (err) {
    console.error("Chatbot Analysis Error:", err);
    return res.status(500).json({ error: err.message });
  }
};



module.exports.getUserOptionAdvice = async (req, res) => {
  const userId = req.user?.id;
  if (!userId || isNaN(userId)) {
    return res.status(400).json({ error: "Missing or invalid userId" });
  }

  try {
    // A) Pull raw trades (counts, order types, holding days) + portfolio (authoritative P&L)
    const trades = await optionsModel.getUserOptionTrades(userId);
    if (!trades || trades.length === 0) {
      return res.status(404).json({ message: "No option trades found for this user." });
    }
const aiSettings = await loadUserAISettings(userId);

    const portfolioRes = await optionsModel.getUserOptionPortfolio(parseInt(userId, 10));
    const portfolio = Array.isArray(portfolioRes?.portfolio) ? portfolioRes.portfolio : [];

    // ---------- helpers ----------
    const round2 = (n) => Number(n || 0).toFixed(2);
    const dollar = (n) => `$${round2(n)}`;
    const strip$ = (s) =>
      typeof s === "string" ? s.replace(/[$,]/g, "") : `${s ?? 0}`;
    const toDate = (d) => (d instanceof Date ? d : new Date(d));

    // ---------- totals from portfolio ----------
    const realizedTotal = portfolio.reduce(
      (acc, p) => acc + Number(strip$(p.realizedPnL)),
      0
    );
    const unrealizedTotal = portfolio.reduce(
      (acc, p) => acc + Number(strip$(p.unrealizedPnL)),
      0
    );

    // ---------- symbol-level aggregation ----------
    const symbols = {};
    for (const t of trades) {
      const sym = t.contract?.underlyingSymbol || "UNKNOWN";
      if (!symbols[sym]) symbols[sym] = { trades: 0, totalPnL: "$0.00" };
      symbols[sym].trades += 1;
    }
    for (const p of portfolio) {
      const sym = p.underlyingSymbol || "UNKNOWN";
      const totalPnLNum =
        Number(strip$(p.realizedPnL)) + Number(strip$(p.unrealizedPnL));
      if (!symbols[sym]) symbols[sym] = { trades: 0, totalPnL: dollar(totalPnLNum) };
      else symbols[sym].totalPnL = dollar(totalPnLNum);
    }

    // ---------- order-type and instrument-type counts ----------
    const totalTrades = trades.length;
    const totalCalls = trades.filter(
      (t) => (t.contract?.type || "").toUpperCase() === "CALL"
    ).length;
    const totalPuts = trades.filter(
      (t) => (t.contract?.type || "").toUpperCase() === "PUT"
    ).length;

    const totalMarketOrders = trades.filter(
      (t) => (t.orderType || "").toUpperCase() === "MARKET"
    ).length;
    const totalLimitOrders = trades.filter(
      (t) => (t.orderType || "").toUpperCase() === "LIMIT"
    ).length;

    // ---------- expirations (only 0–7 days used) ----------
    const expirations = { "0–7 days": { trades: 0 } };
    for (const t of trades) {
      const exp = toDate(t.contract?.expirationDate);
      const td = toDate(t.tradeDate);
      const days = Math.max(0, (exp - td) / (1000 * 60 * 60 * 24));
      const bucket = days <= 7 ? "0–7 days" : "0–7 days";
      expirations[bucket].trades += 1;
    }

    // ---------- average holding days ----------
    const avgHoldingDays = round2(
      trades.reduce((acc, t) => {
        const exp = toDate(t.contract?.expirationDate);
        const td = toDate(t.tradeDate);
        const d = Math.max(0, (exp - td) / (1000 * 60 * 60 * 24));
        return acc + d;
      }, 0) / Math.max(1, totalTrades)
    );

    // ---------- best & worst symbols ----------
    const symbolEntries = Object.entries(symbols);
    const bestSymbol = symbolEntries.length
      ? symbolEntries.reduce((best, [sym, data]) => {
        const val = Number(strip$(data.totalPnL));
        const bestVal = best ? Number(strip$(best.data.totalPnL)) : -Infinity;
        return val > bestVal ? { sym, data } : best;
      }, null)
      : null;

    const worstSymbol = symbolEntries.length
      ? symbolEntries.reduce((worst, [sym, data]) => {
        const val = Number(strip$(data.totalPnL));
        const worstVal = worst ? Number(strip$(worst.data.totalPnL)) : Infinity;
        return val < worstVal ? { sym, data } : worst;
      }, null)
      : null;

    // ---------- summary ----------
    const summary = {
      totalTrades,
      totalCalls,
      totalPuts,
      realizedPnL: dollar(realizedTotal),
      unrealizedPnL: dollar(unrealizedTotal),
      avgHoldingDays,
      totalMarketOrders,
      totalLimitOrders,
      symbols,
      expirations,
      bestSymbol: bestSymbol
        ? { symbol: bestSymbol.sym, totalPnL: bestSymbol.data.totalPnL }
        : null,
      worstSymbol: worstSymbol
        ? { symbol: worstSymbol.sym, totalPnL: worstSymbol.data.totalPnL }
        : null,
    };

    // ---------- AI prompt ----------
    const prompt = `
SYSTEM:
You are a quantitative options analyst.
Tone: ${getToneProfile(aiSettings.aiTone)}
Risk Profile: ${aiSettings.riskTolerance}
Write a concise, professional, and actionable assessment for an options trader.
Assume only CALL/PUT instruments and MARKET/LIMIT order types are supported.
Do not discuss changing expirations (user trades 0–7 days). Do not introduce strike-range "quality" commentary beyond the rules below.

RULES:
- Separate each major section with '---' so that front-end markdown rendering creates clear spacing.

USER SUMMARY (JSON):
${JSON.stringify(summary, null, 2)}

REQUIREMENTS:
- Tone: professional, precise, trustworthy (no emojis).
- Use clear headings and short bullet points.
- Always show monetary values with a "$" prefix.
- Base all commentary strictly on provided metrics.
- Focus on concrete next steps (entries, exits, sizing, order-type usage, symbol allocation).

STRUCTURE:

Scorecard
- Performance: _/10
- Risk: _/10
- Timing: _/10
- Consistency: _/10

A. Performance Analysis
- Summarize realized/unrealized P&L and average holding days.
- Identify best and worst symbols by total P&L (use 'bestSymbol' and 'worstSymbol' if present).
- Provide 2–3 specific, data-tied improvements.

B. Trade Execution
- Comment on MARKET vs LIMIT usage and propose a target of 30–40% LIMIT orders.
- Outline 3 execution tactics to improve fills and reduce slippage.

C. Risk Management
- Identify high-risk patterns (e.g., symbol concentration, short holding periods).
- Propose 2–3 controls:
  - Cap position size to ≤5% of total account equity per symbol.
  - Limit per-trade loss to ≤2% of account balance.
  - Stop trading for the day once realized losses exceed 5% of account equity.

D. Market Timing
- Infer timing tendencies from average holding days and 0–7 day trading window.
- Provide 2–3 steps to improve entries/exits without changing expirations.

E. Behavioral Notes
- List 2–3 habits to correct and 1–2 strengths to keep (based on the data).

F. Priority Checklist (Next 7 Trading Days)
- Provide a short, ordered checklist of immediate actions.

G. Option Selection Guidance (Near-the-Money)
- Recommend choosing near-the-money options (strike within ~0–2% of the underlying price) to balance probability and premium.
- Keep examples strictly to the symbols listed in summary.symbols.
- For each symbol, give one generic example setup, e.g.:
  "Buy a near-ATM call at the strike closest above spot if price is above VWAP."
- Always prefix any numeric or monetary value with "$".

End with:
"This assessment is for educational purposes only and is not financial advice."
`.trim();

    const aiAdvice = await chatbotModel.generateResponse(
      prompt,
      "gpt-4o-mini",
      1500
    );
    // 🔹 Save AI insights into DB

    return res.status(200).json({ summary, aiAdvice });
  } catch (error) {
    console.error("Error generating option advice:", error);
    return res.status(500).json({ error: error.message });
  }
};












async function upsertAIAdvice(userId, scenarioId, aiAdvice) {
  try {
    console.log("🧩 upsertAIAdvice received:", {
      userId,
      scenarioId,
      aiAdviceLength: aiAdvice?.length,
    });

    if (!userId || !scenarioId || isNaN(scenarioId)) {
      throw new Error(`Invalid userId (${userId}) or scenarioId (${scenarioId})`);
    }

    // ✅ Step 1: find the latest attempt
    const latestAttempt = await prisma.scenarioAttempt.findFirst({
      where: { userId, scenarioId },
      orderBy: { attemptNumber: "desc" },
    });

    // ✅ Step 2: create if no attempt exists
    if (!latestAttempt) {
      console.log("🆕 Creating first attempt with AI insights...");
      return await prisma.scenarioAttempt.create({
        data: {
          userId,
          scenarioId,
          attemptNumber: 1,
          aiInsights: aiAdvice,
        },
      });
    }

    // ✅ Step 3: update latest attempt
    console.log(`✏️ Updating attempt #${latestAttempt.attemptNumber}`);
    return await prisma.scenarioAttempt.update({
      where: {
        scenarioId_userId_attemptNumber: {
          scenarioId,
          userId,
          attemptNumber: latestAttempt.attemptNumber,
        },
      },
      data: { aiInsights: aiAdvice },
    });
  } catch (err) {
    console.error("❌ Error in upsertAIAdvice:", err);
    throw err;
  }
}


//////////////////////////////////////////////////////
// CHAT CONTROLLER — Persistent Across Pages
//////////////////////////////////////////////////////
const { startChatSession, saveMessage, getChatHistory } = require("../models/chatbot");

// 🧠 Create or Resume Session
module.exports.startChatSession = async (req, res) => {
  try {
    const userId = parseInt(req.user?.id);
    if (!userId) return res.status(400).json({ error: "Missing userId" });
    const session = await startChatSession(userId); // ✅ capture it
    res.status(200).json(session);
  } catch (err) {
    console.error("startChatSession error:", err);
    res.status(500).json({ error: err.message });
  }
};

module.exports.endChatSession = async (req, res) => {
  try {
    const { userId, sessionId } = req.body;
    if (!userId || !sessionId)
      return res.status(400).json({ error: "Missing userId or sessionId" });

    const ended = await chatbotModel.endChatSession(sessionId, userId);
    res.status(200).json(ended);
  } catch (err) {
    console.error("❌ endChatSession error:", err);
    res.status(500).json({ error: err.message });
  }
};

// 💬 Send Message
module.exports.sendChatMessage = async (req, res) => {
  try {
    const { userId, sessionId, prompt } = req.body;
    if (!userId || !sessionId || !prompt)
      return res.status(400).json({ error: "Missing userId, sessionId, or prompt" });

    // 1️⃣ Save user message
    await saveMessage(parseInt(userId), sessionId, "user", prompt);

    // 2️⃣ Generate AI reply
    const aiResponse = await chatbotModel.generateResponseForNyra(
      prompt,       // ✅ first
      userId,       // ✅ second
      sessionId,    // ✅ third
      "gpt-4o-mini",
      400
    );

    // 3️⃣ Save AI message
    await saveMessage(parseInt(userId), sessionId, "assistant", aiResponse);
    broadcastChatbotMessage(userId, sessionId, {
      role: "assistant",
      content: aiResponse,
    });

    res.status(200).json({ response: aiResponse });
  } catch (err) {
    console.error("sendChatMessage error:", err);
    res.status(500).json({ error: err.message });
  }
};

// 📜 Get Chat History
module.exports.getChatHistory = async (req, res) => {
  try {
    const { userId, sessionId } = req.query;
    if (!userId || !sessionId)
      return res.status(400).json({ error: "Missing userId or sessionId" });

    const messages = await getChatHistory(Number(userId), Number(sessionId));
    res.status(200).json(messages);
  } catch (err) {
    console.error("getChatHistory error:", err);
    res.status(500).json({ error: err.message });
  }
};
