const chatbotModel = require("../models/chatbot");
const scenarioModel = require("../models/scenario");
const scenarioController = require("./scenarioController");
const prisma = require("../../prisma/prismaClient");
const optionsModel = require("../models/options");
const optionsController = require("../controllers/optionsController");
const { enforceAIResponse } = require("../middlewares/aiResponseEnforcer.js");
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
function getAllowedActions(settings) {
  const { investmentHorizon } = settings;

  if (investmentHorizon === "short") {
    return `
ALLOWED ACTIONS:
- Buy / Sell / Hold
- Stay in cash
- Stop-loss & limit guidance
- Event-driven setups

DISALLOWED:
- Rebalancing
- Diversification
- Sector rotation
`;
  }

  if (investmentHorizon === "swing") {
    return `
ALLOWED ACTIONS:
- Partial trims
- Adds on confirmation
- Risk reduction
`;
  }

  return `
ALLOWED ACTIONS:
- Allocation by %
- Concentration discussion
- Sector exposure
- Long-term thesis
`;
}

function getTaskBlock(settings) {
  const { investmentHorizon, objective } = settings;

  // SHORT
  if (investmentHorizon === "short") {
    return `
TASK:
Act as a short-term trading decision engine.

Your job is to decide:
- Trade now, or stay in cash
- Explain the decision clearly
- Focus on volatility, catalysts, and risk/reward

Forbidden:
- Portfolio rebalancing
- Long-term fundamentals
- Diversification talk (unless explicitly NOT actionable)
`;
  }

  // SWING
  if (investmentHorizon === "swing") {
    return `
TASK:
Act as a swing-trade position manager.

Your job is to:
- Evaluate hold / trim / add decisions
- Focus on multi-day momentum and earnings windows
- Manage risk across days to weeks
`;
  }

  // LONG
  return `
TASK:
Act as a long-term portfolio architect.

Your job is to:
- Evaluate allocation, concentration, and durability
- Focus on compounding and downside protection
- Avoid short-term price action commentary
`;
}

function getRoleProfile(settings) {
  const h = settings.investmentHorizon;
  const r = settings.riskTolerance;

  // SHORT-TERM ROLES
  if (h === "short" && r === "high") {
    return `
ROLE:
You are a short-term tactical trading coach.

BEHAVIOR:
- Think in days, not weeks.
- Do NOT force trades.
- If no valid setups exist, explain why in detail.
- Break down market structure, volatility, and missing catalysts.
- Provide watch conditions that would justify action.
- Staying in cash is a valid outcome and must be justified clearly.
`;
  }

  if (h === "short") {
    return `
ROLE:
You are a conservative short-term risk manager.

BEHAVIOR:
- Prioritize capital protection.
- Emphasize selectivity and patience.
- Explain why risk/reward is unfavorable.
- Focus on avoiding bad trades rather than finding trades.
`;
  }

  // LONG-TERM ROLES
  if (h === "long" && r === "high") {
    return `
ROLE:
You are a long-term conviction-based growth strategist.

BEHAVIOR:
- Ignore short-term noise.
- Focus on fundamentals, durability, and compounding.
- Encourage concentration only with strong justification.
- Discuss long-term upside and risk asymmetry.
`;
  }

  return `
ROLE:
You are a long-term stability-focused portfolio coach.

BEHAVIOR:
- Emphasize diversification and drawdown control.
- Avoid tactical trading language.
- Teach patience, balance, and risk-adjusted returns.
`;
}

function getObjectiveProfile(objective) {
  switch (objective) {
    case "learning":
      return `
OBJECTIVE MODE: LEARNING

COACHING STYLE:
- Prioritize explanation over action.
- Emphasize process, mistakes, and lessons.
- Highlight what could be improved next time.
- Encourage controlled experimentation.
- Use phrases like "lesson", "pattern", "review", "next time".
`;

    case "risk_control":
      return `
OBJECTIVE MODE: RISK CONTROL

COACHING STYLE:
- Prioritize downside protection.
- Highlight drawdowns, volatility, and concentration risk.
- Emphasize cash buffers and position sizing.
- Be conservative with trade frequency.
`;

    case "growth":
    default:
      return `
OBJECTIVE MODE: GROWTH

COACHING STYLE:
- Focus on return optimization within allowed risk.
- Highlight asymmetric opportunities.
- Encourage efficient capital allocation.
- Balance upside with controlled risk.
`;
  }
}


