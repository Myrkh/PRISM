# PRISM — Vision produit & Architecture cible

> Document de référence interne — PRISM Engineering
> Dernière mise à jour : Mars 2026
> **Ce document fait loi.** Toute décision technique doit être cohérente avec ce qui est écrit ici.

---

## Ambition

**PRISM est le meilleur logiciel SIL du monde.**

Pas le plus complexe. Le plus juste. Celui que les ingénieurs de sécurité fonctionnelle veulent utiliser chaque jour — parce qu'il est rapide, fiable, élégant, et qu'il tourne là où ils en ont besoin, sans compromis.

L'objectif n'est pas de cocher des cases IEC 61511. C'est de rendre le travail des ingénieurs SIL tellement fluide qu'ils ne peuvent plus s'en passer.

---

## Une seule application, deux surfaces

PRISM n'est **pas** deux produits distincts. C'est une application unique qui s'adapte à son contexte d'exécution.

```
┌─────────────────────────────────────────────────────────┐
│                     PRISM (unique codebase)             │
│                                                         │
│   Surface web (navigateur)      Surface desktop         │
│   ─────────────────────────     ────────────────────    │
│   • Supabase cloud ou           • Fenêtre frameless     │
│     self-hosted                 • Titlebar custom       │
│   • Service Worker notify       • Tray icon             │
│   • Aucun contrôle natif        • Notif. système        │
│   • URL partageable             • Raccourcis globaux    │
│                                 • Accès fichiers local  │
└─────────────────────────────────────────────────────────┘
```

**La détection se fait via `window.prismDesktop?.isDesktop`** (exposé par `preload-prism.js`).
Le code frontend adapte son comportement sans jamais bifurquer en deux produits.

---

## Direction architecturale : les fichiers comme source de vérité

### Problème avec l'architecture actuelle (Supabase Cloud)

- Les données SIF vivent dans le cloud Supabase (USA/EU)
- Les clients TotalEnergies, Arkema, Framatome ne peuvent **pas** envoyer leurs données de sécurité fonctionnelle hors de leurs réseaux
- Le Supabase cloud crée une dépendance réseau permanente — PRISM ne fonctionne pas offline

### Direction V2+ : fichiers `.prism` / `.sif`

Les projets et SIF deviennent des **fichiers locaux** — portables, versionables, ouvrables sans connexion.

```
Mon Projet TotalEnergies/
├── projet.prism              ← métadonnées projet (JSON signé)
├── SIF-001-isolation.sif     ← SIF complet (architecture, calculs, campagnes)
├── SIF-002-detection.sif
└── rapports/
    ├── SIF-001-rapport-rev2.pdf
    └── SIF-002-rapport-rev1.pdf
```

**Format `.sif` :** JSON structuré, lisible, versionable sous Git. Contient :
- Contexte (SRS reference, HAZOP entries, SIL target)
- Architecture (boucles, composants, canaux, redondances)
- Calculs (PFD résultats, SIL atteint, paramètres)
- Campagnes de proof test (planning, résultats, conformité)
- Historique de révisions (auteur, date, diff compressé)

**Supabase devient une couche de synchronisation optionnelle** — pas une dépendance critique.

### Modes de fonctionnement cibles

| Mode | Données | Collaboration | Auth |
|------|---------|---------------|------|
| **Standalone** | Fichiers locaux | Aucune (un utilisateur) | Launcher local |
| **Équipe réseau** | Dossier partagé (SMB/NFS) | Accès concurrent fichiers | Launcher local |
| **Cloud** | Supabase (cloud ou self-hosted) | Temps réel | Supabase Auth |
| **Hybrid** | Fichiers locaux + sync cloud | Sync à la demande | Supabase Auth |

Le mode est configurable dans les Settings — pas une décision de build.

### Pourquoi pas Supabase Cloud pour l'entreprise

