const { parse } = require('path');
const prisma = require('../../prisma/prismaClient');
  require('dotenv').config();

const fetch = require("node-fetch");

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY; 


const cron = require('node-cron');
const crypto = require('crypto'); // for fake transaction hash
const { ethers } = require('ethers');

const ledgerAbi = require("../../artifacts/contracts/tradeLedger.sol/TradeLedger.json").abi;

// ✅ Hardhat Local Node Provider
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);

// ✅ Signer: Your first Hardhat account
const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

// ✅ Smart Contract
const ledgerContract = new ethers.Contract(
  process.env.LEDGER_ADDRESS,
  ledgerAbi,
  signer
);
const ledger = new ethers.Contract(process.env.LEDGER_ADDRESS, ledgerAbi, signer);

const getISOWeekYear = (date) => {
    const d = new Date(date);
    const yearStart = new Date(d.getFullYear(), 0, 1);
    const days = Math.floor((d - yearStart) / (24 * 60 * 60 * 1000));
    return Math.ceil((days + yearStart.getDay() + 1) / 7); 
};



module.exports.getStockChartData = function getStockChartData(symbol, timeFrame) {
    if (!symbol || typeof symbol !== 'string') {
        throw new Error(`Invalid stock symbol: ${symbol}`);
    }

    return prisma.stock
        .findUnique({
            where: { symbol: symbol.toUpperCase() },
            include: {
                hist_prices: {
                    orderBy: { date: 'asc' },
                    select: {
                        date: true,
                        close_price: true,
                    },
                },
            },
        })
        .then(stock => {
            if (!stock) {
                throw new Error(`Stock with symbol "${symbol}" not found`);
            }

            const groupedData = stock.hist_prices.reduce((acc, price) => {
                const date = new Date(price.date);
                const year = date.getFullYear();
                let key;

                if (timeFrame === 'monthly') {
                    const month = (date.getMonth() + 1).toString().padStart(2, '0');
                    key = `${year}-${month}`;
                } else {
                    const week = getISOWeekYear(price.date);
                    key = `${year}-W${week.toString().padStart(2, '0')}`;
                }

                if (!acc[key]) {
                    acc[key] = { total: 0, count: 0 };
                }
                acc[key].total += parseFloat(price.close_price.toString());
                acc[key].count += 1;
                return acc;
            }, {});

            // Prepare chart data
            const labels = Object.keys(groupedData).sort();
            const data = labels.map(key => (groupedData[key].total / groupedData[key].count).toFixed(2));

            return {
                labels,
                datasets: [
                    {
                        label: `${stock.symbol} ${timeFrame.charAt(0).toUpperCase() + timeFrame.slice(1)} Average Close Price`,
                        data,
                        borderColor: 'rgba(75, 192, 192, 1)',
                        backgroundColor: 'rgba(75, 192, 192, 0.2)',
                        borderWidth: 2,
                    },
                ],
            };
        })
        .catch(error => {
            console.error('Error fetching stock chart data:', error);
            throw error;
        });
};




























module.exports.getLatestPrice = async function (symbol) {
  if (!symbol) throw new Error('Stock symbol is required.');

  try {
    // Prepare dates for the API: fetch the last 7 days just to be safe
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - 7);

    const toStr = to.toISOString().split('T')[0];   // YYYY-MM-DD
    const fromStr = from.toISOString().split('T')[0];

    // Multiplier = 1, timespan = day, sort desc to get latest bar first, limit = 1
    const url = `https://api.massive.com/v2/aggs/ticker/${encodeURIComponent(symbol.toUpperCase())}/range/1/day/${fromStr}/${toStr}?adjusted=true&sort=desc&limit=1&apiKey=${POLYGON_API_KEY}`;

    const response = await fetch(url);
    if (!response.ok) throw new Error(`Massive API error: ${response.status}`);

    const data = await response.json();
    if (!data.results || data.results.length === 0) {
      throw new Error('No aggregate data found for this symbol.');
    }

    // Return the latest close price
    return data.results[0].c;

  } catch (err) {
    console.error('Error fetching latest price:', err);
    throw err;
  }
};











module.exports.getStockIdBySymbol = function getStockIdBySymbol(symbol) {
    if (!symbol) {
        throw new Error('Symbol is required.');
    }

    return prisma.stock
        .findUnique({
            where: { symbol: symbol },
            select: { stock_id: true },
        })
        .then(function (stock) {
            if (!stock) {
                throw new Error('Stock not found');
            }

            return stock.stock_id;
        })
        .catch(function (error) {
            console.error('Error fetching stock ID:', error);
            throw error;
        });
};



