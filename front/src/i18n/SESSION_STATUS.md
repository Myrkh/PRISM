# i18n Session Status

Last update: 2026-03-26

This file is a working handoff for the current FR/EN migration.
Goal: keep the next session focused on the next untranslated slice, without having to rediscover what is already done.

## Strategy In Place

- Current implementation is a lightweight in-house i18n layer.
- Structure is namespace-based and intentionally migrable later to a library such as `i18next`.
- Preferred organization:
  - `front/src/i18n/<domain>.ts`
  - `front/src/i18n/locales/fr/<domain>.ts`
  - `front/src/i18n/locales/en/<domain>.ts`
- Pattern used in screens:
  - `get<Domain>Strings(...)`
  - `useLocaleStrings(...)`

## Already Migrated

Global / shell:

- `Settings`
- `IconRail`
- `AppHeader`
- `CommandPalette`
- `Search`
- `Planning`
- `Library`
- `Docs`
- `Audit Log`
- `Engine`

SIF views:

- `Context`
- `Overview / Cockpit`
- `Verification`
- `Exploitation / Proof Test` UI + PDF + default procedure content

Main namespaces already present:

- `settings`
- `shell`
- `search`
- `planning`
- `library`
- `audit`
- `engine`
- `sifContext`
- `sifOverview`
- `sifVerification`
- `sifExploitation`
- `sifWorkflow`
- `sifCompliance`
- `sifOverviewPanel`
- `sifModal`

## Global Screens: Current Real Status

A residual translation pass was completed on the requested global screens:

- `Engine`
- `Planning`
- `Library`
- `Audit Log`
- `Search`

This pass focused only on visible i18n coverage, with no business-logic changes:

- left / center / right panel labels
- helper badges and status copy
- placeholders and empty states
- FR locale leftovers still surfacing in global workspaces

Validation at the end of this pass:

- `npm run type-check` passes in `front/`

## Exploitation / Proof Test: Current Real Status

The Proof Test slice is now localized end-to-end:

- visible UI
- PDF export shell
- generated Proof Test PDF document body
- default generated procedure content from `defaultProcedure(...)`
- related export notifications

Files updated in this completion pass:

- `front/src/components/prooftest/proofTestPdf.tsx`
- `front/src/components/prooftest/proofTestTypes.ts`
- `front/src/components/prooftest/ProofTestPDFExport.tsx`
- `front/src/components/prooftest/proofTestI18n.ts`
- `front/src/components/prooftest/ProofTestTab.tsx`
- `front/src/i18n/sifExploitation.ts`
- `front/src/i18n/locales/fr/sifExploitation.ts`
- `front/src/i18n/locales/en/sifExploitation.ts`

Validation:

- `npm run type-check` was passing in `front/` at the end of the session.

## SIF Workflow: Current Real Status

A larger workflow pass was completed on the visible SIF flow, still without logic changes:

- lifecycle bar / workbench bar
- breadcrumb
- project tree child workflow entries + context menus
- project sidebar action tooltips and pinned/project section labels
- lifecycle cockpit + cockpit right panel
- context workspace timing / safe-state labels
- context right panel
- overview right panel
- verification workspace
- compliance center tab + compliance right panel
- SIF create/edit modal
- revision close dialog
- locked-revision overlay

Main workflow namespaces added or extended in this pass:

- `shell`
- `sifWorkflow`
- `sifCompliance`
- `sifOverviewPanel`
- `sifModal`
- `sifContext`
- `sifOverview`
- `sifVerification`

Representative files updated in this completion pass:

