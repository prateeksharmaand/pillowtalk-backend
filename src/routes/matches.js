const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { queryOne, queryAll, query } = require('../data/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /api/matches
router.get('/', authenticate, async (req, res) => {
  try {
    const matches = await queryAll(
      'SELECT * FROM matches WHERE current_user_id = $1 ORDER BY last_message_time DESC',
      [req.userId]
    );
    res.json(matches);
  } catch (err) {
    console.error('[matches] list error:', err.message);
    res.status(500).json({ error: 'Failed to fetch matches' });
  }
});

// POST /api/matches/swipe
router.post('/swipe', authenticate, async (req, res) => {
  try {
    const myId = req.userId;
    const { targetUserId, direction } = req.body;

    if (!targetUserId || !direction) {
      return res.status(400).json({ error: 'targetUserId and direction are required' });
    }

    // Record swipe (ignore duplicate)
    await query(
      `INSERT INTO swipes (swiper_id, target_id, direction) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
      [myId, targetUserId, direction]
    );

    if (direction !== 'right') return res.json({ matched: false });

    // 70% simulated mutual like for demo
    if (Math.random() >= 0.7) return res.json({ matched: false });

    const target = await queryOne('SELECT * FROM users WHERE id = $1', [targetUserId]);
    if (!target) return res.json({ matched: false });

    // Return existing match if already created
    const existing = await queryOne(
      'SELECT * FROM matches WHERE current_user_id = $1 AND user_id = $2',
      [myId, targetUserId]
    );
    if (existing) return res.json({ matched: true, match: existing });

    const sharedInterests = (target.interests || []).slice(0, 3);
    const newMatch = await queryOne(`
      INSERT INTO matches
        (id, current_user_id, user_id, name, image_url, compatibility_score,
         shared_interests, last_message, is_online)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      uuidv4(), myId, targetUserId,
      target.name, target.image_url, target.compatibility_score,
      sharedInterests, 'You just matched! Say hello 👋', target.is_online,
    ]);

    res.json({ matched: true, match: newMatch });
  } catch (err) {
    console.error('[matches] swipe error:', err.message);
    res.status(500).json({ error: 'Swipe failed' });
  }
});

// DELETE /api/matches/:matchId
router.delete('/:matchId', authenticate, async (req, res) => {
  try {
    const result = await query(
      'DELETE FROM matches WHERE id = $1 AND current_user_id = $2',
      [req.params.matchId, req.userId]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Match not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('[matches] delete error:', err.message);
    res.status(500).json({ error: 'Failed to delete match' });
  }
});

// PATCH /api/matches/:matchId/lastMessage
router.patch('/:matchId/lastMessage', authenticate, async (req, res) => {
  try {
    const match = await queryOne(`
      UPDATE matches
        SET last_message = $1, last_message_time = NOW(), unread_count = 0
      WHERE id = $2
      RETURNING *
    `, [req.body.lastMessage, req.params.matchId]);
    if (!match) return res.status(404).json({ error: 'Match not found' });
    res.json(match);
  } catch (err) {
    console.error('[matches] lastMessage error:', err.message);
    res.status(500).json({ error: 'Update failed' });
  }
});

module.exports = router;
