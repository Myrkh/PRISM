/**
 * electron/main.js — PRISM Launcher
 *
 * Responsabilités :
 *   1. Fenêtre frameless 900×620
 *   2. Exposition des APIs système via IPC (minimize, maximize, close, launchPrism, openDataDir)
 *   3. Vérification + lancement de PRISM (prism-desktop.exe)
 *   4. Gestion des téléchargements GitHub Releases (IPC vers le renderer)
 */

const { app, BrowserWindow, ipcMain, shell } = require('electron')
const path   = require('path')
const fs     = require('fs')
const https  = require('https')
const http   = require('http')
const { spawn, execFile } = require('child_process')
const auth    = require('./auth')
const session = require('./session')

// ─── Config ────────────────────────────────────────────────────────────────

const PRISM_GITHUB_REPO  = 'Myrkh/PRISM'
const PRISM_ASSET_NAME   = 'prism-desktop-win.zip'
const IS_DEV             = !app.isPackaged

let mainWindow   = null
let splashWindow = null
let prismWindow  = null
let docsWindow   = null

// ─── Chemin PRISM installé ────────────────────────────────────────────────

function getPrismInstallDir() {
  const userData = app.getPath('userData')
  return path.join(path.dirname(userData), 'PRISM')
}

function getPrismExe() {
  return path.join(getPrismInstallDir(), 'PRISM-backend', 'PRISM-backend.exe')
}

function isPrismInstalled() {
  return fs.existsSync(getPrismExe())
}

// ─── Splash screen ─────────────────────────────────────────────────────────

function createSplash() {
  splashWindow = new BrowserWindow({
    width:           300,
    height:          300,
    frame:           false,
    transparent:     false,
    resizable:       false,
    center:          true,
    skipTaskbar:     true,
    backgroundColor: '#0F1318',
    icon:            path.join(__dirname, '../public/logo.png'),
    webPreferences:  { nodeIntegration: false, contextIsolation: true },
  })
  splashWindow.loadFile(path.join(__dirname, 'splash.html'))
}

// ─── Fenêtre principale ────────────────────────────────────────────────────

function createWindow() {
  mainWindow = new BrowserWindow({
    width:           960,
    height:          640,
    minWidth:        780,
    minHeight:       520,
    frame:           false,
    titleBarStyle:   'hidden',
    backgroundColor: '#0F1318',
    show:            false,
    icon:            path.join(__dirname, '../public/logo.png'),
    webPreferences: {
      preload:          path.join(__dirname, 'preload.js'),
      nodeIntegration:  false,
      contextIsolation: true,
      webSecurity:      true,
    },
  })

  if (IS_DEV) {
    mainWindow.loadURL('http://localhost:5174')
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  // Bloquer DevTools en production (Ctrl+Shift+I, F12, etc.)
  if (!IS_DEV) {
    mainWindow.webContents.on('before-input-event', (event, input) => {
      if (
        input.key === 'F12' ||
        (input.control && input.shift && ['i', 'I', 'j', 'J', 'c', 'C'].includes(input.key))
      ) {
        event.preventDefault()
      }
    })
  }

  mainWindow.once('ready-to-show', () => {
    // Ferme la splash avant d'afficher la fenêtre principale
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.close()
      splashWindow = null
    }
    mainWindow.show()
    mainWindow.focus()
  })

  mainWindow.on('closed', () => { mainWindow = null })
}

// ─── Docs window ──────────────────────────────────────────────────────────────

function openDocsWindow() {
  if (docsWindow && !docsWindow.isDestroyed()) {
    docsWindow.focus()
    return
  }
  docsWindow = new BrowserWindow({
    width:           1200,
    height:          820,
    minWidth:        900,
    minHeight:       600,
    frame:           false,
    titleBarStyle:   'hidden',
    backgroundColor: '#0F1318',
    icon:            path.join(__dirname, '../public/logo.png'),
    webPreferences: {
      preload:          path.join(__dirname, 'preload-docs.js'),
      nodeIntegration:  false,
      contextIsolation: true,
      webSecurity:      true,
    },
  })

  if (IS_DEV) {
    docsWindow.loadURL('http://localhost:5174/docs.html')
  } else {
    docsWindow.loadFile(path.join(__dirname, '../dist/docs.html'))
  }

  ipcMain.removeHandler('docs-win:minimize')
  ipcMain.removeHandler('docs-win:close')
  ipcMain.handle('docs-win:minimize', () => docsWindow?.minimize())
  ipcMain.handle('docs-win:close',    () => docsWindow?.close())

  docsWindow.on('closed', () => {
    docsWindow = null
    ipcMain.removeHandler('docs-win:minimize')
    ipcMain.removeHandler('docs-win:close')
  })
}

