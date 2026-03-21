/**
 * electron/preload.js — PRISM Launcher
 * Bridge sécurisé entre le process Electron et React.
 */

const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electron', {
  // Window controls
  minimize:    () => ipcRenderer.invoke('win:minimize'),
  maximize:    () => ipcRenderer.invoke('win:maximize'),
  close:       () => ipcRenderer.invoke('win:close'),

  // PRISM
  launchPrism: () => ipcRenderer.invoke('prism:launch'),
  openDataDir: () => ipcRenderer.invoke('prism:openDataDir'),

  // Updates
  checkUpdate:   ()      => ipcRenderer.invoke('update:check'),
  installUpdate: (url)   => ipcRenderer.invoke('update:install', url),
  onProgress:    (cb)    => ipcRenderer.on('update:progress', (_e, d) => cb(d)),
  offProgress:   (cb)    => ipcRenderer.removeListener('update:progress', cb),

  // Auth locale (SQLite)
  isSetup:      ()         => ipcRenderer.invoke('auth:isSetup'),
  login:        (payload)  => ipcRenderer.invoke('auth:login', payload),
  createUser:   (payload)  => ipcRenderer.invoke('auth:createUser', payload),
  updateUser:   (payload)  => ipcRenderer.invoke('auth:updateUser', payload),
  getUsers:     ()         => ipcRenderer.invoke('auth:getUsers'),
  getAudit:     ()         => ipcRenderer.invoke('auth:getAudit'),
  getLicense:   ()         => ipcRenderer.invoke('auth:getLicense'),
  setLicense:   (payload)  => ipcRenderer.invoke('auth:setLicense', payload),

  // Infos
  isDesktop: true,
  platform:  process.platform,
})
