require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const { PORT } = require('./src/config');
const { pool } = require('./src/data/db');
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

app.get('/health', async (_, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected', time: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'error', db: 'disconnected' });
  }
});

app.use((req, res) => res.status(404).json({ error: `Route ${req.path} not found` }));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

// ── WebSocket ───────────────────────────────────────────────────────────────
const { wsBroadcast } = setupWebSocket(server);
app.locals.wsBroadcast = wsBroadcast;

// ── Start ───────────────────────────────────────────────────────────────────
async function start() {
  // Verify DB connection before accepting traffic
  try {
    await pool.query('SELECT 1');
    console.log('✅  PostgreSQL connected');
  } catch (err) {
    console.error('❌  PostgreSQL connection failed:', err.message);
    console.error('    Set DATABASE_URL in your .env file or Render environment variables.');
    process.exit(1);
  }

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
}

start();
