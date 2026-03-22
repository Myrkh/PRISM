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
const auth   = require('./auth')

// ─── Config ────────────────────────────────────────────────────────────────

const PRISM_GITHUB_REPO  = 'Myrkh/PRISM'
const PRISM_ASSET_NAME   = 'prism-desktop-win.zip'
const IS_DEV             = !app.isPackaged

let mainWindow   = null
let splashWindow = null
let prismWindow  = null

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

function waitForPrismBackend(timeoutMs = 30000) {
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
      if (Date.now() - start > timeoutMs) {
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
  prismWindow = new BrowserWindow({
    width:    1440,
    height:   900,
    minWidth: 1024,
    minHeight: 600,
    icon:     path.join(__dirname, '../public/logo.png'),
    title:    'PRISM',
    webPreferences: {
      nodeIntegration:  false,
      contextIsolation: true,
      webSecurity:      true,
    },
  })
  prismWindow.setMenuBarVisibility(false)
  prismWindow.loadURL('http://localhost:8000')
  prismWindow.on('closed', () => { prismWindow = null })
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
  createSplash()
  createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
