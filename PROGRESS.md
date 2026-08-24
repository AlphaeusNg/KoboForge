# KoboForge continuous improvement log

Last updated: 2026-08-25 (KoboForge Cycle 70)

## Current state

- Branch: `main`.
- Runtime: zero-build static site served from the repository root.
- Deployment version: `2026.08.25.6`.
- Baseline verification: dependency/module fixtures, offline real-Chromium TXT
  and DOCX import/edit/export flows, Find-in-book query changes, optional local
  EPUBCheck, zero-vulnerability audit, 32 decoded-image assertions, 76 package
  assertions, and recursive syntax checks.
- Automated verification: least-privilege GitHub Actions runs cheap policy/unit
  fixtures, pinned EPUBCheck 5.3.0 on Temurin Java 21, both offline
  browser-to-downloaded-EPUB flows, and recursive syntax checks on Node 24. The
  immutable EPUBCheck ZIP is cached by exact platform/version/digest and is
  checksum-verified before every extraction, including cache hits. Twelve
  offline real-Chromium journeys include fail-closed image and CSS exports.

## Latest cycle: reject non-image network resources from EPUB chapters

### Why this was selected

The previous cycle closed ordinary `<img>` URLs, but the same private host could
still survive in inline CSS, imported stylesheets, or SVG `<image>` references.
Those forms produced an apparently local EPUB that fetched from the network when
read, so they violated the same reliability and privacy contract through a less
obvious package path.

### Changes

- Scan chapter style attributes and `<style>` blocks for `url(...)` resources;
  require each one to be either an internal fragment or a declared local image.
- Reject stylesheet imports and validate SVG `<image href>` / `xlink:href`
  against the same packaged-image set.
- Decode numeric HTML entities before scheme checks so `https&#58;` cannot hide
  a remote image URL.
- Add a typed expected-validation error so the UI gives URL-redacted repair
  guidance without reporting a false runtime fault.
- Preserve intentional reader hyperlinks and declared local CSS images, add a
  real no-download Chromium journey, document the contract, and bump the site
  stamp to `2026.08.25.6`.

### Verification and scores

- Test-first: inline CSS, `@import`, and SVG-image fixtures all retained the
  private host in generated chapter XHTML before the boundary change.
- `npm test`: all workflow, dependency, runtime, logic, fidelity, 32 image, and
  76 package assertions pass.
- `npm run test:browser`: 12/12 offline Chromium journeys pass, including exact
  redacted status and proof that no partial download fires.
- Checksum-pinned EPUBCheck 5.3.0 accepted the generated reflowable fixture;
  recursive syntax, diff whitespace, and high-severity npm audit also pass with
  zero vulnerabilities.
- Correctness/reliability: 5/10 → 10/10; verifiability: 6/10 → 10/10;
  maintainability: 7/10 → 9/10; performance: 9/10 → 9/10 (linear pre-ZIP
  checks); user experience: 7/10 → 9/10; security/privacy: 4/10 → 10/10.

### Lessons and process improvements

- A self-contained package contract must classify every resource-loading
  context, not just the most common element.
- Negative package tests should also prove valid local resources and ordinary
  outbound links remain available; broad URL bans would be a regression.
- Entity decoding belongs before URL classification at a reusable raw-markup
  boundary.

### Explicit next opportunity

Audit other automatic resource elements (`audio`, `video`, `source`, `iframe`,
`object`, `embed`, `script`, and `link`) at the package boundary; they can still
load remote content even though CSS, SVG images, and ordinary images are closed.

## Previous cycle: reject remote chapter images before EPUB download

### Why this was selected

The extractor preserved `http(s)` image references and the final package
boundary explicitly allowed them. A downloaded EPUB could therefore appear
complete while depending on a third-party server, leaking reader requests and
breaking when offline or after the URL changed. The refreshed backlog contained
this exact unresolved decision, and the earlier Find/Diff rotation requirement
had been satisfied across multiple other repositories.

### Changes

- Reject HTTP(S) and protocol-relative chapter images during embedded-image
  extraction with URL-redacted guidance to save and paste/drop the image locally.
- Independently reject the same remote forms at the browser-neutral package
  boundary so direct callers cannot bypass the self-contained-book contract.
