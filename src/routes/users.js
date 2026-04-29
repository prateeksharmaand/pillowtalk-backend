const express = require('express');
const store = require('../data/store');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

function sanitizeUser(user) {
  const { passwordHash, ...safe } = user;
  return safe;
}

// GET /api/users/me
router.get('/me', authenticate, (req, res) => {
  const user = store.users[req.userId];
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(sanitizeUser(user));
});

// PUT /api/users/me
router.put('/me', authenticate, (req, res) => {
  const user = store.users[req.userId];
  if (!user) return res.status(404).json({ error: 'User not found' });

  const allowed = ['name', 'age', 'profession', 'bio', 'imageUrl', 'interests',
    'conversationStarters', 'location', 'relationshipGoal', 'mbtiType', 'languages'];
  allowed.forEach(key => {
    if (req.body[key] !== undefined) user[key] = req.body[key];
  });

  res.json(sanitizeUser(user));
});

// GET /api/users/discover  — returns users not yet swiped by the current user
router.get('/discover', authenticate, (req, res) => {
  const myId = req.userId;
  const swipedIds = store.swipes[myId] ? [...store.swipes[myId]] : [];
  const matchedUserIds = store.matches
    .filter(m => m.currentUserId === myId)
    .map(m => m.userId);

  const feed = Object.values(store.users)
    .filter(u => u.id !== myId && !swipedIds.includes(u.id) && !matchedUserIds.includes(u.id))
    .map(sanitizeUser);

  res.json(feed);
});

// GET /api/users/:id
router.get('/:id', authenticate, (req, res) => {
  const user = store.users[req.params.id];
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(sanitizeUser(user));
});

module.exports = router;
