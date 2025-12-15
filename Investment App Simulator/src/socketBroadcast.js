// src/socketBroadcast.js
let ioInstance = null;

function setSocketIO(io) {
  ioInstance = io;
}

function broadcastNewsView(news) {
  if (!ioInstance) return console.warn('Socket not initialized');
  const apiId = news.apiId ? String(news.apiId) : null;
  const id = news.id ? String(news.id) : null;
  console.log('Broadcasting news view:', { apiId, id, views: news.views });
  ioInstance.emit('newsViewUpdated', { id, apiId, views: news.views || 0 });
}

function broadcastReferralUpdate(userId, stats) {
  if (!ioInstance) {
    return console.warn('Socket.io not initialized');
  }
  const room = `user_${userId}`;
  const roomSet = ioInstance.sockets.adapter.rooms.get(room) || new Set();
  console.log(`Broadcasting referral update to room: ${room}`, stats, 'roomCount:', roomSet.size);
  ioInstance.to(room).emit('referralUpdate', stats);
}

function broadcastReferralHistoryUpdate(userId) {
  if (!ioInstance) {
    console.warn("Socket not initialized");
    return;
  }

  const room = `user_${userId}`;
  console.log(`Broadcasting referral history update to room: ${room}`);

  ioInstance.to(room).emit("referralHistoryUpdate");
}

function broadcastPortfolioUpdate(userId) {
  if (!ioInstance) return console.warn('Socket not initialized');
  console.log('Broadcasting portfolio update for user:', userId);

  // Emit to the room for this user
  ioInstance.to(`user_${userId}`).emit('portfolioUpdate');
}


function broadcastTradeHistoryUpdate(userId) {
  if (!ioInstance) return console.warn('Socket not initialized');
  console.log('Broadcasting trade history update for user:', userId);

  // Emit to the room for this user
  ioInstance.to(`user_${userId}`).emit('broadcastTradeHistoryUpdate');
}

function broadcastLimitTradeHistoryUpdate(userId) {
  if (!ioInstance) return console.warn('Socket not initialized');
  console.log('Broadcasting limit trade history update for user:', userId);

  // Emit to the room for this user
  ioInstance.to(`user_${userId}`).emit('broadcastLimitTradeHistoryUpdate');
}

function broadcastfavoriteStock(userId) {
  if (!ioInstance) return console.warn('Socket not initialized');
  console.log('Broadcasting favorite stock update for user:', userId);

  // Emit to the room for this user
  ioInstance.to(`user_${userId}`).emit('broadcastfavoriteStock');
}

function broadcastStopMarketUpdate(userId, updatedTable) {
  if (!ioInstance) return console.warn('Socket not initialized');
  const room = `user_${userId}`;
  console.log(`Broadcasting updated stop-market table to room: ${room}, ${updatedTable.length} orders`);
  ioInstance.to(room).emit('stopMarketUpdate', updatedTable);
}

function broadcastStopLimitUpdate(userId, updatedTable) {
  if (!ioInstance) return console.warn('Socket not initialized');
  const room = `user_${userId}`;
  console.log(`Broadcasting updated stop-limit table to room: ${room}, ${updatedTable.length} orders`);
  ioInstance.to(room).emit('stopLimitUpdate', updatedTable);
}


function broadcastScenarioMarketUpdate(userId, scenarioId, trade) {
  if (!ioInstance) return console.warn('Socket not initialized');
  const room = `scenario_${scenarioId}_user_${userId}`;
  console.log(`📊 Broadcasting Scenario Market Update → ${room}`, trade);
  ioInstance.to(room).emit('scenarioMarketUpdate', trade);
}

function broadcastScenarioLimitUpdate(userId, scenarioId, order) {
  if (!ioInstance) return console.warn('Socket not initialized');
  const room = `scenario_${scenarioId}_user_${userId}`;
  console.log(`📈 Broadcasting Scenario Limit Update → ${room}`, order);
  ioInstance.to(room).emit('scenarioLimitUpdate', order);
}

function broadcastScenarioPortfolioUpdate(userId, scenarioId, portfolio) {
  if (!ioInstance) return console.warn('Socket not initialized');
  const room = `scenario_${scenarioId}_user_${userId}`;
  console.log(`💼 Broadcasting Portfolio Update → ${room}`);
  ioInstance.to(room).emit('scenarioPortfolioUpdate', portfolio);
}

function broadcastChatbotMessage(userId, sessionId, message) {
  if (!ioInstance) return console.warn('Socket not initialized for chatbot broadcast');
  const room = `user_${userId}`;
  console.log(`💬 Broadcasting chatbot message to room: ${room}`);

  ioInstance.to(room).emit("chatbot:newMessage", {
    userId,
    sessionId,
    role: message.role || "assistant",
    content: message.content || "",
  });

}
module.exports = {
  setSocketIO,
  broadcastNewsView,
  broadcastReferralUpdate,
  broadcastPortfolioUpdate,
  broadcastTradeHistoryUpdate,
  broadcastLimitTradeHistoryUpdate,
  broadcastfavoriteStock,
  broadcastReferralHistoryUpdate,
  broadcastStopLimitUpdate,
  broadcastStopMarketUpdate,
  broadcastScenarioMarketUpdate,
  broadcastScenarioLimitUpdate,
  broadcastScenarioPortfolioUpdate,
  broadcastChatbotMessage
};


