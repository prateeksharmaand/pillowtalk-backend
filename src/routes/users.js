const express = require('express');
const { queryOne, queryAll, query } = require('../data/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

function sanitizeUser(row) {
  if (!row) return null;
  const { password_hash, ...rest } = row;
  return rest;
}

// GET /api/users/me
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await queryOne('SELECT * FROM users WHERE id = $1', [req.userId]);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(sanitizeUser(user));
  } catch (err) {
    console.error('[users] me error:', err.message);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// PUT /api/users/me
router.put('/me', authenticate, async (req, res) => {
  try {
    const allowed = ['name', 'age', 'profession', 'bio', 'image_url', 'interests',
      'conversation_starters', 'location', 'relationship_goal', 'mbti_type', 'languages'];

    const sets = [];
    const vals = [];
    let idx = 1;

    for (const key of allowed) {
      // Accept both camelCase (from Flutter) and snake_case
      const camel = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
      const val = req.body[key] ?? req.body[camel];
      if (val !== undefined) {
        sets.push(`${key} = $${idx++}`);
        vals.push(val);
      }
    }

    if (sets.length === 0) return res.status(400).json({ error: 'No valid fields to update' });

    vals.push(req.userId);
    const user = await queryOne(
      `UPDATE users SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
      vals
    );
    res.json(sanitizeUser(user));
  } catch (err) {
    console.error('[users] update error:', err.message);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// GET /api/users/discover — users not yet swiped by current user
router.get('/discover', authenticate, async (req, res) => {
  try {
    const rows = await queryAll(`
      SELECT * FROM users
      WHERE id != $1
        AND id NOT IN (
          SELECT target_id FROM swipes WHERE swiper_id = $1
        )
        AND id NOT IN (
          SELECT user_id FROM matches WHERE current_user_id = $1
        )
      ORDER BY compatibility_score DESC
    `, [req.userId]);
    res.json(rows.map(sanitizeUser));
  } catch (err) {
    console.error('[users] discover error:', err.message);
    res.status(500).json({ error: 'Failed to fetch discover feed' });
  }
});

// GET /api/users/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const user = await queryOne('SELECT * FROM users WHERE id = $1', [req.params.id]);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(sanitizeUser(user));
  } catch (err) {
    console.error('[users] get error:', err.message);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

module.exports = router;
