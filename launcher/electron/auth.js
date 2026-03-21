/**
 * electron/auth.js — PRISM Launcher
 * Handlers IPC : authentification locale (bcrypt + SQLite).
 * Sécurité : rate limiting login, sessions en mémoire, guards admin côté main process.
 */

const bcrypt  = require('bcryptjs')
const db      = require('./db')
const session = require('./session')

const SALT_ROUNDS  = 12
const MAX_ATTEMPTS = 5
const LOCK_MS      = 15 * 60 * 1000 // 15 min

// ── Rate limiting ─────────────────────────────────────────────────────────────

const loginAttempts = new Map() // email → { count, lockedUntil }

function isLocked(email) {
  const e = loginAttempts.get(email)
  if (!e) return false
  if (e.lockedUntil && Date.now() < e.lockedUntil) return true
  if (e.lockedUntil) { loginAttempts.delete(email); return false }
  return false
}

function recordFailure(email) {
  const e = loginAttempts.get(email) ?? { count: 0, lockedUntil: null }
  e.count += 1
  if (e.count >= MAX_ATTEMPTS) e.lockedUntil = Date.now() + LOCK_MS
  loginAttempts.set(email, e)
}

function clearAttempts(email) {
  loginAttempts.delete(email)
}

// ── Guards ────────────────────────────────────────────────────────────────────

/** Retourne la session si le token est valide et que le rôle est admin, sinon null. */
function requireAdmin(token) {
  const s = session.getSession(token)
  if (!s || s.role !== 'admin') return null
  return s
}

/** Retourne la session si le token est valide (n'importe quel rôle), sinon null. */
function requireAuth(token) {
  return session.getSession(token) ?? null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeInitials(fullName) {
  const parts = fullName.trim().split(/\s+/)
  return parts.length === 1
    ? parts[0].slice(0, 2).toUpperCase()
    : `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}

function toPublic(u) {
  return {
    id:        u.id,
    email:     u.email,
    fullName:  u.full_name,
    initials:  makeInitials(u.full_name),
    role:      u.role,
    active:    u.active === 1,
    createdAt: u.created_at,
    lastLogin: u.last_login ?? null,
  }
}

// ── IPC handlers ──────────────────────────────────────────────────────────────

async function handleIsSetup() {
  return db.userCount() > 0
}

async function handleLogin(_event, { email, password }) {
  if (isLocked(email)) {
    return { ok: false, error: 'Trop de tentatives. Réessayez dans 15 minutes.' }
  }
  const user = db.getUserByEmail(email)
  if (!user || !user.active) {
    recordFailure(email)
    return { ok: false, error: 'Identifiants incorrects.' }
  }
  const valid = await bcrypt.compare(password, user.password_hash)
  if (!valid) {
    recordFailure(email)
    db.log(user.id, user.email, 'LOGIN_FAILED')
    return { ok: false, error: 'Identifiants incorrects.' }
  }
  clearAttempts(email)
  db.setLastLogin(user.id)
  db.log(user.id, user.email, 'LOGIN')
  const token = session.createSession(user.id, user.role)
  return { ok: true, user: toPublic(user), sessionToken: token }
}

async function handleLogout(_event, token) {
  session.deleteSession(token)
}

async function handleCreateUser(_event, { token, email, fullName, password, role = 'user' }) {
  // Mode setup : premier lancement, aucun utilisateur — aucun token requis.
  const isSetup = db.userCount() === 0
  let callerId = null
  if (!isSetup) {
    const s = requireAdmin(token)
    if (!s) return { ok: false, error: 'Non autorisé.' }
    callerId = s.userId
  }
  const finalRole = isSetup ? 'admin' : (role === 'admin' ? 'admin' : 'user')
  if (db.getUserByEmail(email)) {
    return { ok: false, error: 'Cet email est déjà utilisé.' }
  }
  const hash = await bcrypt.hash(password, SALT_ROUNDS)
  const user = db.createUser({ email, full_name: fullName, password_hash: hash, role: finalRole, created_by: callerId })
  db.log(callerId, email, 'USER_CREATED', `role=${finalRole}`)
  return { ok: true, user: toPublic(user) }
}

async function handleUpdateUser(_event, { token, userId, patches }) {
  const s = requireAdmin(token)
  if (!s) return { ok: false, error: 'Non autorisé.' }
  // Interdire à un admin de se rétrograder lui-même
  if (userId === s.userId && patches.role && patches.role !== 'admin') {
    return { ok: false, error: 'Impossible de changer votre propre rôle.' }
  }
  if (patches.password) {
    patches.password_hash = await bcrypt.hash(patches.password, SALT_ROUNDS)
    delete patches.password
  }
  db.updateUser(userId, patches)
  const u = db.getUserById(userId)
  db.log(s.userId, u?.email, 'USER_UPDATED', JSON.stringify(patches))
  return { ok: true, user: u ? toPublic(u) : null }
}

function handleGetUsers(_event, token) {
  if (!requireAdmin(token)) return []
  return db.getUsers().map(toPublic)
}

function handleGetAuditLog(_event, token) {
  if (!requireAdmin(token)) return []
  return db.getAuditLog(200)
}

function handleGetLicense(_event, token) {
  if (!requireAdmin(token)) return null
  return db.getLicense()
}

async function handleSetLicense(_event, { token, ...payload }) {
  const s = requireAdmin(token)
  if (!s) return { ok: false, error: 'Non autorisé.' }
  db.setLicense(payload)
  db.log(s.userId, null, 'LICENSE_SET', `company=${payload.company}`)
  return { ok: true }
}

module.exports = {
  handleIsSetup,
  handleLogin,
  handleLogout,
  handleCreateUser,
  handleUpdateUser,
  handleGetUsers,
  handleGetAuditLog,
  handleGetLicense,
  handleSetLicense,
}
