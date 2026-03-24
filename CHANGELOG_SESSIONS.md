
# PRISM — Journal de développement

> Historique des sessions Claude × PRISM Desktop
> Dernière mise à jour : 2026-03-24

---

## Session 6 — 2026-03-24 · Mistral AI + .prism/ éditeur plein écran + Sécurité clés API

### Mistral AI — 3ème provider LLM (souveraineté UE 🇫🇷)

Ajout de Mistral AI comme provider IA natif, en plus d'Anthropic et Ollama.

#### Fichiers modifiés

| Fichier | Changement |
|---------|-----------|
| `backend/app/services/ai_service.py` | Provider `"mistral"`, `SUPPORTED_MISTRAL_MODELS`, `AIConfig.mistral_api_key/model`, `_stream_mistral()`, health check Mistral |
| `backend/app/routes/ai.py` | `ChatRequest.provider` étendu à `"mistral"`, override model pour Mistral, endpoint `/api/ai/models` retourne liste Mistral |
| `front/src/components/layout/ChatPanel.tsx` | `MODELS` étendu avec 3 modèles Mistral (Large, Small, Nemo), sélecteur groupé par provider (Anthropic / Mistral AI) |

#### Détails techniques

- **API Mistral** : format OpenAI-compatible (`/v1/chat/completions`, SSE, `Bearer` auth) — intégration propre sans dépendance SDK
- **4 modèles** : `mistral-large-latest` (flagship), `mistral-small-latest` (économique), `mistral-nemo` (local/Ollama), `codestral-latest` (code)
- **Health check** : interroge `GET /v1/models` pour lister les modèles disponibles
- **Config** : `MISTRAL_API_KEY` + `MISTRAL_MODEL` dans `.env`

---

### .prism/ — Éditeur plein écran (fix largeur)

Deux correctifs CSS pour que les fichiers `.prism/` occupent tout l'espace disponible.

#### Problème 1 — `max-width: 760px` dans NotePreview

`notePreview.css` appliquait `max-width: 760px; margin: 0 auto` à `.prism-note-preview`, ce qui centrait le contenu sur 760px et laissait un vide à droite.

**Fix** : `max-width` piloté par une CSS variable `--prism-preview-max-width` (défaut `760px` pour les notes, `none` pour le .prism/ éditeur).

#### Problème 2 — Flex items sans `flex-1`

`PrismFileEditor`, `EditableEditor` et `RegistryViewer` utilisaient `flex h-full flex-col` sans `flex-1`, donc leur largeur était déterminée par le contenu, pas l'espace disponible.

**Fix** : remplacement de `h-full` par `flex-1 min-w-0` sur les 3 composants (pattern identique à `NoteEditorWorkspace`).

#### Fichiers modifiés

| Fichier | Changement |
|---------|-----------|
| `front/src/styles/notePreview.css` | `max-width: var(--prism-preview-max-width, 760px)` |
| `front/src/components/prism/PrismFileEditor.tsx` | `flex-1 min-w-0` sur `EditableEditor`, `RegistryViewer`, `PrismFileEditor` + `--prism-preview-max-width: none` dans `cssVars` |

---

### Sécurité — Protection des clés API

Les clés API ne doivent jamais être commitées dans le dépôt.

#### Fichiers créés / modifiés

| Fichier | Rôle |
|---------|------|
| `backend/.env.example` | Template documenté — toutes les variables avec valeurs placeholder et commentaires |
| `backend/.gitignore` | Créé : exclut `.env`, `.env.local`, `__pycache__`, `.venv`, build PyInstaller |
| `.gitignore` (racine) | Ajout `.env` et `.env.*.local` (seul `.env.local` était exclu avant) |

#### Workflow correct

```bash
# 1. Copier le template
cp backend/.env.example backend/.env

# 2. Renseigner les clés dans backend/.env
#    → ANTHROPIC_API_KEY=sk-ant-...
#    → MISTRAL_API_KEY=...
#    → ou OLLAMA_HOST=localhost pour le mode local

# 3. .env est dans .gitignore → jamais commité
# 4. .env.example est commité → documente les variables sans exposer les secrets
```

---

## Session 5 — 2026-03-24 · PRISM AI — Chat Panel complet + Architecture IA

### ChatPanel — Fenêtre de chat flottante (production-ready)

Refonte complète de `ChatPanel.tsx` — composant autonome prêt à câbler avec un LLM réel.

