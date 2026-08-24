/** DOM-backed preparation of embedded images for EPUB packaging. */

const IMAGE_EXTENSIONS = Object.freeze({
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/svg+xml": "svg",
  "image/webp": "webp",
});
const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

function startsWithBytes(bytes, signature) {
  return signature.every((value, index) => bytes[index] === value);
}

function hasDecodedImageSignature(
  mediaType,
  bytes,
  { DOMParserCtor, TextDecoderCtor },
) {
  switch (mediaType) {
    case "image/png":
      return startsWithBytes(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    case "image/jpeg":
      return startsWithBytes(bytes, [0xff, 0xd8, 0xff]);
    case "image/gif":
      return startsWithBytes(bytes, [0x47, 0x49, 0x46, 0x38, 0x37, 0x61])
        || startsWithBytes(bytes, [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
    case "image/webp":
      return startsWithBytes(bytes, [0x52, 0x49, 0x46, 0x46])
        && [0x57, 0x45, 0x42, 0x50].every(
          (value, index) => bytes[index + 8] === value,
        );
    case "image/svg+xml": {
      try {
        const source = new TextDecoderCtor("utf-8", { fatal: true }).decode(bytes);
        const parsed = new DOMParserCtor().parseFromString(source, "image/svg+xml");
        return parsed.documentElement?.localName?.toLowerCase() === "svg"
          && parsed.documentElement.namespaceURI === SVG_NAMESPACE
          && !parsed.querySelector("parsererror");
      } catch (_) {
        return false;
      }
    }
    default:
      return false;
  }
}

export class EmbeddedImageError extends Error {
  constructor(message, { imageNumber, mediaType = "", cause } = {}) {
    super(message);
    this.name = "EmbeddedImageError";
    this.imageNumber = imageNumber;
    this.mediaType = mediaType;
    if (cause) this.cause = cause;
  }
}

function imageError(imageNumber, problem, details = {}) {
  return new EmbeddedImageError(
    `Embedded image ${imageNumber} ${problem}`,
    { imageNumber, ...details },
  );
}

function decodeImageDataUrl(
  source,
  imageNumber,
  { atobFn, DOMParserCtor, TextDecoderCtor, TextEncoderCtor },
) {
  const match = /^data:([^,]*),([\s\S]*)$/i.exec(source || "");
  if (!match) {
    throw imageError(
      imageNumber,
      "has a malformed data URL. Replace or remove it, then download again.",
    );
  }

  const metadata = match[1].split(";").map((part) => part.trim());
  const mediaType = metadata.shift()?.toLowerCase() || "";
  if (!mediaType.startsWith("image/")) {
    throw imageError(
      imageNumber,
      "does not declare an image media type. Replace or remove it, then download again.",
      { mediaType },
    );
  }
  const extension = IMAGE_EXTENSIONS[mediaType];
  if (!extension) {
    throw imageError(
      imageNumber,
      `uses unsupported type "${mediaType}". Convert it to PNG, JPEG, GIF, SVG, or WebP, then download again.`,
      { mediaType },
    );
  }

  const payload = match[2];
  const isBase64 = metadata.some((part) => part.toLowerCase() === "base64");
  let bytes;
  try {
    if (isBase64) {
      const binary = atobFn(payload);
      bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
      }
    } else {
      bytes = new TextEncoderCtor().encode(decodeURIComponent(payload));
    }
  } catch (cause) {
    throw imageError(
      imageNumber,
      `has invalid ${isBase64 ? "base64" : "percent-encoded"} data. Replace or remove it, then download again.`,
      { mediaType, cause },
    );
  }
  if (!bytes.length) {
    throw imageError(
      imageNumber,
      "contains no image data. Replace or remove it, then download again.",
      { mediaType },
    );
  }
  if (!hasDecodedImageSignature(
    mediaType,
    bytes,
    { DOMParserCtor, TextDecoderCtor },
  )) {
    throw imageError(
      imageNumber,
      `does not match its declared type "${mediaType}". Replace or convert it, then download again.`,
      { mediaType },
    );
  }
  return { mediaType, extension, bytes };
}

export function extractEmbeddedImagesForEpub(
  html,
  {
    DOMParserCtor = globalThis.DOMParser,
    atobFn = globalThis.atob?.bind(globalThis),
    TextDecoderCtor = globalThis.TextDecoder,
    TextEncoderCtor = globalThis.TextEncoder,
  } = {},
) {
  if (typeof DOMParserCtor !== "function") {
    throw new TypeError("DOMParser is required to extract EPUB images.");
  }
  if (
    typeof atobFn !== "function"
    || typeof TextDecoderCtor !== "function"
    || typeof TextEncoderCtor !== "function"
  ) {
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
  root.querySelectorAll("img").forEach((img, index) => {
    Array.from(img.attributes).forEach((attribute) => {
      if (attribute.name.startsWith("data-kf-")) {
        img.removeAttribute(attribute.name);
      }
    });
    img.classList.remove("kf-inline-image");
    if (!img.className) img.removeAttribute("class");

    const source = img.getAttribute("src") || "";
    const trimmedSource = source.trim();
    if (/^https?:/i.test(trimmedSource) || /^\/\//.test(trimmedSource)) {
      throw imageError(
        index + 1,
        "references a remote URL. Save and paste or drop the image into the book, or remove it, then download again.",
      );
    }
    if (!/^data:/i.test(source)) return;
    let asset = bySource.get(source);
    if (!asset) {
      const decoded = decodeImageDataUrl(
        source,
        index + 1,
        { atobFn, DOMParserCtor, TextDecoderCtor, TextEncoderCtor },
      );
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
