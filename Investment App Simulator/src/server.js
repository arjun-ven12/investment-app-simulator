
require('dotenv').config();
const app = require('./app'); // your express app
const http = require('http');
const { Server } = require('socket.io');
const { setSocketIO } = require('./socketBroadcast'); // new module (below)

const port = process.env.PORT || 3000;
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*", // lock down for production
    methods: ["GET", "POST"]
  }
});

setSocketIO(io);

io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('Socket disconnected:', socket.id);
  });
});

server.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
