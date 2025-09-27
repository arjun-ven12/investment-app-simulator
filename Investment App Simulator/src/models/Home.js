
const { parse } = require('path');
const prisma = require('./prismaClient');

const fetch = require("node-fetch");
const FINNHUB_API_KEY = "cua8sqhr01qkpes4fvrgcua8sqhr01qkpes4fvs0"; 
 const cron = require('node-cron');


const STARTING_WALLET = 100000; // adjust if your starting wallet differs

exports.getLeaderboard = async function getLeaderboard(limit = 10) {
  try {
    // Fetch all users with their most recent trade
    const users = await prisma.user.findMany({
      include: {
        trading: {
          orderBy: { tradeDate: 'desc' }, // get last trade first
          take: 1,
          include: { stock: true } // include related stock
        }
      }
    });

    // Map users to leaderboard entries
    const leaderboardData = users.map(user => {
      const profitLossPercent = ((parseFloat(user.wallet) - STARTING_WALLET) / STARTING_WALLET) * 100;

      const lastTrade = user.trading[0]
        ? `${user.trading[0].tradeType.toUpperCase()} ${user.trading[0].stock?.symbol || 'N/A'}`
        : 'N/A';

      return {
        userId: user.id,
        username: user.username,
        profitLossPercent: parseFloat(profitLossPercent.toFixed(2)),
        lastTrade
      };
    });

    // Sort descending by P&L %
    leaderboardData.sort((a, b) => b.profitLossPercent - a.profitLossPercent);

    // Assign ranking and limit results
    const rankedLeaderboard = leaderboardData.slice(0, limit).map((entry, index) => ({
      rank: index + 1,
      ...entry
    }));

    return rankedLeaderboard;
  } catch (err) {
    console.error('Error fetching leaderboard:', err);
    throw new Error('Failed to fetch leaderboard');
  }
};