- Treat this expected content validation as a warning rather than an application
  runtime error while keeping the actionable message in the visible status.
- Add direct extractor and package fixtures plus a real Chromium Download
  journey proving no partial EPUB is emitted and no private URL reaches the UI.
- Document the local-only chapter-image contract and bump the deployment stamp
  to `2026.08.25.5`.

### Verification and scores

- Test-first: both new fixtures failed because extraction and packaging allowed
  the remote image unchanged.
- The first browser run exposed an initialization race in the fixture itself;
  waiting for the device profile before upload fixed the test without changing
  production behavior. The focused real Download journey then passed.
- Embedded-image coverage: 32 assertions; package coverage: 71 assertions.
- Correctness/reliability: 4/10 → 10/10 (export can no longer create a
  network-dependent EPUB); verifiability: 5/10 → 10/10 (both module boundaries
  and the visible no-download outcome execute); maintainability: 8/10 → 9/10;
  performance: 8/10 → 10/10 (remote references fail before ZIP work);
  security/privacy: 4/10 → 10/10 (reader requests and private URL disclosure
  are prevented); user experience: 5/10 → 9/10 (repair guidance is specific).

### Lessons and process improvements

- “Fully local processing” also requires fully local output; a remote reference
  does not upload during conversion but can still leak later when the book opens.
- Enforce self-containment both where sources are rewritten and where the final
  publication is assembled. A direct package caller must not bypass the rule.
- Browser fixtures must wait for module initialization before firing file-input
  events; `DOMContentLoaded` alone does not prove deferred imports are bound.

### Explicit next opportunity

No higher-impact unblocked local item is currently recorded. Rotate
repositories and return when new document-fidelity evidence appears.

## Previous cycle: strip transient Diff markers independent of bookkeeping

### Why this was selected

The export-canonicalizer audit found that Diff jump highlights were safe only
while their element retained a `kf-change-*` ID or `data-diff` attribute. The
supported text-match fallback can target a plain edited block, where
`kf-edit-jump` and `kf-tc-block` then survived synchronization and appeared in
the EPUB chapter. Preview-only state must not depend on separate bookkeeping
remaining attached.

### Changes

- Clean every cloned editable descendant by the owned `kf-tc-*` namespace plus
  `kf-edit-jump` / `is-flash`, independently of IDs or data attributes.
- Continue removing change IDs and `data-diff`, and drop empty class attributes
  after transient class removal.
- Extend the real TXT edit/export journey through a visible Diff jump, remove
  its bookkeeping to exercise fallback shape, and inspect the EPUB chapter for
  both leaked classes.
- Bumped the deployment version to `2026.08.25.4`.

### Verification and scores

- Test-first: the downloaded XHTML contained `<p class="kf-tc-block
  kf-edit-jump">` after the highlighted element lost its bookkeeping.
- Both focused exports and the complete 10-test offline Chromium suite pass
  after cleanup. Workflow, dependency, runtime, logic, document-fidelity,
  31-image, and 70-package assertions, recursive JavaScript syntax, diff
  whitespace, and the high-severity npm audit all pass.
- Correctness/reliability: 5/10 → 10/10; verifiability: 6/10 → 10/10;
  maintainability: 6/10 → 9/10; performance: 9/10 → 9/10; user experience:
  8/10 → 9/10; security/robustness: 9/10 → 9/10.

### Lessons and process improvements

- Transient-state cleanup should key off the state itself, not a second marker
  that DOM editing may remove first.
- Export tests should deliberately detach bookkeeping before serialization to
  prove cleanup survives the fallback shapes production code advertises.

### Explicit next opportunity

Rotate repositories after three consecutive Find/Diff export cycles to avoid
diminishing returns; revisit only when new document-fidelity evidence appears.

## Previous cycle: expose current search state without exporting it

### Why this was selected

Find-in-book identified its active match only through a visual highlight and a
numeric live status, so assistive technology could not identify the current
result in the book. Inspection also found that the visual class lived inside
the editable document DOM and could therefore leak into a downloaded EPUB.
The accessibility improvement needed an explicit transient-state boundary so
it would not worsen document fidelity.

### Changes

