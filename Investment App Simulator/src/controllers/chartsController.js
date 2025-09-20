
const chartsModel = require('../models/Charts');

const { Parser } = require('json2csv');



module.exports.getStockChartData = function (req, res) {
    const stockSymbol = req.params.symbol;
    const timeFrame = req.query.timeFrame || 'weekly'; 

    return chartsModel
        .getStockChartData(stockSymbol, timeFrame)
        .then(function (chartData) {
            return res.status(200).json(chartData);
        })
        .catch(function (error) {
            console.error(error);

            if (error.message === 'Stock not found') {
                return res.status(404).json({ error: error.message });
            }

            return res.status(500).json({ error: error.message });
        });
};


module.exports.getCompanyDetails = function (req, res) {
    const companySymbol = req.params.symbol;

    return chartsModel
        .getCompanyDetails(companySymbol)
        .then(function (companyDetails) {
            return res.status(200).json(companyDetails);
        })
        .catch(function (error) {
            console.error(error);

            if (error.message.includes('not found')) {
                return res.status(404).json({ error: error.message });
            }

            return res.status(500).json({ error: error.message });
        });
};


module.exports.tradeStock = async function (req, res) {
    const { userId, stockId, quantity, tradeType } = req.body;

    try {
        const tradeData = await chartsModel.tradeStock(userId, stockId, quantity, tradeType);

        // Emit update to that user's channel
        const io = req.app.get('io');
        io.to(`user_${userId}`).emit('portfolioUpdate', tradeData);
        io.to(`user_${userId}`).emit('broadcastTradeHistoryUpdate', tradeData);

        return res.status(200).json(tradeData);
    } catch (error) {
        console.error(error);

        if (error.message === 'Insufficient funds') {
            return res.status(400).json({ error: error.message });
        }

        return res.status(500).json({ error: error.message });
    }
};


module.exports.getLatestPrice = function (req, res) {
    const  stockId  = req.params.stock_id;


    return chartsModel
        .getLatestPrice(parseInt(stockId))
        .then(function (latestPrice) {
            return res.status(200).json({ price: latestPrice });
        })
        .catch(function (error) {
            console.error('Error fetching latest price:', error);

            if (error.message === 'No price data available for this stock') {
                return res.status(404).json({ error: error.message });
            }

            return res.status(500).json({ error: 'An error occurred while fetching the price.' });
        });
};





module.exports.getStockIdBySymbol = function (req, res) {
    const symbol = req.params.symbol;

    if (!symbol) {
        return res.status(400).json({ error: 'Symbol is required.' });
    }

    return chartsModel
        .getStockIdBySymbol(symbol.toUpperCase()) 
        .then(function (stockId) {
            return res.status(200).json({ stock_id: stockId });
        })
        .catch(function (error) {
            console.error('Error fetching stock ID:', error);

            if (error.message === 'Stock not found') {
                return res.status(404).json({ error: error.message });
            }

            return res.status(500).json({ error: 'An error occurred while fetching the stock ID.' });
        });
};





const { broadcastPortfolioUpdate } = require('../socketBroadcast');

module.exports.getUserPortfolio = async function (req, res) {
    const userId = Number(req.params.userId);

    if (!Number.isInteger(userId)) {
        return res.status(400).json({ error: 'Invalid user ID.' });
    }

    try {
        const portfolio = await chartsModel.getUserPortfolio(userId);


        return res.status(200).json(portfolio);
    } catch (error) {
        console.error('Error fetching user portfolio:', error);

        if (error.message?.includes('not found')) {
            return res.status(404).json({ error: error.message });
        }

        return res.status(500).json({ error: error.message || 'Server error' });
    }
};


module.exports.getAllStocks = function (req, res) {
    return chartsModel
        .getAllStocks()
        .then(function (stocks) {
            if (!stocks || stocks.length === 0) {
                return res.status(404).json({ message: "No stocks found" });
            }
            return res.status(200).json(stocks);
        })
        .catch(function (error) {
            console.error(error);
            return res.status(500).json({ error: error.message || 'Internal Server Error' });
        });
};