module.exports.getUserPortfolio = async function getUserPortfolio(userId) {
  if (!userId || typeof userId !== "number") {
    throw new Error(`Invalid user ID: ${userId}`);
  }

  // Fetch all trades for the user
  const userTrades = await prisma.trade.findMany({
    where: { userId },
    orderBy: { tradeDate: "asc" },
    select: {
      stockId: true,
      quantity: true,
      totalAmount: true,
      tradeType: true
    }
  });

  if (!userTrades || userTrades.length === 0) {
    return { openPositions: [], closedPositions: [] };
  }

  const stockMap = new Map();

  // Process trades
  for (const trade of userTrades) {
    const { stockId, quantity, totalAmount, tradeType } = trade;

    if (!stockMap.has(stockId)) {
      stockMap.set(stockId, {
        buyQueue: [],
        netQuantity: 0,
        realizedProfitLoss: 0,
        totalBoughtQty: 0,
        totalBoughtValue: 0,
        totalSoldQty: 0,
        totalSoldValue: 0
      });
    }

    const group = stockMap.get(stockId);
    const side = (tradeType || "").toString().toUpperCase();
    const absQty = Math.abs(Number(quantity));

    if (side === "BUY") {
      const pricePerShare = absQty > 0 ? Number(totalAmount) / absQty : 0;
      group.buyQueue.push({ quantity: absQty, pricePerShare });
      group.netQuantity += absQty;
      group.totalBoughtQty += absQty;
      group.totalBoughtValue += Number(totalAmount);
    } else if (side === "SELL") {
      const sellQty = absQty;
      const sellProceeds = Number(totalAmount);
      group.totalSoldValue += sellProceeds;
      group.totalSoldQty += sellQty;

      let remainingToSell = sellQty;
      const avgSellPricePerShare = sellQty > 0 ? sellProceeds / sellQty : 0;

      while (remainingToSell > 0 && group.buyQueue.length > 0) {
        const buy = group.buyQueue[0];

        if (buy.quantity <= remainingToSell) {
          const qtyMatched = buy.quantity;
          group.realizedProfitLoss += avgSellPricePerShare * qtyMatched - buy.pricePerShare * qtyMatched;
          remainingToSell -= qtyMatched;
          group.buyQueue.shift();
        } else {
          const qtyMatched = remainingToSell;
          group.realizedProfitLoss += avgSellPricePerShare * qtyMatched - buy.pricePerShare * qtyMatched;
          buy.quantity -= qtyMatched;
          remainingToSell = 0;
        }
      }

      if (remainingToSell > 0) {
        group.realizedProfitLoss += avgSellPricePerShare * remainingToSell;
      }

      group.netQuantity -= sellQty;
    }
  }

  const openPositions = [];
  const closedPositions = [];

  for (const [stockId, group] of stockMap.entries()) {
    const { buyQueue, netQuantity, realizedProfitLoss, totalBoughtQty, totalBoughtValue, totalSoldQty, totalSoldValue } = group;

    const stockDetails = await prisma.stock.findUnique({
      where: { stock_id: stockId },
      select: { symbol: true, company: { select: { name: true } } }
    });

    const latestPriceRecord = await prisma.intradayPrice3.findFirst({
      where: { stockId },
      orderBy: { date: "desc" },
      select: { closePrice: true }
    });
    const latestPrice = Number(latestPriceRecord?.closePrice ?? 0);

    // Open Positions
    if (netQuantity > 0) {
      const totalInvested = buyQueue.reduce((sum, b) => sum + b.quantity * b.pricePerShare, 0);
      const avgBuyPrice = netQuantity > 0 ? (totalInvested / netQuantity) : 0;
      const currentValue = latestPrice * netQuantity;
      const unrealizedProfitLoss = currentValue - totalInvested;
      const unrealizedProfitLossPercent = totalInvested > 0 ? (unrealizedProfitLoss / totalInvested) * 100 : 0;

      openPositions.push({
        symbol: stockDetails?.symbol ?? "UNKNOWN",
        companyName: stockDetails?.company?.name ?? "UNKNOWN",
        quantity: netQuantity,
        avgBuyPrice: avgBuyPrice.toFixed(2),
        currentPrice: latestPrice.toFixed(2),
        totalInvested: totalInvested.toFixed(2),
        currentValue: currentValue.toFixed(2),
        unrealizedProfitLoss: unrealizedProfitLoss.toFixed(2),
        unrealizedProfitLossPercent: unrealizedProfitLossPercent.toFixed(2) + "%",
        realizedProfitLoss: realizedProfitLoss.toFixed(2)
      });
    }

    // Closed Positions
    if (realizedProfitLoss !== 0 || totalSoldValue > 0) {
      closedPositions.push({
        symbol: stockDetails?.symbol ?? "UNKNOWN",
        companyName: stockDetails?.company?.name ?? "UNKNOWN",
        totalBoughtQty,
        totalSoldQty,
        totalBoughtValue: totalBoughtValue.toFixed(2),
        totalSoldValue: totalSoldValue.toFixed(2),
        realizedProfitLoss: realizedProfitLoss.toFixed(2)
      });
    }

    // **Upsert into StockHolding**
    await prisma.stockHolding.upsert({
      where: {
        userId_stockId: {
          userId,
          stockId
        }
      },
      update: {
        currentQuantity: netQuantity,
        symbol: stockDetails?.symbol ?? "UNKNOWN"
      },
      create: {
        userId,
        stockId,
        symbol: stockDetails?.symbol ?? "UNKNOWN",
        currentQuantity: netQuantity
      }
    });
  }

  return { openPositions, closedPositions };
};