- Mark the active result with `aria-current="location"`, link the search input
  to its polite live status, and identify the preview controlled by Prev/Next.
- Preserve and restore an author-supplied `aria-current` value as the active
  result moves or search state clears.
- Temporarily remove the active highlight and ARIA marker before cloning the
  editable DOM for synchronization, then restore the live preview state.
- Extend the existing real-browser journey through current-result navigation,
  author-ARIA restoration, and inspection of the downloaded EPUB chapter.
- Bumped the deployment version to `2026.08.25.3`.

### Verification and scores

- Test-first evidence: the highlighted paragraph had no `aria-current` state.
- The focused Chromium journey passes with accessible navigation and proves
  the EPUB contains no `kf-find-hit`, transient ARIA, or restoration markers.
- The complete 10-test offline Chromium suite passes. Workflow, dependency,
  runtime, logic, document-fidelity, 31-image, and 70-package assertions,
  recursive JavaScript syntax, diff whitespace, and the high-severity npm audit
  all pass; hosted CI retains checksum-pinned EPUBCheck 5.3.0.
- Correctness/reliability: 7/10 → 10/10; verifiability: 7/10 → 10/10;
  maintainability: 7/10 → 9/10; performance: 9/10 → 9/10; user experience:
  5/10 → 10/10; security/robustness: 9/10 → 9/10.

### Lessons and process improvements

- Accessibility state added inside editable content is also export state unless
  synchronization explicitly treats it as transient.
- Temporary semantics must restore pre-existing author attributes, not merely
  remove the value the application wrote.

### Explicit next opportunity

Audit the export canonicalizer for other preview-only classes or attributes
that could leak into EPUB content after an interactive edit session.

## Previous cycle: invalidate Find-in-book results when the document changes

### Why this was selected

Cycle 65 fixed query edits, but cached hit elements still survived direct book
edits and whole-file replacement. Next/Enter could report a stale count or
navigate an element detached from the current Kobo preview.

### Changes

- Clear search hits whenever editable preview content changes.
- Clear hits before any preview DOM replacement, file processing, or workspace
  reset; a full reset also clears the query.
- Extend the real Chromium search journey through direct paragraph editing and
  confirmed file replacement, preserving its prior query-change assertions.

### Verification and scores

- Test-first evidence: editing one of two Alpha paragraphs still reported `2
  of 2`; after that boundary was fixed, the replacement-book step exposed the
  test's real discard confirmation and proved the new document has no stale hit.
- The focused journey and complete 10-test offline Chromium suite pass after
  both production boundaries are covered. Workflow/dependency/runtime policy,
  logic, document fidelity, 31 image assertions, 70 EPUB package assertions,
  recursive JavaScript syntax, diff whitespace, and the high-severity npm
  audit all pass; hosted CI retains checksum-pinned EPUBCheck 5.3.0.
- Correctness/reliability: 6/10 → 10/10; verifiability: 7/10 → 10/10;
  maintainability: 8/10 → 9/10; performance: 9/10 → 9/10; user experience:
  5/10 → 10/10; security/robustness: 9/10 → 9/10.

### Lessons and process improvements

- DOM caches depend on both the query and the document generation; invalidate
  them whenever either identity changes.
- Browser replacement tests must explicitly exercise the product's unsaved-edit
  confirmation instead of relying on automation's default dialog dismissal.

### Explicit next opportunity

Add accessible current-match semantics (`aria-current` or equivalent) so
assistive technology can identify the active Find-in-book result, not only its
numeric live status.

## Previous cycle: invalidate stale Find-in-book results

### Why this was selected

The new Find-in-book feature cached its matched elements. Editing one non-empty
query into another left that cache intact, so Next and Enter navigated the old
term and reported its old result count.

### Changes

- Clear the hit cache and active highlight on every query edit, including
  non-empty-to-non-empty changes.
- Add a real Chromium TXT journey that changes `alpha` to `beta` and requires
  both the result count and highlighted paragraph to follow the new query.

### Verification and scores

- Test-first evidence: the new journey received `2 of 2` from the stale Alpha
  results instead of Beta's `1 of 1`.
