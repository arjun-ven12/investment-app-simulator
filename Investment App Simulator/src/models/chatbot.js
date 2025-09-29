import prisma from "../../prisma/prismaClient.js";
import OpenAI from "openai";

const openai = new OpenAI({});

//////////////////////////////////////////////////////
// GENERATE AI RESPONSE
//////////////////////////////////////////////////////
const generateResponse = async (
  prompt,
  model = "gpt-4o-mini",
  max_tokens = 150
) => {
  try {
    const completion = await openai.chat.completions.create({
      model,
      messages: [{ role: "user", content: prompt }],
      max_tokens,
    });
    return completion.choices[0].message.content;
  } catch (error) {
    throw new Error("Error generating AI response: " + error.message);
  }
};

/**
 * Build user portfolio from trades (FIFO P/L). Returns { openPositions, closedPositions }.
 * Keeps your existing logic but consolidated here.
 */

/**
 * Build concise portfolio summary for LLM or UI.
 * - Adds weights, portfolio totals, topHoldings with richer fields.
 */
function buildPortfolioSummary(portfolio, topN = 6) {
  const open = portfolio.openPositions || [];
  const totalValue = open.reduce((s, p) => s + (p.currentValue || 0), 0) || 0;
  const totalUnrealizedPL = open.reduce(
    (s, p) => s + (p.unrealizedProfitLoss || 0),
    0
  );
  const totalRealizedPL = open.reduce(
    (s, p) => s + (p.realizedProfitLoss || 0),
    0
  );

  const topHoldings = [...open]
    .sort((a, b) => (b.currentValue || 0) - (a.currentValue || 0))
    .slice(0, topN)
    .map((h) => ({
      symbol: h.symbol,
      companyName: h.companyName || "UNKNOWN",
      sector: h.sector || "UNKNOWN",
      quantity: h.quantity,
      avgBuyPrice: h.avgBuyPrice,
      currentPrice: h.currentPrice,
      currentValue: h.currentValue,
      totalInvested: h.totalInvested,
      unrealizedPL: h.unrealizedProfitLoss,
      unrealizedPLPercent: h.unrealizedProfitLossPercent,
      realizedPL: h.realizedProfitLoss,
      weightPct:
        totalValue > 0
          ? Number(((h.currentValue / totalValue) * 100).toFixed(2))
          : 0,
    }));

  // sector exposure
  const sectorMap = {};
  for (const p of open) {
    const s = p.sector || "UNKNOWN";
    sectorMap[s] = (sectorMap[s] || 0) + (p.currentValue || 0);
  }
  const sectorExposure = Object.entries(sectorMap)
    .map(([sector, val]) => ({
      sector,
      value: Number(val.toFixed(2)),
      pct: totalValue > 0 ? Number(((val / totalValue) * 100).toFixed(2)) : 0,
    }))
    .sort((a, b) => b.pct - a.pct);

  const highestSector = sectorExposure[0]?.sector || "UNKNOWN";
  const highestSectorPct = sectorExposure[0]?.pct || 0;
  const topHolding = topHoldings[0];
  const topHoldingPct = topHolding?.weightPct || 0;

  return {
    totalValue: Number(totalValue.toFixed(2)),
    totalUnrealizedPL: Number(totalUnrealizedPL.toFixed(2)),
    totalRealizedPL: Number(totalRealizedPL.toFixed(2)),
    numHoldings: open.length,
    topHoldings,
    sectorExposure,
    riskHint: {
      topHoldingPct,
      highestSector,
      highestSectorPct,
    },
  };
}

/* ------------------------
   Precomputed helpers
   ------------------------ */

/**
 * Simple, explainable risk score (0-100).
 * - Concentration (top holding weight)
 * - Number of holdings
 * - Unrealized losses
 */
function computeRiskScore(summary) {
  const topWeight = summary.topHoldings?.[0]?.weightPct || 0;
  const num = summary.numHoldings || 0;
  const totalUnrealized = summary.totalUnrealizedPL || 0;
  const totalValue = summary.totalValue || 1;

  let score = 40; // baseline

  if (topWeight >= 50) score += 30;
  else if (topWeight >= 30) score += 15;

  if (num <= 2) score += 15;
  else if (num <= 4) score += 8;

  const unrealPct = (totalUnrealized / totalValue) * 100; // negative if losses
  if (unrealPct < 0) score += Math.min(10, Math.round(Math.abs(unrealPct)));

  score = Math.max(0, Math.min(100, Math.round(score)));
  return score;
}

