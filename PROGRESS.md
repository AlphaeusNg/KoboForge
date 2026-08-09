# KoboForge continuous improvement log

Last updated: 2026-08-09 (Cycle 46 across the projects workspace)

## Current state

- Branch: `main`; working tree was clean and aligned with `origin/main` at cycle start.
- Runtime: zero-build static site served from the repository root.
- Deployment version: `2026.08.09.4`.
- Baseline verification: `npm test` plus syntax checks for all runtime JavaScript.
- Automated verification: GitHub Actions installs locked dependencies and runs workflow policy, logic contracts, document-fidelity fixtures, the 20-assertion reflowable package fixture, and all JavaScript syntax checks on Node 24.

## Latest cycle: execute the real reflowable EPUB packager in tests

### Why this was selected

The suite inspected export CSS and source strings but never executed the reflowable ZIP/package path that users download. Manifest, spine, navigation, legacy NCX, embedded-image packaging, and the EPUB-specific ZIP header rules could regress together while every test remained green.

### Changes

- Extracted the exact reflowable file-map and ZIP generator into `js/epub-package.js`; DOM cleanup/chapter preparation remains in `app.js`.
- Routed browser downloads through the shared tested builders and removed duplicated package/CSS/manifest construction from `app.js`.
- Added a real two-chapter archive fixture with one packaged image and 20 assertions covering container, identifiers/escaping, reflow-only metadata, spine, nav, NCX, image manifest/bytes, exact file set, and path rejection.
- Verified the EPUB ZIP begins with an uncompressed `mimetype`, suppresses synthetic directory entries, and DEFLATE-compresses subsequent publication content.
- Added optional `EPUBCHECK_JAR` execution and documented the module, fixture, and validation command.
- Bumped the deployment version to `2026.08.09.4`.

### Verification and scores

- `npm test`: workflow policy, logic, document fidelity, and 20 package assertions passed (the missing package module failed before implementation).
- `node --check js/*.js tools/*.mjs`: passed.
- `git diff --check`: passed.
- Correctness/reliability: 9/10 (the actual browser package/ZIP code is now exercised with linked content).
- Verifiability: 9/10 (file-level, XML linkage, binary ZIP ordering/compression, and optional standards validation share one fixture).
- Maintainability: 9/10 (one browser-neutral module owns package metadata and archive construction).
- Performance: 9/10 (publication content is now compressed, while the mandatory first mimetype entry remains stored).
- Security/robustness: 9/10 (asset IDs/types/filenames are validated and traversal-like filenames are rejected).

### Lessons and process improvements

- Extract the lowest pure boundary: DOM/model cleanup stays in the app, while already-clean chapters and assets cross into the package module.
- EPUB ZIP checks must inspect local-header bytes; loading the archive alone does not prove mimetype is first and stored.
- Byte-level verification caught JSZip's synthetic stored directory entry. Disabling folder records made every post-mimetype entry real compressed content.

## Previous cycle

- Cycle 45 (`fec279a`): added warning-free, least-privilege Node 24 CI with ten locally enforced workflow invariants.
- Cycle 44 (`682a82d`): removed 921 lines of obsolete fixed-layout runtime/package/test code and enforced the reflowable-only boundary.
- Cycle 43 (`8739808`): aligned the hero and workflow with the reflowable-only product and added public-contract regression assertions.

## Prioritized opportunities

| Priority | Opportunity | Category | Impact | Effort / risk | Evidence / dependency |
|---|---|---|---|---|---|
| 1 | Refresh deprecated transitive test dependencies | Maintainability / security | Medium | Small / low | Clean install reports deprecated `whatwg-encoding` through the dev-only DOM stack; audit reports no vulnerabilities |
| 2 | Add startup smoke coverage for CDN/library failure states | Reliability | Medium | Medium / low | `boot.js` covers app-module failure, while lazy conversion-library failure paths lack an integrated test |
| 3 | Add browser-level import/edit/export smoke coverage | Verification | High | Large / medium | Pure package and fidelity suites do not execute the full contenteditable/device UI; no browser runner is currently configured |

## Next cycle

Audit direct and transitive dev dependency updates, prioritizing removal of the deprecated `whatwg-encoding` chain without adding browser runtime weight. Apply only lockfile-backed updates that keep all suites green and the audit clean.
