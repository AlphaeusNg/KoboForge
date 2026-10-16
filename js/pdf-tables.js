/** Conservative PDF table evidence from measured lines and drawing operators. */
import { median } from "./pdf-layout.js";

/**
 * Look for an actual ruled grid in the PDF drawing operators. Text that
 * merely lines up in columns is commonly a definition list or worksheet,
 * so alignment alone must not create a table.
 */
export function detectPdfTableGeometry(operatorList, ops = {}) {
    if (!operatorList || !Number.isFinite(ops.constructPath)) {
        return { hasGrid: false, horizontalRules: 0, verticalRules: 0 };
    }
    const paintStrokeOps = new Set([
        ops.stroke,
        ops.closeStroke,
        ops.fillStroke,
        ops.eoFillStroke,
        ops.closeFillStroke,
        ops.closeEOFillStroke
    ].filter(Number.isFinite));
    const horizontalRules = [];
    const verticalRules = [];
    const strokedRectangles = [];

    operatorList.fnArray.forEach((fn, index) => {
        if (fn !== ops.constructPath) return;
        const args = operatorList.argsArray[index] || [];
        const pathOps = Array.isArray(args[0]) ? args[0] : [];
        const coordinates = Array.isArray(args[1]) ? args[1] : [];
        const bbox = Array.isArray(args[2]) ? args[2] : [];
        let width = 0;
        let height = 0;
        const isRectangle = pathOps.length === 1
            && pathOps[0] === ops.rectangle
            && coordinates.length >= 4;
        if (isRectangle) {
            width = Math.abs(Number(coordinates[2]) || 0);
            height = Math.abs(Number(coordinates[3]) || 0);
        } else if (bbox.length >= 4) {
            width = Math.abs((Number(bbox[2]) || 0) - (Number(bbox[0]) || 0));
            height = Math.abs((Number(bbox[3]) || 0) - (Number(bbox[1]) || 0));
        }
        if (width >= 24 && height <= Math.max(3, width * 0.012)) {
            horizontalRules.push({ width, height });
        }
        if (height >= 24 && width <= Math.max(3, height * 0.012)) {
            verticalRules.push({ width, height });
        }
        if (
            isRectangle
            && width >= 12
            && height >= 8
            && paintStrokeOps.has(operatorList.fnArray[index + 1])
        ) {
            strokedRectangles.push({ width, height });
        }
    });

    const repeatedCells = strokedRectangles.length >= 4
        && (() => {
            const typicalWidth = median(strokedRectangles.map((rect) => rect.width));
            const typicalHeight = median(strokedRectangles.map((rect) => rect.height));
            return strokedRectangles.filter((rect) => (
                Math.abs(rect.width - typicalWidth) <= Math.max(2, typicalWidth * 0.22)
                && Math.abs(rect.height - typicalHeight) <= Math.max(2, typicalHeight * 0.22)
            )).length >= 4;
        })();
    return {
        hasGrid: (
            horizontalRules.length >= 2
            && verticalRules.length >= 2
        ) || repeatedCells,
        horizontalRules: horizontalRules.length,
        verticalRules: verticalRules.length
    };
}

export function clusterColumnXs(xs, tolerance) {
    if (!xs.length) return [];
    const sorted = [...xs].sort((a, b) => a - b);
    const clusters = [[sorted[0]]];
    for (let i = 1; i < sorted.length; i += 1) {
        const last = clusters[clusters.length - 1];
        const center = last.reduce((s, v) => s + v, 0) / last.length;
        if (Math.abs(sorted[i] - center) <= tolerance) {
            last.push(sorted[i]);
        } else {
            clusters.push([sorted[i]]);
        }
    }
    return clusters.map((c) => c.reduce((s, v) => s + v, 0) / c.length);
}

export function lineToRow(line, colCenters, colTolerance) {
    const row = colCenters.map(() => '');
    for (const cell of line.cells) {
        let bestIdx = 0;
        let bestDist = Infinity;
        for (let i = 0; i < colCenters.length; i += 1) {
            const dist = Math.abs(cell.x - colCenters[i]);
            if (dist < bestDist) {
                bestDist = dist;
                bestIdx = i;
            }
        }
        if (bestDist > colTolerance * 2.5) continue;
        row[bestIdx] = row[bestIdx] ? `${row[bestIdx]} ${cell.text}`.trim() : cell.text.trim();
    }
    return row;
}

export function lineLooksTabular(line) {
    // A single two-part line is commonly a verse number plus prose, so the
    // base signal stays conservative. Stable two-column runs are detected
    // separately across neighbouring lines.
    if (!line.cells || line.cells.length < 3) return false;
    let bigGaps = 0;
    for (let i = 1; i < line.cells.length; i += 1) {
        const gap = line.cells[i].x - line.cells[i - 1].end;
        if (gap > Math.max(line.avgCharWidth * 3.5, 18)) bigGaps += 1;
    }
    return bigGaps >= 2;
}

