const { users, demoUser, initialMatches, buildSeedMessages, cardDecks } = require('./seed');

// In-memory store — replace with a real DB (PostgreSQL, MongoDB) for production
const store = {
  // users keyed by id
  users: { [demoUser.id]: demoUser },

  // matches: array of match objects
  matches: [...initialMatches],

  // messages keyed by matchId
  messages: {},

  // swipes: { [swiperId]: Set of swiped userId }
  swipes: {},

  // cardDecks
  cardDecks: [...cardDecks],
};

// Seed discover users
users.forEach(u => { store.users[u.id] = u; });

// Seed initial messages for each match
initialMatches.forEach(m => {
  store.messages[m.id] = buildSeedMessages(m.id, m.userId);
});

module.exports = store;
