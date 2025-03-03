const { parse } = require('path');
const prisma = require('./prismaClient');

const fetch = require("node-fetch");
const FINNHUB_API_KEY = "cua8sqhr01qkpes4fvrgcua8sqhr01qkpes4fvs0"; 


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



module.exports.getCompanyDetails = function getCompanyDetails(symbol) {
    if (!symbol || typeof symbol !== 'string') {
        throw new Error(`Invalid company symbol: ${symbol}`);
    }

    return prisma.company
        .findUnique({
            where: { symbol: symbol.toUpperCase() }, 
        })
        .then(company => {
            if (!company) {
                throw new Error(`Company with symbol "${symbol}" not found`);
            }

            return {
                id: company.id,
                symbol: company.symbol,
                name: company.name,
                founded: company.founded,
                employees: company.employees,
                address: company.address,
                city: company.city,
                country: company.country,
                zipCode: company.zipCode,
                phone: company.phone,
                website: company.website,
                description: company.description,
            };
        })
        .catch(error => {
            console.error('Error fetching company details:', error);
            throw error;
        });
};




module.exports.tradeStock = async function tradeStock(userId, stockId, quantity, price, tradeType) {
    if (!userId || !stockId || !quantity || !price || !tradeType) {
        throw new Error('Missing required trade data.');
    }

    const totalAmount = quantity * price;

    // function isMarketOpen() {
    //     const now = new Date();
    //     const currentHour = now.getHours();
    //     const currentMinute = now.getMinutes();

    //     //setting market hours
    //     const marketOpen = { hour: 9, minute: 00 }; 
    //     const marketClose = { hour: 23, minute: 50 }; 

    //     // Check if current time is within market hours
    //     if (
    //         currentHour < marketOpen.hour ||
    //         (currentHour === marketOpen.hour && currentMinute < marketOpen.minute) || 
    //         currentHour > marketClose.hour ||
    //         (currentHour === marketClose.hour && currentMinute > marketClose.minute) 
    //     ) {
    //         return false;
    //     }
    //     return true;
    // }

    // if (!isMarketOpen()) {
    //     throw new Error('Trading is allowed only between 9:30 AM and 3:30 PM.');
    // }

    const user = await prisma.user.findUnique({
        where: { id: userId },
    });

    if (!user) {
        throw new Error(`User with ID ${userId} not found`);
    }

    // Check for sufficient funds 
    if (tradeType === 'BUY' && user.wallet < totalAmount) {
        throw new Error('Insufficient funds');
    }

    // SELL - checking quanity
    if (tradeType === 'SELL') {
        const netStockQuantity = await prisma.trade.aggregate({
            where: { userId, stockId },
            _sum: { quantity: true },
        });

        const ownedQuantity = netStockQuantity._sum.quantity || 0; 

        if (ownedQuantity < quantity) {
            throw new Error('Insufficient stock quantity to sell');
        }
    }

    const newWalletBalance =
        tradeType === 'BUY' ? user.wallet - totalAmount : user.wallet + totalAmount;

    // Create trade and update wallet
    return prisma.$transaction([
        prisma.trade.create({
            data: {
                userId,
                stockId,
                quantity: tradeType === 'BUY' ? quantity : -quantity, 
                price,
                totalAmount,
                tradeType,
            },
        }),
        prisma.user.update({
            where: { id: userId },
            data: { wallet: newWalletBalance },
        }),
    ])
        .then(([trade]) => ({
            message: `${tradeType} trade successful`,
            trade,
            wallet: newWalletBalance,
        }))
        .catch((error) => {
            console.error('Error processing trade:', error);
            throw error;
        });
};



