import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { JSDOM } from "jsdom";
import {
    collectBookOutline,
    outlineIndexForNode,
    outlineIndexForPage,
} from "../js/book-outline.js";

let assertions = 0;
function check(condition, message) {
    assert.ok(condition, message);
    assertions += 1;
}

const html = [
    "<h2>Second in the file</h2>",
    "<p>Between</p>",
    "<h1>First rank later</h1>",
    "<h3> </h3>",
    "<h2>Closing</h2>",
].join("");
const dom = new JSDOM(`<div id="root">${html}</div>`);
const root = dom.window.document.getElementById("root");
const before = root.innerHTML;
const outline = collectBookOutline(root);
check(root.innerHTML === before, "collecting an outline must not rewrite the document");
check(
    outline.map((entry) => entry.text).join("|") === "Second in the file|First rank later|Untitled heading 3|Closing",
    "outline order should follow the document, not heading rank",
);
check(
    outline.map((entry) => entry.level).join(",") === "2,1,3,2",
    "outline levels should stay with their headings",
);

const headings = root.querySelectorAll("h1, h2, h3, h4, h5, h6");
const closing = headings[3];
const between = root.querySelector("p");
check(outlineIndexForNode(headings, closing) === 3, "a caret inside a heading selects that heading");
check(outlineIndexForNode(headings, between) === 0, "prose belongs to the heading that precedes it");
check(outlineIndexForNode(headings, headings[0]) === 0, "the first heading can be selected");
check(
    outlineIndexForPage([0, 0, 2, 3], 2) === 2,
    "the selected section follows the current Kobo page when the caret is elsewhere",
);
check(outlineIndexForPage([1, 2], 0) === -1, "a page before the first heading does not invent a selection");

const changed = new JSDOM(`<div id="root"><h2>Renamed heading</h2><h2>Closing</h2></div>`);
const refreshed = collectBookOutline(changed.window.document.getElementById("root"));
check(refreshed[0].text === "Renamed heading", "changing a heading should change the next outline read");
check(refreshed[1].text === "Closing", "refreshing one heading should leave the other headings in order");

const app = await readFile(new URL("../js/app.js", import.meta.url), "utf8");
check(app.includes("collectBookOutline"), "the editor should render the semantic outline");
check(app.includes("editorFocus: true"), "jumping to a heading should keep the editor focused");
check(app.includes("placeCaretIn(element)"), "jumping to a heading should place the caret in that heading");
check(!app.includes("outline.sort(") && !app.includes("entries.sort("), "the outline must not reorder headings before export");

console.log(`Book outline tests passed (${assertions} assertions).`);
