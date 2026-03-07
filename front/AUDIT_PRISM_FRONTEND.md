# PRISM — Audit Frontend Complet

**Date** : 6 mars 2026  
**Auditeur** : Claude (Architecte Logiciel Senior / Expert Sécurité Fonctionnelle)  
**Scope** : Frontend React/TypeScript — `src/` complet  
**Objectif** : Diagnostic, plan de refactorisation, préparation backend moteur de calcul

---

## 0. RÉSUMÉ EXÉCUTIF

| Métrique | Valeur |
|----------|--------|
| Fichiers source (hors UI primitives) | 38 fichiers |
| Lignes de code total | ~15 600 lignes |
| Code mort identifié | ~1 854 lignes (4 fichiers importés nulle part) |
| God components (>500 lignes) | 8 fichiers |
| Types dupliqués dans `types/index.ts` | 3 interfaces + 1 type alias (définis 2 fois) |
| `@ts-nocheck` | 1 fichier (LoopEditorFlow.tsx) |
| Inline styles (`style={{...}}`) | 243+ occurrences (105 dans SIFWorkbenchLayout seul) |
| Design system cohérent | ❌ Deux thèmes concurrents (dark app + light DA KORE) |

**Verdict** : Les fondations métier sont solides (types IEC 61508, Supabase layer, PFD engine de base). Mais l'architecture frontend a divergé en branches parallèles non réconciliées, avec du code mort massif, des God components, et deux systèmes de bibliothèque concurrents. Le refactoring est impératif avant d'avancer.

---

## 1. INVENTAIRE DU CODE MORT

### 1.1 Fichiers jamais importés (DEAD CODE)

| Fichier | Lignes | Raison de la mort |
|---------|--------|-------------------|
| `architecture/ArchitectureBuilder.tsx` | 845 | Remplacé par `LoopEditorFlow.tsx` + `LoopEditorRightPanel.tsx`. Contient la feature bibliothèque custom avec groupes/export/import qui **n'existe plus dans le code actif**. |
| `architecture/SIFChainDiagram.tsx` | 417 | Vue v2 « chain diagram » — remplacée par le canvas ReactFlow. |
| `projects/ProjectHazopDialog.tsx` | 590 | Dialog HAZOP standalone. L'app utilise `HazopWorkspace.tsx` à la place. |
| `core/models/architectures.ts` | 2 | Simple re-export de `ARCHITECTURE_META` — inutile. |
| **TOTAL** | **1 854** | |

### 1.2 Fichier zombie : `modals/ProjectModal.tsx`

443 lignes. Doublon de `projects/ProjectModal.tsx` (432 lignes). La version `modals/` n'est importée nulle part. **Dead code supplémentaire.**

→ **Total code mort : ~2 297 lignes** soit **~14,7% du codebase**.

### 1.3 Réponse à ta question sur le custom component

**Oui, le code de bibliothèque custom est encore là** — mais dans le fichier mort `ArchitectureBuilder.tsx` (lignes 245-293). Il permettait de :
- Créer des groupes custom (par type capteur/logique/actionneur)
- Ajouter des composants personnalisés à ces groupes
- Exporter/importer la bibliothèque en JSON
- Drag & drop des composants custom vers les canaux

Ce code **n'est PAS accessible** dans l'app actuelle car `ArchitectureBuilder.tsx` n'est importé nulle part. Le `LoopEditorRightPanel.tsx` actif a une bibliothèque hardcoded plus simple (`LIBRARY_ITEMS`) sans possibilité de créer des customs.

→ **Action** : Récupérer cette logique et l'intégrer dans la nouvelle architecture modulaire.

---

## 2. GOD COMPONENTS

| Composant | Lignes | Responsabilités enchevêtrées |
|-----------|--------|------------------------------|
| `SIFWorkbenchLayout.tsx` | 1 086 | Shell principal + icon rail + project tree + home screen + confirm dialog + right panel + tab bar + intercalaire card + status icons + context menus (projet + SIF) |
| `ProofTestTab.tsx` | 989 | Éditeur de procédure + CRUD catégories/étapes + exécution campagne + rendu tableau + DnD steps + right panel override |
| `ArchitectureBuilder.tsx` | 845 | (Dead) Library panel + DnD + subsystem blocks + channel blocks + component cards + boolean gate diagram |
| `SILReportStudio.tsx` | 805 | Config panel + PDF generation + template rendering |
| `ComponentParamsSheet.tsx` | 665 | Sheet UI + factorized form + developed form + test params + advanced params |
| `SIFModal.tsx` | 651 | Create/edit SIF form + HAZOP fields + subsystem config |
| `appStore.ts` | 637 | Navigation + UI state + CRUD projects + CRUD SIFs + architecture mutations + proof test + campaigns + events + HAZOP + revisions |
| `SIFDashboard.tsx` | 603 | Tab router + overview dashboard + HAZOP edit + compliance table + chart + all tab content orchestration |

