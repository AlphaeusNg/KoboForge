import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
    CONVERSION_STAGES,
    ConversionCancelled,
    createConversionSession,
} from "../js/conversion-session.js";

let assertions = 0;
function check(condition, message) {
    assert.ok(condition, message);
    assertions += 1;
}

check(
    CONVERSION_STAGES.map((stage) => stage.id).join(",") === "read,parse,images,preview",
    "import stages should follow read, parse, images, and preview",
);

const session = createConversionSession();
const first = session.start();
check(session.isCurrent(first), "the import that just started is current");
const second = session.start();
check(!session.isCurrent(first), "an older import must not stay current");
check(session.isCurrent(second), "the later import becomes the only current import");
session.cancel(second);
check(!session.isCurrent(second), "cancelling the current import retires its identity");
check(!session.isCurrent(first), "cancelling the later import must not revive the abandoned one");
const third = session.start();
check(session.isCurrent(third), "the next import after cancellation should succeed");
check(!session.isCurrent(second), "a cancelled identity cannot replace the next import");
check(!session.finish(second), "an abandoned import cannot finish the current import");
check(session.isCurrent(third), "a stale completion keeps the current import active");
check(session.finish(third), "a completed import retires its identity");
check(session.currentId() === 0, "completed books have no running import to cancel");

const cancelled = new ConversionCancelled();
check(cancelled.name === "ConversionCancelled", "cancellation should be distinguishable from a parse failure");

const app = await readFile(new URL("../js/app.js", import.meta.url), "utf8");
const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const guard = app.indexOf("if (!conversionSession.isCurrent(conversionId)) return;");
const apply = app.indexOf("currentOutput = output;");
check(html.includes("Cancel import"), "a long import should expose a cancel control");
check(html.includes('data-stage="read"') && html.includes('data-stage="preview"'), "import stages should be visible");
check(guard >= 0 && apply > guard, "an abandoned import must return before it can replace the open book");
check(
    app.includes("The open book is unchanged."),
    "cancelling an import should say the open book was kept",
);

console.log(`Conversion session tests passed (${assertions} assertions).`);
