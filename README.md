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

On a phone, use the compact icon controls.

Working in this repo? See **[AGENTS.md](AGENTS.md)** for fidelity rules, EPUB packaging, and tests.

## Acknowledgements

PDF readability refinements—including detached verse-number recovery, preserved
poetry lineation, and reader-friendly default alignment—were informed by
[BABulletinBotV2](https://github.com/markusyeo/BABulletinBotV2) by
[Markus Yeo](https://github.com/markusyeo). His church bulletin converter is
itself built with credited adaptations from KoboForge; these refinements were
reimplemented here for the browser-only PDF.js workflow.

MIT. See [LICENSE](LICENSE).