module.exports.getAllStocks = function getAllStocks() {
    return prisma.stock
        .findMany({
            include: {
                company: true,     
                hist_prices: true, 
                trading: true,     
            },
        })
        .then(stocks => {
            if (!stocks || stocks.length === 0) {
                throw new Error('No stocks found');
            }

            return stocks.map(stock => ({
                stock_id: stock.stock_id,
                symbol: stock.symbol,
                company: stock.company ? {
                    id: stock.company.id,
                    name: stock.company.name,
                    founded: stock.company.founded,
                    employees: stock.company.employees,
                    address: stock.company.address,
                    city: stock.company.city,
                    country: stock.company.country,
                    zipCode: stock.company.zipCode,
                    phone: stock.company.phone,
                    website: stock.company.website,
                    description: stock.company.description,
                } : null,
                hist_prices: stock.hist_prices, 
                trading: stock.trading,         
            }));
        })
        .catch(error => {
            console.error('Error fetching stock details:', error);
            throw error;
        });
};






// Fetch all stocks with favorites sorted on top
module.exports.getAllFavoriteStocks = function getAllFavoriteStocks(userId) {
    return prisma.stock
        .findMany({
            include: {
                favoriteStock: {
                    where: { 
                        userId: parseInt(userId)
                    },
                },
            },
        })
        .then(stocks => {
            if (!stocks || stocks.length === 0) {
                throw new Error('No stocks found');
            }
        
            
            const processedStocks = stocks.map(stock => ({
                ...stock,
                isFavorite: stock.favoriteStock?.length > 0 || false, // Default to false 
            }));
        
            return processedStocks.sort((a, b) => b.isFavorite - a.isFavorite);
        })
        .catch(error => {
            console.error('Error fetching stocks:', error);
            throw error;
        });
};

// Toggle the favorite status of a stock for the user
module.exports.toggleFavorite = function toggleFavorite(userId, stockId) {
    return prisma.favoriteStock
        .findUnique({
            where: {
                userId_stockId: {
                  userId: parseInt(userId, 10),  
                  stockId: stockId
                }
        }
    })
        .then(favorite => {
            if (favorite) {
                // If already favorited, remove it
                return prisma.favoriteStock.delete({
                    where: { id: favorite.id },
                });
            } else {
                // Otherwise, add it as a favorite
                return prisma.favoriteStock.create({
                    data: { userId: parseInt(userId), stockId },
                });
            }
        })
        .catch(error => {
            console.error('Error toggling favorite status:', error);
            throw error;
        });
};




///////////////////////////////////////////
/////////////////////////// CA2
///////////////////////////////////////////



//////////////////////////////////////////////////
/////////// Search API Functionality
//////////////////////////////////////////////////