module.exports.getLatestPrice = function getLatestPrice(stockId) {
    if (!stockId) {
        throw new Error('Stock ID is required.');
    }

    return prisma.histPrice
        .findFirst({
            where: { stock_id: stockId },
            orderBy: { date: 'desc' },
            select: { close_price: true },
        })
        .then(function (latestPrice) {
            if (!latestPrice) {
                throw new Error('No price data available for this stock');
            }

            return latestPrice.close_price;
        })
        .catch(function (error) {
            console.error('Error fetching latest price:', error);
            throw error;
        });
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
    if (!userId || typeof userId !== 'number') {
        throw new Error(`Invalid user ID: ${userId}`);
    }

    // 1. Fetch all trades for the user
    const userTrades = await prisma.trade.findMany({
        where: { userId },
        select: {
            stockId: true,
            quantity: true,    // Positive for both BUY and SELL in your system
            totalAmount: true, // Positive for both BUY and SELL
            tradeType: true    // 'BUY' or 'SELL'
        }
    });

    if (!userTrades || userTrades.length === 0) {
        return [];
    }

    // 2. Group trades by stockId
    const stockMap = new Map(); // { stockId => { buyQuantity, buyAmount, sellQuantity, sellAmount } }

    // 3. Accumulate BUY vs SELL data
    for (const trade of userTrades) {
        const { stockId, quantity, totalAmount, tradeType } = trade;

        // Initialize the group record if missing
        if (!stockMap.has(stockId)) {
            stockMap.set(stockId, {
                buyQuantity: 0,
                buyAmount: 0,
                sellQuantity: 0,
                sellAmount: 0
            });
        }

        const group = stockMap.get(stockId);

        if (tradeType === 'BUY') {
            // BUY trades
            group.buyQuantity += quantity;          // All positive
            group.buyAmount += Number(totalAmount); // All positive
        } else if (tradeType === 'SELL') {
            // SELL trades
            group.sellQuantity += quantity;         // All positive in your system
            group.sellAmount += Number(totalAmount);// All positive
        }
    }

    // 4. Calculate net quantity & amount for each stock, fetch details
    const portfolio = [];

    for (const [stockId, group] of stockMap.entries()) {
        const { buyQuantity, buyAmount, sellQuantity, sellAmount } = group;

        // netQuantity = total buys - total sells
        const netQuantity = buyQuantity + sellQuantity;
        // netAmount = total buyAmount - total sellAmount
        const netAmount = buyAmount - sellAmount;

        // 5. Skip if netQuantity <= 0 (user no longer owns the stock)
        if (netQuantity <= 0) {
            continue;
        }

        // 6. Fetch stock details (symbol, company name)
        const stockDetails = await prisma.stock.findUnique({
            where: { stock_id: stockId },
            select: {
                symbol: true,
                company: { select: { name: true } },
            },
        });

        portfolio.push({
            symbol: stockDetails?.symbol ?? 'UNKNOWN',
            companyName: stockDetails?.company?.name ?? 'UNKNOWN',
            quantity: netQuantity,
            totalAmount: netAmount,
        });
    }

    return portfolio;
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

  return fetch(
    `https://finnhub.io/api/v1/search?q=${encodeURIComponent(query)}&token=${FINNHUB_API_KEY}`
  )
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Finnhub API error: ${response.statusText}`);
      }
      return response.json();
    })
    .then((data) => data.result)
    .catch((error) => {
      console.error("Error fetching stock symbols:", error);
      throw error;
    }
)};




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


// Model for creating a limit order
exports.createLimitOrder = async function createLimitOrder(userId, stockId, quantity, limitPrice, orderType) {
    if (!userId || !stockId || !quantity || !limitPrice || !orderType) {
      throw new Error("All fields (userId, stockId, quantity, limitPrice, orderType) are required.");
    }
  
    return prisma.limitOrder.create({
      data: {
        userId,
        stockId,
        quantity,
        limitPrice,
        orderType,
        status: "PENDING",
      },
    });
  };
  


  

  
exports.processLimitOrders = async function processLimitOrders(stockId, currentPrice) {
    if (!stockId || !currentPrice) {
        throw new Error("Stock ID and current price are required.");
    }

    const pendingOrders = await prisma.limitOrder.findMany({
        where: {
            stockId,
            status: "PENDING",
        },
    });

    const executedOrders = [];

    for (const order of pendingOrders) {
        // Check if the limit condition is met
        if (
            (order.orderType === "BUY" && currentPrice <= order.limitPrice) ||
            (order.orderType === "SELL" && currentPrice >= order.limitPrice)
        ) {
            // Mark the limit order as EXECUTED
            await prisma.limitOrder.update({
                where: { id: order.id },
                data: { status: "EXECUTED" },
            });

            // Instead of creating a trade directly, call tradeStock for wallet logic
            try {
                await exports.tradeStock(
                    order.userId,
                    order.stockId,
                    order.quantity,
                    currentPrice,
                    order.orderType
                );

                // Push the executed order info to the array
                executedOrders.push(order);
            } catch (err) {
                console.error('Error executing limit order trade:', err);
                // Optionally update the order to CANCELLED or revert?
            }
        }
    }

    return executedOrders;
};




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
      // Map the response data to a more explicit object if needed.
      // For example, the API returns data like:
      // {
      //   "exchange": "SGX",
      //   "holiday": null,
      //   "isOpen": false,
      //   "session": "pre-market",
      //   "timezone": "Singapore",
      //   "t": 1697018041
      // }
      // You can transform this data if desired.
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