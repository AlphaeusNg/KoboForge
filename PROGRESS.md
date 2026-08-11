# KoboForge continuous improvement log

Last updated: 2026-08-11 (Cycle 115 across the projects workspace; KoboForge Cycle 55)

## Current state

- Branch: `main`; working tree was clean and aligned with `origin/main` at cycle start.
- Runtime: zero-build static site served from the repository root.
- Deployment version: `2026.08.11.2`.
- Baseline verification: dependency/module fixtures, offline real-Chromium TXT
  and DOCX import/edit/export flows, optional local EPUBCheck, zero-vulnerability
  audit, and recursive syntax checks.
- Automated verification: least-privilege GitHub Actions runs cheap policy/unit
  fixtures, pinned EPUBCheck 5.3.0 on Temurin Java 21, both offline
  browser-to-downloaded-EPUB flows, and recursive syntax checks on Node 24.

## Latest cycle: validate decoded embedded-image signatures

### Why this was selected

EPUB extraction accepted a supported `image/*` declaration, valid data-URL
encoding, and any non-empty decoded byte sequence. Arbitrary text could
therefore become an `image-1.png` manifest asset, and valid PNG bytes could be
mislabelled as JPEG. The result passed internal packaging even though Kobo
could not decode the asset.

### Changes

- Added post-decode signatures for the complete supported set: eight-byte PNG,
  JPEG start-of-image, GIF87a/GIF89a, RIFF/WebP container markers, and parsed
  namespace-correct SVG XML.
- Rejects arbitrary, truncated, cross-type, malformed-XML, and invalid-UTF-8
  payloads with the existing contextual `EmbeddedImageError`, declared media
  type, and repair guidance without exposing encoded contents.
- Added valid fixtures for all five types, arbitrary-byte rejection for all
  five, PNG-as-JPEG rejection, malformed SVG rejection, and an explicit decoder
  availability contract; image assertions increased from 18 to 31.
- Documented signature-aware download errors and bumped the deployment version
  to `2026.08.11.2`.

### Verification and scores

- Test-first evidence: the new suite failed because arbitrary bytes declared as
  `image/png` produced no exception.
- Process correction: the first “valid SVG” fixture put whitespace between its
  BOM and XML declaration. The XML parser correctly rejected that invalid
  document; fixing the fixture preserved strict validation.
- The 31-assertion image suite and complete dependency, workflow, runtime,
  logic, fidelity, and 24-assertion package suite passed.
- Both offline TXT/DOCX browser exports passed in 2.0s with zero runtime errors;
  the zero-vulnerability audit, recursive syntax, and whitespace gates passed.
- Hosted EPUBCheck, CI, Pages, and live-version evidence are recorded in the
  Cycle 115 completion summary.
- Correctness/reliability: 6/10 → 9/10 (declared types now agree with decoded
  container evidence before app packaging).
- Verifiability: 7/10 → 10/10 (every accepted type has a positive fixture and
  every type rejects arbitrary bytes).
