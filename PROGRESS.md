# KoboForge continuous improvement log

Last updated: 2026-08-10 (Cycle 80 across the projects workspace; KoboForge Cycle 51)

## Current state

- Branch: `main`; working tree was clean and aligned with `origin/main` at cycle start.
- Runtime: zero-build static site served from the repository root.
- Deployment version: `2026.08.10.1`.
- Baseline verification: `npm test` plus syntax checks for all runtime and test JavaScript.
- Automated verification: GitHub Actions installs locked dependencies and runs workflow/dependency policy, a 13-assertion runtime-loader DOM fixture, logic contracts, document-fidelity fixtures, an 18-assertion embedded-image/archive fixture, the 24-assertion reflowable package/archive fixture, and all JavaScript syntax checks on Node 24.

## Latest cycle: make malformed embedded-image failures actionable

### Why this was selected

The executable image pipeline still leaked low-level `atob` or `decodeURIComponent` exceptions when edited HTML contained malformed image data. Some malformed/unsupported `data:image` URLs could instead remain unresolved or be packaged with a false PNG extension. The generic download catch displayed those implementation errors directly, giving users no safe repair path.

### Changes

- Added `EmbeddedImageError` with an image position, safe media-type metadata, optional decoder cause, and repair-focused messages.
- Parse media types and data-URL parameters explicitly, preserving parameterized percent-encoded SVG and case-insensitive schemes.
- Reject malformed separators, invalid base64/percent encoding, empty payloads, and unsupported image types before package construction.
- Removed the unsafe extension fallback that labeled unknown image bytes as PNG.
- Keep raw encoded data out of user-visible error messages; the existing download handler now displays the actionable domain message automatically.
- Expanded the embedded-image fixture from 10 to 18 contracts and documented the user-facing failure behavior.
- Bumped the deployment version to `2026.08.10.1`.

### Verification and scores

- Test-first image fixture: failed because `EmbeddedImageError` was not exported.
- `node tools/test_epub_images.mjs`: all 18 valid, malformed, compatibility, deduplication, and archive-handoff contracts passed.
- Invalid fixtures now identify the correct DOM image position and never echo the corrupt encoded payload.
- `npm ci --ignore-scripts`, the full suite, zero-vulnerability audit, every-file syntax checks, and `git diff --check` passed.
- Correctness/reliability: 9/10 (known malformed and unsupported embedded images fail before corrupt EPUB construction).
- Verifiability: 9/10 (seven failure/compatibility classes extend the real data-image-to-ZIP fixture).
- Maintainability: 9/10 (one typed error and one explicit media map define the decoder boundary).
- Performance: 9/10 (valid decoding and source deduplication remain single-pass).
- Security/robustness: 9/10 (encoded content is not reflected in UI errors and unknown formats are fail-closed).

### Lessons and process improvements

- Wrapping low-level decoders is not only a UX improvement: it creates one fail-closed boundary before malformed bytes reach package metadata.
- Never invent a file extension for unknown binary content; reject unsupported types with a conversion path.
- Include the source element's position, not its encoded payload, so users can repair a document without leaking large or sensitive data into status text.
- Compatibility fixtures must accompany stricter parsing; parameterized SVG and case-insensitive data URLs protect valid inputs from the hardening change.

## Previous cycles

- Cycle 50 (`c07101f`): executed embedded-image preparation and its composed archive handoff.
- Cycle 49 (`21252f6`): repaired image-bearing downloads and directly tested the composed archive adapter.
- Cycle 48 (`6eacc5a`): made DOCX/PDF/ZIP CDN dependencies on-demand, observable, and retryable with DOM coverage.
- Cycle 47 (`b92a8b6`): upgraded jsdom, removed deprecated encoding ancestry, and added lockfile dependency policies.

## Prioritized opportunities

| Priority | Opportunity | Category | Impact | Effort / risk | Evidence / dependency |
|---|---|---|---|---|---|
| 1 | Add browser-level import/edit/export smoke coverage | Verification | High | Large / medium | Module fixtures cover boundaries, but the full contenteditable/device UI is still not executed end to end |
| 2 | Add standards validation to hosted EPUB checks | Verification | Medium | Medium / low | The package fixture supports `EPUBCHECK_JAR`, but CI does not currently provision or execute it |
| 3 | Validate decoded image signatures against declared media types | Correctness / robustness | Medium | Medium / low | Decoder syntax and type allowlists are enforced, but arbitrary non-image bytes can still claim a supported media type |

## Next cycle

Design the smallest browser-level TXT import, edit, and EPUB-download smoke that can execute locally and in CI without depending on conversion CDNs.
