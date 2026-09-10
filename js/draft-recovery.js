/** Versioned, local-only KoboForge draft persistence. */

export const DRAFT_SCHEMA_VERSION = 1;
export const DRAFT_DATABASE_NAME = "koboforge-drafts";
export const DRAFT_DATABASE_VERSION = 1;
export const DRAFT_STORE_NAME = "drafts";
export const ACTIVE_DRAFT_KEY = "active-book";

export const DRAFT_AFTER_EXPORT = Object.freeze({
  state: "exported",
  message:
    "EPUB downloaded. Keep the private recovery draft for more editing, or clear it from this browser.",
  keepLabel: "Keep recovery draft",
  clearLabel: "Clear draft",
  defaultAction: "clear",
});

export function shouldPromptDraftAfterExport({
  downloadSucceeded = false,
  storageUnavailable = false,
  hasPersistedDraft = false,
} = {}) {
  return downloadSucceeded === true
    && storageUnavailable !== true
    && hasPersistedDraft === true;
}

const OUTPUT_STRING_FIELDS = Object.freeze([
  "title",
  "author",
  "bodyHtml",
  "originalBodyHtml",
  "formatLabel",
  "structureNote",
  "status",
  "imageTarget",
]);
const OUTPUT_NUMBER_FIELDS = Object.freeze([
  "paragraphCount",
  "imageCount",
  "noteSpaceCount",
  "pageCount",
  "detectedImageCount",
  "detectedFontCount",
  "readingColumnPageCount",
]);
const OUTPUT_STRING_ARRAY_FIELDS = Object.freeze(["warnings", "mammothMessages"]);
const OUTPUT_NUMBER_ARRAY_FIELDS = Object.freeze(["emptyPages", "imageOnlyPages"]);

function isObject(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function finiteNonNegative(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

function cleanStringMap(value, { imageDataOnly = false } = {}) {
  if (!isObject(value)) return {};
  const clean = {};
  for (const [key, entry] of Object.entries(value)) {
    if (!key || typeof entry !== "string") continue;
    if (imageDataOnly && !/^data:image\/(?:png|jpeg|gif|webp);/i.test(entry)) continue;
    clean[key] = entry;
  }
  return clean;
}

function cleanImageVariants(value) {
  if (!isObject(value)) return {};
  const clean = {};
  for (const [key, entry] of Object.entries(value)) {
    if (!key || !isObject(entry) || !/^data:image\/(?:png|jpeg|gif|webp);/i.test(entry.dataUrl || "")) {
      continue;
    }
    clean[key] = {
      dataUrl: entry.dataUrl,
      width: Math.max(1, Math.round(finiteNonNegative(entry.width, 1))),
      height: Math.max(1, Math.round(finiteNonNegative(entry.height, 1))),
      tone: typeof entry.tone === "string" ? entry.tone : "",
      mimeType: typeof entry.mimeType === "string" ? entry.mimeType : "",
    };
  }
  return clean;
}

function hasUnsafeRestoredResource(html) {
  const source = String(html || "");
  if (/\b(?:src|href)\s*=\s*["']?\s*(?:blob|file|https?):/i.test(source)) return true;
  const imagePattern = /<img\b[^>]*>/gi;
  let imageTag;
  while ((imageTag = imagePattern.exec(source))) {
    const sourceMatch = /\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(imageTag[0]);
    if (!sourceMatch) continue;
    const imageSource = String(sourceMatch[1] ?? sourceMatch[2] ?? sourceMatch[3] ?? "").trim();
    if (!/^data:image\/(?:png|jpeg|gif|webp);/i.test(imageSource)) return true;
  }
  return false;
}

function normalizeOutput(value) {
  if (!isObject(value)) return null;
  if (typeof value.bodyHtml !== "string" || typeof value.originalBodyHtml !== "string") return null;
  if (typeof value.formatLabel !== "string" || !value.formatLabel.trim()) return null;
  if (hasUnsafeRestoredResource(value.bodyHtml) || hasUnsafeRestoredResource(value.originalBodyHtml)) {
    return null;
  }

  const output = {};
  OUTPUT_STRING_FIELDS.forEach((field) => {
    output[field] = typeof value[field] === "string" ? value[field] : "";
  });
  OUTPUT_NUMBER_FIELDS.forEach((field) => {
    output[field] = finiteNonNegative(value[field]);
  });
  OUTPUT_STRING_ARRAY_FIELDS.forEach((field) => {
    output[field] = Array.isArray(value[field])
      ? value[field].filter((entry) => typeof entry === "string")
      : [];
  });
  OUTPUT_NUMBER_ARRAY_FIELDS.forEach((field) => {
    output[field] = Array.isArray(value[field])
      ? value[field].map((entry) => Number(entry)).filter((entry) => Number.isFinite(entry) && entry >= 0)
      : [];
  });
  output.imageSources = cleanStringMap(value.imageSources, { imageDataOnly: true });
  output.imageVariants = cleanImageVariants(value.imageVariants);
  return output;
}

export function normalizeDraftRecord(value) {
  if (!isObject(value) || value.schemaVersion !== DRAFT_SCHEMA_VERSION) return null;
  const savedAt = typeof value.savedAt === "string" ? value.savedAt : "";
  if (!savedAt || !Number.isFinite(Date.parse(savedAt))) return null;
  if (!isObject(value.source) || typeof value.source.name !== "string" || !value.source.name.trim()) {
    return null;
  }
  if (!isObject(value.book) || !isObject(value.options)) return null;
  const output = normalizeOutput(value.document);
  if (!output) return null;

  const device = isObject(value.options.device) ? value.options.device : {};
  return {
    schemaVersion: DRAFT_SCHEMA_VERSION,
    savedAt,
    source: {
      name: value.source.name,
      size: finiteNonNegative(value.source.size),
      type: typeof value.source.type === "string" ? value.source.type : "",
      lastModified: finiteNonNegative(value.source.lastModified),
    },
    book: {
      title: typeof value.book.title === "string" ? value.book.title : "",
      author: typeof value.book.author === "string" ? value.book.author : "",
      lang: typeof value.book.lang === "string" ? value.book.lang : "en",
      titleWasEdited: value.book.titleWasEdited === true,
    },
    options: {
      preserveTables: value.options.preserveTables !== false,
      splitChapters: value.options.splitChapters === true,
      device: {
        device: typeof device.device === "string" ? device.device : "",
        deviceOrientation: typeof device.deviceOrientation === "string"
          ? device.deviceOrientation
          : "",
        deviceFontSize: finiteNonNegative(device.deviceFontSize),
        deviceMargin: finiteNonNegative(device.deviceMargin),
        deviceChrome: device.deviceChrome !== false,
      },
    },
    bodyEdited: value.bodyEdited === true,
    document: output,
  };
}

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("IndexedDB request failed."));
  });
}