#### Fichiers créés / modifiés

| Fichier | Rôle |
|---------|------|
| `components/layout/ChatPanel.tsx` | Chat window complète — drag, resize 8 directions, maximize |
| `store/types.ts` | Ajout `chatPanelOpen: boolean` + `toggleChatPanel: () => void` |
| `store/appStore.ts` | Initialisation `chatPanelOpen: false` + action `toggleChatPanel` |
| `components/layout/AppHeader.tsx` | Bouton `ChatIcon` 28×28 (composite SVG) → remplace ancien bouton "AI" + `MessageSquare` |

#### Fonctionnalités câblées

- **`ChatIcon`** — composite SVG : MessageSquare + badge étoile 4 branches, couleur adaptive
- **`+ Nouveau chat`** — sauvegarde la conversation courante, reset état + contexte SIF attaché
- **`Historique`** — sidebar slide-in gauche : liste conversations, chargement, suppression par item, horodatage relatif
- **`Paperclip — Joindre SIF`** — lit le SIF actif depuis `useAppStore(s => s.view)`, badge détachable dans l'input. Désactivé si aucun SIF ouvert
- **`Settings2 — Config`** — remplace le contenu : sélecteur modèle (Sonnet / Opus / Haiku) + system prompt, persisté `localStorage`
- **`Maximize / Minimize`** — bascule `position: fixed; left: 48px; top: 48px; right: 0; bottom: 24px`
- **`×`** — ferme via `onClose → toggleChatPanel`
- **Input** — textarea auto-resize, `⏎` envoyer, `⇧⏎` nouvelle ligne, bouton `Send` adaptatif
- **Streaming stub** — `streamAIResponseStub` simule le streaming mot par mot avec délai; signature compatible `AsyncGenerator<string>`
- **Persistance** — conversations en `localStorage` (max 50), titres auto-générés, restauration contexte SIF

#### Types exportés (interface publique pour le câblage IA)

```ts
export interface ChatMessage     { id, role: 'user'|'assistant', content, timestamp }
export interface ChatConversation{ id, title, messages, contextSIFId?, contextSIFName? }
export interface AttachedContext { sifId, sifName }
export interface ChatConfig      { model, systemPrompt }
```

#### Point de câblage IA — une seule fonction à remplacer

```ts
// Dans ChatPanel.tsx — ligne ~80
// Remplacer streamAIResponseStub par l'implémentation réelle :
async function* streamPRISMAI(
  messages: ChatMessage[],
  context?: AttachedContext,
  config?: ChatConfig,
): AsyncGenerator<string>
```

---

### Architecture PRISM AI — Décisions d'architecture (discussions session)

#### Modèle à 3 couches de contexte

```
Couche 1 — knowledge/ (bundlé, invisible)    IEC 61511, méthodologie SIL, composants
Couche 2 — .prism/ (workspace, éditable)     context.md, conventions.md, sif-registry.md
Couche 3 — Contexte live (runtime)           SIF active sérialisée + calculs + diagnostics
```

#### `.prism/` — dossier de contexte workspace (à construire)

Inspiré de `.claude/` — visible dans le ProjectTree sous "Espace de travail" :

```
.prism/
├── context.md        ← user écrit le contexte projet
├── conventions.md    ← règles d'ingénierie, nomenclature
├── standards.md      ← normes applicables, SIL max site
└── sif-registry.md   ← AUTO-GÉNÉRÉ à chaque save SIF
```

`sif-registry.md` liste toutes les SIF (titre, SIL, PFD, phase, diagnostics) → l'IA peut comparer et naviguer entre SIF sans que l'user sélectionne.

#### knowledge/ — base métier bundlée (à construire)

Fichiers Markdown soigneusement rédigés, injectés systématiquement dans le contexte :
`iec61511-part1.md`, `iec61511-part2.md`, `sil-methodology.md`, `hazop-lopa.md`, `components-guide.md`, `prism-guide.md`

**RAG > Fine-tuning** : plus efficace, dynamique, mis à jour avec les releases.

#### Backend — Gateway IA (à construire)

```
POST /api/ai/chat
  → charge .prism/ + knowledge/
  → sérialise SIF active
  → RAG lookup pgvector (top-5 chunks)
  → route : Anthropic API | Ollama (host:port configurable)
  → stream SSE vers le front
```

