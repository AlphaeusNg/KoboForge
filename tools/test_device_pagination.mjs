import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
    devicePageTransform,
    measureDevicePageCount,
    pageIndexForOffset,
    resolveDevicePageIndex,
} from "../js/device-pagination.js";

let assertions = 0;
function check(condition, message) {
    assert.ok(condition, message);
    assertions += 1;
}

check(measureDevicePageCount(320, 320) === 1, "one screen of content is one Kobo page");
check(measureDevicePageCount(1000, 320) === 4, "page count uses the existing half-pixel column threshold");
check(measureDevicePageCount(0, 0) === 1, "missing measurements still produce a single page");
check(
    resolveDevicePageIndex({ pageCount: 4, requestedIndex: 9 }) === 3,
    "page index clamps to the last measured page",
);
check(
    resolveDevicePageIndex({
        pageCount: 4,
        requestedIndex: 1,
        lockedIndex: 0,
        lockActive: true,
    }) === 0,
    "an active edit lock can hold the first page",
);
check(
    resolveDevicePageIndex({
        pageCount: 4,
        requestedIndex: 1,
        lockedIndex: 0,
        lockActive: false,
    }) === 1,
    "a lock index is ignored after the edit lock is released",
);
check(
    devicePageTransform(2, 320) === "translate3d(-640px,0,0)",
    "page slides use the measured page width",
);
check(devicePageTransform(1, 0) === "", "a missing page width does not invent a transform");
check(
    pageIndexForOffset(650, 320, 4) === 2,
    "jumping to a heading uses its column offset instead of resetting to the first page",
);
check(pageIndexForOffset(10, 320, 4) === 0, "content on the first page stays on the first page");

const app = await readFile(new URL("../js/app.js", import.meta.url), "utf8");
check(app.includes("measureDevicePageCount"), "device layout should use the pagination module");
check(app.includes("devicePageTransform"), "page transforms should use the pagination module");
check(!app.includes("function measureDevicePageCount"), "pagination math should not stay copied in app.js");
check(
    !/measureDevicePageCount\(currentOutput/.test(app),
    "pagination should not receive the application state object",
);

console.log(`Device pagination tests passed (${assertions} assertions).`);