- Maintainability: 8/10 → 9/10 (one switch owns the allowlist's byte contracts).
- Performance: 9/10 → 9/10 (constant-prefix checks for raster formats; SVG is
  parsed once during export).
- Security/robustness: 7/10 → 9/10 (type spoofing and malformed SVG XML fail
  closed with no payload leakage).
- Developer/user experience: 8/10 → 9/10 (corrupt assets fail before a broken
  EPUB reaches the device).

### Lessons and process improvements

- Validate the bytes after decoding; syntax and MIME allowlists establish only
  what a payload claims to be.
- SVG needs XML/root/namespace validation, not a text-prefix approximation.
- When a strict validator rejects a supposedly valid test fixture, inspect the
  fixture against the format grammar before relaxing production behavior.

## Previous cycle: exercise DOCX fidelity through the real browser

### Why this was selected

DOCX is KoboForge's richest import path: it crosses on-demand Mammoth loading,
ZIP preprocessing, Word style/page/list normalization, verse-marker repair,
the paginated editor, and EPUB packaging. Unit fixtures covered the conversion
pieces, but only TXT had executed the composed browser workflow and inspected
its actual download.

### Changes

- Injected the exact lockfile-backed Mammoth 1.12.0 browser bundle alongside
  JSZip 3.10.1 in the offline Playwright harness; all HTTPS remains blocked.
- Added a second real-browser flow using the committed 18 KB Numbers 13–15
  sermon fixture.
- Required import readiness, preserved Numbers 14:33 prose immediately after
  its semantic verse marker, retained later sermon/discussion content, direct
  editor mutation, download metadata, and final EPUB XHTML fidelity.
- Made app initialization an explicit test precondition after the combined
  suite exposed a file-selection/listener race.
- Updated browser-test documentation and bumped the deployment version to
  `2026.08.11.1`.

### Verification and scores

- Test-first evidence: the new flow failed with the expected retryable “DOCX
  converter could not load” status while the CDN was blocked and Mammoth was
  not injected.
- Focused flow: passed in 1.3s after locked bundle injection.
- Process failure: the first combined run left DOCX at “Waiting for a document”
  because file selection raced dynamic app initialization. Waiting for the
  populated device specification fixed the precondition rather than masking
  the timeout.
- Stability run: both TXT and DOCX flows passed three times each (six total) in
  5.2s, with zero console errors or uncaught page exceptions.
- The default dependency/workflow/runtime/logic/fidelity/image/package suite
  passed; it retains 6 dependency, 13 runtime-dependency, 18 image, and 24 EPUB
  package assertions plus the larger logic/fidelity matrices.
- `npm audit --audit-level=high`, recursive `node --check`, and `git diff
  --check` pass in the final gate.
- Correctness/reliability: 7/10 → 9/10 (the composed DOCX workflow now proves
  the same sermon fidelity promised by its units).
- Verifiability: 7/10 → 10/10 (real upload, edit, download, ZIP, OPF, and XHTML
  agree under an offline browser).
- Maintainability: 8/10 → 9/10 (one shared harness injects version-locked tools
  and captures runtime errors for both formats).
- Performance: 8/10 → 8/10 (CI gains one ~1s browser flow; deployed runtime is
  unchanged).
- Security/robustness: 9/10 → 10/10 (tests cannot silently fall back to a CDN
  or a different dependency version).

### Lessons and process improvements

- Unit fidelity and archive tests do not prove the dynamically loaded browser
  composition; carry one representative high-risk fixture across the entire
  user path.
- Test-only dependency injection should come from the same lockfile as unit
  imports while external requests stay blocked.
- A test that interacts after `DOMContentLoaded` can still race a dynamically
  imported application. Wait on a user-visible initialized state before
  selecting files, and repeat the full suite to validate the fix.

## Previous cycle: require pinned EPUB standards validation in CI

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

- Cycle 54: executed the real offline browser DOCX import, direct edit,
  download, and verse-fidelity archive checks.
- Cycle 52 (`49f3e3f`): executed the real browser TXT import, direct edit, download, and archive contents.
- Cycle 51 (`478245d`): made malformed embedded-image failures actionable and fail-closed.
- Cycle 50 (`c07101f`): executed embedded-image preparation and its composed archive handoff.
- Cycle 49 (`21252f6`): repaired image-bearing downloads and directly tested the composed archive adapter.

## Prioritized opportunities

| Priority | Opportunity | Category | Impact | Effort / risk | Evidence / dependency |
|---|---|---|---|---|---|
| 1 | Enforce exact asset types/extensions at the archive boundary | Correctness / robustness | Medium | Small-medium / low | The app extractor is signature-safe, but direct package-module callers can still submit arbitrary `image/*` metadata and extension mismatches |
| 2 | Cache the verified EPUBCheck archive in CI | Performance / process | Low-medium | Small-medium / low | The immutable 33 MB artifact is downloaded on each run; correctness must remain checksum-gated on cache hits |
| — | Validate decoded image signatures against declared media types | Correctness / robustness | Medium | Medium / low | Thirty-one fixtures cover every accepted signature plus arbitrary, cross-type, and malformed payloads | Completed in Cycle 55 |
| — | Extend browser coverage to one DOCX fidelity fixture | Verification | High | Medium-large / medium | Offline real-browser upload/edit/download now preserves the slim sermon fixture through EPUB XHTML | Completed in Cycle 54 |

## Next cycle

Rotate workspace attention after closing the declared return target. On the next
KoboForge cycle, enforce the same exact type/extension trust boundary for direct
archive-module inputs before optimizing the verified EPUBCheck download.
