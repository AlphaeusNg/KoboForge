import assert from "node:assert/strict";
import JSZip from "jszip";
import { JSDOM } from "jsdom";
import { extractEmbeddedImagesForEpub } from "../js/epub-images.js";
import { buildReflowableEpubArchive } from "../js/epub-package.js";

const imageBase64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
const dataSource = `data:image/png;base64,${imageBase64}`;
const dom = new JSDOM("<!doctype html><html><body></body></html>");
const extracted = extractEmbeddedImagesForEpub(
  [
    `<p><img class="hero kf-inline-image" data-kf-width="42" src="${dataSource}" alt="First"/></p>`,
    `<p><img data-kf-tone="bw" src="${dataSource}" alt="Duplicate"/></p>`,
    '<p><img src="https://example.test/remote.png" alt="Remote"/></p>',
  ].join(""),
  {
    DOMParserCtor: dom.window.DOMParser,
    atobFn: dom.window.atob.bind(dom.window),
    TextEncoderCtor: TextEncoder,
  },
);

assert.equal(extracted.assets.length, 1, "duplicate data sources should share one asset");
assert.deepEqual(
  {
    id: extracted.assets[0].id,
    fileName: extracted.assets[0].fileName,
    mediaType: extracted.assets[0].mediaType,
  },
  { id: "image-1", fileName: "image-1.png", mediaType: "image/png" },
  "the extracted asset should have stable package metadata",
);
assert.equal(
  Buffer.from(extracted.assets[0].bytes).toString("base64"),
  imageBase64,
  "base64 image bytes should decode without mutation",
);
assert.equal(
  (extracted.html.match(/src="images\/image-1\.png"/g) || []).length,
  2,
  "both duplicate image elements should reference the shared asset",
);
assert.doesNotMatch(extracted.html, /data-kf-/, "editor-only image attributes should be removed");
assert.doesNotMatch(extracted.html, /kf-inline-image/, "the editor-only image class should be removed");
assert.match(extracted.html, /class="hero"/, "unrelated author classes should remain");
assert.match(
  extracted.html,
  /src="https:\/\/example\.test\/remote\.png"/,
  "external image references should remain unchanged",
);

const archive = await buildReflowableEpubArchive(
  JSZip,
  {
    title: "Extracted images",
    author: "KoboForge",
    identifier: "urn:uuid:extracted-image-fixture",
    modified: "2026-08-09T00:00:00Z",
    chapters: [{ title: "Images", html: extracted.html }],
    assets: extracted.assets,
  },
  { type: "nodebuffer" },
);
const loaded = await JSZip.loadAsync(archive);
assert.deepEqual(
  Object.keys(loaded.files).filter((name) => name.startsWith("OEBPS/images/")),
  ["OEBPS/images/image-1.png"],
  "the extracted shared asset should stay unique in the archive",
);
assert.deepEqual(
  await loaded.file("OEBPS/images/image-1.png").async("uint8array"),
  extracted.assets[0].bytes,
  "the archive should preserve the extracted bytes",
);

console.log("KoboForge EPUB image tests passed (10 assertions).");
