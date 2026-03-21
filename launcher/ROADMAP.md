# PRISM Launcher — Roadmap & État des lieux

> Document de référence interne — PRISM Engineering
> Dernière mise à jour : Mars 2026

---

## Processus de release (V1 — en production)

### Deux produits, deux tags

| Produit | Tag | Workflow déclenché | Artefact produit |
|---|---|---|---|
| PRISM Desktop (backend + frontend) | `prism-v*` | `build-prism.yml` | `prism-desktop-win.zip` |
| PRISM Launcher (Electron) | `launcher-v*` | `build-launcher.yml` | installeur `.exe` |

### Publier une nouvelle version de PRISM

```bash
# Depuis la branche main, après avoir mergé les changements
git tag prism-v0.2.0
git push origin prism-v0.2.0
```

1. GitHub Actions build le backend (PyInstaller) + frontend (Vite)
2. Crée `prism-desktop-win.zip` et l'attache à la GitHub Release
3. Le Launcher installé chez le client détecte automatiquement la nouvelle version au démarrage
4. L'utilisateur clique "Mettre à jour" → téléchargement + extraction automatique

### Publier une nouvelle version du Launcher

```bash
git tag launcher-v1.0.2
git push origin launcher-v1.0.2
```

1. GitHub Actions build l'Electron app
2. Crée l'installeur `.exe` et l'attache à la GitHub Release
3. **Mise à jour manuelle** : l'utilisateur réinstalle par-dessus (données conservées dans AppData)
4. *(Auto-update du Launcher prévu en V1.1 via `electron-updater`)*

### Convention de nommage des tags

```
prism-v{MAJOR}.{MINOR}.{PATCH}    ex: prism-v1.0.0
launcher-v{MAJOR}.{MINOR}.{PATCH} ex: launcher-v1.2.0
```

Les deux tags coexistent dans l'onglet Releases de GitHub — le Launcher filtre automatiquement l'asset `prism-desktop-win.zip`.

---

## État des lieux V1 (Production)

### Ce qui est implémenté

#### Authentification locale (SQLite + bcrypt)
- Base de données `users.db` locale, indépendante du moteur PRISM
- Bcrypt 12 rounds pour le hachage des mots de passe
- Premier lancement → écran de setup création compte admin
- Login avec messages d'erreur génériques (pas de distinction email inconnu / mauvais mot de passe)
- Sessions en mémoire (UUID aléatoire, TTL 8h, invalidées au logout)
- Rate limiting : 5 tentatives échouées → verrou 15 minutes par email
- Logout invalide la session côté main process

#### Sécurité Electron
- DevTools bloqués en production (F12, Ctrl+Shift+I/J/C)
- Tous les handlers IPC privilégiés validés côté main process (session token obligatoire)
- `requesterId` du renderer ignoré — le session store fait foi
- URL de téléchargement validée (`github.com/Myrkh/PRISM/releases/` uniquement)
- `contextIsolation: true`, `nodeIntegration: false`, `webSecurity: true`

#### Panneau Admin
- **Onglet Utilisateurs** : tableau complet, création/édition/activation-désactivation, badges rôles, dernière connexion
- **Onglet Licence** : affichage des infos licence (société, sièges, expiration), jauge de sièges utilisés, état "aucune licence"
- **Onglet Journal** : timeline des actions (LOGIN, LOGIN_FAILED, USER_CREATED, USER_UPDATED, LICENSE_SET), refresh manuel
- Admin ne peut pas se rétrograder lui-même
- Onglet Admin visible uniquement pour les utilisateurs `role: 'admin'`

