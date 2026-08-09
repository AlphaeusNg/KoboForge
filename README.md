# KoboForge

KoboForge is a private, client-side EPUB workflow for Kobo readers.

**Live:** https://alphaeusng.github.io/KoboForge/

It imports DOCX, PDF, TXT, and Markdown; reconstructs document structure;
automatically optimizes embedded images for the selected Kobo; and lets users
edit directly inside an accurately proportioned, paginated device preview
before exporting a Kobo-friendly EPUB.

## Features

- Published Kobo screen resolutions, pixel densities, and body proportions
- Kobo Libra Colour default, plus Clara BW/Colour, Sage, and Elipsa 2E
- Responsive device staging that shrinks with the selected Kobo on phones
- Direct editing in the paginated Kobo view, with a layout-identical in-device
  Diff mode that overlays red removals and green additions
- Comprehensive Edit History for word, heading, bold/italic/underline/strike,
  alignment, placement, font-size, link, table, writing space, and source-page
  layout changes
- Compact icon-only phone controls with hover/tap labels, separate horizontally
  scrollable text/table rows, and pinned page arrows beside them
- Images can be dropped or pasted directly into the Kobo page, selected,
  resized, wrapped, cut/copied, and dragged to a new document position
- Aspect-ratio-aware image defaults sized to the selected Kobo and the remaining
  space on the detected PDF source page
- Compact conversion summary with three facts and one high-level observation
- Locked edit pagination: deletion reflows later paragraphs without viewport drift
- Left/center/right/justify text alignment, table-cell top/middle/bottom
  alignment that preserves row height, font sizing, Word-style Tab behavior,
  Google-Docs-style 1×1 through 5×5 table insertion, and HTML source mode
- Bible verse number detection for sermon outlines: Word super/subscript digits
  (and plain leading verse numbers) normalize to `<sup class="kf-verse-num">`
  and survive DOCX→EPUB without cutting off verse prose
- DOCX Word numbering (`1.` / `a.` / bullets) and plain/PDF list markers rebuild
  as real nested `<ol>`/`<ul>` with indentation; editor list buttons use a
  custom toggle that works in the paginated preview
- DOCX image extraction and automatic Kobo-targeted resizing/tone mapping
- Authored DOCX page breaks, paragraph/section breaks, and inherited Word
  bold/italic styles preserved through preview and EPUB export
- PDF image extraction with inline scan-page fallback
- Robust PDF whitespace analysis that preserves large worksheet/note regions
- PDF source-page divisions locked to Kobo page starts, with coordinate-aware
  vertical/horizontal placement and preserved intentional writing space
- Page-level reading-column separation that prevents left/right text interleaving
- Sentence-aware PDF line joining that reflows visual lines into real paragraphs
- Conservative PDF table detection requiring ruled-grid or distinct header evidence
- PDF font profiling that retains relative size, family type, weight, and slant
- Wide PDF column gaps that remain separated and wrap cleanly on narrow Kobos
- Always-reflowable EPUB: every DOCX/PDF/TXT/Markdown convert stays editable
  in the Kobo preview (Edit / Diff / HTML) with resizable text
- PDF design-complexity signals still inform reconstruction (columns, tables,
  whitespace, fonts) without locking the book into a non-editable facsimile
- Reflowable EPUB3 export with nav + NCX and packaged image manifest assets
- Fully local browser processing; documents are never uploaded

## Structure

```text
index.html            # GitHub Pages entry point
css/main.css          # KoboForge presentation
js/app.js             # Conversion, editing, preview, and EPUB application
js/document-fidelity.js # DOCX/HTML break and typography normalization
js/boot.js            # Loads the app with the centralized deployment version
js/version.js         # Deployment stamp
tools/test_logic.mjs  # Lightweight regression contracts
tools/test_document_fidelity.mjs # Functional DOCX/HTML fidelity matrix
tools/fixtures/       # Slim DOCX fixtures (e.g. Numbers 13–15 outline)
```

The site intentionally uses plain HTML, CSS, and JavaScript with no build step.
Runtime conversion libraries load from CDNs.

## Local development

```bash
python3 -m http.server 8000
# http://127.0.0.1:8000/

node --check js/app.js
node --check js/document-fidelity.js
node --check js/version.js
npm install
npm test
```

## Privacy

All document parsing, editing, image conversion, and EPUB creation happen in
the browser. Nothing is sent to an application server.

## License

MIT. See [LICENSE](LICENSE).
