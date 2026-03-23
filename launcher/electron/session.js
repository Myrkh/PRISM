/**
 * electron/session.js — PRISM Launcher
 * Store de sessions en mémoire. UUID aléatoire par session, TTL 8h.
 * Invalidé au logout ou à l'expiration.
 */

const { randomUUID } = require('crypto')

let   SESSION_TTL = 8 * 60 * 60 * 1000 // 8 h (configurable via setSessionTTL)
const sessions    = new Map()            // token → { userId, role, createdAt }

function createSession(userId, role) {
  // Invalider les sessions précédentes de cet utilisateur
  for (const [token, s] of sessions) {
    if (s.userId === userId) sessions.delete(token)
  }
  const token = randomUUID()
  sessions.set(token, { userId, role, createdAt: Date.now() })
  return token
}

function getSession(token) {
  if (!token) return null
  const s = sessions.get(token)
  if (!s) return null
  if (Date.now() - s.createdAt > SESSION_TTL) {
    sessions.delete(token)
    return null
  }
  return s
}

function deleteSession(token) {
  if (token) sessions.delete(token)
}

function setSessionTTL(hours) {
  SESSION_TTL = Math.max(1, hours) * 60 * 60 * 1000
}

module.exports = { createSession, getSession, deleteSession, setSessionTTL }
