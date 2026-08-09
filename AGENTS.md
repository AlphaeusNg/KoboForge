# AGENTS.md — KoboForge

**Repo:** https://github.com/AlphaeusNg/KoboForge

**Live:** https://alphaeusng.github.io/KoboForge/

**Local:** `/home/alph/projects/KoboForge`

## Purpose

KoboForge is a zero-build, client-side document-to-EPUB application for Kobo
readers. It owns document parsing, automatic embedded-image optimization,
direct editing in paginated Kobo device previews, and EPUB packaging.

## Structure

```text
index.html
css/main.css
js/app.js
js/document-fidelity.js   # DOCX fidelity + Bible verse marker normalize
js/epub-package.js        # Browser-neutral reflowable EPUB package + ZIP builder
js/boot.js
js/version.js
tools/test_logic.mjs
tools/test_document_fidelity.mjs
tools/test_epub_package.mjs
tools/fixtures/           # slim DOCX fixtures (sermon outlines)
```

## Conventions

- Keep the application static: plain HTML/CSS/JS, no bundler unless requested.
- Keep all document processing local to the browser.
- Default to Kobo Libra Colour.
- Preserve the same paginated Kobo surface between Edit and Diff.
- Package embedded images as EPUB manifest assets, never unresolved data URLs.
- Horizontal alignment supports left/center/right/**justify**.
- Sermon-outline verse numbers: Word super/subscript (and plain leading digits)
  normalize to `<sup class="kf-verse-num">` and must never drop following prose.
- Lists: DOCX `numbering.xml` plan + plain/PDF markers (`1.`, `a.`, bullets)
  rebuild into nested lists; toolbar list commands use `toggleList`, not only
  `execCommand`.
- Always reflowable/editable — no fixed-layout EPUB mode or layout picker UI.
- Bump `js/version.js` for every deployment using `YYYY.MM.DD.N`.
- GitHub Pages serves the repository root from `main`.

## Validation

```bash
node --check js/app.js
node --check js/document-fidelity.js
node --check js/epub-package.js
node --check js/version.js
npm install
npm test
npx playwright install chromium
npm run test:browser
python3 -m http.server 8000
```

Check desktop and mobile rendering, browser console errors, DOCX/PDF inline
images, device retargeting, direct edits, and EPUB ZIP contents.

## Relationship to the portfolio

The portfolio at `/home/alph/projects/alphaeusng.github.io` links to this
project but must not contain a second implementation. Its legacy
`/pages/kobo-forge.html` route is only a compatibility redirect.
