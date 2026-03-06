# Audit Frontend - PRISM

Date: 2026-03-06  
Perimetre: `/home/user/safeloop/front`  
Mode: audit uniquement, aucune modification du code applicatif

## Resume executif

Le frontend fonctionne partiellement, mais la base de code est actuellement fragile:

- Build/typecheck casses par une erreur de syntaxe.
- Incoherences structurelles store/navigation/theme.
- Beaucoup de code mort (composants, UI primitives, typings dupliques).
- Tooling qualite incomplet (pas de script lint, ESLint ne couvre pas TS/TSX).
- Plusieurs fichiers monolithiques tres longs, difficiles a maintenir.

## Verifications executees

- `npm run lint`  
Resultat: echec, script manquant.

- `npm run type-check`  
Resultat: echec sur erreur syntaxe `src/components/modals/ProjectModal.tsx` ligne 46+.

- `npm run build`  
Resultat: meme echec bloquant que le type-check.

## Findings (ordonnes par severite)

### 1) CRITIQUE - Erreur syntaxe bloquante dans une modale

- Fichier: `/home/user/safeloop/front/src/components/modals/ProjectModal.tsx:46`
- Probleme: apostrophe non echappee dans une string (`d'etude`) qui casse le parsing TSX.
- Impact: `tsc` et `vite build` s'arretent immediatement.

FIXE le 06/03

### 2) CRITIQUE - Incoherence du modele de navigation

- Declaration: `/home/user/safeloop/front/src/store/appStore.ts:27`
  - `AppView` contient `projects` et `sif-dashboard`.
- Utilisation invalide:
  - `/home/user/safeloop/front/src/components/layout/AppHeader.tsx:63`
  - `/home/user/safeloop/front/src/components/layout/CommandPalette.tsx:40`
  - Ces fichiers utilisent `view.type === 'sif-list'`, absent de `AppView`.
- Impact: erreurs TypeScript masquees par l'erreur syntaxe courante.

### 3) CRITIQUE - Incoherence Theme Store <-> UI

- CommandPalette lit `theme` string + `setTheme('light'|'dark'|'system')`:
  - `/home/user/safeloop/front/src/components/layout/CommandPalette.tsx:17`
  - `/home/user/safeloop/front/src/components/layout/CommandPalette.tsx:81`
- Store expose `isDark: boolean` + `setTheme(isDark: boolean)`:
  - `/home/user/safeloop/front/src/store/appStore.ts:58`
- Impact: API store et UI incompatibles, dette fonctionnelle et typage.

### 4) HAUT - Tooling qualite incomplet

- `package.json` sans script `lint`:
  - `/home/user/safeloop/front/package.json:6`
- ESLint configure seulement `**/*.{js,jsx}`:
  - `/home/user/safeloop/front/eslint.config.js:10`
- Impact: le coeur du projet (`.ts/.tsx`) n'est pas controle par ESLint.

### 5) HAUT - Duplication d'un composant critique (ProjectModal)

- Version utilisee:
  - `/home/user/safeloop/front/src/components/projects/ProjectModal.tsx`
- Version dupliquee/cassee/non importee:
  - `/home/user/safeloop/front/src/components/modals/ProjectModal.tsx`
- Reference active dans App:
  - `/home/user/safeloop/front/src/App.tsx:15`
- Impact: divergence de logique, confusion, risque de regressions.

### 6) HAUT - Composants metier orphelins (code mort)

Aucun import detecte dans `src` pour:

- `/home/user/safeloop/front/src/components/architecture/ArchitectureBuilder.tsx`
- `/home/user/safeloop/front/src/components/architecture/SIFChainDiagram.tsx`
- `/home/user/safeloop/front/src/components/projects/ProjectHazopDialog.tsx`

Impact: surface de maintenance inutile, bruit, dette cognitive.

### 7) MOYEN - UI primitives non utilisees

Imports internes detectes: 0 pour:

- `/home/user/safeloop/front/src/components/ui/alert-dialog.tsx`
- `/home/user/safeloop/front/src/components/ui/radio-group.tsx`
- `/home/user/safeloop/front/src/components/ui/slider.tsx`
- `/home/user/safeloop/front/src/components/ui/tabs.tsx`