// Model for searching stocks
exports.searchStocks = function searchStocks(query) {
  if (!query || typeof query !== "string") {
    throw new Error(`Invalid search query: ${query}`);
  }

  const normalizedQuery = query.trim().toLowerCase();

  return fetch(
    `https://finnhub.io/api/v1/search?q=${encodeURIComponent(query)}&token=${FINNHUB_API_KEY}`
  )
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Finnhub API error: ${response.statusText}`);
      }
      return response.json();
    })
    .then((data) => {
      const filtered = data.result.filter((item) => {
        const symbolMatch = item.displaySymbol.toLowerCase() === normalizedQuery;

        // Split description into words and check for exact match
        const descriptionWords = item.description.toLowerCase().split(/\s+/);
        const descriptionMatch = descriptionWords.includes(normalizedQuery);

        // Exclude symbols that contain a dot (.)
        const noDotInSymbol = !item.displaySymbol.includes('.');

        return (symbolMatch || descriptionMatch) && noDotInSymbol;
      });

      return filtered;
    })
    .catch((error) => {
      console.error("Error fetching stock symbols:", error);
      throw error;
    });
};



//////////////////////////////////////////////////
/////////// Favorite Stock API Functionality
//////////////////////////////////////////////////


exports.favoriteStock = function favoriteStock(userId, symbol) {
    if (!userId || !symbol || typeof symbol !== "string") {
      throw new Error("Invalid user ID or stock symbol");
    }
  
    return prisma.favoriteApi
      .create({
        data: {
          userId: userId,
          symbol: symbol,
        },
      })
      .catch((error) => {
        console.error("Error favoriting stock:", error);
        throw error;
      });
  };
  


  exports.getFavoriteStocks = function getFavoriteStocks(userId) {
    if (!userId || isNaN(userId)) {
      throw new Error("Invalid user ID");
    }
  
    return prisma.favoriteApi
      .findMany({
        where: { userId: Number(userId) },
        distinct: ['symbol']  // Only return unique records based on the "symbol" field
      })
      .catch((error) => {
        console.error("Error fetching favorite stocks:", error);
        throw error;
      });
  };
  


  exports.unfavoriteStock = function unfavoriteStock(userId, symbol) {
    if (!userId || !symbol) {
      throw new Error("Invalid input: User ID and stock symbol are required");
    }
    
    return prisma.favoriteApi
      .deleteMany({
        where: {
          userId: Number(userId),
          symbol: symbol
        }
      })
      .catch((error) => {
        console.error("Error unfavoriting stock:", error);
        throw error;
      });
  };





/////////////////////////////////////////////////
/////////// Limit Order Functionality
//////////////////////////////////////////////////



//////////////////////////////////////////////////
/////////// Comments Functionality
//////////////////////////////////////////////////

  // Create a comment
exports.addComment = function addComment({ userId, stockSymbol, content }) {
    if (!userId || !stockSymbol || typeof stockSymbol !== 'string' || !content) {
      throw new Error('Invalid input for adding comment');
    }
  
    return prisma.comment.create({
      data: {
        userId: userId,
        stockSymbol,
        content,
      },
    }).catch((error) => {
      console.error('Error adding comment:', error);
      throw error;
    });
  };
  
  // Get comments for a specific stock symbol
  exports.getCommentsByStock = function getCommentsByStock(stockSymbol) {
    if (!stockSymbol || typeof stockSymbol !== 'string') {
      throw new Error('Invalid stock symbol');
    }
  
    return prisma.comment.findMany({
      where: { stockSymbol },
      orderBy: { createdAt: 'asc' },
    }).catch((error) => {
      console.error('Error retrieving comments:', error);
      throw error;
    });
  };
  
  // Update a comment
  exports.updateComment = function updateComment(commentId, content) {
    if (!commentId || !content) {
      throw new Error('Comment ID and new content are required');
    }
  
    return prisma.comment.update({
      where: { id: parseInt(commentId) },
      data: { content },
    }).catch((error) => {
      console.error('Error updating comment:', error);
      throw error;
    });
  };
  
  // Delete a comment
  exports.deleteComment = function deleteComment(commentId) {
    if (!commentId) {
      throw new Error('Comment ID is required');
    }
  
    return prisma.comment.delete({
      where: { id: Number(commentId) },
    }).catch((error) => {
      console.error('Error deleting comment:', error);
      throw error;
    });
  };
  



  exports.incrementCommentView = function incrementCommentView(commentId) {
    if (!commentId) {
      throw new Error(`Invalid comment id: ${commentId}`);
    }
    return prisma.comment
      .update({
        where: { id: Number(commentId) },
        data: { viewCount: { increment: 1 } }
      })
      .then(updatedComment => updatedComment.viewCount)
      .catch(error => {
        console.error("Error incrementing comment view count:", error);
        throw error;
      });
  };

  






//////////////////////////////////////////////////
/////////// Market Status Functionality
//////////////////////////////////////////////////



exports.getMarketStatus = function getMarketStatus(exchange) {
  if (!exchange) {
    throw new Error("Exchange parameter is required");
  }


  const url = `https://finnhub.io/api/v1/stock/market-status?exchange=${exchange}&token=${FINNHUB_API_KEY}`;

  return fetch(url)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Finnhub API error: ${response.statusText}`);
      }
      return response.json();
    })
    .then((data) => {

      return {
        exchange: data.exchange,      // e.g., "SGX"
        holiday: data.holiday,          // e.g., null (or a holiday name)
        isOpen: data.isOpen,            // boolean: true if market is open, false otherwise
        session: data.session,          // e.g., "pre-market", "regular", or "after-hours"
        timezone: data.timezone,        // e.g., "Singapore"
        timestamp: data.t               // Unix timestamp of the status
      };
    })
    .catch((error) => {
      console.error("Error fetching market status:", error);
      throw error;
    });
};


//////////////////////////////////////////////////
/////////// Recommendations Functionality
//////////////////////////////////////////////////




exports.getStockRecommendations = function getStockRecommendations(symbol) {
    if (!symbol) {
      throw new Error(`Stock symbol is required: ${symbol}`);
    }
  
    return fetch(
      `https://finnhub.io/api/v1/stock/recommendation?symbol=${encodeURIComponent(symbol)}&token=${FINNHUB_API_KEY}`
    )
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Finnhub API error: ${response.statusText}`);
        }
        return response.json();
      })
      .catch((error) => {
        console.error("Error fetching recommendations:", error);
        throw error;
      });
  };


  

  //////////////////////////////////////////////////
  /////////// Retrieve trades Functionality
  //////////////////////////////////////////////////
  
  
  
  exports.getUserTrades = function getUserTrades(userId) {
      if (!userId || isNaN(userId)) {
        throw new Error("Invalid user ID");
      }
      return prisma.trade
        .findMany({
          where: { userId: Number(userId)},
          include: { stock: true } // Include stock data to show the symbol, etc.
        })
        .catch((error) => {
          console.error("Error fetching trades:", error);
          throw error;
        });
    };
    
    
    
    exports.getUserLimitOrders = function getUserLimitOrders(userId) {
      if (!userId || isNaN(userId)) {
        throw new Error("Invalid user ID");
      }
      return prisma.limitOrder
        .findMany({
          where: { userId: Number(userId) },
          include: { stock: true } // Include stock data (e.g., symbol)
        })
        .catch((error) => {
          console.error("Error fetching limit orders:", error);
          throw error;
        });
    };
  
  
  
  
  
  
  
  
  
  
  
  
  
  
    ///////////////////////////////////////////////////////
  /////////// REALTIME
  //////////////////////////////////////////////////////
  
  
  


  
  const API_KEY = process.env.MARKETSTACK_API_KEY;
  
  const POLYGON_API_KEY = process.env.POLYGON_API_KEY


//   module.exports.getIntradayData = async function (symbol, dateFrom, dateTo) {
//     if (!symbol) throw new Error('Stock symbol is required.');

//     // Default to past 7 days if no dates provided
//     const now = new Date();
//     const defaultTo = now.toISOString().split('T')[0];
//     const defaultFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
//         .toISOString()
//         .split('T')[0];

//     const params = new URLSearchParams({
//         access_key: API_KEY,
//         symbols: symbol,
//         sort: 'ASC',
//         limit: 1000,
//         date_from: dateFrom || defaultFrom,
//         date_to: dateTo || defaultTo
//     });

//     const url = `https://api.marketstack.com/v1/intraday?${params.toString()}`;

