# KoboForge continuous improvement log

Last updated: 2026-08-09 (Cycle 44 across the projects workspace)

## Current state

- Branch: `main`; working tree was clean and aligned with `origin/main` at cycle start.
- Runtime: zero-build static site served from the repository root.
- Deployment version: `2026.08.09.2`.
- Baseline verification: `npm test` plus syntax checks for all runtime JavaScript.
- Current suites: logic contracts and document-fidelity fixtures.

## Latest cycle: remove the unreachable fixed-layout implementation

### Why this was selected

`resolvedEpubLayout()` always returned `reflowable`, yet the application retained fixed-page rendering, blob caching, alternate pagination, packaging, styles, and a dedicated fixture. Dependency tracing also showed that the remaining PDF complexity analyzer fed only that unreachable renderer; it did not influence reflowable reconstruction or diagnostics. The dead path increased startup code, PDF work, and cognitive load while its passing tests created false confidence in a removed capability.

### Changes

- Deleted the unused fixed-layout module and fixed EPUB fixture and removed the fixture from the default suite.
- Removed fixed-page render/cache/package functions, unreachable branches from preview, pagination, device retargeting, file processing, and page navigation, plus their CSS.
- Removed the per-page design-summary computation and output property that existed solely for the dead recommendation path; all actual PDF table, column, whitespace, font, image, and block-position detectors remain.
- Simplified the remaining preview/device logic to its single editable reflowable path.
- Added structural contracts requiring the deleted files to stay absent, rejecting fixed runtime/style branches, excluding the obsolete suite, and enforcing the `.epub` download path.
- Updated developer documentation and bumped the deployment version to `2026.08.09.2`.

### Verification and scores

- `npm test`: logic and document-fidelity suites passed (the new deletion contract failed before implementation).
- `node --check js/app.js js/document-fidelity.js js/version.js js/boot.js tools/*.mjs`: passed.
- `git diff --check`: passed.
- Correctness/reliability: 9/10 (preview, retargeting, page navigation, and export now have one reachable behavior).
- Verifiability: 8/10 (five negative/positive structural assertions enforce the reflowable-only boundary; an executable reflowable package fixture is still absent).
- Maintainability: 9/10 (nearly 900 lines of unreachable runtime, package, style, and test code were removed).
- Performance: 8/10 (startup drops one module import and PDF conversion no longer computes unused per-page recommendation signals).

### Lessons and process improvements

- Trace data products to their consumers before preserving a seemingly useful helper; the complexity result had no live consumer after fixed mode was removed.
- Tests for intentionally removed behavior are liabilities when they keep dead implementation and dependencies alive.
- A single-mode invariant should be represented by absence of alternate branches, not a constant selector surrounded by unreachable conditionals.

## Previous cycle

- Cycle 43 (`8739808`): aligned the hero and workflow with the reflowable-only product and added public-contract regression assertions.

## Prioritized opportunities

| Priority | Opportunity | Category | Impact | Effort / risk | Evidence / dependency |
|---|---|---|---|---|---|
| 1 | Run KoboForge tests in least-privilege GitHub Actions | Verifiability | High | Small / low | The full local suite passes but no workflow is present |
| 2 | Add an executable reflowable EPUB package fixture with optional EPUBCheck | Verification / correctness | High | Medium / medium | Export CSS is checked structurally, but the actual ZIP/package path is not exercised end-to-end |
| 3 | Add startup smoke coverage for CDN/library failure states | Reliability | Medium | Medium / low | `boot.js` covers app-module failure, while lazy conversion-library failure paths lack an integrated test |

## Next cycle

Add a least-privilege GitHub Actions workflow on Active LTS Node 24 that installs locked dependencies, runs the full suite and syntax checks, enforces a short timeout, and validates its own policy locally.
