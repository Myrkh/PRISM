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

const PRISM_GITHUB_REPO  = 'ton-org/prism'   // ← à adapter
const PRISM_ASSET_NAME   = 'prism-desktop-win.zip'
const IS_DEV             = !app.isPackaged

let mainWindow  = null
let splashWindow = null

// ─── Chemin PRISM installé ────────────────────────────────────────────────

function getPrismInstallDir() {
  const userData = app.getPath('userData')
  return path.join(path.dirname(userData), 'PRISM')
}

function getPrismExe() {
  return path.join(getPrismInstallDir(), 'PRISM.exe')
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

// Lancer PRISM
ipcMain.handle('prism:launch', async () => {
  if (!isPrismInstalled()) {
    return { ok: false, error: 'PRISM non installé' }
  }
  try {
    const prismProcess = spawn(getPrismExe(), [], {
      detached: true,
      stdio:    'ignore',
    })
    prismProcess.unref()
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
    const options = {
      hostname: 'api.github.com',
      path:     `/repos/${PRISM_GITHUB_REPO}/releases/latest`,
      headers:  { 'User-Agent': 'PRISM-Launcher/1.0.0' },
    }
    const req = https.get(options, res => {
      let data = ''
      res.on('data', chunk => (data += chunk))
      res.on('end', () => {
        try {
          const release = JSON.parse(data)
          const asset   = release.assets?.find(a => a.name === PRISM_ASSET_NAME)
          resolve({
            tag:         release.tag_name,
            name:        release.name,
            publishedAt: release.published_at,
            downloadUrl: asset?.browser_download_url ?? null,
            size:        asset ? Math.round(asset.size / 1024 / 1024) + ' Mo' : '—',
            body:        release.body ?? '',
          })
        } catch {
          resolve({ error: 'Impossible de parser la réponse GitHub' })
        }
      })
    })
    req.on('error', err => resolve({ error: err.message }))
    req.setTimeout(8000, () => { req.destroy(); resolve({ error: 'Timeout' }) })
  })
})

// Télécharger + installer une mise à jour
const ALLOWED_DOWNLOAD_PREFIX = 'https://github.com/Myrkh/PRISM/releases/download/'

ipcMain.handle('update:install', async (event, downloadUrl) => {
  if (typeof downloadUrl !== 'string' || !downloadUrl.startsWith(ALLOWED_DOWNLOAD_PREFIX)) {
    return { ok: false, error: 'URL de téléchargement non autorisée.' }
  }
  // Télécharge dans un fichier temp, extrait dans le dossier PRISM
  // Le renderer reçoit les événements de progression via mainWindow.webContents.send
  const tmpZip = path.join(app.getPath('temp'), 'prism-update.zip')

  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(tmpZip)
    https.get(downloadUrl, { headers: { 'User-Agent': 'PRISM-Launcher/1.0.0' } }, res => {
      const total = parseInt(res.headers['content-length'] ?? '0', 10)
      let received = 0

      res.on('data', chunk => {
        received += chunk.length
        file.write(chunk)
        if (total > 0) {
          mainWindow?.webContents.send('update:progress', {
            phase:    'downloading',
            progress: (received / total) * 100,
            label:    'Téléchargement…',
          })
        }
      })

      res.on('end', () => {
        file.end()
        mainWindow?.webContents.send('update:progress', { phase: 'installing', progress: 50 })

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
      })
    }).on('error', err => resolve({ ok: false, error: err.message }))
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
