# KoboForge continuous improvement log

Last updated: 2026-08-09 (Cycle 50 across the projects workspace)

## Current state

- Branch: `main`; working tree was clean and aligned with `origin/main` at cycle start.
- Runtime: zero-build static site served from the repository root.
- Deployment version: `2026.08.09.8`.
- Baseline verification: `npm test` plus syntax checks for all runtime JavaScript.
- Automated verification: GitHub Actions installs locked dependencies and runs workflow/dependency policy, a 13-assertion runtime-loader DOM fixture, logic contracts, document-fidelity fixtures, a 10-assertion embedded-image/archive fixture, the 24-assertion reflowable package/archive fixture, and all JavaScript syntax checks on Node 24.

## Latest cycle: execute embedded-image preparation

### Why this was selected

Cycle 49 proved that prepared assets package correctly, but the browser-only function that decoded data URLs, removed editor attributes, deduplicated repeated sources, and rewrote chapter references remained source-inspected rather than executed. A regression there could still feed an invalid asset graph into the tested archive adapter.

### Changes

- Extracted data-image preparation into `js/epub-images.js` with explicit DOM/parser and decoder injection for executable browser-equivalent tests.
- Removed the duplicate app-local decoder/extractor and routed the browser download path through the shared module with deployment cache busting.
- Added a 10-assertion jsdom fixture covering duplicate-source collapse, stable asset metadata, exact decoded bytes, both rewritten references, editor-attribute/class removal, author-class retention, and external URL preservation.
- Fed the fixture's real extracted HTML/assets through the combined archive adapter and verified one image entry with unchanged bytes.
- Added a source contract preventing the extractor from drifting back into unexecuted app-local code.
- Documented the module/fixture and bumped the deployment version to `2026.08.09.8`.

### Verification and scores

- Test-first extraction fixture: failed because `js/epub-images.js` did not exist, then passed all 10 assertions.
- `npm ci --ignore-scripts`: clean 65-package install with zero vulnerabilities.
- `npm test`: workflow/dependency policy, runtime dependency DOM fixture, logic, document fidelity, 10 image/archive assertions, and all 24 package/archive assertions passed.
- `npm audit --json`: zero vulnerabilities at every severity.
- `node --check js/*.js tools/*.mjs`: passed.
- `git diff --check`: passed.
- Correctness/reliability: 9/10 (the full data-image-to-archive relationship is now executed with repeated sources and mixed image origins).
- Verifiability: 9/10 (DOM cleanup, byte decoding, deduplication, reference rewriting, and ZIP handoff share one fixture).
- Maintainability: 9/10 (one injected helper owns embedded-image preparation instead of burying it in the 7,000-line app module).
- Performance: 9/10 (duplicate image sources are explicitly proven to occupy one archive asset).
- Security/robustness: 9/10 (editor-only metadata is stripped and existing package validation/audit checks remain green).

### Lessons and process improvements

- Injecting `DOMParser`, `atob`, and `TextEncoder` preserves the exact browser algorithm while keeping the fixture deterministic under Node/jsdom.
- Asset-graph tests should begin before packaging: correct ZIP entries cannot compensate for duplicate or stale HTML references produced upstream.
- Removing only editor-specific classes/attributes needs an explicit preservation check for unrelated author markup.
- After two consecutive image-export cycles with strong positive evidence, the next workspace cycle should pivot to a different project rather than over-optimize the same path.

## Previous cycle

- Cycle 49 (`21252f6`): repaired image-bearing downloads and directly tested the composed archive adapter.
- Cycle 48 (`6eacc5a`): made DOCX/PDF/ZIP CDN dependencies on-demand, observable, and retryable with DOM coverage.
- Cycle 47 (`b92a8b6`): upgraded jsdom, removed deprecated encoding ancestry, and added lockfile dependency policies.

## Prioritized opportunities

| Priority | Opportunity | Category | Impact | Effort / risk | Evidence / dependency |
|---|---|---|---|---|---|
| 1 | Add browser-level import/edit/export smoke coverage | Verification | High | Large / medium | Module fixtures cover boundaries, but the full contenteditable/device UI is still not executed end to end |
| 2 | Add standards validation to hosted EPUB checks | Verification | Medium | Medium / low | The package fixture supports `EPUBCHECK_JAR`, but CI does not currently provision or execute it |
| 3 | Improve malformed embedded-image errors | Reliability / UX | Medium | Small / low | Invalid base64 or percent encoding currently bubbles a low-level decoder exception during download |

## Next cycle

Pause KoboForge after three compounding verification/correctness cycles and rotate workspace analysis to an untouched project. When returning, prioritize a minimal browser-level import/edit/export smoke path over further source-string contracts.