- `front/src/components/layout/EditorTabBar.tsx`
- `front/src/components/layout/EditorBreadcrumb.tsx`
- `front/src/components/layout/ProjectTree.tsx`
- `front/src/components/layout/ProjectSidebar.tsx`
- `front/src/components/layout/SIFWorkbenchLayout.tsx`
- `front/src/components/layout/LifecycleCockpit.tsx`
- `front/src/components/sif/CockpitRightPanel.tsx`
- `front/src/components/sif/ContextTab.tsx`
- `front/src/components/sif/ContextRightPanel.tsx`
- `front/src/components/sif/OverviewRightPanel.tsx`
- `front/src/components/sif/VerificationWorkspace.tsx`
- `front/src/components/sif/VerificationRightPanel.tsx`
- `front/src/components/sif/ComplianceTab.tsx`
- `front/src/components/sif/ComplianceRightPanel.tsx`
- `front/src/components/sif/SIFModal.tsx`
- `front/src/components/sif/RevisionCloseDialog.tsx`
- `front/src/components/sif/RevisionLockedOverlay.tsx`
- `front/src/components/sif/complianceUi.ts`
- `front/src/i18n/shell.ts`
- `front/src/i18n/sifWorkflow.ts`
- `front/src/i18n/sifCompliance.ts`
- `front/src/i18n/sifOverviewPanel.ts`
- `front/src/i18n/sifModal.ts`
- `front/src/i18n/sifContext.ts`
- `front/src/i18n/sifOverview.ts`
- `front/src/i18n/sifVerification.ts`

Validation:

- `npm run type-check` passes in `front/`.

Residual workflow-adjacent text still visible after this completion pass:

- report/export document labels in `front/src/components/report/silReportPdf.tsx`
- report/export document labels in `front/src/components/report/assumptionsPdf.tsx`

## Important Caveat

Proof Test is no longer the next i18n blocker.

The next full namespace slice is still `Report`. The visible SIF workflow shell/workspaces/modals pass is now effectively closed, and the remaining user-facing i18n debt is concentrated in report/export documents and later `Architecture` work.

## Best Next Steps

Recommended order:

1. Migrate `Report` UI
   - `SILReportStudio.tsx`
   - `ReportConfigPanel.tsx`
   - related small export shells

2. Migrate `Report` PDF/document text
   - `silReportPdf.tsx`
   - `assumptionsPdf.tsx`
   - any export-specific labels that remain hardcoded

3. Then decide between:
   - `Architecture`
   - remaining report/PDF documents in other slices

## Architecture Slice Warning

`Architecture` will be heavier than the previous slices because text is spread across:

- `ArchitectureWorkspace.tsx`
- `LoopEditorFlow.tsx`
- `LoopEditorRightPanel.tsx`
- `CCFBetaRightPanel.tsx`
- component parameter panels
- possibly library-adjacent surfaces

Do not start `Architecture` late in a session unless there is enough time to finish the namespace cleanly.

## Report Slice Warning

`Report` has two levels:

- shell / studio UI
- actual PDF document text

Good approach:

1. migrate the studio UI first
2. migrate the PDF document after that

## Hardcoded Text Audit Notes

When scanning for leftovers, expect false positives from:

- comments
- type names like `Verdict`
- status constants used as data, not UI

Priority should stay on:

- visible labels
- placeholders
- buttons
- section titles
- export dialogs
- PDF content

## Stable Commands

Useful validation command:

```bash
cd /home/user/safeloop/front
timeout 60s ./node_modules/.bin/tsc --noEmit --pretty false
```

Useful residual-string scan pattern:

```bash
cd /home/user/safeloop
rg -n "Aucun|Procédure|Historique|Mesures|Télécharger PDF|Imprimer|Génération" front/src/components
```

## Files To Open First Next Session

- `/home/user/safeloop/front/src/i18n/sifExploitation.ts`
- `/home/user/safeloop/front/src/components/prooftest/proofTestPdf.tsx`
- `/home/user/safeloop/front/src/components/prooftest/proofTestTypes.ts`
- `/home/user/safeloop/front/src/components/report/SILReportStudio.tsx`
- `/home/user/safeloop/front/src/components/report/ReportConfigPanel.tsx`

## Product Rule To Keep

During i18n migration:

- do not change business logic
- do not change calculations
- if a regression appears, it should ideally be limited to text, formatting, or a missing string key