Config enterprise :
```python
ollama_host: str = "localhost"   # serveur dédié GPU réseau interne
ollama_port: int = 11434         # configurable → pertinent pour nucléaire/défense
ollama_model: str = "mistral-nemo"
```

#### Roadmap PRISM AI (ordre de build décidé)

1. `knowledge/` — 6 fichiers métier IEC 61511 / SIL / PRISM
2. `.prism/` dans ProjectTree — volet UI + éditeur context/conventions
3. `sif-registry.md` auto-généré — service sérialisant tous les SIFs
4. Backend `/api/ai/chat` — FastAPI gateway Anthropic + Ollama
5. Config UI — Settings > Engine > IA (host, port, model, provider)

---

## Session 4 — 2026-03-24 · SRS Fields + Panel Consolidation + UX Polish

### Data model — Champs SRS IEC 61511 obligatoires

**`core/types/sif.types.ts`** — 3 nouveaux champs sur `SIF` :
```ts
processSafetyTime?: number   // PST en secondes — IEC 61511 SRS obligatoire
sifResponseTime?: number     // Temps de réponse SIF en secondes
safeState?: string           // Définition de l'état sûr
```

**`components/sif/ContextTab.tsx`** — section "Temps process & réponse SIF" dans la card SRS :
- Grid 2 colonnes : PST (s) + Temps réponse SIF (s)
- Champ texte : État sûr (description libre)

**`core/diagnostics/sifRules.ts`** — 4 nouvelles règles diagnostics :
- `ruleContextProcessSafetyTime` — warning si PST non renseigné
- `ruleContextSafeState` — warning si état sûr non défini
- `ruleContextSIFResponseTime` — warning si temps de réponse manquant
- Règle error : `sifResponseTime >= processSafetyTime` → erreur bloquante

### Consolidation panneaux droits

- **CockpitRightPanel** : 5 sections → 3 (État + Diagnostics, Gouvernance, Dossier)
- **ContextRightPanel** : 4 sections → 2 (État + métriques, Actions)
- **LoopEditorRightPanel** — `SubsystemArchSection` : suppression des card wrappers (`rounded-xl border`) → design plat avec séparateur `border-b` + accent couleur gauche, cohérent avec la Library

### FloatingPanel — Resize 8 directions

`FloatingPanel.tsx` : ajout de `size` state + 8 handles (N/S/E/W + 4 coins) avec pointer capture. `MIN_W = 220`, `MIN_H = 140`.

### Panel sections at startup

`LibrarySidebar.tsx` + `ProjectSidebar.tsx` : préférence `rightPanelDefaultState` appliquée aux états collapsed initiaux des sections de panneaux gauche.

### UX fixes

- `OverviewTab.tsx` : `p-4.5` → `p-4` (classe Tailwind invalide = padding zéro)
- `LibrarySidebar`, `ProjectSidebar`, `RightPanelShell` : ajout `inset 0 1px 0` pour cohérence de relief en haut des panneaux

---

## Session 3 — 2026-03-24 · Note Editor Pro + Fixes

### Éditeur de notes — Stack pro (CodeMirror 6 + unified/KaTeX)

Architecture complète remplaçant l'ancien textarea + regex renderer.

#### Packages installés
```
@codemirror/view  @codemirror/state  @codemirror/commands
@codemirror/lang-markdown  @codemirror/language  @codemirror/language-data
@lezer/highlight
unified  remark-parse  remark-gfm  remark-math
remark-rehype  rehype-katex  rehype-highlight  rehype-stringify
katex
```

#### Fichiers créés

| Fichier | Rôle |
|---------|------|
| `components/workspace/note/prismCMTheme.ts` | Thème CodeMirror 6 complet — palette PRISM dark/light, HighlightStyle pour markdown + code |
| `components/workspace/note/useMarkdownRender.ts` | Hook async unified pipeline → HTML (GFM + LaTeX + hljs) |
| `components/workspace/note/NoteEditor.tsx` | Composant CodeMirror 6 : line numbers, bracket matching, history, markdown lang, live theme via `Compartment`, scroll sync callback |
| `components/workspace/note/NotePreview.tsx` | Preview HTML rendue — reçoit `scrollPct` et `onScrollPct` pour sync bidirectionnelle |
| `components/workspace/note/index.ts` | Barrel export |
| `styles/notePreview.css` | CSS scopé `.prism-note-preview` : typographie, code blocks hljs PRISM, KaTeX math, tables, blockquote, scrollbars, custom properties CSS |

