/** Identity and stage labels for one in-flight document import. */

export const CONVERSION_STAGES = Object.freeze([
    Object.freeze({ id: "read", label: "Read" }),
    Object.freeze({ id: "parse", label: "Parse" }),
    Object.freeze({ id: "images", label: "Images" }),
    Object.freeze({ id: "preview", label: "Preview" }),
]);

export class ConversionCancelled extends Error {
    constructor() {
        super("Import cancelled.");
        this.name = "ConversionCancelled";
    }
}

export function createConversionSession() {
    let serial = 0;
    let current = 0;
    const cancelled = new Set();

    return {
        start() {
            serial += 1;
            current = serial;
            return current;
        },

        cancel(id = current) {
            const target = Number(id) || 0;
            if (!target) return 0;
            cancelled.add(target);
            if (target === current) current = 0;
            return target;
        },

        isCurrent(id) {
            const target = Number(id) || 0;
            return target > 0 && target === current && !cancelled.has(target);
        },

        currentId() {
            return current;
        },

        finish(id) {
            if (id !== current) return false;
            current = 0;
            cancelled.delete(id);
            return true;
        },
    };
}
