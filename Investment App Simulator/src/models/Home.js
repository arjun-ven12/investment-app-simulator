const { parse } = require('path');
const prisma = require('./prismaClient');

const fetch = require("node-fetch");
 const cron = require('node-cron');

const STARTING_WALLET = 100000;

exports.getLeaderboard = async function getLeaderboard(limit = 10) {
  try {
    const users = await prisma.user.findMany({
      include: {
        trading: {
          orderBy: { tradeDate: "desc" },
          take: 1,
          include: { stock: true }
        },
        stockHoldings: {
          include: {
            stock: {
              include: {
                intradayPrice3: {
                  orderBy: { date: "desc" },
                  take: 1
                }
              }
            }
          }
        }
      }
    });

    const leaderboardData = users.map(user => {
      // ================== OPEN POSITIONS VALUE ==================
      const openPositionsValue = user.stockHoldings.reduce((sum, holding) => {
        const latestPrice =
          holding.stock?.intradayPrice3?.[0]?.closePrice;

        if (!latestPrice) return sum;

        return (
          sum +
          Number(latestPrice) * Number(holding.currentQuantity)
        );
      }, 0);

      // ================== TOTAL EQUITY ==================
      const wallet = Number(user.wallet);
      const totalEquity = wallet + openPositionsValue;

      const profitLossPercent =
        ((totalEquity - STARTING_WALLET) / STARTING_WALLET) * 100;

      // ================== LAST TRADE ==================
      const lastTrade = user.trading[0]
        ? `${user.trading[0].tradeType.toUpperCase()} ${
            user.trading[0].stock?.symbol || "N/A"
          }`
        : "N/A";

      return {
        userId: user.id,
        username: user.username,
        totalEquity: Number(totalEquity.toFixed(2)),
        profitLossPercent: Number(profitLossPercent.toFixed(2)),
        lastTrade
      };
    });

    // ================== SORT & RANK ==================
    leaderboardData.sort(
      (a, b) => b.profitLossPercent - a.profitLossPercent
    );

    return leaderboardData.slice(0, limit).map((entry, index) => ({
      rank: index + 1,
      ...entry
    }));
  } catch (err) {
    console.error("Error fetching leaderboard:", err);
    throw new Error("Failed to fetch leaderboard");
  }
};