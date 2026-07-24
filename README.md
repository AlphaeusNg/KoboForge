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
  alignment, placement, font-size, link, image movement/resize, table, writing
  space, and source-page layout changes
- Compact icon-only phone controls with hover/tap labels, separate horizontally
  scrollable text and image/table rows, and pinned page arrows beside them
- Selectable inline images with Kobo-view cut, copy, paste, and delete controls
  plus dynamic width resizing and standard keyboard/clipboard-event support
- Compact conversion summary with three facts and one high-level observation
- Locked edit pagination: deletion reflows later paragraphs without viewport drift
- Left/center/right and top/middle/bottom placement, font sizing, Word-style
  Tab behavior, editable table insertion, and HTML source mode
- DOCX image extraction and automatic Kobo-targeted resizing/tone mapping
- PDF image extraction with inline scan-page fallback
- Robust PDF whitespace analysis that preserves large worksheet/note regions
- PDF source-page divisions locked to Kobo page starts, with coordinate-aware
  vertical/horizontal placement and preserved intentional writing space
- Page-level reading-column separation that prevents left/right text interleaving
- Sentence-aware PDF line joining that reflows visual lines into real paragraphs
- Conservative PDF table detection requiring ruled-grid or distinct header evidence
- PDF font profiling that retains relative size, family type, weight, and slant
- Wide PDF column gaps that remain separated and wrap cleanly on narrow Kobos
- Auto/Fixed/Reflowable layout choice directly below upload
- PDF design-complexity scoring across images, columns, positioned blocks,
  vector graphics, font profiles, tables, and intentional whitespace
- EPUB 3 fixed-layout facsimile export with one viewport/spine item per PDF
  page, source-page previews, hidden extracted text, and Kobo
  `.fxl.kepub.epub` sideload naming
- Reflowable EPUB3 export with nav + NCX and packaged image manifest assets
- Fully local browser processing; documents are never uploaded

Fixed layout is intended for graphic-heavy PDFs whose exact visual hierarchy
matters more than resizable text. It preserves the source page appearance but
is deliberately read-only; switch to Reflowable to edit text or use Diff.

## Structure

```text
index.html            # GitHub Pages entry point
css/main.css          # KoboForge presentation
js/app.js             # Conversion, editing, preview, and EPUB application
js/fixed-layout.js    # Browser-neutral fixed-layout scoring/package contract
js/version.js         # Deployment stamp
tools/test_logic.mjs  # Lightweight regression contracts
tools/test_fixed_epub.mjs # Real EPUB fixture + optional EPUBCheck validation
```

The site intentionally uses plain HTML, CSS, and JavaScript with no build step.
Runtime conversion libraries load from CDNs.

## Local development

```bash
python3 -m http.server 8000
# http://127.0.0.1:8000/

node --check js/app.js
node --check js/fixed-layout.js
node --check js/version.js
node tools/test_logic.mjs
node tools/test_fixed_epub.mjs

# Optional standards validation
EPUBCHECK_JAR=/path/to/epubcheck.jar node tools/test_fixed_epub.mjs
```

## Privacy

All document parsing, editing, image conversion, and EPUB creation happen in
the browser. Nothing is sent to an application server.

## License

MIT. See [LICENSE](LICENSE).
