// socketBroadcast.js
let ioInstance = null;

function setSocketIO(io) { ioInstance = io; }

// Broadcast a view update. We emit both apiId and internal id (if available)
function broadcastNewsView(news) {
  if (!ioInstance) return console.warn('Socket not initialized');
  const apiId = news.apiId ? String(news.apiId) : null;
  const id = news.id ? String(news.id) : null;
  console.log('Broadcasting news view:', { apiId, id, views: news.views }); // <--- add this
  ioInstance.emit('newsViewUpdated', { id, apiId, views: news.views || 0 });
}


module.exports = {
  setSocketIO,
  broadcastNewsView,
};
