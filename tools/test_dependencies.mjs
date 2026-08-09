import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const packageJson = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
);
const packageLock = JSON.parse(
  readFileSync(new URL("../package-lock.json", import.meta.url), "utf8"),
);

let assertions = 0;

function check(condition, message) {
  assert.ok(condition, message);
  assertions += 1;
}

const requestedJsdom = packageJson.devDependencies?.jsdom;
const lockedJsdom = packageLock.packages?.["node_modules/jsdom"]?.version;

check(/^\d+\.\d+\.\d+$/.test(requestedJsdom), "jsdom should use an exact version");
check(requestedJsdom === lockedJsdom, "package.json and package-lock should agree on jsdom");
check(
  Number.parseInt(lockedJsdom, 10) >= 29,
  "jsdom should remain on a release without the deprecated whatwg-encoding chain",
);
check(
  !("node_modules/whatwg-encoding" in packageLock.packages),
  "the lockfile should not include deprecated whatwg-encoding",
);

console.log(`Dependency policy tests passed (${assertions} assertions).`);
