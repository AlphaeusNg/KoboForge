const WORD_NAMESPACE = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';

export const DOCX_FIDELITY_STYLE_MAP = Object.freeze([
    "br[type='page'] => hr.kf-page-break:fresh",
    "br[type='column'] => hr.kf-page-break:fresh",
    "r[style-name='KoboForge Not Bold'] => span.kf-not-bold",
    "r[style-name='KoboForge Underline'] => span.kf-underline",
    "r[style-name='KoboForge Strike'] => span.kf-strike",
    "r[style-name='KoboForge Underline Strike'] => span.kf-underline.kf-strike",
    "r[style-name='KoboForge Not Bold Underline'] => span.kf-not-bold.kf-underline",
    "r[style-name='KoboForge Not Bold Strike'] => span.kf-not-bold.kf-strike",
    "r[style-name='KoboForge Not Bold Underline Strike'] => span.kf-not-bold.kf-underline.kf-strike"
]);

const HTML_TEXT_BOUNDARY_SELECTOR = [
    'address', 'article', 'aside', 'blockquote', 'dd', 'div', 'dl', 'dt',
    'fieldset', 'figcaption', 'figure', 'footer', 'form', 'h1', 'h2', 'h3',
    'h4', 'h5', 'h6', 'header', 'hr', 'li', 'main', 'nav', 'ol', 'p', 'pre',
    'section', 'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'tr', 'ul'
].join(',');

/**
 * Count rendered HTML words without gluing the end of one block to the start
 * of the next. textContent alone turns `</h1><p>` into one token even though
 * browsers and EPUB readers render a boundary between those elements.
 */
export function countHtmlWords(html, doc = globalThis.document) {
    if (!doc?.createElement) return 0;
    const root = doc.createElement('div');
    root.innerHTML = String(html || '');
    root.querySelectorAll('br').forEach((lineBreak) => {
        lineBreak.replaceWith(doc.createTextNode(' '));
    });
    root.querySelectorAll(HTML_TEXT_BOUNDARY_SELECTOR).forEach((block) => {
        block.appendChild(doc.createTextNode(' '));
    });
    const text = (root.textContent || '').replace(/\s+/g, ' ').trim();
    return text ? text.split(/\s+/).length : 0;
}

const DEFAULT_WORDS_PER_MINUTE = 200;

export function formatReadingTime(wordCount, wordsPerMinute = DEFAULT_WORDS_PER_MINUTE) {
    const words = Number(wordCount);
    const rate = Number(wordsPerMinute);
    if (!Number.isFinite(words) || words <= 0 || !Number.isFinite(rate) || rate <= 0) {
        return '< 1 min read';
    }
    const minutes = Math.max(1, Math.round(words / rate));
    return minutes === 1 ? '1 min read' : `${minutes} min read`;
}

function wordElements(root, localName) {
    return Array.from(root?.getElementsByTagNameNS?.(WORD_NAMESPACE, localName) || []);
}

function directWordChild(element, localName) {
    return Array.from(element?.children || []).find((child) => (
        child.namespaceURI === WORD_NAMESPACE && child.localName === localName
    )) || null;
}

function wordAttribute(element, localName) {
    return element?.getAttributeNS?.(WORD_NAMESPACE, localName)
        ?? element?.getAttribute?.(`w:${localName}`)
        ?? null;
}

function readOnOff(element) {
    if (!element) return undefined;
    const value = String(wordAttribute(element, 'val') ?? 'true').trim().toLowerCase();
    return !['0', 'false', 'off', 'no', 'none'].includes(value);
}

function overlayTraits(base, override) {
    const output = { ...base };
    [
        'bold', 'boldCs', 'italic', 'italicCs', 'underline', 'strike',
        'pageBreakBefore'
    ].forEach((name) => {
        if (override?.[name] !== undefined) output[name] = override[name];
    });
    return output;
}

function runTraits(properties) {
    return {
        bold: readOnOff(directWordChild(properties, 'b')),
        boldCs: readOnOff(directWordChild(properties, 'bCs')),
        italic: readOnOff(directWordChild(properties, 'i')),
        italicCs: readOnOff(directWordChild(properties, 'iCs')),
        underline: readOnOff(directWordChild(properties, 'u')),
        strike: readOnOff(directWordChild(properties, 'strike'))
            ?? readOnOff(directWordChild(properties, 'dstrike'))
    };
}

function paragraphTraits(properties) {
    return {
        pageBreakBefore: readOnOff(directWordChild(properties, 'pageBreakBefore'))
    };
}

function parseWordXml(text, DOMParserCtor) {
    const doc = new DOMParserCtor().parseFromString(String(text || ''), 'application/xml');
    const parserError = doc.getElementsByTagName('parsererror')[0];
    if (parserError) {
        throw new Error(`Could not parse DOCX XML: ${(parserError.textContent || '').trim()}`);
    }
    return doc;
}

function docxStyleModel(stylesDoc) {
    const defaultRunProperties = wordElements(stylesDoc, 'docDefaults')[0]
        ?.getElementsByTagNameNS(WORD_NAMESPACE, 'rPrDefault')[0]
        ?.getElementsByTagNameNS(WORD_NAMESPACE, 'rPr')[0]
        || null;
    const defaults = {
        ...runTraits(defaultRunProperties),
        pageBreakBefore: false
    };
    const styles = new Map();
    let defaultParagraphStyleId = '';
    let defaultTableStyleId = '';
    wordElements(stylesDoc, 'style').forEach((style) => {
        const id = wordAttribute(style, 'styleId');
        if (!id) return;
        const type = wordAttribute(style, 'type') || '';
        const defaultValue = String(wordAttribute(style, 'default') || '').toLowerCase();
        if (
            type === 'paragraph'
            && ['1', 'true', 'on', 'yes'].includes(defaultValue)
        ) {
            defaultParagraphStyleId = id;
        }
        if (
            type === 'table'
            && ['1', 'true', 'on', 'yes'].includes(defaultValue)
        ) {
            defaultTableStyleId = id;
        }
        const properties = directWordChild(style, 'pPr');
        const styleRunProperties = directWordChild(style, 'rPr');
        const conditional = new Map();
        Array.from(style.children || [])
            .filter((child) => (
                child.namespaceURI === WORD_NAMESPACE
                && child.localName === 'tblStylePr'
            ))
            .forEach((part) => {
                const partType = wordAttribute(part, 'type');
                if (!partType) return;
                conditional.set(
                    partType,
                    runTraits(directWordChild(part, 'rPr'))
                );
            });
        styles.set(id, {
            id,
            type,
            name: wordAttribute(directWordChild(style, 'name'), 'val') || id,
            basedOn: wordAttribute(directWordChild(style, 'basedOn'), 'val') || '',
            conditional,
            traits: overlayTraits(
                paragraphTraits(properties),
                runTraits(styleRunProperties)
            )
        });
    });

    const explicitCache = new Map();
    const resolveExplicit = (id, visiting = new Set()) => {
        if (!id || !styles.has(id)) return {};
        if (explicitCache.has(id)) return explicitCache.get(id);
        if (visiting.has(id)) return {};
        visiting.add(id);
        const style = styles.get(id);
        const inherited = style.basedOn
            ? resolveExplicit(style.basedOn, visiting)
            : {};
        const result = overlayTraits(inherited, style.traits);
        visiting.delete(id);
        explicitCache.set(id, result);
        return result;
    };
    const resolve = (id) => overlayTraits(defaults, resolveExplicit(id));
    const resolveTable = (id, parts = [], visiting = new Set()) => {
        if (!id || !styles.has(id) || visiting.has(id)) return {};
        visiting.add(id);
        const style = styles.get(id);
        let result = style.basedOn
            ? resolveTable(style.basedOn, parts, visiting)
            : {};
        result = overlayTraits(result, style.traits);
        parts.forEach((part) => {
            result = overlayTraits(result, style.conditional.get(part));
        });
        visiting.delete(id);
        return result;
    };

    return {
        defaultParagraphStyleId,
        defaultTableStyleId,
        defaults,
        styles,
        resolve,
        resolveExplicit,
        resolveTable
    };
}

function closestWordAncestor(element, localName) {
    let current = element?.parentElement || null;
    while (current) {
        if (
            current.namespaceURI === WORD_NAMESPACE
            && current.localName === localName
        ) {
            return current;
        }
        current = current.parentElement;
    }
    return null;
}

function onOffAttributeValue(value) {
    if (value === null || value === undefined || value === '') return undefined;
    return !['0', 'false', 'off', 'no', 'none'].includes(
        String(value).trim().toLowerCase()
    );
}

function conditionalFlag(properties, name, mask) {
    const conditional = directWordChild(properties, 'cnfStyle');
    const explicit = onOffAttributeValue(wordAttribute(conditional, name));
    if (explicit !== undefined) return explicit;
    const raw = wordAttribute(conditional, 'val');
    if (!raw) return false;
    const value = Number.parseInt(raw, 16);
    return Number.isFinite(value) && (value & mask) !== 0;
}

function tableLookFlag(tableProperties, name, mask) {
    const look = directWordChild(tableProperties, 'tblLook');
    const explicit = onOffAttributeValue(wordAttribute(look, name));
    if (explicit !== undefined) return explicit;
    const raw = wordAttribute(look, 'val');
    if (!raw) return false;
    const value = Number.parseInt(raw, 16);
    return Number.isFinite(value) && (value & mask) !== 0;
}

