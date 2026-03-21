/**
 * electron/db.js — PRISM Launcher
 * Couche SQLite locale. Base users.db dans le userData Electron.
 * Tables : users | license | audit_log
 */

const Database = require('better-sqlite3')
const path     = require('path')
const { app }  = require('electron')

let _db = null

function db() {
  if (!_db) {
    const dbPath = path.join(app.getPath('userData'), 'users.db')
    _db = new Database(dbPath)
    _db.pragma('journal_mode = WAL')
    _db.pragma('foreign_keys = ON')
    migrate(_db)
  }
  return _db
}

function migrate(d) {
  d.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      email         TEXT    UNIQUE NOT NULL,
      full_name     TEXT    NOT NULL,
      password_hash TEXT    NOT NULL,
      role          TEXT    NOT NULL DEFAULT 'user',
      active        INTEGER NOT NULL DEFAULT 1,
      created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
      created_by    INTEGER,
      last_login    TEXT
    );

    CREATE TABLE IF NOT EXISTS license (
      id           INTEGER PRIMARY KEY CHECK (id = 1),
      company      TEXT    NOT NULL,
      seats        INTEGER NOT NULL DEFAULT 1,
      expires_at   TEXT,
      activated_at TEXT    NOT NULL DEFAULT (datetime('now')),
      key_display  TEXT    NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER,
      user_email TEXT,
      action     TEXT NOT NULL,
      detail     TEXT,
      timestamp  TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `)
}

// ── Users ──────────────────────────────────────────────────────────────────

function userCount() {
  return db().prepare('SELECT COUNT(*) as n FROM users').get().n
}

function getUsers() {
  return db().prepare(`
    SELECT id, email, full_name, role, active, created_at, last_login
    FROM users ORDER BY created_at ASC
  `).all()
}

function getUserByEmail(email) {
  return db().prepare('SELECT * FROM users WHERE email = ?').get(email)
}

function getUserById(id) {
  return db().prepare('SELECT * FROM users WHERE id = ?').get(id)
}

function createUser({ email, full_name, password_hash, role = 'user', created_by = null }) {
  const result = db().prepare(`
    INSERT INTO users (email, full_name, password_hash, role, active, created_by)
    VALUES (?, ?, ?, ?, 1, ?)
  `).run(email, full_name, password_hash, role, created_by)
  return getUserById(result.lastInsertRowid)
}

function updateUser(id, patches) {
  const allowed = ['full_name', 'role', 'active', 'password_hash']
  const fields  = Object.keys(patches).filter(k => allowed.includes(k))
  if (!fields.length) return
  const set    = fields.map(f => `${f} = ?`).join(', ')
  const values = fields.map(f => patches[f])
  db().prepare(`UPDATE users SET ${set} WHERE id = ?`).run(...values, id)
}

function setLastLogin(id) {
  db().prepare(`UPDATE users SET last_login = datetime('now') WHERE id = ?`).run(id)
}

// ── License ────────────────────────────────────────────────────────────────

function getLicense() {
  return db().prepare('SELECT * FROM license WHERE id = 1').get() ?? null
}

function setLicense({ company, seats, expires_at, key_display }) {
  db().prepare(`
    INSERT INTO license (id, company, seats, expires_at, key_display)
    VALUES (1, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      company     = excluded.company,
      seats       = excluded.seats,
      expires_at  = excluded.expires_at,
      key_display = excluded.key_display
  `).run(company, seats, expires_at ?? null, key_display)
}

// ── Audit ──────────────────────────────────────────────────────────────────

function log(user_id, user_email, action, detail = null) {
  db().prepare(`
    INSERT INTO audit_log (user_id, user_email, action, detail)
    VALUES (?, ?, ?, ?)
  `).run(user_id ?? null, user_email ?? null, action, detail)
}

function getAuditLog(limit = 200) {
  return db().prepare(
    'SELECT * FROM audit_log ORDER BY timestamp DESC LIMIT ?'
  ).all(limit)
}

module.exports = {
  userCount,
  getUsers, getUserByEmail, getUserById, createUser, updateUser, setLastLogin,
  getLicense, setLicense,
  log, getAuditLog,
}