/**
 * Build scenario simulations for top N holdings and a list of pct moves
 */
function buildScenarios(summary, pctList = [-10, -5, 5]) {
  const scenarios = [];
  const top = summary.topHoldings || [];
  const portfolioBefore = summary.totalValue || 0;

  for (const h of top.slice(0, 3)) {
    for (const pct of pctList) {
      const changeMult = 1 + pct / 100;
      const positionBefore = Number(h.currentValue || 0);
      const positionAfter = +(positionBefore * changeMult).toFixed(2);
      const portfolioAfter = +(
        portfolioBefore -
        positionBefore +
        positionAfter
      ).toFixed(2);

      scenarios.push({
        stock: h.symbol,
        changePct: pct,
        positionValueBefore: +positionBefore,
        positionValueAfter: +positionAfter,
        portfolioValueBefore: +portfolioBefore,
        portfolioValueAfter: +portfolioAfter,
      });
    }
  }
  return scenarios;
}

/**
 * Suggest stop-loss and limit-buy prices based on position weight & current price
 */
function suggestStopsAndLimits(summary) {
  const recs = [];
  for (const h of (summary.topHoldings || []).slice(0, 6)) {
    const current = Number(h.currentPrice || 0);
    const weight = Number(h.weightPct || 0);

    const stopPct = weight >= 40 ? 0.08 : weight >= 20 ? 0.1 : 0.12; // 8%-12%
    const suggestedStop = +(current * (1 - stopPct)).toFixed(2);

    const limitPct = 0.03;
    const suggestedLimitBuy = +(current * (1 - limitPct)).toFixed(2);

    recs.push({
      symbol: h.symbol,
      currentPrice: current,
      suggestedStopPrice: suggestedStop,
      suggestedLimitBuyPrice: suggestedLimitBuy,
      stopPct: +(stopPct * 100).toFixed(2),
      weightPct: weight,
    });
  }
  return recs;
}

/**
 * Build chart-friendly data (pie & bar)
 */
function buildChartData(summary) {
  const labels = (summary.topHoldings || []).map((h) => h.symbol);
  const values = (summary.topHoldings || []).map((h) =>
    Number(h.currentValue || 0)
  );
  const sectorLabels = (summary.sectorExposure || []).map((s) => s.sector);
  const sectorValues = (summary.sectorExposure || []).map((s) =>
    Number(s.value || 0)
  );
  return {
    holdingsPie: { labels, values },
    topHoldingsBar: { labels, values },
    sectorPie: { labels: sectorLabels, values: sectorValues },
  };
}

/**
 * Build a precomputed object you can pass into the LLM prompt as `precomputed`.
 */
function buildPrecomputed(summary) {
  const riskScore = computeRiskScore(summary);
  const scenarios = buildScenarios(summary, [-10, -5, 5]);
  const orderSuggestions = suggestStopsAndLimits(summary);
  const charts = buildChartData(summary);

  return {
    riskScore,
    scenarios,
    orderSuggestions,
    charts,
  };
}

/**
 * Compute daily returns from price history.
 * Returns array of daily return percentages, e.g., [0.01, -0.005, ...]
 */
async function getDailyReturns(stockId, days = 30) {
  const prices = await prisma.intradayPrice3.findMany({
    where: { stockId },
    orderBy: { date: "desc" },
    take: days,
    select: { closePrice: true, date: true },
  });

  const sorted = prices.reverse(); // oldest -> newest
  const returns = [];

  for (let i = 1; i < sorted.length; i++) {
    const prev = Number(sorted[i - 1].closePrice);
    const curr = Number(sorted[i].closePrice);
    if (prev > 0) returns.push((curr - prev) / prev);
  }
  return returns;
}

/**
 * Compute standard deviation (volatility) of daily returns
 */
function stdDev(arr) {
  if (!arr.length) return 0;
  const mean = arr.reduce((s, x) => s + x, 0) / arr.length;
  const variance =
    arr.reduce((s, x) => s + Math.pow(x - mean, 2), 0) / arr.length;
  return Math.sqrt(variance);
}

/**
 * Approximate Beta: covariance(stock, benchmark) / variance(benchmark)
 * benchmarkReturns = array of daily SP500 returns
 */
