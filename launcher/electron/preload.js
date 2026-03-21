/**
 * electron/preload.js — PRISM Launcher
 * Bridge sécurisé entre le process Electron et React.
 * Expose uniquement les APIs nécessaires via contextBridge.
 */

const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electron', {
  // Window controls (appelés depuis TitleBar.tsx)
  minimize:    () => ipcRenderer.invoke('win:minimize'),
  maximize:    () => ipcRenderer.invoke('win:maximize'),
  close:       () => ipcRenderer.invoke('win:close'),

  // PRISM
  launchPrism: () => ipcRenderer.invoke('prism:launch'),
  openDataDir: () => ipcRenderer.invoke('prism:openDataDir'),

  // Updates
  checkUpdate:  ()             => ipcRenderer.invoke('update:check'),
  installUpdate: (url) => ipcRenderer.invoke('update:install', url),
  onProgress:   (cb)           => ipcRenderer.on('update:progress', (_event, data) => cb(data)),
  offProgress:  (cb)           => ipcRenderer.removeListener('update:progress', cb),

  // Infos
  isDesktop:   true,
  platform:    process.platform,
})