#### Fichiers modifiés

**`components/workspace/NoteEditorWorkspace.tsx`** — refonte complète :
- 3 modes : **Éditer** (CM6) | **Split** (éditeur + preview côte à côte, redimensionnable) | **Aperçu** (full preview)
- Divider drag : 20–80%, hover teal
- Bouton **Sync scroll** (Link2/Link2Off) — sync proportionnelle (ratio 0–1) bidirectionnelle, visible uniquement en mode Split
- CSS custom properties injectées sur le parent pour `notePreview.css`
- Status bar : mots · lignes · caractères
- Import `katex/dist/katex.min.css`

#### Capacités de l'éditeur
- Markdown GFM complet (tables, task lists, strikethrough, autolinks)
- **Math LaTeX** : `$inline$` et `$$block$$` via KaTeX
- **Syntax highlighting** : code fencé avec auto-détection du langage via highlight.js
- Coloration syntaxique dans l'éditeur : headings teal, keywords violet, strings vert, numbers orange, links bleu, etc.
- Live theme switching dark/light sans re-créer l'éditeur (`Compartment.reconfigure`)

---

### Bugs corrigés

#### Bug — Tous les onglets apparaissent au hard refresh
**Cause** : `openTabs` et `activeTabId` étaient inclus dans `WorkspacePersisted` → persistés dans localStorage ET synchro Supabase → restaurés à chaque refresh.

**Fix** (`store/workspaceStore.ts`) :
- Retirés de l'interface `WorkspacePersisted`
- Retirés du `partialize` (localStorage)
- Retirés du `pickPersisted` (push Supabase)
- Retirés du `_loadSnapshot` (pull Supabase)
- Ajoutés comme champs session-only directement dans `WorkspaceState`

**Résultat** : hard refresh = tab bar vide, seul l'onglet explicitement cliqué s'ouvre.

#### Bug — Preview non scrollable en mode Split
**Cause** : le wrapper du panneau preview avait `overflow-hidden` sans hauteur explicite → le `overflow-y: auto` de `.prism-note-preview` n'avait pas de contexte de hauteur.

**Fix** :
- Wrapper preview : `flex + min-h-0` (propagation hauteur flex)
- `.prism-note-preview` : ajout de `height: 100%`

---

## Session 2 — 2026-03-23 · Command Palette Pro + Toast + Breadcrumb + FormatValue

### Command Palette — refonte VS Code style

