import assert from "node:assert/strict";
import JSZip from "jszip";
import { JSDOM } from "jsdom";
import {
  EmbeddedImageError,
  extractEmbeddedImagesForEpub,
} from "../js/epub-images.js";
import { buildReflowableEpubArchive } from "../js/epub-package.js";

const imageBase64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
const dataSource = `data:image/png;base64,${imageBase64}`;
const asDataUrl = (mediaType, bytes) =>
  `data:${mediaType};base64,${Buffer.from(bytes).toString("base64")}`;
const dom = new JSDOM("<!doctype html><html><body></body></html>");
const extractionOptions = {
  DOMParserCtor: dom.window.DOMParser,
  atobFn: dom.window.atob.bind(dom.window),
  TextEncoderCtor: TextEncoder,
  TextDecoderCtor: TextDecoder,
};
assert.throws(
  () => extractEmbeddedImagesForEpub("", {
    ...extractionOptions,
    TextDecoderCtor: null,
  }),
  /Image data decoders are required/,
  "signature validation should fail early without a byte decoder",
);
const extracted = extractEmbeddedImagesForEpub(
  [
    `<p><img class="hero kf-inline-image" data-kf-width="42" src="${dataSource}" alt="First"/></p>`,
    `<p><img data-kf-tone="bw" src="${dataSource}" alt="Duplicate"/></p>`,
    '<p><img src="https://example.test/remote.png" alt="Remote"/></p>',
  ].join(""),
  extractionOptions,
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

const supportedSignatures = [
  {
    mediaType: "image/png",
    extension: "png",
    bytes: Buffer.from(imageBase64, "base64"),
  },
  {
    mediaType: "image/jpeg",
    extension: "jpg",
    bytes: Uint8Array.from([0xff, 0xd8, 0xff, 0xe0]),
  },
  {
    mediaType: "image/gif",
    extension: "gif",
    bytes: new TextEncoder().encode("GIF89a"),
  },
  {
    mediaType: "image/webp",
    extension: "webp",
    bytes: new TextEncoder().encode("RIFF\u0000\u0000\u0000\u0000WEBP"),
  },
  {
    mediaType: "image/svg+xml",
    extension: "svg",
    bytes: new TextEncoder().encode(
      '\uFEFF<?xml version="1.0"?>\n<!-- icon --><svg xmlns="http://www.w3.org/2000/svg"/>',
    ),
  },
];

for (const fixture of supportedSignatures) {
  const result = extractEmbeddedImagesForEpub(
    `<img src="${asDataUrl(fixture.mediaType, fixture.bytes)}">`,
    extractionOptions,
  );
  assert.deepEqual(
    {
      mediaType: result.assets[0].mediaType,
      fileName: result.assets[0].fileName,
    },
    {
      mediaType: fixture.mediaType,
      fileName: `image-1.${fixture.extension}`,
    },
    `${fixture.mediaType} should pass its decoded signature contract`,
  );
}

const arbitraryBytes = new TextEncoder().encode("not an image");
for (const mediaType of [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/svg+xml",
]) {
  assert.throws(
    () => extractEmbeddedImagesForEpub(
      `<img src="${asDataUrl(mediaType, arbitraryBytes)}">`,
      extractionOptions,
    ),
    (error) => error instanceof EmbeddedImageError
      && error.mediaType === mediaType
      && error.message === `Embedded image 1 does not match its declared type "${mediaType}". Replace or convert it, then download again.`,
    `${mediaType} must reject arbitrary decoded bytes`,
  );
}

assert.throws(
  () => extractEmbeddedImagesForEpub(
    `<img src="${asDataUrl("image/jpeg", Buffer.from(imageBase64, "base64"))}">`,
    extractionOptions,
  ),
  (error) => error instanceof EmbeddedImageError
    && error.mediaType === "image/jpeg"
    && error.message.includes("does not match its declared type"),
  "valid image bytes must not be packaged under a mismatched declared type",
);

assert.throws(
  () => extractEmbeddedImagesForEpub(
    `<img src="${asDataUrl(
      "image/svg+xml",
      new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg">'),
    )}">`,
    extractionOptions,
  ),
  (error) => error instanceof EmbeddedImageError
    && error.mediaType === "image/svg+xml"
    && error.message.includes("does not match its declared type"),
  "malformed SVG XML must not pass on its opening tag alone",
);

assert.throws(
  () => extractEmbeddedImagesForEpub(
    '<img src="https://example.test/valid.png"><img src="data:image/png;base64,%%%%">',
    extractionOptions,
  ),
  (error) => error instanceof EmbeddedImageError
    && error.imageNumber === 2
    && error.cause
    && error.message === "Embedded image 2 has invalid base64 data. Replace or remove it, then download again."
    && !error.message.includes("%%%%"),
  "invalid base64 should produce contextual repair guidance without leaking its source",
);
assert.throws(
  () => extractEmbeddedImagesForEpub(
    '<img src="data:image/svg+xml,%E0%A4%A">',
    extractionOptions,
  ),
  (error) => error instanceof EmbeddedImageError
    && error.message === "Embedded image 1 has invalid percent-encoded data. Replace or remove it, then download again.",
  "invalid percent encoding should produce contextual repair guidance",
);
assert.throws(
  () => extractEmbeddedImagesForEpub(
    '<img src="data:image/png;base64,">',
    extractionOptions,
  ),
  (error) => error instanceof EmbeddedImageError
    && error.message === "Embedded image 1 contains no image data. Replace or remove it, then download again.",
  "empty image payloads should fail before EPUB packaging",
);
assert.throws(
  () => extractEmbeddedImagesForEpub(
    '<img src="data:image/bmp;base64,AA==">',
    extractionOptions,
  ),
  (error) => error instanceof EmbeddedImageError
    && error.message === 'Embedded image 1 uses unsupported type "image/bmp". Convert it to PNG, JPEG, GIF, SVG, or WebP, then download again.',
  "unsupported image types must not be packaged with a false PNG extension",
);
assert.throws(
  () => extractEmbeddedImagesForEpub(
    '<img src="data:image/png;base64">',
    extractionOptions,
  ),
  (error) => error instanceof EmbeddedImageError
    && error.message === "Embedded image 1 has a malformed data URL. Replace or remove it, then download again.",
  "malformed image data URLs must not remain unresolved in EPUB XHTML",
);
assert.throws(
  () => extractEmbeddedImagesForEpub(
    '<img src="data:text/plain,not-an-image">',
    extractionOptions,
  ),
  (error) => error instanceof EmbeddedImageError
    && error.message === "Embedded image 1 does not declare an image media type. Replace or remove it, then download again.",
  "non-image data URLs in image elements must fail instead of remaining unresolved",
);

const parameterizedSvg = extractEmbeddedImagesForEpub(
  '<img src="data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%2F%3E">',
  extractionOptions,
);
assert.deepEqual(
  {
    fileName: parameterizedSvg.assets[0].fileName,
    mediaType: parameterizedSvg.assets[0].mediaType,
    text: new TextDecoder().decode(parameterizedSvg.assets[0].bytes),
  },
  {
    fileName: "image-1.svg",
    mediaType: "image/svg+xml",
    text: '<svg xmlns="http://www.w3.org/2000/svg"/>',
  },
  "percent-encoded SVG parameters should remain supported",
);
assert.equal(
  extractEmbeddedImagesForEpub(
    ` <img src="DATA:image/png;base64,${imageBase64}">`,
    extractionOptions,
  ).assets.length,
  1,
  "data-image scheme and media type matching should be case-insensitive",
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

console.log("KoboForge EPUB image tests passed (31 assertions).");
