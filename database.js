const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'voidchat.db'));

// Initialize database schema
function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS rooms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      message_count INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id INTEGER NOT NULL,
      username TEXT NOT NULL,
      message TEXT NOT NULL,
      color TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT,
      email TEXT,
      created_at INTEGER NOT NULL,
      max_lines INTEGER DEFAULT 50,
      date_format TEXT DEFAULT 'HH:mm:ss',
      timezone INTEGER DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_messages_room_timestamp
      ON messages(room_id, timestamp DESC);

    CREATE INDEX IF NOT EXISTS idx_rooms_updated
      ON rooms(updated_at DESC);

    CREATE INDEX IF NOT EXISTS idx_rooms_message_count
      ON rooms(message_count DESC);
  `);
}

// Database operations
const db_ops = {
  // Room operations
  createRoom(name) {
    const now = Date.now();
    const stmt = db.prepare('INSERT OR IGNORE INTO rooms (name, created_at, updated_at) VALUES (?, ?, ?)');
    return stmt.run(name, now, now);
  },

  getRoom(name) {
    const stmt = db.prepare('SELECT * FROM rooms WHERE name = ?');
    return stmt.get(name);
  },

  updateRoomTimestamp(roomId) {
    const stmt = db.prepare('UPDATE rooms SET updated_at = ?, message_count = message_count + 1 WHERE id = ?');
    return stmt.run(Date.now(), roomId);
  },

  getRecentRooms(limit = 10) {
    const stmt = db.prepare('SELECT * FROM rooms WHERE message_count > 0 ORDER BY updated_at DESC LIMIT ?');
    return stmt.all(limit);
  },

  getPopularRooms(limit = 10) {
    const stmt = db.prepare('SELECT * FROM rooms WHERE message_count > 0 ORDER BY message_count DESC LIMIT ?');
    return stmt.all(limit);
  },

  searchRooms(query, limit = 5) {
    const stmt = db.prepare('SELECT name FROM rooms WHERE name LIKE ? AND message_count > 0 LIMIT ?');
    return stmt.all(`${query}%`, limit);
  },

  // Message operations
  insertMessage(roomId, username, message, color) {
    const stmt = db.prepare('INSERT INTO messages (room_id, username, message, color, timestamp) VALUES (?, ?, ?, ?, ?)');
    return stmt.run(roomId, username, message, color, Date.now());
  },

  getMessages(roomId, limit = 50) {
    const stmt = db.prepare(`
      SELECT * FROM messages
      WHERE room_id = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `);
    return stmt.all(roomId, limit).reverse();
  },

  getMessagesSince(roomId, timestamp, limit = 50) {
    const stmt = db.prepare(`
      SELECT * FROM messages
      WHERE room_id = ? AND timestamp > ?
      ORDER BY timestamp ASC
      LIMIT ?
    `);
    return stmt.all(roomId, timestamp, limit);
  },

  cleanOldMessages(roomId, keepCount = 200) {
    const stmt = db.prepare(`
      DELETE FROM messages
      WHERE room_id = ?
      AND id NOT IN (
        SELECT id FROM messages
        WHERE room_id = ?
        ORDER BY timestamp DESC
        LIMIT ?
      )
    `);
    return stmt.run(roomId, roomId, keepCount);
  },

  // User operations
  createUser(username, password = null, email = null) {
    const stmt = db.prepare('INSERT INTO users (username, password, email, created_at) VALUES (?, ?, ?, ?)');
    return stmt.run(username, password, email, Date.now());
  },

  getUser(username) {
    const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
    return stmt.get(username);
  },

  updateUserSettings(username, settings) {
    const { max_lines, date_format, timezone } = settings;
    const stmt = db.prepare('UPDATE users SET max_lines = ?, date_format = ?, timezone = ? WHERE username = ?');
    return stmt.run(max_lines, date_format, timezone, username);
  }
};

initializeDatabase();

module.exports = { db, db_ops };
