/** DOM-backed preparation of embedded images for EPUB packaging. */

function decodeImageDataUrl(source, { atobFn, TextEncoderCtor }) {
  const match = /^data:([^;,]+)(;base64)?,([\s\S]*)$/i.exec(source || "");
  if (!match || !match[1].toLowerCase().startsWith("image/")) return null;

  const mediaType = match[1].toLowerCase();
  let bytes;
  if (match[2]) {
    const binary = atobFn(match[3]);
    bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
  } else {
    bytes = new TextEncoderCtor().encode(decodeURIComponent(match[3]));
  }

  const extension = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/svg+xml": "svg",
    "image/webp": "webp",
  }[mediaType] || "png";
  return { mediaType, extension, bytes };
}

export function extractEmbeddedImagesForEpub(
  html,
  {
    DOMParserCtor = globalThis.DOMParser,
    atobFn = globalThis.atob?.bind(globalThis),
    TextEncoderCtor = globalThis.TextEncoder,
  } = {},
) {
  if (typeof DOMParserCtor !== "function") {
    throw new TypeError("DOMParser is required to extract EPUB images.");
  }
  if (typeof atobFn !== "function" || typeof TextEncoderCtor !== "function") {
    throw new TypeError("Image data decoders are required to extract EPUB images.");
  }

  const doc = new DOMParserCtor().parseFromString(
    `<div id="root">${html || ""}</div>`,
    "text/html",
  );
  const root = doc.getElementById("root");
  if (!root) return { html: html || "", assets: [] };

  const bySource = new Map();
  const assets = [];
  root.querySelectorAll("img").forEach((img) => {
    Array.from(img.attributes).forEach((attribute) => {
      if (attribute.name.startsWith("data-kf-")) {
        img.removeAttribute(attribute.name);
      }
    });
    img.classList.remove("kf-inline-image");
    if (!img.className) img.removeAttribute("class");

    const source = img.getAttribute("src") || "";
    if (!source.startsWith("data:image/")) return;
    let asset = bySource.get(source);
    if (!asset) {
      const decoded = decodeImageDataUrl(source, { atobFn, TextEncoderCtor });
      if (!decoded) return;
      const number = assets.length + 1;
      asset = {
        id: `image-${number}`,
        fileName: `image-${number}.${decoded.extension}`,
        mediaType: decoded.mediaType,
        bytes: decoded.bytes,
      };
      assets.push(asset);
      bySource.set(source, asset);
    }
    img.setAttribute("src", `images/${asset.fileName}`);
  });

  return { html: root.innerHTML, assets };
}
