# KoboForge continuous improvement log

Last updated: 2026-08-10 (Cycle 81 across the projects workspace; KoboForge Cycle 52)

## Current state

- Branch: `main`; working tree was clean and aligned with `origin/main` at cycle start.
- Runtime: zero-build static site served from the repository root.
- Deployment version: `2026.08.10.2`.
- Baseline verification: the full dependency/module fixture suite, one real Chromium import/edit/export flow, zero-vulnerability audit, and recursive syntax checks.
- Automated verification: least-privilege GitHub Actions runs cheap policy/unit fixtures first, then installs locked Chromium and executes the offline TXT-to-downloaded-EPUB smoke on Node 24.

## Latest cycle: execute TXT import, direct edit, and downloaded EPUB in Chromium

### Why this was selected

KoboForge had strong module fixtures but no browser-level proof that the actual file input, paginated contenteditable, edit synchronization, download handler, Blob URL, and packaged archive worked together. A full DOCX/PDF matrix would add CDN and rendering complexity; TXT exercises the same core edit/export path without external conversion dependencies.

### Changes

- Added exact Playwright `1.62.1`, a one-worker Chromium configuration, report ignores, and a canonical `test:browser` command.
- Added a single flow that uploads an in-memory TXT file through the real input and waits for the editable Libra Colour preview.
- Mutates the actual paginated `contenteditable`, verifies the edit badge, triggers the real browser download, and opens the downloaded EPUB with locked JSZip.
- Verifies mimetype, edited XHTML, removal of original text, title/author OPF metadata, suggested filename, and final edited-download status.
- Injects the locked JSZip browser bundle and stubs unrelated external page assets so the smoke is deterministic and does not depend on conversion CDNs.
- Promotes uncaught browser exceptions and console errors to test failures.
- Added exact dependency and workflow policies; CI runs cheap tests before installing Chromium.
- Replaced the shallow syntax glob with recursive per-file checking so nested browser modules are covered.
- Documented the browser gate and bumped the deployment version to `2026.08.10.2`.

### Verification and scores

- Test-first baseline: `npm run test:browser` failed because no browser command existed.
- The dependency policy then failed the caret range created by npm, catching and correcting Playwright to an exact lock before Chromium ran.
- Mutation evidence: changing the archive expectation to absent text failed with the downloaded chapter body, which visibly contained the direct edit; the probe was reverted.
- `npm test`: workflow policy, six dependency policies, 13 runtime-loader assertions, logic/fidelity suites, 18 image assertions, and 24 package assertions passed.
- `npm run test:browser`: the real import/edit/download/archive flow passed in about 1.2 seconds with zero browser runtime errors.
- The complete clean-install, zero-vulnerability audit, unit/browser, recursive syntax, config syntax, and diff gate passed.
- Correctness/reliability: 9/10 (the core no-CDN user journey now executes through its real browser boundaries).
- Verifiability: 10/10 (downloaded bytes and internal EPUB content are asserted, not merely a success status).
- Maintainability: 9/10 (one focused flow, one config, exact dependency, and policy-enforced CI wiring).
- Performance: 9/10 (the browser test itself is ~1.2 seconds; CI pays a Chromium installation cost after cheap gates pass).
- Security/robustness: 9/10 (the smoke remains offline for conversion assets and fails on uncaught/console errors).

### Lessons and process improvements

- Choose the simplest format that crosses the full architecture; TXT reached the same editable/exportable core without hiding browser behavior behind DOCX/PDF dependencies.
- Inspect the downloaded archive, not only the download event—an event can succeed while stale edits or metadata are packaged.
- Keep browser dependencies exact and policy-checked before expensive runtime installation.
- Recursive syntax discovery matters as soon as tests become nested; shell globs at one directory depth give false confidence.

## Previous cycles

- Cycle 51 (`478245d`): made malformed embedded-image failures actionable and fail-closed.
- Cycle 50 (`c07101f`): executed embedded-image preparation and its composed archive handoff.
- Cycle 49 (`21252f6`): repaired image-bearing downloads and directly tested the composed archive adapter.
- Cycle 48 (`6eacc5a`): made DOCX/PDF/ZIP CDN dependencies on-demand, observable, and retryable with DOM coverage.

## Prioritized opportunities

| Priority | Opportunity | Category | Impact | Effort / risk | Evidence / dependency |
|---|---|---|---|---|---|
| 1 | Add standards validation to hosted EPUB checks | Verification | Medium-high | Medium / low | Downloaded archive content is proven, while the optional `EPUBCHECK_JAR` branch is still absent from CI |
| 2 | Extend browser coverage to one DOCX fidelity fixture | Verification | High | Medium-large / medium | Core browser path is stable; DOCX adds Mammoth, ZIP preprocessing, images, and a larger fixture boundary |
| 3 | Validate decoded image signatures against declared media types | Correctness / robustness | Medium | Medium / low | Decoder syntax and type allowlists are enforced, but arbitrary non-image bytes can still claim a supported media type |

## Next cycle

Provision a pinned EPUBCheck release in hosted CI and require the existing reflowable package fixture to pass standards validation without slowing local default tests.