// ─── Launcher settings (JSON persistence) ────────────────────────────────

const DEFAULT_SETTINGS = {
  prismWindow: {
    rememberBounds:         true,
    defaultSize:            'last_used',
    rememberPosition:       true,
    minimizeLauncherOnOpen: false,
  },
  backend: {
    startupTimeoutSecs: 30,
    autoStartPrism:     false,
    autoUpdatePrism:    false,
  },
  session: {
    durationHours: 8,
  },
}

function getSettingsPath() {
  return path.join(app.getPath('userData'), 'launcher-settings.json')
}

function readSettings() {
  try {
    if (!fs.existsSync(getSettingsPath())) return structuredClone(DEFAULT_SETTINGS)
    const saved = JSON.parse(fs.readFileSync(getSettingsPath(), 'utf8'))
    return {
      prismWindow: { ...DEFAULT_SETTINGS.prismWindow, ...saved.prismWindow },
      backend:     { ...DEFAULT_SETTINGS.backend,     ...saved.backend     },
      session:     { ...DEFAULT_SETTINGS.session,     ...saved.session     },
    }
  } catch {
    return structuredClone(DEFAULT_SETTINGS)
  }
}

function writeSettings(settings) {
  try {
    fs.writeFileSync(getSettingsPath(), JSON.stringify(settings, null, 2), 'utf8')
  } catch { /* non-critical */ }
}

// ─── PRISM window bounds (JSON persistence) ───────────────────────────────

function getPrismBoundsPath() {
  return path.join(app.getPath('userData'), 'prism-window-bounds.json')
}

function readPrismBounds() {
  try {
    const p = getPrismBoundsPath()
    if (!fs.existsSync(p)) return null
    return JSON.parse(fs.readFileSync(p, 'utf8'))
  } catch { return null }
}

function writePrismBounds(bounds) {
  try {
    fs.writeFileSync(getPrismBoundsPath(), JSON.stringify(bounds), 'utf8')
  } catch { /* non-critical */ }
}

// ─── Recent projects (JSON persistence) ───────────────────────────────────

const MAX_RECENT_PROJECTS = 8

function getRecentProjectsPath() {
  return path.join(app.getPath('userData'), 'recent-projects.json')
}

