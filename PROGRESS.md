# KoboForge continuous improvement log

Last updated: 2026-08-09 (Cycle 45 across the projects workspace)

## Current state

- Branch: `main`; working tree was clean and aligned with `origin/main` at cycle start.
- Runtime: zero-build static site served from the repository root.
- Deployment version: `2026.08.09.3`.
- Baseline verification: `npm test` plus syntax checks for all runtime JavaScript.
- Automated verification: GitHub Actions installs locked dependencies and runs workflow policy, logic contracts, document-fidelity fixtures, and all JavaScript syntax checks on Node 24.

## Latest cycle: run locked checks in CI

### Why this was selected

KoboForge's local suite passed, but no repository workflow ran it on pushes or pull requests. That allowed conversion and fixture regressions to merge without an independent clean install, supported runtime, or syntax gate.

### Changes

- Added a push/pull-request GitHub Actions workflow using `actions/checkout@v7`, `actions/setup-node@v7`, and Active LTS Node 24.
- Enforced read-only repository permissions, a ten-minute timeout, npm lockfile caching, and cancellation of superseded runs.
- Used `npm ci --ignore-scripts` before the full default suite, then syntax-checked every runtime and test module.
- Added ten self-testing workflow-policy assertions and included them in `npm test` so policy regressions fail locally.
- Documented the workflow test and bumped the deployment version to `2026.08.09.3`.

### Verification and scores

- `npm ci --ignore-scripts`: 65 packages installed from lockfile; audit reported 0 vulnerabilities (one deprecated transitive test dependency warning).
- `npm test`: workflow policy, logic, and document-fidelity suites passed (the missing-workflow assertion failed before implementation).
- `node --check js/app.js js/document-fidelity.js js/version.js js/boot.js tools/*.mjs`: passed.
- Workflow YAML parse: passed.
- `git diff --check`: passed.
- Correctness/reliability: 8/10 (clean-environment checks now gate every change).
- Verifiability: 9/10 (ten CI invariants plus all existing suites run locally and hosted).
- Maintainability: 9/10 (CI uses current supported action/runtime majors and the committed lockfile).
- Security/robustness: 9/10 (least privilege, ignored install scripts, bounded execution, and zero audit findings).

### Lessons and process improvements

- Workflow safety properties should be executable locally, not reviewed only as YAML text after a push.
- `npm ci --ignore-scripts` is sufficient for this pure-JavaScript test stack and reduces install-time supply-chain exposure.
- Dependency warnings and vulnerability findings have different urgency; the deprecated transitive test package is logged for a focused dependency cycle, while the audit is clean.

## Previous cycle

- Cycle 44 (`682a82d`): removed 921 lines of obsolete fixed-layout runtime/package/test code and enforced the reflowable-only boundary.
- Cycle 43 (`8739808`): aligned the hero and workflow with the reflowable-only product and added public-contract regression assertions.

## Prioritized opportunities

| Priority | Opportunity | Category | Impact | Effort / risk | Evidence / dependency |
|---|---|---|---|---|---|
| 1 | Add an executable reflowable EPUB package fixture with optional EPUBCheck | Verification / correctness | High | Medium / medium | Export CSS is checked structurally, but the actual ZIP/package path is not exercised end-to-end |
| 2 | Refresh deprecated transitive test dependencies | Maintainability / security | Medium | Small / low | Clean install reports deprecated `whatwg-encoding` through the dev-only DOM stack; audit reports no vulnerabilities |
| 3 | Add startup smoke coverage for CDN/library failure states | Reliability | Medium | Medium / low | `boot.js` covers app-module failure, while lazy conversion-library failure paths lack an integrated test |

## Next cycle

Extract the reflowable EPUB package builder into a browser-neutral module and add a real ZIP fixture that checks mimetype ordering/storage, manifest/spine/nav/NCX linkage, packaged inline images, and optional EPUBCheck without changing browser behavior.
