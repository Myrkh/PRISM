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

## Fichiers shell principaux

| Fichier | Rôle |
|---------|------|
| `SIFWorkbenchLayout.tsx` | Conteneur principal v3, orchestre tout |
| `IconRail.tsx` | Rail gauche 48px — 5 items max |
| `EditorTabBar.tsx` | **SIFLifecycleBar** — stepper IEC 61511 |
| `ProjectTree.tsx` | Arbre projets avec bouton contextuel SIF |
| `ProjectSidebar.tsx` | Wrapper sidebar avec ProjectTree |
| `RightPanelShell.tsx` | Shell panneau droit contextuel |
| `AppHeader.tsx` | Header global de l'application |
| `StatusBar.tsx` | Barre de statut 22px (bas de fenêtre, toggle dans settings) |
| `HomeScreen.tsx` | Écran accueil (welcome / recent items) |
| `SIFBrowserWelcome.tsx` | Empty state "Sélectionner un SIF" |
| `LifecycleCockpit.tsx` | Composant cockpit lifecycle |
| `FloatingPanel.tsx` | Panel flottant générique |
| `EditorBreadcrumb.tsx` | Fil d'Ariane dans l'éditeur |
| `SidebarPrimitives.tsx` | Primitives UI réutilisables pour les sidebars |
| `RailPrimitives.tsx` | Primitives UI pour le rail d'icônes |
| `IntercalaireTabBar.tsx` | Tab bar intercalaire (onglets de section) |
| `ChatPanel.tsx` | Panel PRISM AI (shell du chat) |

## Command Palette (sous-dossier)
```
command-palette/
├── CommandPalette.tsx    # Composant principal (Cmd+K)
├── useCommandGroups.ts   # Groupes commandes (navigation, SIF, global)
├── useSymbolGroups.ts    # Groupes symboles (@mentions)
├── helpGroups.ts         # Groupes d'aide contextuelle
├── PaletteInput.tsx      # Input de la palette
├── modes.ts              # Détection de mode (@, >, #, ?)
├── types.ts              # Types Command, CommandGroup
└── index.ts              # Exports
```

Registry des commandes : `src/core/commands/registry/`
- `index.ts`, `types.ts`, `paletteCommands.ts`, `navigationCommands.ts`, `layoutCommands.ts`

## PRISM AI (sous-dossier)
```
prism-ai/
├── PrismAiShell.tsx          # Shell UI du panel chat
├── MessageBubble.tsx         # Bulle de message
├── MarkdownMessage.tsx       # Rendu markdown dans les messages
├── AttachPicker.tsx          # Sélecteur de contexte à attacher
├── ConfigPanel.tsx           # Config modèle/prompt du chat
├── ConversationOverview.tsx  # Vue d'ensemble conversations
├── HistorySidebar.tsx        # Historique des conversations
├── ComposerCommandMenu.tsx   # Menu commandes dans le composer
├── ProposalCard.tsx          # Card de proposition IA
│
├── usePrismAiChat.ts         # Hook principal (streaming, state, persistence)
├── automation.ts             # Contrôleur automation (étapes auto)
├── commands.ts               # Définitions commandes IA
├── helpIndex.ts              # Indexation contenu d'aide
├── models.ts                 # Modèles disponibles (Anthropic + Mistral)
├── types.ts                  # Types chat (ChatMessage, ChatConfig, etc.)
├── persistence.ts            # Persistance localStorage (legacy)
├── persistenceDb.ts          # Persistance Supabase
├── noteUtils.ts              # Utilitaires notes assistant
│
├── sifDraftProposal.ts       # Parser propositions draft SIF
├── sifDraftWorkspaceJson.ts  # Génération JSON workspace SIF
├── sifDraftWorkspaceNode.ts  # Nœud workspace pour draft SIF
├── projectDraftProposal.ts   # Parser propositions draft Projet
├── projectDraftWorkspaceJson.ts
├── projectDraftWorkspaceNode.ts
├── libraryDraftProposal.ts   # Parser propositions draft Bibliothèque
├── libraryDraftWorkspaceJson.ts
└── libraryDraftWorkspaceNode.ts
```

### Modèles disponibles (models.ts)
```ts
Anthropic : claude-sonnet-4-6, claude-opus-4-6, claude-haiku-4-5
Mistral AI : mistral-large-latest, mistral-small-latest, mistral-nemo
```

## Règles architecture
- IconRail : max 5 items, pas de FolderPlus/FilePlus dans le rail
- GlobalToolsFlyout : les 5 outils globaux dans UN seul flyout
- SIFLifecycleBar remplace l'ancien EditorTabBar générique
- Pas de `useMemo` dans les layouts (performance suffisante sans)
- PRISM AI : les drafts (SIF/Projet/Library) transitent par des fichiers `*DraftProposal.ts` avant d'être appliqués