**`useCommandGroups.ts`** :
- Préfixes catégorie sur toutes les commandes : `Navigate:`, `SIF:`, `Library:`, `Settings:`, `Layout:`, `Create:`
- `Library: New Sensor / Logic / Actuator` → simule le clic sur le bouton dans la Library (via `view.action` dans `AppView`)
- `Settings:` → active/désactive chaque préférence directement depuis la palette (notation scientifique, format PDF, vue d'accueil)
- **Recent items** : premier groupe en mode default — historique des 12 derniers items (SIF, notes, fichiers workspace), icônes par type

**`store/types.ts`** : ajout de `action?: 'create-sensor' | 'create-logic' | 'create-actuator'` dans le variant `library` de `AppView`

**`components/library/LibraryNavigation.tsx`** : `useEffect` consomme `view.action` → appelle `setEditorState({ kind: 'create', subsystemType })` → nettoie avec `navigate({ type: 'library' })`

**i18n** (`en/shell.ts`, `fr/shell.ts`, `shell.ts`) : nouvelles clés pour tous les préfixes, commandes settings, recent items labels.

---

### Système de Toast

Architecture en 3 fichiers séparés :

| Fichier | Rôle |
|---------|------|
| `components/ui/toast/types.ts` | `ToastKind`, interface `Toast` |
| `components/ui/toast/toastStore.ts` | Store Zustand séparé — `push()`, durées par défaut, `useToast()` hook, objet impératif `toast` |
| `components/ui/toast/ToastItem.tsx` | Item 340px, bordure gauche colorée par kind, auto-dismiss, close button |
| `components/ui/toast/ToastStack.tsx` | Fixed `bottom-6 right-6 z-[9999]`, `aria-live="polite"` |

- Durées : success/info = 4s, warning = 6s, error = persistant (0)
- Thème adaptatif dark/light (zinc-900 / white)
- Ajouté dans `App.tsx` : `<ToastStack />`
- Wired dans `appStore.ts` : toutes les erreurs de sync appellent `toast.error(...)`

---

### Recent Items

**`core/models/recentItems.ts`** :
- `RecentItemKind` : `sif | project | note | workspace-file | view`
- `pushRecentItem()` : déduplique par id, max 12, tri timestamp desc
- Persiste dans `AppPreferences.recentItems[]`
- `navigate()` dans appStore push automatiquement pour `sif-dashboard`, `note`, `workspace-file`

---

### EditorBreadcrumb

**`components/layout/EditorBreadcrumb.tsx`** (nouveau) :
- 26px, tokens PRISM, séparateurs `ChevronRight`
- SIF : `Projet › SIF-003 — Titre › Architecture` (cliquable — project → projects, SIF → cockpit)
- Settings : `Settings › Section`
- Vues globales : label seul
- Placé au-dessus de la `SIFWorkbenchBar` dans `SIFWorkbenchLayout.tsx`

---

### useFormatValue — notation scientifique / arrondi

**`utils/formatValue.ts`** : hook `useFormatValue()` → `fmt(value)` qui lit `useScientificNotation` + `decimalRoundingDigits` depuis les préférences.

Wired dans :
- `SIFWorkbenchLayout.tsx` (PFD dans le right panel)
- `VerificationWorkspace.tsx` (PFD_avg, sub PFD)
- `StatusBar.tsx` (PFD affiché en bas)

---

## Session 1 — 2026-03-22 · Shell v3 + Lifecycle Bar + Architecture UX

### Shell v3 — SIFWorkbenchLayout

- `IconRail` 48px : 5 items max — Home, GlobalToolsFlyout (Review/Audit/History/Engine/HAZOP), Settings
- `SIFLifecycleBar` dans `EditorTabBar.tsx` : stepper IEC 61511 `[Cockpit] | [1 Contexte] → ... → [4 Exploitation] | [Publier ↗]`
- `RightPanelShell.tsx` : panneau contextuel par phase SIF
- Split view : `secondSlot` dans le store, `openSecondSlot / closeSecondSlot / loadSIFInSecondSlot`

### Tabs SIF — IDs canoniques stabilisés

`CanonicalSIFTab` = `cockpit | context | architecture | verification | exploitation | report`

Legacy aliases (`overview → cockpit`, `analysis → verification`, `compliance → verification`, `prooftest → exploitation`) gérés par `normalizeSIFTab()`.

### Règles UX adoptées

- Pas de footer nav (← Précédent / Continuer →) — la lifecycle bar suffit
- `SIFPhaseHeader` = micro-hint 1 ligne uniquement
- `ArchitectureWorkspace` = canvas plein écran, zéro chrome
- Settings SIF dans le right panel uniquement
- Pas de `useMemo` inutile dans les layouts

---

## Roadmap V2 — Discussions à ne pas oublier

### Monaco Editor — Proposition discutée

**Contexte** : discussion sur l'éditeur de notes → on a évalué Monaco (l'éditeur de VS Code).

**Verdict : NON pour les notes markdown, OUI pour des cas spécifiques V2.**

#### Pourquoi pas Monaco pour les notes
- Bundle très lourd (~4–6 MB) pour un éditeur markdown → CodeMirror 6 (~400 KB) est largement suffisant et plus léger
- Monaco est conçu pour du code, pas pour du markdown "document" — moins agréable à écrire du prose
- CodeMirror 6 + KaTeX + unified couvre 100% du besoin actuel avec une meilleure UX d'écriture

#### Cas d'usage Monaco planifiés pour V2

| Feature V2 | Valeur |
|------------|--------|
| **Diff viewer pour les révisions SIF** | Comparer deux révisions côte à côte (comme GitHub diff) — Monaco a un `DiffEditor` natif excellent |
| **Éditeur de fichiers `.sif` / `.prism`** | Quand les fichiers locaux seront supportés (V2 — local-first), Monaco pour éditer le JSON/format brut avec coloration syntaxique custom |
| **Script editor** | Si PRISM supporte des scripts de calcul custom (Python-like ou DSL maison), Monaco avec un langage custom enregistré via `monaco.languages.register()` |
| **Custom Language Server** | À terme, un LSP PRISM qui donne de l'autocomplétion sur les paramètres SIF directement dans l'éditeur |

