# PRISM Launcher — Claude Rules

Lire ce fichier avant toute modification. Vérifier chaque point avant de proposer ou soumettre du code.

---

## 1. Desktop-first, pas Web

- La TitleBar est une **barre de titre Windows native**. Pas de `border-bottom`, pas de `box-shadow` séparateur. Le contenu commence naturellement en dessous. Elle partage le même `background` que le LeftPanel. Les seuls éléments visuels sont les boutons de contrôle fenêtre (minimize/maximize/close).
- Penser en fenêtre Electron frameless, pas en header de page web.
- Pas de `position: sticky`, pas de `z-index` pour des headers — tout est dans un layout flex colonne.

## 2. Cohérence des composants

- **Avant d'ajouter** un style inline (ex: `boxShadow`, `background`), vérifier s'il existe une classe CSS utilitaire dans `index.css` (ex: `.card`). Si oui, utiliser la classe.
- **Avant de créer** un nouveau composant, vérifier s'il en existe déjà un équivalent dans le projet.
- **Avant de modifier** un style sur un seul composant, vérifier si le même style existe dupliqué ailleurs et le centraliser si c'est le cas.
- Toute card avec `rounded-xl border` doit avoir la classe `.card` (relief uniforme).

## 3. Pas de redondance fonctionnelle

- Vérifier que chaque information n'est affichée qu'**une seule fois** dans l'interface.
- Exemples de redondances interdites :
  - Statut moteur : présent dans le LeftPanel (status card) ET le FooterBar. Pas dans HomeView activity column aussi.
  - Copyright : dans FooterBar uniquement, pas dans LeftPanel.
  - Raccourci Ctrl+L : dans LauncherShell (keydown handler). Pas de hint visuel supplémentaire.
- Quand une info est déplacée (ex: copyright vers FooterBar), **supprimer** l'ancienne occurrence.

## 4. Imports — tolérance zéro sur les inutilisés

- Après chaque modification, vérifier que tous les imports sont utilisés.
- Supprimer immédiatement tout import inutilisé (`useEffect`, `useState`, icônes, composants).
- `npm run build` doit passer sans warnings TypeScript.

## 5. i18n

- Aucune string UI hardcodée en français ou anglais dans les composants — tout passe par `useLocaleStrings(getLauncherStrings)`.
- Exception tolérée : données mockées (SIFS, ACTIVITY, MODULES, RELEASES) qui sont du contenu, pas de l'UI.
- Tout nouveau texte UI doit être ajouté dans `src/i18n/launcher.ts` (interface) + `locales/fr/launcher.ts` + `locales/en/launcher.ts`.

## 6. Relief et design tokens

- Couleurs : toujours via `colors`, `semantic`, `alpha()` de `../tokens`. Jamais de valeurs hex brutes dans les composants (sauf le noir `#041014` du texte sur bouton teal).
- Pas de Tailwind `bg-*`, `text-*`, `border-*` avec des couleurs — uniquement `style={{ ... }}` avec les tokens.
- Effets de relief : classe `.card` dans `index.css`. Pour les boutons primaires (launch), `boxShadow` inline spécifique est acceptable.
- Boutons : toujours `active:scale-[0.97]` ou `active:translate-y-px` pour le press physique.

## 7. Structure du layout

```
App
└── LauncherShell
    ├── TitleBar (h-8, drag, Windows native — aucun séparateur)
    ├── [flex-1 flex row]
    │   ├── LeftPanel (w-220px, UserCard en haut, status, launch)
    │   └── [flex-1 flex col]
    │       ├── TopNav (h-10, tabs de navigation)
    │       └── [content view, flex-1]
    └── FooterBar (h-6, pleine largeur — statut moteur + copyright + version)
```

- FooterBar = seul endroit pour copyright, version, statut moteur global.
- LeftPanel = statut moteur détaillé (engine/db/port) — complément technique, pas redondant.
- UserCard = tout en haut du LeftPanel (en-tête du panneau).

## 8. Checklist avant build

- [ ] Aucun import inutilisé
- [ ] Aucune string UI hardcodée (hors données mock)
- [ ] Aucune info dupliquée entre composants
- [ ] Toute nouvelle card utilise `.card`
- [ ] `npm run build` passe sans erreur
- [ ] La TitleBar n'a pas de bordure inférieure
- [ ] Le FooterBar est pleine largeur dans LauncherShell
