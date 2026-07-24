/**
 * Lightweight regression tests for KoboForge pure logic (no browser).
 * Run: node tools/test_logic.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const htmlPath = join(__dirname, '../index.html');
const jsPath = join(__dirname, '../js/app.js');
const cssPath = join(__dirname, '../css/main.css');
const versionPath = join(__dirname, '../js/version.js');
const html = readFileSync(htmlPath, 'utf8');
const script = readFileSync(jsPath, 'utf8');
const styles = readFileSync(cssPath, 'utf8');
const versionScript = readFileSync(versionPath, 'utf8');
const page = [html, script, styles].join('\n');

function assertIncludes(label, needle) {
    assert.ok(page.includes(needle), `missing ${label}: ${needle}`);
}

// —— Page feature contract ——
assert.ok(
    /rel="stylesheet" href="css\/main\.css\?v=[^"]+"/.test(html),
    'KoboForge must load its grouped stylesheet'
);
assert.ok(
    /type="module" src="js\/app\.js\?v=[^"]+"/.test(html),
    'KoboForge must load its grouped application module'
);
const deploymentVersion = versionScript.match(/\bid:\s*"([^"]+)"/)?.[1];
assert.ok(deploymentVersion, 'deployment version must be declared');
for (const asset of ['css/main.css', 'js/version.js', 'js/app.js']) {
    assert.ok(
        html.includes(`${asset}?v=${deploymentVersion}`),
        `${asset} must be cache-busted with the deployment version`
    );
}
assert.ok(!html.includes('<script type="module">'), 'application code must not remain inline');

const features = [
    ['edit mode', 'data-mode="edit"'],
    ['diff mode', 'data-mode="diff"'],
    ['html mode', 'data-mode="html"'],
    ['canonicalize export', 'forExport'],
    ['page break round-trip', 'kf-page-break'],
    ['page label data-page', "setAttribute('data-page'"],
    ['ncx', 'toc.ncx'],
    ['diagnostics', 'function renderDiagnostics'],
    ['outline', 'chapterOutline'],
    ['prefs', 'koboforge.prefs.v3'],
    ['heading heuristic', 'lineLooksLikeHeading'],
    ['list markdown', 'listBlockToHtml'],
    ['confirm discard', 'Re-extracting will discard'],
    ['Kobo device profiles', 'KOBO_DEVICE_PROFILES'],
    ['paginated device surface', 'function layoutDevicePages'],
    ['physically scaled device stage', '--device-relative-width'],
    ['locked edit viewport', 'function beginEditablePageLock'],
    ['device page controls', 'devicePageNext'],
    ['automatic document image optimizer', 'function optimizeDocumentImages'],
    ['PDF image extraction', 'function extractPdfPageImages'],
    ['PDF intentional whitespace detector', 'function detectPdfWhitespace'],
    ['PDF embedded font metadata', 'function collectPdfFontMetadata'],
    ['PDF portable typography runs', 'function renderPdfRunsHtml'],
    ['PDF source-page layout', 'function detectPdfPageLayout'],
    ['PDF block position', 'function detectPdfBlockPosition'],
    ['PDF page-level reading columns', 'function detectPdfReadingColumns'],
    ['PDF stable two-column tables', 'function stableTwoColumnLineIndexes'],
    ['EPUB image assets', 'function extractEmbeddedImagesForEpub'],
    ['Floyd–Steinberg dithering', 'Floyd–Steinberg'],
];
for (const [label, needle] of features) assertIncludes(label, needle);

// —— Pure helpers mirrored from page (keep in sync if algorithms change) ——
function escapeHtml(text) {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function isMarkdownTableBlock(block) {
    const lines = block.trim().split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length < 2) return false;
    if (!lines.every((l) => l.includes('|'))) return false;
    const sep = lines[1].replace(/\s/g, '');
    return /^\|?[:\-]+(\|[:\-]+)+\|?$/.test(sep);
}

function markdownTableToHtml(block) {
    const lines = block.trim().split('\n').map((l) => l.trim()).filter(Boolean);
    const parseRow = (line) => {
        let s = line.trim();
        if (s.startsWith('|')) s = s.slice(1);
        if (s.endsWith('|')) s = s.slice(0, -1);
        return s.split('|').map((c) => c.trim());
    };
    const header = parseRow(lines[0]);
    const body = lines.slice(2).map(parseRow);
    let out = '<table class="kobo-table"><tr>';
    header.forEach((cell) => { out += `<th>${escapeHtml(cell)}</th>`; });
    out += '</tr>';
    body.forEach((row) => {
        out += '<tr>';
        for (let i = 0; i < header.length; i += 1) {
            out += `<td>${escapeHtml(row[i] || '')}</td>`;
        }
        out += '</tr>';
    });
    out += '</table>';
    return out;
}

function isListBlock(block) {
    const lines = block.trim().split('\n').filter((l) => l.trim());
    if (!lines.length) return false;
    return lines.every((l) => /^\s*([-*+]|\d+\.)\s+/.test(l));
}

function clusterColumnXs(xs, tolerance) {
    if (!xs.length) return [];
    const sorted = [...xs].sort((a, b) => a - b);
    const clusters = [[sorted[0]]];
    for (let i = 1; i < sorted.length; i += 1) {
        const last = clusters[clusters.length - 1];
        const center = last.reduce((s, v) => s + v, 0) / last.length;
        if (Math.abs(sorted[i] - center) <= tolerance) last.push(sorted[i]);
        else clusters.push([sorted[i]]);
    }
    return clusters.map((c) => c.reduce((s, v) => s + v, 0) / c.length);
}

function median(arr) {
    if (!arr.length) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function detectPdfWhitespace(builtLines, { pageHeight = 0 } = {}) {
    if (!builtLines || builtLines.length < 2) return { typicalAdvance: 0, spaces: [] };
    const medianHeight = median(
        builtLines.map((line) => line.maxHeight || line.lineHeight || 10)
    ) || 10;
    const gaps = [];
    for (let index = 0; index < builtLines.length - 1; index += 1) {
        const gap = builtLines[index].y - builtLines[index + 1].y;
        if (Number.isFinite(gap) && gap > medianHeight * 0.55) gaps.push({ index, gap });
    }
    if (!gaps.length) return { typicalAdvance: medianHeight * 1.5, spaces: [] };
    const ordinaryLimit = Math.max(medianHeight * 2.6, Number(pageHeight || 0) * 0.045);
    const ordinaryGaps = gaps.map((entry) => entry.gap).filter((gap) => gap <= ordinaryLimit);
    const typicalAdvance = median(ordinaryGaps)
        || median(gaps.map((entry) => entry.gap))
        || medianHeight * 1.5;
    const significantGap = Math.max(
        typicalAdvance * 1.65,
        medianHeight * 2.75,
        Number(pageHeight || 0) * 0.045
    );
    const minimumSurplus = Math.max(medianHeight * 1.05, Number(pageHeight || 0) * 0.018);
    const spaces = gaps
        .filter((entry) => (
            entry.gap >= significantGap
            && entry.gap - typicalAdvance >= minimumSurplus
        ))
        .map((entry) => ({
            ...entry,
            lines: Math.max(
                2,
                Math.min(12, Math.round((entry.gap - typicalAdvance) / medianHeight))
            )
        }));
    return { typicalAdvance, medianHeight, spaces };
}

function describePdfFont(name, fallbackFamily = '') {
    const sourceName = String(name || '')
        .replace(/^[A-Z]{6}\+/, '')
        .replace(/[_-]+/g, ' ')
        .trim();
    const sourceKey = sourceName.toLowerCase();
    const key = `${sourceName} ${fallbackFamily}`.toLowerCase();
    let family = /\bserif\b/.test(String(fallbackFamily).toLowerCase())
        && !/\bsans[- ]?serif\b/.test(String(fallbackFamily).toLowerCase())
        ? 'serif'
        : 'sans';
    if (/(script|hand|brush|calligraph|amsterdam|cursive)/.test(sourceKey)) family = 'script';
    else if (/(mono|courier|consolas|menlo|typewriter|code)/.test(sourceKey)) family = 'mono';
    else if (/(serif|times|georgia|garamond|baskerville|palatino|playfair|cooper|cambria|bookman|didot|bodoni|caslon|lora|merriweather|constantia)/.test(sourceKey)) family = 'serif';
    else if (/(sans|arial|helvetica|montserrat|garet|canva|roboto|calibri|avenir|verdana|futura|gotham|lato)/.test(sourceKey)) family = 'sans';
    return {
        sourceName: sourceName || fallbackFamily || 'Unknown',
        family,
        bold: /(bold|black|heavy|semibold|semi bold|demi)/.test(key),
        italic: /(italic|oblique|slanted)/.test(key),
        light: /(light|thin|extralight|extra light)/.test(key)
    };
}

// Table detection sample
const mdTable = `| Feature | Benefit |
| --- | --- |
| Edit | Fix PDF |
| TOC | Navigate |`;
assert.equal(isMarkdownTableBlock(mdTable), true);
const tableHtml = markdownTableToHtml(mdTable);
assert.match(tableHtml, /<table class="kobo-table">/);
assert.match(tableHtml, /<th>Feature<\/th>/);
assert.match(tableHtml, /<td>Fix PDF<\/td>/);

// List
const list = `1. Open Edit
2. Fix heading
3. Export`;
assert.equal(isListBlock(list), true);
assert.equal(isListBlock('not a list'), false);

// Column clustering
const cols = clusterColumnXs([10, 12, 100, 102, 200], 5);
assert.equal(cols.length, 3);
assert.ok(Math.abs(cols[0] - 11) < 1);

// Soft hyphen join simulation
function joinHyphen(prev, next) {
    if (/[A-Za-z]-$/.test(prev) && /^[a-z]/.test(next)) {
        return prev.replace(/-$/, '') + next;
    }
    return null;
}
assert.equal(joinHyphen('reconstruc-', 'tion'), 'reconstruction');
assert.equal(joinHyphen('hello', 'world'), null);

// Worksheet whitespace: retain the two genuine writing regions, not normal spacing.
const worksheetPageLines = [
    [795, 18], [773.3, 18], [679.2, 13], [654.8, 13],
    [626.3, 13], [597.8, 13], [425.2, 13]
].map(([y, maxHeight]) => ({ y, maxHeight, lineHeight: maxHeight }));
const worksheetSpaces = detectPdfWhitespace(worksheetPageLines, { pageHeight: 842.2 }).spaces;
assert.deepEqual(worksheetSpaces.map((space) => space.index), [1, 5]);
assert.ok(worksheetSpaces[1].lines >= 10, 'large worksheet response area should remain large');
const ordinaryLines = [100, 78, 56, 34].map((y) => ({ y, maxHeight: 13, lineHeight: 13 }));
assert.equal(
    detectPdfWhitespace(ordinaryLines, { pageHeight: 842.2 }).spaces.length,
    0,
    'ordinary line leading must not turn into blank writing space'
);

// Embedded PDF names become portable traits without pretending the font is installed on Kobo.
assert.deepEqual(
    describePdfFont('AAAAAA+Amsterdam-Four', 'sans-serif').family,
    'script'
);
assert.equal(describePdfFont('CAAAAA+Montserrat-Bold').bold, true);
assert.equal(describePdfFont('CAAAAA+Montserrat-Bold', 'sans-serif').family, 'sans');
assert.equal(describePdfFont('DAAAAA+PlayfairDisplay-Regular').family, 'serif');
assert.equal(describePdfFont('Subset+Courier-Oblique').italic, true);

// Escape
assert.equal(escapeHtml('a < b & c'), 'a &lt; b &amp; c');

// Published Kobo profile contract
const deviceSpecs = [
    ['Clara screen', 'screenWidth: 1072'],
    ['Clara screen height', 'screenHeight: 1448'],
    ['Libra screen', 'screenWidth: 1264'],
    ['Libra screen height', 'screenHeight: 1680'],
    ['Sage screen', 'screenWidth: 1440'],
    ['Sage screen height', 'screenHeight: 1920'],
    ['Elipsa screen', 'screenWidth: 1404'],
    ['Elipsa screen height', 'screenHeight: 1872'],
    ['Elipsa density', 'ppi: 227'],
    ['Clara body width', 'bodyWidth: 112'],
    ['Elipsa body width', 'bodyWidth: 193'],
];
for (const [label, needle] of deviceSpecs) assertIncludes(label, needle);
assert.ok(page.includes('widestBodyMm') && page.includes('--device-relative-width'),
    'smaller Kobo bodies must stay proportionally smaller when the phone width is constrained');
assert.ok(
    ![...styles.matchAll(/\.device-stage\s*\{([^}]*)\}/g)]
        .some((match) => /min-height\s*:/.test(match[1])),
    'device stage must size to its frame instead of reserving empty fixed height'
);

// ensureChapterTitle behavior (mirror)
function ensureChapterTitle(html, title) {
    const trimmed = (html || '').trim();
    if (/^<h[12][\s>]/i.test(trimmed)) return trimmed;
    if (/^<section[^>]*\bkf-pdf-page\b/i.test(trimmed)) return trimmed;
    return `<h1>${escapeHtml(title)}</h1>${trimmed}`;
}
assert.equal(
    ensureChapterTitle('<h2>Intro</h2><p>Hi</p>', 'Intro'),
    '<h2>Intro</h2><p>Hi</p>',
    'must not double-title H2 chapters'
);
assert.match(
    ensureChapterTitle('<p>only prose</p>', 'Doc'),
    /^<h1>Doc<\/h1>/
);
assert.equal(
    ensureChapterTitle(
        '<section class="kf-pdf-page kf-page-offset-2"><p>Source page</p></section>',
        'PDF title'
    ),
    '<section class="kf-pdf-page kf-page-offset-2"><p>Source page</p></section>',
    'PDF source pages must not gain a synthetic title page absent from Edit'
);

assert.ok(page.includes("root.querySelectorAll('.kf-page-label')"), 'page labels canonicalize to stable anchors');
assert.ok(page.includes('bookUrn'), 'NCX/OPF shared urn');
assert.ok(page.includes('ensureChapterTitle'), 'export title helper');
assert.ok(page.includes('formatBlockTag') || page.includes('block-fmt-btn'), 'edit toolbar');
assert.ok(page.includes('data-cmd="bold"') && page.includes('data-cmd="italic"'), 'bold/italic toolbar');
assert.ok(page.includes('strong,b{font-weight:700'), 'EPUB bold CSS');
assert.ok(page.includes('em,i{font-style:italic'), 'EPUB italic CSS');
assert.ok(page.includes('function runFormatCommand'), 'inline format commands');
assert.ok(page.includes('insertUnorderedList') && page.includes('insertOrderedList'), 'list toolbar');
assert.ok(page.includes('stripInvalidXmlChars'), 'XML control-char strip for Kobo');
assert.ok(!script.includes("if (/\\//.test(match.slice(0, -1)))"),
    'EPUB void-tag detection must not mistake image path slashes for self-closing XHTML');
assert.ok(page.includes('arrayBuffer.slice(0)'), 'PDF buffer copy before getDocument');
assert.ok(page.includes('Failed to extract page'), 'per-page PDF isolation');
assert.ok(page.includes('MAX_SOURCE_IMAGE_B64') && page.includes('optimizeDocumentImages(doc.body.innerHTML)'),
    'DOCX images accepted then optimized for the selected Kobo');
assert.ok(page.includes('extractPdfPageImages(page') && page.includes('renderPdfPageAsImage(page)'),
    'PDF embedded images and scanned pages are preserved inline');
assert.ok(page.includes('retargetCurrentDocumentImages') && page.includes('data-kf-image-id'),
    'changing the selected Kobo re-targets imported images');
assert.ok(page.includes('images/${asset.fileName}') && page.includes('imageManifestItems'),
    'EPUB packages converted images as manifest assets');
assert.ok(page.includes('dropzoneReady') && page.includes('File received'), 'dropzone received state');
assert.ok(page.includes('cancelFileBtn') && page.includes('setDropzoneIdle'), 'cancel upload restores idle dropzone');
assert.ok(page.includes('prepareHtmlForEpub'), 'EPUB body prep for Kobo pagination');
assert.ok(page.includes('page-break-inside:auto'), 'tables/paragraphs must allow page breaks on Kobo');
assert.ok(page.includes('.kf-note-space') && page.includes('.kf-space-12'),
    'writing spaces must survive both preview and EPUB CSS');
assert.ok(page.includes('.kf-font-script') && page.includes('.kf-size-175'),
    'PDF font family and relative size classes must be styled');
assert.ok(page.includes('kf-gap-before-3') && page.includes('margin-inline-start'),
    'wide PDF item gaps must remain visually separated in the device editor');
assert.ok(page.includes("let editMode = 'edit'"), 'empty workspace defaults to Edit');
assert.ok(page.includes("setEditMode('edit')"), 'import opens the selected Kobo editor');
assert.ok(!html.includes('data-mode="view"'), 'separate Device mode removed');
assert.ok(page.includes('#f4f1e8') || page.includes('f4f1e8'), 'Kobo e-ink paper background on preview');
assert.ok(!page.includes('id="einkToggle"'), 'standalone e-ink toggle removed');
assert.ok(page.includes("id=\"splitChapters\"") && !page.match(/id="splitChapters"[^>]*checked/),
    'chapter split off by default for continuous Kobo reading');
assert.ok(page.includes('tag === \'h1\'') || page.includes('tag === "h1"'), 'spine splits H1 only');
assert.ok(page.includes('ratio >= 1.55'), 'conservative PDF heading size threshold');
assert.ok(page.includes('function syncBodyFromUi'), 'edit surface must flush into model before export');
assert.ok(page.includes('function bodyHtmlForExport') && page.includes('syncBodyFromUi()'), 'download path syncs edits');
assert.ok(page.includes('originalBodyHtml'), 'snapshot original import for diff');
assert.ok(page.includes('function lineDiff'), 'git-like edit history');
assert.ok(page.includes('id="diffPanel"') && page.includes('Edit history'), 'Diff change index');
assert.ok(page.includes('function htmlToDiffLines'), 'structure-aware diff lines');
assert.ok(page.includes("repeat(level)") || page.includes("'#'.repeat"), 'headings encoded for diff');
assert.ok(page.includes('diff-h-tag') || page.includes('headingChanges'), 'heading change badges/stats');
assert.ok(page.includes('function wordDiffOps') || page.includes('function buildWordLevelDiff'), 'word-level diff');
assert.ok(page.includes('compressWordOps'), 'word context compression');
assert.ok(page.includes('diff-w-add') && page.includes('diff-w-del'), 'inline word add/del styles');
assert.ok(page.includes('data-mode="diff"') && !page.includes('id="showDiffBtn"'),
    'Diff is a first-class mode on the shared Kobo surface');
assert.ok(
    !html.includes('id="imageDropzone"')
        && !html.includes('id="imageFileInput"')
        && !html.includes('id="imageDownloadBtn"'),
    'standalone image converter UI removed'
);
assert.ok(page.includes('function buildTrackChangesDocument'), 'full-document track changes');
assert.ok(page.includes('kf-tc-del') && page.includes('kf-tc-ins'), 'Google Docs style del/ins');
assert.ok(page.includes('function jumpToChange'), 'clickable jump to change');
assert.ok(page.includes('function refreshDiffLive'), 'live track-changes refresh while typing');
assert.ok(
    page.includes("const isDeviceSurface = isEdit || isDiff")
        && page.includes("deviceBookContent.contentEditable = editMode === 'edit'"),
    'Edit and Diff reuse the paginated Kobo device surface'
);
assert.ok(
    page.includes("diffPanel?.classList.toggle('hidden', !isDiff)")
        && page.includes('without replacing the editable DOM'),
    'Diff owns the change index while Edit refresh preserves the DOM'
);
assert.ok(page.includes('updateDevicePage({ animate: false })')
    && page.includes("deviceBookContent.style.transition = 'none'"),
    'repagination refreshes the current Kobo page without a slide');
assert.ok(page.includes("previewEl.addEventListener('beforeinput'")
    && page.includes('lockedEditPageIndex')
    && page.includes('deviceBookViewport.scrollLeft = 0')
    && page.includes('overflow-anchor: none'),
    'content deletion must keep the active Kobo page transform and hidden viewport locked');
assert.ok(page.includes('data-align="left"')
    && page.includes('data-align="center"')
    && page.includes('data-align="right"'),
    'horizontal placement controls');
assert.ok(page.includes('data-vpos="top"')
    && page.includes('data-vpos="middle"')
    && page.includes('data-vpos="bottom"'),
    'vertical placement controls');
assert.ok(page.includes('data-font-step="1"') && page.includes('changeSelectedFontSize'),
    'block font-size controls');
assert.ok(page.includes('function handleEditorTab') && page.includes("event.key !== 'Tab'"),
    'Word-like Tab editing');
assert.ok(page.includes('id="insertTableBtn"') && page.includes('function insertEditableTable'),
    'editable table insertion');
assert.ok(page.includes('class="kf-pdf-page') && page.includes('data-source-page='),
    'PDF pages become explicit source-page sections');
assert.ok(page.includes('.kf-pdf-page + .kf-pdf-page')
    && page.includes('break-before: auto')
    && page.includes('margin-top: 1em'),
    'source PDF pages keep soft boundaries that allow normal Kobo reflow');
assert.ok(page.includes('data-pdf-vpos=') && page.includes('kf-align-${alignment}'),
    'PDF coordinate-derived placement survives into editable blocks');
assert.ok(page.includes('data-pdf-column=') && page.includes('sideRail'),
    'page-level columns are separated without treating image rails as note space');
const dropzonePos = page.indexOf('id="dropzone"');
const koboSetupPos = page.indexOf('id="koboPreviewSetup"');
const titleInputPos = page.indexOf('id="bookTitle"');
assert.ok(
    dropzonePos >= 0 && koboSetupPos > dropzonePos && titleInputPos > koboSetupPos,
    'Kobo model controls must sit directly beneath the initial upload'
);
assert.ok(
    page.includes('<option value="libra-colour" selected>Kobo Libra Colour · 7″ colour</option>'),
    'Kobo Libra Colour must be the default document preview target'
);
// EPUB styles.css string must not set pre-wrap (preview CSS may still use it)
const epubCssMatch = page.match(/oebps\.file\('styles\.css',\s*\[([\s\S]*?)\]\.join/);
assert.ok(epubCssMatch, 'EPUB CSS built as array join');
assert.ok(
    !epubCssMatch[1].includes('pre-wrap'),
    'EPUB styles.css must not use white-space:pre-wrap (Kobo page-turn freeze)'
);

console.log('All KoboForge logic tests passed.');
