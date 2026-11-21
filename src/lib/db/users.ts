import { getDb } from './db';


// User queries
export function getUserByUsername(username: string) {
  const db = getDb();
  return db.query('SELECT * FROM users WHERE username = ?').get(username);
}

export function getUserById(id: string) {
  const db = getDb();
  return db.query('SELECT * FROM users WHERE id = ?').get(id);
}

export function getAllUsers() {
  const db = getDb();
  return db.query('SELECT id, username, role, createdAt FROM users ORDER BY createdAt DESC').all();
}

export function createUser(id: string, username: string, passwordHash: string, role: string) {
  const db = getDb();
  db.query('INSERT INTO users (id, username, passwordHash, role) VALUES (?, ?, ?, ?)').run(id, username, passwordHash, role);
}

export function updateUser(id: string, username: string, role: string, passwordHash?: string) {
  const db = getDb();
  if (passwordHash) {
    db.query('UPDATE users SET username = ?, role = ?, passwordHash = ? WHERE id = ?').run(username, role, passwordHash, id);
  } else {
    db.query('UPDATE users SET username = ?, role = ? WHERE id = ?').run(username, role, id);
  }
}

export function deleteUser(id: string) {
  const db = getDb();
  db.query('DELETE FROM users WHERE id = ?').run(id);
}

// Session queries
export function createSession(id: string, userId: string, token: string, expiresAt: string) {
  const db = getDb();
  db.query('INSERT INTO sessions (id, userId, token, expiresAt) VALUES (?, ?, ?, ?)').run(id, userId, token, expiresAt);
}

export function getSessionByToken(token: string) {
  const db = getDb();
  return db.query(`
    SELECT s.*, u.username, u.role 
    FROM sessions s 
    JOIN users u ON s.userId = u.id 
    WHERE s.token = ? AND s.expiresAt > datetime('now')
  `).get(token);
}

export function deleteSession(token: string) {
  const db = getDb();
  db.query('DELETE FROM sessions WHERE token = ?').run(token);
}

export function deleteExpiredSessions() {
  const db = getDb();
  db.query("DELETE FROM sessions WHERE expiresAt <= datetime('now')").run();
}