- The focused journey and complete 10-test offline Chromium suite pass after
  the one-line invalidation. Workflow/dependency/runtime policies, logic,
  document fidelity, 31 image assertions, 70 EPUB package assertions,
  recursive JavaScript syntax, diff whitespace, and the high-severity npm
  audit all pass; hosted CI retains mandatory checksum-pinned EPUBCheck 5.3.0.
- Correctness/reliability: 7/10 → 10/10; verifiability: 6/10 → 10/10;
  maintainability: 8/10 → 9/10; performance: 9/10 → 9/10; user experience:
  6/10 → 10/10; security/robustness: 9/10 → 9/10.

### Lessons and process improvements

- Search caches need invalidation on query identity, not just on empty state.
- New interaction features should ship with a query-change journey, not only a
  source marker in the logic suite.

### Explicit next opportunity

Make Find-in-book refresh safely after the editable document changes so a
previous result cannot point at a detached node.

## Previous cycle: keep Diff editable

### Why this was selected

Diff already painted red/green marks on the same Kobo page, but the
surface was read-only. Users had to bounce back to Edit to revise text.

### Changes

- Edit and Diff share one contenteditable device surface and toolbar.
- Deletion marks stay non-editable; sync still unwraps insertions and
  drops deletion markup so EPUB output is the current body.
- Live change index updates while typing in Diff without replacing the
  caret DOM.

## Previous cycle: remember the last Kobo and name export stages

### Why this was selected

Returning visitors had to re-pick device, orientation, font, and margin before
the first preview was honest. Download also sat on a generic “Building EPUB”
label while images, packaging, and ZIP actually ran.

### Changes

- Persist sanitized device, orientation, font, margin, and chrome in
  `koboforge-device-v1` and restore them before the first preview paint.
- Invalid or unreadable stored values fail closed to the Libra Colour defaults.
- Download progress now names Images → Package → ZIP on the existing
  `#progressLabel` / `#status` UI. EPUB bytes are unchanged.

## Previous cycle: lead with drop, hide the brochure

### Why this was selected

The converter worked, but first paint was a 7xl title, six chips, and a
workflow essay before the dropzone. The request is a clean, minimalist
workspace.

### Changes

- Compact hero: one title line and a short reflowable-EPUB promise.
- Tighter import/preview/export cards; book metadata and options sit in
  a closed details panel; device spec sources collapse.
- IDs and dropzone → device → title order stay intact.

## Previous cycle: reject unresolved chapter image sources

### Why this was selected

Workspace rotation returned here after the portfolio cycle. Direct package
callers could still emit chapter HTML that pointed at a missing `images/*`
file or left `data:` / `blob:` URLs in place even when asset metadata looked
valid. That is a silent broken-image failure at the EPUB boundary.

### Changes

- Scan every chapter `img src` after assets are normalized.
- Reject leftover `data:`, `blob:`, and `file:` sources.
- Require non-remote sources to be exactly `images/<packaged-filename>`.
- Leave existing remote `http(s)` references allowed so the current extractor
  contract stays intact.
- Added seven package-boundary assertions and bumped the site stamp to
  `2026.08.18.1`.

### Verification and scores

- Test-first evidence: a packaged asset plus `images/missing.png` or a leftover
  data URL previously produced a complete EPUB.
- `node tools/test_epub_package.mjs`: 68 passed.
- `npm test`: workflow, dependency, logic, fidelity, 31 image, and 68 package
  assertions passed.
- `npm run test:browser`: 3 passed, including TXT and DOCX export through the
  new package check.
- Correctness/reliability: 6/10 → 9/10 (broken local image refs cannot ship).
- Verifiability: 7/10 → 10/10 (missing, data, blob, traversal, and mixed cases).
- Maintainability: 8/10 → 9/10 (one package-boundary helper owns image src policy).
- Performance: 9/10 → 9/10 (linear scan of chapter HTML).
- Security/robustness: 7/10 → 9/10 (data/blob/file and path traversal cannot enter the archive).
- Developer/user experience: 7/10 → 8/10 (export fails closed instead of shipping empty images).

### Lessons and process improvements

- Validate chapter HTML against the asset set, not just the asset set against
  itself. Manifest completeness does not imply reference completeness.
- Keep extractor and packager policies aligned when changing URL classes;
  remote `http(s)` is still an extractor-owned decision.