//     try {
//         const response = await fetch(url);
//         if (!response.ok) throw new Error(`Marketstack API error: ${response.status}`);
//         const data = await response.json();

//         if (!data.data || data.data.length === 0) {
//             throw new Error('No intraday data found for this symbol.');
//         }

//         // Upsert stock in DB
//         const stock = await prisma.stock.upsert({
//             where: { symbol: symbol },
//             update: {},
//             create: { symbol: symbol }
//         });

//         console.log(`Processing ${data.data.length} intraday prices for stock: ${symbol} (ID: ${stock.stock_id})`);

//         // === UPSERT each intraday row ===
//         for (const item of data.data) {
//             try {
//                 const dateObj = new Date(item.date);
//                 dateObj.setMilliseconds(0);
//                 dateObj.setSeconds(0);

//                 await prisma.intradayPrice3.upsert({
//                     where: {
//                         stockId_date: {
//                             stockId: stock.stock_id,
//                             date: dateObj
//                         }
//                     },
//                     update: {
//                         openPrice: item.open,
//                         highPrice: item.high,
//                         lowPrice: item.low,
//                         closePrice: item.close,
//                         volume: item.volume
//                     },
//                     create: {
//                         stockId: stock.stock_id,
//                         date: dateObj,
//                         openPrice: item.open,
//                         highPrice: item.high,
//                         lowPrice: item.low,
//                         closePrice: item.close,
//                         volume: item.volume
//                     }
//                 });
//             } catch (err) {
//                 console.error(`Failed to upsert intraday price for ${symbol} at ${item.date}:`, err);
//             }
//         }

//         // === Format OHLC list for your chart ===
//         const ohlcData = data.data.map(item => ({
//             date: item.date,
//             openPrice: item.open,
//             highPrice: item.high,
//             lowPrice: item.low,
//             closePrice: item.close
//         }));

//         // === 🔥 Compute start/end + changes ===
//         const first = data.data[0];
//         const last = data.data[data.data.length - 1];

//         const startPrice = first.close;
//         const endPrice = last.close;

//         const difference = endPrice - startPrice;
//         const percentageChange = (difference / startPrice) * 100;

//         // === Return everything nicely ===
//         return {
//             ohlc: ohlcData,
//             startPrice,
//             endPrice,
//             difference,         // numeric increase/decrease
//             percentageChange    // % increase/decrease
//         };

//     } catch (err) {
//         console.error('Error fetching intraday data:', err);
//         throw err;
//     }
// };




/////////////////////////////////////////
// POLYGON
/////////////////////////////////////////

module.exports.getIntradayData = async function (symbol, dateFrom, dateTo) {
  if (!symbol) throw new Error('Stock symbol is required.');

  // Default to past 7 days
  const now = new Date();
  const defaultTo = dateTo || now.toISOString().split('T')[0];
  const defaultFrom =
    dateFrom ||
    new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

  const url =
    `https://api.polygon.io/v2/aggs/ticker/${symbol}` +
    `/range/15/minute/${defaultFrom}/${defaultTo}` +
    `?adjusted=true&sort=asc&limit=5000&apiKey=${POLYGON_API_KEY}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Polygon API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      throw new Error('No OHLC data found for this symbol.');
    }

    // Upsert stock
    const stock = await prisma.stock.upsert({
      where: { symbol },
      update: {},
      create: { symbol }
    });

    console.log(
      `Processing ${data.results.length} OHLC bars for ${symbol} (ID: ${stock.stock_id})`
    );

    // === UPSERT bars ===
    for (const bar of data.results) {
      try {
        const dateObj = new Date(bar.t); // unix ms
        dateObj.setMilliseconds(0);
        dateObj.setSeconds(0);

        await prisma.intradayPrice3.upsert({
          where: {
            stockId_date: {
              stockId: stock.stock_id,
              date: dateObj
            }
          },
          update: {
            openPrice: bar.o,
            highPrice: bar.h,
            lowPrice: bar.l,
            closePrice: bar.c,
            volume: bar.v
          },
          create: {
            stockId: stock.stock_id,
            date: dateObj,
            openPrice: bar.o,
            highPrice: bar.h,
            lowPrice: bar.l,
            closePrice: bar.c,
            volume: bar.v
          }
        });
      } catch (err) {
        console.error(
          `Failed to upsert bar for ${symbol} at ${bar.t}:`,
          err
        );
      }
    }

    // === Format OHLC for charts ===
    const ohlcData = data.results.map(bar => ({
      date: new Date(bar.t).toISOString(),
      openPrice: bar.o,
      highPrice: bar.h,
      lowPrice: bar.l,
      closePrice: bar.c
    }));

    // === Price change calculation ===
    const first = data.results[0];
    const last = data.results[data.results.length - 1];

    const startPrice = first.c;
    const endPrice = last.c;
    const difference = endPrice - startPrice;
    const percentageChange = (difference / startPrice) * 100;

    return {
      ohlc: ohlcData,
      startPrice,
      endPrice,
      difference,
      percentageChange
    };
  } catch (err) {
    console.error('Error fetching Polygon OHLC data:', err);
    throw err;
  }
};




/////////////////////////////////////////
// POLYGON RELATED STOCKS
/////////////////////////////////////////



const BASE_URL = 'https://api.polygon.io';

module.exports.getRelatedTickers = async function (ticker) {
  if (!ticker) throw new Error('Ticker symbol is required.');

  const url = `${BASE_URL}/v1/related-companies/${ticker}?apiKey=${POLYGON_API_KEY}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Polygon API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      return {
        ticker,
        related: [],
      };
    }

    return {
      ticker,
      related: data.results.map(r => r.ticker),
      status: data.status,
      requestId: data.request_id
    };
  } catch (err) {
    console.error(`Error fetching related tickers for ${ticker}:`, err);
    throw err;
  }
};