function readRecentProjects() {
  try {
    const filePath = getRecentProjectsPath()
    if (!fs.existsSync(filePath)) return []
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch {
    return []
  }
}

function writeRecentProjects(entries) {
  try {
    fs.writeFileSync(getRecentProjectsPath(), JSON.stringify(entries, null, 2), 'utf8')
  } catch { /* silent — non-critical */ }
}

// ─── IPC handlers ──────────────────────────────────────────────────────────

// Auth
ipcMain.handle('auth:isSetup',    auth.handleIsSetup)
ipcMain.handle('auth:login',      auth.handleLogin)
ipcMain.handle('auth:logout',     auth.handleLogout)
ipcMain.handle('auth:createUser', auth.handleCreateUser)
ipcMain.handle('auth:updateUser', auth.handleUpdateUser)
ipcMain.handle('auth:getUsers',   auth.handleGetUsers)
ipcMain.handle('auth:getAudit',   auth.handleGetAuditLog)
ipcMain.handle('auth:getLicense', auth.handleGetLicense)
ipcMain.handle('auth:setLicense', auth.handleSetLicense)

// Window controls
ipcMain.handle('win:minimize',  () => mainWindow?.minimize())
ipcMain.handle('win:maximize',  () => {
  mainWindow?.isMaximized() ? mainWindow.unmaximize() : mainWindow?.maximize()
})
ipcMain.handle('win:close',     () => mainWindow?.close())

ipcMain.handle('prism:isInstalled', () => isPrismInstalled())

ipcMain.handle('prism:versions', () => {
  const launcherVersion = app.getVersion()
  let prismVersion = null
  try {
    const versionFile = path.join(getPrismInstallDir(), 'version.json')
    if (fs.existsSync(versionFile)) {
      const data = JSON.parse(fs.readFileSync(versionFile, 'utf8'))
      prismVersion = data.version ?? null
    }
  } catch { /* pas de version.json */ }
  return { launcher: launcherVersion, prism: prismVersion }
})

// ── Helpers PRISM ──────────────────────────────────────────────────────────

function waitForPrismBackend(timeoutMs) {
  const ms = timeoutMs ?? (readSettings().backend.startupTimeoutSecs * 1000)
  return new Promise((resolve, reject) => {
    const start = Date.now()
    const attempt = () => {
      const req = http.get('http://localhost:8000/health', res => {
        if (res.statusCode === 200) resolve()
        else schedule()
      })
      req.on('error', schedule)
      req.setTimeout(1000, () => { req.destroy(); schedule() })
    }
    const schedule = () => {
      if (Date.now() - start > ms) {
        reject(new Error('PRISM backend timeout — vérifiez l\'installation.'))
      } else {
        setTimeout(attempt, 600)
      }
    }
    attempt()
  })
}

function openPrismWindow() {
  if (prismWindow && !prismWindow.isDestroyed()) {
    prismWindow.focus()
    return
  }

  const settings = readSettings()
  const { defaultSize, rememberBounds, rememberPosition, minimizeLauncherOnOpen } = settings.prismWindow

  // Résoudre les dimensions initiales
  const SIZE_PRESETS = {
    '1280x800':  { width: 1280, height: 800  },
    '1440x900':  { width: 1440, height: 900  },
    '1920x1080': { width: 1920, height: 1080 },
    'maximized': { width: 1440, height: 900  },
  }
  let initialBounds = { width: 1440, height: 900, x: undefined, y: undefined }

  if (defaultSize === 'last_used' && rememberBounds) {
    const saved = readPrismBounds()
    if (saved) initialBounds = saved
  } else if (defaultSize in SIZE_PRESETS) {
    Object.assign(initialBounds, SIZE_PRESETS[defaultSize])
  }

  prismWindow = new BrowserWindow({
    width:    initialBounds.width,
    height:   initialBounds.height,
    x:        rememberPosition ? initialBounds.x : undefined,
    y:        rememberPosition ? initialBounds.y : undefined,
    minWidth: 1024,
    minHeight: 600,
    frame:    false,
    icon:     path.join(__dirname, '../public/logo.png'),
    title:    'PRISM',
    webPreferences: {
      nodeIntegration:  false,
      contextIsolation: true,
      webSecurity:      true,
      preload:          path.join(__dirname, 'preload-prism.js'),
    },
  })
  prismWindow.setMenuBarVisibility(false)

  if (defaultSize === 'maximized') prismWindow.maximize()

  // Sauvegarder bounds à la fermeture
  prismWindow.on('close', () => {
    if (prismWindow && !prismWindow.isDestroyed()) {
      writePrismBounds(prismWindow.getBounds())
    }
  })

  // Handlers de contrôle fenêtre pour le frontend PRISM
  ipcMain.removeHandler('prism-win:minimize')
  ipcMain.removeHandler('prism-win:maximize')
  ipcMain.removeHandler('prism-win:close')
  ipcMain.handle('prism-win:minimize', () => prismWindow?.minimize())
  ipcMain.handle('prism-win:maximize', () => {
    prismWindow?.isMaximized() ? prismWindow.unmaximize() : prismWindow?.maximize()
  })
  ipcMain.handle('prism-win:close', () => prismWindow?.close())

  prismWindow.webContents.session.clearCache().finally(() => {
    prismWindow.loadURL('http://localhost:8000')
  })
  prismWindow.on('closed', () => { prismWindow = null })

  // Réduire le Launcher si le setting est activé
  if (minimizeLauncherOnOpen) mainWindow?.minimize()
}

// Lancer PRISM
ipcMain.handle('prism:launch', async () => {
  if (!isPrismInstalled()) {
    return { ok: false, error: 'PRISM non installé. Utilisez l\'onglet Updates pour l\'installer.' }
  }
  // Si la fenêtre est déjà ouverte, juste focus
  if (prismWindow && !prismWindow.isDestroyed()) {
    prismWindow.focus()
    return { ok: true }
  }
  try {
    // Démarrer le backend Python
    const prismProcess = spawn(getPrismExe(), [], {
      detached: true,
      stdio:    'ignore',
      cwd:      path.dirname(getPrismExe()),
    })
    prismProcess.unref()

    // Attendre que le backend soit prêt (max 30s)
    await waitForPrismBackend()

    // Ouvrir PRISM dans sa propre fenêtre
    openPrismWindow()
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err.message }
  }
})

// Recent projects
ipcMain.handle('prism:recent:get', () => readRecentProjects())

ipcMain.handle('prism:recent:record', (_event, data) => {
  if (!data?.id || typeof data.id !== 'string') return
  const sanitized = {
    id:       data.id,
    name:     typeof data.name     === 'string' ? data.name     : '—',
    standard: typeof data.standard === 'string' ? data.standard : '—',
    sifCount: typeof data.sifCount === 'number' ? data.sifCount : 0,
    openedAt: typeof data.openedAt === 'string' ? data.openedAt : new Date().toISOString(),
  }
  const entries = readRecentProjects().filter(e => e.id !== sanitized.id)
  entries.unshift(sanitized)
  writeRecentProjects(entries.slice(0, MAX_RECENT_PROJECTS))
})