---

## 3. PROBLÈMES DE TYPES

### 3.1 Définitions dupliquées dans `core/types/index.ts`

Les types suivants sont définis **deux fois** avec des shapes **incompatibles** :

```
Ligne 332 : export type CampaignVerdict (1ère)
Ligne 362 : export type CampaignVerdict (2ème — IDENTIQUE)

Ligne 340 : export interface StepResult (1ère — 5 champs)
Ligne 364 : export interface StepResult (2ème — 4 champs différents)

Ligne 348 : export interface TestCampaign (1ère — 9 champs)
Ligne 372 : export interface TestCampaign (2ème — 15 champs)
```

La 2ème définition de `TestCampaign` ajoute `processLoad`, `sifResponseTimeMs`, `valveReactionTimeMs`. La 2ème `StepResult` a un champ `done: boolean` en plus et un `result` typé différemment (`'pass'|'fail'|'na'` vs `'oui'|'non'|'na'|null`).

→ TypeScript prend la dernière définition, donc les 1ères sont silencieusement écrasées. **C'est un bug de données potentiel**.

### 3.2 `@ts-nocheck`

`LoopEditorFlow.tsx` utilise `// @ts-nocheck` en ligne 9. Tous les problèmes TypeScript sont masqués. Les `any` sont répandus dans les handlers de nœuds ReactFlow.

---

## 4. PROBLÈMES D'ARCHITECTURE

### 4.1 Deux bibliothèques de composants concurrentes

| | ArchitectureBuilder (DEAD) | LoopEditorRightPanel (ACTIF) |
|---|---|---|
| Items | 11 composants (exida SERH + OREDA) | 15 composants |
| Lambda values | Différents (ex: PT = 6.5 vs 1.5) | Différents |
| Custom components | ✅ Groupes + import/export | ❌ Hardcoded seulement |
| Système DnD | dnd-kit (useDraggable) | HTML5 drag natif |
| Design | Light theme (DA KORE) | Dark theme |

→ Il faut **une seule source de vérité** pour la bibliothèque composants, avec les bonnes données λ/DC.

### 4.2 Deux systèmes de design

