# KoboForge

Private, **client-side** EPUB workflow for Kobo readers. Nothing is uploaded.

**[Open KoboForge](https://alphaeusng.github.io/KoboForge/)**

The live site *is* the demo. Import a file, preview it on a Kobo-sized page, export EPUB. All in the browser.

It imports DOCX, PDF, TXT, and Markdown; rebuilds structure; optimizes images for the selected Kobo; and lets you edit inside an accurately proportioned, paginated device preview.

## Try it

1. Open **[KoboForge](https://alphaeusng.github.io/KoboForge/)**.
2. Pick a device (Libra Colour is the default; Clara, Sage, and Elipsa 2E are there too).
3. Drop in a `.txt` or `.docx` (a sermon outline works well).
4. Edit in the paginated preview, then export a Kobo-friendly EPUB.

On a phone, use the compact icon controls. Hold-to-adjust image size should not swing the page (that fix is in progress separately).

## What it is careful about

- Published Kobo screen sizes and body proportions
- Images dropped or pasted onto the page, resized for that Kobo
- DOCX numbering, verse superscripts, page breaks, and writing space
- PDF columns, tables, and whitespace reconstructed into a reflowable EPUB3
- Processing stays in the browser. Documents never go to an application server.

## Develop

Zero-build HTML/CSS/JS. Runtime conversion libraries load from CDNs only when needed.

```bash
python3 -m http.server 8000
# http://127.0.0.1:8000/

npm install
npm test
npx playwright install chromium
npm run test:browser
```

MIT. See [LICENSE](LICENSE).
