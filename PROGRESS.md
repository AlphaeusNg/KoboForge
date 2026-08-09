# KoboForge continuous improvement log

Last updated: 2026-08-09 (Cycle 47 across the projects workspace)

## Current state

- Branch: `main`; working tree was clean and aligned with `origin/main` at cycle start.
- Runtime: zero-build static site served from the repository root.
- Deployment version: `2026.08.09.5`.
- Baseline verification: `npm test` plus syntax checks for all runtime JavaScript.
- Automated verification: GitHub Actions installs locked dependencies and runs workflow/dependency policy, logic contracts, document-fidelity fixtures, the 20-assertion reflowable package fixture, and all JavaScript syntax checks on Node 24.

## Latest cycle: remove the deprecated DOM-test dependency chain

### Why this was selected

Every clean install warned about deprecated `whatwg-encoding`, pulled through the directly pinned jsdom 26 test dependency. The warning did not affect browser runtime, but it obscured actionable install output and left the verification stack on an avoidably stale encoding implementation.

### Changes

- Upgraded the dev-only jsdom test harness from `26.1.0` to Node-24-compatible `29.1.1`, replacing its deprecated encoding dependency chain.
- Added a four-assertion dependency policy test that keeps jsdom exactly locked, verifies manifest/lock agreement, enforces the cleaned major baseline, and rejects `whatwg-encoding` in the lockfile.
- Wired dependency policy into the default local and hosted test command.
- Regenerated the lockfile exclusively through npm and bumped the deployment version to `2026.08.09.5`.

### Verification and scores

- Test-first dependency policy: failed against jsdom 26 before the upgrade, then passed all four assertions.
- `npm ci --ignore-scripts`: installed 65 packages with no deprecation warning and reported zero vulnerabilities.
- `npm ls whatwg-encoding --all`: returned an empty dependency tree.
- `npm test`: workflow/dependency policy, logic, document fidelity, and 20 package assertions passed.
- `npm audit --json`: zero vulnerabilities at every severity.
- `node --check js/*.js tools/*.mjs`: passed.
- `git diff --check`: passed.
- Correctness/reliability: 9/10 (the existing DOM, fidelity, and package behavior remained green across the major test-harness upgrade).
- Verifiability: 9/10 (the exact removed chain and manifest/lock consistency now have executable policy checks).
- Maintainability: 9/10 (clean installs are warning-free and the test DOM is on a current Node-24-compatible release).
- Performance: 9/10 (no browser dependency or runtime path changed).
- Security/robustness: 9/10 (the lockfile is audit-clean and deprecated encoding code was removed).

### Lessons and process improvements

- Registry `latest` is not automatically usable: jsdom 30 required Node `24.15+`, while the current environment is `24.14.1`; jsdom 29 was the newest compatible safe step.
- A warning-removal cycle should prove both clean-install output and absent ancestry. An audit alone would not detect deprecated packages.
- Dependency policies should encode the property being protected (exact locking, minimum cleaned baseline, forbidden package), not one release forever.

## Previous cycle

- Cycle 46 (`eab8ae8`): extracted and directly tested the real reflowable EPUB package/ZIP generator with 20 assertions.
- Cycle 45 (`fec279a`): added least-privilege Node 24 CI with ten locally enforced workflow invariants.
- Cycle 44 (`682a82d`): removed 921 lines of obsolete fixed-layout runtime/package/test code and enforced the reflowable-only boundary.

## Prioritized opportunities

| Priority | Opportunity | Category | Impact | Effort / risk | Evidence / dependency |
|---|---|---|---|---|---|
| 1 | Add startup smoke coverage for conversion-library failure states | Reliability | Medium-high | Medium / low | `boot.js` covers app-module failure, while lazy DOCX/PDF library load failures lack integrated DOM coverage |
| 2 | Add browser-level import/edit/export smoke coverage | Verification | High | Large / medium | Pure package and fidelity suites do not execute the full contenteditable/device UI; no browser runner is currently configured |
| 3 | Add standards validation to hosted EPUB checks | Verification | Medium | Medium / low | The package fixture supports `EPUBCHECK_JAR`, but CI does not currently provision or execute it |

## Next cycle

Exercise the lazy conversion-library loader and its user-visible failure states in jsdom, beginning with the highest-impact DOCX/PDF dependency path. Preserve retry behavior and actionable status messaging while preventing unhandled startup failures.
