/** PDF geometry derived only from measured page and text inputs. */

function pdfVerticalZone(topRatio) {
    if (topRatio < 0.28) return 'top';
    if (topRatio < 0.64) return 'middle';
    return 'bottom';
}

export function detectPdfPageLayout(lines, { pageHeight = 0 } = {}) {
    const first = lines?.[0];
    const height = Math.max(Number(pageHeight) || 0, 1);
    if (!first) {
        return {
            startZone: 'top',
            offsetLevel: 0,
            topRatio: 0,
            remainingRatio: 0.92
        };
    }
    const firstTop = height - (
        Number(first.y || 0) + Number(first.maxHeight || first.lineHeight || 0)
    );
    const topRatio = Math.max(0, Math.min(0.8, firstTop / height));
    const bottomClear = Math.min(...lines.map((line) => (
        Number(line.y || 0)
        - (Number(line.maxHeight || line.lineHeight || 0) * 0.35)
    )));
    const remainingRatio = Math.max(
        0.2,
        Math.min(0.92, (bottomClear / height) - 0.025)
    );
    return {
        startZone: pdfVerticalZone(topRatio),
        // Eight export-safe classes retain the page's top whitespace
        // without introducing fixed-position text that cannot reflow.
        offsetLevel: Math.max(0, Math.min(8, Math.round(topRatio * 16))),
        topRatio,
        remainingRatio
    };
}

export function detectPdfBlockPosition(sourceLines, {
    pageWidth = 0,
    pageHeight = 0
} = {}) {
    const lines = (sourceLines || []).filter(Boolean);
    const width = Math.max(Number(pageWidth) || 0, 1);
    const height = Math.max(Number(pageHeight) || 0, 1);
    if (!lines.length) {
        return { alignment: 'left', verticalPosition: 'top' };
    }
    const left = Math.min(...lines.map((line) => Number(line.xStart) || 0));
    const rightEdge = Math.max(...lines.map((line) => Number(line.xEnd) || left));
    const leftRatio = Math.max(0, left / width);
    const rightRatio = Math.max(0, (width - rightEdge) / width);
    const occupiedRatio = Math.max(0, Math.min(1, (rightEdge - left) / width));
    let alignment = 'left';
    const lineCenters = lines.map((line) => (
        ((Number(line.xStart) || 0) + (Number(line.xEnd) || 0)) / 2
    ));
    const centerSpread = Math.max(...lineCenters) - Math.min(...lineCenters);
    const individuallyCentered = lines.length === 1
        || centerSpread <= width * 0.045;
    if (
        occupiedRatio < 0.86
        && Math.abs(leftRatio - rightRatio) <= 0.075
        && individuallyCentered
    ) {
        alignment = 'center';
    } else if (lines.length >= 2) {
        const startValues = lines.map((line) => Number(line.xStart) || 0);
        const endValues = lines.map((line) => Number(line.xEnd) || 0);
        const startSpread = Math.max(...startValues) - Math.min(...startValues);
        const endSpread = Math.max(...endValues) - Math.min(...endValues);
        if (endSpread <= width * 0.025 && startSpread > width * 0.04) {
            alignment = 'right';
        } else if (startSpread <= width * 0.025) {
            alignment = 'left';
        } else if (leftRatio > 0.24 && leftRatio - rightRatio >= 0.12) {
            alignment = 'right';
        }
    } else if (leftRatio > 0.24 && leftRatio - rightRatio >= 0.12) {
        alignment = 'right';
    }
    const blockTop = Math.min(...lines.map((line) => (
        height - (
            Number(line.y || 0)
            + Number(line.maxHeight || line.lineHeight || 0)
        )
    )));
    return {
        alignment,
        verticalPosition: pdfVerticalZone(Math.max(0, blockTop / height))
    };
}

function clusterPdfBaselines(items) {
    const baselines = [];
    (items || []).forEach((item) => {
        const y = Number(item?.transform?.[5]);
        if (!Number.isFinite(y)) return;
        const existing = baselines.findIndex((value) => Math.abs(value - y) <= 3);
        if (existing < 0) baselines.push(y);
    });
    return baselines;
}

/**
 * Detect page-level newspaper/brochure columns before visual line
 * reconstruction. Splitting on item start coordinates prevents unrelated
 * left- and right-column text at the same height from being interleaved.
 * Short local two-column runs are left to the table detector instead.
 */
