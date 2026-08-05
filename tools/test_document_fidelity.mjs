/**
 * Functional regression matrix for DOCX page breaks and bold/italic fidelity.
 * Run: npm install && node tools/test_document_fidelity.mjs
 */
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import JSZip from 'jszip';
import mammoth from 'mammoth';
import {
    DOCX_FIDELITY_STYLE_MAP,
    normalizeBibleVerseMarkers,
    normalizeCssTypography,
    normalizeHtmlPageBreaks,
    prepareDocxForFidelity
} from '../js/document-fidelity.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const WORD_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const dom = new JSDOM('');
const { document, DOMParser, XMLSerializer } = dom.window;

function normalizedHtml(html, { forExport = false } = {}) {
    const root = document.createElement('div');
    root.innerHTML = html;
    normalizeHtmlPageBreaks(root, document, { forExport });
    normalizeCssTypography(root, document);
    return root.innerHTML;
}

function parsedRoot(html) {
    const root = document.createElement('div');
    root.innerHTML = html;
    return root;
}

// CSS/legacy/semantic typography: traits are independent and idempotent.
const formattingCases = [
    {
        name: 'combined traits',
        input: '<span style="font-weight:700;font-style:italic;text-decoration:underline line-through">Both</span>',
        selectors: ['strong', 'em', 'u', 's']
    },
    {
        name: 'numeric and oblique',
        input: '<span style="font-weight:650;font-style:oblique 12deg">Both</span>',
        selectors: ['strong', 'em']
    },
    {
        name: 'bold reset',
        input: '<strong>A<span style="font-weight:normal">B</span>C</strong>',
        selectors: ['.kf-not-bold']
    },
    {
        name: 'italic reset',
        input: '<em>A<span style="font-style:normal">B</span>C</em>',
        selectors: ['.kf-not-italic']
    },
    {
        name: 'decoration reset',
        input: '<u>A<span style="text-decoration:none">B</span>C</u>',
        selectors: ['.kf-no-decoration']
    }
];
for (const testCase of formattingCases) {
    const once = normalizedHtml(testCase.input);
    const twice = normalizedHtml(once);
    assert.equal(twice, once, `${testCase.name} normalization must be idempotent`);
    const root = parsedRoot(once);
    for (const selector of testCase.selectors) {
        assert.ok(
            root.querySelector(selector),
            `${testCase.name} must retain ${selector}`
        );
    }
}
assert.equal(
    normalizedHtml('<b>Bold <i>and italic</i></b>'),
    '<p><strong>Bold <em>and italic</em></strong></p>',
    'legacy tags become semantic without losing nesting'
);
const blockDecoration = parsedRoot(normalizedHtml(
    '<p style="text-decoration:underline line-through">BLOCK-BOTH</p>'
));
assert.ok(
    blockDecoration.querySelector('p > u > s, p > s > u'),
    'combined block underline/strike must become independently removable semantic tags'
);
assert.ok(
    !blockDecoration.querySelector('.kf-underline,.kf-strike'),
    'block decorations must not remain as ancestor CSS that removeFormat cannot cancel'
);
const decorationReset = parsedRoot(normalizedHtml(
    '<p style="text-decoration:underline">A<span style="text-decoration:none">B</span>C</p>'
));
assert.equal(
    decorationReset.querySelectorAll('u').length,
    2,
    'an explicit descendant reset must stay outside the inherited underline wrappers'
);
assert.ok(
    decorationReset.querySelector('.kf-no-decoration'),
    'an explicit descendant decoration reset must survive export normalization'
);