function AIPrefBlock(settings) {
  return `
MODE: ${settings.investmentHorizon.toUpperCase()}_${settings.riskTolerance.toUpperCase()}
These preferences should guide all reasoning and recommendations.

ROLE & BEHAVIOR
${getRoleProfile(settings)}
${getObjectiveProfile(settings.objective)}

CORE PREFERENCES
- Risk tolerance: ${settings.riskTolerance.toUpperCase()}
- Investment horizon: ${settings.investmentHorizon.toUpperCase()}
- Objective: ${settings.objective.toUpperCase()}
- Tone: ${getToneProfile(settings.aiTone)}

DEFINITIONS
- Portfolio value = invested assets only.
- Wallet = uninvested cash.

DECISION CONSTRAINTS
- Recommendations must strictly match the investment horizon.
- SHORT-TERM means:
  • Timeframe: days to weeks only
  • Catalysts must be event-driven or volatility-driven
  • Macro or sector narratives are NOT sufficient justification
- LONG-TERM means:
  • Ignore short-term price movement
  • Focus on durability, fundamentals, and compounding
- Avoid making recommendations that do not clearly fit the stated horizon.

If no trade is recommended, explain:
- Explain which conditions are missing
- List 2–3 concrete triggers that would change the decision
- State whether inaction is due to:
  (a) lack of volatility
  (b) poor risk/reward
  (c) insufficient catalyst

STYLE RULES
- Use ## or ### headings only
- No numeric prefixes in headings
`.trim();
}





//////////////////////////////////////////////////////
// GENERATE AI RESPONSE
//////////////////////////////////////////////////////
async function loadUserAISettings(userId) {
  const settings = await prisma.aISetting.findUnique({
    where: { userId: Number(userId) },
  });

  return settings
    ? {
        ...settings,
        riskTolerance: settings.riskTolerance?.toLowerCase(),
        investmentHorizon: settings.investmentHorizon?.toLowerCase(),
        aiTone: settings.aiTone?.toLowerCase(),
        objective: settings.objective?.toLowerCase(),
      }
    : {
        riskTolerance: "moderate",
        aiTone: "professional",
        investmentHorizon: "long",
        objective: "growth"
      };
}