export function splitPdfLineIntoColumns(line) {
    const cells = [...(line?.cells || [])].sort((a, b) => a.x - b.x);
    if (!cells.length) return [];
    const threshold = Math.max((line.avgCharWidth || 4) * 4, 20);
    const columns = [];
    cells.forEach((cell) => {
        const previous = columns[columns.length - 1];
        if (!previous || cell.x - previous.end > threshold) {
            columns.push({
                x: cell.x,
                end: cell.end,
                text: (cell.text || '').trim()
            });
            return;
        }
        previous.text = `${previous.text} ${cell.text || ''}`.replace(/\s+/g, ' ').trim();
        previous.end = Math.max(previous.end, cell.end);
    });
    return columns.filter((column) => column.text);
}

export function lineLooksLikeTwoColumnRow(line) {
    const columns = splitPdfLineIntoColumns(line);
    if (columns.length !== 2) return false;
    const first = columns[0].text.trim();
    const second = columns[1].text.trim();
    if (!first || !second) return false;
    // Reject the common PDF pattern “12  prose...” while still allowing
    // labelled rows such as “2) Security     Number”.
    if (/^\(?\d{1,3}[\).:]?$/.test(first)) return false;
    if (/^[•●▪◦*-]$/.test(first)) return false;
    return true;
}

export function stableTwoColumnLineIndexes(lines) {
    const stable = new Set();
    let index = 0;
    while (index < lines.length) {
        if (!lineLooksLikeTwoColumnRow(lines[index])) {
            index += 1;
            continue;
        }
        const run = [];
        let cursor = index;
        while (cursor < lines.length && lineLooksLikeTwoColumnRow(lines[cursor])) {
            if (run.length) {
                const previous = run[run.length - 1];
                const gap = previous.y - lines[cursor].y;
                if (gap > Math.max(previous.lineHeight * 2.4, 24)) break;
            }
            run.push(lines[cursor]);
            cursor += 1;
        }
        if (run.length >= 3) {
            const secondStarts = run.map((line) => splitPdfLineIntoColumns(line)[1].x);
            const center = median(secondStarts);
            const tolerance = Math.max(
                median(run.map((line) => line.avgCharWidth || 4)) * 3,
                20
            );
            const matching = run.filter((line) => (
                Math.abs(splitPdfLineIntoColumns(line)[1].x - center) <= tolerance
            ));
            if (matching.length === run.length) {
                run.forEach((line) => stable.add(lines.indexOf(line)));
            }
        }
        index = Math.max(cursor, index + 1);
    }
    return stable;
}


/**
 * Heading heuristic (conservative): false H2s used to split the EPUB spine
 * mid-document (e.g. “Offerings at the Tabernacle's Consecration”), so Kobo
 * looked stuck after that title while the rest lived in later spine items.
 */
export function lineLooksLikeHeading(line) {
    const t = (line.plainText || '').trim();
    if (!t || t.length > 80 || t.length < 3) return false;
    if (t.endsWith('.') && t.length > 30) return false;
    if (lineLooksTabular(line)) return false;
    // Long prose / verses starting with a number are not outline headings
    if (/^\d+\s+[“"A-Za-z]/.test(t) && t.length > 45) return false;
    // Bare bible refs stay body text unless massively oversized
    if (/^(numbers|genesis|exodus|leviticus|deuteronomy|matthew|mark|luke|john)\b/i.test(t)
        && t.length < 40
        && !/^\d+\./.test(t)) {
        const r0 = (line.maxHeight || line.lineHeight) / (line.medianHeight || 10);
        if (r0 < 1.5) return false;
    }
    const ratio = (line.maxHeight || line.lineHeight) / (line.medianHeight || 10);
    const isBold = !!line.hasBold;
    const isChapter = /^(chapter|part|section|appendix)\b/i.test(t);
    // Outline only: "1. God goes with his people" — not "1 On the day when Moses"
    const isNumberedOutline = /^\d{1,2}[\.\)]\s+\S/.test(t) && t.length <= 70 && !/^\d+\s+[A-Z]/.test(t);
    const isLetteredSection = /^[A-Z][\.\)]\s+\S/.test(t) && t.length <= 70;
    const isAllCaps = t.length <= 50
        && t === t.toUpperCase()
        && /[A-Z]/.test(t)
        && t.split(/\s+/).length <= 10;
    if (isChapter || (isAllCaps && ratio >= 1.4)) return { level: 1 };
    if ((isNumberedOutline && (ratio >= 1.15 || isBold)) || (isLetteredSection && isBold)) {
        return { level: 2 };
    }
    if (isAllCaps && ratio >= 1.22) return { level: 2 };
    if (isBold && ratio >= 1.25) return { level: 2 };
    // Size-only promotion needs a strong signal (avoids section subtitles)
    if (ratio >= 1.55) return { level: 2 };
    return null;
}