// Manual, legacy CSS, and modern CSS hard-break conventions.
const breakCases = [
    '<p>A</p><div class="kf-page-break"></div><p>B</p>',
    '<p>A</p><hr class="page-break"><p>B</p>',
    '<p>A</p><p style="page-break-before:always">B</p>',
    '<p style="break-after:page">A</p><p>B</p>',
    '<p>A</p><p style="break-before:column">B</p>',
    '<p>A</p><div data-kf-page-break></div><p>B</p>'
];
for (const input of breakCases) {
    const output = normalizedHtml(input, { forExport: true });
    const root = parsedRoot(output);
    assert.equal(
        root.querySelectorAll('.kf-page-break,.kf-break-before,.kf-break-after').length,
        1,
        `one durable hard break expected for ${input}`
    );
    root.querySelectorAll('.kf-page-break,.kf-break-before,.kf-break-after')
        .forEach((pageBreak) => {
            assert.equal(
                pageBreak.getAttribute('contenteditable'),
                null,
                'export break must not contain editor attributes'
            );
        });
}
assert.equal(
    normalizedHtml(
        '<div class="kf-page-break" data-page="2"></div>'
        + '<section class="kf-pdf-page" data-source-page="2">Page 2</section>',
        { forExport: true }
    ),
    '<section class="kf-pdf-page" data-source-page="2">Page 2</section>',
    'redundant PDF anchor must not add a blank page before a forced source section'
);
assert.equal(
    normalizedHtml(
        '<p>A<hr class="kf-page-break">B<br>line<hr class="kf-page-break">C',
        { forExport: true }
    ),
    '<p>A</p><hr class="kf-page-break"><p>B<br>line</p><hr class="kf-page-break"><p>C</p>',
    'post-break inline runs must regain paragraph structure'
);
assert.match(
    normalizedHtml('<div class="kf-page-break"></div><p>A</p>', { forExport: true }),
    /^<div class="kf-blank-page"><\/div><p>A<\/p>$/,
    'a leading authored break must retain a blank first page'
);
assert.match(
    normalizedHtml(
        '<p>A</p><div class="kf-page-break"></div><div class="kf-page-break"></div><p>B</p>',
        { forExport: true }
    ),
    /kf-page-break[\s\S]*kf-blank-page/,
    'consecutive breaks must retain the intentional blank page between content'
);
assert.equal(
    normalizedHtml(
        '<ol><li>A</li><li style="break-before:page">B</li></ol>',
        { forExport: true }
    ),
    '<ol><li>A</li><li class="kf-break-before">B</li></ol>',
    'list breaks must remain valid children of ol/ul'
);
assert.equal(
    normalizedHtml(
        '<table><tbody><tr><td>A</td></tr><tr style="break-before:page"><td>B</td></tr></tbody></table>',
        { forExport: true }
    ),
    '<table><tbody><tr><td>A</td></tr></tbody></table><table class="kf-break-before"><tbody><tr><td>B</td></tr></tbody></table>',
    'row breaks must split into two valid tables at the requested boundary'
);
assert.ok(
    !normalizedHtml(
        '<p>A</p><br class="kf-page-break"><p>B</p>',
        { forExport: true }
    ).includes('<br class="kf-page-break"'),
    'a BR alias must become a structural break box'
);
assert.match(
    normalizedHtml(
        '<p>A</p><p style="break-before:all">B</p>',
        { forExport: true }
    ),
    /class="kf-break-before"/,
    'modern break-before:all must be treated as forced'
);

