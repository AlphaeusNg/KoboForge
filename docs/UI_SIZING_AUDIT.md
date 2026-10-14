# KoboForge UI sizing audit

Date: 2026-10-14. Starting revision: 4333d14. Release: 2026.10.14.2.

## Coverage and method

Chromium rendered real application flows at 320, 375, 768 and 1280 CSS pixels,
plus 1280px with CSS zoom 200% and 375px with root text size doubled to 32px.
The latter are representative enlargement checks, not browser menu zoom or an
operating-system text setting. Network font/dependency requests were blocked;
the local production stylesheet and browser fallback fonts were used.

Each of six scenarios captures nine states: empty import with book settings
expanded, imported image with description controls selected, table-size dialog,
HTML editor, Diff editor, backup saved, EPUB downloaded, recovery choice after
reload, and restored book. Measurements cover visible button/input/select/link/
summary bounds and text bounds. Assertions check document width and selected-image
controls against every clipping ancestor. The full production browser suite also
exercises TXT, DOCX, real PDF/DOCX fixtures, cancellation, editing, clipboard images,
backup restoration, and archive contents.

## Findings and changes

| Finding | Evidence before | Resolution and measured result |
| --- | --- | --- |
| Image-description editor was clipped by the fixed-height toolbar | Its bounds existed, but an overflow-hidden ancestor hid the panel below the two icon rows | Moved the panel below the compact toolbar; description, Save and decorative controls have no clipping ancestor in all six scenarios |
| Horizontal overflow with enlarged text | 375px viewport expanded to 426px | Long title/specification text wraps; text buttons stay within their container. All nine enlarged-text states now remain 375px wide |
| Small slider hit areas | Device font/margin and image-width inputs were 16px high | Inputs are at least 24px high, keeping existing visual tracks and compact toolbar; the decorative-image label also has a 24px minimum target height |
| Header return link had a 20px target height | Measured isolated Craft link | Minimum 24px height without enlarging surrounding chrome |
| Upstream Tailwind update broke validation | Clean npm test failed with `tailwindcss: not found` | Separate prerequisite commits use the official matching v4 CLI and import syntax; visibility precedence remains explicit and the stylesheet gate passes |

Phone icon toolbar and page-arrow buttons retain their approximately 27.5px square
size; desktop toolbar controls remain approximately 30.4px square. Their rows stay
horizontally scrollable. They were not enlarged to 44px across the board or reduced
to gain room. At 320px the description input is 186×36px, Save is 118×36px, and EPUB
Download is approximately 165×40px. Settings checkboxes retain their larger clickable
label regions; inline attribution links remain in flowing text.

No measured button label clips in the recorded states. No page-level horizontal
overflow remains in the six scenarios. The main import/export actions retain their
existing prominence. The table picker and HTML/Diff controls remain usable through
real clicks, including phone and enlarged-text scenarios.

## Reproduction and evidence

Run `npm ci`, `npm test`, and `npm run test:browser`. The browser suite includes
`tools/browser/sizing-audit.spec.mjs`. Set `SIZING_OUTPUT` to choose an artifact
directory; default is `/tmp/kobo-sizing-audit` for local measurement output.
Each scenario writes a JSON measurement report and nine screenshots.

Final audit artifacts for this release are at `/tmp/kobo-sizing-complete/`:
`320-image-editor.png`, `375-image-editor.png`, `768-table-dialog.png`,
`1280-image-editor.png`, `1280-zoom200-image-editor.png`, and
`375-text200-image-editor.png` are representative captures. Before-fix evidence
is at `/tmp/kobo-sizing-before/`. These temporary artifacts are not deployed.

## Validation and limits

Full npm gate, 41 Chromium journeys (35 existing + six audit scenarios), recursive
JavaScript syntax and diff checks passed. The six measurement reports cover 54
screenshots/states. No physical Kobo, mobile browser, Safari/Firefox or native
browser file/confirmation dialog rendering is claimed. Document content can
intentionally paginate horizontally within the Kobo surface; toolbar lanes can
scroll horizontally without page-level overflow. Very large authored table/image
content is a document-fidelity concern, not a guarantee made by this UI audit.

The official Tailwind v4 CLI brings a development-only @parcel/watcher → braces
advisory. No patched braces release was available during inspection. The build is
one-shot and does not start its watcher; this is exposure context, not a security
fix. Existing dependency advisories are outside this sizing release. Migration
reference: https://tailwindcss.com/docs/upgrade-guide.
