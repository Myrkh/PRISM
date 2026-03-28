# store/ — État global Zustand

## Fichiers

| Fichier | Contenu |
|---------|---------|
| `appStore.ts` | Store principal : navigation, projets, SIF, modaux, préférences, profil |
| `workspaceStore.ts` | Workspace/fichiers ouverts, onglets éditeur, nœuds |
| `useWorkspaceSync.ts` | Hook de sync workspace ↔ Supabase |
| `selectors.ts` | Sélecteurs dérivés |
| `types.ts` | AppView, CanonicalSIFTab, SettingsSection, AppSettingsSection |

## Utilisation courante

```ts
// Lire la vue courante (objet typé, pas une string)
const view = useAppStore(s => s.view)
if (view.type === 'sif-dashboard') {
  const { projectId, sifId, tab } = view
}

// Naviguer
const navigate = useAppStore(s => s.navigate)
navigate({ type: 'engine' })
navigate({ type: 'sif-dashboard', projectId, sifId, tab: 'verification' })
navigate({ type: 'settings', section: 'ai' })

// Projets / SIF actif
const projects = useAppStore(s => s.projects)
const currentSIF = view.type === 'sif-dashboard'
  ? projects.flatMap(p => p.sifs).find(s => s.id === view.sifId) ?? null
  : null

// Préférences
const preferences = useAppStore(s => s.preferences)
const updateAppPreferences = useAppStore(s => s.updateAppPreferences)

// Modaux
useAppStore(s => s.openSIFModal)()
useAppStore(s => s.openProjectModal)()

// Tab SIF — TOUJOURS normaliser
import { normalizeSIFTab } from '@/store/appStore'
const tab = normalizeSIFTab(view.tab) // 'overview' → 'cockpit', etc.
```

## Types exports clés

```ts
// types.ts
CanonicalSIFTab = 'cockpit' | 'history' | 'context' | 'architecture' | 'verification' | 'exploitation' | 'report'
AppSettingsSection = 'general' | 'workspace' | 'engine' | 'shortcuts' | 'export' | 'ai'
ProfileSettingsSection = 'account' | 'session'
SettingsSection = AppSettingsSection | ProfileSettingsSection

// AppView — union discriminée
AppView =
  | { type: 'home' }
  | { type: 'projects' }
  | { type: 'note'; noteId: string }
  | { type: 'workspace-file'; nodeId: string }
  | { type: 'search' }
  | { type: 'planning' }
  | { type: 'library'; templateId?: string; ... }
  | { type: 'settings'; section: SettingsSection }
  | { type: 'docs' }
  | { type: 'audit-log' }
  | { type: 'sif-history' }
  | { type: 'engine' }
  | { type: 'hazop' }
  | { type: 'sif-dashboard'; projectId: string; sifId: string; tab: SIFTab }
  | { type: 'prism-file'; filename: PrismEditableFile | 'sif-registry.md' }
```

## Règle Immer
Le store utilise Immer — mutations directes dans les slices `set(state => { state.x = y })`.
Pas besoin de spread (`{ ...state, x: y }` est interdit dans les actions store).
