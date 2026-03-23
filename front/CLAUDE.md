# PRISM Front — Guide Claude

## Stack
- React 18 + TypeScript 5.4 + Vite 5 (port 5173)
- Zustand 4.5 + Immer (état global)
- Supabase @2.98 (DB + auth cloud)
- ReactFlow 11 (loop editor)
- TailwindCSS + tokens `src/styles/tokens.ts`
- lucide-react 0.363 (icônes)
- jsPDF + html2canvas (export PDF)
- Proxy Vite : `/api` → `localhost:8000` (backend Python)

## Routing : "Je veux faire X → je regarde Y"

### Navigation & Layout
| Objectif | Fichier |
|----------|---------|
| Shell principal (Activity Bar + Sidebar + Editor + RightPanel) | `src/components/layout/SIFWorkbenchLayout.tsx` |
| IconRail 48px (5 outils + Home + Settings) | `src/components/layout/IconRail.tsx` |
| SIFLifecycleBar (stepper Cockpit→Report) | `src/components/layout/EditorTabBar.tsx` |
| Arbre projets + "+ Nouvelle SIF" | `src/components/layout/ProjectTree.tsx` |
| Changer de vue programmatiquement | `useAppStore(s => s.navigate)(view)` |
| Routes hash disponibles | `src/App.tsx` |

### Vues globales (hors SIF)
| Vue (`AppView`) | Workspace |
|-----------------|-----------|
| `library` | `src/components/global/LibraryWorkspace.tsx` |
| `engine` | `src/components/global/EngineWorkspace.tsx` |
| `audit-log` | `src/components/global/AuditLogWorkspace.tsx` |
| `hazop` | `src/components/global/HazopWorkspace.tsx` |
| `review-queue` | `src/components/global/ReviewQueueWorkspace.tsx` |
| `search` | `src/components/global/SearchWorkspace.tsx` |
| `sif-history` | `src/components/global/SIFHistoryWorkspace.tsx` |
| `docs` | `src/components/global/DocsWorkspace.tsx` |

### SIF Workbench (phases IEC 61511)
| Tab canonique | Workspace | RightPanel |
|---------------|-----------|------------|
| `cockpit` | `src/components/sif/OverviewTab.tsx` | `CockpitRightPanel.tsx` |
| `context` | `src/components/sif/ContextTab.tsx` | `ContextRightPanel.tsx` |
| `architecture` | `src/components/sif/ArchitectureWorkspace.tsx` | `LoopEditorRightPanel.tsx` |
| `verification` | `src/components/sif/VerificationWorkspace.tsx` | `VerificationRightPanel.tsx` |
| `exploitation` | `src/components/sif/ExploitationWorkspace.tsx` | `ProofTestRightPanel.tsx` |
| `report` | `src/components/report/SILReportStudio.tsx` | `ReportConfigPanel.tsx` |

> Toujours utiliser `normalizeSIFTab(view.tab)` — les alias legacy (`overview → cockpit`, `analysis → verification`) sont gérés automatiquement.

### État global (Zustand)
| Donnée | Accès |
|--------|-------|
| Vue courante | `useAppStore(s => s.currentView)` |
| Naviguer | `useAppStore(s => s.navigate)(view)` |
| SIF sélectionné | `useAppStore(s => s.selectedSIF)` |
| Projet sélectionné | `useAppStore(s => s.selectedProject)` |
| Ouvrir modal SIF | `useAppStore(s => s.openSIFModal)()` |
| Ouvrir modal Projet | `useAppStore(s => s.openProjectModal)()` |
| Store complet | `src/store/appStore.ts` |

### Données (Supabase)
| Opération | Fichier |
|-----------|---------|
| Toutes les queries DB | `src/lib/db.ts` |
| Auth helpers | `src/lib/auth.ts` |
| Client Supabase | `src/lib/supabase.ts` |
| API engine backend | `src/lib/engineApi.ts` |
| Accès projets | `src/lib/projectAccess.ts` |
| Workspace local | `src/lib/workspaceStorage.ts` |

### Calculs SIL
| Objectif | Fichier |
|----------|---------|
| Point d'entrée moteur | `src/engine/index.ts` |
| Calculs PFD (composant) | `src/engine/pfd/component.ts` |
| Calculs PFD (SIF) | `src/engine/pfd/sif.ts` |
| CCF (Common Cause Failure) | `src/engine/ccf.ts` |
| Beta factor | `src/core/math/betaFactor.ts` |
| Schemas Pydantic backend | `backend/app/schemas.py` |

### Styles & tokens
```ts
import { BORDER, TEAL, TEXT, TEXT_DIM, PANEL_BG } from '@/styles/tokens'
// NE PAS hardcoder les couleurs
```

## Types clés

```ts
// src/core/types/sif.types.ts
SIF { id, name, standard, target_sil, ... }

// src/store/appStore.ts
AppView = 'projects' | 'settings' | 'sif-dashboard' | 'library' | 'engine' | 'hazop' |
          'audit-log' | 'sif-history' | 'review-queue' | 'search' | 'docs' | 'planning' | ...

CanonicalSIFTab = 'cockpit' | 'context' | 'architecture' | 'verification' | 'exploitation' | 'report'
```

## Commandes dev
```bash
npm run dev      # Vite dev server :5173
npm run build    # tsc + vite build → dist/
npx tsc --noEmit # Vérif TypeScript uniquement
```

## Règles UX (post-audit v3)
- Pas de footer nav dans les tabs (← Précédent / Suivant →) — lifecycle bar gère
- Settings mission/SIF dans le right panel uniquement
- SIFPhaseHeader = micro-hint 1 ligne seulement
- ArchitectureWorkspace = canvas plein écran, zéro chrome parasite
- Pas de `useMemo` inutile dans les layouts
