const express = require('express');
const { v4: uuidv4 } = require('uuid');
const store = require('../data/store');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /api/chat/:matchId/messages
router.get('/:matchId/messages', authenticate, (req, res) => {
  const { matchId } = req.params;
  const match = store.matches.find(m => m.id === matchId);
  if (!match) return res.status(404).json({ error: 'Match not found' });

  const messages = store.messages[matchId] || [];
  // Mark messages as read
  messages.forEach(m => { if (m.senderId !== req.userId) m.isRead = true; });
  res.json(messages);
});

// POST /api/chat/:matchId/messages
router.post('/:matchId/messages', authenticate, (req, res) => {
  const { matchId } = req.params;
  const { content, type, cardData } = req.body;

  if (!content) return res.status(400).json({ error: 'content is required' });

  const match = store.matches.find(m => m.id === matchId);
  if (!match) return res.status(404).json({ error: 'Match not found' });

  const message = {
    id: uuidv4(),
    matchId,
    senderId: req.userId,
    content,
    timestamp: new Date().toISOString(),
    type: type || 'text',
    cardData: cardData || null,
    isRead: false,
  };

  if (!store.messages[matchId]) store.messages[matchId] = [];
  store.messages[matchId].push(message);

  // Update match last message
  match.lastMessage = type === 'card' ? '🃏 Sent a conversation card' : content;
  match.lastMessageTime = message.timestamp;

  // Broadcast via WebSocket if available
  if (req.app.locals.wsBroadcast) {
    req.app.locals.wsBroadcast(matchId, { event: 'message', data: message });
  }

  // Schedule an auto-reply for demo purposes
  const autoReplies = type === 'card'
    ? ['Ooh I love this question! Let me think... 💭', "That's such a deep question 🌊"]
    : [
        "That's such an interesting way to look at it...",
        "I've never thought about it from that angle before.",
        'Wow, you really made me think with that one 💜',
        'I completely agree — and here\'s another thought...',
        'That\'s exactly how I feel! We should talk more about this.',
      ];

  setTimeout(() => {
    const replyContent = autoReplies[Math.floor(Math.random() * autoReplies.length)];
    const reply = {
      id: uuidv4(),
      matchId,
      senderId: match.userId,
      content: replyContent,
      timestamp: new Date().toISOString(),
      type: 'text',
      cardData: null,
      isRead: false,
    };
    if (!store.messages[matchId]) store.messages[matchId] = [];
    store.messages[matchId].push(reply);
    match.lastMessage = replyContent;
    match.lastMessageTime = reply.timestamp;

    if (req.app.locals.wsBroadcast) {
      req.app.locals.wsBroadcast(matchId, { event: 'message', data: reply });
    }
  }, 2000);

  res.status(201).json(message);
});

module.exports = router;
