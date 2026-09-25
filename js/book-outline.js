/** Read-only semantic heading outline. Document order is preserved. */

export const BOOK_HEADING_SELECTOR = "h1, h2, h3, h4, h5, h6";
const FOLLOWING = 4;

function headingText(value, index) {
    const text = String(value || "").replace(/\s+/g, " ").trim();
    return text || `Untitled heading ${index + 1}`;
}

export function collectBookOutline(root) {
    if (!root || typeof root.querySelectorAll !== "function") return [];
    return Array.from(root.querySelectorAll(BOOK_HEADING_SELECTOR)).map((heading, index) => ({
        index,
        level: Number(String(heading.tagName || "").slice(1)) || 1,
        text: headingText(heading.textContent, index),
    }));
}

export function outlineIndexForNode(headings, node) {
    const list = Array.from(headings || []);
    if (!node || !list.length) return -1;
    const element = node.nodeType === 3 ? node.parentElement : node;
    if (!element) return -1;
    const inside = list.findIndex((heading) => (
        heading === element || heading.contains?.(element)
    ));
    if (inside >= 0) return inside;
    let selected = -1;
    for (let index = 0; index < list.length; index += 1) {
        const heading = list[index];
        if (typeof heading.compareDocumentPosition !== "function") continue;
        const position = heading.compareDocumentPosition(element);
        if (position & FOLLOWING) selected = index;
    }
    return selected;
}

export function outlineIndexForPage(pageIndexes, pageIndex) {
    const page = Number(pageIndex);
    if (!Number.isFinite(page)) return -1;
    let selected = -1;
    Array.from(pageIndexes || []).forEach((entry, index) => {
        const headingPage = Number(entry);
        if (Number.isFinite(headingPage) && headingPage <= page) selected = index;
    });
    return selected;
}