#### Interface & UX
- Thème sombre / clair avec persistance
- i18n FR / EN sur 100% des composants (TopBar, HomeView, LibraryView, UpdatesView, SettingsView, AdminView, SetupScreen, AuthScreen, AccountModal, FooterBar)
- Fenêtre frameless avec contrôles natifs (minimize, maximize, close)
- Splash screen au démarrage (300×300, animation spinner)
- Logo importé comme module Vite (fonctionne dans l'app packagée)
- Raccourci Ctrl+L pour lancer PRISM

#### Distribution
- Build GitHub Actions sur `windows-latest` (Node 22)
- `electron-rebuild` pour `better-sqlite3` natif
- Installeur NSIS silencieux (pas de wizard)
- Artifact uploadé automatiquement, release créée sur tag `launcher-v*`
- Mise à jour manuelle : réinstaller par-dessus (données conservées dans AppData)

#### Onglet Updates (UI complète, logique partielle)
- UI complète avec états (à jour, disponible, téléchargement, installation, terminé)
- Planificateur de mise à jour (date/heure)
- `PRISM_GITHUB_REPO` à mettre à jour avec le vrai repo : **`Myrkh/PRISM`** ← à corriger dans `electron/main.js`
- Téléchargement + extraction via PowerShell (natif Windows, sans dépendance)

---

## Ce qui reste à faire

### Priorité haute

#### 1. Corriger `PRISM_GITHUB_REPO` dans `electron/main.js`
```js
// Ligne 21 — changer :
const PRISM_GITHUB_REPO = 'ton-org/prism'
// En :
const PRISM_GITHUB_REPO = 'Myrkh/PRISM'
```
Sans ce fix, l'onglet Updates ne peut pas vérifier les vraies releases PRISM.

#### 2. Auto-update du Launcher lui-même (`electron-updater`)
Le launcher sait mettre à jour PRISM, mais pas lui-même.

**Plan d'implémentation :**
- Ajouter `electron-updater` aux dépendances
- Configurer `publish` dans `electron-builder` (provider GitHub, repo `Myrkh/PRISM`)
- Ajouter `GH_TOKEN` dans les secrets GitHub Actions
- Retirer `--publish never` du workflow pour les tags → publish automatique
- Au démarrage : `autoUpdater.checkForUpdatesAndNotify()`
- UI : badge de notification dans la TopBar + modal de confirmation
- L'update se télécharge en arrière-plan, s'installe au prochain démarrage

**Workflow modifié :**
```yaml
- name: Build & package
  working-directory: launcher
  run: npm run dist  # sans --publish never sur les tags
  env:
    GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

#### 3. Activation de licence (UI + cryptographie)
*Voir section dédiée ci-dessous.*

#### 4. Projets récemment ouverts (HomeView)
- Actuellement : données mockées
- À faire : lire les derniers projets depuis la DB PRISM (`prism.db`) ou un fichier JSON de récents géré par le launcher
- Afficher vrai nom, date d'accès, chemin

---

### Priorité moyenne

#### 5. Vérification de version PRISM installée vs disponible
- Lire la version de PRISM installé (ex. depuis un `version.json` dans le dossier d'installation)
- Comparer avec la release GitHub pour afficher le vrai delta
- Actuellement l'onglet Updates ne sait pas si PRISM est installé ou non

#### 6. Changement de mot de passe fonctionnel dans AccountModal
- L'onglet Sécurité du modal compte simule un délai mais n'appelle pas l'IPC
- À câbler : `window.electron.updateUser({ token, userId, patches: { password } })`
- Vérifier le mot de passe actuel avant d'accepter le changement

#### 7. Notification de session expirée
- Les sessions expirent après 8h silencieusement
- À faire : intercepter les retours `{ ok: false, error: 'Non autorisé' }` et rediriger vers le login

---

### Priorité basse / Améliorations futures

#### 8. Télémétrie opt-in
- Le toggle existe dans SettingsView mais n'envoie rien
- À câbler si besoin de métriques d'utilisation anonymes

#### 9. Backup de la base de données
- Le bouton "Exporter" dans Settings existe mais n'est pas implémenté
- À faire : copier `users.db` dans un fichier horodaté à l'emplacement choisi par l'utilisateur

#### 10. Authentification à deux facteurs (2FA)
- Pour les comptes admin, ajouter TOTP (Google Authenticator)
- Librairie : `otplib` (pure JS, pas de compilation native)

#### 11. Thème personnalisé par société
- Permettre à une société de configurer couleur d'accent + logo dans Settings
- Stocké dans `users.db`, appliqué au démarrage

---

## Licence cryptographique — Process complet

> À implémenter lors de la commercialisation de PRISM.

### Architecture

```
PRISM Engineering                    Société cliente
─────────────────                    ───────────────
Clé privée Ed25519 (secrète)
        │
        ▼
Script génération licence
{ company, seats, expires_at }
        │  signé avec clé privée
        ▼
fichier .prism-license (JSON + signature)
        │  envoyé par email / lien
        ▼
                            Launcher Admin → Onglet Licence
                            → "Importer une licence"
                            → Vérifie signature avec clé publique
                            → Si valide → stocké dans users.db
                            → Affichage : société, sièges, expiration
```

### Étape 1 — Générer la paire de clés (une seule fois)

```bash
# Dans un terminal sur ta machine de dev
node -e "
const { generateKeyPairSync } = require('crypto')
const { privateKey, publicKey } = generateKeyPairSync('ed25519', {
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding:  { type: 'spki',  format: 'pem' },
})
require('fs').writeFileSync('prism-private.pem', privateKey)
require('fs').writeFileSync('prism-public.pem',  publicKey)
console.log('Clés générées.')
"
```

**⚠️ `prism-private.pem` ne doit JAMAIS être commité dans GitHub.**
Ajouter dans `.gitignore` : `*.pem`

### Étape 2 — Script de génération de licence

Créer `tools/generate-license.js` (hors du repo public si possible) :

```js
const { createSign }  = require('crypto')
const { readFileSync, writeFileSync } = require('fs')

const privateKey = readFileSync('prism-private.pem', 'utf8')

const licenseData = {
  company:    process.argv[2],           // ex: "Acier SA"
  seats:      parseInt(process.argv[3]), // ex: 10
  expires_at: process.argv[4] ?? null,   // ex: "2027-12-31" ou null = perpétuelle
  issued_at:  new Date().toISOString(),
}

const payload   = JSON.stringify(licenseData)
const signer    = createSign('sha256')
signer.update(payload)
const signature = signer.sign(privateKey, 'base64')

const license = { data: licenseData, signature }
const filename = `license-${licenseData.company.toLowerCase().replace(/\s+/g, '-')}.prism-license`

writeFileSync(filename, JSON.stringify(license, null, 2))
console.log(`Licence générée : ${filename}`)
```

**Usage :**
```bash
node tools/generate-license.js "Acier SA" 10 "2027-12-31"
# → license-acier-sa.prism-license
```

### Étape 3 — Clé publique dans le Launcher

Dans `electron/auth.js` ou un nouveau `electron/license.js` :

```js
const { createVerify } = require('crypto')

// Clé publique embarquée (visible dans le code, c'est normal)
const PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE...
-----END PUBLIC KEY-----`

function verifyLicense(fileContent) {
  try {
    const { data, signature } = JSON.parse(fileContent)
    const payload  = JSON.stringify(data)
    const verifier = createVerify('sha256')
    verifier.update(payload)
    const valid = verifier.verify(PUBLIC_KEY, signature, 'base64')
    if (!valid) return { ok: false, error: 'Signature invalide.' }
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return { ok: false, error: 'Licence expirée.' }
    }
    return { ok: true, data }
  } catch {
    return { ok: false, error: 'Fichier de licence invalide.' }
  }
}
```

### Étape 4 — UI d'activation dans AdminView (LicenseTab)

Remplacer l'état "Aucune licence" par :

```
┌─ Activer votre licence PRISM ────────────────────────────┐
│                                                           │
│   [ Glissez votre fichier .prism-license ici ]           │
│              ou                                           │
│   [ Parcourir… ]                                         │
│                                                           │
│   Vous avez reçu ce fichier par email de                  │
│   PRISM Engineering lors de votre achat.                  │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

Utiliser `ipcRenderer.invoke('license:activate', fileContent)` → vérifie + stocke.

### Étape 5 — Vérification au démarrage

Dans `electron/main.js`, au `app.whenReady()` :

```js
const lic = db.getLicense()
if (lic) {
  const result = verifyLicense(JSON.stringify(lic))
  if (!result.ok) {
    // Afficher une modale "Licence invalide ou expirée"
    // Bloquer l'accès à PRISM (bouton Launch désactivé)
  }
}
```

---

## Résumé V1 → V2

| Feature | V1 (prod) | V2 |
|---|---|---|
| Auth locale SQLite | ✅ | — |
| Sessions sécurisées | ✅ | — |
| Rate limiting | ✅ | — |
| DevTools bloqués | ✅ | — |
| Panneau admin complet | ✅ | — |
| i18n FR/EN 100% | ✅ | — |
| Splash screen | ✅ | — |
| Build GitHub Actions | ✅ | — |
| Fix repo PRISM | ⚠️ 5 min | V1.1 |
| Auto-update Launcher | ❌ | V1.1 |
| Changement mot de passe | ❌ | V1.1 |
| Projets récents réels | ❌ | V1.2 |
| Version PRISM installée | ❌ | V1.2 |
| Session expirée → login | ❌ | V1.2 |
| Licence cryptographique | ❌ | V2 |
| Backup base de données | ❌ | V2 |
| 2FA admin | ❌ | V3 |
| Thème personnalisé | ❌ | V3 |

---

---

## Modèle de déploiement multi-utilisateurs en entreprise

### Le problème fondamental

Chaque installation du launcher a **sa propre base SQLite locale** (`users.db`).
Les bases ne se synchronisent pas entre les PCs — elles sont totalement indépendantes.

```
PC Admin (toi)                   PC Collègue
──────────────                   ───────────
users.db                         users.db (vide)
 └─ alice@entreprise.com          → SetupScreen au démarrage
 └─ bob@entreprise.com            → il ne peut pas se connecter
```

Créer un compte dans le panneau admin de ton launcher **n'a aucun effet** sur les autres installations.

### Les trois approches possibles

#### Option A — Mode serveur réseau local *(complexe, non recommandé)*
Un PC ou serveur fait tourner le launcher en mode "serveur", les autres s'y connectent via le réseau interne.
- Nécessite une infrastructure réseau
- Perd l'avantage du "full local / offline"
- Pas adapté à l'architecture actuelle du launcher

#### Option B — Export / Import de configuration *(faisable, V2)*
L'admin exporte un fichier de configuration chiffré depuis son launcher et le partage.
Chaque collègue l'importe au premier lancement — les comptes sont créés localement.

```
Ton launcher
→ "Exporter configuration" → config.prism-setup (chiffré)
        │
        ▼ (partage réseau interne / clé USB / email)
        │
PC collègue → premier lancement → "Importer configuration"
→ comptes recréés localement
→ accès normal
```

- Avantage : reste 100% offline, simple pour l'utilisateur final
- Inconvénient : si tu ajoutes un utilisateur plus tard, il faut re-exporter et re-distribuer

#### Option C — Installation autonome par PC *(recommandé pour V1)*
Chaque installation est indépendante. Chaque employé crée son propre compte admin sur son PC.
La **licence `.prism-license`** est la seule chose partagée entre les PCs — elle contrôle que le logiciel est autorisé sur N postes, pas qui l'utilise.

```
Ton PC          PC Alice        PC Bob
──────          ────────        ──────
Setup admin     Setup admin     Setup admin
(compte perso)  (compte perso)  (compte perso)
     │               │               │
     └───────────────┴───────────────┘
              licence partagée
         license-entreprise.prism-license
              (seats: 3, expire: 2027)
```

- Avantage : simple, aucune infrastructure, 100% offline
- Inconvénient : l'admin ne gère pas les comptes des collègues à distance
- C'est le modèle de AutoCAD, MATLAB, SolidWorks en entreprise

### Recommandation

| Contexte | Approche recommandée |
|---|---|
| Petite équipe (2–5 personnes) | **Option C** — chaque PC autonome |
| Équipe moyenne avec IT | **Option B** — export/import config (V2) |
| Grande organisation | Envisager une auth centralisée (Supabase, LDAP) |

### Impact sur la licence

Avec l'Option C, le champ `seats` de la licence prend tout son sens :
- `seats: 5` → le launcher autorise jusqu'à 5 installations actives
- La vérification se fait localement sur chaque PC (pas de comptage centralisé en V1)
- En V2, un système de "activation" par machine (machine fingerprint) pourrait limiter strictement le nombre de PCs

---

## Phase 2 — Déploiement entreprise

> À implémenter lors de la commercialisation à des équipes de 5+ personnes.

### Contexte

En V1, chaque installation est autonome (Option C). C'est simple et ça fonctionne pour une petite équipe.
Dès qu'une entreprise cliente veut gérer ses utilisateurs de manière centralisée, il faut passer en Phase 2.

### Ce que veut le client entreprise

- Un admin IT installe PRISM sur 10 PCs et configure les comptes **une seule fois**
- Les employés ouvrent le Launcher → ils se connectent avec leur email entreprise → accès immédiat
- Si un employé quitte l'entreprise, l'admin désactive son compte → bloqué sur tous les PCs
- Un seul fichier de licence partagé sur le réseau interne

### Option B — Export / Import de configuration (recommandée V2)

**Principe** : l'admin génère un fichier `config.prism-setup` chiffré depuis son Launcher, le distribue une fois sur les PCs clients (clé USB, réseau, email).

```
PC Admin
→ Panneau Admin → "Exporter configuration"
→ Choisir : utilisateurs à inclure + licence
→ Génère config.prism-setup (AES-256 chiffré, clé dérivée du domaine entreprise)

PC Collègue (premier lancement)
→ SetupScreen → "Importer une configuration"
→ Sélectionne config.prism-setup
→ Comptes recréés localement (hash des mots de passe inclus)
→ Accès normal immédiat
```

**Ce qu'il faut implémenter :**
- `electron/export.js` : sérialise `users.db` + licence → JSON → chiffrement AES-256 → fichier `.prism-setup`
- `electron/import.js` : déchiffre → recrée les entrées dans `users.db` locale
- UI dans `SettingsView` : bouton "Exporter configuration" (admin uniquement)
- UI dans `SetupScreen` : bouton alternatif "Importer une configuration"
- IPC : `config:export` / `config:import`

**Limite** : si l'admin ajoute un utilisateur après la distribution initiale, il faut re-exporter et re-distribuer. Acceptable pour des équipes stables.

### Option D — Auth centralisée Supabase (recommandée pour grandes équipes, V3)

Pour les organisations avec un IT structuré, remplacer la `users.db` locale par une auth Supabase.

```
Admin → dashboard Supabase → crée/désactive comptes
Launcher → login → appel Supabase Auth → token JWT → accès
```

**Avantages :**
- Gestion centralisée réelle (un compte, N PCs)
- Révocation instantanée
- Audit log centralisé
- SSO possible (SAML, OIDC, Google Workspace, Microsoft Entra)

**Contraintes :**
- Nécessite une connexion internet au login (pas 100% offline)
- Coût Supabase selon le nombre d'utilisateurs actifs
- Refactoring auth complet (supprimer `users.db` local ou mode hybride)

**Mode hybride possible :** Supabase pour l'auth + cache local du token JWT (offline pendant 8h).

### Recommandation selon la taille du client

| Taille | Approche | Version |
|---|---|---|
| 1–4 postes | Option C — autonome (actuel) | V1 ✅ |
| 5–20 postes | Option B — export/import config | V2 |
| 20+ postes | Option D — Supabase centralisé | V3 |
| Enterprise avec AD | Option D + SSO SAML/OIDC | V3+ |

### Fingerprint machine (contrôle des sièges, V2)

En V1, `seats: 5` dans la licence n'est pas vérifié strictement — chaque PC fait confiance à sa propre base locale.

En V2, ajouter un **machine fingerprint** basé sur :
- UUID machine Windows (`wmic csproduct get uuid`)
- Nom d'hôte + adresse MAC

Le fingerprint est envoyé au moment de l'activation de licence et stocké. Si le nombre de fingerprints uniques dépasse `seats`, l'activation est refusée.

```js
// electron/fingerprint.js
const { execSync } = require('child_process')
function getMachineId() {
  const uuid = execSync('wmic csproduct get uuid').toString().split('\n')[1].trim()
  return require('crypto').createHash('sha256').update(uuid).digest('hex').slice(0, 16)
}
```

---

## Gestion des données — Supabase Cloud vs Self-hosted

### Architecture actuelle (V1)

Les données métier (projets, SIF, campagnes, proof tests, audit log) sont stockées sur **Supabase Cloud** (supabase.io).

```
App PRISM (frontend Vite)
    │
    ▼
Supabase Cloud (supabase.io)
    ├─ Auth (utilisateurs Supabase)
    ├─ PostgreSQL (projets, SIF, campagnes…)
    └─ Storage (PDF, artefacts)
```

- Avantage : zéro infrastructure à gérer, gratuit jusqu'à ~500 MB et 50k requêtes/mois
- Limite : données hébergées chez Supabase (USA/EU), pas acceptable pour certaines industries (défense, nucléaire, santé)

### Version Entreprise — Supabase Self-hosted (Docker)

**C'est la recommandation pro.** Même API, même code, zéro refactoring — seule l'URL change.

```
App PRISM (même code)
    │
    ▼
Supabase Self-hosted (serveur interne client)
    ├─ Docker Compose (supabase/supabase)
    ├─ PostgreSQL local
    ├─ Auth local
    └─ Storage local
```

**Ce que le client installe sur son serveur :**
```bash
git clone --depth=1 https://github.com/supabase/supabase
cd supabase/docker
cp .env.example .env
# Modifier .env : POSTGRES_PASSWORD, JWT_SECRET, ANON_KEY, SERVICE_ROLE_KEY
docker compose up -d
```

**Ce qui change dans PRISM :**
```env
# Version cloud (actuel)
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...

# Version self-hosted (entreprise)
VITE_SUPABASE_URL=http://192.168.1.100:8000   ← IP du serveur interne
VITE_SUPABASE_ANON_KEY=eyJ...                 ← clé générée localement
```

Le build GitHub Actions passera ces variables comme secrets → le ZIP produit sera pré-configuré pour pointer sur le Supabase du client.

### Comparatif

| | Cloud (V1) | Self-hosted (Entreprise) |
|---|---|---|
| Infrastructure | Aucune | Serveur Linux (4 Go RAM min) |
| Données | Chez Supabase | Chez le client |
| Offline | Non | Oui (réseau interne) |
| Coût récurrent | Gratuit / ~$25/mois | Serveur interne uniquement |
| Conformité (ISO, RGPD strict) | Limitée | Totale |
| Migration cloud → self-hosted | Export PostgreSQL standard | ✅ |
| Refactoring code PRISM | Aucun | Aucun |

### Recommandation par contexte client

| Client | Solution données |
|---|---|
| PME, usage standard | Supabase Cloud (actuel) |
| Industrie réglementée (nucléaire, défense, santé) | Supabase Self-hosted |
| Client sans IT / sans serveur | Cloud avec région EU (`supabase.co` EU West) |
| Client avec serveur IT existant | Self-hosted Docker |

### Processus de livraison entreprise (self-hosted)

1. Client installe Supabase sur son serveur (guide fourni)
2. Client communique son `SUPABASE_URL` et `ANON_KEY`
3. PRISM Engineering déclenche un build dédié avec ces variables
4. Le ZIP `prism-desktop-win.zip` généré est pré-configuré pour ce client
5. Distribuer via le Launcher → onglet Updates → télécharge et installe

---

*PRISM Launcher V1 — PRISM Engineering — 2026*
