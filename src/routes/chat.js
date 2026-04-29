const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { queryOne, queryAll, query } = require('../data/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /api/chat/:matchId/messages
router.get('/:matchId/messages', authenticate, async (req, res) => {
  try {
    const { matchId } = req.params;

    const match = await queryOne(
      'SELECT id FROM matches WHERE id = $1 AND current_user_id = $2',
      [matchId, req.userId]
    );
    if (!match) return res.status(404).json({ error: 'Match not found' });

    // Mark received messages as read
    await query(
      'UPDATE messages SET is_read = true WHERE match_id = $1 AND sender_id != $2',
      [matchId, req.userId]
    );

    const messages = await queryAll(
      'SELECT * FROM messages WHERE match_id = $1 ORDER BY created_at ASC',
      [matchId]
    );
    res.json(messages);
  } catch (err) {
    console.error('[chat] get messages error:', err.message);
    res.status(500).json({ error: 'Failed to load messages' });
  }
});

// POST /api/chat/:matchId/messages
router.post('/:matchId/messages', authenticate, async (req, res) => {
  try {
    const { matchId } = req.params;
    const { content, type, cardData } = req.body;

    if (!content) return res.status(400).json({ error: 'content is required' });

    const match = await queryOne(
      'SELECT * FROM matches WHERE id = $1 AND current_user_id = $2',
      [matchId, req.userId]
    );
    if (!match) return res.status(404).json({ error: 'Match not found' });

    const msgType = type || 'text';
    const message = await queryOne(`
      INSERT INTO messages (id, match_id, sender_id, content, type, card_data)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [uuidv4(), matchId, req.userId, content, msgType, cardData ? JSON.stringify(cardData) : null]);

    // Update match last message
    const lastMsg = msgType === 'card' ? '🃏 Sent a conversation card' : content;
    await query(
      'UPDATE matches SET last_message = $1, last_message_time = NOW() WHERE id = $2',
      [lastMsg, matchId]
    );

    // Broadcast via WebSocket
    if (req.app.locals.wsBroadcast) {
      req.app.locals.wsBroadcast(matchId, { event: 'message', data: message });
    }

    // Schedule auto-reply for demo
    const autoReplies = msgType === 'card'
      ? ['Ooh I love this question! Let me think... 💭', "That's such a deep question 🌊"]
      : [
          "That's such an interesting way to look at it...",
          "I've never thought about it from that angle before.",
          'Wow, you really made me think with that one 💜',
          'I completely agree — and here\'s another thought...',
          'That\'s exactly how I feel! We should talk more about this.',
        ];

    setTimeout(async () => {
      try {
        const replyContent = autoReplies[Math.floor(Math.random() * autoReplies.length)];
        const reply = await queryOne(`
          INSERT INTO messages (id, match_id, sender_id, content, type)
          VALUES ($1, $2, $3, $4, 'text')
          RETURNING *
        `, [uuidv4(), matchId, match.user_id, replyContent]);

        await query(
          'UPDATE matches SET last_message = $1, last_message_time = NOW(), unread_count = unread_count + 1 WHERE id = $2',
          [replyContent, matchId]
        );

        if (req.app.locals.wsBroadcast) {
          req.app.locals.wsBroadcast(matchId, { event: 'message', data: reply });
        }
      } catch (e) {
        console.error('[chat] auto-reply error:', e.message);
      }
    }, 2000);

    res.status(201).json(message);
  } catch (err) {
    console.error('[chat] send message error:', err.message);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

module.exports = router;
