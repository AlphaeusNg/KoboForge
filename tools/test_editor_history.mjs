import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
    EDITOR_HISTORY_BOUNDARY,
    EMPTY_EDITOR_HISTORY_STATUS,
    createEditorHistory,
} from "../js/editor-history.js";

let assertions = 0;
function check(condition, message) {
    assert.ok(condition, message);
    assertions += 1;
}

// Chromium's native undo no-ops after a contenteditable list rewrite and
// leaves the preceding insertText stuck. Snapshot history must walk both steps.
const history = createEditorHistory();
const original = "<p>Beta sentence here.</p>";
const typed = "<p>Beta sentence here. EXTRA</p>";
const bolded = "<p>Beta sentence here. <b>EXTRA</b></p>";
const listed = "<ul><li>Beta sentence here. <b>EXTRA</b></li></ul>";
history.reset(original);
check(history.commit(typed), "typing should record an undo step");
check(history.commit(bolded), "inline formatting should record an undo step");
check(history.commit(listed), "a list rewrite should record an undo step");
check(history.undo() === bolded, "undo after a list rewrite should restore the pre-list text");
check(history.undo() === typed, "the next undo should remove the formatting and keep the typed text");
check(history.undo() === original, "undo should still reach the text from before the list rewrite");
check(history.undo() === null, "undo should stop at the start of this view");
check(history.redo() === typed, "redo should restore the typed text");

const images = createEditorHistory();
const wide = '<p>Width X</p><img alt="pic" data-kf-width="100">';
const narrow = '<p>Width X</p><img alt="pic" data-kf-width="40">';
images.reset('<p>Width</p><img alt="pic" data-kf-width="100">');
images.commit(wide);
images.commit(narrow);
check(images.undo() === wide, "undo should restore the previous image width");
check(/data-kf-width="100"/.test(images.undo()), "a second undo should restore the text from before the resize");

const slider = createEditorHistory();
slider.reset('<img data-kf-width="100">');
slider.commit('<img data-kf-width="50">', { coalesce: true });
slider.commit('<img data-kf-width="45">', { coalesce: true });
slider.commit('<img data-kf-width="40">', { coalesce: true });
check(slider.undo() === '<img data-kf-width="100">', "a held image-size drag should undo as one step");
check(slider.canUndo() === false, "coalesced resize steps should not fill the undo stack");

const pages = createEditorHistory();
pages.reset("<p>Start</p>");
pages.commit("<p>Start typed</p>");
check(pages.canUndo() === true, "text typed before a page turn remains undoable");
check(pages.undo() === "<p>Start</p>", "a page turn that does not commit must not consume the text undo");

const mode = createEditorHistory();
mode.reset("<p>Edited</p>");
mode.commit("<p>Edited more</p>");
mode.reset("<p>Diff surface</p>");
check(mode.canUndo() === false, "rebuilding Edit, Diff, or HTML starts a fresh undo stack");
check(mode.undo() === null, "undo after a view switch must not pretend to restore the previous view");

check(EDITOR_HISTORY_BOUNDARY.includes("Page turns are not undo steps"), "the boundary should say page turns are not undo steps");
check(EMPTY_EDITOR_HISTORY_STATUS.includes("not undo steps"), "an empty undo should explain the boundary");

const app = await readFile(new URL("../js/app.js", import.meta.url), "utf8");
const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
check(app.includes("commitEditorSurface()"), "text and formatting edits should commit editor history");
check(app.includes("coalesce: true"), "held image resizing should coalesce into one history step");
check(app.includes("editorHistoryResetPending = true"), "Edit, Diff, and HTML switches should reset undo");
check(app.includes("if (undo || redo) event.preventDefault();"), "editor undo should not also run the broken native undo stack");
check(html.includes(EDITOR_HISTORY_BOUNDARY), "the editor should show which actions undo does not cover");
check(html.includes('id="undoEditBtn"') && html.includes('id="redoEditBtn"'), "undo and redo controls should be available");

console.log(`Editor history tests passed (${assertions} assertions).`);