function contentTypesXml() {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`;
}

async function docxFixture({ body: suppliedBody = '', styles: suppliedStyles = '' } = {}) {
    const body = suppliedBody || `
<w:p><w:r><w:t>MANUAL-A</w:t><w:br w:type="page"/><w:t>MANUAL-B</w:t></w:r></w:p>
<w:p><w:r><w:t>LINE-A</w:t><w:br/><w:t>LINE-B</w:t></w:r></w:p>
<w:p><w:pPr><w:pageBreakBefore/></w:pPr><w:r><w:t>BEFORE-DIRECT</w:t></w:r></w:p>
<w:p><w:pPr><w:pStyle w:val="PageBefore"/></w:pPr><w:r><w:t>BEFORE-STYLE</w:t></w:r></w:p>
<w:p><w:pPr><w:sectPr><w:type w:val="nextPage"/></w:sectPr></w:pPr><w:r><w:t>SECTION-NEXT</w:t></w:r></w:p>
<w:p><w:pPr><w:sectPr><w:type w:val="oddPage"/></w:sectPr></w:pPr><w:r><w:t>SECTION-ODD</w:t></w:r></w:p>
<w:p><w:pPr><w:sectPr><w:type w:val="evenPage"/></w:sectPr></w:pPr><w:r><w:t>SECTION-EVEN</w:t></w:r></w:p>
<w:p><w:pPr><w:sectPr><w:type w:val="continuous"/></w:sectPr></w:pPr><w:r><w:t>SECTION-CONTINUOUS</w:t></w:r></w:p>
<w:p><w:r><w:rPr><w:rStyle w:val="Emphasis"/></w:rPr><w:t>EMPHASIS</w:t></w:r></w:p>
<w:p><w:r><w:rPr><w:rStyle w:val="BoldItalicChild"/></w:rPr><w:t>STYLE-BOTH</w:t></w:r></w:p>
<w:p><w:pPr><w:pStyle w:val="ParaBoth"/></w:pPr><w:r><w:t>PARA-BOTH</w:t></w:r><w:r><w:rPr><w:b w:val="0"/><w:i w:val="0"/></w:rPr><w:t>RESET-BOTH</w:t></w:r></w:p>
<w:p><w:r><w:rPr><w:b w:val="0"/><w:bCs/><w:i w:val="0"/><w:iCs/></w:rPr><w:t>COMPLEX-SCRIPT عربي</w:t></w:r></w:p>`;
    const styles = suppliedStyles || `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="${WORD_NS}">
  <w:docDefaults><w:rPrDefault><w:rPr/></w:rPrDefault></w:docDefaults>
  <w:style w:type="paragraph" w:styleId="Normal"><w:name w:val="Normal"/></w:style>
  <w:style w:type="paragraph" w:styleId="PageBefore"><w:name w:val="Page Before"/><w:pPr><w:pageBreakBefore/></w:pPr></w:style>
  <w:style w:type="character" w:styleId="Emphasis"><w:name w:val="Emphasis"/><w:rPr><w:i/></w:rPr></w:style>
  <w:style w:type="character" w:styleId="BoldBase"><w:name w:val="Bold Base"/><w:rPr><w:b/></w:rPr></w:style>
  <w:style w:type="character" w:styleId="BoldItalicChild"><w:name w:val="Bold Italic Child"/><w:basedOn w:val="BoldBase"/><w:rPr><w:i/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="ParaBoth"><w:name w:val="Para Both"/><w:rPr><w:b/><w:i/></w:rPr></w:style>
</w:styles>`;
    const zip = new JSZip();
    zip.file('[Content_Types].xml', contentTypesXml());
    zip.folder('_rels').file(
        '.rels',
        `<?xml version="1.0"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`
    );
    const word = zip.folder('word');
    word.file(
        'document.xml',
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="${WORD_NS}"><w:body>${body}<w:sectPr/></w:body></w:document>`
    );
    word.file('styles.xml', styles);
    word.folder('_rels').file(
        'document.xml.rels',
        `<?xml version="1.0"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>`
    );
    return zip.generateAsync({ type: 'arraybuffer' });
}

async function convertDocxFixture(options) {
    const source = await docxFixture(options);
    const preparedFixture = await prepareDocxForFidelity(source, {
        JSZipCtor: JSZip,
        DOMParserCtor: DOMParser,
        XMLSerializerCtor: XMLSerializer
    });
    const result = await mammoth.convertToHtml(
        { buffer: Buffer.from(preparedFixture.arrayBuffer) },
        {
            styleMap: DOCX_FIDELITY_STYLE_MAP,
            ignoreEmptyParagraphs: false
        }
    );
    return { html: result.value, prepared: preparedFixture };
}

const sourceDocx = await docxFixture();
const prepared = await prepareDocxForFidelity(sourceDocx, {
    JSZipCtor: JSZip,
    DOMParserCtor: DOMParser,
    XMLSerializerCtor: XMLSerializer
});
assert.deepEqual(prepared.stats, {
    materializedRuns: 4,
    pageBreakBefore: 2,
    sectionBreaks: 3,
    paritySectionBreaks: 2
});
const converted = await mammoth.convertToHtml(
    { buffer: Buffer.from(prepared.arrayBuffer) },
    {
        styleMap: DOCX_FIDELITY_STYLE_MAP,
        ignoreEmptyParagraphs: false
    }
);
const docxHtml = converted.value;
assert.equal(
    (docxHtml.match(/class="kf-page-break"/g) || []).length,
    6,
    'manual, pageBreakBefore, and non-continuous section breaks must survive DOCX conversion'
);
assert.match(docxHtml, /LINE-A<br \/>LINE-B/, 'ordinary line break must remain a line break');
assert.match(docxHtml, /<em>EMPHASIS<\/em>/, 'Word Emphasis style must survive');
assert.match(
    docxHtml,
    /<(strong|em)><(em|strong)>STYLE-BOTH<\/\2><\/\1>/,
    'inherited character style must retain bold and italic'
);
assert.match(
    docxHtml,
    /<(strong|em)><(em|strong)>PARA-BOTH<\/\2><\/\1>RESET-BOTH/,
    'paragraph typography must survive while a direct false override remains normal'
);
assert.match(
    docxHtml,
    /COMPLEX-SCRIPT <(strong|em)><(em|strong)>عربي<\/\2><\/\1>/,
    'bCs/iCs must format only the complex-script segment of a mixed run'
);

