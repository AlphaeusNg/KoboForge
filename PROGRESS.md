# KoboForge continuous improvement log

Last updated: 2026-08-11 (Cycle 125 across the projects workspace; KoboForge Cycle 56)

## Current state

- Branch: `main`; working tree was clean and aligned with `origin/main` at cycle start.
- Runtime: zero-build static site served from the repository root.
- Deployment version: `2026.08.11.3`.
- Baseline verification: dependency/module fixtures, offline real-Chromium TXT
  and DOCX import/edit/export flows, optional local EPUBCheck, zero-vulnerability
  audit, 31 decoded-image assertions, 44 package assertions, and recursive
  syntax checks.
- Automated verification: least-privilege GitHub Actions runs cheap policy/unit
  fixtures, pinned EPUBCheck 5.3.0 on Temurin Java 21, both offline
  browser-to-downloaded-EPUB flows, and recursive syntax checks on Node 24.

## Latest cycle: enforce package image types and extensions

### Why this was selected

The app extractor produced signature-checked assets with canonical metadata,
but the reusable package module accepted every syntactically shaped `image/*`
value and never compared it with the final filename extension. A direct caller
could therefore create internally contradictory OPF/image entries despite the
safer user-facing path.

### Changes

- Added a package-owned exact mapping for PNG, JPEG (`.jpg`/`.jpeg`), GIF, SVG,
  and WebP; accepted media types are normalized before OPF rendering.
- Rejects unsupported image types, cross-type final extensions, filenames
  without a real extension separator, and empty basenames before creating any
  publication file-map entry.
- Added 20 direct-package assertions across every allowed type/extension,
  every cross-type mismatch, BMP, and the separator edge case; package coverage
  increased from 24 to 44 assertions.
- Documented the independent archive boundary and bumped the deployment version
  to `2026.08.11.3`.

### Verification and scores

- Test-first evidence: PNG metadata paired with `asset.jpg` produced no
  exception under the previous package validator.
- Follow-up red evidence: the first implementation treated a filename equal to
  `png` as if it contained a `.png` extension; requiring a separator fixed it.
- The 44-assertion package suite and complete dependency, workflow, runtime,
  logic, fidelity, and 31-assertion signature suite passed.
- A freshly downloaded EPUBCheck 5.3.0 archive matched the pinned SHA-256 and
  independently accepted the generated EPUB fixture.
- Both offline TXT/DOCX browser exports passed three consecutive runs each
  (six of six) with zero runtime errors.
- `npm audit --audit-level=high` found zero vulnerabilities; recursive syntax,
  whitespace, and diff gates passed.
- Process correction: the command guard rejected a destructive temporary-file
  cleanup trap before any verification ran. A dedicated retained `/tmp` cache
  path allowed the exact checksum/EPUBCheck gate to run safely.
- Correctness/reliability: 6/10 → 9/10 (manifest metadata cannot contradict its packaged filename type).
- Verifiability: 7/10 → 10/10 (all accepted families and mismatch directions have direct package fixtures).
- Maintainability: 8/10 → 9/10 (one package-owned map replaces an open-ended media-type regex).
- Performance: 9/10 → 9/10 (constant-size map and suffix checks run only during export).
- Security/robustness: 7/10 → 9/10 (unsupported and misleading asset metadata fails before XML/ZIP construction).
- Developer/user experience: 8/10 → 9/10 (direct integrations fail early instead of producing a Kobo-incompatible EPUB).

### Lessons and process improvements

- Trust boundaries must repeat their own invariants when a lower-level module
  is callable independently of a safer adapter.
- Extract the final extension only after proving a real separator exists;
  `lastIndexOf('.') + 1` otherwise turns “not found” into index zero.
- Positive coverage for the complete allowlist prevents a stricter validator
  from fixing mismatches by accidentally disabling supported formats.

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

- Cycle 56: restricted direct package image metadata to supported matching types/extensions.
- Cycle 54: executed the real offline browser DOCX import, direct edit,
  download, and verse-fidelity archive checks.
- Cycle 52 (`49f3e3f`): executed the real browser TXT import, direct edit, download, and archive contents.
- Cycle 51 (`478245d`): made malformed embedded-image failures actionable and fail-closed.
- Cycle 50 (`c07101f`): executed embedded-image preparation and its composed archive handoff.
- Cycle 49 (`21252f6`): repaired image-bearing downloads and directly tested the composed archive adapter.

## Prioritized opportunities

| Priority | Opportunity | Category | Impact | Effort / risk | Evidence / dependency |
|---|---|---|---|---|---|
| 1 | Reject duplicate or missing package asset identities/bytes | Correctness / robustness | Medium | Small-medium / low | Direct package callers can still omit byte payloads or reuse IDs/filenames, producing late JSZip failures or invalid duplicate OPF entries |
| 2 | Cache the verified EPUBCheck archive in CI | Performance / process | Low-medium | Small-medium / low | The immutable 33 MB artifact is downloaded on each run; correctness must remain checksum-gated on cache hits |
| — | Enforce exact asset types/extensions at the archive boundary | Correctness / robustness | Medium | Small-medium / low | Forty-four package assertions cover five types, both JPEG suffixes, cross-type mismatches, unsupported types, separators, and basenames | Completed in Cycle 56 |
| — | Validate decoded image signatures against declared media types | Correctness / robustness | Medium | Medium / low | Thirty-one fixtures cover every accepted signature plus arbitrary, cross-type, and malformed payloads | Completed in Cycle 55 |
| — | Extend browser coverage to one DOCX fidelity fixture | Verification | High | Medium-large / medium | Offline real-browser upload/edit/download now preserves the slim sermon fixture through EPUB XHTML | Completed in Cycle 54 |

## Next cycle

Rotate workspace attention to Seeking Biblical Truth. On the next KoboForge
cycle, reject duplicate/missing direct-package asset identities and byte
payloads before optimizing the verified EPUBCheck download.
