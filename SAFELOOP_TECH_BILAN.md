# SafeLoop Technical Bilan

Date: 2026-03-08

## Scope

This bil an counts only the application source under:

- `front/src`
- `backend`

Excluded on purpose:

- `node_modules`
- build outputs
- lockfiles
- Supabase migrations
- non-code repo files outside `front/src` and `backend`

Counting rule:

- `all files` = every file found in `front/src` and `backend`
- `code files` = `.ts`, `.tsx`, `.py`, `.css`, `.d.ts`
- backend tests are included because they are part of the maintained codebase

## Current Size

### Global

| Metric | Value |
| --- | ---: |
| All files in scope | 141 |
| Code files | 139 |
| Total code lines | 31,297 |

### By Area

| Area | Code files | Code lines |
| --- | ---: | ---: |
| Frontend (`front/src`) | 126 | 28,031 |
| Backend (`backend`) | 13 | 3,266 |

Approximate split:

- Frontend: ~89.6% of total code
- Backend: ~10.4% of total code

### By Extension

| Extension | Files | Lines |
| --- | ---: | ---: |
| `.tsx` | 69 | 19,044 |
| `.ts` | 48 | 8,862 |
| `.py` | 13 | 3,266 |
| `.css` | 3 | 90 |
| `.d.ts` | 6 | 35 |

## Largest Files

These are the current size hotspots and the most likely refactor pressure points:

| Lines | File |
| ---: | --- |
| 1,227 | `front/src/components/global/HazopWorkspace.tsx` |
| 1,070 | `front/src/components/architecture/LoopEditorFlow.tsx` |
| 871 | `front/src/store/appStore.ts` |
| 808 | `front/src/core/math/pfdCalc.ts` |
| 781 | `front/src/components/prooftest/proofTestPdf.tsx` |
| 769 | `front/src/components/architecture/ComponentParamsPanel.tsx` |
| 769 | `front/src/components/sif/ComplianceRightPanel.tsx` |
| 756 | `front/src/components/global/SIFHistoryWorkspace.tsx` |
| 662 | `front/src/components/parameters/ComponentParamsSheet.tsx` |
| 653 | `front/src/components/layout/CommandPalette.tsx` |
| 649 | `backend/solver/extensions.py` |
| 647 | `front/src/components/sif/SIFModal.tsx` |
| 647 | `backend/main.py` |

## Current Architecture Reading

### What is already strong

- The product is not just a calculator. It already spans design, architecture, compliance, proof test, reports, revisions, and history.
- The frontend is rich enough to support a real engineering workflow, not only form entry.
- The system already has a strong documentary spine:
  - revision locking
  - report PDF publication
  - proof test campaign archival
  - explicit assumptions and compliance evidence
- The dual-engine strategy is sound:
  - TypeScript engine for reactive editing and immediate feedback
  - Python backend for special cases, deeper solver modes, and authoritative advanced runs
- The backend already exposes more scientific depth than a simple "calculator API":
  - Markov
  - Monte Carlo
  - STR
  - PFH corrected
  - KooN generalized
  - MGL CCF
  - architectural constraints
  - demand duration

### What is still structurally fragile

- Some frontend files are still too large for long-term maintainability.
- The global type-check is not yet clean.
- The Python backend is not yet wired into the frontend workflow.
- Backend async jobs are still stored in memory, which is fine for development but not for production scale.
- There is still a gap between:
  - a solver API
  - and a full product-grade run orchestration layer with durable jobs, artifacts, and comparisons

## Honest Product Comparison

This section is intentionally category-based, not marketing-driven.

### Versus spreadsheet-based safety calculations

SafeLoop is already materially stronger on:

- traceability
- revision control
- integrated proof test history
- report generation
- explicit assumptions and governance

If executed well, this is a major advantage over Excel-driven SIS practices.

### Versus generic EHS / compliance software

SafeLoop is stronger on technical depth and engineering relevance:

