/** PDF paragraph and authored line-break decisions from measured line inputs. */

export function pdfLineStartsStructuredBlock(line) {
    const text = (line?.plainText || '').trim();
    return /^(?:[•●▪◦*-]|\(?\d{1,3}[\).]|[A-Za-z][\).])\s+\S/.test(text);
}

export function shouldBreakPdfParagraph(previousLine, line, {
    typicalLineAdvance,
    textLeft,
    textWidth,
    typicalStart
}) {
    const verticalGap = previousLine.y - line.y;
    if (
        verticalGap > Math.max(
            previousLine.lineHeight * 1.72,
            typicalLineAdvance * 1.45
        )
    ) {
        return true;
    }
    if (pdfLineStartsStructuredBlock(line)) return true;

    const previousText = (previousLine.plainText || '').trim();
    const nextText = (line.plainText || '').trim();
    if (!previousText || !nextText) return true;
    const averageCharacter = Math.max(
        3,
        (Number(previousLine.avgCharWidth) + Number(line.avgCharWidth)) / 2 || 4
    );
    const previousFill = (
        (Number(previousLine.xEnd) || textLeft) - textLeft
    ) / Math.max(textWidth, 1);
    const startShift = (
        (Number(line.xStart) || typicalStart) - typicalStart
    ) / averageCharacter;
    const startsAsContinuation = /^[a-z,.;:!?)}\]’”]/.test(nextText);
    const previousIsOpen = /[-–—,;:(\[/]$/.test(previousText)
        || !/[.!?]["'’”)}\]]?$/.test(previousText);
    if (startsAsContinuation || previousIsOpen || previousFill >= 0.74) {
        return false;
    }

    const familyChanged = previousLine.dominantFontFamily
        && line.dominantFontFamily
        && previousLine.dominantFontFamily !== line.dominantFontFamily;
    const sizeRatio = (line.maxHeight || line.lineHeight || 10)
        / Math.max(previousLine.maxHeight || previousLine.lineHeight || 10, 1);
    if (familyChanged && (sizeRatio < 0.86 || sizeRatio > 1.16)) return true;

    const previousEndsSentence = /[.!?]["'’”)}\]]?$/.test(previousText);
    const nextStartsUppercase = /^[A-Z“"'‘]/.test(nextText);
    if (
        previousEndsSentence
        && nextStartsUppercase
        && (previousFill < 0.68 || Math.abs(startShift) >= 2.5)
    ) {
        return true;
    }
    return false;
}

export function pdfLinesLookLikeVerse(lines) {
    if (!Array.isArray(lines) || lines.length < 3) return false;
    const capitalized = lines.filter((line) => (
        /^[A-Z“"'‘]/.test((line?.plainText || '').trim())
    )).length;
    const terminated = lines.filter((line) => (
        /[.!?:]["'’”)}\]]?$/.test((line?.plainText || '').trim())
    )).length;
    return capitalized >= Math.ceil(lines.length * 0.8)
        && terminated <= Math.floor(lines.length * 0.2);
}

export function pdfLineNeedsVisibleBreak(previous, line, lines) {
    if (pdfLinesLookLikeVerse(lines)) return true;
    const styleChanged = (
        !!previous?.hasBold !== !!line?.hasBold
        || !!previous?.hasItalic !== !!line?.hasItalic
    );
    if (styleChanged || (previous?.hasBold && line?.hasBold)) return true;
    const widest = Math.max(
        ...lines.map((item) => Math.max(
            0,
            (Number(item?.xEnd) || 0) - (Number(item?.xStart) || 0)
        )),
        1
    );
    const previousWidth = Math.max(
        0,
        (Number(previous?.xEnd) || 0) - (Number(previous?.xStart) || 0)
    );
    const previousText = (previous?.plainText || '').trim();
    const nextText = (line?.plainText || '').trim();
    const shortLine = previousWidth < widest * 0.6;
    const freshStart = /^[A-Z“"'‘]/.test(nextText)
        && !/(?:[,;:–—-]|\b(?:and|or|the|to|of))$/i.test(previousText);
    return shortLine && freshStart;
}