Impact: fichiers + dependances inutiles, alourdissement du projet.

### 8) MOYEN - Typings dupliques

Definitions `.d.ts` en double dans:

- `/home/user/safeloop/front/types/*`
- `/home/user/safeloop/front/src/core/types/*`

Exemple:

- `/home/user/safeloop/front/types/jspdf/index.d.ts`
- `/home/user/safeloop/front/src/core/types/jspdf/index.d.ts`

Impact: ambiguite, risque de desynchronisation.

### 9) MOYEN - Garde-fous TS desactives

- `/home/user/safeloop/front/tsconfig.json:15`
  - `noUnusedLocals: false`
  - `noUnusedParameters: false`

Impact: laisse passer beaucoup de code mort et incoherences.

### 10) MOYEN - Etat/selecteurs store partiellement morts

- `isSyncing` declare mais pas exploite reellement:
  - `/home/user/safeloop/front/src/store/appStore.ts:40`
- Selecteurs exportes sans usage detecte:
  - `selectProject`
  - `selectCurrentSIF`
  - dans `/home/user/safeloop/front/src/store/appStore.ts:116`

Impact: API store gonflee et peu lisible.

### 11) FAIBLE - Fichiers obsolete/template

- `/home/user/safeloop/front/src/App.css` (vide)
- `/home/user/safeloop/front/src/styles/globals.css` (placeholder)
- `/home/user/safeloop/front/src/assets/react.svg` (asset template)

Impact: bruit projet.

### 12) FAIBLE - Monolithes a fort risque de maintenance

Fichiers tres longs:

- `/home/user/safeloop/front/src/components/prooftest/ProofTestTab.tsx` (~939 lignes)
- `/home/user/safeloop/front/src/components/layout/SIFWorkbenchLayout.tsx` (~896 lignes)
- `/home/user/safeloop/front/src/components/architecture/ArchitectureBuilder.tsx` (~845 lignes)
- `/home/user/safeloop/front/src/components/report/SILReportStudio.tsx` (~805 lignes)

Impact: regression facile, onboarding difficile, refactor couteux.

## Points techniques additionnels releves

- Usage frequent de `any` / `as any` (UI charts, architecture, db mappers, etc.).
- `src/core/models/architectures.ts` semble orphelin (re-export non consomme).
- Plusieurs TODO de fait remplaces par logs (`console.log('Import...')`) dans CommandPalette.

## Recommandation de remediation (ordre pragmatique)

### Phase 1 - Stabilisation build/type (priorite immediate)

1. Corriger la syntaxe cassante dans `components/modals/ProjectModal.tsx` (ou supprimer le doublon mort).
2. Re-aligner `AppView` et les usages (`sif-list` vs `projects`/`sif-dashboard`).
3. Re-aligner l'API theme (`isDark` booleen ou vrai enum theme, mais coherent partout).
4. Ajouter scripts:
   - `lint`
   - `type-check`
   - `check` (lint + type-check + build optionnel)

### Phase 2 - Nettoyage code mort

1. Supprimer/archiver les composants orphelins.
2. Supprimer les UI primitives non utilisees + dependances associees si confirme.
3. Eliminer les doublons de typings (`types/` vs `src/core/types/`).
4. Supprimer les assets/fichiers placeholders inutiles.

### Phase 3 - Refactor structurel

1. Decouper les monolithes en sous-composants modules.
2. Introduire des boundaries claires:
   - `features/*`
   - `shared/ui/*`
   - `shared/lib/*`
3. Reduire les `any` et typer les adapters DB.
4. Activer progressivement:
   - `noUnusedLocals`
   - `noUnusedParameters`
   - regles ESLint TS strictes.

## Risques si rien n'est fait

- Regressions frequentes et difficiles a localiser.
- Cout de maintenance en hausse continue.
- Dettes de structure qui bloquent les evolutions produit.
- Faux sentiment de stabilite: l'app "tourne", mais l'integrite compile/type est compromise.

## Conclusion

Le probleme principal n'est pas seulement du "rangement", mais une dette structurelle combinee a des incoherences de modele (navigation/theme) et a un outillage qualite incomplet.  
Le plan en 3 phases ci-dessus permet de recuperer rapidement de la fiabilite sans re-ecriture totale.