#### Architecture envisagée (V2)
```
// Lazy-load Monaco uniquement quand nécessaire (diff viewer, script editor)
const MonacoDiffViewer = lazy(() => import('./MonacoDiffViewer'))

// Enregistrement du langage PRISM custom
monaco.languages.register({ id: 'prism-sif' })
monaco.languages.setMonarchTokensProvider('prism-sif', prismSIFGrammar)
```

**Décision** : Monaco reste dans la roadmap V2 pour des features spécifiques (diff, scripts, fichiers locaux), jamais pour remplacer CodeMirror dans l'éditeur de notes.

---

### Direction V2 — Local-first

- Fichiers `.sif` / `.prism` locaux — Supabase = sync optionnelle
- Pas Supabase Cloud pour enterprise (nucléaire, défense)
- Architecture : store local (SQLite via Tauri ?) + sync Supabase opt-in
- DiagnosticProvider pattern pour warnings inline dans les SIF (à la VS Code)
- Timeline audit trail complet

### Features V2 envisagées

- **Status Bar SIL** : indicateur SIL en temps réel dans la status bar (DiagnosticProvider)
- **`defaultProofTestIntervalTH`** : consommé lors de la création de campagnes
- **`pdfPageSize`** : préférence existante mais code export PDF non encore mise à jour
- **Monaco DiffViewer** pour l'onglet Historique des révisions SIF
- **Script editor** custom (DSL calcul PRISM)
- **Tauri ou autre** pour le packaging local-first (alternative Electron)

---

## Stack de référence

| Couche | Technologie |
|--------|-------------|
| Frontend | React 18 + TypeScript 5.4 + Vite 5 |
| State | Zustand 4.5 + Immer |
| DB / Auth | Supabase (@2.98) |
| Canvas | ReactFlow 11 (loop editor) |
| Style | TailwindCSS + tokens `styles/tokens.ts` |
| Icônes | lucide-react |
| Note editor | CodeMirror 6 + unified/remark/rehype + KaTeX |
| Export | jsPDF + html2canvas |
| Backend calcul | FastAPI (Python) + PyInstaller |
| Launcher | Electron (NSIS installer Windows) |


