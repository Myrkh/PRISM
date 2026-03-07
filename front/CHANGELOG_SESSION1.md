# PRISM — Refactoring Session 1 : Changelog

**Date** : 6 mars 2026  
**Status** : Session 1 terminée (Nettoyage + Types + Tokens + Extractions)

---

## Résumé des changements

| Métrique | Avant | Après | Delta |
|----------|-------|-------|-------|
| Fichiers source | 61 | 62 | +1 (dead removed, modules added) |
| Lignes de code | ~15 612 | ~14 510 | **-1 102** |
| Code mort | ~2 297L | 0L | **-100%** |
| Design token duplications | ~12 fichiers | 1 fichier central | **-92%** |
| Duplicate type defs | 3 interfaces | 0 | **Fixed** |
| @ts-nocheck files | 1 | 0 | **Fixed** |

---

## Fichiers supprimés (code mort)

- `src/components/architecture/ArchitectureBuilder.tsx` (845L) — Library custom extraite avant suppression
- `src/components/architecture/SIFChainDiagram.tsx` (417L)
- `src/components/projects/ProjectHazopDialog.tsx` (590L)
- `src/components/modals/ProjectModal.tsx` (443L) — doublon
- `src/core/models/architectures.ts` (2L) — re-export inutile

## Nouveaux modules créés

- `src/styles/tokens.ts` — Design system centralisé (dark/light tokens, brand colors, status colors)
- `src/features/library/catalogTypes.ts` — Types bibliothèque composants
- `src/features/library/builtinCatalog.ts` — Catalogue unifié (exida SERH + OREDA)
- `src/features/library/index.ts` — Barrel export
- `src/shared/ConfirmDialog.tsx` — Dialog de confirmation + hook `useConfirmDialog()`
- `src/components/layout/IntercalaireTabBar.tsx` — Tab bar + card extraits de SIFWorkbenchLayout

## Fichiers modifiés

- `src/core/types/index.ts` — Duplicate `CampaignVerdict`, `StepResult`, `TestCampaign` fusionnés ; dead comment supprimé
- `src/components/architecture/LoopEditorFlow.tsx` — `@ts-nocheck` retiré + types ReactFlow ajoutés
- `src/components/architecture/LoopEditorRightPanel.tsx` — `LIBRARY_ITEMS` → import `LIBRARY_CATALOG`
- `src/components/layout/SIFWorkbenchLayout.tsx` — Import ConfirmDialog + IntercalaireTabBar (1086L → 970L)
- **12 fichiers** — Design tokens migrés vers `@/styles/tokens`

## Bugs corrigés en passant

1. **Types StepResult incompatibles** — La 2ème définition (avec `done: boolean` et `result: 'pass'|'fail'`) écrasait silencieusement la 1ère. Les composants utilisaient `'oui'|'non'|'na'` + `conformant`. Fusionné correctement.
2. **Types TestCampaign incompatibles** — Champs `processLoad`, `sifResponseTimeMs`, `valveReactionTimeMs` rendus optionnels (pas utilisés dans le code actif).
3. **ReactFlow `any` types** — `SubsystemNode` et `AnimatedEdge` typés avec `NodeProps<SubsystemNodeData>` et `EdgeProps<AnimatedEdgeData>`.

---

## Session 2 (à venir) — Store + Layout splits

| Tâche | Fichier | Lignes actuelles |
|-------|---------|-----------------|
| Extraire HomeScreen | SIFWorkbenchLayout.tsx | ~300L à extraire |
| Extraire ProjectTree | SIFWorkbenchLayout.tsx | ~220L à extraire |
| Extraire IconRail | SIFWorkbenchLayout.tsx | ~50L à extraire |
| Éclater appStore en slices | appStore.ts | 637L → ~6 fichiers |
| Éclater SIFDashboard en tabs | SIFDashboard.tsx | 603L → ~4 fichiers |
| Éclater ProofTestTab | ProofTestTab.tsx | 987L → ~4 fichiers |

---

# Session 2 : Layout Split + Shared Components

**Date** : 6 mars 2026

## Résumé

| Composant | Avant | Après |
|-----------|-------|-------|
| `SIFWorkbenchLayout.tsx` | **1 086 lignes** (après S1: 970L) | **279 lignes** |
| Fichiers layout/ | 5 | 8 |
| Fichiers shared/ | 2 (SILBadge, SILGauge) | 4 (+ConfirmDialog, StatusIcon) |

## Fichiers créés

- `src/components/layout/IconRail.tsx` (96L) — Barre d'icônes navigation + actions
- `src/components/layout/ProjectTree.tsx` (228L) — Arborescence client→projet→SIF (left panel)
- `src/components/layout/HomeScreen.tsx` (332L) — Page d'accueil avec liste projets/SIFs + actions CRUD
- `src/shared/StatusIcon.tsx` (12L) — Icône pass/fail réutilisable

## Améliorations

- **HomeScreen** utilise désormais le hook `useConfirmDialog()` au lieu d'un state inline de 15 lignes
- **HomeScreen** utilise `statusColors` et `statusLabels` centralisés depuis `tokens.ts`
- **HomeScreen** a un composant `MenuBtn` interne qui élimine la duplication des 10+ boutons de menu contextuel
- **SIFWorkbenchLayout** est maintenant un pur orchestrateur de layout (grille CSS + slots)

## God Components restants (session suivante)

| Fichier | Lignes | Plan |
|---------|--------|------|
| `ProofTestTab.tsx` | 987L | → ProcedureEditor + CampaignExecutor + StepRow |
| `SILReportStudio.tsx` | 805L | → ReportBuilder + PDFRenderer |
| `ComponentParamsSheet.tsx` | 661L | → FactorizedForm + DevelopedForm + TestForm + AdvancedForm |
| `SIFModal.tsx` | 642L | → SIFFormFields + HAZOPSection |
| `appStore.ts` | 637L | → slices (navigation, ui, project, sif, prooftest, revision) |
| `SIFDashboard.tsx` | 603L | → OverviewTab + ComplianceTab (archi/analysis/report déjà séparés) |
