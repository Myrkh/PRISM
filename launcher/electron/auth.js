/**
 * electron/auth.js — PRISM Launcher
 * Handlers IPC pour l'authentification locale (bcrypt + SQLite).
 */

const bcrypt = require('bcryptjs')
const db     = require('./db')

const SALT_ROUNDS = 12

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

// ── IPC handlers ───────────────────────────────────────────────────────────

async function handleIsSetup() {
  return db.userCount() > 0
}

async function handleLogin(_event, { email, password }) {
  const user = db.getUserByEmail(email)
  if (!user || !user.active) {
    return { ok: false, error: 'Identifiants incorrects.' }
  }
  const valid = await bcrypt.compare(password, user.password_hash)
  if (!valid) {
    db.log(user.id, user.email, 'LOGIN_FAILED')
    return { ok: false, error: 'Identifiants incorrects.' }
  }
  db.setLastLogin(user.id)
  db.log(user.id, user.email, 'LOGIN')
  return { ok: true, user: toPublic(user) }
}

async function handleCreateUser(_event, { email, fullName, password, role = 'user', requesterId = null }) {
  if (db.getUserByEmail(email)) {
    return { ok: false, error: 'Cet email est déjà utilisé.' }
  }
  const hash = await bcrypt.hash(password, SALT_ROUNDS)
  const user = db.createUser({ email, full_name: fullName, password_hash: hash, role, created_by: requesterId })
  db.log(requesterId, email, 'USER_CREATED', `role=${role}`)
  return { ok: true, user: toPublic(user) }
}

async function handleUpdateUser(_event, { requesterId, userId, patches }) {
  if (patches.password) {
    patches.password_hash = await bcrypt.hash(patches.password, SALT_ROUNDS)
    delete patches.password
  }
  db.updateUser(userId, patches)
  const u = db.getUserById(userId)
  db.log(requesterId, u?.email, 'USER_UPDATED', JSON.stringify(patches))
  return { ok: true, user: u ? toPublic(u) : null }
}

function handleGetUsers() {
  return db.getUsers().map(toPublic)
}

function handleGetAuditLog() {
  return db.getAuditLog(200)
}

function handleGetLicense() {
  return db.getLicense()
}

async function handleSetLicense(_event, payload) {
  db.setLicense(payload)
  db.log(null, null, 'LICENSE_SET', `company=${payload.company}`)
  return { ok: true }
}

module.exports = {
  handleIsSetup,
  handleLogin,
  handleCreateUser,
  handleUpdateUser,
  handleGetUsers,
  handleGetAuditLog,
  handleGetLicense,
  handleSetLicense,
}
