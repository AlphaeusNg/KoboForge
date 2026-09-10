import assert from "node:assert/strict";
import {
  DRAFT_SCHEMA_VERSION,
  createDraftStore,
  normalizeDraftRecord,
} from "../js/draft-recovery.js";

let assertions = 0;
function check(condition, message) {
  assert.ok(condition, message);
  assertions += 1;
}

const image = "data:image/png;base64,iVBORw0KGgo=";
const valid = {
  schemaVersion: DRAFT_SCHEMA_VERSION,
  savedAt: "2026-09-11T03:00:00.000Z",
  source: { name: "sermon.docx", size: 1234, type: "application/docx", lastModified: 42 },
  book: { title: "Edited sermon", author: "Alpha", lang: "en", titleWasEdited: true },
  options: {
    preserveTables: true,
    splitChapters: true,
    device: {
      device: "libra-colour",
      deviceOrientation: "portrait",
      deviceFontSize: 3.6,
      deviceMargin: 8,
      deviceChrome: true,
    },
  },
  bodyEdited: true,
  document: {
    title: "sermon",
    author: "",
    bodyHtml: `<p>Edited</p><img src="${image}" data-kf-image-id="kf-image-1">`,
    originalBodyHtml: "<p>Original</p>",
    formatLabel: "DOCX",
    warnings: ["Spot check"],
    imageSources: { "kf-image-1": image },
    imageVariants: {
      "kf-image-1:libra-colour:portrait": {
        dataUrl: image,
        width: 100,
        height: 200,
        tone: "colour",
        mimeType: "image/png",
      },
    },
    chapters: [{ title: "must not persist", html: "<p>derived</p>" }],
    _diffNav: [{ element: { unsafe: true } }],
  },
};

const normalized = normalizeDraftRecord(valid);
check(normalized !== null, "a complete current-schema record should validate");
check(normalized.book.title === "Edited sermon", "book metadata should survive normalization");
check(normalized.options.splitChapters, "export options should survive normalization");
check(normalized.document.bodyHtml.includes(image), "embedded image data should survive normalization");
check(Object.keys(normalized.document.imageVariants).length === 1, "Kobo image variants should survive normalization");
check(!("chapters" in normalized.document), "derived chapter state should not be persisted");
check(!("_diffNav" in normalized.document), "DOM-backed diff navigation should not be persisted");
check(normalizeDraftRecord({ ...valid, schemaVersion: 2 }) === null, "unknown schemas should fail closed");
check(normalizeDraftRecord({ ...valid, savedAt: "not-a-date" }) === null, "invalid timestamps should fail closed");
check(normalizeDraftRecord({ ...valid, document: { ...valid.document, bodyHtml: '<img src="blob:lost">' } }) === null, "blob image URLs should never restore");
check(normalizeDraftRecord({ ...valid, document: { ...valid.document, bodyHtml: '<img src="https://example.test/private.png">' } }) === null, "remote image URLs should never restore");
check(normalizeDraftRecord({ ...valid, document: { ...valid.document, bodyHtml: '<img src="images/missing.png">' } }) === null, "unresolved relative image URLs should never restore");

await assert.rejects(
  createDraftStore(null).load(),
  /IndexedDB is unavailable/,
  "storage unavailability should reject without affecting the application model",
);
assertions += 1;

console.log(`Draft recovery tests passed (${assertions} assertions).`);
