/**
 * electron/preload-prism.js
 * Bridge minimal exposé à la fenêtre PRISM (localhost:8000).
 * Permet au frontend PRISM de savoir qu'il tourne en mode desktop
 * et de contrôler la fenêtre native (frameless).
 */

const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('prismDesktop', {
  isDesktop: true,
  minimize:  () => ipcRenderer.invoke('prism-win:minimize'),
  maximize:  () => ipcRenderer.invoke('prism-win:maximize'),
  close:     () => ipcRenderer.invoke('prism-win:close'),
  recordRecentProject: (data) => ipcRenderer.invoke('prism:recent:record', data),
  exportNotePdf: (payload) => ipcRenderer.invoke('prism:note:exportPdf', payload),
})