function tableStyleContext(paragraph) {
    const table = closestWordAncestor(paragraph, 'tbl');
    if (!table) {
        return {
            inTable: false,
            id: '',
            parts: [],
            repeatingHeader: false
        };
    }
    const tableProperties = directWordChild(table, 'tblPr');
    const id = wordAttribute(directWordChild(tableProperties, 'tblStyle'), 'val') || '';
    const row = closestWordAncestor(paragraph, 'tr');
    const cell = closestWordAncestor(paragraph, 'tc');
    const rowProperties = directWordChild(row, 'trPr');
    const cellProperties = directWordChild(cell, 'tcPr');
    const rows = wordElements(table, 'tr').filter((candidate) => (
        closestWordAncestor(candidate, 'tbl') === table
    ));
    const cells = row
        ? wordElements(row, 'tc').filter((candidate) => (
            closestWordAncestor(candidate, 'tr') === row
        ))
        : [];
    const rowIndex = rows.indexOf(row);
    const cellIndex = cells.indexOf(cell);
    const lookFirstRow = tableLookFlag(tableProperties, 'firstRow', 0x0020);
    const lookLastRow = tableLookFlag(tableProperties, 'lastRow', 0x0040);
    const lookFirstCol = tableLookFlag(tableProperties, 'firstColumn', 0x0080);
    const lookLastCol = tableLookFlag(tableProperties, 'lastColumn', 0x0100);
    const firstRow = rowIndex === 0 && (
        lookFirstRow
        || conditionalFlag(rowProperties, 'firstRow', 0x0800)
        || conditionalFlag(cellProperties, 'firstRow', 0x0800)
    );
    const lastRow = rowIndex === rows.length - 1 && rowIndex >= 0 && (
        lookLastRow
        || conditionalFlag(rowProperties, 'lastRow', 0x0400)
        || conditionalFlag(cellProperties, 'lastRow', 0x0400)
    );
    const firstCol = cellIndex === 0 && (
        lookFirstCol
        || conditionalFlag(cellProperties, 'firstColumn', 0x0200)
    );
    const lastCol = cellIndex === cells.length - 1 && cellIndex >= 0 && (
        lookLastCol
        || conditionalFlag(cellProperties, 'lastColumn', 0x0100)
    );
    const parts = [];
    const horizontalBands = !tableLookFlag(tableProperties, 'noHBand', 0x0200);
    const verticalBands = !tableLookFlag(tableProperties, 'noVBand', 0x0400);
    const rowBandSize = Math.max(
        1,
        Number(wordAttribute(
            directWordChild(tableProperties, 'tblStyleRowBandSize'),
            'val'
        )) || 1
    );
    const columnBandSize = Math.max(
        1,
        Number(wordAttribute(
            directWordChild(tableProperties, 'tblStyleColBandSize'),
            'val'
        )) || 1
    );
    const bandRowIndex = rowIndex - (lookFirstRow ? 1 : 0);
    const bandColumnIndex = cellIndex - (lookFirstCol ? 1 : 0);
    if (
        horizontalBands
        && bandRowIndex >= 0
        && !(lookLastRow && rowIndex === rows.length - 1)
    ) {
        parts.push(
            Math.floor(bandRowIndex / rowBandSize) % 2 === 0
                ? 'band1Horz'
                : 'band2Horz'
        );
    }
    if (
        verticalBands
        && bandColumnIndex >= 0
        && !(lookLastCol && cellIndex === cells.length - 1)
    ) {
        parts.push(
            Math.floor(bandColumnIndex / columnBandSize) % 2 === 0
                ? 'band1Vert'
                : 'band2Vert'
        );
    }
    if (firstCol) parts.push('firstCol');
    if (lastCol) parts.push('lastCol');
    if (lastRow) {
        parts.push('lastRow');
        if (firstCol) parts.push('swCell');
        if (lastCol) parts.push('seCell');
    }
    if (firstRow) {
        parts.push('firstRow');
        if (firstCol) parts.push('nwCell');
        if (lastCol) parts.push('neCell');
    }
    const repeatingHeader = readOnOff(
        directWordChild(rowProperties, 'tblHeader')
    ) === true;
    return { inTable: true, id, parts, repeatingHeader };
}

function resolveToggle(defaultValue, levels, directValue) {
    if (directValue !== undefined) return directValue;
    // ISO/IEC 29500 §17.7.3: a true document default remains true unless
    // direct formatting absolutely overrides it. Otherwise, resolved style
    // levels are toggle values and combine by XOR.
    if (defaultValue === true) return true;
    return levels.reduce(
        (value, levelValue) => levelValue === true ? !value : value,
        false
    );
}

function resolveOverride(defaultValue, levels, directValue) {
    if (directValue !== undefined) return directValue;
    let value = defaultValue === true;
    levels.forEach((levelValue) => {
        if (levelValue !== undefined) value = levelValue;
    });
    return value;
}

function styleDefinesTypography(traits) {
    return ['bold', 'boldCs', 'italic', 'italicCs', 'underline', 'strike']
        .some((name) => traits?.[name] !== undefined);
}

function ensureKoboForgeRunStyle(stylesDoc, { notBold, underline, strike }) {
    const traits = [
        notBold ? 'Not Bold' : '',
        underline ? 'Underline' : '',
        strike ? 'Strike' : ''
    ].filter(Boolean);
    if (!traits.length) return '';
    const expectedName = `KoboForge ${traits.join(' ')}`;
    const existing = wordElements(stylesDoc, 'style').find((style) => (
        wordAttribute(directWordChild(style, 'name'), 'val') === expectedName
    ));
    if (existing) return wordAttribute(existing, 'styleId');
    const baseId = expectedName.replace(/[^A-Za-z0-9]/g, '');
    let id = baseId;
    let suffix = 2;
    const ids = new Set(
        wordElements(stylesDoc, 'style')
            .map((style) => wordAttribute(style, 'styleId'))
            .filter(Boolean)
    );
    while (ids.has(id)) {
        id = `${baseId}${suffix}`;
        suffix += 1;
    }
    const style = stylesDoc.createElementNS(WORD_NAMESPACE, 'w:style');
    style.setAttributeNS(WORD_NAMESPACE, 'w:type', 'character');
    style.setAttributeNS(WORD_NAMESPACE, 'w:styleId', id);
    const name = stylesDoc.createElementNS(WORD_NAMESPACE, 'w:name');
    name.setAttributeNS(WORD_NAMESPACE, 'w:val', expectedName);
    style.appendChild(name);
    stylesDoc.documentElement.appendChild(style);
    return id;
}

function setRunStyle(doc, runProperties, styleId) {
    directWordChild(runProperties, 'rStyle')?.remove();
    if (!styleId) return;
    const style = doc.createElementNS(WORD_NAMESPACE, 'w:rStyle');
    style.setAttributeNS(WORD_NAMESPACE, 'w:val', styleId);
    runProperties.insertBefore(style, runProperties.firstChild);
}

function isComplexScriptCharacter(character) {
    if (!character || /\s/u.test(character)) return null;
    const code = character.codePointAt(0);
    return (
        (code >= 0x0590 && code <= 0x08ff)
        || (code >= 0x0900 && code <= 0x109f)
        || (code >= 0x1780 && code <= 0x17ff)
        || (code >= 0x1c00 && code <= 0x1cff)
        || (code >= 0xa800 && code <= 0xa8ff)
        || (code >= 0xfb1d && code <= 0xfdff)
        || (code >= 0xfe70 && code <= 0xfeff)
    );
}

function scriptSegments(value) {
    const characters = Array.from(String(value || ''));
    const explicit = characters.map(isComplexScriptCharacter);
    return characters.reduce((segments, character, index) => {
        let complex = explicit[index];
        if (complex === null) {
            complex = segments[segments.length - 1]?.complex;
            if (complex === undefined) {
                complex = explicit.slice(index + 1).find((item) => item !== null) ?? false;
            }
        }
        const current = segments[segments.length - 1];
        if (current?.complex === complex) current.text += character;
        else segments.push({ text: character, complex });
        return segments;
    }, []);
}

function cloneRunForContent(run, properties, content, doc) {
    const clone = doc.createElementNS(WORD_NAMESPACE, 'w:r');
    Array.from(run.attributes || []).forEach((attribute) => {
        clone.setAttributeNS(attribute.namespaceURI, attribute.name, attribute.value);
    });
    if (properties) clone.appendChild(properties.cloneNode(true));
    clone.appendChild(content);
    return clone;
}

function splitRunByScript(run, doc) {
    const properties = directWordChild(run, 'rPr');
    const forceComplex = (
        readOnOff(directWordChild(properties, 'cs')) === true
        || readOnOff(directWordChild(properties, 'rtl')) === true
    );
    const text = wordElements(run, 't').map((node) => node.textContent || '').join('');
    const hasComplex = forceComplex || Array.from(text).some((character) => (
        isComplexScriptCharacter(character) === true
    ));
    const hasNonComplex = !forceComplex && Array.from(text).some((character) => (
        isComplexScriptCharacter(character) === false
    ));
    if (!hasComplex || !hasNonComplex) {
        return [{ run, complex: hasComplex }];
    }

    const output = [];
    const fragment = doc.createDocumentFragment();
    Array.from(run.childNodes).forEach((child) => {
        if (
            child.nodeType === 1
            && child.namespaceURI === WORD_NAMESPACE
            && child.localName === 'rPr'
        ) {
            return;
        }
        if (
            child.nodeType === 1
            && child.namespaceURI === WORD_NAMESPACE
            && child.localName === 't'
        ) {
            scriptSegments(child.textContent || '').forEach((segment) => {
                const textNode = child.cloneNode(false);
                textNode.textContent = segment.text;
                if (/^\s|\s$/u.test(segment.text)) {
                    textNode.setAttributeNS(
                        'http://www.w3.org/XML/1998/namespace',
                        'xml:space',
                        'preserve'
                    );
                }
                const segmentRun = cloneRunForContent(run, properties, textNode, doc);
                fragment.appendChild(segmentRun);
                output.push({ run: segmentRun, complex: segment.complex });
            });
            return;
        }
        const contentRun = cloneRunForContent(run, properties, child, doc);
        fragment.appendChild(contentRun);
        output.push({ run: contentRun, complex: forceComplex });
    });
    run.replaceWith(fragment);
    return output;
}

