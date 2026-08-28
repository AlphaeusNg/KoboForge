/**
 * Phone-safe hold-to-adjust for the selected-image width slider.
 * Lives outside app.js so a finger-hold can capture the pointer without
 * the toolbar's pan-x scroller moving the page. Dispatches `input` so the
 * existing resizeSelectedImage listener still applies the width.
 */
export function rangeValueFromClientX(rangeEl, clientX) {
    const min = Number(rangeEl?.min);
    const max = Number(rangeEl?.max);
    const step = Number(rangeEl?.step);
    const box = rangeEl?.getBoundingClientRect?.();
    const width = Number(box?.width);
    const left = Number(box?.left);
    if (
        !Number.isFinite(min)
        || !Number.isFinite(max)
        || max <= min
        || !Number.isFinite(step)
        || !(step > 0)
        || !Number.isFinite(width)
        || !(width > 0)
        || !Number.isFinite(left)
    ) {
        const current = Number(rangeEl?.value);
        return Number.isFinite(current) ? current : min;
    }
    const ratio = Math.max(0, Math.min(1, (clientX - left) / width));
    const raw = min + ratio * (max - min);
    const snapped = min + Math.round((raw - min) / step) * step;
    return Math.min(max, Math.max(min, Number(snapped.toFixed(6))));
}

export function bindHeldImageSizeSlider(
    control = document.getElementById('imageSizeControl'),
    range = document.getElementById('imageSizeRange')
) {
    if (!control || !range) return;
    let activePointerId = null;

    function applyHeldPointer(event) {
        const next = rangeValueFromClientX(range, event.clientX);
        range.value = String(next);
        range.dispatchEvent(new Event('input', { bubbles: true }));
    }

    function stopHeldPointer(event) {
        if (activePointerId === null || event.pointerId !== activePointerId) return;
        activePointerId = null;
        document.documentElement.classList.remove('kf-slider-held');
        if (control.hasPointerCapture?.(event.pointerId)) {
            control.releasePointerCapture(event.pointerId);
        }
    }

    control.addEventListener('pointerdown', (event) => {
        if (event.button !== 0) return;
        if (control.classList.contains('hidden')) return;
        event.preventDefault();
        activePointerId = event.pointerId;
        document.documentElement.classList.add('kf-slider-held');
        try {
            control.setPointerCapture(event.pointerId);
        } catch (error) {
            // Capture can fail if the pointer already ended.
        }
        applyHeldPointer(event);
    });
    control.addEventListener('pointermove', (event) => {
        if (activePointerId === null || event.pointerId !== activePointerId) return;
        event.preventDefault();
        applyHeldPointer(event);
    });
    control.addEventListener('pointerup', stopHeldPointer);
    control.addEventListener('pointercancel', stopHeldPointer);
    control.addEventListener('lostpointercapture', (event) => {
        if (event.pointerId !== activePointerId) return;
        activePointerId = null;
        document.documentElement.classList.remove('kf-slider-held');
    });
    control.addEventListener('touchmove', (event) => {
        if (activePointerId === null) return;
        event.preventDefault();
    }, { passive: false });
}

bindHeldImageSizeSlider();