### Explicit next opportunity

Rotate to Seeking Biblical Truth. On the next KoboForge cycle, decide whether
remote chapter images should be rejected or rewritten at extract time.

## Previous cycle: cache EPUBCheck without weakening verification

### Why this was selected

Hosted CI downloaded the same immutable 33 MB EPUBCheck archive on every run,
even though its version and SHA-256 were already pinned. Caching that artifact
reduces network work and release-host dependence, but only if restored bytes
remain subject to the exact same checksum and standards gates.

### Changes

- Added the official Node 24 `actions/cache@v6` action after Java setup and
  before any EPUBCheck download.
- Cache only the release ZIP under an exact runner OS, EPUBCheck version, and
  committed SHA-256 key; no prefix restore keys can supply older bytes.
- Download only when the exact key misses, then run SHA-256 verification and
  extraction in a separate unconditional step for both cache states.
- Moved transient paths to GitHub's runner temp directory and retained standards
  validation before the more expensive Chromium installation.
- Added eight workflow-policy assertions for action runtime, path, key, exact
  hit branch, absence of prefix restore, and restore/download/verify ordering.
- Documented the cache trust model and bumped deployment version to
  `2026.08.11.5`.

### Verification and scores

- Test-first evidence: the expanded policy failed on the absent
  `actions/cache@v6` step before the workflow changed.
- Official action metadata reports current release `v6.1.0`; the v6 action and
  package declare Node 24.
- The focused workflow policy passes after implementation and preserves every
  prior least-privilege, pin, digest, ordering, and standards assertion.
- The complete dependency, runtime-dependency, logic, document-fidelity,
  31-assertion image, and 61-assertion package suites passed; the real package
  fixture again passed EPUBCheck 5.3.0 on Java.
- Both offline TXT and DOCX browser exports passed three consecutive runs each
  (six of six); recursive syntax, whitespace, and zero-vulnerability audit
  gates passed.
- Hosted CI attempt 1 exercised the miss path, verified the downloaded ZIP,
  passed EPUBCheck, and saved the exact 32 MB cache entry. An immediate rerun
  of the same commit hit that key, skipped the download, reverified the cached
  ZIP (`sha256sum: OK`), passed EPUBCheck, and completed successfully in 45s.
- GitHub Pages deployed successfully and the live site serves
  `2026.08.11.5`; the final working tree is clean and aligned with `origin/main`.
- Correctness/reliability: 9/10 → 10/10 (cache state cannot bypass byte or EPUB validation).
- Verifiability: 8/10 → 10/10 (both cache decisions and the trust sequence are policy-locked).
- Maintainability: 8/10 → 9/10 (one immutable key derives from existing source-of-truth pins).
- Performance/resources: 6/10 → 9/10 (exact hits avoid a repeated 33 MB download).
- Security/robustness: 8/10 → 10/10 (no stale prefix restore; every restored ZIP is checksum-gated).
- Developer experience: 7/10 → 9/10 (hosted reruns are less dependent on release download availability).

### Lessons and process improvements

- A cache is an optimization, not a trust source: verify restored artifacts in
  a separate unconditional step.
- Include the immutable digest in the key and omit prefix restore keys so a
  version change cannot silently reuse older tool bytes.
- Test workflow ordering as well as individual lines; correctness depends on
  restore → optional download → mandatory verify → execution.

## Previous cycle: require complete unique package image assets

### Why this was selected

The reusable package boundary validated image metadata but still generated an
ID when callers omitted one, accepted missing or empty bytes, allowed duplicate
manifest IDs, and silently overwrote duplicate archive filenames in its `Map`.
Image IDs could also collide with package-owned OPF identities such as `nav`,
`css`, `bookid`, or `ch1`, producing invalid publications from otherwise
well-shaped direct calls.

### Changes

- Require every image asset to provide an explicit non-empty ID and a non-empty
  `Uint8Array` or `ArrayBuffer` payload.
- Track image filenames during normalization and reject duplicates before the
  publication file map is created.
- Track all OPF identities from metadata, navigation, CSS, chapters, and images;
  reject duplicate image IDs and collisions with package-owned IDs.