module.exports.getAllFavoriteStocks = function (req, res) {
    const userId = req.query.userId || req.body.userId;

    if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
    }

    return chartsModel
        .getAllFavoriteStocks(userId)
        .then(function (stocks) {
            if (!stocks || stocks.length === 0) {
                return res.status(404).json({ message: "No favorite stocks found" });
            }
            return res.status(200).json(stocks);
        })
        .catch(function (error) {
            console.error(error);
            return res.status(500).json({ error: error.message || 'Internal Server Error' });
        });
};

module.exports.toggleFavorite = function (req, res) {
    const { userId } = req.body;
    const stockId = parseInt(req.params.stockId);

    if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
    }

    return chartsModel
        .toggleFavorite(userId, stockId)
        .then(function (result) {
            return res.status(200).json({ success: true, result });
        })
        .catch(function (error) {
            console.error(error);
            return res.status(500).json({ error: error.message || 'Internal Server Error' });
        });
};





///////////////////////////////////////////
/////////////////////////// CA2
///////////////////////////////////////////




//////////////////////////////////////////////////
/////////// Search Functionality
//////////////////////////////////////////////////


// Controller for searching stocks
exports.searchStocksController = function (req, res) {
    const query = req.query.query;
  
    if (!query) {
      return res.status(400).json({ message: "Search query is required" });
    }
  
    return chartsModel
      .searchStocks(query)
      .then((searchResults) => {
        if (searchResults && searchResults.length > 0) {
          return res.status(200).json({ message: "Stocks found", stocks: searchResults });
        } else {
          return res.status(404).json({ message: "No stocks found" });
        }
      })
      .catch((error) => {
        console.error("Error fetching stock symbols:", error);
        return res.status(500).json({ message: "Error fetching stock symbols", error });
      });
  };




//////////////////////////////////////////////////
/////////// Favorite for stock api Functionality
//////////////////////////////////////////////////

  
  // // Controller for favoriting a stock
  // exports.favoriteStockController = function (req, res) {
  //   const { userId, symbol } = req.body;
  
  //   if (!userId || !symbol) {
  //     return res.status(400).json({ message: "User ID and stock symbol are required" });
  //   }

  //       const io = req.app.get('io');
  //   io.to(`user_${userId}`).emit('broadcastfavoriteStock', stockFavoritedData);
  
  //   return chartsModel
  //     .favoriteStock(userId, symbol)
  //     .then((favorite) => {
  //       return res.status(201).json({ success: true, message: "Stock favorited successfully", favorite });
  //     })
  //     .catch((error) => {
  //       console.error("Error favoriting stock:", error);
  //       return res.status(500).json({ success: false, message: "Error favoriting stock", error });
  //     });
  // };
  
  // Controller for favoriting a stock
exports.favoriteStockController = function (req, res) {
  const { userId, symbol } = req.body;

  if (!userId || !symbol) {
    return res.status(400).json({ message: "User ID and stock symbol are required" });
  }

  chartsModel
    .favoriteStock(userId, symbol)
    .then((favorite) => {
      // After success, emit to the user-specific room
      const io = req.app.get('io');
      io.to(`user_${userId}`).emit('broadcastfavoriteStock', favorite);

      return res.status(201).json({ 
        success: true, 
        message: "Stock favorited successfully", 
        favorite 
      });
    })
    .catch((error) => {
      console.error("Error favoriting stock:", error);
      return res.status(500).json({ 
        success: false, 
        message: "Error favoriting stock", 
        error 
      });
    });
};



  exports.getFavoriteStocksController = function (req, res) {
    const userId = req.query.userId;
    
    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }
    
    return chartsModel
      .getFavoriteStocks(Number(userId))
      .then((favorites) => {
        return res.status(200).json({ favorites });
      })
      .catch((error) => {
        console.error("Error fetching favorite stocks:", error);
        return res.status(500).json({ message: "Error fetching favorite stocks", error });
      });
  };