function setDirectRunTrait(doc, runProperties, name, enabled) {
    const complexName = name === 'b' ? 'bCs' : 'iCs';
    [name, complexName].forEach((propertyName) => {
        Array.from(runProperties.children || [])
            .filter((child) => (
                child.namespaceURI === WORD_NAMESPACE
                && child.localName === propertyName
            ))
            .forEach((child) => child.remove());
    });
    if (!enabled) return;
    const property = doc.createElementNS(WORD_NAMESPACE, `w:${name}`);
    property.setAttributeNS(WORD_NAMESPACE, 'w:val', '1');
    runProperties.appendChild(property);
}

function ensureRunProperties(doc, run) {
    let properties = directWordChild(run, 'rPr');
    if (properties) return properties;
    properties = doc.createElementNS(WORD_NAMESPACE, 'w:rPr');
    run.insertBefore(properties, run.firstChild);
    return properties;
}

function createPageBreakRun(doc) {
    const run = doc.createElementNS(WORD_NAMESPACE, 'w:r');
    const br = doc.createElementNS(WORD_NAMESPACE, 'w:br');
    br.setAttributeNS(WORD_NAMESPACE, 'w:type', 'page');
    run.appendChild(br);
    return run;
}

function mappedBreakType(element) {
    if (
        element?.namespaceURI !== WORD_NAMESPACE
        || element.localName !== 'br'
    ) {
        return false;
    }
    return ['page', 'column'].includes(wordAttribute(element, 'type'));
}

function isolateMappedBreakRuns(paragraph, doc) {
    wordElements(paragraph, 'r').forEach((run) => {
        const content = Array.from(run.childNodes).filter((node) => (
            !(
                node.nodeType === 1
                && node.namespaceURI === WORD_NAMESPACE
                && node.localName === 'rPr'
            )
            && !(node.nodeType === 3 && !(node.nodeValue || '').trim())
        ));
        if (!content.some(mappedBreakType)) return;
        const properties = directWordChild(run, 'rPr');
        const fragment = doc.createDocumentFragment();
        let textRun = null;
        const ensureTextRun = () => {
            if (textRun) return textRun;
            textRun = doc.createElementNS(WORD_NAMESPACE, 'w:r');
            Array.from(run.attributes || []).forEach((attribute) => {
                textRun.setAttributeNS(
                    attribute.namespaceURI,
                    attribute.name,
                    attribute.value
                );
            });
            if (properties) textRun.appendChild(properties.cloneNode(true));
            fragment.appendChild(textRun);
            return textRun;
        };
        content.forEach((node) => {
            if (mappedBreakType(node)) {
                textRun = null;
                const breakRun = doc.createElementNS(WORD_NAMESPACE, 'w:r');
                breakRun.appendChild(node);
                fragment.appendChild(breakRun);
            } else {
                ensureTextRun().appendChild(node);
            }
        });
        run.replaceWith(fragment);
    });
}

function runContainsOnlyMappedBreak(run) {
    const content = Array.from(run.children || []).filter((child) => (
        !(child.namespaceURI === WORD_NAMESPACE && child.localName === 'rPr')
    ));
    return !!content.length && content.every(mappedBreakType);
}

function runBoundaryIsPageBreak(run, edge) {
    const content = Array.from(run.children || []).filter((child) => (
        !(child.namespaceURI === WORD_NAMESPACE && child.localName === 'rPr')
    ));
    const boundary = edge === 'start' ? content[0] : content[content.length - 1];
    return mappedBreakType(boundary) && wordAttribute(boundary, 'type') === 'page';
}

function paragraphStartsWithPageBreak(paragraph) {
    const firstRun = Array.from(paragraph.children || []).find((child) => (
        child.namespaceURI === WORD_NAMESPACE && child.localName === 'r'
    ));
    return !!firstRun && runBoundaryIsPageBreak(firstRun, 'start');
}

function paragraphEndsWithPageBreak(paragraph) {
    const runs = Array.from(paragraph.children || []).filter((child) => (
        child.namespaceURI === WORD_NAMESPACE && child.localName === 'r'
    ));
    return !!runs.length && runBoundaryIsPageBreak(runs[runs.length - 1], 'end');
}

function styleIdFrom(properties, propertyName) {
    return wordAttribute(directWordChild(properties, propertyName), 'val') || '';
}

/**
 * Materialize Word's inherited bold/italic properties into runs and convert
 * paragraph/section hard breaks into ordinary page-break runs that Mammoth
 * can map. This keeps the browser converter local while covering properties
 * Mammoth deliberately omits from its semantic HTML model.
 */
export async function prepareDocxForFidelity(arrayBuffer, {
    JSZipCtor,
    DOMParserCtor = globalThis.DOMParser,
    XMLSerializerCtor = globalThis.XMLSerializer
} = {}) {
    if (!JSZipCtor || !DOMParserCtor || !XMLSerializerCtor) {
        throw new Error('DOCX fidelity helpers are unavailable in this browser.');
    }
    const zip = await JSZipCtor.loadAsync(arrayBuffer);
    const documentFile = zip.file('word/document.xml');
    if (!documentFile) {
        throw new Error('This DOCX has no word/document.xml body.');
    }
    const [documentXml, stylesXml, numberingXml] = await Promise.all([
        documentFile.async('string'),
        zip.file('word/styles.xml')?.async('string') || Promise.resolve(''),
        zip.file('word/numbering.xml')?.async('string') || Promise.resolve('')
    ]);
    const documentDoc = parseWordXml(documentXml, DOMParserCtor);
    const stylesDoc = stylesXml
        ? parseWordXml(stylesXml, DOMParserCtor)
        : parseWordXml(
            `<w:styles xmlns:w="${WORD_NAMESPACE}"></w:styles>`,
            DOMParserCtor
        );
    const numberingModel = parseDocxNumberingModel(numberingXml, DOMParserCtor);
    const styleModel = docxStyleModel(stylesDoc);
    const stats = {
        materializedRuns: 0,
        pageBreakBefore: 0,
        sectionBreaks: 0,
        paritySectionBreaks: 0,
        emptyListSeparatorsRemoved: 0,
        underlinedRuns: 0,
        struckRuns: 0,
        noteSpaceRegions: 0,
        noteSpaceLines: 0,
        listPlanItems: 0
    };

    // Capture substantial authored gaps before list cleanup removes raw empty
    // paragraphs that would otherwise split Mammoth's list output.
    const spacingPlan = buildDocxSpacingPlan(documentDoc);
    stats.noteSpaceRegions = spacingPlan.length;
    stats.noteSpaceLines = spacingPlan.reduce((total, item) => total + item.lines, 0);

    // Empty paragraphs between list items force Mammoth to emit one <ol>/<ul>
    // per item. Their visual meaning now lives in spacingPlan, so the raw
    // separators can be collapsed before list structure is rebuilt.
    stats.emptyListSeparatorsRemoved = stripEmptyParagraphsBetweenListItems(documentDoc);

    wordElements(documentDoc, 'p').forEach((paragraph) => {
        const paragraphProperties = directWordChild(paragraph, 'pPr');
        const paragraphStyleId = styleIdFrom(paragraphProperties, 'pStyle')
            || styleModel.defaultParagraphStyleId;
        const paragraphLevel = paragraphStyleId
            ? styleModel.resolveExplicit(paragraphStyleId)
            : {};
        const directParagraph = paragraphTraits(paragraphProperties);
        const tableContext = tableStyleContext(paragraph);
        const tableStyleId = tableContext.inTable
            ? (tableContext.id || styleModel.defaultTableStyleId)
            : '';
        const tableLevel = tableStyleId
            ? styleModel.resolveTable(tableStyleId, tableContext.parts)
            : {};
        const paragraphStyle = styleModel.styles.get(paragraphStyleId);
        const structuralHeading = (
            paragraphStyle?.type === 'paragraph'
            && /^heading\s*[1-6]$/i.test(paragraphStyle.name || '')
        );
        const pageBreakBefore = directParagraph.pageBreakBefore
            ?? paragraphLevel.pageBreakBefore
            ?? false;

        if (
            pageBreakBefore
            && !paragraphStartsWithPageBreak(paragraph)
        ) {
            const reference = paragraphProperties?.nextSibling || paragraph.firstChild;
            paragraph.insertBefore(createPageBreakRun(documentDoc), reference);
            stats.pageBreakBefore += 1;
        }

        const sectionProperties = directWordChild(paragraphProperties, 'sectPr');
        const sectionType = wordAttribute(
            directWordChild(sectionProperties, 'type'),
            'val'
        ) || 'nextPage';
        if (
            sectionProperties
            && sectionType !== 'continuous'
            && !paragraphEndsWithPageBreak(paragraph)
        ) {
            paragraph.appendChild(createPageBreakRun(documentDoc));
            stats.sectionBreaks += 1;
            if (sectionType === 'oddPage' || sectionType === 'evenPage') {
                stats.paritySectionBreaks += 1;
            }
        }

        isolateMappedBreakRuns(paragraph, documentDoc);
        wordElements(paragraph, 'r').forEach((run) => {
            if (runContainsOnlyMappedBreak(run)) return;
            const originalProperties = directWordChild(run, 'rPr');
            const runStyleId = styleIdFrom(originalProperties, 'rStyle');
            const characterLevel = runStyleId
                ? styleModel.resolveExplicit(runStyleId)
                : {};
            const direct = runTraits(originalProperties);
            const latin = {
                bold: resolveToggle(
                    styleModel.defaults.bold,
                    [tableLevel.bold, paragraphLevel.bold, characterLevel.bold],
                    direct.bold
                ),
                italic: resolveToggle(
                    styleModel.defaults.italic,
                    [tableLevel.italic, paragraphLevel.italic, characterLevel.italic],
                    direct.italic
                )
            };
            const complex = {
                bold: resolveToggle(
                    styleModel.defaults.boldCs,
                    [tableLevel.boldCs, paragraphLevel.boldCs, characterLevel.boldCs],
                    direct.boldCs
                ),
                italic: resolveToggle(
                    styleModel.defaults.italicCs,
                    [tableLevel.italicCs, paragraphLevel.italicCs, characterLevel.italicCs],
                    direct.italicCs
                )
            };
            const decoration = {
                underline: resolveOverride(
                    styleModel.defaults.underline,
                    [tableLevel.underline, paragraphLevel.underline, characterLevel.underline],
                    direct.underline
                ),
                strike: resolveOverride(
                    styleModel.defaults.strike,
                    [tableLevel.strike, paragraphLevel.strike, characterLevel.strike],
                    direct.strike
                )
            };
            const styleCarriesTypography = styleDefinesTypography(characterLevel);

            splitRunByScript(run, documentDoc).forEach((segment) => {
                const effective = segment.complex ? complex : latin;
                const needsBoldReset = structuralHeading && !effective.bold;
                let runProperties = ensureRunProperties(documentDoc, segment.run);
                setDirectRunTrait(documentDoc, runProperties, 'b', effective.bold);
                setDirectRunTrait(documentDoc, runProperties, 'i', effective.italic);
                const presentationStyleId = ensureKoboForgeRunStyle(stylesDoc, {
                    notBold: needsBoldReset,
                    underline: decoration.underline,
                    strike: decoration.strike
                });
                if (presentationStyleId) {
                    setRunStyle(documentDoc, runProperties, presentationStyleId);
                } else if (styleCarriesTypography) {
                    setRunStyle(documentDoc, runProperties, '');
                }
                if (decoration.underline) stats.underlinedRuns += 1;
                if (decoration.strike) stats.struckRuns += 1;
                if (
                    effective.bold
                    || effective.italic
                    || decoration.underline
                    || decoration.strike
                    || styleCarriesTypography
                    || needsBoldReset
                ) {
                    stats.materializedRuns += 1;
                }
            });
        });
    });

    zip.file(
        'word/document.xml',
        new XMLSerializerCtor().serializeToString(documentDoc)
    );
    if (wordElements(stylesDoc, 'style').some((style) => (
        /^KoboForge /.test(wordAttribute(directWordChild(style, 'name'), 'val') || '')
    ))) {
        zip.file(
            'word/styles.xml',
            new XMLSerializerCtor().serializeToString(stylesDoc)
        );
    }
    const listPlan = buildDocxListPlan(documentDoc, numberingModel);
    stats.listPlanItems = listPlan.length;

    return {
        arrayBuffer: await zip.generateAsync({
            type: 'arraybuffer',
            compression: 'DEFLATE',
            compressionOptions: { level: 6 }
        }),
        stats,
        listPlan,
        spacingPlan
    };
}

