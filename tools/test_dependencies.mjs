import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { RUNTIME_DEPENDENCIES } from "../js/runtime-dependencies.js";

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
const requestedPlaywright = packageJson.devDependencies?.["@playwright/test"];
const lockedPlaywright = packageLock.packages?.["node_modules/@playwright/test"]?.version;
const requestedPdfJs = packageJson.devDependencies?.["pdfjs-dist"];
const lockedPdfJs = packageLock.packages?.["node_modules/pdfjs-dist"]?.version;

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
check(
  /^\d+\.\d+\.\d+$/.test(requestedPlaywright),
  "Playwright should use an exact version",
);
check(
  requestedPlaywright === lockedPlaywright,
  "package.json and package-lock should agree on Playwright",
);
check(/^\d+\.\d+\.\d+$/.test(requestedPdfJs), "pdfjs-dist should use an exact version");
check(
  requestedPdfJs === lockedPdfJs,
  "package.json and package-lock should agree on pdfjs-dist",
);
check(
  RUNTIME_DEPENDENCIES.pdfjs.url.includes(`pdfjs-dist@${requestedPdfJs}/`),
  "the production PDF.js module URL should match the installed browser-test version",
);
check(
  RUNTIME_DEPENDENCIES.pdfjs.workerUrl.includes(`pdfjs-dist@${requestedPdfJs}/`),
  "the production PDF.js worker URL should match the installed browser-test version",
);

console.log(`Dependency policy tests passed (${assertions} assertions).`);