function computeBeta(stockReturns, benchmarkReturns) {
  const n = Math.min(stockReturns.length, benchmarkReturns.length);
  if (n === 0) return 0;

  const meanStock = stockReturns.slice(-n).reduce((s, x) => s + x, 0) / n;
  const meanBench = benchmarkReturns.slice(-n).reduce((s, x) => s + x, 0) / n;

  let cov = 0,
    varBench = 0;
  for (let i = 0; i < n; i++) {
    cov += (stockReturns[i] - meanStock) * (benchmarkReturns[i] - meanBench);
    varBench += Math.pow(benchmarkReturns[i] - meanBench, 2);
  }
  return varBench > 0 ? cov / varBench : 0;
}

/**
 * Compute Sharpe ratio: mean / stdDev * sqrt(252)
 */
function computeSharpe(stockReturns, riskFreeRate = 0) {
  if (!stockReturns.length) return 0;
  const avg = stockReturns.reduce((s, x) => s + x, 0) / stockReturns.length;
  const sd = stdDev(stockReturns);
  return sd > 0 ? ((avg - riskFreeRate) / sd) * Math.sqrt(252) : 0;
}

/**
 * Compute probabilistic drawdown: probability of X% drop
 * Uses normal approximation from historical returns
 */
function probDrawdown(stockReturns, pctDrop = 0.1) {
  const mean = stockReturns.reduce((s, x) => s + x, 0) / stockReturns.length;
  const sd = stdDev(stockReturns);
  if (sd === 0) return 0;
  // z-score approximation
  const z = (pctDrop + mean) / sd;
  const p = 0.5 * (1 + Math.erf(z / Math.sqrt(2))); // cumulative normal
  return Math.max(0, Math.min(1, 1 - p));
}

/**
 * Extended buildPrecomputed
 * Adds volatility, beta, Sharpe, probabilistic drawdowns
 */
async function buildPrecomputedExtended(summary, benchmarkId = 0) {
  const base = buildPrecomputed(summary); // your existing function

  // Fetch benchmark returns (SP500) if benchmarkId provided
  const benchmarkReturns = benchmarkId
    ? await getDailyReturns(benchmarkId, 30)
    : [];

  const extendedMetrics = [];
  for (const h of summary.topHoldings || []) {
    const returns = await getDailyReturns(h.stockId, 30);
    const vol = stdDev(returns) * Math.sqrt(252); // annualized
    const beta = computeBeta(returns, benchmarkReturns);
    const sharpe = computeSharpe(returns);
    const drawdownProb = probDrawdown(returns, 0.1); // 10% drop

    extendedMetrics.push({
      symbol: h.symbol,
      volatility: +vol.toFixed(4),
      beta: +beta.toFixed(4),
      sharpe: +sharpe.toFixed(4),
      prob10PctDrawdown: +(drawdownProb * 100).toFixed(2),
    });
  }
  return { ...base, extendedMetrics };
}

