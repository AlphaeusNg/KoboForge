/**
 * EPUB 3 fixed-layout package helpers.
 *
 * Kept browser-neutral so the package contract and PDF layout recommendation
 * can be regression-tested in Node without loading PDF.js or the application UI.
 */

function escapeXml(value) {
    return String(value ?? '')
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function positiveInteger(value, fallback = 1) {
    const number = Math.round(Number(value));
    return Number.isFinite(number) && number > 0 ? number : fallback;
}

function safePageText(value) {
    return String(value || '')
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, '')
        .replace(/\r\n?/g, '\n')
        .replace(/[^\S\n]+/g, ' ')
        .trim();
}

export function scorePdfDesignPage(signals = {}) {
    let score = 0;
    const reasons = [];
    const add = (points, reason) => {
        score += points;
        reasons.push(reason);
    };

    const imageCount = Math.max(
        Number(signals.imageCount) || 0,
        Number(signals.imageOperatorCount) || 0
    );
    const textItemCount = Number(signals.textItemCount) || 0;
    const vectorPathCount = Number(signals.vectorPathCount) || 0;
    const fontCount = Number(signals.fontCount) || 0;
    const xClusterCount = Number(signals.xClusterCount) || 0;
    const noteSpaceCount = Number(signals.noteSpaceCount) || 0;

    if (signals.imageOnly) add(7, 'full-page artwork or scanned pages');
    else if (imageCount > 0 && textItemCount > 0) add(3, 'mixed text and images');
    else if (imageCount > 0) add(2, 'embedded images');

    if ((Number(signals.readingColumns) || 1) > 1) {
        add(3, 'multi-column reading order');
    }
    if (signals.hasGrid) add(2, 'ruled table geometry');
    if (vectorPathCount >= 18) add(3, 'dense vector graphics');
    else if (vectorPathCount >= 7) add(1, 'vector page graphics');
    if (fontCount >= 5) add(2, 'many source font profiles');
    else if (fontCount >= 3) add(1, 'multiple source font profiles');
    if (xClusterCount >= 6) add(2, 'widely positioned text blocks');
    else if (xClusterCount >= 4) add(1, 'positioned text blocks');
    if (noteSpaceCount >= 2) add(1, 'intentional writing space');

    return {
        score,
        complex: score >= 4,
        reasons: [...new Set(reasons)]
    };
}

export function analyzePdfLayoutComplexity(pageSignals = []) {
    const scoredPages = (pageSignals || []).map((signals, index) => ({
        pageNumber: index + 1,
        ...scorePdfDesignPage(signals)
    }));
    const pageCount = scoredPages.length;
    if (!pageCount) {
        return {
            recommended: false,
            score: 0,
            complexPageCount: 0,
            pageCount: 0,
            reasons: []
        };
    }

    const totalScore = scoredPages.reduce((sum, page) => sum + page.score, 0);
    const complexPages = scoredPages.filter((page) => page.complex);
    const averageScore = totalScore / pageCount;
    const complexRatio = complexPages.length / pageCount;
    const recommendationThreshold = Math.max(1, Math.ceil(pageCount * 0.25));
    const recommended = (
        complexPages.length >= recommendationThreshold
        && averageScore >= 1.8
    );

    const reasonCounts = new Map();
    complexPages.forEach((page) => {
        page.reasons.forEach((reason) => {
            reasonCounts.set(reason, (reasonCounts.get(reason) || 0) + 1);
        });
    });
    const reasons = [...reasonCounts.entries()]
        .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
        .slice(0, 4)
        .map(([reason]) => reason);

    return {
        recommended,
        score: Math.round(averageScore * 10) / 10,
        complexPageCount: complexPages.length,
        complexRatio,
        pageCount,
        reasons,
        pages: scoredPages
    };
}

export function resolveEpubLayoutMode(requestedMode, output) {
    const requested = ['auto', 'reflowable', 'fixed'].includes(requestedMode)
        ? requestedMode
        : 'auto';
    if (requested === 'reflowable') return 'reflowable';
    if (requested === 'fixed') {
        return output?.formatLabel === 'PDF' ? 'fixed' : 'reflowable';
    }
    return (
        output?.formatLabel === 'PDF'
        && output?.fixedLayoutRecommendation?.recommended
    )
        ? 'fixed'
        : 'reflowable';
}

export function fixedLayoutDownloadName(baseName) {
    const base = String(baseName || 'koboforge-output')
        .trim()
        .replace(/\.fxl\.kepub\.epub$/i, '')
        .replace(/\.epub$/i, '')
        || 'koboforge-output';
    return `${base}.fxl.kepub.epub`;
}

/**
 * Return every file in a standards-based, image-facsimile fixed-layout EPUB.
 * Binary image values remain Uint8Arrays; all other values are UTF-8 strings.
 */
