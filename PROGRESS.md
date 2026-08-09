# KoboForge continuous improvement log

Last updated: 2026-08-09 (Cycle 49 across the projects workspace)

## Current state

- Branch: `main`; working tree was clean and aligned with `origin/main` at cycle start.
- Runtime: zero-build static site served from the repository root.
- Deployment version: `2026.08.09.7`.
- Baseline verification: `npm test` plus syntax checks for all runtime JavaScript.
- Automated verification: GitHub Actions installs locked dependencies and runs workflow/dependency policy, a 13-assertion runtime-loader DOM fixture, logic contracts, document-fidelity fixtures, the 24-assertion reflowable package/archive fixture, and all JavaScript syntax checks on Node 24.

## Latest cycle: repair image-bearing EPUB downloads

### Why this was selected

After the package builder was extracted in Cycle 46, `buildEpubBlob` retained an obsolete direct ZIP write through an undefined `oebps` variable. Text-only exports skipped that branch, but any export containing an embedded image failed before reaching the otherwise-correct shared packager.

### Changes

- Removed the stale `oebps.folder('images')` branch; prepared image assets now cross one boundary and are written only by the shared packager.
- Added `buildReflowableEpubArchive`, a browser-neutral combined adapter that turns publication metadata/chapters/assets into the final ZIP through the existing validated file and archive builders.
- Routed the actual browser download path through that same adapter.
- Expanded the executable package fixture from 20 to 24 assertions: the adapter archive must contain exactly one image entry with intact bytes, a matching manifest item, and the chapter reference.
- Added a source contract rejecting any `oebps` variable in the browser application so obsolete direct ZIP state cannot return.
- Updated documentation and bumped the deployment version to `2026.08.09.7`.

### Verification and scores

- Test-first regression: the fixture failed on the missing archive-adapter export and the logic suite failed on the stale direct ZIP write before implementation.
- `npm ci --ignore-scripts`: clean 65-package install with zero vulnerabilities.
- `npm test`: workflow/dependency policy, runtime dependency DOM fixture, logic, document fidelity, and all 24 package/archive assertions passed.
- `npm audit --json`: zero vulnerabilities at every severity.
- `node --check js/*.js tools/*.mjs`: passed.
- `git diff --check`: passed.
- Correctness/reliability: 9/10 (image-bearing EPUB downloads no longer dereference undefined state before packaging).
- Verifiability: 9/10 (the exact adapter used by downloads now produces and is inspected as a real image-bearing ZIP).
- Maintainability: 9/10 (one adapter owns the two-stage file-map/archive handoff; the app no longer writes package internals).
- Performance: 9/10 (each prepared image is written once instead of traversing a redundant legacy branch).
- Security/robustness: 9/10 (existing asset path/type validation and zero-finding audit remain enforced).

### Lessons and process improvements

- Extracting a package builder must also remove every old stateful write at the call site; otherwise path-specific dead references can survive text-only tests.
- Test a composed adapter in addition to its stages. File-map and ZIP tests both passed while the unexecuted browser bridge still crashed before either stage.
- Image fixtures should assert uniqueness, bytes, manifest metadata, and content references together; any one check alone can miss a broken EPUB relationship.

## Previous cycle

- Cycle 48 (`6eacc5a`): made DOCX/PDF/ZIP CDN dependencies on-demand, observable, and retryable with DOM coverage.
- Cycle 47 (`b92a8b6`): upgraded jsdom, removed deprecated encoding ancestry, and added lockfile dependency policies.
- Cycle 46 (`eab8ae8`): extracted and directly tested the real reflowable EPUB package/ZIP generator with 20 assertions.

## Prioritized opportunities

| Priority | Opportunity | Category | Impact | Effort / risk | Evidence / dependency |
|---|---|---|---|---|---|
| 1 | Execute embedded data-image extraction and deduplication | Verification / reliability | High | Small-medium / low | The archive handoff is now tested, but `extractEmbeddedImagesForEpub` remains app-local and source-inspected only |
| 2 | Add browser-level import/edit/export smoke coverage | Verification | High | Large / medium | Pure package and fidelity suites still do not execute the full contenteditable/device UI |
| 3 | Add standards validation to hosted EPUB checks | Verification | Medium | Medium / low | The package fixture supports `EPUBCHECK_JAR`, but CI does not currently provision or execute it |

## Next cycle

Extract embedded data-image preparation behind a DOM-injected helper and execute it with jsdom. Verify duplicate sources share one asset, editor-only attributes are removed, external URLs remain untouched, and generated image references flow through the already-tested archive adapter.
