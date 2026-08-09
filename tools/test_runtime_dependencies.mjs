import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import {
  RuntimeDependencyError,
  createModuleDependencyLoader,
  createScriptDependencyLoader,
} from "../js/runtime-dependencies.js";

let assertions = 0;

function equal(actual, expected, message) {
  assert.equal(actual, expected, message);
  assertions += 1;
}

async function rejects(promise, pattern, message) {
  await assert.rejects(promise, pattern, message);
  assertions += 1;
}

const dom = new JSDOM("<!doctype html><head></head><body></body>", {
  url: "https://example.test/KoboForge/",
});
const loadScriptDependency = createScriptDependencyLoader({
  documentRef: dom.window.document,
  globalRef: dom.window,
});
const docxDependency = {
  globalName: "mammoth",
  label: "DOCX converter",
  url: "https://cdn.example.test/mammoth.js",
};

const firstDocxLoad = loadScriptDependency(docxDependency);
const duplicateDocxLoad = loadScriptDependency(docxDependency);
equal(firstDocxLoad, duplicateDocxLoad, "concurrent script requests should share one promise");
equal(dom.window.document.scripts.length, 1, "concurrent requests should append one script");

const mammoth = { convertToHtml() {} };
dom.window.mammoth = mammoth;
dom.window.document.scripts[0].dispatchEvent(new dom.window.Event("load"));
equal(await firstDocxLoad, mammoth, "script load should resolve the declared global");
equal(
  await loadScriptDependency(docxDependency),
  mammoth,
  "an available global should resolve without another request",
);
equal(dom.window.document.scripts.length, 1, "resolved globals should not append another script");

const zipDependency = {
  globalName: "JSZip",
  label: "EPUB packaging tools",
  url: "https://cdn.example.test/jszip.js",
};
const failedZipLoad = loadScriptDependency(zipDependency);
const failedScript = [...dom.window.document.scripts].at(-1);
failedScript.dispatchEvent(new dom.window.Event("error"));
await rejects(
  failedZipLoad,
  (error) =>
    error instanceof RuntimeDependencyError
    && error.message === "EPUB packaging tools could not load. Check your connection, then try again.",
  "script errors should become actionable dependency failures",
);
equal(failedScript.isConnected, false, "failed scripts should be removed before retry");

const retryZipLoad = loadScriptDependency(zipDependency);
const retryScript = [...dom.window.document.scripts].at(-1);
equal(retryScript === failedScript, false, "retry should append a fresh script");
const JSZip = function JSZip() {};
dom.window.JSZip = JSZip;
retryScript.dispatchEvent(new dom.window.Event("load"));
equal(await retryZipLoad, JSZip, "a retry should resolve after the CDN recovers");

let importAttempts = 0;
let rejectPdfImport;
const loadModuleDependency = createModuleDependencyLoader({
  importFn: async () => {
    importAttempts += 1;
    if (importAttempts === 1) {
      return new Promise((resolve, reject) => {
        rejectPdfImport = reject;
      });
    }
    return { GlobalWorkerOptions: {} };
  },
});
const pdfDependency = {
  key: "pdfjs",
  label: "PDF converter",
  url: "https://cdn.example.test/pdf.mjs",
};
const firstPdfLoad = loadModuleDependency(pdfDependency);
const duplicatePdfLoad = loadModuleDependency(pdfDependency);
equal(firstPdfLoad, duplicatePdfLoad, "concurrent module requests should share one import");
rejectPdfImport(new Error("network unavailable"));
await rejects(
  firstPdfLoad,
  (error) => error instanceof RuntimeDependencyError && error.cause?.message === "network unavailable",
  "module failures should preserve their cause while exposing a safe message",
);
const pdfModule = await loadModuleDependency(pdfDependency);
equal(importAttempts, 2, "module failure should clear the cached promise for retry");
equal(typeof pdfModule.GlobalWorkerOptions, "object", "module retry should return the dependency");

console.log(`Runtime dependency tests passed (${assertions} assertions).`);
