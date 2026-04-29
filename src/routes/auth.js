require('dotenv').config();
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { queryOne, query } = require('../data/db');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config');

const router = express.Router();

function makeToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function sanitizeUser(row) {
  if (!row) return null;
  const { password_hash, ...rest } = row;
  return rest;
}

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
    if (!validateEmail(email)) return res.status(400).json({ error: 'Enter a valid email address' });

    const user = await queryOne('SELECT * FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    if (!user) return res.status(401).json({ error: 'No account found with that email' });

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Incorrect password' });

    await query('UPDATE users SET is_online = true WHERE id = $1', [user.id]);
    console.log(`[auth] login: ${user.name} (${user.email})`);
    res.json({ token: makeToken(user.id), user: sanitizeUser(user) });
  } catch (err) {
    console.error('[auth] login error:', err.message);
    res.status(500).json({ error: 'Login failed' });
  }
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, age, profession } = req.body;

    if (!name || !email || !password) return res.status(400).json({ error: 'Name, email, and password are required' });
    if (!validateEmail(email)) return res.status(400).json({ error: 'Enter a valid email address' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
    if (name.trim().length < 2) return res.status(400).json({ error: 'Name must be at least 2 characters' });

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await queryOne('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
    if (existing) return res.status(409).json({ error: 'An account with this email already exists' });

    const parsedAge = Math.min(Math.max(Number(age) || 25, 18), 100);
    const passwordHash = await bcrypt.hash(password, 10);
    const id = uuidv4();
    const imageUrl = `https://i.pravatar.cc/400?u=${normalizedEmail}`;
    const compatibilityScore = Math.floor(Math.random() * 15) + 80;

    const newUser = await queryOne(`
      INSERT INTO users
        (id, name, email, password_hash, age, profession, image_url, compatibility_score, is_online)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
      RETURNING *
    `, [id, name.trim(), normalizedEmail, passwordHash, parsedAge, (profession || '').trim(), imageUrl, compatibilityScore]);

    console.log(`[auth] register: ${newUser.name} (${newUser.email})`);
    res.status(201).json({ token: makeToken(newUser.id), user: sanitizeUser(newUser) });
  } catch (err) {
    console.error('[auth] register error:', err.message);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/logout
router.post('/logout', async (req, res) => {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    try {
      const { userId } = jwt.verify(header.slice(7), JWT_SECRET);
      await query('UPDATE users SET is_online = false WHERE id = $1', [userId]);
    } catch (_) {}
  }
  res.json({ success: true });
});

module.exports = router;
