# Command Palette — Guide Claude

## Architecture générale

```
command-palette/
├── CommandPalette.tsx      # Composant principal (Cmd+K) — shell visuel + logique d'ouverture
├── useCommandGroups.ts     # Hook principal — assemble les groupes selon le mode actif
├── useSymbolGroups.ts      # Hook extrait — mode '@' (composants SIF + templates Library)
├── helpGroups.ts           # Builder pur — mode '?' (modes, raccourcis, docs)
├── PaletteInput.tsx        # Input unifié avec badge de mode — partagé TOP et CENTER
├── modes.ts                # Détection de préfixe, couleurs, openPalette/togglePalette
├── types.ts                # Types CommandItem, CommandGroup, IndexedItem, IndexedGroup
└── index.ts                # Exports publics : CommandPalette, openPalette, togglePalette

core/commands/registry/
├── index.ts                # API publique du registre (buildRegisteredPaletteItems, etc.)
├── types.ts                # RegisteredCommand, PaletteCommandContext, ShortcutEntry, etc.
├── paletteCommands.ts      # Commandes : ouvrir palette, mode '>', ouvrir fichiers JSON
├── navigationCommands.ts   # Commandes : navigation entre vues, thème, AI chat, recherche
└── layoutCommands.ts       # Commandes : panneaux, zen mode, split, position palette, etc.
```

---

## Modes disponibles

| Préfixe | Mode | Contenu |
|---------|------|---------|
| *(vide)* | `default` | Recent + search results + SIF courant + create + projets + SIFs + library + general |
| `>` | `commands` | Actions, toggles, créations, settings, commandes utilisateur |
| `#` | `sif` | SIFs, notes, PDF, images workspace, fichiers `.PRISM` |
| `@` | `symbols` | Composants de la SIF courante + templates Library |
| `?` | `help` | Modes, raccourcis, aide des commandes, chapitres de documentation |

Les badges et placeholders de chaque mode sont dans `i18n/shell.ts → commandPalette.modes.badges/placeholders`.
Les **couleurs** (blue/green/amber/violet) sont dans `modes.ts → MODE_COLORS` — intentionnellement distinctes du token `TEAL`.

---

## Comment ouvrir la palette par le code

```ts
import { openPalette, togglePalette } from '@/components/layout/command-palette'

openPalette()         // ouvre vide
openPalette('>')      // ouvre en mode commandes
openPalette('#sif-1') // ouvre en mode SIF avec query pré-remplie
togglePalette()       // toggle (utilisé par le raccourci Cmd+K)
```

Ces fonctions dispatch des custom events DOM (`prism:palette:open`, `prism:palette:toggle`) — pas de couplage direct avec React.

---

## Ajouter une commande au registre

1. Choisir le fichier cible : `paletteCommands.ts` (palette), `navigationCommands.ts` (navigation), `layoutCommands.ts` (layout).
2. Ajouter un objet `RegisteredCommand` dans le tableau `XXX_COMMANDS` :

```ts
{
  id: 'my.command',                // ID unique, notation dot
  paletteGroup: 'general',         // 'general' | 'layout' | 'palette' (groupe dans la palette)
  execute: () => { /* action */ }, // appelé par raccourci clavier OU palette

  // Optionnel — raccourci clavier
  shortcut: {
    id: 'my.command',
    commandEn: 'My Command',
    commandFr: 'Ma commande',
    category: 'general',           // 'general' | 'layout' | 'palette' | 'navigation'
    when: 'global',                // 'global' | 'not editing'
    skipEditable: false,
    defaultKeybinding: 'Ctrl+Shift+M',
  },

  // Optionnel — entrée dans la palette
  buildPaletteItem: (ctx) => ({
    id: 'my.command',
    label: ctx.strings.commandPalette.labels.myCommand,
    keywords: 'my command keywords',
    Icon: SomeIcon,
    onSelect: () => execute(),     // réutiliser execute() directement (évite les circulaires)
    isActive: false,
    shortcut: ctx.getShortcut('my.command'),
    level: 0,
  }),
}
```

> **Important** : dans `buildPaletteItem.onSelect`, appeler la fonction `execute` nommée localement — **ne pas** appeler `executeRegisteredCommand('my.command')` (dépendance circulaire avec `index.ts`).

3. La commande est automatiquement disponible dans la palette et dans `useGlobalShortcuts` sans aucune autre modification.

---

## Ajouter un groupe de commandes personnalisé

Si les commandes n'entrent dans aucune catégorie existante, créer un nouveau fichier `xxxCommands.ts` avec le même pattern que `navigationCommands.ts`, puis l'importer dans `registry/index.ts` :

```ts
import { XXX_COMMANDS } from './xxxCommands'
const commandRegistry: RegisteredCommand[] = [
  ...PALETTE_COMMANDS,
  ...NAVIGATION_COMMANDS,
  ...LAYOUT_COMMANDS,
  ...XXX_COMMANDS,   // ajouter ici
]
```

---

## Ajouter un groupe de navigation dans `useCommandGroups`

Les groupes "métier" (SIFs, workspace, create, etc.) vivent dans `useCommandGroups.ts`.
Ajouter un nouveau groupe :

```ts
const myGroup: CommandGroup = {
  heading: strings.commandPalette.groups.myGroup, // toujours i18n, jamais hardcodé
  items: [...],
}
```

Puis l'insérer dans `rawGroups` selon le(s) mode(s) concerné(s).

> **Règle absolue** : tous les `heading` de groupe passent par `strings.commandPalette.groups.*`.
> Ne jamais hardcoder `'Library'`, `'Workspace'`, etc.

---

## Ajouter une chaîne i18n pour la palette

Toutes les chaînes de la palette sont dans :
- **Type** : `src/i18n/shell.ts` → `ShellStrings.commandPalette`
- **EN** : `src/i18n/locales/en/shell.ts`
- **FR** : `src/i18n/locales/fr/shell.ts`

Sections disponibles : `groups`, `labels`, `meta`, `modes.badges`, `modes.placeholders`, `modes.noResultsByMode`.

---

## Niveau d'indentation des items (`level`)

`CommandItem.level?: 0 | 1` — utilisé principalement dans le mode `?` (help) pour indenter les sous-blocs de documentation sous leur chapitre parent.

- `level: 0` (défaut) → rendu normal `px-3`
- `level: 1` → indent `pl-8 pr-3` dans le rendu `CommandPalette.tsx`

---

## Comportements clés

- **Fermeture automatique** : toute action exécutée via `run()` ferme la palette. Les items qui changent de mode (ex: `setSearch('>')`) appellent `setSearch` directement et **ne passent pas par `run()`** — la palette reste ouverte.
- **Debounce** : la recherche est debounced à 150ms dans `useCommandGroups` pour éviter les filtres trop fréquents.
- **Conflits keybindings** : détectés visuellement dans `KeyboardShortcutsSettings` via `conflictMap`.
- **Position** : `top` (sous le header) ou `center` (centré, Spotlight-style) — préférence dans `appPreferences.commandPalettePosition`.

---

## Ce qu'on ne fait PAS

- Pas de focus trap — la palette n'est pas une dialog modale bloquante.
- Pas de sous-menus ou navigation hiérarchique — flat list, filtrage textuel uniquement.
- Pas de custom events dans les commandes — uniquement `openPalette` / `togglePalette` pour l'ouverture.