exports.unfavoriteStockController = function (req, res) {
  const userId = req.query.userId;
  const symbol = req.query.symbol;
  
  if (!userId || !symbol) {
    return res.status(400).json({ message: "User ID and stock symbol are required" });
  }
  
  chartsModel.unfavoriteStock(userId, symbol)
    .then((result) => {
      // deleteMany returns an object with a 'count' property
      if (result.count > 0) {
        return res.status(200).json({ message: "Stock unfavorited successfully" });
      } else {
        return res.status(404).json({ message: "Favorite not found" });
      }
    })
    .catch((error) => {
      console.error("Error unfavoriting stock:", error);
      return res.status(500).json({ message: "Error unfavoriting stock", error: error.message });
    });
};


//////////////////////////////////////////////////
/////////// Limit Orders Functionality
//////////////////////////////////////////////////



// // Controller for creating a limit order
// exports.createLimitOrderController = function (req, res) {
//     const { userId, stockId, quantity, limitPrice, orderType } = req.body;

//     if (!userId || !stockId || !quantity || !limitPrice || !orderType) {
//         return res.status(400).json({ message: "All fields are required." });
//     }
//     const userIdInt = parseInt(userId)

//     return chartsModel
//         .createLimitOrder(userIdInt, stockId, quantity, limitPrice, orderType)
//         .then((limitOrder) => {
//             return res.status(201).json({ message: "Limit order created successfully", limitOrder });
//         })
//         .catch((error) => {
//             console.error("Error creating limit order:", error);
//             return res.status(500).json({ message: "Error creating limit order", error });
//         });
// };

  
//   // Controller for processing limit orders
//   exports.processLimitOrdersController = function (req, res) {
//     const { stockId, currentPrice } = req.body;

//     if (!stockId || !currentPrice) {
//         return res.status(400).json({ message: "Stock ID and current price are required." });
//     }

//     return chartsModel
//         .processLimitOrders(stockId, currentPrice)
//         .then((executedOrders) => {
//             return res.status(200).json({ message: "Limit orders processed", executedOrders });
//         })
//         .catch((error) => {
//             console.error("Error processing limit orders:", error);
//             return res.status(500).json({ message: "Error processing limit orders", error });
//         });
// };



// Create limit order
exports.createLimitOrderController = async function (req, res) {
  const { userId, stockId, quantity, limitPrice, orderType } = req.body;

  if (!userId || !stockId || !quantity || !limitPrice || !orderType) {
    return res.status(400).json({ message: "All fields are required." });
  }

  try {
    const userIdInt = parseInt(userId);

    // Create the limit order in DB
    const limitOrder = await chartsModel.createLimitOrder(
      userIdInt,
      stockId,
      quantity,
      limitPrice,
      orderType
    );

    // Emit websocket update AFTER the limit order is successfully created
    const io = req.app.get('io');
    io.to(`user_${userIdInt}`).emit('broadcastLimitTradeHistoryUpdate', limitOrder);

    return res
      .status(201)
      .json({ message: "Limit order created successfully", limitOrder });
  } catch (error) {
    console.error("Error creating limit order:", error);
    return res
      .status(500)
      .json({ message: "Error creating limit order", error });
  }
};


// Process limit orders — now it fetches latest price automatically
exports.processLimitOrdersController = function (req, res) {
    const { stockId } = req.body;

    if (!stockId) {
        return res.status(400).json({ message: "Stock ID is required." });
    }

    return chartsModel
        .processLimitOrders(stockId)
        .then((executedOrders) => {
            return res.status(200).json({ message: "Limit orders processed", executedOrders });
        })
        .catch((error) => {
            console.error("Error processing limit orders:", error);
            return res.status(500).json({ message: "Error processing limit orders", error });
        });
};





//////////////////////////////////////////////////
/////////// Stock Comments Functionality
//////////////////////////////////////////////////






// Add a new comment
exports.addCommentController = function (req, res) {
  const { userId, stockSymbol, content } = req.body;

  if (!userId || !stockSymbol || !content) {
    return res.status(400).json({ message: 'User ID, stock symbol, and comment content are required' });
  }

  chartsModel.addComment({ userId, stockSymbol, content })
    .then((comment) => {
      return res.status(201).json({ message: 'Comment added successfully', comment });
    })
    .catch((error) => {
      console.error('Error adding comment:', error);
      return res.status(500).json({ message: 'Error adding comment', error });
    });
};


