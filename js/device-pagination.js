/**
 * Column-pagination math for the Kobo preview.
 * Callers pass measured widths and indexes, not the application state object.
 */

export function measureDevicePageCount(fullWidth, pageWidth) {
    const width = Math.max(1, Math.floor(Number(pageWidth) || 0) || 1);
    const content = Math.max(width, Number(fullWidth) || 0);
    return Math.max(1, Math.ceil((content - 0.5) / width));
}

export function resolveDevicePageIndex({
    pageCount = 1,
    requestedIndex = 0,
    lockedIndex = null,
    lockActive = false,
} = {}) {
    const count = Math.max(1, Math.floor(Number(pageCount) || 1));
    const locked = Number(lockedIndex);
    const useLock = lockActive === true
        && lockedIndex !== null
        && lockedIndex !== undefined
        && Number.isFinite(locked);
    const requested = useLock ? locked : Number(requestedIndex);
    const index = Number.isFinite(requested) ? Math.floor(requested) : 0;
    return Math.max(0, Math.min(index, count - 1));
}

export function devicePageTransform(pageIndex, pageWidth) {
    const width = Number(pageWidth) || 0;
    if (!width) return "";
    const index = Math.max(0, Math.floor(Number(pageIndex) || 0));
    return `translate3d(${-index * width}px,0,0)`;
}

export function pageIndexForOffset(offset, pageWidth, pageCount) {
    const width = Number(pageWidth) || 0;
    if (!width) return 0;
    const page = Math.floor(Math.max(0, Number(offset) || 0) / width);
    return resolveDevicePageIndex({
        pageCount,
        requestedIndex: page,
    });
}
