const http = require('http');
const express = require('express');
const cors = require('cors');
const { PORT } = require('./src/config');
const { setupWebSocket } = require('./src/websocket/handler');

const authRoutes = require('./src/routes/auth');
const userRoutes = require('./src/routes/users');
const matchRoutes = require('./src/routes/matches');
const chatRoutes = require('./src/routes/chat');
const cardRoutes = require('./src/routes/cards');

const app = express();
const server = http.createServer(app);

// ── Middleware ──────────────────────────────────────────────────────────────
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['*'];

app.use(cors({
  origin: (origin, cb) => {
    if (allowedOrigins.includes('*') || !origin || allowedOrigins.includes(origin)) {
      cb(null, true);
    } else {
      cb(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(express.json());

// Request logger
app.use((req, _, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// ── REST Routes ─────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/cards', cardRoutes);

// Health check
app.get('/health', (_, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// 404 handler
app.use((req, res) => res.status(404).json({ error: `Route ${req.path} not found` }));

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

// ── WebSocket ───────────────────────────────────────────────────────────────
const { wsBroadcast } = setupWebSocket(server);
app.locals.wsBroadcast = wsBroadcast;

// ── Start ───────────────────────────────────────────────────────────────────
// Render (and most cloud hosts) require binding to 0.0.0.0
server.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔═══════════════════════════════════════════════╗
║   PillowTalk Backend  ·  http://localhost:${PORT}  ║
║   WebSocket           ·  ws://localhost:${PORT}/ws ║
╚═══════════════════════════════════════════════╝

  POST  /api/auth/login
  POST  /api/auth/register
  GET   /api/users/me
  PUT   /api/users/me
  GET   /api/users/discover
  GET   /api/matches
  POST  /api/matches/swipe
  DELETE /api/matches/:id
  GET   /api/chat/:matchId/messages
  POST  /api/chat/:matchId/messages
  GET   /api/cards/decks
  GET   /api/cards/decks/:deckId
  GET   /health
`);
});