/////////////////////////////////////////
// POLYGON TOP GAINER/LOSER STOCKS
/////////////////////////////////////////

const MASSIVE_BASE_URL = 'https://api.massive.com';

module.exports.getTopMarketMovers = async function (direction = 'gainers') {
  if (!['gainers', 'losers'].includes(direction)) {
    throw new Error('Invalid direction. Must be "gainers" or "losers".');
  }

  const params = new URLSearchParams({
    apiKey: POLYGON_API_KEY
  });

  const url = `${MASSIVE_BASE_URL}/v2/snapshot/locale/us/markets/stocks/${direction}?${params.toString()}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Market Movers API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.tickers || data.tickers.length === 0) {
      throw new Error('No market movers data found.');
    }

    // 🔥 Normalize response for frontend
    const movers = data.tickers.map(t => ({
      symbol: t.ticker,
      price: t.day?.c ?? null,
      open: t.day?.o ?? null,
      high: t.day?.h ?? null,
      low: t.day?.l ?? null,
      volume: t.day?.v ?? null,
      change: t.todaysChange ?? null,
      changePercent: t.todaysChangePerc ?? null,
      prevClose: t.prevDay?.c ?? null,
      updated: t.updated
    }));

    return {
      direction,
      count: movers.length,
      movers
    };
  } catch (err) {
    console.error('Error fetching market movers:', err);
    throw err;
  }
};





  
  

  exports.tradeStock = async (userId, stockId, quantity, tradeType) => {
  console.log("🔹 Running tradeStock...");
  console.log({ userId, stockId, quantity, tradeType });

  return prisma.$transaction(async (tx) => {
    const priceRecord = await tx.intradayPrice3.findFirst({
      where: { stockId },
      orderBy: { date: "desc" },
    });

    if (!priceRecord) throw new Error("No price data found!");

    const price = priceRecord.closePrice;
    const totalAmount = price * quantity;

    console.log("💰 Trade Info =>", { price, totalAmount });

    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("User not found!");

    // 🔹 Fetch or create stock holding row
    let holding = await tx.stockHolding.findUnique({
      where: { userId_stockId: { userId, stockId } },
    });

    if (!holding) {
      // If SELL requested but no holding exists
      if (tradeType === "SELL") {
        throw new Error("You do not own this stock.");
      }

      // If BUY, create a new holding row with 0 qty
      holding = await tx.stockHolding.create({
        data: {
          userId,
          stockId,
          symbol: stockId.toString(),
          currentQuantity: 0,
        },
      });
    }

    // 🔹 VALIDATION: SELL requires enough shares
    if (tradeType === "SELL") {
      if (holding.currentQuantity < quantity) {
        throw new Error(
          `Insufficient shares. You have ${holding.currentQuantity}, but tried to sell ${quantity}.`
        );
      }
    }

    // 🔹 VALIDATION: BUY requires enough wallet balance
    if (tradeType === "BUY" && user.wallet < totalAmount) {
      throw new Error("Insufficient funds to complete this buy order.");
    }

    // 🔹 Update wallet
    let updatedWallet = user.wallet;
    if (tradeType === "BUY") {
      updatedWallet -= totalAmount;
    } else if (tradeType === "SELL") {
      updatedWallet += totalAmount;
    }

    await tx.user.update({
      where: { id: userId },
      data: { wallet: updatedWallet },
    });

    console.log("💼 Wallet updated:", updatedWallet);

    // 🔹 Update holdings table (increase/decrease stock)
    const updatedQuantity =
      tradeType === "BUY"
        ? holding.currentQuantity + quantity
        : holding.currentQuantity - quantity;

    await tx.stockHolding.update({
      where: { userId_stockId: { userId, stockId } },
      data: { currentQuantity: updatedQuantity },
    });

    console.log("📦 Updated StockHolding:", updatedQuantity);

    // 🔹 Create trade record
    const trade = await tx.trade.create({
      data: {
        userId,
        stockId,
        quantity,
        tradeType,
        price,
        totalAmount,
      },
    });

    console.log("DB trade created:", trade.id);

    // 🔹 Send transaction to blockchain
    console.log("Sending transaction to Hardhat blockchain...");
    const txResponse = await ledgerContract.recordTrade(
      stockId.toString(),
      tradeType,
      quantity,
      Math.round(price * 100)
    );

    console.log("Waiting for tx confirmation...");
    const receipt = await txResponse.wait();

    console.log("Blockchain Transaction Mined");
    console.log({
      txHash: receipt.hash,
      gasUsed: receipt.gasUsed.toString(),
      blockNumber: receipt.blockNumber,
    });

    await tx.blockchainTransaction.create({
      data: {
        userId,
        symbol: stockId.toString(),
        tradeType,
        gasUsed: Number(receipt.gasUsed),
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
      },
    });

    console.log("Stored blockchain transaction in DB");

    return {
      success: true,
      message: "Trade completed with blockchain event",
      tradeId: trade.id,
      blockchainTx: receipt.hash,
    };
  });
};

  
  
  
  
  
  module.exports.getCompanyDetails = async function getCompanyDetails(symbol) {
    if (!symbol || typeof symbol !== 'string') {
      throw new Error(`Invalid company symbol: ${symbol}`);
    }
  
    const upperSymbol = symbol.toUpperCase();
  
    try {
      const response = await fetch(
        `https://finnhub.io/api/v1/stock/profile2?symbol=${upperSymbol}&token=${FINNHUB_API_KEY}`
      );
      if (!response.ok) throw new Error(`Finnhub API error: ${response.status}`);
      const data = await response.json();
  
      if (!data || !data.name) {
        throw new Error(`Company data not found on Finnhub for symbol "${upperSymbol}"`);
      }
  
      const companyData = {
        symbol: data.ticker,
        name: data.name,
        country: data.country || null,
        currency: data.currency || null,
        exchange: data.exchange || null,
        founded: data.ipo ? parseInt(data.ipo.split('-')[0]) : null,
        phone: data.phone || null,
        website: data.weburl || null,
        industry: data.finnhubIndustry || null,
        marketCapitalization: data.marketCapitalization || null,
        shareOutstanding: data.shareOutstanding || null,
        logo: data.logo || null,
      };
  
      // First upsert the company
      const company = await prisma.company.upsert({
        where: { symbol: companyData.symbol },
        update: companyData,
        create: companyData,
      });
  
      // Now upsert the stock linked to this company
      const stock = await prisma.stock.upsert({
        where: { symbol: upperSymbol },
        update: {
          company_id: company.id,
          sector: companyData.industry || null,
        },
        create: {
          symbol: upperSymbol,
          company_id: company.id,
          sector: companyData.industry || null,
        },
      });
  
      return { company, stock };
    } catch (error) {
      console.error('Error fetching company details:', error);
      throw error;
    }
  };
  
  
  
  
  
  
  
  
  
  //////// /////////////////////////////////////
  /////////// LIMIT ORDER PRICES
  /////////////////////////////////////////////
  
  
  exports.processLimitOrders = async function processLimitOrders(stockId) {
  if (!stockId) throw new Error("Stock ID is required.");

  const latestPriceRecord = await prisma.intradayPrice3.findFirst({
    where: { stockId },
    orderBy: { date: "desc" },
  });

  if (!latestPriceRecord) {
    console.log("No price data found for this stock.");
    return [];
  }

  const currentPrice = latestPriceRecord.closePrice;
  const now = new Date();
  const sgTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Singapore" }));

  const marketOpen = new Date(sgTime);
  marketOpen.setHours(9, 15, 0, 0);

  const marketClose = new Date(sgTime);
  marketClose.setHours(18, 0, 0, 0);

  const pendingOrders = await prisma.limitOrder.findMany({
    where: { stockId, status: { in: ["PENDING", "DAY ORDER"] } },
  });

  const executedOrders = [];

  for (const order of pendingOrders) {

    // Handle DAY order timing
    if (order.timeframe === "day" && order.status === "PENDING" && now >= marketOpen && now <= marketClose) {
      await prisma.limitOrder.update({
        where: { id: order.id },
        data: { status: "DAY ORDER" }
      });
      order.status = "DAY ORDER";
    }

    if (order.timeframe === "day" && order.status === "PENDING" &&
        (now < marketOpen || now > marketClose)) continue;

    if (order.timeframe === "day" && order.status === "DAY ORDER" && now > marketClose) {
      await prisma.limitOrder.update({
        where: { id: order.id },
        data: { status: "CANCELLED" }
      });
      continue;
    }

    const buyTriggered = order.orderType === "BUY" && currentPrice <= order.limitPrice;
    const sellTriggered = order.orderType === "SELL" && currentPrice >= order.limitPrice;

    if (buyTriggered || sellTriggered) {

      // Mark as executed
      await prisma.limitOrder.update({
        where: { id: order.id },
        data: { status: "EXECUTED" }
      });

      try {
        // 🧾 Execute the trade in DB
        await exports.tradeStock(order.userId, order.stockId, order.quantity, order.orderType);

        // 📈 Update stockholdings
        let holding = await prisma.stockHolding.findUnique({
          where: {
            userId_stockId: {
              userId: order.userId,
              stockId: order.stockId
            }
          }
        });

        // if (!holding) {
        //   // Create new record only for BUY
        //   if (order.orderType === "BUY") {
        //     await prisma.stockHolding.create({
        //       data: {
        //         userId: order.userId,
        //         stockId: order.stockId,
        //         quantity: order.quantity
        //       }
        //     });
        //   } else {
        //     console.error("❌ SELL attempted but user has no holdings.");
        //     continue;
        //   }
        // } else {
          let updatedQty = holding.quantity;

          if (order.orderType === "BUY") {
            updatedQty += order.quantity;
          } else if (order.orderType === "SELL") {
            updatedQty -= order.quantity;
            if (updatedQty < 0) {
              console.error("❌ SELL would result in negative stockholding. Skipping.");
              continue;
            }
          }

          await prisma.stockHolding.update({
            where: { id: holding.id },
            data: { quantity: updatedQty }
          });
        //}

        console.log(`💹 Updated holdings for user ${order.userId}.`);

        // 🪙 Send transaction to blockchain
        let nonce = await provider.getTransactionCount(signer.address);

        const tx = await ledger.recordTrade(
          order.stockId.toString(),
          order.orderType,
          order.quantity,
          Math.floor(currentPrice),
          { nonce }
        );
        await tx.wait();

        console.log(`🧾 Recorded trade on blockchain: TxHash ${tx.hash}`);

      } catch (err) {
        console.error("Error executing limit order:", err);
      }
    }
  }

  return executedOrders;
};

  
  
  

  
  exports.createLimitOrder = async function createLimitOrder(
  userId,
  stockId,
  quantity,
  limitPrice,
  orderType,  // "BUY" or "SELL"
  timeframe,
  status
) {
  if (!userId || !stockId || !quantity || !limitPrice || !orderType || !timeframe || !status) {
    throw new Error("All fields are required.");
  }

  // 🔹 1. Fetch latest price
  const latestPriceRecord = await prisma.intradayPrice3.findFirst({
    where: { stockId },
    orderBy: { date: 'desc' },
    select: { closePrice: true }
  });

  if (!latestPriceRecord) {
    throw new Error("Could not fetch latest market price for the stock.");
  }

  const latestPrice = Number(latestPriceRecord.closePrice);

  // 🔹 2. Fetch user
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found.");

  const totalCost = quantity * parseFloat(limitPrice);

  // ===========================
  // 🔥 BUY LIMIT VALIDATION
  // ===========================
  if (orderType.toUpperCase() === "BUY") {
    
    // Buy limit must be BELOW current market price
    if (limitPrice >= latestPrice) {
      throw new Error(
        `Buy limit price (${limitPrice}) must be *below* current market price (${latestPrice}).`
      );
    }

    // Check wallet balance
    if (user.wallet < totalCost) {
      throw new Error("Insufficient funds to place this buy limit order.");
    }
  }

  // ===========================
  // 🔥 SELL LIMIT VALIDATION
  // ===========================
  if (orderType.toUpperCase() === "SELL") {

    // Sell limit must be ABOVE current market price
    if (limitPrice <= latestPrice) {
      throw new Error(
        `Sell limit price (${limitPrice}) must be *above* current market price (${latestPrice}).`
      );
    }

    // Check StockHolding table
    const holding = await prisma.stockHolding.findUnique({
      where: { userId_stockId: { userId, stockId } }
    });

    if (!holding) {
      throw new Error("You do not own this stock, so you cannot place a sell limit order.");
    }

    if (holding.currentQuantity < quantity) {
      throw new Error(
        `Insufficient shares. You own ${holding.currentQuantity}, but attempted to sell ${quantity}.`
      );
    }
  }

  // ===========================
  // 3️⃣ Create Limit Order
  // ===========================
  return prisma.limitOrder.create({
    data: {
      userId,
      stockId,
      quantity,
      limitPrice,
      orderType,
      timeframe,
      status,
    },
  });
};


  
  
  
  exports.cancelLimitOrder = async function cancelLimitOrder(orderId, userId) {
    if (!orderId || !userId) {
      throw new Error("Order ID and User ID are required.");
    }
  
    // Find the order first
    const order = await prisma.limitOrder.findUnique({
      where: { id: orderId },
    });
  
    // Only allow cancellation if it belongs to the user and is still PENDING
    if (!order || order.userId !== userId || order.status !== 'PENDING') {
      return null;
    }
  
    // Update status to CANCELLED
    return prisma.limitOrder.update({
      where: { id: orderId },
      data: { status: 'CANCELLED' },
    });
  }