const defaultStyleDocx = await docxFixture({
    body: '<w:p><w:r><w:rPr><w:rStyle w:val="Emphasis"/></w:rPr><w:t>DEFAULT-PARAGRAPH</w:t></w:r></w:p>',
    styles: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="${WORD_NS}">
  <w:docDefaults><w:rPrDefault><w:rPr><w:b w:val="0"/><w:i w:val="0"/></w:rPr></w:rPrDefault></w:docDefaults>
  <w:style w:type="paragraph" w:styleId="DefaultParagraph" w:default="1">
    <w:name w:val="Default Paragraph"/>
    <w:pPr><w:pageBreakBefore/></w:pPr>
    <w:rPr><w:b/><w:i/></w:rPr>
  </w:style>
  <w:style w:type="character" w:styleId="Emphasis">
    <w:name w:val="Emphasis"/>
    <w:rPr><w:i/></w:rPr>
  </w:style>
</w:styles>`
});
const preparedDefaultStyle = await prepareDocxForFidelity(defaultStyleDocx, {
    JSZipCtor: JSZip,
    DOMParserCtor: DOMParser,
    XMLSerializerCtor: XMLSerializer
});
assert.equal(
    preparedDefaultStyle.stats.pageBreakBefore,
    1,
    'the default paragraph style must apply when w:pStyle is omitted'
);
const defaultStyleHtml = (
    await mammoth.convertToHtml(
        { buffer: Buffer.from(preparedDefaultStyle.arrayBuffer) },
        { styleMap: DOCX_FIDELITY_STYLE_MAP }
    )
).value;
assert.match(defaultStyleHtml, /class="kf-page-break"/);
assert.match(
    defaultStyleHtml,
    /<strong>DEFAULT-PARAGRAPH<\/strong>/,
    'paragraph and character toggle levels must combine by XOR'
);

const cascadeFixture = await convertDocxFixture({
    body: `
<w:p><w:pPr><w:pStyle w:val="ParaBoth"/></w:pPr><w:r><w:rPr><w:rStyle w:val="CharBoth"/></w:rPr><w:t>PARA-CHAR-XOR</w:t></w:r></w:p>
<w:p><w:pPr><w:rPr><w:b/><w:i/></w:rPr></w:pPr><w:r><w:t>PARAGRAPH-MARK-ONLY</w:t></w:r></w:p>
<w:p><w:r><w:rPr><w:rStyle w:val="RepeatedChild"/></w:rPr><w:t>NEAREST-STYLE-WINS</w:t></w:r></w:p>
<w:p><w:r><w:rPr><w:rStyle w:val="FalseChild"/></w:rPr><w:t>FALSE-STYLE-WINS</w:t></w:r></w:p>
<w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>NON-BOLD-HEADING</w:t></w:r></w:p>
<w:tbl><w:tblPr><w:tblStyle w:val="TableBoth"/></w:tblPr><w:tr><w:tc><w:p><w:r><w:t>WHOLE-TABLE-BOTH</w:t></w:r></w:p></w:tc></w:tr></w:tbl>
<w:tbl><w:tblPr><w:tblStyle w:val="FirstRowBoth"/><w:tblLook w:firstRow="1"/></w:tblPr>
  <w:tr><w:tc><w:p><w:r><w:t>FIRST-ROW-BOTH</w:t></w:r></w:p></w:tc></w:tr>
  <w:tr><w:tc><w:p><w:r><w:t>SECOND-ROW-PLAIN</w:t></w:r></w:p></w:tc></w:tr>
</w:tbl>
<w:tbl><w:tr><w:tc><w:p><w:r><w:t>DEFAULT-TABLE-ITALIC</w:t></w:r></w:p></w:tc></w:tr></w:tbl>`,
    styles: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="${WORD_NS}">
  <w:style w:type="paragraph" w:styleId="Normal" w:default="1"><w:name w:val="Normal"/></w:style>
  <w:style w:type="paragraph" w:styleId="ParaBoth"><w:name w:val="Para Both"/><w:rPr><w:b/><w:i/></w:rPr></w:style>
  <w:style w:type="character" w:styleId="CharBoth"><w:name w:val="Char Both"/><w:rPr><w:b/><w:i/></w:rPr></w:style>
  <w:style w:type="character" w:styleId="ToggleBase"><w:name w:val="Toggle Base"/><w:rPr><w:b/><w:i/></w:rPr></w:style>
  <w:style w:type="character" w:styleId="RepeatedChild"><w:name w:val="Repeated Child"/><w:basedOn w:val="ToggleBase"/><w:rPr><w:b/><w:i/></w:rPr></w:style>
  <w:style w:type="character" w:styleId="FalseChild"><w:name w:val="False Child"/><w:basedOn w:val="ToggleBase"/><w:rPr><w:b w:val="0"/><w:i w:val="0"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:rPr><w:b w:val="0"/></w:rPr></w:style>
  <w:style w:type="table" w:styleId="TableBoth"><w:name w:val="Table Both"/><w:rPr><w:b/><w:i/></w:rPr></w:style>
  <w:style w:type="table" w:styleId="FirstRowBoth"><w:name w:val="First Row Both"/><w:tblStylePr w:type="firstRow"><w:rPr><w:b/><w:i/></w:rPr></w:tblStylePr></w:style>
  <w:style w:type="table" w:styleId="DefaultTable" w:default="1"><w:name w:val="Default Table"/><w:rPr><w:i/></w:rPr></w:style>
</w:styles>`
});
assert.match(
    cascadeFixture.html,
    /<p>PARA-CHAR-XOR<\/p>/,
    'paragraph and character true toggles must cancel across style levels'
);
assert.match(
    cascadeFixture.html,
    /<p>PARAGRAPH-MARK-ONLY<\/p>/,
    'pPr/rPr must format only the paragraph mark, not every body run'
);
assert.match(
    cascadeFixture.html,
    /<(strong|em)><(em|strong)>NEAREST-STYLE-WINS<\/\2><\/\1>/,
    'the nearest value in one basedOn chain must win without XOR inside the level'
);
assert.match(
    cascadeFixture.html,
    /<p>FALSE-STYLE-WINS<\/p>/,
    'a nearest false style value must suppress a true basedOn value at that level'
);
assert.match(
    cascadeFixture.html,
    /<h1><span class="kf-not-bold">NON-BOLD-HEADING<\/span><\/h1>/,
    'an explicitly non-bold Word heading must override structural heading bold'
);
assert.match(
    cascadeFixture.html,
    /<(strong|em)><(em|strong)>WHOLE-TABLE-BOTH<\/\2><\/\1>/,
    'whole-table style typography must apply to table text'
);
assert.match(
    cascadeFixture.html,
    /<(strong|em)><(em|strong)>FIRST-ROW-BOTH<\/\2><\/\1>/,
    'first-row conditional table typography must apply to the first row'
);
assert.match(
    cascadeFixture.html,
    /<p>SECOND-ROW-PLAIN<\/p>/,
    'first-row conditional table typography must not leak to later rows'
);
assert.match(
    cascadeFixture.html,
    /<em>DEFAULT-TABLE-ITALIC<\/em>/,
    'the default table style must apply when w:tblStyle is omitted'
);

