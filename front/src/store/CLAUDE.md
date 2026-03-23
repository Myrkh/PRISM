# store/ — État global Zustand

## Fichiers

| Fichier | Contenu |
|---------|---------|
| `appStore.ts` | Store principal (~62KB) : navigation, SIF sélectionné, modaux, filtres |
| `workspaceStore.ts` | Workspace/fichiers ouverts, onglets éditeur |
| `useWorkspaceSync.ts` | Hook de sync workspace ↔ Supabase |
| `selectors.ts` | Sélecteurs dérivés |
| `types.ts` | Types pour les sections settings |

## Utilisation courante

```ts
// Lire l'état
const view = useAppStore(s => s.currentView)
const sif  = useAppStore(s => s.selectedSIF)

// Naviguer
const navigate = useAppStore(s => s.navigate)
navigate('engine')
navigate('sif-dashboard', { sifId, tab: 'verification' })

// Modaux
useAppStore(s => s.openSIFModal)()
useAppStore(s => s.openProjectModal)()

// Tab SIF — TOUJOURS normaliser
import { normalizeSIFTab } from '@/store/appStore'
const tab = normalizeSIFTab(view.tab) // 'overview' → 'cockpit', etc.
```

## Types exports clés de appStore.ts
```ts
AppView           // union de toutes les vues possibles
CanonicalSIFTab   // 'cockpit' | 'context' | 'architecture' | 'verification' | 'exploitation' | 'report'
normalizeSIFTab() // convertit les alias legacy
```

## Règle Immer
Le store utilise Immer — mutations directes dans les slices `set(state => { state.x = y })`.
Pas besoin de spread (`{ ...state, x: y }` est interdit dans les actions store).
