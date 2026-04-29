require('dotenv').config();
const { pool } = require('./db');

async function migrate() {
  console.log('🔄  Running migrations...');

  await pool.query(`
    -- ── Users ────────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS users (
      id                   TEXT        PRIMARY KEY,
      name                 TEXT        NOT NULL,
      email                TEXT        UNIQUE NOT NULL,
      password_hash        TEXT        NOT NULL,
      age                  INTEGER     DEFAULT 25,
      profession           TEXT        DEFAULT '',
      bio                  TEXT        DEFAULT '',
      image_url            TEXT        DEFAULT '',
      interests            TEXT[]      DEFAULT '{}',
      conversation_starters TEXT[]     DEFAULT '{}',
      compatibility_score  INTEGER     DEFAULT 80,
      location             TEXT        DEFAULT '',
      relationship_goal    TEXT        DEFAULT '',
      mbti_type            TEXT        DEFAULT '',
      languages            TEXT[]      DEFAULT '{"English"}',
      is_verified          BOOLEAN     DEFAULT false,
      is_online            BOOLEAN     DEFAULT false,
      created_at           TIMESTAMPTZ DEFAULT NOW()
    );

    -- ── Matches ───────────────────────────────────────────────────────────────
    -- One row per direction: (current_user_id liked user_id)
    CREATE TABLE IF NOT EXISTS matches (
      id                   TEXT        PRIMARY KEY,
      current_user_id      TEXT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      user_id              TEXT        NOT NULL,
      name                 TEXT        NOT NULL,
      image_url            TEXT        DEFAULT '',
      compatibility_score  INTEGER     DEFAULT 80,
      matched_at           TIMESTAMPTZ DEFAULT NOW(),
      shared_interests     TEXT[]      DEFAULT '{}',
      last_message         TEXT        DEFAULT '',
      last_message_time    TIMESTAMPTZ DEFAULT NOW(),
      is_online            BOOLEAN     DEFAULT false,
      unread_count         INTEGER     DEFAULT 0,
      UNIQUE (current_user_id, user_id)
    );

    -- ── Messages ──────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS messages (
      id          TEXT        PRIMARY KEY,
      match_id    TEXT        NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
      sender_id   TEXT        NOT NULL,
      content     TEXT        NOT NULL,
      type        TEXT        DEFAULT 'text',
      card_data   JSONB,
      is_read     BOOLEAN     DEFAULT false,
      created_at  TIMESTAMPTZ DEFAULT NOW()
    );

    -- Index for fast message retrieval per match
    CREATE INDEX IF NOT EXISTS idx_messages_match_id
      ON messages (match_id, created_at);

    -- ── Swipes ────────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS swipes (
      swiper_id   TEXT        NOT NULL,
      target_id   TEXT        NOT NULL,
      direction   TEXT        NOT NULL,  -- 'left' | 'right'
      created_at  TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (swiper_id, target_id)
    );
  `);

  console.log('✅  Migrations complete.');
  await pool.end();
}

migrate().catch(err => {
  console.error('❌  Migration failed:', err.message);
  process.exit(1);
});