// Docs window
ipcMain.handle('docs:open', () => openDocsWindow())

// Settings
ipcMain.handle('settings:get', () => readSettings())
ipcMain.handle('settings:set', (_event, patch) => {
  const current = readSettings()
  const merged = {
    prismWindow: { ...current.prismWindow, ...patch?.prismWindow },
    backend:     { ...current.backend,     ...patch?.backend     },
    session:     { ...current.session,     ...patch?.session     },
  }
  writeSettings(merged)
  // Appliquer la durée de session immédiatement
  if (patch?.session?.durationHours) {
    session.setSessionTTL(merged.session.durationHours)
  }
  return merged
})

// Launcher auto-update
const LAUNCHER_ASSET_PREFIX = 'PRISM-Launcher-Setup-'

ipcMain.handle('launcher:update:check', () => {
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.github.com',
      path:     `/repos/${PRISM_GITHUB_REPO}/releases?per_page=20`,
      headers:  { 'User-Agent': 'PRISM-Launcher/1.0.0' },
    }
    const req = https.get(options, res => {
      let data = ''
      res.on('data', chunk => (data += chunk))
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data)
          if (!Array.isArray(parsed)) {
            resolve({ error: parsed?.message ?? 'Réponse GitHub inattendue.' })
            return
          }
          const releases = parsed.filter(r =>
            r.tag_name?.startsWith('launcher-v') &&
            r.assets?.some(a => a.name?.startsWith(LAUNCHER_ASSET_PREFIX))
          )
          if (!releases.length) {
            resolve({ error: 'Aucune release Launcher trouvée sur GitHub.' })
            return
          }
          const latest = releases[0]
          const asset  = latest.assets.find(a => a.name?.startsWith(LAUNCHER_ASSET_PREFIX))
          resolve({
            tag:         latest.tag_name,
            name:        latest.name,
            publishedAt: latest.published_at,
            downloadUrl: asset.browser_download_url,
            size:        Math.round(asset.size / 1024 / 1024) + ' Mo',
            body:        latest.body ?? '',
            history: releases.map(r => ({
              tag:         r.tag_name,
              name:        r.name,
              publishedAt: r.published_at,
              body:        r.body ?? '',
            })),
          })
        } catch (e) {
          resolve({ error: 'Impossible de parser la réponse GitHub : ' + e.message })
        }
      })
    })
    req.on('error', err => resolve({ error: err.message }))
    req.setTimeout(8000, () => { req.destroy(); resolve({ error: 'Timeout' }) })
  })
})

ipcMain.handle('launcher:update:download', async (event, downloadUrl) => {
  if (typeof downloadUrl !== 'string' || !downloadUrl.startsWith(ALLOWED_DOWNLOAD_PREFIX)) {
    return { ok: false, error: 'URL de téléchargement non autorisée.' }
  }
  const tmpExe = path.join(app.getPath('temp'), 'prism-launcher-setup.exe')

  return new Promise((resolve) => {
    downloadFile(downloadUrl, tmpExe, (ratio) => {
      mainWindow?.webContents.send('launcher:update:progress', {
        phase:    'downloading',
        progress: ratio * 100,
        label:    'Téléchargement du Launcher…',
      })
    }).then(() => {
      mainWindow?.webContents.send('launcher:update:progress', { phase: 'ready' })
      resolve({ ok: true })
    }).catch(err => resolve({ ok: false, error: err.message }))
  })
})

ipcMain.handle('launcher:update:apply', () => {
  const tmpExe = path.join(app.getPath('temp'), 'prism-launcher-setup.exe')
  if (!fs.existsSync(tmpExe)) {
    return { ok: false, error: 'Fichier d\'installation introuvable.' }
  }
  // Lance l'installateur en mode silencieux, puis quitte le Launcher
  execFile(tmpExe, ['/S'], { detached: true, stdio: 'ignore' })
  setTimeout(() => app.quit(), 500)
  return { ok: true }
})

// Ouvrir le dossier de données
ipcMain.handle('prism:openDataDir', async () => {
  const dir = app.getPath('userData').replace('PRISM Launcher', 'PRISM')
  await shell.openPath(dir)
})

