/**
 * Snapshot undo for the Kobo editor.
 * Native contenteditable undo no-ops after a list/block DOM rewrite and also
 * loses earlier typing. Page transforms do not belong in this stack.
 */

export const EDITOR_HISTORY_LIMIT = 25;

export const EDITOR_HISTORY_BOUNDARY = "Undo and redo cover text, lists, and image edits on this view. Page turns are not undo steps. Switching Edit, Diff, or HTML starts a fresh undo stack.";

export const EMPTY_EDITOR_HISTORY_STATUS = "Nothing to undo on this view. Page turns and switching Edit, Diff, or HTML are not undo steps.";

export function createEditorHistory({ limit = EDITOR_HISTORY_LIMIT } = {}) {
    const max = Math.max(1, Math.floor(Number(limit) || EDITOR_HISTORY_LIMIT));
    let past = [];
    let future = [];
    let present = null;
    let applying = false;
    let coalescing = false;

    function commit(next, { coalesce = false } = {}) {
        if (applying) return false;
        const html = String(next ?? "");
        if (present === null) {
            present = html;
            coalescing = false;
            return false;
        }
        if (html === present) {
            if (!coalesce) coalescing = false;
            return false;
        }
        if (coalesce && coalescing) {
            present = html;
            future = [];
            return true;
        }
        past.push(present);
        if (past.length > max) past.shift();
        present = html;
        future = [];
        coalescing = coalesce === true;
        return true;
    }

    return {
        reset(html) {
            past = [];
            future = [];
            present = String(html ?? "");
            applying = false;
            coalescing = false;
        },

        realign(html) {
            present = String(html ?? "");
            coalescing = false;
        },

        commit,

        undo() {
            if (!past.length) return null;
            future.push(present);
            present = past.pop();
            coalescing = false;
            return present;
        },

        redo() {
            if (!future.length) return null;
            past.push(present);
            if (past.length > max) past.shift();
            present = future.pop();
            coalescing = false;
            return present;
        },

        canUndo() {
            return past.length > 0;
        },

        canRedo() {
            return future.length > 0;
        },

        beginApply() {
            applying = true;
        },

        endApply() {
            applying = false;
        },

        isApplying() {
            return applying;
        },
    };
}
