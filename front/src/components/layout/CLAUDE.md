# components/layout/ — Shell & Navigation v3

## Architecture shell (SIFWorkbenchLayout)

```
SIFWorkbenchLayout.tsx
├── IconRail (48px gauche)
│   ├── Home
│   ├── GlobalToolsFlyout → [Review, Audit, History, Engine, HAZOP]
│   └── Settings
├── ProjectSidebar (~240px)
│   └── ProjectTree.tsx → "+ Nouvelle SIF" contextuel par projet
├── Editor (centre)
│   ├── EditorTabBar.tsx → SIFLifecycleBar (Cockpit→Context→Architecture→Vérification→Exploitation→Rapport)
│   └── <workspace actif selon tab>
└── RightPanelShell.tsx
    └── <panel contextuel selon phase>
```

## Fichiers clés

| Fichier | Rôle |
|---------|------|
| `SIFWorkbenchLayout.tsx` | Conteneur principal v3, orchestre tout |
| `IconRail.tsx` | Rail gauche 48px — 5 items max |
| `EditorTabBar.tsx` | **SIFLifecycleBar** — stepper IEC 61511 |
| `ProjectTree.tsx` | Arbre projets avec bouton contextuel SIF |
| `ProjectSidebar.tsx` | Wrapper sidebar avec ProjectTree |
| `RightPanelShell.tsx` | Shell panneau droit contextuel |
| `CommandPalette.tsx` | Cmd+K — recherche/actions globales |
| `HomeScreen.tsx` | Écran accueil (welcome) |
| `SettingsModal.tsx` | Modal settings in-app |
| `SIFBrowserWelcome.tsx` | Empty state "Sélectionner un SIF" |
| `LifecycleCockpit.tsx` | Composant cockpit lifecycle |

## Règles architecture
- IconRail : max 5 items, pas de FolderPlus/FilePlus dans le rail
- GlobalToolsFlyout : les 5 outils globaux dans UN seul flyout
- SIFLifecycleBar remplace l'ancien EditorTabBar générique
- Pas de `useMemo` dans les layouts (performance suffisante sans)

## Command Palette (sous-dossier)
```
command-palette/
├── CommandPalette.tsx    # Composant principal (Cmd+K)
├── useCommandGroups.ts   # Groupes de commandes (navigation, SIF, global)
├── types.ts              # Types Command, CommandGroup
└── index.ts              # Exports
```