- **App principale** : Dark theme (#0F1318, #14181C, #1A1F24, teal #009BA4)
- **ArchitectureBuilder** (dead) : Light theme (navy #003D5C, teal #009BA4, bg #F0F4F8)
- **ProofTestTab** : Mélange les deux
- Les design tokens sont des constantes locales dans chaque fichier, jamais centralisés

### 4.3 Store monolithique

`appStore.ts` (637 lignes) est un blob unique qui mélange :
- State de navigation (`view`, `setTab`)
- State UI (`selectedComponentId`, modals open/close)
- CRUD projets (avec rollback optimiste)
- CRUD SIFs (idem)
- Mutations architecture (avec debounce Supabase)
- Proof test, campaigns, events, HAZOP
- Revisions (lazy-loaded)

Pas de **slices**, pas de **selectors memoized**, pas de **middleware** pour le sync.

### 4.4 PFD Calculation Engine — Analyse critique

Le moteur `pfdCalc.ts` (255 lignes) est fonctionnel mais **simplifié** :

**Corrections nécessaires pour être world-class :**

1. **Beta factor (CCF)** — Le commentaire dit "beta = 0.1 default" (ligne 91) mais le facteur β n'est **jamais appliqué** dans les formules. Pour 1oo2 c'est critique :
   - Formule actuelle : `PFD = λDU² × TI² / 3`
   - Formule IEC correcte : `PFD = (1-β)² × λDU² × TI²/3 + β × λDU × TI/2`
   
2. **Subsystem PFD** — La ligne 146 fait une **moyenne** des PFD composants (`reduce/length`). C'est incorrect. En architecture MooN, les composants dans un même canal sont en **série** (somme des PFD).

3. **Architecture-specific formulas** — Pas de distinction entre Type A et Type B (IEC 61508-2 Table 2/3).

4. **Partial stroke testing** — Les paramètres existent (`PartialTestParams`) mais ne sont **jamais utilisés** dans le calcul.

5. **Proof test imperfect coverage** — Le champ `proofTestCoverage` existe mais le calcul utilise TI brut sans appliquer la couverture.

6. **Common Cause** — Pas de modèle CCF (beta factor, MBF, etc.)

7. **Systematic capability** — Aucun check Route 1H/2H (IEC 61508-2 §7.4.4.2)

→ **Ce moteur est adéquat pour un MVP/démo mais insuffisant pour un outil de référence mondial.** Le moteur Python backend devra implémenter toutes les formules correctes. Le moteur frontend léger restera pour le feedback temps réel.

---

## 5. PLAN D'ACTION — REFACTORISATION

### Phase 1 : Nettoyage (Élagage)

| # | Action | Impact |
|---|--------|--------|
| 1.1 | Supprimer `ArchitectureBuilder.tsx` (845L) — **après avoir extrait** la logique bibliothèque custom | -845L dead |
| 1.2 | Supprimer `SIFChainDiagram.tsx` (417L) | -417L dead |
| 1.3 | Supprimer `ProjectHazopDialog.tsx` (590L) | -590L dead |
| 1.4 | Supprimer `modals/ProjectModal.tsx` (443L) | -443L dead |
| 1.5 | Supprimer `core/models/architectures.ts` (2L) | -2L dead |
| 1.6 | Dédupliquer les types dans `core/types/index.ts` — garder la version la plus complète | Fix types |
| 1.7 | Retirer `@ts-nocheck` de `LoopEditorFlow.tsx` et fixer les types | Fix TS |

### Phase 2 : Éclatement des God Components

**SIFWorkbenchLayout.tsx (1086L → ~6 fichiers)**

```
layout/
├── SIFWorkbenchLayout.tsx      (~200L)  — Orchestrateur pur (grid CSS + slots)
├── IconRail.tsx                (~80L)   — Navigation rail
├── ProjectTree.tsx             (~220L)  — Arbre projets/SIFs (left panel)
├── HomeScreen.tsx              (~300L)  — Home page projects + SIFs list
├── RightPanel.tsx              (~100L)  — Panneau propriétés SIF
├── IntercalaireTabBar.tsx      (~60L)   — Tab bar réutilisable (exportée)
└── ConfirmDialog.tsx           (~40L)   — Dialog de confirmation réutilisable
```

**appStore.ts (637L → slices séparés)**

```
store/
├── index.ts                    — Re-export du store combiné
├── slices/
│   ├── navigationSlice.ts      — view, tab, pinnedSIFs
│   ├── uiSlice.ts              — modals, selectedComponent, theme
│   ├── projectSlice.ts         — CRUD projects + optimistic updates
│   ├── sifSlice.ts             — CRUD SIFs + architecture mutations
│   ├── proofTestSlice.ts       — Procedures, campaigns, events
│   └── revisionSlice.ts        — SIF revisions (lazy-loaded)
├── selectors.ts                — Selectors memoized
└── middleware/
    └── supabaseSync.ts         — Debounced sync middleware
```

**SIFDashboard.tsx (603L → router + tab components)**

```
sif/
├── SIFDashboard.tsx            (~80L)   — Tab router pur
├── tabs/
│   ├── OverviewTab.tsx         (~250L)  — KPIs, HAZOP, metrics
│   ├── AnalysisTab.tsx         (~60L)   — PFDChart wrapper
│   ├── ComplianceTab.tsx       (~150L)  — Compliance table
│   └── (architecture + prooftest + report sont déjà séparés)
```

**ProofTestTab.tsx (989L → ~4 fichiers)**

```
prooftest/
├── ProofTestTab.tsx            (~150L)  — Orchestrateur
├── ProcedureEditor.tsx         (~300L)  — Éditeur de procédure (catégories/étapes)
├── CampaignExecutor.tsx        (~250L)  — Exécution campagne + résultats
├── StepRow.tsx                 (~100L)  — Ligne de step individuelle
└── (ProofTestRightPanel.tsx et ProofTestPDFExport.tsx déjà séparés)
```

### Phase 3 : Design System Centralisé

```
styles/
├── tokens.ts                   — Toutes les constantes de couleur/spacing
├── theme.ts                    — Configuration dark/light
└── globals.css                 — Variables CSS + Tailwind base

shared/
├── ConfirmDialog.tsx           — Dialog de confirmation
├── ContextMenu.tsx             — Menu contextuel réutilisable
├── StatusBadge.tsx             — Badge de statut (SIF/Project)
├── MetricCard.tsx              — Carte métrique KPI
├── SILBadge.tsx                — (déjà existant ✓)
└── SILGauge.tsx                — (déjà existant ✓)
```

### Phase 4 : Bibliothèque Composants Unifiée

```
library/
├── types.ts                    — LibraryComponent, LibGroup types
├── builtinCatalog.ts           — Catalogue built-in (exida SERH, OREDA, IEC TR, SIL-certified)
├── useComponentLibrary.ts      — Hook : CRUD custom components + groupes + persistence
├── LibraryPanel.tsx            — UI du panneau bibliothèque (extraite de ArchitectureBuilder)
└── DraggableLibraryItem.tsx    — Item draggable (dnd-kit uniquement)
```

### Phase 5 : Préparation Backend (Python)

La structure frontend devra exposer des **interfaces claires** pour le moteur de calcul :

```
core/
├── types/
│   ├── sif.types.ts            — SIF, Subsystem, Component
│   ├── calc.types.ts           — CalcRequest, CalcResult (contrat API)
│   ├── prooftest.types.ts      — ProofTest, Campaign
│   └── hazop.types.ts          — HAZOP, LOPA
├── math/
│   ├── pfdCalcLight.ts         — Calcul frontend rapide (feedback temps réel)
│   └── api/
│       └── calcApi.ts          — Appels au moteur Python (FastAPI)
├── models/
│   └── defaults.ts             — (existant, OK ✓)
```

**Contrat API moteur Python (CalcRequest → CalcResult) :**

```typescript
// Ce que le frontend envoie au backend
interface CalcRequest {
  subsystems: SubsystemInput[]
  method: 'simplified' | 'markov' | 'monte_carlo' | 'fault_tree'
  missionTime: number
  demandMode: 'low' | 'high' | 'continuous'
}

// Ce que le backend renvoie
interface CalcResult {
  PFDavg: number
  PFH: number            // Pour high demand / continuous
  RRF: number
  SIL: SILLevel
  subsystems: SubsystemResult[]
  chartData: PFDChartPoint[]
  complianceChecks: ComplianceCheck[]
  uncertaintyBounds?: { lower: number; upper: number }  // Monte Carlo
}
```

---

## 6. ARCHITECTURE CIBLE

```
src/
├── app/
│   ├── App.tsx                      — Entry point + hash router
│   └── providers/
│       ├── ThemeProvider.tsx
│       └── StoreProvider.tsx
│
├── features/
│   ├── projects/
│   │   ├── HomeScreen.tsx
│   │   ├── ProjectModal.tsx
│   │   └── projectSlice.ts
│   │
│   ├── sif/
│   │   ├── SIFDashboard.tsx         — Tab router
│   │   ├── SIFModal.tsx
│   │   ├── sifSlice.ts
│   │   └── tabs/
│   │       ├── OverviewTab.tsx
│   │       ├── AnalysisTab.tsx
│   │       └── ComplianceTab.tsx
│   │
│   ├── architecture/
│   │   ├── LoopEditorFlow.tsx       — ReactFlow canvas
│   │   ├── LoopEditorRightPanel.tsx
│   │   └── ComponentParamsSheet.tsx
│   │
│   ├── library/
│   │   ├── builtinCatalog.ts
│   │   ├── useComponentLibrary.ts
│   │   ├── LibraryPanel.tsx
│   │   └── DraggableLibraryItem.tsx
│   │
│   ├── prooftest/
│   │   ├── ProofTestTab.tsx
│   │   ├── ProcedureEditor.tsx
│   │   ├── CampaignExecutor.tsx
│   │   └── ProofTestPDFExport.tsx
│   │
│   ├── report/
│   │   └── SILReportStudio.tsx
│   │
│   └── global/
│       ├── AuditLogWorkspace.tsx
│       ├── HazopWorkspace.tsx
│       ├── ReviewQueueWorkspace.tsx
│       └── SIFHistoryWorkspace.tsx
│
├── core/
│   ├── types/
│   │   ├── sif.types.ts
│   │   ├── calc.types.ts
│   │   ├── prooftest.types.ts
│   │   └── hazop.types.ts
│   ├── math/
│   │   ├── pfdCalcLight.ts          — Frontend rapide
│   │   └── api/calcApi.ts           — Bridge vers Python
│   └── models/
│       └── defaults.ts
│
├── store/
│   ├── index.ts
│   ├── slices/
│   │   ├── navigationSlice.ts
│   │   ├── uiSlice.ts
│   │   ├── projectSlice.ts
│   │   ├── sifSlice.ts
│   │   ├── proofTestSlice.ts
│   │   └── revisionSlice.ts
│   ├── selectors.ts
│   └── middleware/supabaseSync.ts
│
├── shared/
│   ├── components/
│   │   ├── SILBadge.tsx
│   │   ├── SILGauge.tsx
│   │   ├── ConfirmDialog.tsx
│   │   ├── ContextMenu.tsx
│   │   ├── StatusBadge.tsx
│   │   └── MetricCard.tsx
│   └── hooks/
│       ├── useDebounce.ts
│       └── useOutsideClick.ts
│
├── layout/
│   ├── SIFWorkbenchLayout.tsx       — Shell pur (~200L)
│   ├── IconRail.tsx
│   ├── ProjectTree.tsx
│   ├── RightPanel.tsx
│   ├── AppHeader.tsx
│   ├── CommandPalette.tsx
│   └── IntercalaireTabBar.tsx
│
├── styles/
│   ├── tokens.ts
│   ├── theme.ts
│   └── globals.css
│
├── lib/
│   ├── supabase.ts
│   ├── db.ts
│   └── utils.ts
│
└── components/ui/                    — Shadcn/radix primitives (inchangé)
```

---

## 7. ORDRE D'EXÉCUTION RECOMMANDÉ

### Second Split — Refactorisation (estimé ~4 sessions de travail)

**Session 1** : Nettoyage + Types
1. Extraire la logique bibliothèque custom de `ArchitectureBuilder.tsx` dans un fichier séparé
2. Supprimer les 5 fichiers morts
3. Fusionner les types dupliqués dans `core/types/index.ts`
4. Éclater `core/types/index.ts` en fichiers par domaine
5. Retirer `@ts-nocheck` et fixer les types ReactFlow

**Session 2** : Store + Design tokens
1. Éclater `appStore.ts` en slices
2. Centraliser les design tokens
3. Extraire `ConfirmDialog`, `ContextMenu` en shared components

**Session 3** : Layout + Home
1. Éclater `SIFWorkbenchLayout.tsx` (IconRail, ProjectTree, HomeScreen, RightPanel)
2. Éclater `SIFDashboard.tsx` (OverviewTab, ComplianceTab)

**Session 4** : Features
1. Éclater `ProofTestTab.tsx` (ProcedureEditor, CampaignExecutor)
2. Unifier la bibliothèque composants (récupérer custom + dnd-kit)
3. Intégrer `LibraryPanel.tsx` dans `LoopEditorRightPanel.tsx`

### Third Split — Moteur de calcul Python

Après la refactorisation frontend, on construit le moteur Python qui sera la pierre angulaire de PRISM :

- **Méthodes** : Simplified (IEC 61508-6 Annex B), Markov, Monte Carlo, Fault Tree
- **Standards** : IEC 61508, IEC 61511, ISA 84
- **CCF Models** : Beta factor, MBF, Alpha factor
- **Architecture voting** : MooN complet avec beta, lambda_dd, MTTR
- **Demand modes** : Low demand, High demand, Continuous
- **Partial stroke testing** : Avec facteur de réduction PFD
- **Proof test imperfect** : Coverage < 100%
- **SFF/HFT constraints** : Route 1H / 2H, Type A / Type B

---

## 8. NOM DU PROJET

Quelques propositions pour un nom qui inspire confiance et modernité dans le monde Sécurité Fonctionnelle :

| Nom | Pourquoi |
|-----|----------|
| **PRISM** | (déjà ton nom) — Protection, Risk, Integrity, Safety, Monitoring. Excellent. |
| **AEGIS** | Bouclier mythologique — protection, robustesse, prestige |
| **SENTINEL** | Gardien vigilant — parfait pour la sécurité fonctionnelle |
| **VERITAS SIL** | Vérité + SIL — connote la précision et la rigueur |
| **SAFECALC PRO** | Descriptif, direct, professionnel |

Ma recommandation : **PRISM** est déjà excellent. Il sonne bien internationalement, c'est mémorable, et l'acronyme est versatile. Garde-le.

---

*Fin de l'audit. Prêt pour le Second Split quand tu es prêt.*
