/** Browser-neutral reflowable EPUB file and ZIP builder. */

function escapeXml(value) {
    return String(value ?? '')
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

export const REFLOWABLE_EPUB_CSS = [
    'html,body{height:auto !important;max-height:none !important;overflow:visible !important;}',
    'body{font-family:Georgia,"Times New Roman",serif;line-height:1.55;margin:3% 4%;color:#111;-webkit-hyphens:auto;hyphens:auto;orphans:2;widows:2;}',
    'h1,h2,h3{margin:1.25em 0 .55em;line-height:1.25;font-family:Georgia,serif;page-break-after:auto;page-break-inside:auto;}',
    'h1{font-size:1.45em;}h2{font-size:1.22em;}h3{font-size:1.08em;}',
    'p{margin:0 0 0.85em;text-align:justify;page-break-inside:auto;page-break-before:auto;page-break-after:auto;}',
    'h1.kf-pdf-block,h2.kf-pdf-block,h3.kf-pdf-block,p.kf-pdf-block{font-size:1em;font-family:inherit;text-align:left;}',
    '.kf-pdf-page{display:block;box-sizing:border-box;width:100%;page-break-inside:auto;break-inside:auto;}',
    '.kf-pdf-page::after{display:table;clear:both;content:"";}',
    '.kf-pdf-page+.kf-pdf-page{margin-top:0;page-break-before:always;break-before:page;}',
    '.kf-pdf-blank-page{height:0;page-break-after:always;break-after:page;}',
    '.kf-pdf-image-page figure.kf-document-image{margin:0;page-break-inside:avoid;break-inside:avoid;}',
    '.kf-pdf-image-page figure.kf-document-image img{display:block;width:auto !important;max-width:100%;max-height:90vh;margin:0 auto;}',
    '.kf-page-offset-0{padding-top:0;}.kf-page-offset-1{padding-top:1.8em;}.kf-page-offset-2{padding-top:3.6em;}.kf-page-offset-3{padding-top:5.4em;}.kf-page-offset-4{padding-top:7.2em;}.kf-page-offset-5{padding-top:9em;}.kf-page-offset-6{padding-top:10.8em;}.kf-page-offset-7{padding-top:12.6em;}.kf-page-offset-8{padding-top:14.4em;}',
    '.kf-align-left{text-align:left !important;}.kf-align-center{text-align:center !important;}.kf-align-right{text-align:right !important;}',
    '.kf-align-justify{display:block !important;width:100% !important;max-width:100% !important;box-sizing:border-box !important;text-align:justify !important;text-justify:inter-word !important;text-align-last:left;hyphens:auto;-webkit-hyphens:auto;}',
    'sup,sub{font-size:.75em;line-height:1;}',
    'sup,.kf-verse-num{vertical-align:super;}',
    'sub{vertical-align:sub;}',
    'sup.kf-verse-num{font-weight:700;font-size:.72em;margin-right:.12em;white-space:nowrap;}',
    '.kf-user-size-75{font-size:.75em !important;}.kf-user-size-88{font-size:.88em !important;}.kf-user-size-100{font-size:1em !important;}.kf-user-size-112{font-size:1.12em !important;}.kf-user-size-125{font-size:1.25em !important;}.kf-user-size-150{font-size:1.5em !important;}.kf-user-size-175{font-size:1.75em !important;}',
    '.kf-tab{display:inline-block;width:2.5em;min-height:1em;vertical-align:baseline;}',
    '.kf-pdf-line{display:inline;box-sizing:border-box;max-width:100%;}',
    '.kf-indent-0{padding-left:0;}.kf-indent-1{padding-left:.75em;}.kf-indent-2{padding-left:1.5em;}.kf-indent-3{padding-left:2.25em;}',
    '.kf-font-serif{font-family:Georgia,"Times New Roman",Times,serif;}.kf-font-sans{font-family:Arial,Helvetica,sans-serif;}.kf-font-mono{font-family:"Courier New",Courier,monospace;}.kf-font-script{font-family:"Brush Script MT","Segoe Script",cursive;}',
    '.kf-gap-before-1{display:inline-block;max-width:calc(100% - .75em);margin-left:.75em;}.kf-gap-before-2{display:inline-block;max-width:calc(100% - 1.5em);margin-left:1.5em;}.kf-gap-before-3{display:inline-block;max-width:calc(100% - 2.5em);margin-left:2.5em;}',
    '.kf-weight-light{font-weight:300;}.kf-size-75{font-size:.75em;}.kf-size-88{font-size:.88em;}.kf-size-100{font-size:1em;}.kf-size-112{font-size:1.12em;}.kf-size-125{font-size:1.25em;}.kf-size-150{font-size:1.5em;}.kf-size-175{font-size:1.75em;}',
    '.kf-note-space{display:block;width:100%;margin:0;page-break-inside:auto;break-inside:auto;}',
    '.kf-space-2{height:2em;}.kf-space-3{height:3em;}.kf-space-4{height:4em;}.kf-space-5{height:5em;}.kf-space-6{height:6em;}.kf-space-7{height:7em;}.kf-space-8{height:8em;}.kf-space-9{height:9em;}.kf-space-10{height:10em;}.kf-space-11{height:11em;}.kf-space-12{height:12em;}',
    'strong,b{font-weight:700;}',
    'em,i{font-style:italic;}',
    'u{text-decoration:underline;}',
    's,strike,del{text-decoration:line-through;}',
    '.kf-bold{font-weight:700 !important;}.kf-not-bold{font-weight:400 !important;}',
    '.kf-italic{font-style:italic !important;}.kf-not-italic{font-style:normal !important;}',
    '.kf-underline{text-decoration:underline !important;}.kf-strike{text-decoration:line-through !important;}.kf-underline.kf-strike{text-decoration:underline line-through !important;}.kf-no-decoration{text-decoration:none !important;}',
    '.kf-page-break{display:block;height:0;margin:0;padding:0;border:0;page-break-before:always;break-before:page;}',
    '.kf-break-before{page-break-before:always;break-before:page;}.kf-break-after{page-break-after:always;break-after:page;}',
    'span.kf-break-before,span.kf-break-after{display:block;}',
    '.kf-blank-page{display:block;height:0;margin:0;padding:0;border:0;page-break-after:always;break-after:page;}',
    'blockquote{border-left:.25em solid #888;padding-left:1em;margin:0 0 1em;color:#333;}',
    'ul,ol,.kf-list{margin:0 0 0.85em 1.25em;padding-left:0.55em;}',
    'ul{list-style-type:disc;}ol{list-style-type:decimal;}',
    'li{margin:0.28em 0;page-break-inside:auto;}',
    'li > ul,li > ol{margin-top:0.25em;margin-bottom:0.25em;}',
    '.kf-indent-1{margin-left:1.25em;}.kf-indent-2{margin-left:2.25em;}.kf-indent-3{margin-left:3.25em;}',
    'table,table.kobo-table{width:100%;border-collapse:collapse;margin:1em 0;font-size:0.88em;page-break-inside:auto !important;}',
    'thead,tbody,tr,th,td{page-break-inside:auto !important;}',
    'th,td{border:1px solid #555;padding:5px 7px;text-align:left;vertical-align:top;}',
    'th.kf-user-vpos-top,td.kf-user-vpos-top{vertical-align:top !important;}th.kf-user-vpos-middle,td.kf-user-vpos-middle{vertical-align:middle !important;}th.kf-user-vpos-bottom,td.kf-user-vpos-bottom{vertical-align:bottom !important;}',
    'th{font-weight:inherit;background:#eee;}',
    'code{font-family:monospace;font-size:0.92em;}',
    'figure.kf-document-image{margin:1em 0;text-align:center;page-break-inside:auto;}',
    'figure.kf-document-image.kf-image-inline-left,figure.kf-document-image.kf-image-inline-right{max-width:60%;margin-top:.25em;margin-bottom:.55em;}',
    'figure.kf-document-image.kf-image-inline-left,img.kf-image-inline-left{float:left;margin-left:0;margin-right:.8em;}',
    'figure.kf-document-image.kf-image-inline-right,img.kf-image-inline-right{float:right;margin-left:.8em;margin-right:0;}',
    'figure.kf-document-image.kf-image-inline-left img,figure.kf-document-image.kf-image-inline-right img{display:block;width:100%;margin:0;}',
    'img.kf-image-inline-left,img.kf-image-inline-right{display:inline-block;max-width:60%;margin-top:.2em;margin-bottom:.5em;}',
    'img{display:block;max-width:100%;height:auto;margin:.75em auto;}',
    'br{line-height:1.55;}'
].join('');

export function buildReflowablePublicationFiles({
    title,
    author = 'Unknown',
    lang = 'en',
    identifier,
    modified,
    chapters,
    assets = []
}) {
    if (!Array.isArray(chapters) || chapters.length === 0) {
        throw new Error('A reflowable EPUB needs at least one chapter.');
    }
    if (!String(identifier || '').trim()) throw new Error('EPUB identifier is required.');

    const safeTitle = String(title || 'Untitled');
    const safeAuthor = String(author || 'Unknown');
    const safeLang = String(lang || 'en');
    const bookUrn = String(identifier).trim();
    const modifiedAt = String(modified || new Date().toISOString()).replace(/\.\d{3}Z$/, 'Z');
    const normalizedChapters = chapters.map((chapter, index) => ({
        number: index + 1,
        title: String(chapter?.title || `Chapter ${index + 1}`),
        html: String(chapter?.html || '<p>(Empty document)</p>')
    }));
    const normalizedAssets = assets.map((asset, index) => {
        const fileName = String(asset?.fileName || '');
        const id = String(asset?.id || `image-${index + 1}`);
        const mediaType = String(asset?.mediaType || '');
        if (!/^[A-Za-z0-9._-]+$/.test(fileName)) throw new Error('Invalid EPUB image filename.');
        if (!/^[A-Za-z0-9._-]+$/.test(id)) throw new Error('Invalid EPUB image id.');
        if (!/^image\/[A-Za-z0-9.+-]+$/.test(mediaType)) throw new Error('Invalid EPUB image type.');
        return { ...asset, fileName, id, mediaType };
    });

    const files = new Map();
    files.set('mimetype', 'application/epub+zip');
    files.set('META-INF/container.xml', `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`);
    files.set('OEBPS/styles.css', REFLOWABLE_EPUB_CSS);
    normalizedAssets.forEach((asset) => {
        files.set(`OEBPS/images/${asset.fileName}`, asset.bytes);
    });

    const tocItems = normalizedChapters.map((chapter) => (
        `<li><a href="chapter-${chapter.number}.xhtml">${escapeXml(chapter.title)}</a></li>`
    )).join('\n    ');
    files.set('OEBPS/nav.xhtml', `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="${escapeXml(safeLang)}">
<head><title>Navigation</title><link rel="stylesheet" type="text/css" href="styles.css"/></head>
<body>
  <nav epub:type="toc" id="toc">
    <h1>Contents</h1>
    <ol>
    ${tocItems}
    </ol>
  </nav>
</body>
</html>`);

    const ncxNavPoints = normalizedChapters.map((chapter) => (
        `    <navPoint id="navPoint-${chapter.number}" playOrder="${chapter.number}">
      <navLabel><text>${escapeXml(chapter.title)}</text></navLabel>
      <content src="chapter-${chapter.number}.xhtml"/>
    </navPoint>`
    )).join('\n');
    files.set('OEBPS/toc.ncx', `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="${escapeXml(bookUrn)}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle><text>${escapeXml(safeTitle)}</text></docTitle>
  <navMap>
${ncxNavPoints}
  </navMap>
</ncx>`);

    normalizedChapters.forEach((chapter) => {
        files.set(`OEBPS/chapter-${chapter.number}.xhtml`, `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="${escapeXml(safeLang)}" lang="${escapeXml(safeLang)}">
<head>
  <title>${escapeXml(chapter.title)}</title>
  <link rel="stylesheet" type="text/css" href="styles.css"/>
</head>
<body>
${chapter.html}
</body>
</html>`);
    });

    const manifestItems = normalizedChapters.map((chapter) => (
        `    <item id="ch${chapter.number}" href="chapter-${chapter.number}.xhtml" media-type="application/xhtml+xml"/>`
    )).join('\n');
    const imageManifestItems = normalizedAssets.map((asset) => (
        `    <item id="${escapeXml(asset.id)}" href="images/${escapeXml(asset.fileName)}" media-type="${escapeXml(asset.mediaType)}"/>`
    )).join('\n');
    const spineItems = normalizedChapters.map((chapter) => (
        `    <itemref idref="ch${chapter.number}"/>`
    )).join('\n');
    files.set('OEBPS/content.opf', `<?xml version="1.0" encoding="UTF-8"?>
<package version="3.0" unique-identifier="bookid" xmlns="http://www.idpf.org/2007/opf">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="bookid">${escapeXml(bookUrn)}</dc:identifier>
    <dc:title>${escapeXml(safeTitle)}</dc:title>
    <dc:language>${escapeXml(safeLang)}</dc:language>
    <dc:creator>${escapeXml(safeAuthor)}</dc:creator>
    <meta property="dcterms:modified">${escapeXml(modifiedAt)}</meta>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
${manifestItems}
${imageManifestItems}
    <item id="css" href="styles.css" media-type="text/css"/>
  </manifest>
  <spine toc="ncx">
${spineItems}
  </spine>
</package>`);

    return files;
}

export async function generateEpubArchive(JSZipCtor, files, { type = 'blob' } = {}) {
    if (typeof JSZipCtor !== 'function') throw new TypeError('JSZip constructor is required.');
    if (!(files instanceof Map) || files.get('mimetype') !== 'application/epub+zip') {
        throw new TypeError('Valid EPUB publication files are required.');
    }
    const zip = new JSZipCtor();
    files.forEach((value, path) => {
        zip.file(path, value, {
            compression: path === 'mimetype' ? 'STORE' : 'DEFLATE',
            createFolders: false
        });
    });
    return zip.generateAsync({
        type,
        mimeType: 'application/epub+zip',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
    });
}

export async function buildReflowableEpubArchive(
    JSZipCtor,
    publication,
    options = {}
) {
    const files = buildReflowablePublicationFiles(publication);
    return generateEpubArchive(JSZipCtor, files, options);
}