function forcedBreakValue(value) {
    return /^(always|page|column|all|left|right|recto|verso)$/i.test(
        String(value || '').trim()
    );
}

function createHtmlPageBreak(doc) {
    const marker = doc.createElement('hr');
    marker.className = 'kf-page-break';
    return marker;
}

function adjacentElement(element, direction) {
    let node = direction === 'before' ? element.previousSibling : element.nextSibling;
    while (node?.nodeType === 3 && !(node.nodeValue || '').trim()) {
        node = direction === 'before' ? node.previousSibling : node.nextSibling;
    }
    return node?.nodeType === 1 ? node : null;
}

function splitTableBeforeRow(row, doc) {
    const table = row?.closest?.('table');
    const section = row?.parentElement;
    if (!table || !section || section.tagName === 'THEAD') {
        table?.classList?.add('kf-break-before');
        return row;
    }
    const earlierBodyRows = Array.from(table.rows).filter((candidate) => (
        candidate !== row
        && !candidate.closest('thead')
        && (candidate.compareDocumentPosition(row) & 4)
    ));
    if (!earlierBodyRows.length) {
        table.classList.add('kf-break-before');
        return row;
    }

    const trailingTable = table.cloneNode(false);
    Array.from(table.children).forEach((child) => {
        if (child === section) {
            const trailingSection = section.cloneNode(false);
            let current = row;
            while (current) {
                const next = current.nextSibling;
                trailingSection.appendChild(current);
                current = next;
            }
            trailingTable.appendChild(trailingSection);
            return;
        }
        if (child.compareDocumentPosition(section) & 4) {
            if (['CAPTION', 'COLGROUP', 'THEAD'].includes(child.tagName)) {
                trailingTable.appendChild(child.cloneNode(true));
            }
            return;
        }
        trailingTable.appendChild(child);
    });
    trailingTable.classList.add('kf-break-before');
    table.parentNode?.insertBefore(trailingTable, table.nextSibling);
    return row;
}

function applyForcedBreak(element, direction, doc) {
    if (element.matches('tr')) {
        if (direction === 'before') return splitTableBeforeRow(element, doc);
        const table = element.closest('table');
        const rows = Array.from(table?.rows || []);
        const nextRow = rows[rows.indexOf(element) + 1];
        if (nextRow) return splitTableBeforeRow(nextRow, doc);
        table?.classList?.add('kf-break-after');
        return element;
    }
    element.classList.add(direction === 'before' ? 'kf-break-before' : 'kf-break-after');
    return element;
}

function wrapRootInlineRuns(root, doc) {
    const blockTags = new Set([
        'ADDRESS', 'ARTICLE', 'ASIDE', 'BLOCKQUOTE', 'DIV', 'DL', 'FIELDSET',
        'FIGCAPTION', 'FIGURE', 'FOOTER', 'FORM', 'H1', 'H2', 'H3', 'H4',
        'H5', 'H6', 'HEADER', 'HR', 'MAIN', 'NAV', 'OL', 'P', 'PRE',
        'SECTION', 'TABLE', 'UL'
    ]);
    let paragraph = null;
    Array.from(root.childNodes).forEach((node) => {
        const isWhitespace = node.nodeType === 3 && !(node.nodeValue || '').trim();
        const isBlock = node.nodeType === 1 && blockTags.has(node.tagName);
        if (isBlock) {
            paragraph = null;
            return;
        }
        if (isWhitespace && !paragraph) return;
        if (!paragraph) {
            paragraph = doc.createElement('p');
            root.insertBefore(paragraph, node);
        }
        paragraph.appendChild(node);
    });
}

function previousSubstantiveElement(element) {
    let node = element.previousSibling;
    while (node) {
        if (node.nodeType === 3 && !(node.nodeValue || '').trim()) {
            node = node.previousSibling;
            continue;
        }
        if (
            node.nodeType === 1
            && !(node.textContent || '').trim()
            && node.matches('p:empty')
        ) {
            node = node.previousSibling;
            continue;
        }
        return node.nodeType === 1 ? node : null;
    }
    return null;
}

/**
 * Normalize imported/manual HTML break conventions into one durable marker.
 * Forced CSS breaks are converted before inline styles are cleaned.
 */
