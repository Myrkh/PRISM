/**
 * electron/preload-docs.js — PRISM Launcher
 * Minimal preload for the standalone documentation window.
 * Exposes only window controls on the same `electron` key for consistent usage.
 */

const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electron', {
  minimize: () => ipcRenderer.invoke('docs-win:minimize'),
  close:    () => ipcRenderer.invoke('docs-win:close'),
  isDesktop: true,
  platform:  process.platform,
})