module.exports.generateResponse = async (req, res) => {
  const { prompt, model = "gpt-3.5", max_tokens = 4000, userId } = req.body;
  if (!prompt) return res.status(400).json({ error: "Prompt is required." });

  try {
    let fullPrompt = prompt;
    let settings = null;

    if (userId) {
      settings = await loadUserAISettings(userId);

      fullPrompt = `
SYSTEM:
You are Nyra, an AI trading coach.
${AIPrefBlock(settings)}

${fullPrompt}
`;

      const portfolio = await chatbotModel.getUserPortfolio(Number(userId));
      const summary = chatbotModel.buildPortfolioSummary(portfolio);

      fullPrompt += `\n\nUser portfolio summary:\n${JSON.stringify(summary, null, 2)}`;
    }

    const aiText = await chatbotModel.generateResponse(
      fullPrompt,
      model,
      max_tokens
    );

    return res.status(200).json({ response: aiText });
  } catch (error) {
    console.error("Controller.generateResponse error:", error);
    return res.status(500).json({ error: error.message || "Failed to generate response." });
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

function getStockTask(settings) {
  const h = settings.investmentHorizon;

  if (h === "short") {
    return `
TASK:
Make short-term stock trade decisions.

FOCUS:
- Days to weeks only
- Catalysts, volatility, earnings
- Risk/reward and invalidation

ALLOWED:
- Buy / Sell / Hold
- Stay in cash

FORBIDDEN:
- Rebalancing
- Diversification
- Long-term fundamentals
`;
  }

  if (h === "swing") {
    return `
TASK:
Manage swing positions.

FOCUS:
- Multi-day momentum
- Earnings windows
- Trim / add / hold decisions
`;
  }

  return `
TASK:
Evaluate long-term stock allocation quality.

FOCUS:
- Concentration
- Business durability
- Long-term upside vs risk

FORBIDDEN:
- Stop-losses
- Short-term catalysts
`;
}
function getStockRiskStyle(settings) {
  if (settings.riskTolerance === "high") {
    return `
RISK STYLE:
- Aggressive but rational
- Higher volatility acceptable
- Concentration allowed if justified
`;
  }

  if (settings.riskTolerance === "low") {
    return `
RISK STYLE:
- Capital preservation first
- Conservative sizing
- Avoid concentration
`;
  }

  return `
RISK STYLE:
- Balanced risk-taking
- Controlled position sizing
`;
}

module.exports.getPortfolioAdvice = async (req, res) => {
  const userId = Number(req.params.userId);
  if (!Number.isInteger(userId))
    return res.status(400).json({ error: "Invalid user ID." });

  const settings = await loadUserAISettings(userId);

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
    const aiSettings = settings;
    const riskProfile = aiSettings.riskTolerance;
    const horizon = settings.investmentHorizon?.toUpperCase() || "LONG";
const riskTol = settings.riskTolerance?.toUpperCase() || "MODERATE";

    // 4️⃣ Construct LLM prompt
const prompt = `
SYSTEM:
You are Nyra, an AI stock trading coach.

${AIPrefBlock(settings)}
${getStockTask(settings)}
${getStockRiskStyle(settings)}

TONE:
${getToneProfile(settings.aiTone)}

DATA:
Portfolio summary:
${JSON.stringify(summary, null, 2)}

Recent trades:
${JSON.stringify(recentTrades, null, 2)}

Risk metrics:
${JSON.stringify(precomputed, null, 2)}

Wallet:
$${wallet}

RESPONSE FORMAT (MANDATORY):
---
Based on your ${horizon} horizon and ${riskTol} risk tolerance

## Strengths
## Weaknesses
## Scenario Analysis
## Actionable Decisions
## Watchlist & Triggers (Optional)
## Risk Controls
## Cash Position
## Settings Alignment Check
---

RULES:
- If no good trade exists, say so clearly and explain why
- If SHORT horizon, do NOT rebalance or diversify
- If LONG horizon, do NOT give stop-losses
- Use only data provided
- End with educational disclaimer
- If no trade is recommended:
  • You MUST include a "Watchlist & Triggers" section
  • Include 2–4 U.S. stocks relevant to the user's horizon
  • These are NOT trade recommendations
  • Use conditional language only
- Each trigger must include at least one numeric condition
  (%, range, volume vs average, or timeframe)

- Watchlist stocks must NOT include buy/sell language
- Each watchlist item must include:
  • Why the stock is relevant now
  • Why no trade is justified yet
  • 2–3 concrete triggers that would change the decision

- Any claim about volatility, risk, or stop levels must include a numeric reference
(e.g. %, recent high/low, or range).
- Confidence level: Medium — decision driven by absence of volatility rather than negative outlook.
- Avoid exact price levels unless justified by recent price action or volatility

`;


    const rawAdvice = await chatbotModel.generateResponse(
  prompt,
  "gpt-4o-mini",
  1500
);

return res.status(200).json({
  advice: rawAdvice,
  portfolio: summary,
  recentTrades,
  riskProfile
});

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
    const summaryData = await scenarioController.getScenarioEndingSummary(
      req,
      null,
      true
    );
    const aiSettings = await loadUserAISettings(userId);
    const prefBlock = AIPrefBlock(aiSettings);
    // Then extract intraday separately
    const intradayData = summaryData.intraday;
    const scenarioDetails = await scenarioModel.getScenarioById(scenarioId);
    // If your controller returns through res.status().json(), extract the data
    const scenarioSummary = summaryData?.data || summaryData;
    const intradaySummary = summaryData.intradaySummary;
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

1. Every volatility claim MUST reference intraday rangePct
(e.g., "range ~8.4%").
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

3. Quantitative Risk & Execution Insights
- Include computed volatility per stock, risk exposure, and potential emotional biases triggered by rapid swings.  
- Relate metrics to user behavior during the scenario.

4. **High-Volatility Stock Recommendations**  
- Rank **3–5 stocks by volatility** based on scenario intraday data.  
- For each, include:  
  - Rationale based on volatility  
  - Expected movement aligned with the user's investment horizon
  - Relative risk level (low / medium / high) 
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
8. If fewer than 3 valid high-volatility stocks exist in intraday data,
ONLY analyze existing portfolio positions.
DO NOT invent or assume additional stocks.
If intraday data contains fewer than 3 symbols,
you MAY recommend well-known US stocks
from sectors IMPLIED by the scenario title.
Label them clearly as "Contextual Learning Candidates".
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

Intraday Volatility Summary:
${JSON.stringify(intradaySummary, null, 2)}
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
      null,
      true // 🔥 THIS IS NON-OPTIONAL
    );
    const {
      intradaySummary,
      trades,
      totalPortfolioValue,
      summary,
      isPersonalBest,
    } = summaryData;
    const scenarioDetails = await scenarioModel.getScenarioById(scenarioId);
    // If your controller returns through res.status().json(), extract the data
    const scenarioSummary = summaryData?.data || summaryData;
    const portfolio = await scenarioController.getUserScenarioPortfolio(
      mockReq,
      mockRes
    );
    const wallet = await scenarioModel.getParticipantWallet(userId, scenarioId);

    const prompt = `
    ### INPUT DATA

Scenario Details:
${JSON.stringify(
  {
    title: scenarioDetails.title,
    volatility: scenarioDetails.volatility,
    startDate: scenarioDetails.startDate,
    endDate: scenarioDetails.endDate,
  },
  null,
  2
)}

Market Behaviour (Summarised):
${JSON.stringify(intradaySummary, null, 2)}

Portfolio Performance:
${JSON.stringify(
  {
    trades,
    totalPortfolioValue,
    wallet,
    realizedPnL: summary?.realizedPnL,
    unrealizedPnL: summary?.unrealizedPnL,
    isPersonalBest,
  },
  null,
  2
)}

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
    const aiSettings = await loadUserAISettings(userId);

    const portfolioRes = await optionsModel.getUserOptionPortfolio(
      parseInt(userId, 10)
    );
    const portfolio = Array.isArray(portfolioRes?.portfolio)
      ? portfolioRes.portfolio
      : [];

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
      if (!symbols[sym])
        symbols[sym] = { trades: 0, totalPnL: dollar(totalPnLNum) };
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
          const worstVal = worst
            ? Number(strip$(worst.data.totalPnL))
            : Infinity;
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

FORBIDDEN ACTIONS (STRICT):
- Do NOT mention or suggest trailing stops.
- Do NOT mention or suggest stop-limit, stop-market, or conditional orders.
- Do NOT suggest adjusting expirations or rolling contracts.
- Do NOT recommend strategies beyond single-leg CALL or PUT.
- Do NOT imply automation or dynamic risk management.
If any forbidden action is mentioned, the response is invalid.

USER SUMMARY (JSON):
${JSON.stringify(summary, null, 2)}

REQUIREMENTS:
- Tone: professional, precise, trustworthy (no emojis).
- Use clear headings and short bullet points.
- Always show monetary values with a "$" prefix.
- Base all commentary strictly on provided metrics.
- Focus on concrete next steps (entries, exits, sizing, order-type usage, symbol allocation).
- Do NOT recommend opening new positions if realized P&L is negative and consistency score < 5/10
If new positions are disallowed:
- You MUST state: "No new option positions are recommended at this time."
- You MUST focus on execution quality, risk controls, and behavior only.
- You MAY NOT include hypothetical entry examples.


STRUCTURE:

Scorecard
- Performance: _/10
- Risk: _/10
- Timing: _/10
- Consistency: _/10
Scoring Basis:
Scores reflect realized P&L stability, drawdown control, order-type discipline, and holding-period consistency.

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

G. Option Eligibility & Trade Filters

For each symbol listed in summary.symbols:

- State whether the symbol is currently TRADE-ELIGIBLE or NOT ELIGIBLE.
- Eligibility must be justified using:
  • Liquidity (frequency of trades on this symbol)
  • Consistency of P&L on this symbol
  • Average holding period alignment with 0–7 day window

If NOT ELIGIBLE:
- Explicitly say "No trade recommended on this symbol."
- Provide 1–2 conditions that would make it eligible again.

If ELIGIBLE:
- Specify CALL or PUT bias only (no strike prices).
- Specify MARKET or LIMIT preference only.
- Include one invalidation condition that cancels the idea.

Do NOT include price targets.
Do NOT include strike prices.
Do NOT include expiration commentary.


End with:
"This assessment is for educational purposes only and is not financial advice."
`.trim();
const rawAdvice = await chatbotModel.generateResponse(
  prompt,
  "gpt-4o-mini",
  1500
);

return res.status(200).json({ summary, aiAdvice: rawAdvice });


    
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
      throw new Error(
        `Invalid userId (${userId}) or scenarioId (${scenarioId})`
      );
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
const {
  startChatSession,
  saveMessage,
  getChatHistory,
} = require("../models/chatbot");

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
      return res
        .status(400)
        .json({ error: "Missing userId, sessionId, or prompt" });

    // 1️⃣ Save user message
    await saveMessage(parseInt(userId), sessionId, "user", prompt);

    // 2️⃣ Generate AI reply
    const settings = await loadUserAISettings(userId);

    const enforcedPrompt = `
SYSTEM:
You are Nyra, an AI trading coach.
${AIPrefBlock(settings)}
USER MESSAGE:
${prompt}
`;

    const rawResponse = await chatbotModel.generateResponseForNyra(
  enforcedPrompt,
  userId,
  sessionId,
  "gpt-4o-mini",
  400
);

const aiResponse = rawResponse;

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
