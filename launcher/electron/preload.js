/**
 * electron/preload.js — PRISM Launcher
 * Bridge sécurisé entre le process Electron et React.
 * Les appels privilégiés (admin) passent un sessionToken validé côté main process.
 */

const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electron', {
  // Window controls
  minimize:    () => ipcRenderer.invoke('win:minimize'),
  maximize:    () => ipcRenderer.invoke('win:maximize'),
  close:       () => ipcRenderer.invoke('win:close'),

  // PRISM
  launchPrism:     () => ipcRenderer.invoke('prism:launch'),
  openDataDir:     () => ipcRenderer.invoke('prism:openDataDir'),
  isPrismInstalled: () => ipcRenderer.invoke('prism:isInstalled'),
  getVersions:      () => ipcRenderer.invoke('prism:versions'),

  // Recent projects
  getRecentProjects: () => ipcRenderer.invoke('prism:recent:get'),

  // Settings
  getSettings: ()      => ipcRenderer.invoke('settings:get'),
  setSettings: (patch) => ipcRenderer.invoke('settings:set', patch),

  // PRISM updates
  checkUpdate:   ()      => ipcRenderer.invoke('update:check'),
  installUpdate: (url)   => ipcRenderer.invoke('update:install', url),
  onProgress:    (cb)    => ipcRenderer.on('update:progress', (_e, d) => cb(d)),
  offProgress:   (cb)    => ipcRenderer.removeListener('update:progress', cb),

  // Launcher updates
  checkLauncherUpdate:    ()      => ipcRenderer.invoke('launcher:update:check'),
  downloadLauncherUpdate: (url)   => ipcRenderer.invoke('launcher:update:download', url),
  applyLauncherUpdate:    ()      => ipcRenderer.invoke('launcher:update:apply'),
  onLauncherProgress:     (cb)    => ipcRenderer.on('launcher:update:progress', (_e, d) => cb(d)),
  offLauncherProgress:    (cb)    => ipcRenderer.removeListener('launcher:update:progress', cb),

  // Auth locale (SQLite)
  isSetup:    ()        => ipcRenderer.invoke('auth:isSetup'),
  login:      (payload) => ipcRenderer.invoke('auth:login', payload),
  logout:     (token)   => ipcRenderer.invoke('auth:logout', token),

  // Appels privilégiés — token validé côté main process
  createUser: (payload) => ipcRenderer.invoke('auth:createUser', payload),
  // payload = { token?, email, fullName, password, role } — token absent en mode setup
  updateUser: (payload) => ipcRenderer.invoke('auth:updateUser', payload),
  // payload = { token, userId, patches }
  getUsers:   (token)   => ipcRenderer.invoke('auth:getUsers',   token),
  getAudit:   (token)   => ipcRenderer.invoke('auth:getAudit',   token),
  getLicense: (token)   => ipcRenderer.invoke('auth:getLicense', token),
  setLicense: (payload) => ipcRenderer.invoke('auth:setLicense', payload),
  // payload = { token, ...licenseData }

  // Docs window
  openDocs: () => ipcRenderer.invoke('docs:open'),

  // Infos
  isDesktop: true,
  platform:  process.platform,
})
