# PRISM Launcher — Guide Claude

## Monorepo rapide
```
/home/user/safeloop/
├── launcher/      ← CE REPO (Electron + React UI)
├── front/         ← PRISM Desktop app (React + Zustand + Supabase)
├── backend/       ← FastAPI SIL calc engine (Python)
└── supabase/      ← DB schema & migrations
```

## Stack Launcher
- **Electron 29** + contextIsolation + preload scripts séparés par fenêtre
- **React 18 + TypeScript** + Vite 5 (dual build: main + docs)
- **TailwindCSS** + tokens centraux dans `src/tokens.ts`
- **better-sqlite3** (auth locale) + JSON files (settings, recent projects)
- Builds → `npm run dist` → NSIS installer Windows

---

## Routing : "Je veux faire X → je regarde Y"

### Fenêtres Electron
| Fenêtre | Config | Preload | Entrée Vite |
|---------|--------|---------|-------------|
| Main (Launcher) | `electron/main.js` → `createMainWindow()` | `electron/preload.js` | `index.html` |
| PRISM Desktop | `electron/main.js` → `openPrismWindow()` | `electron/preload-prism.js` | Charge `front/dist/` |
| Documentation | `electron/main.js` → `openDocsWindow()` | `electron/preload-docs.js` | `docs.html` |
| Splash | `electron/main.js` → `createSplashWindow()` | aucun | inline HTML |

### Ajouter un IPC handler
1. Handler → `electron/main.js` : `ipcMain.handle('channel:name', async () => ...)`
2. Bridge → preload concerné : `contextBridge.exposeInMainWorld('electron', { fn: () => ipcRenderer.invoke('channel:name') })`
3. Type → `src/App.tsx` : déclarer dans `interface Window.electron`
4. Appel → composant : `window.electron?.fn?.()`

### Modifier une vue UI
| Vue | Fichier |
|-----|---------|
| Accueil (projets récents, lancer PRISM) | `src/components/HomeView.tsx` |
| Mises à jour (PRISM + Launcher) | `src/components/UpdatesView.tsx` |
| Paramètres | `src/components/SettingsView.tsx` |
| Admin (utilisateurs, audit, licence) | `src/components/AdminView.tsx` |
| Connexion / Signup | `src/components/AuthScreen.tsx` |
| Fenêtre Documentation | `src/components/docs/DocsWindow.tsx` |
| Shell principal | `src/components/LauncherShell.tsx` |
| Barre latérale nav | `src/components/Sidebar.tsx` |

### Persistance des données
| Donnée | Fichier | Accès IPC |
|--------|---------|-----------|
| Settings utilisateur | `userData/launcher-settings.json` | `settings:get` / `settings:set` |
| Projets récents | `userData/recent-projects.json` | `prism:recent:get` / `prism:recent:record` |
| Bounds fenêtre PRISM | `userData/prism-window-bounds.json` | via `settings:get` |
| Auth / utilisateurs | `userData/prism-launcher.db` (SQLite) | `auth:*` handlers |
| Audit log | SQLite `audit_log` table | `auth:getAuditLog` |

### Modifier le process Electron (main)
- Fenêtres → `electron/main.js` (functions `create*Window`, `open*Window`)
- Auth → `electron/auth.js`
- Session TTL → `electron/session.js` (export `setSessionTTL`)
- DB helpers → `electron/db.js`

---

## Patterns obligatoires

### Tokens de design
```ts
import { colors, alpha } from '@/tokens'
// NE PAS hardcoder de couleurs hex — utiliser les tokens
// BORDER, TEAL, TEXT, TEXT_DIM, PANEL_BG = tokens centraux
```

### IPC depuis React
```ts
// Appel safe (la fenêtre docs n'a pas tous les bridges)
window.electron?.openDocs?.()
// Appel direct
await window.electron.setSettings({ session: { durationHours: 8 } })
```

### Types
- Types globaux → `src/types/index.ts`
- `LauncherSettings` → `{ prismWindow, backend, session }` — toujours deep-merge avec `setSettings`
- `RecentProject` → `{ name, standard, sifCount, lastOpenedAt, path }`

---

## Commandes dev
```bash
npm run dev        # Electron + Vite en watch (port 5174)
npm run build      # tsc --noEmit + vite build → dist/
npm run dist       # electron-builder → PRISM-Launcher-Setup-v*.exe
npx tsc --noEmit   # Vérification TypeScript seule
```

## Build CI
- GitHub Actions : `.github/workflows/` (dans /home/user/safeloop/.github/)
- Tag format : `launcher-v1.0.x` → déclenche le build Windows
- Artefact : `PRISM-Launcher-Setup-v*.exe` attaché à la Release GitHub

---

## Cross-project : front/src/docs/
Les docs sont sourcées depuis `../front/src/docs/` (pas copiées).
- Alias Vite : `@/docs/*` → `../front/src/docs/*`
- Alias tsconfig paths : `@/docs/*`, `react` → `@types/react`, `lucide-react`
- Stub isolation : `src/features/library/templateUtils.ts` (no-op)
- Voir `vite.config.ts` et `tsconfig.json` pour la config complète

---

## Fichiers à ne PAS toucher sans raison
- `electron/preload.js` — 29 bridges IPC, toujours maintenir la parité avec les handlers main.js
- `tsconfig.json` paths — ordre critique (`@/docs` avant `@`)
- `vite.config.ts` alias — regex `/^@\/docs/` doit précéder `@`