async function getUserPortfolio(userId) {
  if (!userId || typeof userId !== "number") {
    throw new Error(`Invalid user ID: ${userId}`);
  }

const user = await prisma.user.findUnique({
  where: { id: userId },
  select: {
    wallet: true,
  },
});
console.log(user)
console.log(user.wallet)
const wallet = user.wallet

  // Fetch all trades for the user
  const userTrades = await prisma.trade.findMany({
    where: { userId },
    orderBy: { tradeDate: "asc" },
    select: {
      stockId: true,
      quantity: true, // + for buy, - for sell
      totalAmount: true, // total value of trade
      tradeType: true,
    },
  });

  if (!userTrades || userTrades.length === 0) {
    return { openPositions: [], closedPositions: [], wallet  };
  }

  const stockMap = new Map();

  // Process trades
  for (const trade of userTrades) {
    const { stockId, quantity, totalAmount } = trade;

    if (!stockMap.has(stockId)) {
      stockMap.set(stockId, {
        buyQueue: [],
        netQuantity: 0,
        realizedProfitLoss: 0,
        totalBoughtQty: 0,
        totalBoughtValue: 0,
        totalSoldValue: 0,
      });
    }

    const group = stockMap.get(stockId);

    if (quantity > 0) {
      // BUY
      group.buyQueue.push({
        quantity,
        pricePerShare: Number(totalAmount) / quantity,
      });
      group.netQuantity += quantity;
      group.totalBoughtQty += quantity;
      group.totalBoughtValue += Number(totalAmount);
    } else if (quantity < 0) {
      // SELL
      let sellQty = -quantity; // positive
      const sellProceeds = Number(totalAmount);
      group.totalSoldValue += sellProceeds;

      // Allocate proceeds using FIFO
      while (sellQty > 0 && group.buyQueue.length > 0) {
        const buy = group.buyQueue[0];
        if (buy.quantity <= sellQty) {
          const proceedsPortion = (buy.quantity / -quantity) * sellProceeds;
          group.realizedProfitLoss +=
            proceedsPortion - buy.pricePerShare * buy.quantity;
          sellQty -= buy.quantity;
          group.buyQueue.shift();
        } else {
          const proceedsPortion = (sellQty / -quantity) * sellProceeds;
          group.realizedProfitLoss +=
            proceedsPortion - buy.pricePerShare * sellQty;
          buy.quantity -= sellQty;
          sellQty = 0;
        }
      }

      group.netQuantity += quantity; // negative
    }
  }

  const openPositions = [];
  const closedPositions = [];

  // Build positions
  for (const [stockId, group] of stockMap.entries()) {
    const {
      buyQueue,
      netQuantity,
      realizedProfitLoss,
      totalBoughtQty,
      totalBoughtValue,
      totalSoldValue,
    } = group;

    // Stock details
    const stockDetails = await prisma.stock.findUnique({
      where: { stock_id: stockId },
      select: {
        symbol: true,
        sector: true,
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

    // Latest price
    const latestPriceRecord = await prisma.intradayPrice3.findFirst({
      where: { stockId },
      orderBy: { date: "desc" },
      select: { closePrice: true },
    });
    const latestPrice = Number(latestPriceRecord?.closePrice ?? 0);

    // Open position (remaining shares)
    if (netQuantity > 0) {
      const totalInvested = buyQueue.reduce(
        (sum, b) => sum + b.quantity * b.pricePerShare,
        0
      );
      const avgBuyPrice = totalInvested / netQuantity;
      const currentValue = latestPrice * netQuantity;
      const unrealizedProfitLoss = currentValue - totalInvested;
      const unrealizedProfitLossPercent =
        totalInvested > 0 ? (unrealizedProfitLoss / totalInvested) * 100 : 0;

      openPositions.push({
        symbol: stockDetails?.symbol ?? "UNKNOWN",
        companyName: stockDetails?.company?.name ?? "UNKNOWN",
        sector:
          stockDetails?.sector || stockDetails?.company?.industry || "UNKNOWN",
        industry: stockDetails?.company?.industry ?? "UNKNOWN",
        country: stockDetails?.company?.country ?? "UNKNOWN",
        currency: stockDetails?.company?.currency ?? "USD",
        exchange: stockDetails?.company?.exchange ?? "UNKNOWN",
        marketCap: stockDetails?.company?.marketCapitalization ?? 0,
        website: stockDetails?.company?.website ?? "",
        logo: stockDetails?.company?.logo ?? "",
        quantity: netQuantity,
        avgBuyPrice: avgBuyPrice,
        currentPrice: latestPrice,
        totalInvested: totalInvested,
        currentValue: currentValue,
        unrealizedProfitLoss: unrealizedProfitLoss,
        unrealizedProfitLossPercent: unrealizedProfitLossPercent,
        realizedProfitLoss: realizedProfitLoss,
      });
    }

    // Closed / realized portion
    if (realizedProfitLoss !== 0 || totalSoldValue > 0) {
      closedPositions.push({
        symbol: stockDetails?.symbol ?? "UNKNOWN",
        companyName: stockDetails?.company?.name ?? "UNKNOWN",
        totalBoughtQty,
        totalBoughtValue: totalBoughtValue.toFixed(2),
        totalSoldValue: totalSoldValue.toFixed(2),
        realizedProfitLoss: realizedProfitLoss.toFixed(2),
      });
    }
  }

  return { openPositions, closedPositions, wallet}
}



export {
  getUserPortfolio,
  buildPortfolioSummary,
  computeRiskScore,
  buildScenarios,
  suggestStopsAndLimits,
  buildChartData,
  buildPrecomputed,
  generateResponse,
  buildPrecomputedExtended,
  getDailyReturns,
  stdDev,
  computeBeta,
  computeSharpe,
  probDrawdown,
};
