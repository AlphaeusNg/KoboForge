# Real-document conversion corpus

Put representative documents that you actually convert with KoboForge in this
folder. The Playwright suite discovers every supported file automatically,
imports it through the real browser UI, checks the editable Kobo preview, and
opens the downloaded EPUB to verify that packaging completed safely.

Supported corpus formats match the app: `.docx`, `.pdf`, `.txt`, `.md`,
`.markdown`, `.png`, `.jpg`, `.jpeg`, `.gif`, and `.webp`. An unrecognized file
extension fails the corpus check instead of being silently skipped.

For stronger content-regression checks, add an entry to `expectations.json`.
`minWords` catches unexpectedly empty or truncated text, `contains` lists stable
phrases that must survive both preview and EPUB export, and `sourcePages`
checks exact PDF page recovery and ordering. Files without an entry still receive the complete
import-and-export smoke test.

This repository is public. Do not add private, confidential, licensed-only, or
secret-bearing documents. Keep fixtures reasonably small so the browser suite
stays useful on every commit.
