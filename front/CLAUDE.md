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
| AppView type | Workspace |
|-------------|-----------|
| `home` | `src/components/layout/HomeScreen.tsx` |
| `projects` | `src/App.tsx` (vue par défaut) |
| `library` | `src/components/global/LibraryWorkspace.tsx` |
| `engine` | `src/components/global/EngineWorkspace.tsx` |
| `audit-log` | `src/components/global/AuditLogWorkspace.tsx` |
| `hazop` | `src/components/global/HazopWorkspace.tsx` |
| `search` | `src/components/global/SearchWorkspace.tsx` |
| `sif-history` | `src/components/global/SIFHistoryWorkspace.tsx` |
| `docs` | `src/components/global/DocsWorkspace.tsx` |
| `planning` | `src/components/global/PlanningWorkspace.tsx` |
| `settings` | `src/components/settings/SettingsWorkspace.tsx` |
| `note` | Workspace note (nodeId) |
| `workspace-file` | Workspace file viewer (nodeId) |
| `prism-file` | Éditeur fichiers .prism/ intelligence |

### SIF Workbench (phases IEC 61511)
| Tab canonique | Workspace | RightPanel |
|---------------|-----------|------------|
| `cockpit` | `src/components/sif/OverviewTab.tsx` | `CockpitRightPanel.tsx` |
| `context` | `src/components/sif/ContextTab.tsx` | `ContextRightPanel.tsx` |
| `architecture` | `src/components/sif/ArchitectureWorkspace.tsx` | `LoopEditorRightPanel.tsx` |
| `verification` | `src/components/sif/VerificationWorkspace.tsx` | `VerificationRightPanel.tsx` |
| `exploitation` | `src/components/sif/ExploitationWorkspace.tsx` | `ProofTestRightPanel.tsx` |
| `report` | `src/components/report/SILReportStudio.tsx` | `ReportConfigPanel.tsx` |
| `history` | Redirige → `cockpit` (affiche historique révisions) | — |

> Toujours utiliser `normalizeSIFTab(view.tab)` — les alias legacy (`overview → cockpit`, `analysis → verification`, etc.) sont gérés automatiquement.

### État global (Zustand)
| Donnée | Accès |
|--------|-------|
| Vue courante | `useAppStore(s => s.view)` — objet typé `AppView` |
| Naviguer | `useAppStore(s => s.navigate)(view)` |
| SIF actif | `view.type === 'sif-dashboard' ? projects.flatMap(p => p.sifs).find(s => s.id === view.sifId) : null` |
| Projet actif | `view.type === 'sif-dashboard' ? projects.find(p => p.id === view.projectId) : null` |
| Ouvrir modal SIF | `useAppStore(s => s.openSIFModal)()` |
| Ouvrir modal Projet | `useAppStore(s => s.openProjectModal)()` |
| Préférences app | `useAppStore(s => s.preferences)` |
| Store complet | `src/store/appStore.ts` |

### AppView — type union complet
```ts
type AppView =
  | { type: 'home' }
  | { type: 'projects' }
  | { type: 'note'; noteId: string }
  | { type: 'workspace-file'; nodeId: string }
  | { type: 'search' }
  | { type: 'planning' }
  | { type: 'library'; templateId?: string; origin?: string; libraryName?: string; action?: string }
  | { type: 'settings'; section: SettingsSection }
  | { type: 'docs' }
  | { type: 'audit-log' }
  | { type: 'sif-history' }
  | { type: 'engine' }
  | { type: 'hazop' }
  | { type: 'sif-dashboard'; projectId: string; sifId: string; tab: SIFTab }
  | { type: 'prism-file'; filename: PrismEditableFile | 'sif-registry.md' }
```

### Données (Supabase)
| Opération | Fichier |
|-----------|---------|
| Toutes les queries DB | `src/lib/db.ts` |
| Auth helpers | `src/lib/auth.ts` |
| Client Supabase | `src/lib/supabase.ts` |
| API engine backend | `src/lib/engineApi.ts` |
| API AI backend | `src/lib/aiApi.ts` |
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

### Settings
| Section | Contenu |
|---------|---------|
| `general` | Langue, thème, écran de démarrage |
| `workspace` | Panneaux, largeurs, breadcrumb, palette |
| `engine` | Tolérance, notation scientifique, chiffres significatifs, TH/TI défaut |
| `shortcuts` | Raccourcis clavier personnalisables |
| `export` | Entreprise, visa (preparedBy/checkedBy/approvedBy), confidentialité, pied de rapport |
| `ai` | Modèle par défaut, langue IA, contexte système, mode strict |
| `account` | Identité OAuth, displayNameOverride, copie userId |
| `session` | Session courante, déconnexion |

### AppPreferences — champs clés
```ts
// Layout
workspaceLeftPanelWidth: number       // 220–320px
workspaceRightPanelWidth: number      // 220–720px
rightPanelDefaultState: 'open'|'closed'
rightPanelSectionStates: Record<string, string[]>
showWorkflowBreadcrumb: boolean
commandPalettePosition: 'top'|'center'
panelsInverted: boolean
centeredLayout: boolean
statusBarVisible: boolean
activityBarVisible: boolean

// Engine
engineCompareTolerancePct: number     // 0–5%
useScientificNotation: boolean
decimalRoundingDigits: number         // 1–8
defaultMissionTimeTH: number          // heures
defaultProofTestIntervalTH: number    // heures

// Export PDF
pdfPageSize: 'A4'|'Letter'
reportCompanyName: string
reportSignatureText: string
reportConfidentialityLabel: string    // défaut 'Internal / Restricted'
reportPreparedBy: string
reportCheckedBy: string
reportApprovedBy: string

// PRISM AI
aiResponseLanguage: 'auto'|'fr'|'en'
aiAutoAttachSif: boolean
aiDefaultModel: string                // défaut 'claude-sonnet-4-6'
aiSystemPromptAddendum: string
aiStrictModeDefault: boolean

// Profil
displayNameOverride: string           // remplace nom OAuth, stocké localement
recentItems: RecentItem[]
```

### Workspace Intelligence (.prism/)
Fichiers markdown éditables accessibles via `{ type: 'prism-file' }` :
- `context.md` — contexte projet (description, domaine, contraintes)
- `conventions.md` — conventions d'ingénierie locales
- `standards.md` — normes et réglementations applicables
- `sif-registry.md` — registre SIF auto-généré (lecture seule)

### Styles & tokens
```ts
import { usePrismTheme } from '@/styles/usePrismTheme'
const { BORDER, TEAL, TEAL_DIM, TEXT, TEXT_DIM, PANEL_BG, CARD_BG, PAGE_BG, SHADOW_SOFT, semantic, isDark } = usePrismTheme()
// NE PAS hardcoder les couleurs — toujours utiliser les tokens
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
