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

module.exports = {
  setSocketIO,
  broadcastNewsView,
  broadcastReferralUpdate,
};
