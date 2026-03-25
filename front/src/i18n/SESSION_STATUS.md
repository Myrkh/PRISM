# i18n Session Status

Last update: 2026-03-25

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
- `library`
- `audit`
- `engine`
- `sifContext`
- `sifOverview`
- `sifVerification`
- `sifExploitation`

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

## Important Caveat

Proof Test is no longer the next i18n blocker.

The next high-value slice is now `Report`.

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