export function normalizeHtmlPageBreaks(root, doc, { forExport = false } = {}) {
    if (!root || !doc) return;

    Array.from(root.querySelectorAll('[style]')).forEach((element) => {
        if (element.classList.contains('kf-page-break')) return;
        const before = element.style.breakBefore || element.style.pageBreakBefore;
        const after = element.style.breakAfter || element.style.pageBreakAfter;
        let target = element;
        if (forcedBreakValue(before)) {
            element.style.removeProperty('break-before');
            element.style.removeProperty('page-break-before');
            target = applyForcedBreak(target, 'before', doc);
        }
        if (forcedBreakValue(after)) {
            element.style.removeProperty('break-after');
            element.style.removeProperty('page-break-after');
            applyForcedBreak(target, 'after', doc);
        }
        if (!element.getAttribute('style')?.trim()) element.removeAttribute('style');
    });

    root.querySelectorAll(
        '[data-kf-page-break], hr.page-break, div.page-break, .pagebreak'
    ).forEach((element) => {
        if (element.classList.contains('kf-page-break')) return;
        if ((element.textContent || '').trim() || element.querySelector('img,table')) {
            applyForcedBreak(element, 'before', doc);
            element.classList.remove('page-break', 'pagebreak');
            element.removeAttribute('data-kf-page-break');
            return;
        }
        element.className = 'kf-page-break';
        element.removeAttribute('data-kf-page-break');
    });

    Array.from(root.querySelectorAll('.kf-page-break')).forEach((marker) => {
        const next = adjacentElement(marker, 'after');
        if (next?.classList?.contains('kf-pdf-page')) {
            marker.remove();
            return;
        }
        if (marker.parentElement?.matches('ol,ul')) {
            if (next?.matches('li')) next.classList.add('kf-break-before');
            else marker.previousElementSibling?.classList?.add('kf-break-after');
            marker.remove();
            return;
        }
        if (marker.tagName === 'BR') {
            const replacement = marker.parentElement === root
                ? createHtmlPageBreak(doc)
                : doc.createElement('span');
            replacement.className = 'kf-page-break';
            marker.replaceWith(replacement);
            marker = replacement;
        } else if (marker.parentElement === root && marker.tagName !== 'HR') {
            const hr = createHtmlPageBreak(doc);
            marker.replaceWith(hr);
            marker = hr;
        }
        marker.className = 'kf-page-break';
        marker.removeAttribute('id');
        marker.removeAttribute('style');
        marker.innerHTML = '';
        if (forExport) {
            [
                'contenteditable', 'role', 'aria-label', 'title',
                'data-page', 'data-kf-page-break'
            ].forEach((name) => marker.removeAttribute(name));
        } else {
            marker.setAttribute('contenteditable', 'false');
            marker.setAttribute('role', 'separator');
            marker.setAttribute('aria-label', 'Page break');
        }
    });

    wrapRootInlineRuns(root, doc);

    // CSS collapses adjacent forced breaks. Represent the extra authored
    // boundaries as explicit blank pages so leading/double breaks stay exact.
    Array.from(root.children).forEach((element) => {
        if (!element.classList.contains('kf-page-break')) return;
        const previous = previousSubstantiveElement(element);
        if (
            !previous
            || previous.classList.contains('kf-page-break')
            || previous.classList.contains('kf-blank-page')
        ) {
            const blank = doc.createElement('div');
            blank.className = 'kf-blank-page';
            if (!forExport) {
                blank.setAttribute('contenteditable', 'false');
                blank.setAttribute('role', 'separator');
                blank.setAttribute('aria-label', 'Blank page');
            }
            element.replaceWith(blank);
        }
    });

    root.querySelectorAll('.kf-blank-page').forEach((blank) => {
        blank.className = 'kf-blank-page';
        blank.innerHTML = '';
        if (forExport) {
            ['contenteditable', 'role', 'aria-label', 'title'].forEach((name) => {
                blank.removeAttribute(name);
            });
        } else {
            blank.setAttribute('contenteditable', 'false');
            blank.setAttribute('role', 'separator');
            blank.setAttribute('aria-label', 'Blank page');
        }
    });
}

function formattingValue(element, property, fallbackPattern) {
    const value = String(element.style?.[property] || '').trim().toLowerCase();
    if (value) return value;
    const style = String(element.getAttribute('style') || '').toLowerCase();
    return style.match(fallbackPattern)?.[1]?.trim() || '';
}

function wrapsInlineContents(element) {
    return /^(A|ABBR|B|BDI|BDO|BIG|CITE|CODE|DEL|EM|FONT|I|INS|KBD|MARK|Q|S|SAMP|SMALL|SPAN|STRIKE|STRONG|SUB|SUP|TIME|U|VAR)$/
        .test(element.tagName);
}

function wrapContents(element, doc, tagName) {
    if (
        element.matches(tagName)
        || (
            element.childNodes.length === 1
            && element.firstElementChild?.matches?.(tagName)
        )
    ) {
        return;
    }
    const wrapper = doc.createElement(tagName);
    while (element.firstChild) wrapper.appendChild(element.firstChild);
    element.appendChild(wrapper);
}

function hasDecorationResetBetween(node, boundary) {
    let current = node.parentElement;
    while (current && current !== boundary) {
        const decoration = [
            formattingValue(
                current,
                'textDecorationLine',
                /(?:^|;)\s*text-decoration-line\s*:\s*([^;!]+)/
            ),
            formattingValue(
                current,
                'textDecoration',
                /(?:^|;)\s*text-decoration\s*:\s*([^;!]+)/
            )
        ].filter(Boolean).join(' ');
        if (
            current.classList.contains('kf-no-decoration')
            || /\bnone\b/.test(decoration)
        ) {
            return true;
        }
        current = current.parentElement;
    }
    return false;
}

function wrapBlockTextNodes(element, doc, tagName) {
    const matchingSelector = tagName === 'u' ? 'u' : 's,strike,del';
    const walker = doc.createTreeWalker(element, 4);
    const textNodes = [];
    while (walker.nextNode()) {
        const node = walker.currentNode;
        if (!(node.nodeValue || '').trim()) continue;
        const existing = node.parentElement?.closest?.(matchingSelector);
        if (existing && element.contains(existing)) continue;
        if (hasDecorationResetBetween(node, element)) continue;
        textNodes.push(node);
    }
    textNodes.forEach((node) => {
        const wrapper = doc.createElement(tagName);
        node.parentNode?.insertBefore(wrapper, node);
        wrapper.appendChild(node);
    });
}

/**
 * Convert browser/HTML CSS traits into semantic inline tags or allowlisted
 * block classes. Traits are independent, and explicit resets survive inherited
 * formatting.
 */
export function normalizeCssTypography(root, doc) {
    if (!root || !doc) return;
    root.querySelectorAll('b').forEach((element) => {
        const strong = doc.createElement('strong');
        Array.from(element.attributes).forEach((attribute) => {
            strong.setAttribute(attribute.name, attribute.value);
        });
        while (element.firstChild) strong.appendChild(element.firstChild);
        element.replaceWith(strong);
    });
    root.querySelectorAll('i').forEach((element) => {
        const em = doc.createElement('em');
        Array.from(element.attributes).forEach((attribute) => {
            em.setAttribute(attribute.name, attribute.value);
        });
        while (element.firstChild) em.appendChild(element.firstChild);
        element.replaceWith(em);
    });

    Array.from(root.querySelectorAll(
        '[style],.kf-bold,.kf-italic,.kf-underline,.kf-strike'
    )).forEach((element) => {
        const weight = formattingValue(
            element,
            'fontWeight',
            /(?:^|;)\s*font-weight\s*:\s*([^;!]+)/
        );
        const fontStyle = formattingValue(
            element,
            'fontStyle',
            /(?:^|;)\s*font-style\s*:\s*([^;!]+)/
        );
        const decoration = [
            formattingValue(
                element,
                'textDecorationLine',
                /(?:^|;)\s*text-decoration-line\s*:\s*([^;!]+)/
            ),
            formattingValue(
                element,
                'textDecoration',
                /(?:^|;)\s*text-decoration\s*:\s*([^;!]+)/
            )
        ].filter(Boolean).join(' ');
        const numericWeight = Number.parseInt(weight, 10);
        const bold = (
            weight === 'bold'
            || weight === 'bolder'
            || (Number.isFinite(numericWeight) && numericWeight >= 600)
        );
        const notBold = (
            weight === 'normal'
            || weight === 'lighter'
            || (Number.isFinite(numericWeight) && numericWeight <= 400)
        );
        const italic = /^(italic|oblique)(?:\s|$)/.test(fontStyle);
        const notItalic = fontStyle === 'normal';
        const underline = decoration.includes('underline');
        const strike = decoration.includes('line-through');
        const noDecoration = /\bnone\b/.test(decoration);

        if (wrapsInlineContents(element)) {
            if (bold || element.classList.contains('kf-bold')) {
                element.classList.remove('kf-bold', 'kf-not-bold');
                wrapContents(element, doc, 'strong');
            } else if (notBold) {
                element.classList.remove('kf-bold');
                element.classList.add('kf-not-bold');
            }
            if (italic || element.classList.contains('kf-italic')) {
                element.classList.remove('kf-italic', 'kf-not-italic');
                wrapContents(element, doc, 'em');
            } else if (notItalic) {
                element.classList.remove('kf-italic');
                element.classList.add('kf-not-italic');
            }
            if (underline || element.classList.contains('kf-underline')) {
                element.classList.remove('kf-underline', 'kf-no-decoration');
                wrapContents(element, doc, 'u');
            }
            if (strike || element.classList.contains('kf-strike')) {
                element.classList.remove('kf-strike', 'kf-no-decoration');
                wrapContents(element, doc, 's');
            }
        } else {
            if (bold) {
                element.classList.remove('kf-not-bold');
                element.classList.add('kf-bold');
            } else if (notBold) {
                element.classList.remove('kf-bold');
                element.classList.add('kf-not-bold');
            }
            if (italic) {
                element.classList.remove('kf-not-italic');
                element.classList.add('kf-italic');
            } else if (notItalic) {
                element.classList.remove('kf-italic');
                element.classList.add('kf-not-italic');
            }
            if (underline || element.classList.contains('kf-underline')) {
                element.classList.remove('kf-underline', 'kf-no-decoration');
                wrapBlockTextNodes(element, doc, 'u');
            }
            if (strike || element.classList.contains('kf-strike')) {
                element.classList.remove('kf-strike', 'kf-no-decoration');
                wrapBlockTextNodes(element, doc, 's');
            }
        }
        if (noDecoration) {
            element.classList.remove('kf-underline', 'kf-strike');
            element.classList.add('kf-no-decoration');
        }
        if (notBold && !bold) {
            element.classList.add('kf-not-bold');
        }
        if (notItalic && !italic) {
            element.classList.add('kf-not-italic');
        }

        [
            'font-weight', 'font-style', 'text-decoration', 'text-decoration-line'
        ].forEach((property) => element.style.removeProperty(property));
        if (!element.getAttribute('style')?.trim()) element.removeAttribute('style');
        if (!element.getAttribute('class')?.trim()) element.removeAttribute('class');
    });
}

