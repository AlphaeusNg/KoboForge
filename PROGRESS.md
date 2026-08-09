# KoboForge continuous improvement log

Last updated: 2026-08-09 (Cycle 48 across the projects workspace)

## Current state

- Branch: `main`; working tree was clean and aligned with `origin/main` at cycle start.
- Runtime: zero-build static site served from the repository root.
- Deployment version: `2026.08.09.6`.
- Baseline verification: `npm test` plus syntax checks for all runtime JavaScript.
- Automated verification: GitHub Actions installs locked dependencies and runs workflow/dependency policy, a 13-assertion runtime-loader DOM fixture, logic contracts, document-fidelity fixtures, the 20-assertion reflowable package fixture, and all JavaScript syntax checks on Node 24.

## Latest cycle: make conversion-library failures retryable

### Why this was selected

DOCX and ZIP libraries loaded eagerly from CDNs, while the lazy PDF module had an untested retry cache. Failures surfaced raw library names only after a 12-second poll, and selecting the same file again could emit no change event because the file input retained its old value.

### Changes

- Added a shared runtime dependency module with typed, actionable errors plus deduplicated, retryable script/module loaders and bounded script timeouts.
- Moved Mammoth and JSZip from eager page scripts to on-demand DOCX/preprocessing/export loads; PDF.js now uses the same retry contract.
- Removed failed script nodes and cleared failed module promises so a recovered connection creates a real fresh request.
- Added a 13-assertion jsdom fixture covering concurrent deduplication, cached success, safe error/cause handling, failed-node cleanup, and successful script/module retries.
- Made processing failures reset the file input and display a connection-specific recovery hint, allowing the same document to be selected again.
- Documented the loader/test boundary and bumped the deployment version to `2026.08.09.6`.

### Verification and scores

- Test-first runtime fixture: failed because the shared loader module did not exist, then passed all 13 assertions.
- `npm ci --ignore-scripts`: clean 65-package install with zero vulnerabilities.
- `npm test`: workflow/dependency policy, runtime dependency DOM fixture, logic, document fidelity, and 20 package assertions passed.
- `npm audit --json`: zero vulnerabilities at every severity.
- `node --check js/*.js tools/*.mjs`: passed.
- `git diff --check`: passed.
- Correctness/reliability: 9/10 (failed CDN loads recover on the next attempt, including same-file selection).
- Verifiability: 9/10 (real DOM script events and controlled module imports exercise success and failure state transitions).
- Maintainability: 9/10 (one browser-neutral module owns all conversion dependency policies and user-safe errors).
- Performance: 9/10 (DOCX and ZIP payloads no longer load for visitors who do not use those paths).
- Security/robustness: 9/10 (script timeouts remain bounded, raw network details stay in causes, and audit remains clean).

### Lessons and process improvements

- Retryability requires resetting both network state and UI state: clearing a rejected promise is insufficient when a file input suppresses same-value changes.
- Testing script loaders with jsdom events catches node cleanup and duplicate-request behavior without adding a heavyweight browser runner.
- Loader errors should expose one stable recovery message to users while preserving the original cause for diagnostics.
- Review of the export call site exposed a separate pre-existing `oebps` reference after the packager extraction; it is now the top correctness opportunity.

## Previous cycle

- Cycle 47 (`b92a8b6`): upgraded jsdom, removed deprecated encoding ancestry, and added lockfile dependency policies.
- Cycle 46 (`eab8ae8`): extracted and directly tested the real reflowable EPUB package/ZIP generator with 20 assertions.
- Cycle 45 (`fec279a`): added least-privilege Node 24 CI with ten locally enforced workflow invariants.

## Prioritized opportunities

| Priority | Opportunity | Category | Impact | Effort / risk | Evidence / dependency |
|---|---|---|---|---|---|
| 1 | Remove the stale `oebps` image-export write and execute the app packaging adapter | Bug / verification | High | Small-medium / low | `buildEpubBlob` references undefined `oebps` whenever embedded images exist, before passing those same assets to the extracted packager |
| 2 | Add browser-level import/edit/export smoke coverage | Verification | High | Large / medium | Pure package and fidelity suites still do not execute the full contenteditable/device UI |
| 3 | Add standards validation to hosted EPUB checks | Verification | Medium | Medium / low | The package fixture supports `EPUBCHECK_JAR`, but CI does not currently provision or execute it |

## Next cycle

Remove the undefined legacy `oebps` write from image-bearing EPUB export and add an executable test around the browser adapter that prepares chapters/assets for the shared packager. Prove embedded images package exactly once and downloads no longer fail before ZIP generation.