| Critère | Supabase Cloud | Fichiers locaux / Self-hosted |
|---------|---------------|-------------------------------|
| Données chez le client | ❌ | ✅ |
| Offline complet | ❌ | ✅ |
| Conformité ISO 27001, RGPD strict | Limitée | Totale |
| Secteurs nucléaire, défense, santé | ❌ | ✅ |
| Infrastructure à maintenir | Aucune | Optionnelle |
| Versionning Git possible | ❌ | ✅ |

**Règle :** Supabase Cloud reste disponible pour les PME et la V1. Mais toute nouvelle feature doit pouvoir fonctionner sans Supabase.

---

## UX & Features — Inspirées VS Code, adaptées SIL

PRISM s'inspire de VS Code non pas pour copier un IDE, mais parce que VS Code a résolu des problèmes que PRISM rencontrera : gestion de fichiers, layouts flexibles, commandes rapides, extensions, personnalisation.

### 1. Command Palette ⌘K / Ctrl+K ✅ (en place)

Accès instantané à toutes les actions sans mémoriser les menus. Priorité max.

```
> Ouvrir SIF-001...
> Lancer calcul PFD
> Exporter rapport PDF
> Basculer thème
> Ouvrir paramètres
```

### 2. Layout personnalisable (comme VS Code)

L'utilisateur choisit la disposition de son espace de travail.

```
Mode Calcul intensif        Mode Review rapport
─────────────────────       ──────────────────
[Rail] [Tree] [Editor]      [Rail] [Editor] [Panel droit large]
              [Panel →]                     [PDF preview]
```

- Drag & drop des panneaux (right panel ↔ bottom panel)
- Mémorisation du layout par SIF / par projet
- Toggle `Ctrl+B` sidebar, `Ctrl+J` panel bas (si ajouté)
- Preset layouts : "Calcul", "Rédaction", "Review"

### 3. Raccourcis clavier configurables

Dans Settings → Raccourcis :

```
Calculer PFD              Ctrl+Enter  (modifiable)
Nouveau SIF               Ctrl+N
Exporter PDF              Ctrl+Shift+P
Basculer sidebar          Ctrl+B
Navigation précédente     Alt+←
Navigation suivante       Alt+→
Focus Command Palette     Ctrl+K
```

Stockés dans `keybindings.json` dans le dossier de configuration PRISM.

### 4. Notifications intelligentes par plateforme

| Plateforme | Mécanisme | Exemples |
|-----------|-----------|---------|
| **Desktop (Electron)** | `Notification` API système (tray icon) | "Calcul terminé", "Proof test J-7", "Nouvelle version PRISM" |
| **Web** | Service Worker + Push API | Mêmes notifications, opt-in |
| **In-app (tous)** | Toast + centre de notifs (cloche) | Erreurs, confirmations, warnings |

**Tray icon desktop :**
- PRISM reste accessible depuis la barre des tâches même fenêtre minimisée
- Badge rouge si alertes (proof test en retard, SIL non atteint)
- Menu contextuel tray : Ouvrir, Derniers SIF, Quitter

### 5. Minimap du SIF (navigation dans les grands dossiers)

Inspirée de la minimap VS Code, adaptée à la structure SIF :

```
┌─ SIF-001 ──────────────────────────┐
│ ■ Contexte          ▓▓▓▓           │
│ ■ Architecture      ▓▓▓▓▓▓▓▓▓     │  ← position actuelle
│   └ Loop A          ▓▓▓            │
│   └ Loop B          ▓▓▓            │
│ ■ Vérification      ▓▓▓▓▓▓         │
│   └ PFD Calc        ▓▓▓▓           │
│   └ SIL Matrix      ▓▓             │
│ ■ Exploitation      ▓▓▓▓▓          │
│ ■ Rapport           ▓▓             │
└────────────────────────────────────┘
```

Cliquable — navigation directe dans la section.

### 6. Outline / Structure du SIF (panel gauche)

Équivalent de l'Outline VS Code :

