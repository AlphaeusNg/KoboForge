import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  DRAFT_AFTER_EXPORT,
  DRAFT_SCHEMA_VERSION,
  createDraftStore,
  normalizeDraftRecord,
  shouldPromptDraftAfterExport,
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

check(DRAFT_AFTER_EXPORT.defaultAction === "clear", "successful export should default to clearing the private draft");
check(DRAFT_AFTER_EXPORT.keepLabel === "Keep recovery draft", "Keep should remain available for continued editing");
check(DRAFT_AFTER_EXPORT.clearLabel === "Clear draft", "Clear should be the visitor-visible privacy action");
check(
  shouldPromptDraftAfterExport({
    downloadSucceeded: true,
    storageUnavailable: false,
    hasPersistedDraft: true,
  }),
  "a successful Download should ask about a persisted recovery draft",
);
check(
  !shouldPromptDraftAfterExport({
    downloadSucceeded: false,
    storageUnavailable: false,
    hasPersistedDraft: true,
  }),
  "a failed Download should not clear or prompt about the recovery draft",
);
check(
  !shouldPromptDraftAfterExport({
    downloadSucceeded: true,
    storageUnavailable: true,
    hasPersistedDraft: true,
  }),
  "unavailable storage should not pretend a recovery draft can be kept or cleared",
);
check(
  !shouldPromptDraftAfterExport({
    downloadSucceeded: true,
    storageUnavailable: false,
    hasPersistedDraft: false,
  }),
  "Download should not ask to clear a draft that was never saved",
);

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const recoveryStart = html.indexOf('id="draftRecovery"');
const recoveryEnd = html.indexOf('id="dropzone"', recoveryStart);
check(recoveryStart >= 0 && recoveryEnd > recoveryStart, "#draftRecovery should wrap restore and export draft actions");
const recoveryMarkup = html.slice(recoveryStart, recoveryEnd);
check(recoveryMarkup.includes('id="keepDraftBtn"'), "Keep recovery draft should reuse #draftRecovery");
check(
  recoveryMarkup.includes(`>${DRAFT_AFTER_EXPORT.keepLabel}<`),
  "Keep recovery draft label should match the export prompt",
);
check(recoveryMarkup.includes('id="clearDraftBtn"'), "Clear draft should reuse #draftRecovery");
check(
  recoveryMarkup.includes(`>${DRAFT_AFTER_EXPORT.clearLabel}<`),
  "Clear draft label should match the export prompt",
);
const clearButton = recoveryMarkup.slice(
  recoveryMarkup.indexOf('id="clearDraftBtn"'),
  recoveryMarkup.indexOf("</button>", recoveryMarkup.indexOf('id="clearDraftBtn"')),
);
check(clearButton.includes("bg-[#C9A227]"), "Clear draft should be the default primary action after export");

const app = await readFile(new URL("../js/app.js", import.meta.url), "utf8");
check(
  app.includes("await promptDraftDecisionAfterExport()"),
  "successful Download should ask whether to keep or clear the recovery draft",
);
check(
  /statusEl\.textContent = error\.message \|\| 'EPUB build failed\.';\s*setProgress\(0\);\s*return;\s*\}\s*await promptDraftDecisionAfterExport\(\);/.test(app),
  "failed Download should return before the keep-or-clear prompt",
);

console.log(`Draft recovery tests passed (${assertions} assertions).`);