export function buildFixedLayoutPublicationFiles({
    title,
    author = 'Unknown',
    lang = 'en',
    identifier,
    modified,
    pages
}) {
    if (!Array.isArray(pages) || !pages.length) {
        throw new Error('A fixed-layout EPUB needs at least one rendered PDF page.');
    }

    const safeTitle = String(title || 'Untitled');
    const safeAuthor = String(author || 'Unknown');
    const safeLang = String(lang || 'en');
    const bookUrn = String(identifier || 'urn:uuid:koboforge-fixed-layout');
    const modifiedAt = String(modified || new Date().toISOString())
        .replace(/\.\d{3}Z$/, 'Z');
    const normalizedPages = pages.map((page, index) => {
        const number = index + 1;
        const width = positiveInteger(page.width);
        const height = positiveInteger(page.height);
        const extension = page.mediaType === 'image/png' ? 'png' : 'jpg';
        return {
            number,
            width,
            height,
            mediaType: extension === 'png' ? 'image/png' : 'image/jpeg',
            fileName: `fixed-page-${String(number).padStart(4, '0')}.${extension}`,
            bytes: page.bytes,
            text: safePageText(page.text)
        };
    });

    const files = new Map();
    files.set('mimetype', 'application/epub+zip');
    files.set('META-INF/container.xml', `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`);

    files.set('OEBPS/fixed.css', [
        '@page{margin:0;}',
        'html,body{width:100%;height:100%;margin:0;padding:0;overflow:hidden;background:#fff;}',
        'body{position:relative;}',
        '.fixed-page{position:absolute;inset:0;width:100%;height:100%;margin:0;padding:0;}',
        '.fixed-page-image{position:absolute;inset:0;display:block;width:100%;height:100%;margin:0;object-fit:fill;}',
        '.fixed-page-text{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);clip-path:inset(50%);white-space:nowrap;border:0;}'
    ].join(''));

    normalizedPages.forEach((page) => {
        const pageLabel = `Page ${page.number}`;
        const textEquivalent = page.text
            ? `<div class="fixed-page-text"><h1>${pageLabel}</h1><p>${escapeXml(page.text)}</p></div>`
            : '';
        files.set(
            `OEBPS/pages/page-${String(page.number).padStart(4, '0')}.xhtml`,
            `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${escapeXml(safeLang)}" lang="${escapeXml(safeLang)}">
<head>
  <title>${pageLabel}</title>
  <meta name="viewport" content="width=${page.width}, height=${page.height}"/>
  <link rel="stylesheet" type="text/css" href="../fixed.css"/>
</head>
<body>
  <main class="fixed-page" aria-label="${pageLabel}">
    <img class="fixed-page-image" src="../images/${page.fileName}" alt="Original visual layout of PDF ${pageLabel.toLowerCase()}."/>
    ${textEquivalent}
  </main>
</body>
</html>`
        );
        files.set(`OEBPS/images/${page.fileName}`, page.bytes);
    });

    const pageList = normalizedPages.map((page) => (
        `      <li><a href="pages/page-${String(page.number).padStart(4, '0')}.xhtml">${page.number}</a></li>`
    )).join('\n');
    files.set('OEBPS/nav.xhtml', `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${escapeXml(safeLang)}" lang="${escapeXml(safeLang)}">
<head><title>Navigation</title></head>
<body>
  <nav epub:type="toc" id="toc">
    <h1>Contents</h1>
    <ol><li><a href="pages/page-0001.xhtml">${escapeXml(safeTitle)}</a></li></ol>
  </nav>
  <nav epub:type="page-list" id="page-list" hidden="hidden">
    <h2>Pages</h2>
    <ol>
${pageList}
    </ol>
  </nav>
</body>
</html>`);

    files.set('OEBPS/toc.ncx', `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="${escapeXml(bookUrn)}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="${normalizedPages.length}"/>
    <meta name="dtb:maxPageNumber" content="${normalizedPages.length}"/>
  </head>
  <docTitle><text>${escapeXml(safeTitle)}</text></docTitle>
  <navMap>
    <navPoint id="navPoint-1" playOrder="1">
      <navLabel><text>${escapeXml(safeTitle)}</text></navLabel>
      <content src="pages/page-0001.xhtml"/>
    </navPoint>
  </navMap>
</ncx>`);

    const manifestPages = normalizedPages.map((page) => {
        const pageId = `page-${page.number}`;
        const imageId = `page-image-${page.number}`;
        return [
            `    <item id="${pageId}" href="pages/page-${String(page.number).padStart(4, '0')}.xhtml" media-type="application/xhtml+xml"/>`,
            `    <item id="${imageId}" href="images/${page.fileName}" media-type="${page.mediaType}"${page.number === 1 ? ' properties="cover-image"' : ''}/>`
        ].join('\n');
    }).join('\n');
    const spinePages = normalizedPages.map((page) => (
        `    <itemref idref="page-${page.number}"/>`
    )).join('\n');

    files.set('OEBPS/content.opf', `<?xml version="1.0" encoding="UTF-8"?>
<package version="3.0" unique-identifier="bookid" xmlns="http://www.idpf.org/2007/opf" prefix="rendition: http://www.idpf.org/vocab/rendition/#">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="bookid">${escapeXml(bookUrn)}</dc:identifier>
    <dc:title>${escapeXml(safeTitle)}</dc:title>
    <dc:language>${escapeXml(safeLang)}</dc:language>
    <dc:creator>${escapeXml(safeAuthor)}</dc:creator>
    <dc:format>application/epub+zip</dc:format>
    <meta property="dcterms:modified">${escapeXml(modifiedAt)}</meta>
    <meta property="rendition:layout">pre-paginated</meta>
    <meta property="rendition:orientation">auto</meta>
    <meta property="rendition:spread">none</meta>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    <item id="css" href="fixed.css" media-type="text/css"/>
${manifestPages}
  </manifest>
  <spine toc="ncx" page-progression-direction="ltr">
${spinePages}
  </spine>
</package>`);

    return files;
}