Monaco + JSON/Scripts dans PRISM — Proposition complète                                                                                 
                                                                                                                                          
  1. Éditeur JSON de configuration SIF
                                                                                                                                          
  Chaque SIF a des paramètres de calcul (mission time, lambda, beta factors, CCF...) aujourd'hui édités via des formulaires. L'idée :     
  exposer aussi une vue "Config brute" en JSON avec Monaco.
                                                                                                                                          
  // Vue : Architecture > Config brute                      
  {                                                                                                                                       
    "missionTimeTH": 8760,
    "proofTestIntervalTH": 8760,                                                                                                          
    "ccfBeta": 0.10,                                                                                                                      
    "subsystems": [
      {                                                                                                                                   
        "id": "sub-1",                                      
        "type": "sensor",                                                                                                                 
        "architecture": "1oo2",                             
        "components": [                                                                                                                   
          { "tag": "PT-101", "lambdaD": 1.5e-7, "lambdaS": 3e-8 }
        ]                                                                                                                                 
      }                                                     
    ]                                                                                                                                     
  }                                                         

  Valeur : ingénieurs expérimentés peuvent éditer directement, copier-coller entre SIFs, scripter des imports batch. Monaco valide le JSON
   en temps réel avec le schéma JSON Schema du type SIF.
                                                                                                                                          
  ---                                                       
  2. Script Editor — DSL de calcul PRISM
                                                                                                                                          
  L'idée la plus ambitieuse : un langage de script léger pour définir des calculs custom au-delà du moteur standard IEC 61511.
                                                                                                                                          
  # Exemple de script PRISM (DSL Python-like)               
  # Calcul PFD custom pour architecture 2oo3 avec maintenance                                                                             
                                                                                                                                          
  def pfd_2oo3_maintained(lambda_d, T1, beta):                                                                                            
      pfd_single = lambda_d * T1 / 2                                                                                                      
      pfd_ccf = beta * lambda_d * T1 / 2                                                                                                  
      return 3 * (pfd_single ** 2) * (1 / pfd_single) - pfd_ccf
                                                                                                                                          
  result = pfd_2oo3_maintained(                             
      lambda_d = component("PT-101").lambdaD,                                                                                             
      T1 = sif.proofTestIntervalTH,                                                                                                       
      beta = 0.10
  )                                                                                                                                       
                                                            
  assert result < sif.pfdTarget, f"PFD {result:.2e} dépasse la cible {sif.pfdTarget:.2e}"                                                 
   
  Monaco enregistre un langage prism-script avec :                                                                                        
  - Autocomplétion sur component("..."), sif.*, subsystem("...")
  - Validation syntaxique inline                                                                                                          
  - Exécution côté backend (FastAPI sandbox Python)         
                                                                                                                                          
  ---                                                                                                                                     
  3. Monaco Diff Viewer — Révisions SIF
                                                                                                                                          
  L'onglet Historique comparant deux révisions côte à côte. Monaco a un DiffEditor natif.
                                                                                                                                          
  Révision 1.2 (2025-11-01)          Révision 1.3 (2026-01-15)
  ────────────────────────────────   ────────────────────────────────                                                                     
    missionTimeTH: 8760          │     missionTimeTH: 8760  
  - pfdTarget: 1e-3              │   + pfdTarget: 1e-4          ← changé                                                                  
    subsystems:                  │     subsystems:                                                                                        
      - PT-101                   │       - PT-101                                                                                         
  -     lambdaD: 1.5e-7          │   +     lambdaD: 1.2e-7      ← changé                                                                  
                                                                                                                                          
  Couleurs diff intégrées, navigation entre les changements, export du diff en PDF pour la traçabilité IEC 61511.                         
                                                                                                                                          
  ---                                                                                                                                     
  4. Fichiers .sif locaux (V2 local-first)                  
                                                                                                                                          
  Quand PRISM passera en local-first, chaque SIF sera un fichier .sif (JSON structuré). Monaco comme éditeur de fichier brut pour :
  - Debug avancé                                                                                                                          
  - Migration / import depuis d'autres outils               
  - Édition en masse via scripts externes                                                                                                 
                                                                                                                                          
  ---
  Architecture technique envisagée                                                                                                        
                                                                                                                                          
  // Lazy-load Monaco uniquement quand la feature est ouverte
  // → pas d'impact sur le bundle principal (~4-6 MB évités au démarrage)                                                                 
                                                                                                                                          
  const MonacoDiffViewer = lazy(() => import('./note/MonacoDiffViewer'))                                                                  
  const MonacoScriptEditor = lazy(() => import('./note/MonacoScriptEditor'))                                                              
                                                                                                                                          
  // Enregistrement du langage PRISM custom (une seule fois au boot)                                                                      
  import * as monaco from 'monaco-editor'
                                                                                                                                          
  monaco.languages.register({ id: 'prism-script' })                                                                                       
  monaco.languages.setMonarchTokensProvider('prism-script', prismGrammar)                                                                 
  monaco.languages.registerCompletionItemProvider('prism-script', prismCompletion)                                                        
                                                                                                                                          
  // JSON Schema pour validation SIF
  monaco.languages.json.jsonDefaults.setDiagnosticsOptions({                                                                              
    validate: true,                                                                                                                       
    schemas: [{ uri: 'prism://sif-schema.json', schema: SIF_JSON_SCHEMA }]                                                                
  })                                                                                                                                      
                                                                                                                                          
  ---                                                                                                                                     
  Résumé décisions                                          
                  
  ┌───────────────────────┬────────────────┬───────────────────────────────────────────┐
  │        Feature        │      Prio      │                    Lib                    │                                                  
  ├───────────────────────┼────────────────┼───────────────────────────────────────────┤
  │ Diff viewer révisions │ V2 haute       │ Monaco DiffEditor                         │                                                  
  ├───────────────────────┼────────────────┼───────────────────────────────────────────┤
  │ Config JSON raw       │ V2 moyenne     │ Monaco + JSON Schema                      │                                                  
  ├───────────────────────┼────────────────┼───────────────────────────────────────────┤
  │ Script editor DSL     │ V2 ambitieux   │ Monaco + langage custom + FastAPI sandbox │                                                  
  ├───────────────────────┼────────────────┼───────────────────────────────────────────┤                                                  
  │ Fichiers .sif locaux  │ V2 local-first │ Monaco                                    │
  ├───────────────────────┼────────────────┼───────────────────────────────────────────┤                                                  
  │ Notes markdown        │ actuel         │ CodeMirror 6 (reste)                      │
  └───────────────────────┴────────────────┴───────────────────────────────────────────┘                                                  
                                                            
  La clé architecturale : Monaco en lazy-load — jamais dans le bundle principal, chargé à la demande uniquement quand l'utilisateur ouvre 
  la feature concernée.