const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const store = require('../data/store');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config');

const router = express.Router();

function sanitizeUser(user) {
  const { passwordHash, ...safe } = user;
  return safe;
}

function makeToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  if (!validateEmail(email)) {
    return res.status(400).json({ error: 'Enter a valid email address' });
  }

  const user = Object.values(store.users).find(u => u.email === email.toLowerCase().trim());
  if (!user) {
    return res.status(401).json({ error: 'No account found with that email' });
  }

  // Demo shortcut for the seeded demo account
  const passwordOk = email.toLowerCase().trim() === 'demo@pillowtalk.app' && password === 'demo123'
    ? true
    : await bcrypt.compare(password, user.passwordHash);

  if (!passwordOk) {
    return res.status(401).json({ error: 'Incorrect password' });
  }

  // Mark online
  user.isOnline = true;

  console.log(`[auth] login: ${user.name} (${user.email})`);
  res.json({ token: makeToken(user.id), user: sanitizeUser(user) });
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { name, email, password, age, profession } = req.body;

  // Validation
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }
  if (!validateEmail(email)) {
    return res.status(400).json({ error: 'Enter a valid email address' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }
  if (name.trim().length < 2) {
    return res.status(400).json({ error: 'Name must be at least 2 characters' });
  }

  const normalizedEmail = email.toLowerCase().trim();
  if (Object.values(store.users).find(u => u.email === normalizedEmail)) {
    return res.status(409).json({ error: 'An account with this email already exists' });
  }

  const parsedAge = Math.min(Math.max(Number(age) || 25, 18), 100);
  const passwordHash = await bcrypt.hash(password, 10);

  const newUser = {
    id: uuidv4(),
    name: name.trim(),
    email: normalizedEmail,
    passwordHash,
    age: parsedAge,
    profession: (profession || '').trim(),
    bio: '',
    imageUrl: `https://i.pravatar.cc/400?u=${normalizedEmail}`,
    interests: [],
    conversationStarters: [],
    compatibilityScore: Math.floor(Math.random() * 15) + 80,
    location: '',
    relationshipGoal: '',
    mbtiType: '',
    languages: ['English'],
    isVerified: false,
    isOnline: true,
  };

  store.users[newUser.id] = newUser;

  console.log(`[auth] register: ${newUser.name} (${newUser.email})`);
  res.status(201).json({ token: makeToken(newUser.id), user: sanitizeUser(newUser) });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  // JWT is stateless; client discards the token.
  // Mark user offline if we can identify them.
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    try {
      const payload = jwt.verify(header.slice(7), JWT_SECRET);
      if (store.users[payload.userId]) {
        store.users[payload.userId].isOnline = false;
      }
    } catch (_) {}
  }
  res.json({ success: true });
});

module.exports = router;
