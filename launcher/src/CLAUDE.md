# src/ — UI React du Launcher

## Structure

```
src/
├── main.tsx              # Entrée React (monte <App />)
├── App.tsx               # Shell racine + déclaration Window.electron
├── tokens.ts             # Tokens design (colors, alpha, spacing)
├── vite-env.d.ts         # Types Vite + module *.png
├── types/index.ts        # Interfaces TS globales (LauncherSettings, RecentProject, etc.)
├── components/           # Toutes les vues et composants UI → voir CLAUDE.md là-dedans
├── features/library/     # templateUtils.ts (stub no-op pour isolation front/docs)
├── hooks/useTheme.ts     # Hook thème (dark/light, localStorage 'prism-launcher-theme')
├── i18n/                 # Traductions EN/FR + hook useLocale
└── docs-entry.tsx        # Entrée React de la fenêtre Documentation (charge DocsWindow)
```

## Types clés (src/types/index.ts)

```ts
LauncherSettings {
  prismWindow: { rememberBounds, defaultSize, rememberPosition, minimizeLauncherOnOpen }
  backend:     { startupTimeoutSecs, autoStartPrism, autoUpdatePrism }
  session:     { durationHours: 1 | 4 | 8 | 24 }
}

RecentProject {
  name, standard, sifCount, lastOpenedAt (ISO string), path
}
```

## Window.electron (déclaré dans App.tsx)
```ts
window.electron.{
  // Auth
  isSetup, login, logout, createUser, updateUser, getUsers, getAuditLog, getLicense, setLicense,
  // Fenêtre
  minimize, maximize, close,
  // PRISM
  isInstalled, getVersions, launchPrism, getRecentProjects, recordRecentProject, openPrismDataDir,
  // Updates
  checkForUpdates, installUpdate, checkLauncherUpdate, downloadLauncherUpdate, applyLauncherUpdate,
  // Settings
  getSettings, setSettings,
  // Docs
  openDocs,
  // Infos
  isDesktop, platform
}
```

## Pattern IPC dans les composants
```ts
// Toujours vérifier l'existence (fenêtre docs n'a pas tous les bridges)
const settings = await window.electron?.getSettings?.() ?? DEFAULT_SETTINGS

// setSettings accepte un partial deep-merge côté main.js
await window.electron.setSettings({ session: { durationHours: 4 } })
```