function transactionDone(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error || new Error("IndexedDB transaction was aborted."));
    transaction.onerror = () => reject(transaction.error || new Error("IndexedDB transaction failed."));
  });
}

function openDatabase(indexedDb) {
  if (!indexedDb || typeof indexedDb.open !== "function") {
    return Promise.reject(new Error("IndexedDB is unavailable."));
  }
  let request;
  try {
    request = indexedDb.open(DRAFT_DATABASE_NAME, DRAFT_DATABASE_VERSION);
  } catch (error) {
    return Promise.reject(error);
  }
  request.onupgradeneeded = () => {
    const database = request.result;
    if (!database.objectStoreNames.contains(DRAFT_STORE_NAME)) {
      database.createObjectStore(DRAFT_STORE_NAME);
    }
  };
  return requestResult(request);
}

async function useStore(indexedDb, mode, operation) {
  const database = await openDatabase(indexedDb);
  try {
    const transaction = database.transaction(DRAFT_STORE_NAME, mode);
    const resultPromise = requestResult(operation(transaction.objectStore(DRAFT_STORE_NAME)));
    const [result] = await Promise.all([resultPromise, transactionDone(transaction)]);
    return result;
  } finally {
    database.close();
  }
}

export function createDraftStore(indexedDb = globalThis.indexedDB) {
  return {
    async load() {
      const value = await useStore(
        indexedDb,
        "readonly",
        (store) => store.get(ACTIVE_DRAFT_KEY),
      );
      if (value === undefined) return { state: "empty" };
      const draft = normalizeDraftRecord(value);
      if (draft) return { state: "ready", draft };
      try {
        await this.remove();
      } catch (_) {
        // The invalid record stays inaccessible even if a constrained browser
        // also refuses the cleanup transaction.
      }
      return { state: "invalid" };
    },

    async save(value) {
      const draft = normalizeDraftRecord(value);
      if (!draft) throw new TypeError("Draft record is invalid.");
      await useStore(
        indexedDb,
        "readwrite",
        (store) => store.put(draft, ACTIVE_DRAFT_KEY),
      );
      return draft;
    },

    async remove() {
      await useStore(
        indexedDb,
        "readwrite",
        (store) => store.delete(ACTIVE_DRAFT_KEY),
      );
    },
  };
}