/** Verse numbers in sermon outlines: 1–3 digits, optional letter (e.g. 12a). */
const VERSE_NUMBER_RE = /^\d{1,3}[a-zA-Z]?$/;
const LEADING_PLAIN_VERSE_RE = /^(\d{1,3}[a-zA-Z]?)([.\u00a0\s]+)(?=[“"A-Za-z(])/;

function verseNumberFromText(value) {
    const trimmed = String(value || '').replace(/\u00a0/g, ' ').trim();
    return VERSE_NUMBER_RE.test(trimmed) ? trimmed : '';
}

function createVerseMarker(doc, number, { bold = false } = {}) {
    const sup = doc.createElement('sup');
    sup.className = 'kf-verse-num';
    sup.setAttribute('data-kf-verse', number);
    if (bold) {
        const strong = doc.createElement('strong');
        strong.textContent = number;
        sup.appendChild(strong);
    } else {
        sup.textContent = number;
    }
    return sup;
}

function unwrapIfOnlyWhitespace(node) {
    if (!node || node.nodeType !== 1) return;
    if ((node.textContent || '').trim()) return;
    if (node.querySelector?.('img, br, table, .kf-page-break, .kf-blank-page, .kf-verse-num')) {
        return;
    }
    node.remove();
}

/**
 * Normalize Bible verse markers for sermon-outline EPUBs:
 * - Word/mammoth superscript (and subscript) digits → <sup class="kf-verse-num">
 * - Collapse <strong><sup>33 </sup></strong> into a single marker + trailing space
 * - Promote plain leading "13 The Lord…" numbers only when they look like verse starts
 * Does not invent markers for outline labels like "1. God goes…" or "13:25-33".
 */
export function normalizeBibleVerseMarkers(root, doc) {
    if (!root || !doc) return { markers: 0, promoted: 0 };

    let markers = 0;
    let promoted = 0;

    // 1) Explicit super/subscript digits from Word (mammoth → <sup>/<sub>).
    Array.from(root.querySelectorAll('sup, sub')).forEach((el) => {
        if (el.classList?.contains('kf-verse-num')) {
            markers += 1;
            return;
        }
        const number = verseNumberFromText(el.textContent);
        if (!number) return;

        const bold = !!(
            el.closest('strong, b')
            || el.querySelector('strong, b')
        );
        const marker = createVerseMarker(doc, number, { bold });
        const parent = el.parentElement;
        el.replaceWith(marker);
        // Collapse <strong><sup class="kf-verse-num">…</sup></strong> when the
        // strong wrapper only held the verse marker.
        if (
            parent
            && parent.matches?.('strong, b')
            && Array.from(parent.childNodes).every((child) => (
                child === marker
                || (child.nodeType === 3 && !(child.nodeValue || '').trim())
            ))
        ) {
            parent.replaceWith(marker);
        }
        // Keep a separating space after the marker so prose never glues to "33And".
        const next = marker.nextSibling;
        if (next && next.nodeType === 3) {
            if (next.nodeValue && !/^\s/.test(next.nodeValue)) {
                next.nodeValue = ` ${next.nodeValue}`;
            }
        } else if (next && next.nodeType === 1) {
            marker.after(doc.createTextNode(' '));
        }
        markers += 1;
    });

    // 2) Plain leading verse numbers: "33 And your children…" (not "1. Outline" / "13:1-3").
    const blocks = root.querySelectorAll('p, li, td, th, blockquote');
    blocks.forEach((block) => {
        // Walk first meaningful text node in the block
        const showText = doc.defaultView?.NodeFilter?.SHOW_TEXT
            ?? globalThis.NodeFilter?.SHOW_TEXT
            ?? 4;
        const walker = doc.createTreeWalker(block, showText);
        let textNode = walker.nextNode();
        while (textNode) {
            const parent = textNode.parentElement;
            if (parent?.closest?.('sup, sub, .kf-verse-num, h1, h2, h3, h4, h5, h6')) {
                textNode = walker.nextNode();
                continue;
            }
            const value = textNode.nodeValue || '';
            if (!value.trim()) {
                textNode = walker.nextNode();
                continue;
            }
            // Skip outline-style "1. Title" / "2) Title"
            if (/^\d{1,3}[.)]\s+\S/.test(value.trim())) return;
            // Skip bare scripture refs "13:1-3" or "Numbers 13:1"
            if (/^\d{1,3}:\d/.test(value.trim())) return;

            const match = LEADING_PLAIN_VERSE_RE.exec(value);
            if (!match) return;

            const number = match[1];
            const rest = value.slice(match[0].length);
            const bold = !!(parent?.closest?.('strong, b'));
            const marker = createVerseMarker(doc, number, { bold });
            const frag = doc.createDocumentFragment();
            frag.appendChild(marker);
            frag.appendChild(doc.createTextNode(` ${rest}`));
            textNode.parentNode.replaceChild(frag, textNode);
            promoted += 1;
            markers += 1;
            return;
        }
    });

    // 3) Clean empty strong wrappers left behind.
    root.querySelectorAll('strong, b').forEach(unwrapIfOnlyWhitespace);

    return { markers, promoted };
}

// ---------------------------------------------------------------------------
// Lists (DOCX numbering + plain/PDF markers + HTML rebuild)
// ---------------------------------------------------------------------------

function paragraphPlainText(paragraph) {
    return wordElements(paragraph, 't')
        .map((node) => node.textContent || '')
        .join('')
        .replace(/\u00a0/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function paragraphHasVisualContent(paragraph) {
    if (paragraphPlainText(paragraph)) return true;
    return !!(
        wordElements(paragraph, 'drawing').length
        || wordElements(paragraph, 'pict').length
        || wordElements(paragraph, 'object').length
    );
}

function blankParagraphLineUnits(paragraph) {
    const properties = directWordChild(paragraph, 'pPr');
    const spacing = directWordChild(properties, 'spacing');
    const numberValue = (name) => {
        const value = Number.parseFloat(wordAttribute(spacing, name) || '0');
        return Number.isFinite(value) ? Math.max(0, value) : 0;
    };
    const before = numberValue('before') / 240;
    const after = numberValue('after') / 240;
    const line = numberValue('line');
    const lineUnits = line ? line / 240 : 1;
    const manualBreaks = wordElements(paragraph, 'br')
        .filter((lineBreak) => !mappedBreakType(lineBreak))
        .length;
    return Math.max(1, lineUnits) + manualBreaks + before + after;
}

/**
 * Record substantial authored DOCX gaps before empty paragraphs are removed
 * for Mammoth list continuity. One ordinary empty paragraph is treated as
 * layout noise; two or more blank lines become an explicit writing region.
 */
function buildDocxSpacingPlan(documentDoc) {
    const paragraphs = Array.from(wordElements(documentDoc, 'p'));
    const plan = [];
    let index = 0;
    while (index < paragraphs.length) {
        const paragraph = paragraphs[index];
        if (!paragraphHasVisualContent(paragraph)) {
            index += 1;
            continue;
        }
        const afterText = paragraphPlainText(paragraph);
        let cursor = index + 1;
        const blankParagraphs = [];
        while (
            cursor < paragraphs.length
            && !paragraphHasVisualContent(paragraphs[cursor])
        ) {
            blankParagraphs.push(paragraphs[cursor]);
            cursor += 1;
        }
        const estimatedLines = blankParagraphs.reduce(
            (total, blank) => total + blankParagraphLineUnits(blank),
            0
        );
        const lines = Math.max(0, Math.min(12, Math.round(estimatedLines)));
        if (afterText && lines >= 2) {
            const beforeText = cursor < paragraphs.length
                ? paragraphPlainText(paragraphs[cursor])
                : '';
            plan.push({
                afterText,
                textKey: normalizeMatchKey(afterText),
                beforeText,
                beforeKey: normalizeMatchKey(beforeText),
                lines: Math.max(2, lines),
                emptyParagraphs: blankParagraphs.length
            });
        }
        index = Math.max(index + 1, cursor);
    }
    return plan;
}

function paragraphListInfo(paragraph) {
    const properties = directWordChild(paragraph, 'pPr');
    const numPr = directWordChild(properties, 'numPr');
    if (!numPr) return null;
    const ilvl = Number.parseInt(
        wordAttribute(directWordChild(numPr, 'ilvl'), 'val') || '0',
        10
    );
    const numId = wordAttribute(directWordChild(numPr, 'numId'), 'val') || '';
    if (!numId) return null;
    return {
        numId,
        ilvl: Number.isFinite(ilvl) ? Math.max(0, Math.min(8, ilvl)) : 0
    };
}

function paragraphLeftIndentTwips(paragraph) {
    const properties = directWordChild(paragraph, 'pPr');
    const ind = directWordChild(properties, 'ind');
    if (!ind) return 0;
    const left = Number.parseInt(wordAttribute(ind, 'left') || '0', 10);
    const start = Number.parseInt(wordAttribute(ind, 'start') || '0', 10);
    const value = Number.isFinite(left) && left ? left : start;
    return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function parseDocxNumberingModel(numberingXml, DOMParserCtor) {
    if (!numberingXml) {
        return { levelsByNumId: new Map() };
    }
    const numberingDoc = parseWordXml(numberingXml, DOMParserCtor);
    const abstracts = new Map();
    wordElements(numberingDoc, 'abstractNum').forEach((abstract) => {
        const id = wordAttribute(abstract, 'abstractNumId');
        if (id == null) return;
        const levels = new Map();
        wordElements(abstract, 'lvl').forEach((level) => {
            const ilvl = Number.parseInt(wordAttribute(level, 'ilvl') || '0', 10);
            const fmt = wordAttribute(directWordChild(level, 'numFmt'), 'val') || 'decimal';
            const text = wordAttribute(directWordChild(level, 'lvlText'), 'val') || '%1.';
            levels.set(ilvl, { format: fmt, text });
        });
        abstracts.set(String(id), levels);
    });
    const levelsByNumId = new Map();
    wordElements(numberingDoc, 'num').forEach((num) => {
        const numId = wordAttribute(num, 'numId');
        const abstractId = wordAttribute(
            directWordChild(num, 'abstractNumId'),
            'val'
        );
        if (numId == null || abstractId == null) return;
        levelsByNumId.set(String(numId), abstracts.get(String(abstractId)) || new Map());
    });
    return { levelsByNumId };
}

function listFormatFromWord(format) {
    const value = String(format || '').toLowerCase();
    if (value === 'bullet' || value === 'none') return 'bullet';
    if (value === 'lowerletter') return 'lowerLetter';
    if (value === 'upperletter') return 'upperLetter';
    if (value === 'lowerroman') return 'lowerRoman';
    if (value === 'upperroman') return 'upperRoman';
    if (value === 'decimal' || value === 'decimalzero') return 'decimal';
    return value || 'decimal';
}

function stripEmptyParagraphsBetweenListItems(documentDoc) {
    // Snapshot first — getElementsByTagNameNS is live and skips neighbors on delete.
    const paragraphs = Array.from(wordElements(documentDoc, 'p'));
    const toRemove = [];
    for (let index = 1; index < paragraphs.length - 1; index += 1) {
        const previous = paragraphs[index - 1];
        const current = paragraphs[index];
        const next = paragraphs[index + 1];
        if (!previous || !current || !next) continue;
        if (paragraphHasVisualContent(current)) continue;
        // Drop empty separators when either neighbour is a list item so mammoth
        // does not emit a new list for every Word list paragraph.
        if (!paragraphListInfo(previous) && !paragraphListInfo(next)) continue;
        if (!paragraphListInfo(previous) || !paragraphListInfo(next)) {
            // Still remove when both sides are list-ish after skipping other empties
            // handled by multi-pass below.
        }
        if (paragraphListInfo(previous) && paragraphListInfo(next)) {
            toRemove.push(current);
        }
    }
    // Multi-pass: collapse runs of empties between two list paragraphs.
    let removed = 0;
    toRemove.forEach((paragraph) => {
        if (paragraph.parentNode) {
            paragraph.parentNode.removeChild(paragraph);
            removed += 1;
        }
    });
    let changed = true;
    let guard = 0;
    while (changed && guard < 20) {
        changed = false;
        guard += 1;
        const live = Array.from(wordElements(documentDoc, 'p'));
        for (let index = 1; index < live.length - 1; index += 1) {
            const previous = live[index - 1];
            const current = live[index];
            const next = live[index + 1];
            if (paragraphHasVisualContent(current)) continue;
            // Walk past empty nexts to find next substantive paragraph
            let look = index + 1;
            while (look < live.length && !paragraphHasVisualContent(live[look])) look += 1;
            const nextSubstantive = live[look];
            let lookBack = index - 1;
            while (lookBack >= 0 && !paragraphHasVisualContent(live[lookBack])) lookBack -= 1;
            const prevSubstantive = live[lookBack];
            if (
                prevSubstantive
                && nextSubstantive
                && paragraphListInfo(prevSubstantive)
                && paragraphListInfo(nextSubstantive)
            ) {
                current.parentNode?.removeChild(current);
                removed += 1;
                changed = true;
                break;
            }
        }
    }
    return removed;
}

function buildDocxListPlan(documentDoc, numberingModel) {
    const plan = [];
    wordElements(documentDoc, 'p').forEach((paragraph) => {
        const text = paragraphPlainText(paragraph);
        if (!text) return;
        const list = paragraphListInfo(paragraph);
        const leftTwips = paragraphLeftIndentTwips(paragraph);
        if (!list && leftTwips < 360) return;
        let format = 'indent';
        let ilvl = leftTwips >= 1080 ? 2 : leftTwips >= 540 ? 1 : 0;
        let numId = '';
        if (list) {
            numId = list.numId;
            ilvl = list.ilvl;
            const levels = numberingModel?.levelsByNumId?.get(String(numId));
            const levelInfo = levels?.get(ilvl) || levels?.get(0);
            format = listFormatFromWord(levelInfo?.format || 'decimal');
        }
        plan.push({
            text,
            textKey: text.toLowerCase(),
            numId,
            ilvl,
            format,
            leftTwips
        });
    });
    return plan;
}

/**
 * Detect plain-text list markers (DOCX paste, PDF lines, markdown-like).
 * Returns { format, level, body } or null.
 */
export function detectPlainListMarker(text, { indentLevel = 0 } = {}) {
    const raw = String(text || '').replace(/\u00a0/g, ' ');
    const trimmed = raw.trim();
    if (!trimmed) return null;
    // Do not treat bible refs "13:1-24 Title" as list items
    if (/^\d{1,3}:\d/.test(trimmed)) return null;
    // Do not treat verse-like "33 And your children" as outline lists
    if (/^\d{1,3}\s+[“"A-Za-z]/.test(trimmed) && !/^\d{1,3}[.)]\s/.test(trimmed)) {
        return null;
    }

    let match = /^([•●▪◦‣∙·])\s+(.*)$/u.exec(trimmed);
    if (match) {
        return {
            format: 'bullet',
            level: Math.max(0, indentLevel),
            body: match[2],
            marker: match[1]
        };
    }
    match = /^([-*+])\s+(.*)$/.exec(trimmed);
    if (match) {
        return {
            format: 'bullet',
            level: Math.max(0, indentLevel),
            body: match[2],
            marker: match[1]
        };
    }
    match = /^(\d{1,3})([.)])\s+(.*)$/.exec(trimmed);
    if (match) {
        return {
            format: 'decimal',
            level: Math.max(0, indentLevel),
            body: match[3],
            marker: match[1] + match[2]
        };
    }
    match = /^([a-z])([.)])\s+(.*)$/.exec(trimmed);
    if (match) {
        return {
            format: 'lowerLetter',
            level: Math.max(1, indentLevel || 1),
            body: match[3],
            marker: match[1] + match[2]
        };
    }
    match = /^([A-Z])([.)])\s+(.*)$/.exec(trimmed);
    if (match) {
        return {
            format: 'upperLetter',
            level: Math.max(1, indentLevel || 1),
            body: match[3],
            marker: match[1] + match[2]
        };
    }
    match = /^([ivxlcdm]+)([.)])\s+(.*)$/i.exec(trimmed);
    if (match && match[1].length <= 6) {
        const lower = match[1] === match[1].toLowerCase();
        return {
            format: lower ? 'lowerRoman' : 'upperRoman',
            level: Math.max(2, indentLevel || 2),
            body: match[3],
            marker: match[1] + match[2]
        };
    }
    return null;
}

function listTagForFormat(format) {
    return format === 'bullet' ? 'ul' : 'ol';
}

function listStyleForFormat(format) {
    switch (format) {
        case 'bullet': return 'disc';
        case 'lowerLetter': return 'lower-alpha';
        case 'upperLetter': return 'upper-alpha';
        case 'lowerRoman': return 'lower-roman';
        case 'upperRoman': return 'upper-roman';
        case 'decimal':
        default: return 'decimal';
    }
}

function createNoteSpace(doc, requestedLines) {
    const lines = Math.max(2, Math.min(12, Math.round(Number(requestedLines) || 2)));
    const space = doc.createElement('div');
    space.className = `kf-note-space kf-space-${lines}`;
    space.setAttribute('data-space-lines', String(lines));
    return space;
}

function normalizeMatchKey(text) {
    return String(text || '')
        .replace(/\u00a0/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
}

function flattenBlocksForLists(root, doc) {
    const blocks = [];

    const pushListItems = (listEl, baseLevel = 0) => {
        const listTag = listEl.tagName.toLowerCase();
        const defaultFormat = listTag === 'ul' ? 'bullet' : 'decimal';
        Array.from(listEl.children || []).forEach((li) => {
            if (li.tagName?.toLowerCase() !== 'li') return;
            const nestedLists = Array.from(li.children || []).filter((child) => (
                /^(UL|OL)$/.test(child.tagName)
            ));
            const clone = li.cloneNode(true);
            clone.querySelectorAll('ul, ol').forEach((nested) => nested.remove());
            const level = Number(li.getAttribute('data-kf-list-level'));
            blocks.push({
                isList: true,
                level: Number.isFinite(level) ? level : baseLevel,
                format: li.getAttribute('data-kf-list-format') || defaultFormat,
                html: clone.innerHTML,
                text: (clone.textContent || '').replace(/\s+/g, ' ').trim()
            });
            nestedLists.forEach((nested) => {
                pushListItems(nested, (Number.isFinite(level) ? level : baseLevel) + 1);
            });
        });
    };

    Array.from(root.childNodes || []).forEach((node) => {
        if (node.nodeType !== 1) return;
        const tag = node.tagName.toLowerCase();
        if (tag === 'ul' || tag === 'ol') {
            pushListItems(node, 0);
            return;
        }
        if (
            tag === 'div'
            && !node.classList?.contains('kf-pdf-page')
            && !node.classList?.contains('kf-note-space')
        ) {
            Array.from(node.children || []).forEach((child) => {
                const childTag = child.tagName.toLowerCase();
                if (childTag === 'ul' || childTag === 'ol') {
                    pushListItems(child, 0);
                    return;
                }
                const text = (child.textContent || '').replace(/\s+/g, ' ').trim();
                if (
                    !text
                    && childTag === 'p'
                    && !child.querySelector?.('img, table, .kf-page-break, .kf-verse-num')
                ) {
                    return;
                }
                blocks.push({
                    isList: false,
                    element: child,
                    tag: childTag,
                    html: child.innerHTML,
                    text
                });
            });
            return;
        }
        const text = (node.textContent || '').replace(/\s+/g, ' ').trim();
        if (
            !text
            && tag === 'p'
            && !node.querySelector?.('img, table, .kf-page-break, .kf-verse-num')
        ) {
            return;
        }
        blocks.push({
            isList: false,
            element: node,
            tag,
            html: node.innerHTML,
            text
        });
    });
    return blocks;
}

/**
 * Rebuild list structure for sermon outlines and general docs.
 * Uses DOCX numbering plan when available; otherwise plain markers + indent.
 */
export function normalizeDocumentLists(
    root,
    doc,
    { listPlan = [], spacingPlan = [] } = {}
) {
    if (!root || !doc) return { items: 0, lists: 0, spaces: 0 };

    // Drop empty paragraphs that only separate list fragments or list items.
    Array.from(root.querySelectorAll('p')).forEach((paragraph) => {
        if (
            (paragraph.textContent || '').trim()
            || paragraph.querySelector('img, br, table, .kf-page-break, .kf-blank-page, .kf-verse-num')
        ) {
            return;
        }
        const previous = paragraph.previousElementSibling;
        const next = paragraph.nextElementSibling;
        if (
            previous
            && next
            && (
                /^(UL|OL)$/.test(previous.tagName)
                || /^(UL|OL)$/.test(next.tagName)
                || previous.querySelector?.('li')
                || next.querySelector?.('li')
            )
        ) {
            paragraph.remove();
            return;
        }
        // Also drop empty paragraphs sandwiched between any two blocks during rebuild.
        if (previous && next) paragraph.remove();
    });

    // Merge adjacent same-type sibling lists (mammoth emits one item per list).
    let guard = 0;
    while (guard < 50) {
        guard += 1;
        let merged = false;
        const children = Array.from(root.children);
        for (let index = 0; index < children.length - 1; index += 1) {
            const current = children[index];
            const next = children[index + 1];
            if (!current || !next) continue;
            if (!/^(UL|OL)$/.test(current.tagName) || current.tagName !== next.tagName) continue;
            while (next.firstChild) current.appendChild(next.firstChild);
            next.remove();
            merged = true;
            break;
        }
        if (!merged) break;
    }

    // Flatten erroneous <ul><li><ol><li>…</li></ol></li></ul> when li only wraps a list.
    root.querySelectorAll('li').forEach((li) => {
        const onlyList = Array.from(li.childNodes).filter((node) => (
            node.nodeType === 1
            || (node.nodeType === 3 && (node.nodeValue || '').trim())
        ));
        if (
            onlyList.length === 1
            && onlyList[0].nodeType === 1
            && /^(UL|OL)$/.test(onlyList[0].tagName)
        ) {
            const inner = onlyList[0];
            const parentList = li.parentElement;
            if (!parentList) return;
            while (inner.firstChild) parentList.insertBefore(inner.firstChild, li);
            li.remove();
        }
    });

    const linear = flattenBlocksForLists(root, doc);
    if (!linear.length) return { items: 0, lists: 0, spaces: 0 };

    const plan = Array.isArray(listPlan) ? listPlan.slice() : [];
    const spaces = Array.isArray(spacingPlan) ? spacingPlan.slice() : [];
    let planCursor = 0;
    let spacingCursor = 0;
    const blockKeyCounts = linear.reduce((counts, block) => {
        const key = normalizeMatchKey(block.text);
        if (key) counts.set(key, (counts.get(key) || 0) + 1);
        return counts;
    }, new Map());

    const takePlan = (text) => {
        const key = normalizeMatchKey(text);
        if (!key) return null;
        for (let index = planCursor; index < plan.length; index += 1) {
            if (plan[index].textKey === key) {
                planCursor = index + 1;
                return plan[index];
            }
        }
        for (let index = Math.max(0, planCursor - 2); index < plan.length; index += 1) {
            const entry = plan[index];
            if (
                key === entry.textKey
                || (key.length > 12 && entry.textKey.startsWith(key.slice(0, 40)))
                || (entry.textKey.length > 12 && key.startsWith(entry.textKey.slice(0, 40)))
            ) {
                planCursor = index + 1;
                return entry;
            }
        }
        return null;
    };

    const takeSpacing = (text, nextText) => {
        const key = normalizeMatchKey(text);
        if (!key) return null;
        const nextKey = normalizeMatchKey(nextText);
        const repeatedBlock = (blockKeyCounts.get(key) || 0) > 1;
        for (let index = spacingCursor; index < spaces.length; index += 1) {
            const entry = spaces[index];
            if (entry.textKey === key) {
                const expectedNextKey = entry.beforeKey
                    ?? normalizeMatchKey(entry.beforeText);
                if (repeatedBlock && expectedNextKey !== nextKey) continue;
                spacingCursor = index + 1;
                return entry;
            }
        }
        return null;
    };

    const annotated = linear.map((block, blockIndex) => {
        const meta = takePlan(block.text);
        const spaceAfterLines = takeSpacing(
            block.text,
            linear[blockIndex + 1]?.text || ''
        )?.lines || 0;

        if (meta && meta.format !== 'indent') {
            return {
                isList: true,
                level: meta.ilvl,
                format: meta.format,
                html: block.html || '',
                text: block.text,
                spaceAfterLines
            };
        }

        if (block.isList) {
            return {
                isList: true,
                level: block.level || 0,
                format: block.format || 'decimal',
                html: block.html || '',
                text: block.text,
                spaceAfterLines
            };
        }

        const indentLevel = meta?.format === 'indent'
            ? (meta.leftTwips >= 1080 ? 2 : meta.leftTwips >= 540 ? 1 : 0)
            : 0;
        const plain = detectPlainListMarker(block.text, { indentLevel });
        if (plain && (block.tag === 'p' || !block.tag)) {
            let html = block.html || '';
            const plainText = (block.text || '').trim();
            if (plainText.startsWith(plain.marker)) {
                // Prefer body text when marker was visible in the source string.
                const body = plain.body;
                if (!(block.element?.querySelector?.('strong, em, sup, sub, a, img'))) {
                    html = body;
                } else {
                    // Keep rich HTML but strip a leading marker text node if present.
                    html = block.html || body;
                }
            }
            return {
                isList: true,
                level: plain.level,
                format: plain.format,
                html,
                text: plain.body,
                spaceAfterLines
            };
        }

        return {
            isList: false,
            indentLevel,
            element: block.element,
            tag: block.tag || 'p',
            html: block.html || '',
            text: block.text,
            spaceAfterLines
        };
    });

    const fragment = doc.createDocumentFragment();
    const stack = [];
    let listCount = 0;
    let itemCount = 0;
    let spaceCount = 0;

    const closeTo = (level) => {
        while (stack.length && stack[stack.length - 1].level > level) stack.pop();
    };

    const ensureList = (level, format) => {
        closeTo(level);
        const top = stack[stack.length - 1];
        if (top && top.level === level && top.format === format) return top.list;
        if (top && top.level === level && top.format !== format) stack.pop();

        const list = doc.createElement(listTagForFormat(format));
        list.classList.add('kf-list');
        list.setAttribute('data-kf-list-format', format);
        list.style.listStyleType = listStyleForFormat(format);
        if (level > 0) list.classList.add(`kf-list-nest-${level}`);

        const parent = stack[stack.length - 1];
        if (parent && parent.level < level) {
            const lastLi = parent.list.lastElementChild;
            if (lastLi) lastLi.appendChild(list);
            else fragment.appendChild(list);
        } else {
            fragment.appendChild(list);
        }
        stack.push({ level, format, list });
        listCount += 1;
        return list;
    };

    annotated.forEach((block) => {
        if (!block.isList) {
            while (stack.length) stack.pop();
            let node;
            if (block.element) {
                node = block.element.cloneNode(true);
            } else {
                node = doc.createElement(block.tag || 'p');
                node.innerHTML = block.html || '';
            }
            if (block.indentLevel) {
                node.classList.add(`kf-indent-${Math.min(3, block.indentLevel)}`);
            }
            fragment.appendChild(node);
            if (block.spaceAfterLines) {
                fragment.appendChild(createNoteSpace(doc, block.spaceAfterLines));
                spaceCount += 1;
            }
            return;
        }
        const level = Math.max(0, Math.min(8, Number(block.level) || 0));
        const format = block.format || 'decimal';
        const list = ensureList(level, format);
        const li = doc.createElement('li');
        li.setAttribute('data-kf-list-level', String(level));
        li.setAttribute('data-kf-list-format', format);
        li.innerHTML = block.html || block.text || '';
        if (block.spaceAfterLines) {
            li.appendChild(createNoteSpace(doc, block.spaceAfterLines));
            spaceCount += 1;
        }
        list.appendChild(li);
        itemCount += 1;
    });

    while (root.firstChild) root.removeChild(root.firstChild);
    root.appendChild(fragment);
    return { items: itemCount, lists: listCount, spaces: spaceCount };
}
