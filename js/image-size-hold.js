/**
 * Phone-safe hold-to-adjust for the selected-image width slider.
 * Lives outside app.js so a finger-hold can capture the pointer without
 * the toolbar's pan-x scroller moving the page. Dispatches `input` so the
 * existing resizeSelectedImage listener still applies the width. Pagination
 * stays deferred until pointerup so the Kobo preview does not reflow/swing.
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

    function toolbarLane() {
        return control.closest('.tb-lane');
    }

    function setHeld(on) {
        document.documentElement.classList.toggle('kf-slider-held', on);
        document.body?.classList.toggle('kf-slider-held', on);
        toolbarLane()?.classList.toggle('kf-slider-held-lane', on);
        document.getElementById('deviceScreen')?.classList.toggle('kf-slider-held-screen', on);
    }

    function applyHeldPointer(event) {
        const next = rangeValueFromClientX(range, event.clientX);
        range.value = String(next);
        range.dispatchEvent(new Event('input', { bubbles: true }));
    }

    function commitHeldPointer() {
        range.dispatchEvent(new Event('change', { bubbles: true }));
    }

    function stopHeldPointer(event) {
        if (activePointerId === null) return;
        if (event && event.pointerId !== activePointerId) return;
        const pointerId = activePointerId;
        activePointerId = null;
        setHeld(false);
        if (pointerId != null && control.hasPointerCapture?.(pointerId)) {
            try {
                control.releasePointerCapture(pointerId);
            } catch (_) { /* already released */ }
        }
        commitHeldPointer();
    }

    control.addEventListener('pointerdown', (event) => {
        if (event.button !== 0) return;
        if (control.classList.contains('hidden')) return;
        event.preventDefault();
        event.stopPropagation();
        activePointerId = event.pointerId;
        setHeld(true);
        try {
            control.setPointerCapture(event.pointerId);
        } catch (_) {
            // Capture can fail if the pointer already ended.
        }
        applyHeldPointer(event);
    }, { capture: true });
    control.addEventListener('pointermove', (event) => {
        if (activePointerId === null || event.pointerId !== activePointerId) return;
        event.preventDefault();
        applyHeldPointer(event);
    });
    control.addEventListener('pointerup', stopHeldPointer);
    control.addEventListener('pointercancel', stopHeldPointer);
    control.addEventListener('lostpointercapture', (event) => {
        if (event.pointerId !== activePointerId) return;
        stopHeldPointer(event);
    });
    control.addEventListener('touchstart', (event) => {
        if (control.classList.contains('hidden')) return;
        event.preventDefault();
    }, { passive: false });
    control.addEventListener('touchmove', (event) => {
        if (activePointerId === null) return;
        event.preventDefault();
    }, { passive: false });
}

bindHeldImageSizeSlider();
