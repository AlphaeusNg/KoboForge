# AGENTS.md — KoboForge

Visitor-facing docs live in [README.md](README.md). This file is for agents and local workflow.

**Repo:** https://github.com/AlphaeusNg/KoboForge

**Live:** https://alphaeusng.github.io/KoboForge/

**Local:** `/home/alph/projects/KoboForge`

## Purpose

KoboForge is a zero-build, client-side document-to-EPUB application for Kobo readers. It owns document parsing, automatic embedded-image optimization, direct editing in paginated Kobo device previews, and EPUB packaging. Fully local browser processing; documents are never uploaded.

## Structure

```text
index.html            # GitHub Pages entry point
css/main.css          # KoboForge presentation
js/app.js             # Conversion, editing, preview, and EPUB application
js/document-fidelity.js # DOCX/HTML break and typography normalization
js/epub-images.js     # Embedded-image cleanup, decoding, signatures, and deduplication
js/epub-package.js    # Reflowable EPUB files and tested archive adapter
js/runtime-dependencies.js # Retryable on-demand CDN dependency loading
js/boot.js            # Loads the app with the centralized deployment version
js/version.js         # Deployment stamp
tools/test_logic.mjs
tools/test_document_fidelity.mjs
tools/test_epub_images.mjs
tools/test_epub_package.mjs
tools/test_runtime_dependencies.mjs
tools/test_workflow.mjs
tools/browser/koboforge.spec.mjs
playwright.config.mjs
tools/fixtures/       # slim DOCX fixtures (e.g. Numbers 13–15 outline)
```

Runtime conversion libraries load from CDNs only when their workflow needs them; failed loads show a retryable connection error rather than disabling other formats.

## Conventions

- Keep the application static: plain HTML/CSS/JS, no bundler unless requested.
- Keep all document processing local to the browser.
- Default to Kobo Libra Colour. Also Clara BW/Colour, Sage, and Elipsa 2E.
- Preserve the same paginated Kobo surface between Edit and Diff.
- Package embedded images as EPUB manifest assets, never unresolved data URLs.
- Horizontal alignment supports left/center/right/**justify**.
- Sermon-outline verse numbers: Word super/subscript (and plain leading digits) normalize to `<sup class="kf-verse-num">` and must never drop following prose.
- Lists: DOCX `numbering.xml` plan + plain/PDF markers (`1.`, `a.`, bullets) rebuild into nested lists; toolbar list commands use `toggleList`, not only `execCommand`.
- Always reflowable/editable — no fixed-layout EPUB mode or layout picker UI.
- Conversion summary shows word count, estimated reading time, and Kobo page count.
- Compact icon-only phone controls with hover/tap labels; hold-to-adjust image size must not swing the page.
- Bump `js/version.js` for every deployment using `YYYY.MM.DD.N`.
- GitHub Pages serves the repository root from `main`.

## Fidelity notes worth keeping

- Aspect-ratio-aware image defaults sized to the selected Kobo and remaining space on the detected PDF source page
- Locked edit pagination: deletion reflows later paragraphs without viewport drift
- PDF image extraction with inline scan-page fallback; whitespace analysis preserves worksheet/note regions
- PDF source-page divisions locked to Kobo page starts; gutter-validated column separation; sentence-aware line joining
- Conservative PDF table detection requiring ruled-grid or distinct header evidence
- Actionable download errors identify malformed/empty/unsupported images without exposing encoded contents or private URLs
- Package boundary restricts image manifest types, unique IDs/filenames, non-empty binaries, locally embedded chapter image references; CSS/SVG must resolve to declared local assets; scripts/frames/forms rejected; ordinary hyperlinks remain

## Validation

```bash
node --check js/app.js
node --check js/document-fidelity.js
node --check js/epub-package.js
node --check js/runtime-dependencies.js
node --check js/version.js
npm install
npm test
npx playwright install chromium
npm run test:browser
python3 -m http.server 8000
# Optional: EPUBCHECK_JAR=/path/to/epubcheck.jar node tools/test_epub_package.mjs
```

Hosted CI validates the package fixture with pinned EPUBCheck `5.3.0` on Java 21; the ZIP is checksummed before execution. The browser suite injects locked JSZip and Mammoth bundles, blocks network dependencies, and verifies TXT plus the slim sermon DOCX through downloaded EPUB contents.

Check desktop and mobile rendering, browser console errors, DOCX/PDF inline images, device retargeting, direct edits, and EPUB ZIP contents.

## Relationship to the portfolio

The portfolio at `/home/alph/projects/alphaeusng.github.io` links to this project but must not contain a second implementation. Its legacy `/pages/kobo-forge.html` route is only a compatibility redirect.