```
SIF-001 — Isolation HV-1201
├─ Contexte
│   ├─ SRS Reference: SRS-P12-001
│   ├─ HAZOP: Nœud 3, Déviation "Pas de flux"
│   └─ SIL cible: SIL 2
├─ Architecture
│   ├─ Capteurs (2oo3)
│   └─ Actionneur (1oo1)
├─ Vérification
│   ├─ PFD = 3.2×10⁻³ ✅
│   └─ SIL atteint: SIL 2 ✅
├─ Exploitation
│   └─ Prochain proof test: 2026-06-15 ⚠️ J-85
└─ Rapport rev.2 (2026-02-14)
```

### 7. Recherche globale multi-projets

`Ctrl+Shift+F` — recherche dans tous les SIF ouverts ou indexés :

```
Rechercher dans PRISM...
───────────────────────
"HV-1201"

SIF-001 — Contexte — ligne 3
  "...actionneur HV-1201 (vannes d'isolation)..."

SIF-003 — Architecture — composant 2
  "...HV-1201 dans la boucle de sécurité B..."
```

### 8. Diff de révisions (comme Git diff)

Comparer deux révisions d'un SIF côte à côte :

```
SIF-001 rev.1 (2025-11-01)     SIF-001 rev.2 (2026-02-14)
──────────────────────────     ──────────────────────────
PFD = 4.1×10⁻³                PFD = 3.2×10⁻³
SIL atteint: SIL 1 ❌          SIL atteint: SIL 2 ✅
Capteurs: 1oo2                 Capteurs: 2oo3
```

Chaque révision est un snapshot complet du `.sif` — le diff est calculé à l'affichage.

### 9. Templates de SIF

Bibliothèque de modèles préconfigurés :

```
Nouveau SIF depuis un template...
──────────────────────────────────
■ SIF type "Isolation gaz" (SIL 2, 1oo2)
■ SIF type "Arrêt urgence ESD" (SIL 3, 2oo3)
■ SIF type "Protection surpression" (SIL 1, 1oo1)
■ Blank SIF
```

Les templates sont des fichiers `.sif-template` dans un dossier partagé (réseau ou repo Git).

### 10. Status Bar SIL (en bas de l'éditeur)

Inspirée directement de VS Code — barre de 22px permanente, indicateur de conformité en temps réel.

```
[SIF-042]  [Phase: Architecture]  |  PFD = 8.3×10⁻³  SIL 2 ✓  |  Rev.3 · modifié il y a 2h  [IEC 61511-1]  [Backend ●]
```

