/** Portable PDF font traits and text normalization from measured inputs. */

export function normalizePdfFontName(name) {
    return String(name || '')
        .replace(/^[A-Z]{6}\+/, '')
        .replace(/[_-]+/g, ' ')
        .trim();
}

/**
 * Reduce PDF font names to portable EPUB traits. The original embedded
 * font cannot safely be copied out of a PDF (and often has a restricted
 * subset), so KoboForge retains its family type, weight, slant, and
 * relative size using Kobo-safe CSS stacks.
 */
export function describePdfFont(name, fallbackFamily = '') {
    const sourceName = normalizePdfFontName(name || fallbackFamily);
    const sourceKey = sourceName.toLowerCase();
    const key = `${sourceName} ${fallbackFamily}`.toLowerCase();
    let family = /\bserif\b/.test(String(fallbackFamily).toLowerCase())
        && !/\bsans[- ]?serif\b/.test(String(fallbackFamily).toLowerCase())
        ? 'serif'
        : 'sans';
    if (/(script|hand|brush|calligraph|amsterdam|cursive)/.test(sourceKey)) {
        family = 'script';
    } else if (/(mono|courier|consolas|menlo|typewriter|code)/.test(sourceKey)) {
        family = 'mono';
    } else if (/(serif|times|georgia|garamond|baskerville|palatino|playfair|cooper|cambria|bookman|didot|bodoni|caslon|lora|merriweather|constantia)/.test(sourceKey)) {
        family = 'serif';
    } else if (/(sans|arial|helvetica|montserrat|garet|canva|roboto|calibri|avenir|verdana|futura|gotham|lato)/.test(sourceKey)) {
        family = 'sans';
    }
    return {
        sourceName: sourceName || fallbackFamily || 'Unknown',
        family,
        bold: /(bold|black|heavy|semibold|semi bold|demi)/.test(key),
        italic: /(italic|oblique|slanted)/.test(key),
        light: /(light|thin|extralight|extra light)/.test(key)
    };
}

export function pdfSizeClass(fontSize, baselineSize) {
    const ratio = Math.max(0.1, Number(fontSize) / Math.max(Number(baselineSize), 1));
    if (ratio < 0.78) return 'kf-size-75';
    if (ratio < 0.92) return 'kf-size-88';
    if (ratio < 1.09) return 'kf-size-100';
    if (ratio < 1.21) return 'kf-size-112';
    if (ratio < 1.39) return 'kf-size-125';
    if (ratio < 1.64) return 'kf-size-150';
    return 'kf-size-175';
}

export function normalizePdfTokenSpacing(text) {
    return String(text || '')
        .replace(/([:;])(?=[A-Z][a-z])/g, '$1 ')
        .replace(/:(?=\d{1,2}(?:am|pm)\b)/gi, ': ')
        .replace(/(\d(?:st|nd|rd|th))(?=[A-Z][a-z])/g, '$1 ');
}

export function nearestPdfTextGap(text, estimate) {
    const gaps = [];
    String(text || '').replace(/\s+/g, (match, offset) => {
        gaps.push(offset + Math.ceil(match.length / 2));
        return match;
    });
    if (!gaps.length) {
        return Math.max(0, Math.min(String(text || '').length, estimate));
    }
    return gaps.reduce((best, value) => (
        Math.abs(value - estimate) < Math.abs(best - estimate) ? value : best
    ));
}

/**
 * Some PDF exporters emit a superscript verse number as a separate tiny
 * text item above the prose baseline. Keep it inside its visual line and,
 * when it floats over a long text item, split that item at the nearest
 * authored gap so reading order remains prose → verse → prose.
 *
 * Readability behaviour inspired by Markus Yeo's BABulletinBotV2 PDF
 * reader, reimplemented here for KoboForge's browser-only PDF.js path:
 * https://github.com/markusyeo/BABulletinBotV2
 */
export function foldFloatingPdfVerseItems(items) {
    const normalized = Array.from(items || []);
    const candidates = normalized.filter((item) => (
        /^\d{1,3}$/.test((item.text || '').trim())
        && Number(item.height) > 0
    ));

    candidates.forEach((candidate) => {
        const homes = normalized.filter((item) => {
            if (item === candidate || item.floatingVerse) return false;
            if ((item.text || '').trim().length < 5) return false;
            const homeHeight = Math.max(Number(item.height) || 0, 1);
            const lift = Number(candidate.y) - Number(item.y);
            const candidateEnd = Number(candidate.x) + Number(candidate.width || 0);
            const homeStart = Number(item.x) - homeHeight * 1.25;
            const homeEnd = Number(item.x) + Number(item.width || 0) + homeHeight * 0.25;
            return (
                Number(candidate.height) <= homeHeight * 0.78
                && lift >= homeHeight * 0.16
                && lift <= homeHeight * 1.05
                && candidateEnd >= homeStart
                && Number(candidate.x) <= homeEnd
            );
        });
        if (!homes.length) return;
        const home = homes.sort((left, right) => {
            const vertical = Math.abs(Number(candidate.y) - Number(left.y))
                - Math.abs(Number(candidate.y) - Number(right.y));
            if (vertical) return vertical;
            const distance = (item) => {
                const start = Number(item.x);
                const end = start + Number(item.width || 0);
                if (Number(candidate.x) < start) return start - Number(candidate.x);
                if (Number(candidate.x) > end) return Number(candidate.x) - end;
                return 0;
            };
            return distance(left) - distance(right);
        })[0];

        candidate.y = home.y;
        candidate.floatingVerse = true;
        const homeStart = Number(home.x);
        const homeEnd = homeStart + Number(home.width || 0);
        const verseStart = Number(candidate.x);
        if (verseStart <= homeStart || verseStart >= homeEnd) return;

        const text = String(home.text || '');
        const estimate = Math.round(
            ((verseStart - homeStart) / Math.max(Number(home.width) || 1, 1))
            * text.length
        );
        const cut = nearestPdfTextGap(text, estimate);
        if (cut <= 0 || cut >= text.length) return;
        const verseEnd = verseStart + Math.max(Number(candidate.width) || 0, 0);
        const left = {
            ...home,
            text: text.slice(0, cut),
            width: Math.max(0, verseStart - homeStart)
        };
        const right = {
            ...home,
            text: text.slice(cut).replace(/^\s+/, ''),
            x: Math.min(homeEnd, verseEnd),
            width: Math.max(0, homeEnd - verseEnd),
            explicitSpaceBefore: true
        };
        const homeIndex = normalized.indexOf(home);
        normalized.splice(homeIndex, 1, left, right);
    });

    return normalized;
}
