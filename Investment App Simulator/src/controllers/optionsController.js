



const optionsModel = require('../models/options');

const { Parser } = require('json2csv'); // make sure json2csv is installed



module.exports.getContractsBySymbol = async (req, res) => {
  try {
    const { symbol } = req.params;
    const contracts = await optionsModel.getContractsBySymbol(symbol);

    return res.status(200).json({ symbol, contracts });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
};



// module.exports.getOptionHistPrices = async (req, res) => {
//   try {
//     const { symbols, timeframe, limit, sort } = req.query;

//     if (!symbols) {
//       return res.status(400).json({ error: 'symbols query parameter is required (comma-separated contract symbols)' });
//     }

//     const symbolList = symbols.split(',').map(s => s.trim());
//     const data = await optionHistPriceModel.getOptionHistPrices(
//       symbolList,
//       timeframe || '1D',
//       limit ? parseInt(limit) : 1000,
//       sort || 'asc'
//     );

//     res.json(data);
//   } catch (error) {
//     console.error('Controller error (option hist prices):', error);
//     res.status(500).json({ error: error.message });
//   }
// };







/////////////////////////////////////////////////////
/// OPTIONS HISTORY BARS - POLYGON API
/////////////////////////////////////////////////////

// module.exports.getOptionOHLCBySymbol = async (req, res) => {
//   try {
//     const { symbol } = req.params;
//     const ohlcData = await optionsModel.getOptionOHLCBySymbol(symbol);

//     return res.status(200).json({ symbol, ohlcData });
//   } catch (error) {
//     console.error(error);
//     return res.status(500).json({ error: error.message });
//   }
//   };


  module.exports.getOptionOHLCBySymbol = async (req, res) => {
  try {
    const { symbol } = req.params;
    if (!symbol) {
      return res.status(400).json({ error: 'Symbol is required' });
    }

    const savedData = await optionsModel.getOptionOHLCBySymbol(symbol);
    return res.status(200).json({ symbol, savedData });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
};





////////////////////////////////////////////////////
//// PLACE BUY CALL - MARKET/LIMIT ORDER
////////////////////////////////////////////////////

module.exports.placeBuyCallOrder = async (req, res) => {
  try {
    const { userId, contractId, symbol, quantity, price, orderType } = req.body;

    const result = await optionsModel.placeBuyCallOrder({ userId, contractId, symbol, quantity, price, orderType });

    return res.status(200).json({
      message: result.executed
        ? 'Buy Call Market Order executed successfully.'
        : 'Buy Call Limit Order placed successfully (pending execution).',
      trade: result.trade,
      executed: result.executed
    });
  } catch (error) {
    console.error(error);
    return res.status(400).json({ error: error.message });
  }
};

// Execute pending limit buy calls (call this when updating market price)


module.exports.executePendingLimitCalls = async (req, res) => {
  try {
    const executedOrders = await optionsModel.executePendingLimitCalls();

    return res.status(200).json({
      message: `${executedOrders.length} buy call limit orders executed.`,
      executedOrders
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
};


// Settle Buy Call (Market or Limit when price condition met)
module.exports.settleExpiredBuyCallTrades = async (req, res) => {
  try {
    const settledTrades = await optionsModel.settleExpiredBuyCallTrades();
    return res.status(200).json({
      message: `${settledTrades.length} expired Buy Call trades settled.`,
      settledTrades
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
};















//////////////////////////////////////////////////
//// SELL CALL - MARKET/LIMIT ORDER
//////////////////////////////////////////////////

// Place Sell Call
module.exports.placeSellCallOrder = async (req, res) => {
  try {
    const { userId, contractId, symbol, quantity, price, orderType } = req.body;

    const result = await optionsModel.placeSellCallOrder({ userId, contractId, symbol, quantity, price, orderType });

    return res.status(200).json({
      message: result.executed
        ? 'Sell Call Market Order executed successfully.'
        : 'Sell Call Limit Order placed successfully (pending execution).',
      trade: result.trade,
      executed: result.executed
    });
  } catch (error) {
    console.error(error);
    return res.status(400).json({ error: error.message });
  }
};

// Execute Sell Call LIMIT orders
module.exports.executeSellCallLimitOrders = async (req, res) => {
  try {
    // Just call the model function, no params needed
    const executedOrders = await optionsModel.executeSellCallLimitOrders();

    return res.status(200).json({
      message: `${executedOrders.length} sell call limit orders executed.`,
      executedOrders
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
};


// Settle Sell Call (at expiration)
module.exports.settleExpiredSellCallTrades = async (req, res) => {
  try {
    const settledTrades = await optionsModel.settleExpiredSellCallTrades();

    return res.status(200).json({
      message: `${settledTrades.length} expired SELL CALL trades settled.`,
      settledTrades
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
};













////////////////////////////////////////////////////
//// PLACE BUY PUT - MARKET/LIMIT ORDER
////////////////////////////////////////////////////



// Place Buy Put (Market or Limit)
module.exports.placeBuyPutOrder = async (req, res) => {
  try {
    const { userId, contractId, quantity, price, orderType } = req.body;

    if (!contractId) {
      return res.status(400).json({ error: 'Missing contract ID' });
    }

    const result = await optionsModel.placeBuyPutOrder({
      userId,
      contractId, // keep it as string
      quantity,
      price,
      orderType
    });

    return res.status(200).json({
      message: result.executed
        ? 'Buy Put Market Order executed successfully.'
        : 'Buy Put Limit Order placed successfully (pending execution).',
      trade: result.trade,
      executed: result.executed
    });
  } catch (error) {
    console.error(error);
    return res.status(400).json({ error: error.message });
  }
};

// Execute all pending Buy Put LIMIT orders
module.exports.executeBuyPutLimitOrders = async (req, res) => {
  try {
    const executedOrders = await optionsModel.executeBuyPutLimitOrders();

    return res.status(200).json({
      message: `${executedOrders.length} buy put limit orders executed.`,
      executedOrders
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
};

// Settle a Buy Put at expiration
module.exports.settleBuyPutOrders = async (req, res) => {
  try {
    const settledTrades = await optionsModel.settleBuyPutOrders();

    return res.status(200).json({
      message: `${settledTrades.length} Buy Put trades settled.`,
      settledTrades
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
};

















////////////////////////////////////////////////////
//// PLACE SELL PUT - MARKET/LIMIT ORDER
////////////////////////////////////////////////////

module.exports.placeSellPutOrder = async (req, res) => {
  try {
    const { userId, contractId, symbol, quantity, price, orderType } = req.body;

    const result = await optionsModel.placeSellPutOrder({ userId, contractId, symbol, quantity, price, orderType });

    return res.status(200).json({
      message: result.executed
        ? 'Sell Put Market Order executed successfully.'
        : 'Sell Put Limit Order placed successfully (pending execution).',
      trade: result.trade,
      executed: result.executed
    });
  } catch (error) {
    console.error(error);
    return res.status(400).json({ error: error.message });
  }
};



// Execute all pending Sell Put LIMIT orders
module.exports.executeSellPutLimitOrders = async (req, res) => {
  try {
    const executedOrders = await optionsModel.executeSellPutLimitOrders();

    return res.status(200).json({
      message: `${executedOrders.length} sell put limit orders executed.`,
      executedOrders
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
};


// Settle all expired Sell Put MARKET trades
module.exports.settleExpiredSellPutTrades = async (req, res) => {
  try {
    const settledResults = await optionsModel.settleExpiredSellPutTrades();

    return res.status(200).json({
      message: `${settledResults.length} expired sell put trades settled.`,
      settledResults
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
};









////////////////////////////////////////////////////////////////
////// RETRIEVE OPTION TRADE HISTORY
////////////////////////////////////////////////////////////////
exports.getUserOptionTradesController = async function (req, res) {
  const userId = req.query.userId;

  if (!userId) {
    return res.status(400).json({ message: "User ID is required" });
  }

  try {
    const trades = await optionsModel.getUserOptionTrades(userId);

    // Helper function to map orderType to display status
    const mapOrderTypeToStatus = (trade) => {
      switch (trade.orderType) {
        case "MARKET":
          return trade.totalAmount > 0 ? "MARKET (Executed)" : "MARKET";
        case "LIMIT":
          return "LIMIT (Pending)";
        case "CANCELLED":
          return "CANCELLED";
        default:
          return trade.orderType;
      }
    };

    const formattedTrades = trades.map((t) => ({
      id: t.id,
      date: t.tradeDate,
      contractSymbol: t.contract.symbol,
      side: t.tradeType,
      type: t.contract.type,
      status: mapOrderTypeToStatus(t),
      quantity: t.quantity,
      price: t.price,
      totalAmount: t.totalAmount,
      strikePrice: t.contract.strikePrice,
      expirationDate: t.contract.expirationDate,
      underlyingSymbol: t.contract.underlyingSymbol,
    }));

    return res.status(200).json({ trades: formattedTrades });
  } catch (error) {
    console.error("Error fetching option trades:", error);
    return res.status(500).json({
      message: "Error fetching option trades",
      error: error.message,
    });
  }
};










////////////////////////////////////////////////////////////////
////// OPTIONS PORTFOLIO
////////////////////////////////////////////////////////////////


module.exports.getUserOptionPortfolio = async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }

    const result = await optionsModel.getUserOptionPortfolio(parseInt(userId));
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error retrieving option portfolio:', error);
    return res.status(500).json({ error: error.message });
  }
};






//////////////////////////////////////////////////////////////////
////// CANCEL LIMIT ORDER OPTIONS
//////////////////////////////////////////////////////////////////

exports.cancelOptionLimitOrderController = async function (req, res) {
  try {
    const orderId = parseInt(req.params.id);
    const userId = parseInt(req.query.userId);

    if (!orderId || !userId) {
      return res.status(400).json({ message: "Order ID and User ID are required." });
    }

    console.log("📩 Cancel request received:", { orderId, userId });

    const cancelledOrder = await optionsModel.cancelOptionLimitOrder(orderId, userId);

    if (!cancelledOrder) {
      return res.status(404).json({
        message: "Order not found, not owned by user, or already executed/cancelled.",
      });
    }

    return res.status(200).json({
      message: "✅ Limit order cancelled successfully",
      order: cancelledOrder,
    });
  } catch (error) {
    console.error("❌ Error cancelling limit order:", error);
    return res.status(500).json({
      message: "Error cancelling limit order",
      error: error.message,
    });
  }
};





///////////////////////////////////////////////////////////////////////
////// EXPORT OPTION TRADE HISTORY TO CSV
///////////////////////////////////////////////////////////////////////


exports.exportOptionTradeHistoryController = async function (req, res) {
  const userId = req.query.userId;
  if (!userId) {
    return res.status(400).json({ message: "User ID is required" });
  }

  try {
    const trades = await optionsModel.getUserOptionTrades(userId);

    if (!trades || trades.length === 0) {
      return res.status(404).json({ message: "No option trades found" });
    }

    // Define the CSV fields, including nested contract info
    const fields = [
      'tradeDate',
      'contract.symbol',
      'contract.underlyingSymbol',
      'side',
      'type',
      'status',
      'quantity',
      'price',
      'totalAmount',
      'contract.strikePrice',
      'contract.expirationDate'
    ];

    // Add computed "status" if needed
    const formattedTrades = trades.map(t => ({
      tradeDate: t.tradeDate,
      side: t.tradeType,
      type: t.contract.type,
      status: t.orderType === "MARKET" && t.totalAmount > 0 ? "MARKET (Executed)" : "LIMIT (Pending)",
      quantity: t.quantity,
      price: t.price,
      totalAmount: t.totalAmount,
      contract: {
        symbol: t.contract.symbol,
        underlyingSymbol: t.contract.underlyingSymbol,
        strikePrice: t.contract.strikePrice,
        expirationDate: t.contract.expirationDate
      }
    }));

    const parser = new Parser({ fields });
    const csv = parser.parse(formattedTrades);

    res.header('Content-Type', 'text/csv');
    res.attachment(`option_trade_history_user_${userId}.csv`);
    return res.send(csv);
  } catch (err) {
    console.error("Error exporting option trades:", err);
    return res.status(500).json({ message: "Error exporting option trade history", error: err.message });
  }
};
