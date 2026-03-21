# PRISM Launcher

Launcher Electron autonome pour PRISM Desktop.
Design identique à l'app PRISM — même tokens, même DA, même composants.

## Structure

```
launcher/
├── src/
│   ├── components/
│   │   ├── TitleBar.tsx        ← Barre de titre frameless
│   │   ├── AuthScreen.tsx      ← Login / Signup (même DA que PRISM)
│   │   ├── LauncherShell.tsx   ← Shell principal post-auth
│   │   ├── Sidebar.tsx         ← Navigation gauche
│   │   ├── HomeView.tsx        ← Accueil + launch button
│   │   ├── UpdatesView.tsx     ← Gestion des mises à jour GitHub
│   │   └── SettingsView.tsx    ← Préférences
│   ├── hooks/
│   │   └── useTheme.ts         ← Dark/light mode avec persistance
│   ├── types/
│   │   └── index.ts            ← Types partagés
│   ├── tokens.ts               ← Même tokens que PRISM main app
│   ├── App.tsx                 ← Composant racine
│   ├── main.tsx                ← Entry point React
│   └── index.css               ← Styles globaux + Tailwind
├── electron/
│   ├── main.js                 ← Process principal Electron
│   └── preload.js              ← Bridge sécurisé IPC ↔ React
├── public/
│   └── logo.png                ← Logo PRISM (favicon2.png)
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```

## Démarrage développement

```bash
cd launcher
npm install
npm run dev          # Lance Vite + Electron en parallèle
```

## Build production

```bash
npm run dist         # → release/PRISM Launcher Setup.exe
npm run dist:mac     # → release/PRISM Launcher.dmg
```

## Fonctionnement

1. L'utilisateur double-clique sur `PRISM Launcher Setup.exe`
2. Installation silencieuse (oneClick NSIS)
3. Le launcher s'ouvre → écran de connexion
4. Auth locale via le backend FastAPI de PRISM (`localhost:8000`)
5. Vue Accueil → bouton **Lancer PRISM**
6. Vue Mises à jour → télécharge depuis GitHub Releases, extrait, remplace

## Connexion à GitHub Releases

Modifier dans `electron/main.js` :
```js
const PRISM_GITHUB_REPO = 'ton-org/prism'      // ← ton repo
const PRISM_ASSET_NAME  = 'prism-desktop-win.zip'
```

Le launcher appelle `api.github.com/repos/{repo}/releases/latest`
et télécharge l'asset correspondant — aucun serveur requis.

## Tokens DA

Identiques à `src/styles/tokens.ts` de l'app principale :
- Dark : `#0F1318` rail → `#DFE8F1` texte
- Light : `#E9EEF3` rail → `#18212B` texte  
- Brand : `#009BA4` teal, `#5FD8D2` teal-dim