// Get comments for a stock symbol
exports.getCommentsController = function (req, res) {
  const stockSymbol = req.query.stockSymbol;

  if (!stockSymbol) {
    return res.status(400).json({ message: 'Stock symbol is required' });
  }

  chartsModel.getCommentsByStock(stockSymbol)
    .then((comments) => {
      return res.status(200).json({ comments });
    })
    .catch((error) => {
      console.error('Error fetching comments:', error);
      return res.status(500).json({ message: 'Error fetching comments', error });
    });
};

// Update a comment
exports.updateCommentController = function (req, res) {
  const commentId = req.params.commentId;
  const { content } = req.body;

  if (!commentId || !content) {
    return res.status(400).json({ message: 'Comment ID and new content are required' });
  }

  chartsModel.updateComment(commentId, content)
    .then((updatedComment) => {
      return res.status(200).json({ message: 'Comment updated successfully', updatedComment });
    })
    .catch((error) => {
      console.error('Error updating comment:', error);
      return res.status(500).json({ message: 'Error updating comment', error });
    });
};

// Delete a comment
exports.deleteCommentController = function (req, res) {
  const commentId = req.params.commentId;

  if (!commentId) {
    return res.status(400).json({ message: 'Comment ID is required' });
  }

  chartsModel.deleteComment(commentId)
    .then((deletedComment) => {
      return res.status(200).json({ message: 'Comment deleted successfully', deletedComment });
    })
    .catch((error) => {
      console.error('Error deleting comment:', error);
      return res.status(500).json({ message: 'Error deleting comment', error });
    });
};






exports.incrementCommentViewController = function (req, res) {
  const commentId = req.params.id;
  if (!commentId) {
    return res.status(400).json({ message: "Comment id is required" });
  }
  
  chartsModel.incrementCommentView(commentId)
    .then(newViewCount => {
      return res.status(200).json({ message: "View count updated", viewCount: newViewCount });
    })
    .catch(error => {
      console.error("Error in incrementCommentViewController:", error);
      return res.status(500).json({ message: "Error updating view count", error: error.message });
    });
};





//////////////////////////////////////////////////
/////////// Market Status Functionality
//////////////////////////////////////////////////


exports.getMarketStatusController = function (req, res) {
  // Use the exchange from the query if provided, otherwise default to SGX
  const exchange = req.query.exchange || "US";

  chartsModel
    .getMarketStatus(exchange)
    .then((status) => res.status(200).json(status))
    .catch((error) => {
      console.error("Error in getMarketStatusController:", error);
      return res.status(500).json({ message: "Error fetching market status", error: error.message });
    });
};



//////////////////////////////////////////////////
/////////// Recommendations Functionality
//////////////////////////////////////////////////


exports.getRecommendationsController = function (req, res) {
  const symbol = req.query.symbol;
  if (!symbol) {
    return res.status(400).json({ message: "Stock symbol is required" });
  }
  
  chartsModel.getStockRecommendations(symbol)
    .then(recommendations => {
      return res.status(200).json(recommendations);
    })
    .catch(error => {
      console.error("Error in getRecommendationsController:", error);
      return res.status(500).json({ message: "Error retrieving recommendations", error: error.message });
    });
};





//////////////////////////////////////////////////
/////////// Retrieve trades Functionality
//////////////////////////////////////////////////



exports.getUserTradesController = function (req, res) {
  const userId = req.query.userId;
  if (!userId) {
    return res.status(400).json({ message: "User ID is required" });
  }
  chartsModel.getUserTrades(userId)
    .then((trades) => {
      return res.status(200).json({ trades });
    })
    .catch((error) => {
      console.error("Error fetching trades:", error);
      return res.status(500).json({ message: "Error fetching trades", error: error.message });
    });
};




