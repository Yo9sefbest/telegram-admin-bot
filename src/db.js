const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');

function createDb(file = process.env.DB_PATH || './data/bot.db') {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new Database(file);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,                 -- Telegram user id
      username TEXT,
      first_name TEXT,
      banned INTEGER NOT NULL DEFAULT 0,
      joined_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_seen TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS feedback (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      text TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const q = {
    upsertUser: db.prepare(`
      INSERT INTO users (id, username, first_name) VALUES (@id, @username, @first_name)
      ON CONFLICT(id) DO UPDATE SET
        username = excluded.username,
        first_name = excluded.first_name,
        last_seen = datetime('now')`),
    isBanned: db.prepare('SELECT banned FROM users WHERE id = ?'),
    setBanned: db.prepare('UPDATE users SET banned = ? WHERE id = ?'),
    addFeedback: db.prepare('INSERT INTO feedback (user_id, text) VALUES (?, ?)'),
    listUsers: db.prepare('SELECT * FROM users ORDER BY joined_at DESC, id DESC LIMIT ?'),
    listFeedback: db.prepare(`
      SELECT f.id, f.text, f.created_at, f.user_id, u.username, u.first_name
      FROM feedback f JOIN users u ON u.id = f.user_id
      ORDER BY f.id DESC LIMIT ?`),
    activeIds: db.prepare('SELECT id FROM users WHERE banned = 0'),
    stats: db.prepare(`
      SELECT
        (SELECT COUNT(*) FROM users) AS users,
        (SELECT COUNT(*) FROM users WHERE banned = 1) AS banned,
        (SELECT COUNT(*) FROM users WHERE last_seen >= datetime('now', '-1 day')) AS active24h,
        (SELECT COUNT(*) FROM feedback) AS feedback`),
  };

  return {
    upsertUser: (user) => q.upsertUser.run(user),
    isBanned: (id) => q.isBanned.get(id)?.banned === 1,
    setBanned: (id, banned) => q.setBanned.run(banned ? 1 : 0, id).changes > 0,
    addFeedback: (userId, text) => q.addFeedback.run(userId, text),
    listUsers: (limit = 100) => q.listUsers.all(limit),
    listFeedback: (limit = 50) => q.listFeedback.all(limit),
    activeUserIds: () => q.activeIds.all().map((r) => r.id),
    stats: () => q.stats.get(),
    close: () => db.close(),
  };
}

module.exports = { createDb };
