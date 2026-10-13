/** Regression inputs exercise the same measured-line decisions used by PDF import. */
import assert from 'node:assert/strict';
import {
    pdfLineStartsStructuredBlock,
    shouldBreakPdfParagraph,
    pdfLinesLookLikeVerse,
    pdfLineNeedsVisibleBreak
} from '../js/pdf-paragraphs.js';

const line = (plainText, overrides = {}) => ({
    plainText, y: 700, xStart: 40, xEnd: 440,
    lineHeight: 12, maxHeight: 12, avgCharWidth: 5,
    dominantFontFamily: 'serif', ...overrides
});
const measurements = {
    typicalLineAdvance: 14, textLeft: 40, textWidth: 400, typicalStart: 40
};
const continues = (previous, next) => !shouldBreakPdfParagraph(previous, next, measurements);

assert.equal(pdfLineStartsStructuredBlock(line('1. First point')), true);
assert.equal(pdfLineStartsStructuredBlock(line('a) Second point')), true);
assert.equal(pdfLineStartsStructuredBlock(line('• Remember this')), true);
assert.equal(pdfLineStartsStructuredBlock(line('1 Corinthians 13')), false);
assert.equal(pdfLineStartsStructuredBlock(null), false);
assert.equal(continues(line('The sentence begins'), line('here on the next line.', { y: 686 })), true);
assert.equal(continues(line('The sentence ends.'), line('Another begins.', { y: 686 })), true,
    'a filled source line should reflow without manufacturing a paragraph');
assert.equal(continues(line('The sentence ends.', { xEnd: 220 }), line('Another begins.', { y: 686 })), false,
    'a short sentence followed by a capitalized line starts a paragraph');
assert.equal(continues(line('The sentence ends.'), line('Another begins.', { y: 650 })), false,
    'authored vertical space separates paragraphs');
assert.equal(continues(line('The sentence begins'), line('2. Next point', { y: 686 })), false,
    'a list marker separates the next block even after incomplete prose');
assert.equal(continues(line('The sentence ends.', { xEnd: 220 }), line('and continues.', { y: 686 })), true,
    'a lowercase continuation keeps the same paragraph');
assert.equal(continues(line('The sentence ends.', { xEnd: 220 }), line('', { y: 686 })), false);
assert.equal(continues(line('The sentence ends.', { xEnd: 320 }), line('New font', {
    y: 686, dominantFontFamily: 'sans', maxHeight: 18
})), false,
    'a significant font family and size change separates completed prose');

const verse = ['Morning light', 'Across the water', 'Over the hill'].map(text => line(text));
assert.equal(pdfLinesLookLikeVerse(verse), true);
assert.equal(pdfLinesLookLikeVerse(verse.slice(0, 2)), false);
assert.equal(pdfLinesLookLikeVerse(null), false);
const prose = ['Morning light.', 'Across the water.', 'Over the hill.'].map(text => line(text));
assert.equal(pdfLinesLookLikeVerse(prose), false);
assert.equal(pdfLineNeedsVisibleBreak(verse[0], verse[1], verse), true,
    'authored poetry lines remain visible in the paragraph');
assert.equal(pdfLineNeedsVisibleBreak(prose[0], prose[1], prose), false,
    'full-width prose reflows');
assert.equal(pdfLineNeedsVisibleBreak(prose[0], { ...prose[1], hasItalic: true }, prose), true);
assert.equal(pdfLineNeedsVisibleBreak({ ...prose[0], hasBold: true }, { ...prose[1], hasBold: true }, prose), true,
    'stacked bold titles keep their authored lines');
assert.equal(pdfLineNeedsVisibleBreak(line('A short line', { xEnd: 160 }), prose[1], prose), true);
assert.equal(pdfLineNeedsVisibleBreak(line('A short line and', { xEnd: 160 }), prose[1], prose), false,
    'a short unfinished phrase should not gain a visible break');
console.log('PDF paragraph decisions: 23 measured-input assertions passed.');