const trueDefaultsFixture = await convertDocxFixture({
    body: '<w:p><w:pPr><w:pStyle w:val="FalsePara"/></w:pPr><w:r><w:rPr><w:rStyle w:val="FalseChar"/></w:rPr><w:t>TRUE-DEFAULTS</w:t></w:r></w:p>',
    styles: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="${WORD_NS}">
  <w:docDefaults><w:rPrDefault><w:rPr><w:b/><w:i/></w:rPr></w:rPrDefault></w:docDefaults>
  <w:style w:type="paragraph" w:styleId="Normal" w:default="1"><w:name w:val="Normal"/></w:style>
  <w:style w:type="paragraph" w:styleId="FalsePara"><w:name w:val="False Para"/><w:rPr><w:b w:val="0"/><w:i w:val="0"/></w:rPr></w:style>
  <w:style w:type="character" w:styleId="FalseChar"><w:name w:val="False Char"/><w:rPr><w:b w:val="0"/><w:i w:val="0"/></w:rPr></w:style>
</w:styles>`
});
assert.match(
    trueDefaultsFixture.html,
    /<(strong|em)><(em|strong)>TRUE-DEFAULTS<\/\2><\/\1>/,
    'normative true document defaults must remain true absent direct formatting'
);

// --- Bible verse markers (sermon outlines) ---------------------------------
const verseHtml = normalizedHtml(
    '<p><strong><sup>33 </sup></strong>And your children shall be shepherds in the wilderness.</p>'
        + '<p><sub>34</sub>According to the number of the days.</p>'
        + '<p>13 The Lord spoke to Moses, saying,</p>'
        + '<p>1. Outline heading stays body text</p>'
);
const verseRoot = parsedRoot(verseHtml);
// Re-run verse pass after typography normalize (mirrors app canonicalizeBody).
normalizeBibleVerseMarkers(verseRoot, document);
const verseText = verseRoot.textContent;
assert.match(
    verseRoot.innerHTML,
    /<sup class="kf-verse-num"[^>]*data-kf-verse="33"/,
    'superscript verse 33 becomes kf-verse-num'
);
assert.match(
    verseRoot.innerHTML,
    /<sup class="kf-verse-num"[^>]*data-kf-verse="34"/,
    'subscript verse digits are promoted to superscript kf-verse-num'
);
assert.match(
    verseRoot.innerHTML,
    /<sup class="kf-verse-num"[^>]*data-kf-verse="13"/,
    'plain leading verse number is detected'
);
assert.ok(
    verseText.includes('And your children shall be shepherds in the wilderness.'),
    'verse 33 prose must not be truncated after the marker'
);
assert.ok(
    verseText.includes('According to the number of the days.'),
    'verse 34 prose must remain after the marker'
);
const outlinePara = Array.from(verseRoot.querySelectorAll('p')).find((p) => (
    p.textContent.includes('Outline heading')
));
assert.ok(outlinePara, 'outline paragraph present');
assert.equal(
    outlinePara.querySelectorAll('sup.kf-verse-num').length,
    0,
    'outline numbered item is not a verse marker'
);

// Numbers 13-15 sermon outline fixture — full DOCX path (fidelity + mammoth + verses).
const fixturePath = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    'fixtures',
    'numbers-13-15-outline-slim.docx'
);
assert.ok(fs.existsSync(fixturePath), `missing fixture ${fixturePath}`);
const fixtureBuffer = fs.readFileSync(fixturePath);
const preparedNumbers = await prepareDocxForFidelity(
    fixtureBuffer.buffer.slice(
        fixtureBuffer.byteOffset,
        fixtureBuffer.byteOffset + fixtureBuffer.byteLength
    ),
    {
        JSZipCtor: JSZip,
        DOMParserCtor: DOMParser,
        XMLSerializerCtor: XMLSerializer
    }
);
const numbersHtml = (
    await mammoth.convertToHtml(
        { buffer: Buffer.from(preparedNumbers.arrayBuffer) },
        { styleMap: DOCX_FIDELITY_STYLE_MAP, ignoreEmptyParagraphs: false }
    )
).value;
const numbersRoot = document.createElement('div');
numbersRoot.innerHTML = numbersHtml;
normalizeCssTypography(numbersRoot, document);
const verseStats = normalizeBibleVerseMarkers(numbersRoot, document);
const numbersText = numbersRoot.textContent.replace(/\s+/g, ' ');
assert.ok(
    numbersText.includes(
        'And your children shall be shepherds in the wilderness forty years'
    ),
    'Numbers 14:33 prose must survive DOCX conversion (no blank after "33 And your")'
);
assert.ok(
    numbersText.includes('So Near Yet So Far'),
    'content after verse 33 (sermon title) must remain'
);
assert.ok(
    numbersText.includes('Discussion questions'),
    'end of outline must remain after verse section'
);
assert.ok(
    verseStats.markers >= 20,
    `expected many verse markers, got ${verseStats.markers}`
);
const verse33Markers = Array.from(
    numbersRoot.querySelectorAll('sup.kf-verse-num[data-kf-verse="33"]')
);
assert.ok(verse33Markers.length >= 1, 'verse 33 marker must be detected as kf-verse-num');
// Numbers has 13:33 (Nephilim) and 14:33 (children shepherds) — require the latter.
const children33 = verse33Markers.find((marker) => {
    let probe = marker.nextSibling;
    let following = '';
    while (probe && following.length < 120) {
        if (probe.nodeType === 3) following += probe.nodeValue || '';
        else if (probe.nodeType === 1) following += probe.textContent || '';
        probe = probe.nextSibling;
    }
    return /And your children/.test(following.replace(/\s+/g, ' '));
});
assert.ok(
    children33,
    'Numbers 14:33 marker must be immediately followed by "And your children…" (no blank cut-off)'
);

console.log('All KoboForge document fidelity tests passed.');
