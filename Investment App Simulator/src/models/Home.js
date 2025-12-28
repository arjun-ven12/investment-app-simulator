const { parse } = require('path');
const prisma = require('./prismaClient');

const fetch = require("node-fetch");
 const cron = require('node-cron');
 const chartsModel = require("./Charts");

 const optionsModel = require("./options");

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
        startingWallet: true,
        trading: {
          orderBy: { tradeDate: "desc" },
          take: 1,
          select: {
            tradeType: true,
            stock: { select: { symbol: true } }
          }
        }
      }
    });

    const leaderboard = [];

    for (const user of users) {
      // 1️⃣ Stock portfolio
      const stockPortfolio = await chartsModel.getUserPortfolio(user.id);
      const stockValue = stockPortfolio.openPositions.reduce(
        (sum, pos) => sum + Number(pos.currentValue),
        0
      );

      // 2️⃣ Option portfolio
      const optionPortfolio = await optionsModel.getUserOptionPortfolio(user.id);
      const optionValue = optionPortfolio.portfolio.reduce(
        (sum, opt) => sum + Number(opt.realizedPnL + opt.unrealizedPnL),
        0
      );

      // 3️⃣ Total equity = wallet + stocks + options
      const wallet = Number(user.wallet);
      const startingWallet = Number(user.startingWallet);
      const totalEquity = wallet + stockValue + optionValue;

      // 4️⃣ PnL calculations
      const pnlAbsolute = totalEquity - startingWallet;
      const pnlPercent = (pnlAbsolute / startingWallet) * 100;

      // 5️⃣ Last trade
      const lastTrade = user.trading[0]
        ? `${user.trading[0].tradeType} ${user.trading[0].stock?.symbol ?? "N/A"}`
        : null;

      leaderboard.push({
        userId: user.id,
        username: user.username,
        totalEquity: Number(totalEquity.toFixed(2)),
        pnl: Number(pnlAbsolute.toFixed(2)),
        pnlPercent: Number(pnlPercent.toFixed(2)),
        lastTrade
      });
    }

    // 6️⃣ Sort by PnL %
    leaderboard.sort((a, b) => b.pnlPercent - a.pnlPercent);

    // 7️⃣ Return top N
    return leaderboard.slice(0, limit).map((u, i) => ({
      rank: i + 1,
      ...u
    }));
  } catch (err) {
    console.error("Leaderboard error:", err);
    throw new Error("Failed to compute leaderboard");
  }
};