// Vérifier les mises à jour (GitHub API)
ipcMain.handle('update:check', async () => {
  return new Promise((resolve) => {
    // On liste les releases pour trouver la dernière avec prism-desktop-win.zip
    // (évite le problème si la release launcher-v* est plus récente que prism-v*)
    const options = {
      hostname: 'api.github.com',
      path:     `/repos/${PRISM_GITHUB_REPO}/releases?per_page=20`,
      headers:  { 'User-Agent': 'PRISM-Launcher/1.0.0' },
    }
    const req = https.get(options, res => {
      let data = ''
      res.on('data', chunk => (data += chunk))
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data)
          if (!Array.isArray(parsed)) {
            resolve({ error: parsed?.message ?? 'Réponse GitHub inattendue.' })
            return
          }
          // Toutes les releases PRISM (avec prism-desktop-win.zip)
          const prismReleases = parsed.filter(r => r.assets?.some(a => a.name === PRISM_ASSET_NAME))
          if (!prismReleases.length) {
            resolve({ error: 'Aucune release PRISM trouvée sur GitHub.' })
            return
          }
          // La plus récente = latest
          const latest = prismReleases[0]
          const asset  = latest.assets.find(a => a.name === PRISM_ASSET_NAME)
          resolve({
            tag:         latest.tag_name,
            name:        latest.name,
            publishedAt: latest.published_at,
            downloadUrl: asset.browser_download_url,
            size:        Math.round(asset.size / 1024 / 1024) + ' Mo',
            body:        latest.body ?? '',
            // Historique complet pour le changelog
            history: prismReleases.map(r => ({
              tag:         r.tag_name,
              name:        r.name,
              publishedAt: r.published_at,
              body:        r.body ?? '',
            })),
          })
        } catch (e) {
          resolve({ error: 'Impossible de parser la réponse GitHub : ' + e.message })
        }
      })
    })
    req.on('error', err => resolve({ error: err.message }))
    req.setTimeout(8000, () => { req.destroy(); resolve({ error: 'Timeout' }) })
  })
})

// Télécharger + installer une mise à jour
const ALLOWED_DOWNLOAD_PREFIX = 'https://github.com/Myrkh/PRISM/releases/download/'

function downloadFile(url, destPath, onProgress) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath)
    const request = (reqUrl) => {
      https.get(reqUrl, { headers: { 'User-Agent': 'PRISM-Launcher/1.0.0' } }, res => {
        // Suivre les redirects (GitHub redirige les assets vers CDN)
        if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307 || res.statusCode === 308) {
          res.resume()
          return request(res.headers.location)
        }
        if (res.statusCode !== 200) {
          file.close()
          reject(new Error(`Erreur HTTP ${res.statusCode}`))
          return
        }
        const total = parseInt(res.headers['content-length'] ?? '0', 10)
        let received = 0
        res.on('data', chunk => {
          received += chunk.length
          file.write(chunk)
          if (total > 0) onProgress(received / total)
        })
        res.on('end', () => { file.end(); resolve() })
        res.on('error', reject)
      }).on('error', reject)
    }
    request(url)
  })
}

ipcMain.handle('update:install', async (event, downloadUrl) => {
  if (typeof downloadUrl !== 'string' || !downloadUrl.startsWith(ALLOWED_DOWNLOAD_PREFIX)) {
    return { ok: false, error: 'URL de téléchargement non autorisée.' }
  }
  const tmpZip = path.join(app.getPath('temp'), 'prism-update.zip')

  return new Promise((resolve) => {
    downloadFile(downloadUrl, tmpZip, (ratio) => {
      mainWindow?.webContents.send('update:progress', {
        phase:    'downloading',
        progress: ratio * 100,
        label:    'Téléchargement…',
      })
    }).then(() => {
      mainWindow?.webContents.send('update:progress', { phase: 'installing', progress: 50, label: 'Installation…' })

        // Extraction avec PowerShell (Windows natif, pas de dépendance)
        const installDir = getPrismInstallDir()
        fs.mkdirSync(installDir, { recursive: true })
        execFile('powershell', [
          '-NoProfile', '-Command',
          `Expand-Archive -Path '${tmpZip}' -DestinationPath '${installDir}' -Force`,
        ], err => {
          if (err) {
            resolve({ ok: false, error: err.message })
          } else {
            mainWindow?.webContents.send('update:progress', { phase: 'done', progress: 100 })
            resolve({ ok: true })
          }
        })
    }).catch(err => resolve({ ok: false, error: err.message }))
  })
})

// ─── Lifecycle ─────────────────────────────────────────────────────────────

app.whenReady().then(() => {
  // Appliquer la durée de session configurée
  const settings = readSettings()
  session.setSessionTTL(settings.session.durationHours)

  createSplash()
  createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
