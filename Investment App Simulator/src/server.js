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

app.set('io', io);

setSocketIO(io);

// io.on('connection', (socket) => {
//   console.log('Socket connected:', socket.id);

//   socket.on('join', ({ userId }, ack) => {
//     if (!userId) {
//       ack && ack({ ok: false, error: 'No userId provided' });
//       return;
//     }
//     const room = `user_${userId}`;
//     socket.join(room);
//     console.log(`Socket ${socket.id} joined room: ${room}`);
//     ack && ack({ ok: true, room });
//   });

//   socket.on('disconnect', () => {
//     console.log('Socket disconnected:', socket.id);
//   });
// });

io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);

  // Auto-join if userId was passed in query params
  const queryUserId = socket.handshake.query.userId;
  if (queryUserId) {
    const room = `user_${queryUserId}`;
    socket.join(room);
    console.log(`Socket ${socket.id} auto-joined room: ${room}`);
  }

  // Allow explicit join via "join" event
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

   // ✅ Handle explicit scenario join
  socket.on('joinScenarioRoom', ({ room }) => {
    if (!room) return console.warn('No room name provided for scenario join');
    socket.join(room);
    console.log(`✅ Socket ${socket.id} joined scenario room: ${room}`);
    socket.emit('joinedScenario', { room });
  });

  // Allow explicit join via "join"
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


require("./middlewares/dailyAIAdviceCron");

// require('dotenv').config();
// require('./middlewares/limitOrderCron');
// require('./middlewares/databasePriceCron');
// const app = require('./app'); // your express app
// const http = require('http');
// const { Server } = require('socket.io');
// const { setSocketIO } = require('./socketBroadcast'); // new module (below)

// const port = process.env.PORT || 3000;
// const server = http.createServer(app);

// const io = new Server(server, {
//   cors: {
//     origin: "*", // lock down for production
//     methods: ["GET", "POST"]
//   }
// });

// setSocketIO(io);

// io.on('connection', (socket) => {
//   console.log('Socket connected:', socket.id);
//   socket.on('disconnect', () => {
//     console.log('Socket disconnected:', socket.id);
//   });
// });

// server.listen(port, () => {
//   console.log(`Server listening on port ${port}`);
// });


// require('dotenv').config();
// require('./middlewares/limitOrderCron');
// require('./middlewares/databasePriceCron');

// const app = require('./app'); // your express app
// const http = require('http');
// const { Server } = require('socket.io');
// const { setSocketIO } = require('./socketBroadcast'); // your broadcast module

// const port = process.env.PORT || 3000;
// const server = http.createServer(app);

// const io = new Server(server, {
//   cors: {
//     origin: "*", // lock down for production
//     methods: ["GET", "POST"]
//   }
// });

// // Make io accessible in controllers via req.app.get('io')
// app.set('io', io);

// // Optional: set globally for your broadcast module
// setSocketIO(io);

// io.on('connection', (socket) => {
//   console.log('Socket connected:', socket.id);

//   // If client passes userId on connection, join a user-specific room
//   const userId = socket.handshake.query.userId;
//   if (userId) {
//     socket.join(`user_${userId}`);
//     console.log(`Socket ${socket.id} joined room user_${userId}`);
//   }

//   socket.on('disconnect', () => {
//     console.log('Socket disconnected:', socket.id);
//   });
// });

// server.listen(port, () => {
//   console.log(`Server listening on port ${port}`);
// });

