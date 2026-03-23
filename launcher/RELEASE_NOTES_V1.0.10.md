# PRISM Launcher v1.0.10

## Corrections
- Fix build CI : résolution TypeScript de `react` et `lucide-react` redirigée vers `@types/react` dans `tsconfig.json` — corrige l'erreur `Cannot find module 'react'` lors du build sur GitHub Actions (regression introduite en v1.0.9 avec la fenêtre Documentation)