- Added 17 direct-package assertions for missing IDs, absent/empty/wrong-width
  byte containers, valid `ArrayBuffer` input, duplicate IDs/filenames, and all
  current reserved-ID families.
- Documented the stronger archive boundary and bumped the deployment version to
  `2026.08.11.4`.

### Verification and scores

- Test-first evidence: an asset without an ID produced a valid-looking package
  under the previous builder because `image-1` was silently generated.
- The focused package suite passed all 61 assertions (up from 44).
- EPUBCheck 5.3.0 independently accepted the resulting real archive using the
  previously checksum-verified local tool.
- The complete workflow, dependency, runtime-dependency, logic, document
  fidelity, 31-assertion image, and 61-assertion package suite passed.
- Both offline TXT and DOCX browser imports/edits/downloads passed three
  consecutive runs each (six of six) with the new `2026.08.11.4` modules.
- `npm audit --audit-level=high` found zero vulnerabilities; recursive syntax,
  whitespace, and diff gates passed.
- Correctness/reliability: 6/10 → 10/10 (package entries cannot be missing, overwritten, or identity-conflicting).
- Verifiability: 8/10 → 10/10 (every missing/duplicate/reserved class has a direct boundary fixture).
- Maintainability: 8/10 → 9/10 (normalization owns one explicit identity set and filename set).
- Performance: 9/10 → 9/10 (linear set checks run once per image during export).
- Security/robustness: 7/10 → 10/10 (malformed direct inputs fail before any ZIP entries are assembled).
- Developer/user experience: 7/10 → 9/10 (callers receive precise early errors instead of JSZip or EPUBCheck failures).

### Lessons and process improvements

- A `Map` is not a duplicate detector: validate uniqueness before insertion or
  later assets silently replace earlier bytes.
- Manifest IDs share a namespace with package-owned metadata and spine items,
  so uniqueness must cover the whole OPF document rather than only image peers.
- Validate all assets before mutating the file map; a failed publication builder
  should not leave a partially assembled result.

## Previous cycle: enforce package image types and extensions

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
| 1 | Reject unsupported automatic chapter resource elements | Correctness / privacy | Medium-high | Small-medium / low | Direct package fixtures for media, frames, scripts, objects, and stylesheets plus one browser no-download journey | Next Cycle 71 |
| — | Reject CSS/SVG remote chapter resources | Correctness / privacy | Medium-high | Small-medium / low | Five package assertions, numeric-entity coverage, and a real no-download Chromium journey | Completed in Cycle 70 |
| — | Reject remote chapter images at extraction and package boundaries | Correctness / privacy | Medium-high | Small-medium / low | HTTP(S) and protocol-relative fixtures plus real no-download UI journey | Completed in Cycle 69 |
| — | Reject unresolved chapter image references at the package boundary | Correctness / robustness | Medium-high | Medium / low | Missing `images/*`, leftover data/blob/file URLs, and traversal now fail closed | Completed in Cycle 59 |
| — | Cache the verified EPUBCheck archive in CI | Performance / process | Low-medium | Small-medium / low | Exact platform/version/digest hits skip download; checksum and EPUBCheck remain mandatory | Completed in Cycle 58 |
| — | Reject duplicate or missing package asset identities/bytes | Correctness / robustness | Medium | Small-medium / low | Sixty-one package assertions cover required IDs/bytes, archive filenames, and the complete package-owned ID namespace | Completed in Cycle 57 |
| — | Enforce exact asset types/extensions at the archive boundary | Correctness / robustness | Medium | Small-medium / low | Forty-four package assertions cover five types, both JPEG suffixes, cross-type mismatches, unsupported types, separators, and basenames | Completed in Cycle 56 |
| — | Validate decoded image signatures against declared media types | Correctness / robustness | Medium | Medium / low | Thirty-one fixtures cover every accepted signature plus arbitrary, cross-type, and malformed payloads | Completed in Cycle 55 |
| — | Extend browser coverage to one DOCX fidelity fixture | Verification | High | Medium-large / medium | Offline real-browser upload/edit/download now preserves the slim sermon fixture through EPUB XHTML | Completed in Cycle 54 |

## Next cycle

Reject unsupported automatic resource-loading elements at the final package
boundary while keeping ordinary anchor hyperlinks intact.
