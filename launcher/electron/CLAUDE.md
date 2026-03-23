# electron/ — Process principal Electron

## Fichiers

| Fichier | Rôle |
|---------|------|
| `main.js` | Point d'entrée Electron : fenêtres, IPC handlers, lifecycle |
| `auth.js` | Handlers auth : login, createUser, updateUser, audit log, licence |
| `session.js` | TTL de session (`SESSION_TTL` let + `setSessionTTL(hours)`) |
| `db.js` | Helpers SQLite (better-sqlite3) : init schema, requêtes |
| `preload.js` | Bridge IPC fenêtre principale — 29 channels exposés |
| `preload-docs.js` | Bridge IPC fenêtre docs — minimize + close uniquement |
| `preload-prism.js` | Bridge IPC fenêtre PRISM Desktop |

## IPC Channels enregistrés dans main.js

**Auth** : `auth:isSetup`, `auth:login`, `auth:logout`, `auth:createUser`, `auth:updateUser`, `auth:getUsers`, `auth:getAuditLog`, `auth:getLicense`, `auth:setLicense`

**Fenêtre principale** : `win:minimize`, `win:maximize`, `win:close`

**PRISM window** : `prism-win:minimize`, `prism-win:maximize`, `prism-win:close`, `prism:isInstalled`, `prism:versions`, `prism:launch`, `prism:recent:get`, `prism:recent:record`, `prism:openDataDir`

**Docs window** : `docs:open`, `docs-win:minimize`, `docs-win:close`

**Updates** : `update:check`, `update:install`, `launcher:update:check`, `launcher:update:download`, `launcher:update:apply`

**Settings** : `settings:get`, `settings:set`

## Règle parité preload ↔ handlers
Chaque channel dans `main.js` doit avoir son bridge dans le preload correspondant.
Avant tout ajout, compter : actuellement **29 handlers ↔ 29 bridges**.

## Settings par défaut (DEFAULT_SETTINGS dans main.js)
```js
{
  prismWindow: { rememberBounds: true, defaultSize: '1440x900', rememberPosition: true, minimizeLauncherOnOpen: false },
  backend:     { startupTimeoutSecs: 30, autoStartPrism: true, autoUpdatePrism: false },
  session:     { durationHours: 8 }
}
```
Les settings sont mergés en deep-merge à chaque `settings:set`.
