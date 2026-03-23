# components/sif/ — Workbench SIF (cœur métier)

## Phases IEC 61511 → Composants

```
SIFDashboard.tsx          ← Container principal, gère le routing entre phases
│
├── cockpit   → OverviewTab.tsx          + CockpitRightPanel.tsx
├── context   → ContextTab.tsx           + ContextRightPanel.tsx
├── architecture → ArchitectureWorkspace.tsx + LoopEditorRightPanel.tsx (dans components/architecture/)
├── verification → VerificationWorkspace.tsx + VerificationRightPanel.tsx
├── exploitation → ExploitationWorkspace.tsx + ProofTestRightPanel.tsx (dans components/prooftest/)
└── report    → SILReportStudio.tsx      + ReportConfigPanel.tsx (dans components/report/)
```

## Fichiers utilitaires (logique métier, pas UI)

| Fichier | Rôle |
|---------|------|
| `complianceCalc.ts` | Calculs de conformité IEC 61511 |
| `overviewMetrics.ts` | Métriques résumées pour le Cockpit |
| `overviewUi.ts` | Helpers d'affichage (couleurs SIL, labels) |

## Composants transversaux

| Composant | Rôle |
|-----------|------|
| `SIFPhaseHeader.tsx` | Micro-hint 1 ligne (contexte phase courante) |
| `SIFVerdictBanner.tsx` | Bandeau verdict SIL (conforme / non conforme) |
| `SIFModal.tsx` | Dialog création / édition SIF |
| `RevisionLockedOverlay.tsx` | Overlay si révision clôturée |
| `RevisionCloseDialog.tsx` | Dialog de clôture de révision |
| `SIFRevisionHistoryLedger.tsx` | Historique des révisions |

## Règles UX
- `SIFPhaseHeader` = 1 ligne max, pas de grande card
- Navigation entre phases = `SIFLifecycleBar` dans `EditorTabBar.tsx`, pas de boutons dans les tabs
- Settings (mission time, MTTR) = dans le RightPanel, jamais dans le contenu principal
