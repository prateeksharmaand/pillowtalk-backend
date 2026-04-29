const express = require('express');
const { v4: uuidv4 } = require('uuid');
const store = require('../data/store');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /api/matches
router.get('/', authenticate, (req, res) => {
  const myId = req.userId;
  const matches = store.matches.filter(m => m.currentUserId === myId);
  res.json(matches);
});

// POST /api/matches/swipe — record a swipe, return { matched, match? }
router.post('/swipe', authenticate, (req, res) => {
  const myId = req.userId;
  const { targetUserId, direction } = req.body;

  if (!targetUserId || !direction) {
    return res.status(400).json({ error: 'targetUserId and direction are required' });
  }

  // Record swipe
  if (!store.swipes[myId]) store.swipes[myId] = new Set();
  store.swipes[myId].add(targetUserId);

  if (direction !== 'right') {
    return res.json({ matched: false });
  }

  // Simulate mutual like (70% chance for demo)
  const isMatch = Math.random() < 0.7;
  if (!isMatch) return res.json({ matched: false });

  const targetUser = store.users[targetUserId];
  if (!targetUser) return res.json({ matched: false });

  // Check if match already exists
  const existing = store.matches.find(
    m => m.currentUserId === myId && m.userId === targetUserId
  );
  if (existing) return res.json({ matched: true, match: existing });

  const newMatch = {
    id: uuidv4(),
    userId: targetUserId,
    currentUserId: myId,
    name: targetUser.name,
    imageUrl: targetUser.imageUrl,
    compatibilityScore: targetUser.compatibilityScore,
    matchedAt: new Date().toISOString(),
    sharedInterests: targetUser.interests.slice(0, 3),
    lastMessage: 'You just matched! Say hello 👋',
    lastMessageTime: new Date().toISOString(),
    isOnline: targetUser.isOnline,
    unreadCount: 0,
  };

  store.matches.push(newMatch);
  store.messages[newMatch.id] = [];

  res.json({ matched: true, match: newMatch });
});

// DELETE /api/matches/:matchId
router.delete('/:matchId', authenticate, (req, res) => {
  const myId = req.userId;
  const idx = store.matches.findIndex(
    m => m.id === req.params.matchId && m.currentUserId === myId
  );
  if (idx === -1) return res.status(404).json({ error: 'Match not found' });
  store.matches.splice(idx, 1);
  res.json({ success: true });
});

// PATCH /api/matches/:matchId/lastMessage
router.patch('/:matchId/lastMessage', authenticate, (req, res) => {
  const match = store.matches.find(m => m.id === req.params.matchId);
  if (!match) return res.status(404).json({ error: 'Match not found' });
  match.lastMessage = req.body.lastMessage || match.lastMessage;
  match.lastMessageTime = new Date().toISOString();
  match.unreadCount = 0;
  res.json(match);
});

module.exports = router;