- Segment **SIL vert/rouge** visible à tout moment, sans ouvrir de panneau
- Cliquable : chaque segment ouvre la vue correspondante
- **Priorité haute — quick win (1 jour d'effort, impact très élevé)**

### 11. Problems Panel — Moteur de règles IEC 61511

Panel inférieur listant les non-conformités détectées automatiquement.

```
■ [SIL-E001] PFD calculé 8.3×10⁻³ dépasse la cible SIL 2  (§10.3.4)     → Architecture
■ [SIL-E002] Architecture KooN non définie pour Loop B                     → Architecture
▲ [SIL-W001] Facteur beta non documenté — valeur par défaut 0.10 utilisée → Vérification
ℹ [SIL-I001] 2 composants sans fiche technique associée                   → Architecture
```

**Architecture Diagnostic Provider (pattern clé à adopter dès maintenant) :**

```typescript
interface SILDiagnosticProvider {
  provideDiagnostics(sif: SIF): SILDiagnostic[]
}

// Enregistrement au démarrage — chaque règle = un provider indépendant
DiagnosticRegistry.register(new PFDConformanceChecker())      // PFD vs cible SIL
DiagnosticRegistry.register(new ArchitectureCompletenessChecker()) // KooN défini ?
DiagnosticRegistry.register(new ProofTestScheduleChecker())   // Interval < T_mission/2
DiagnosticRegistry.register(new DocumentationCompletenessChecker())
```

Cela permet d'ajouter des règles IEC 61511 sans toucher à l'UI, et prépare un système de règles client-spécifiques.

### 12. Timeline View — Audit trail IEC 61511

Panel de révisions dans la sidebar, obligatoire pour la traçabilité IEC 61511 §5.2.6.

```
● 15 mars 2026 14:32 — Révision 4 (J. Dupont)
  "MAJ taux de défaillance transmetteur PT-101"
● 12 mars 2026 — Proof Test Q1 2026 (Pass ✓)
● 3 janv. 2026  — Révision 3 : Architecture 2oo3 → 1oo2
● 14 déc. 2025  — SIF créée (Révision 1)
```

Chaque entrée cliquable ouvre le diff de révision (avant/après).

### 13. Diff de révisions

Comparaison côte-à-côte de deux révisions d'un SIF — preuve d'intégrité pour l'auditeur.

```
SIF-042 rev.1 (déc. 2025)        SIF-042 rev.3 (janv. 2026)
─────────────────────────        ──────────────────────────
Architecture: 2oo3               Architecture: 1oo2
PFD = 1.2×10⁻²  SIL 1 ❌         PFD = 8.3×10⁻³  SIL 2 ✓
Capteurs: 3                      Capteurs: 2
```

Implémentation : `jsondiffpatch` sur les objets SIF JSON + composant React de rendu. Pas besoin de réimplémenter Monaco.

### 14. Split Editor (2 SIF côte-à-côte)

Comparer deux SIF simultanément — courant pour des boucles à architecture similaire.

- `Ctrl+\` pour splitter, `Ctrl+W` pour fermer le split
- 2 colonnes maximum (pas le système à N groupes de VS Code)
- Chaque colonne a son propre état de lifecycle indépendant

### 15. Extensions / Plugins (V3)

Architecture plugin pour les moteurs de calcul tiers :

```
extensions/
├─ sil-py-engine/      ← moteur de calcul actuel (builtin)
├─ exida-silcalc/      ← connecteur EXIDA SILcalc (payant)
└─ custom-client/      ← moteur propre du client (NDA)
```

API stable : `prism.registerEngine({ name, calculate, validate })`.

---

## Architecture technique cible

### Stack inchangée (V1 → V3)

```
Frontend    React + TypeScript + Vite + Tailwind + Zustand (Immer)
Backend     Python + FastAPI + uvicorn (moteur sil-py)
Desktop     Electron (Launcher) + BrowserWindow frameless (PRISM)
Données V1  Supabase Cloud (PostgreSQL)
Données V2  Fichiers .sif locaux + sync Supabase optionnelle
Données V3  Fichiers .sif + Git + Supabase self-hosted enterprise
```

### Règles d'architecture non négociables

1. **Le frontend ne doit jamais savoir s'il est sur Supabase Cloud ou self-hosted** — seule l'URL d'env change.
2. **Le backend Python est stateless** — il calcule, ne stocke pas. Le storage est dans les fichiers ou Supabase.
3. **PRISM fonctionne sans internet** — toutes les features critiques (calcul, rapport PDF, proof test) doivent être offline-capable.
4. **Pas de dépendance binaire Windows-only dans le backend Python** — le backend doit pouvoir tourner sur Linux (Docker en entreprise).
5. **Les fichiers `.sif` sont lisibles par un humain** — JSON, pas de binaire opaque. Un ingénieur peut lire son SIF dans un éditeur texte.

### Sécurité desktop (Electron)

- `contextIsolation: true`, `nodeIntegration: false`, `webSecurity: true` — toujours
- DevTools bloqués en production (F12, Ctrl+Shift+I)
- URL de téléchargement validée (`github.com/Myrkh/PRISM/releases/` uniquement)
- Sessions Launcher : UUID, TTL 8h, bcrypt 12 rounds
- Licence cryptographique Ed25519 (V2)

---

## Roadmap synthétique

### V1 (Production — actuel)

- ✅ Launcher Electron (auth locale SQLite, admin panel, i18n FR/EN)
- ✅ PRISM Desktop (backend FastAPI + frontend Vite, fenêtre frameless)
- ✅ Release pipeline GitHub Actions (deux tags : `prism-v*` / `launcher-v*`)
- ✅ Mises à jour automatiques depuis GitHub Releases
- ✅ Command Palette, SIFLifecycleBar, ArchitectureWorkspace
- ✅ AppHeader comme titlebar Windows (drag + contrôles natifs)
- ⚠️ Données sur Supabase Cloud (acceptable pour V1)

### V1.1 (Prochains sprints)

- [ ] Auto-update du Launcher lui-même (`electron-updater`)
- [ ] Changement de mot de passe dans AccountModal (IPC câblé)
- [ ] Session expirée → redirect login automatique
- [ ] Tray icon (menu contextuel, badge alertes)
- [ ] **Status Bar SIL** — PFD + conformité en temps réel (1 jour, impact maximal)
- [ ] **Breadcrumb navigation** — Projet > SIF > Phase > Loop (0.5 jour)
- [ ] **Zen/Focus Mode** — masquer tous les panneaux sauf l'éditeur (0.5 jour)

### V1.2

- [ ] Projets récents réels (depuis DB ou fichier JSON)
- [ ] Notifications proof test (J-30, J-7, J-0) in-app + système desktop
- [ ] Layout présets (Calcul / Review / Rédaction) + resize panels
- [ ] Outline panel SIF (structure arborescente cliquable)
- [ ] **Problems Panel** + moteur de règles IEC 61511 (`DiagnosticProvider` pattern)
- [ ] **Timeline View** — audit trail des révisions SIF
- [ ] **Diff de révisions** — comparaison avant/après (`jsondiffpatch`)

### V2 (Architecture fichiers)

- [ ] Format `.sif` / `.prism` défini et implémenté
- [ ] Lecture/écriture fichiers locaux (Electron `dialog.showOpenDialog`)
- [ ] Mode standalone (sans Supabase)
- [ ] Diff de révisions visuel
- [ ] Recherche globale multi-projets (`Ctrl+Shift+F`)
- [ ] Export/Import config pour déploiement multi-postes
- [ ] Licence cryptographique Ed25519

### V3 (Enterprise & Ecosystem)

- [ ] Supabase self-hosted comme option de déploiement (guide + scripts)
- [ ] Minimap SIF (navigation visuelle)
- [ ] Templates de SIF (bibliothèque partageable)
- [ ] SSO SAML/OIDC (Microsoft Entra, Google Workspace)
- [ ] Machine fingerprint (contrôle strict des sièges de licence)
- [ ] Plugin API pour moteurs de calcul tiers
- [ ] Git-native storage (`.sif` commitables, diff, merge)

---

## Ce que PRISM N'est PAS

- **Pas un autre FMEA / HAZOP tool** — PRISM se concentre sur la phase SIF (après HAZOP)
- **Pas un ERP** — pas de gestion achats, stocks, RH
- **Pas un DCS configurator** — PRISM calcule et documente, il ne programme pas les automates
- **Pas un outil cloud-only** — l'industrie lourde a des contraintes réseau que nous respectons
- **Pas deux produits séparés** — une seule codebase, deux surfaces (web + desktop)

---

## Principes UX inamovibles

1. **La vitesse avant tout** — chaque action doit répondre en < 100ms (UI), < 2s (calcul SIL)
2. **Pas de friction inutile** — zéro dialog de confirmation pour les actions réversibles
3. **Le SIF au centre** — tout l'UI disparaît quand l'ingénieur travaille sur son SIF
4. **L'erreur est informative** — pas de "Une erreur s'est produite". Toujours le contexte + l'action corrective
5. **Dark mode first** — l'industrie travaille de nuit, sur des écrans de control room
6. **Keyboard-native** — Command Palette + raccourcis = zero-mouse possible

---

*PRISM Engineering — Document interne — Ne pas distribuer*