export function detectPdfReadingColumns(items, {
    pageWidth = 0,
    pageHeight = 0
} = {}) {
    const width = Number(pageWidth) || 0;
    const height = Math.max(Number(pageHeight) || 0, 1);
    const eligible = (items || []).filter((item) => (
        item?.str
        && String(item.str).trim()
        && item.transform?.length >= 6
        && Number.isFinite(Number(item.transform[4]))
    ));
    if (width <= 0 || eligible.length < 14) return null;

    const starts = eligible
        .map((item) => Number(item.transform[4]))
        .sort((a, b) => a - b);
    const startClusters = [];
    starts.forEach((value) => {
        const previous = startClusters[startClusters.length - 1];
        if (!previous || value - previous[previous.length - 1] > 8) {
            startClusters.push([value]);
        } else {
            previous.push(value);
        }
    });
    const centers = startClusters.map((cluster) => median(cluster));
    let best = null;
    for (let index = 0; index < centers.length - 1; index += 1) {
        const low = centers[index];
        const high = centers[index + 1];
        const gap = high - low;
        const split = (low + high) / 2;
        if (gap < Math.max(width * 0.055, 28)) continue;
        if (split < width * 0.18 || split > width * 0.72) continue;

        const leftItems = eligible.filter((item) => Number(item.transform[4]) < split);
        const rightItems = eligible.filter((item) => Number(item.transform[4]) >= split);
        const leftLines = clusterPdfBaselines(leftItems);
        const rightLines = clusterPdfBaselines(rightItems);
        if (leftLines.length < 7 || rightLines.length < 7) continue;
        // A real column has a gutter: left-column text should stop before
        // the first right-column start. Long single-column lines often
        // begin at several indents, which used to look like two columns
        // and caused sentence fragments to be reordered or omitted.
        const gutterTolerance = Math.max(4, width * 0.008);
        const crossingItems = leftItems.filter((item) => (
            Number(item.transform[4]) + Math.max(0, Number(item.width) || 0)
                > high - gutterTolerance
        ));
        const textWeight = (list) => list.reduce(
            (total, item) => total + String(item.str || '').trim().length,
            0
        );
        const crossingRatio = textWeight(crossingItems)
            / Math.max(textWeight(leftItems), 1);
        if (crossingItems.length >= 3 && crossingRatio > 0.2) continue;
        const span = (lines) => (
            lines.length
                ? (Math.max(...lines) - Math.min(...lines)) / height
                : 0
        );
        const leftSpan = span(leftLines);
        const rightSpan = span(rightLines);
        if (leftSpan < 0.38 || rightSpan < 0.38) continue;
        const lineBalance = Math.min(leftLines.length, rightLines.length)
            / Math.max(leftLines.length, rightLines.length);
        if (lineBalance < 0.22) continue;

        const score = gap
            + Math.min(leftLines.length, rightLines.length) * 4
            + Math.min(leftSpan, rightSpan) * 40;
        if (!best || score > best.score) {
            best = {
                split,
                gap,
                score,
                leftItems,
                rightItems,
                leftLineCount: leftLines.length,
                rightLineCount: rightLines.length
            };
        }
    }
    return best;
}

export function median(arr) {
    if (!arr.length) return 0;
    const s = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(s.length / 2);
    return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export function detectPdfWhitespace(builtLines, { pageHeight = 0 } = {}) {
    if (!builtLines || builtLines.length < 2) {
        return { typicalAdvance: 0, spaces: [] };
    }
    const medianHeight = median(
        builtLines.map((line) => line.maxHeight || line.lineHeight || 10)
    ) || 10;
    const gaps = [];
    for (let index = 0; index < builtLines.length - 1; index += 1) {
        const gap = builtLines[index].y - builtLines[index + 1].y;
        if (Number.isFinite(gap) && gap > medianHeight * 0.55) {
            gaps.push({ index, gap });
        }
    }
    if (!gaps.length) return { typicalAdvance: medianHeight * 1.5, spaces: [] };

    // Estimate ordinary baseline advance without letting genuine blank
    // worksheet areas skew it upward. This works for sparse title pages
    // as well as dense handouts.
    const ordinaryLimit = Math.max(
        medianHeight * 2.6,
        Number(pageHeight || 0) * 0.045
    );
    const ordinaryGaps = gaps
        .map((entry) => entry.gap)
        .filter((gap) => gap <= ordinaryLimit);
    const typicalAdvance = median(ordinaryGaps)
        || median(gaps.map((entry) => entry.gap))
        || medianHeight * 1.5;
    const significantGap = Math.max(
        typicalAdvance * 1.65,
        medianHeight * 2.75,
        Number(pageHeight || 0) * 0.045
    );
    const minimumSurplus = Math.max(
        medianHeight * 1.05,
        Number(pageHeight || 0) * 0.018
    );

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

export function pdfSpacerHtml(space) {
    const lines = Math.max(2, Math.min(12, Math.round(Number(space?.lines) || 2)));
    return `<div class="kf-note-space kf-space-${lines}" data-space-lines="${lines}" contenteditable="false" role="separator" aria-label="Preserved blank writing space"></div>`;
}
