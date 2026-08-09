# KoboForge continuous improvement log

Last updated: 2026-08-10 (Cycle 82 across the projects workspace; KoboForge Cycle 53)

## Current state

- Branch: `main`; working tree was clean and aligned with `origin/main` at cycle start.
- Runtime: zero-build static site served from the repository root.
- Deployment version: `2026.08.10.3`.
- Baseline verification: dependency/module fixtures, a real Chromium import/edit/export flow, optional local EPUBCheck, zero-vulnerability audit, and recursive syntax checks.
- Automated verification: least-privilege GitHub Actions runs cheap policy/unit fixtures, pinned EPUBCheck 5.3.0 on Temurin Java 21, the offline TXT-to-downloaded-EPUB Chromium smoke, and recursive syntax checks on Node 24.

## Latest cycle: require pinned EPUB standards validation in CI

### Why this was selected

The package fixture could optionally invoke EPUBCheck, but hosted CI never provisioned it. Internal ZIP/XHTML assertions and a browser download could all pass while the artifact still violated EPUB 3 conformance rules that Kobo or other readers enforce. The existing optional branch made this a medium-effort, low-risk verification improvement.

### Changes

- Verified EPUBCheck `5.3.0` as the official latest production-ready release and pinned its version and published SHA-256 in CI.
- Added Node 24-compatible `actions/setup-java@v5` with a fixed Temurin Java 21 baseline.
- Download the versioned release URL with retries, validate the archive checksum before extraction, and reject floating `releases/latest` paths by policy.
- Run the existing reflowable package fixture with `EPUBCHECK_JAR` before the more expensive Chromium install.
- Added workflow contracts for the action, Java distribution/version, EPUBCheck version/digest, checksum, non-floating URL, fixture invocation, and fail-fast ordering.
- Documented that hosted standards validation is mandatory while local execution remains available through the existing environment variable.
- Bumped the deployment version to `2026.08.10.3`.

### Verification and scores

- Test-first workflow policy: failed because the Java setup and standards steps did not exist.
- Official release API: `epubcheck-5.3.0.zip`, 33,071,108 bytes, SHA-256 `6c07e68584b2e2ce2f89fe06e1246dfead3eb36b46b340e7d93524f29dcff6c5`.
- Local checksum verification passed before extraction.
- Java 21.0.11 executed the pinned JAR; the real reflowable fixture passed EPUBCheck and all 24 archive assertions.
- `node tools/test_workflow.mjs`: all version, checksum, invocation, and ordering policies passed.
- The full clean-install, unit, checksum/standards, browser, zero-vulnerability audit, recursive syntax, and diff gate passed.
- Correctness/reliability: 9/10 (structural EPUB conformance now gates every hosted change).
- Verifiability: 10/10 (independent W3C tooling validates the same generated fixture as internal assertions).
- Maintainability: 9/10 (one existing optional branch became mandatory without duplicating package generation).
- Performance: 8/10 (CI adds a ~33 MB download and Java validation after cheap tests; local defaults remain fast).
- Security/robustness: 10/10 (version, runtime, immutable URL shape, and release digest are all fail-closed).

### Lessons and process improvements

- Optional validation paths tend to decay unless at least one canonical environment requires them.
- Pin both the tool version and the downloaded bytes; a versioned URL alone does not prove artifact integrity.
- Run independent standards validation before browser installation so malformed packages fail sooner and more cheaply.
- Reuse the exact fixture already covered by internal checks to make standards failures directly comparable rather than introducing a second artifact.

## Previous cycles

- Cycle 52 (`49f3e3f`): executed the real browser TXT import, direct edit, download, and archive contents.
- Cycle 51 (`478245d`): made malformed embedded-image failures actionable and fail-closed.
- Cycle 50 (`c07101f`): executed embedded-image preparation and its composed archive handoff.
- Cycle 49 (`21252f6`): repaired image-bearing downloads and directly tested the composed archive adapter.

## Prioritized opportunities

| Priority | Opportunity | Category | Impact | Effort / risk | Evidence / dependency |
|---|---|---|---|---|---|
| 1 | Extend browser coverage to one DOCX fidelity fixture | Verification | High | Medium-large / medium | Core browser path and standards gate are stable; DOCX adds Mammoth, ZIP preprocessing, images, and a larger fixture boundary |
| 2 | Validate decoded image signatures against declared media types | Correctness / robustness | Medium | Medium / low | Decoder syntax and type allowlists are enforced, but arbitrary non-image bytes can still claim a supported media type |
| 3 | Cache the verified EPUBCheck archive in CI | Performance / process | Low-medium | Small-medium / low | The immutable 33 MB artifact is downloaded on each run; correctness must remain checksum-gated on cache hits |

## Next cycle

Pause KoboForge after three consecutive high-value cycles and rotate workspace attention. On return, extend the proven browser harness through the slim DOCX fidelity fixture and locally injected locked Mammoth/JSZip bundles.