exports.getUserLimitOrdersController = function (req, res) {
  const userId = req.query.userId;
  if (!userId) {
    return res.status(400).json({ message: "User ID is required" });
  }
  chartsModel.getUserLimitOrders(userId)
    .then((limitOrders) => {
      return res.status(200).json({ limitOrders });
    })
    .catch((error) => {
      console.error("Error fetching limit orders:", error);
      return res.status(500).json({ message: "Error fetching limit orders", error: error.message });
    });
};


// export to csv


exports.exportTradeHistoryController = function (req, res) {
  const userId = req.query.userId;
  if (!userId) {
    return res.status(400).json({ message: "User ID is required" });
  }
 
 
  chartsModel.getUserTrades(userId)
    .then(trades => {
      // Define the fields to include in the CSV. You can customize this list.
      const fields = [
        'tradeDate',
        'stock.symbol', // using dot notation to extract the stock symbol from the included relation
        'tradeType',
        'quantity',
        'price',
        'totalAmount'
      ];
      const opts = { fields };
      try {
        const parser = new Parser(opts);
        const csv = parser.parse(trades);
        res.header('Content-Type', 'text/csv');
        res.attachment(`trade_history_user_${userId}.csv`);
        return res.send(csv);
      } catch (err) {
        console.error("Error converting trades to CSV:", err);
        return res.status(500).json({ message: "Error exporting trade history" });
      }
    })
    .catch(error => {
      console.error("Error exporting trades:", error);
      res.status(500).json({ message: "Error exporting trade history", error: error.message });
    });
 };
 



 

 // export to csv limit order


 exports.exportLimitOrderHistoryController = function (req, res) {
  const userId = req.query.userId;
  if (!userId) {
    return res.status(400).json({ message: "User ID is required" });
  }

  chartsModel.getUserLimitOrders(userId)
    .then(limitOrders => {
      // Define the fields to include in the CSV.
      const fields = [
        'createdAt',             // The date the limit order was created.
        'stock.symbol',          // Stock symbol from the related Stock record.
        'orderType',             // "BUY" or "SELL"
        'quantity',
        'limitPrice',
        'status'
      ];
      const opts = { fields };
      try {
        const parser = new Parser(opts);
        const csv = parser.parse(limitOrders);
        res.header('Content-Type', 'text/csv');
        res.attachment(`limit_order_history_user_${userId}.csv`);
        return res.send(csv);
      } catch (err) {
        console.error("Error converting limit orders to CSV:", err);
        return res.status(500).json({ message: "Error exporting limit order history" });
      }
    })
    .catch(error => {
      console.error("Error exporting limit orders:", error);
      res.status(500).json({ message: "Error exporting limit order history", error: error.message });
    });
};









//// retrieve latest limit order

exports.getLatestLimitOrderControllerBuy = function (req, res) {

  chartsModel.getLatestLimitOrderBuy()
    .then((latestOrder) => {
      if (!latestOrder) {
        return res.status(404).json({ message: "No limit orders found" });
      }
      return res.status(200).json(latestOrder);
    })
    .catch((error) => {
      console.error("Error in getLatestLimitOrderController:", error);
      return res.status(500).json({ message: "Error fetching latest limit order", error: error.message });
    });
};


exports.getLatestLimitOrderControllerSell = function (req, res) {

  chartsModel.getLatestLimitOrderSell()
    .then((latestOrder) => {
      if (!latestOrder) {
        return res.status(404).json({ message: "No limit orders found" });
      }
      return res.status(200).json(latestOrder);
    })
    .catch((error) => {
      console.error("Error in getLatestLimitOrderController:", error);
      return res.status(500).json({ message: "Error fetching latest limit order", error: error.message });
    });
};



//////////////////////////////////////////////////
/////////// REALTIME QUOTE Functionality
//////////////////////////////////////////////////



module.exports.getStockChartRealData = async function (req, res) {
    const symbol = req.params.symbol;
    // const interval = req.query.interval;
    const dateFrom = req.query.date_from;
    const dateTo = req.query.date_to;

    try {
        const chartData = await chartsModel.getIntradayData(symbol, dateFrom, dateTo);
        return res.status(200).json(chartData);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: error.message });
    }
};
