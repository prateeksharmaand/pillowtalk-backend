const express = require('express');
const store = require('../data/store');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /api/cards/decks
router.get('/decks', authenticate, (req, res) => {
  res.json(store.cardDecks);
});

// GET /api/cards/decks/:deckId
router.get('/decks/:deckId', authenticate, (req, res) => {
  const deck = store.cardDecks.find(d => d.id === req.params.deckId);
  if (!deck) return res.status(404).json({ error: 'Deck not found' });
  res.json(deck);
});

module.exports = router;
