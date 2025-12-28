const { parse } = require('path');
const prisma = require('./prismaClient');

const fetch = require("node-fetch");
 const cron = require('node-cron');
 const STARTING_WALLET = 100000;
 const chartsModel = require("./Charts");
 
 exports.getLeaderboard = async function getLeaderboard(limit = 10) {
  try {
    const users = await prisma.user.findMany({
      where: {
        trading: { some: {} } // must have at least 1 trade
      },
      select: {
        id: true,
        username: true,
        wallet: true,
        trading: {
          orderBy: { tradeDate: "desc" },
          take: 1,
          select: {
            tradeType: true,
            stock: {
              select: { symbol: true }
            }
          }
        }
      }
    });

    const leaderboard = [];

    for (const user of users) {
      const portfolio = await chartsModel.getUserPortfolio(user.id);

      const openPositionsValue = portfolio.openPositions.reduce(
        (sum, pos) => sum + Number(pos.currentValue),
        0
      );

      const wallet = Number(user.wallet);
      const totalEquity = wallet + openPositionsValue;

      const pnlAbsolute = totalEquity - STARTING_WALLET;
      const pnlPercent = (pnlAbsolute / STARTING_WALLET) * 100;

      const lastTrade = user.trading[0]
        ? `${user.trading[0].tradeType} ${user.trading[0].stock?.symbol ?? "N/A"}`
        : null;

      leaderboard.push({
        userId: user.id,
        username: user.username,
        totalEquity: Number(totalEquity.toFixed(2)),
        pnl: Number(pnlAbsolute.toFixed(2)),
        pnlPercent: Number(pnlPercent.toFixed(2)),
        lastTrade // ✅ simple string
      });
    }

    leaderboard.sort((a, b) => b.pnlPercent - a.pnlPercent);

    return leaderboard.slice(0, limit).map((u, i) => ({
      rank: i + 1,
      ...u
    }));
  } catch (err) {
    console.error("Leaderboard error:", err);
    throw new Error("Failed to compute leaderboard");
  }
};
