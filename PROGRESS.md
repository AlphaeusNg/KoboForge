# KoboForge continuous improvement log

Last updated: 2026-08-09 (Cycle 43 across the projects workspace)

## Current state

- Branch: `main`; working tree was clean and aligned with `origin/main` at cycle start.
- Runtime: zero-build static site served from the repository root.
- Deployment version: `2026.08.09.1`.
- Baseline verification: `npm test` plus syntax checks for all runtime JavaScript.
- Current suites: logic contracts, document-fidelity fixtures, and the legacy fixed-layout package fixture.

## Latest cycle: align public copy with the reflowable-only product

### Why this was selected

The previous release intentionally removed fixed-layout EPUB mode and its picker, but the live hero still promised exact locked PDF pages and “Auto fixed-layout EPUB 3.” The workflow card also told visitors to choose and export a Fixed mode that no longer exists. This was a direct product-contract and user-expectation bug.

### Changes

- Rewrote the hero journey around the actual paginated editing and reflowable export path.
- Replaced the obsolete fixed-layout badge with “Always reflowable & editable.”
- Replaced the five-step workflow with the real import, device choice, direct edit, Diff/HTML review, and reflowable export sequence.
- Added regression assertions that reject the stale fixed-mode promises and require the current public contract.
- Bumped the deployment version to `2026.08.09.1`.

### Verification and scores

- `npm test`: logic, document fidelity, and package fixture suites passed (the obsolete fixed-package fixture remains tracked as the next cleanup target).
- `node --check js/app.js js/document-fidelity.js js/fixed-layout.js js/version.js js/boot.js`: passed.
- `git diff --check`: passed.
- Correctness/user experience: 9/10 (the live instructions now match the only available export behavior).
- Verifiability: 8/10 (two regression assertions prevent the removed promise from returning).
- Maintainability: 7/10 (public copy is coherent, but unreachable fixed-layout runtime/package code remains).
- Risk: low (copy and contract-test only; conversion behavior is unchanged).

### Lessons and process improvements

- Feature removal verification must search the entire public HTML, not only the removed controls and primary runtime branches.
- Negative contract assertions are useful when a removed capability would otherwise remain plausible marketing copy.
- Separate visible-contract repair from dead-code deletion so each rollback remains cheap and evidence is unambiguous.

## Prioritized opportunities

| Priority | Opportunity | Category | Impact | Effort / risk | Evidence / dependency |
|---|---|---|---|---|---|
| 1 | Remove unreachable fixed-layout preview/export/package code while retaining PDF complexity analysis | Maintainability / correctness | High | Medium / low | `resolvedEpubLayout()` is constant reflowable, yet hundreds of unreachable lines and a package fixture remain |
| 2 | Run KoboForge tests in least-privilege GitHub Actions | Verifiability | High | Small / low | The full local suite passes but no workflow is present |
| 3 | Add startup smoke coverage for CDN/library failure states | Reliability | Medium | Medium / low | `boot.js` covers app-module failure, while lazy conversion-library failure paths lack an integrated test |

## Next cycle

Remove the unreachable fixed-layout rendering and EPUB packaging path, its package-only exports, and its obsolete fixture. Preserve and rename the still-used PDF layout-complexity analysis contract, then prove the application exports only reflowable EPUB.
