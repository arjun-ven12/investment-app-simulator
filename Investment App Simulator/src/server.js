require('dotenv').config();
const app = require('./app'); // Express app
const http = require('http');
const { Server } = require('socket.io');
const { setSocketIO } = require('./socketBroadcast');

const port = process.env.PORT || 3000;
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*", // restrict in production
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

setSocketIO(io);

io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);

  socket.on('join', ({ userId }, ack) => {
    if (!userId) {
      ack && ack({ ok: false, error: 'No userId provided' });
      return;
    }
    const room = `user_${userId}`;
    socket.join(room);
    console.log(`Socket ${socket.id} joined room: ${room}`);
    ack && ack({ ok: true, room });
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected:', socket.id);
  });
});

server.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