- real SIL/PFD/PFH logic
- loop-level modeling
- proof test and revision evidence linked to the SIF lifecycle

Generic suites are usually stronger on:

- enterprise admin
- identity and permissions
- broad workflow coverage
- integrations

### Versus niche reliability / safety analysis tools

Today, specialized tools may still be ahead on:

- solver maturity breadth
- industrial validation history
- edge-case coverage
- qualification pedigree

But SafeLoop has a strong differentiator if maintained correctly:

- one continuous workflow from design to governance to proof test evidence
- less black-box UX potential than many solver-heavy tools
- more product coherence than isolated technical calculators

## Black Box Risk

### Current position

The frontend is not a pure black box:

- assumptions are visible
- compliance logic is exposed
- revision artifacts are explicit
- proof test evidence is retained

This is a strong strategic position.

### Future risk

The Python backend can become a black box if it only returns top-line numbers.

To avoid that, every advanced run should expose:

- input payload snapshot
- engine version
- mode used
- warnings
- convergence metadata
- comparison against TypeScript live output
- durable artifacts

The `Engine` workspace is the right place to make that visible.

## Scalability Reading

### Functional scalability

The product can scale in scope if the current hotspots are refactored gradually.

Priority pressure points:

- `HazopWorkspace`
- `LoopEditorFlow`
- `appStore`
- `pfdCalc`
- large right panels

### Technical scalability

The backend can scale well if the next production steps are added:

- durable job store
- queue / worker model
- persisted outputs
- structured run artifacts
- health / observability
- authentication and authorization boundary

### Organizational scalability

The app has good long-term potential because it is building a coherent engineering system, not a pile of disconnected screens.

That matters a lot for product durability.

## Size Outlook For Official Launch

These are directional estimates, not promises.

### Plausible "official launch" size

If the product keeps its current scope and reaches a strong first commercial release, a realistic range would be:

- 180 to 240 code files
- 45k to 65k lines of code

This assumes adding:

- backend integration layer
- run orchestration
- auth / roles
- stronger validation / error handling
- API clients
- monitoring and operational hardening
- more tests

### Plausible "launch + certification-grade evidence" size

If the goal is a truly serious regulated-grade release with qualification evidence, auditability, reproducibility, and validation packs, a realistic range would be:

- 260 to 380 code files
- 70k to 110k lines of code

This assumes adding:

- stronger automated verification suites
- reference datasets and solver validation packs
- traceability around requirements and model assumptions
- versioned backend run artifacts
- qualification documentation support
- explainability around advanced methods
- stronger deployment, permissions, and audit infrastructure

This is not bloat. In this domain, a lot of that size is governance and evidence, not only features.

## Major Strengths

- Strong lifecycle coherence across the SIF process
- Already meaningful documentary and audit spine
- Clear potential for a non-black-box engineering product
- Good product depth for a relatively compact codebase
- Smart architecture direction with TS for reactivity and Python for advanced runs
- High upside if solver transparency and run evidence are done well

## Major Risks

- Large UI hotspots can slow maintainability
- TypeScript hygiene is not yet fully clean
- Backend orchestration is not production-ready yet
- Advanced solver integration can become opaque if not surfaced correctly
- Certification ambition will require much more validation and evidence than the current repo size suggests

## Recommendation

The project is already beyond a prototype. It is not yet "certification-grade", but it has strong product DNA and serious technical potential.

The most important next moves are:

1. Keep the frontend TypeScript engine as the reactive default path.
2. Use the Python backend only for advanced or exceptional cases.
3. Add a strict, explicit run contract between frontend and backend.
4. Persist backend jobs and outputs durably.
5. Make TS vs Python comparison visible to avoid black-box behavior.
6. Continue refactoring the biggest frontend hotspots before they compound.

If those are executed well, SafeLoop can become a very strong specialized engineering platform rather than just another safety calculation tool.
