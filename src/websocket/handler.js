const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config');

// matchId → Set<WebSocket>
const rooms = new Map();

function setupWebSocket(server) {
  const wss = new WebSocket.Server({ server, path: '/ws' });

  wss.on('connection', (ws, req) => {
    // Expect token in query string: /ws?token=<jwt>
    const url = new URL(req.url, 'http://localhost');
    const token = url.searchParams.get('token');

    let userId = null;
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      userId = payload.userId;
    } catch {
      ws.close(4001, 'Unauthorized');
      return;
    }

    ws._userId = userId;
    ws._matchRooms = new Set();

    ws.on('message', raw => {
      let msg;
      try { msg = JSON.parse(raw); } catch { return; }

      switch (msg.event) {
        case 'join':
          // Join a match room: { event: 'join', matchId }
          if (msg.matchId) {
            if (!rooms.has(msg.matchId)) rooms.set(msg.matchId, new Set());
            rooms.get(msg.matchId).add(ws);
            ws._matchRooms.add(msg.matchId);
          }
          break;

        case 'leave':
          if (msg.matchId) {
            rooms.get(msg.matchId)?.delete(ws);
            ws._matchRooms.delete(msg.matchId);
          }
          break;

        case 'typing':
          // Broadcast typing indicator: { event: 'typing', matchId, isTyping }
          if (msg.matchId) {
            broadcastToRoom(msg.matchId, { event: 'typing', senderId: userId, isTyping: msg.isTyping }, ws);
          }
          break;
      }
    });

    ws.on('close', () => {
      ws._matchRooms.forEach(matchId => {
        rooms.get(matchId)?.delete(ws);
      });
    });

    ws.send(JSON.stringify({ event: 'connected', userId }));
  });

  // Broadcast a message to all clients in a room (optionally exclude sender)
  function broadcastToRoom(matchId, payload, excludeWs = null) {
    const room = rooms.get(matchId);
    if (!room) return;
    const data = JSON.stringify(payload);
    room.forEach(client => {
      if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  }

  // Expose broadcast so REST routes can push real-time events
  function wsBroadcast(matchId, payload) {
    broadcastToRoom(matchId, payload);
  }

  return { wss, wsBroadcast };
}

module.exports = { setupWebSocket };
