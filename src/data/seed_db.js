require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool } = require('./db');

async function seed() {
  console.log('🌱  Seeding database...');

  // Real bcrypt hash for "demo123"
  const hash = await bcrypt.hash('demo123', 10);

  // ── Users ─────────────────────────────────────────────────────────────────
  await pool.query(`
    INSERT INTO users
      (id, name, email, password_hash, age, profession, bio, image_url,
       interests, conversation_starters, compatibility_score,
       location, relationship_goal, mbti_type, languages, is_verified, is_online)
    VALUES
      ('me',  'Alex',   'demo@pillowtalk.app', $1, 27, 'Software Engineer',
       'Building things that matter. Lover of philosophy, jazz, and late-night conversations.',
       'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800',
       '{"Philosophy","Technology","Jazz","Reading","Hiking"}',
       '{"What''s a problem you''re obsessed with solving?","What does your ideal Saturday look like?","What''s the last thing that completely changed your perspective?"}',
       100, 'San Francisco, CA', 'Deep connection', 'INTJ', '{"English","Spanish"}', true, false),

      ('u1', 'Sophia', 'sophia@example.com', $1, 28, 'Neuroscientist',
       'Exploring the mysteries of the mind by day, stargazing philosopher by night. I believe the best conversations happen between 2–4am.',
       'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800',
       '{"Neuroscience","Philosophy","Jazz","Astrophysics","Poetry"}',
       '{"If you could live inside any book''s world, which would you choose and why?","What''s a belief you held 5 years ago that you''ve completely changed?","Describe your perfect Sunday morning in 5 sensory details."}',
       94, 'New York, NY', 'Deep connection', 'INFJ', '{"English","French"}', true, true),

      ('u2', 'Aria', 'aria@example.com', $1, 26, 'Architect & Artist',
       'I design buildings that make people feel things. Passionate about sustainable design, abstract expressionism, and really good pasta.',
       'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800',
       '{"Architecture","Abstract Art","Sustainability","Cooking","Travel"}',
       '{"What space in the world makes you feel most alive?","If your life were an art movement, which one would it be?","What''s something beautiful you noticed today?"}',
       89, 'Chicago, IL', 'Meaningful partnership', 'ENFP', '{"English","Italian","Spanish"}', true, false),

      ('u3', 'Luna', 'luna@example.com', $1, 30, 'Clinical Psychologist',
       'I help people understand themselves better for a living. Off duty: avid climber, midnight baker, and collector of strange dreams.',
       'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=800',
       '{"Psychology","Rock Climbing","Baking","Dream Analysis","Yoga"}',
       '{"What emotion do you find hardest to express, and why?","What does vulnerability mean to you?","If your inner child could tell you one thing right now, what would it be?"}',
       87, 'Los Angeles, CA', 'Long-term relationship', 'INTJ', '{"English","Portuguese"}', true, true),

      ('u4', 'Maya', 'maya@example.com', $1, 27, 'Astrophysicist & Writer',
       'Calculating the distance between stars and writing poetry about the spaces between people.',
       'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=800',
       '{"Astrophysics","Creative Writing","Meditation","Hiking","Music"}',
       '{"What question haunts you the most?","If you could know one truth about the universe, what would you ask?","When do you feel most like yourself?"}',
       91, 'Seattle, WA', 'Intellectual companionship', 'INFP', '{"English","Hindi"}', false, false),

      ('u5', 'Zara', 'zara@example.com', $1, 29, 'Music Composer',
       'Writing soundtracks for films that haven''t been made yet. I communicate in music, silence, and really specific metaphors.',
       'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800',
       '{"Composition","Film","Philosophy of Sound","Tea","Linguistics"}',
       '{"What song describes your current chapter of life?","If silence had a color, what would yours be today?","What''s a memory that has a specific soundtrack in your mind?"}',
       86, 'Nashville, TN', 'Creative partnership', 'ENFJ', '{"English","Arabic","French"}', true, true)
    ON CONFLICT (id) DO NOTHING
  `, [hash]);

  console.log('  ✓ Users');

  // ── Matches ───────────────────────────────────────────────────────────────
  const now = Date.now();
  await pool.query(`
    INSERT INTO matches
      (id, current_user_id, user_id, name, image_url, compatibility_score,
       matched_at, shared_interests, last_message, last_message_time, is_online, unread_count)
    VALUES
      ('m1', 'me', 'u1', 'Sophia',
       'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400',
       94, $1, '{"Philosophy","Astrophysics","Poetry"}',
       'That''s such a fascinating perspective on consciousness...', $2, true, 3),

      ('m2', 'me', 'u4', 'Maya',
       'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=400',
       91, $3, '{"Writing","Meditation","Music"}',
       'I''ve been thinking about what you said yesterday...', $4, false, 1),

      ('m3', 'me', 'u2', 'Aria',
       'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400',
       89, $5, '{"Art","Sustainability","Travel"}',
       'Sent you a conversation card 🃏', $6, false, 0),

      ('m4', 'me', 'u3', 'Luna',
       'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=400',
       87, $7, '{"Psychology","Yoga","Baking"}',
       'What does home feel like to you?', $8, true, 0)
    ON CONFLICT (current_user_id, user_id) DO NOTHING
  `, [
    new Date(now - 2 * 86400000).toISOString(),
    new Date(now - 23 * 60000).toISOString(),
    new Date(now - 5 * 86400000).toISOString(),
    new Date(now - 2 * 3600000).toISOString(),
    new Date(now - 1 * 86400000).toISOString(),
    new Date(now - 5 * 3600000).toISOString(),
    new Date(now - 7 * 86400000).toISOString(),
    new Date(now - 24 * 3600000).toISOString(),
  ]);

  console.log('  ✓ Matches');

  // ── Seed messages for m1 (Sophia) ─────────────────────────────────────────
  await pool.query(`
    INSERT INTO messages (id, match_id, sender_id, content, type, is_read, created_at)
    VALUES
      ('m1_1', 'm1', 'u1',
       'Hey! I noticed we both love philosophy and astrophysics. What''s your take on the Fermi Paradox?',
       'text', true, $1),
      ('m1_2', 'm1', 'me',
       'Oh wow, great question! I think the Great Filter might already be behind us — the fact that we''re here having this conversation is statistically extraordinary.',
       'text', true, $2),
      ('m1_3', 'm1', 'u1',
       'That''s such a fascinating perspective on consciousness and probability. Have you read Bostrom''s simulation hypothesis?',
       'text', true, $3),
      ('m1_4', 'm1', 'me',
       'Yes! And I find it oddly comforting rather than unsettling. What does it change if it''s true?',
       'text', true, $4),
      ('m1_5', 'm1', 'u1',
       'Exactly. Reality is what we experience, regardless of its substrate. I love that you see it that way 💜',
       'text', false, $5)
    ON CONFLICT (id) DO NOTHING
  `, [
    new Date(now - 3 * 3600000).toISOString(),
    new Date(now - 175 * 60000).toISOString(),
    new Date(now - 150 * 60000).toISOString(),
    new Date(now - 130 * 60000).toISOString(),
    new Date(now - 23 * 60000).toISOString(),
  ]);

  // Seed one message for m2 (Maya)
  await pool.query(`
    INSERT INTO messages (id, match_id, sender_id, content, type, is_read, created_at)
    VALUES
      ('m2_1', 'm2', 'u4',
       'I''ve been thinking about what you said yesterday... about presence vs. purpose. It''s been with me all day.',
       'text', false, $1)
    ON CONFLICT (id) DO NOTHING
  `, [new Date(now - 2 * 3600000).toISOString()]);

  // Seed one message for m4 (Luna)
  await pool.query(`
    INSERT INTO messages (id, match_id, sender_id, content, type, is_read, created_at)
    VALUES
      ('m4_1', 'm4', 'u3',
       'What does home feel like to you?',
       'text', true, $1)
    ON CONFLICT (id) DO NOTHING
  `, [new Date(now - 24 * 3600000).toISOString()]);

  console.log('  ✓ Messages');
  console.log('✅  Seeding complete.');
  await pool.end();
}

seed().catch(err => {
  console.error('❌  Seed failed:', err.message);
  process.exit(1);
});
