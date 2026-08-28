/**
 * Kobo-targeted resize and tone-map for dropped, pasted, and DOCX images.
 * Pure helpers work in Node without canvas/Image. Browser conversion is guarded.
 */
export const KOBO_SCREENS = Object.freeze({
  'libra-colour': Object.freeze({ width: 1264, height: 1680, colour: true }),
  'clara-bw': Object.freeze({ width: 1072, height: 1448, colour: false }),
  'clara-colour': Object.freeze({ width: 1072, height: 1448, colour: true }),
  sage: Object.freeze({ width: 1440, height: 1920, colour: true }),
  'elipsa-2e': Object.freeze({ width: 1404, height: 1872, colour: false }),
});

const DEFAULT_DEVICE = 'libra-colour';
const PAPER = '#f4f1e8';
const PROCESSED_ATTR = 'data-kf-kobo-processed';
const SOURCE_SIZE_ATTR = 'data-kf-source-size';
const PIXEL_SIZE_ATTR = 'data-kf-pixel-size';

export function screenForDevice(deviceKey, orientation = 'portrait') {
  const screen = KOBO_SCREENS[deviceKey] || KOBO_SCREENS[DEFAULT_DEVICE];
  if (String(orientation || '').toLowerCase() === 'landscape') {
    return { width: screen.height, height: screen.width, colour: screen.colour };
  }
  return { width: screen.width, height: screen.height, colour: screen.colour };
}

export function koboTargetPixelSize(srcW, srcH, deviceW, deviceH) {
  const sw = Math.max(1, Number(srcW) || 1);
  const sh = Math.max(1, Number(srcH) || 1);
  const dw = Math.max(1, Number(deviceW) || 1);
  const dh = Math.max(1, Number(deviceH) || 1);
  const scale = Math.min(1, dw / sw, dh / sh);
  return {
    width: Math.max(1, Math.round(sw * scale)),
    height: Math.max(1, Math.round(sh * scale)),
    scale,
  };
}

export function formatConversionNote(srcW, srcH, outW, outH) {
  return `${srcW}\u00d7${srcH} \u2192 ${outW}\u00d7${outH}`;
}

function contrastChannel(value, contrast) {
  return Math.max(0, Math.min(255, (value - 128) * contrast + 128));
}

function applyEinkTreatment(context, width, height, tone) {
  const imageData = context.getImageData(0, 0, width, height);
  const pixels = imageData.data;
  if (tone === 'colour') {
    const contrast = 1.05;
    for (let i = 0; i < pixels.length; i += 4) {
      pixels[i] = contrastChannel(pixels[i], contrast);
      pixels[i + 1] = contrastChannel(pixels[i + 1], contrast);
      pixels[i + 2] = contrastChannel(pixels[i + 2], contrast);
    }
    context.putImageData(imageData, 0, 0);
    return;
  }
  // Floyd–Steinberg error diffusion at the device's native pixel grid.
  const contrast = 1.1;
  const luminance = new Float32Array(width * height);
  for (let i = 0, p = 0; i < pixels.length; i += 4, p += 1) {
    luminance[p] = contrastChannel(
      (pixels[i] * 0.2126) + (pixels[i + 1] * 0.7152) + (pixels[i + 2] * 0.0722),
      contrast,
    );
  }
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const p = (y * width) + x;
      const oldValue = luminance[p];
      const newValue = oldValue < 128 ? 0 : 255;
      const error = oldValue - newValue;
      luminance[p] = newValue;
      if (x + 1 < width) luminance[p + 1] += error * (7 / 16);
      if (y + 1 < height) {
        if (x > 0) luminance[p + width - 1] += error * (3 / 16);
        luminance[p + width] += error * (5 / 16);
        if (x + 1 < width) luminance[p + width + 1] += error * (1 / 16);
      }
    }
  }
  for (let p = 0, i = 0; p < luminance.length; p += 1, i += 4) {
    const gray = luminance[p] < 128 ? 0 : 255;
    pixels[i] = gray;
    pixels[i + 1] = gray;
    pixels[i + 2] = gray;
  }
  context.putImageData(imageData, 0, 0);
}

function browserCanConvert() {
  return typeof document !== 'undefined'
    && typeof Image !== 'undefined'
    && typeof HTMLCanvasElement !== 'undefined';
}

function loadImageElement(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Browser could not decode an embedded image.'));
    image.src = source;
  });
}

export async function convertImageSourceForKobo(source, target) {
  if (!browserCanConvert()) {
    throw new Error('Image conversion requires a browser canvas.');
  }
  const image = await loadImageElement(source);
  const sourceWidth = Math.max(1, image.naturalWidth || image.width || 1);
  const sourceHeight = Math.max(1, image.naturalHeight || image.height || 1);
  const sized = koboTargetPixelSize(sourceWidth, sourceHeight, target.width, target.height);
  const width = sized.width;
  const height = sized.height;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('Canvas is unavailable for embedded image conversion.');
  context.fillStyle = PAPER;
  context.fillRect(0, 0, width, height);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(image, 0, 0, width, height);
  const tone = target.colour ? 'colour' : 'dither';
  applyEinkTreatment(context, width, height, tone);
  const sourceMime = /^data:([^;,]+)/i.exec(source)?.[1]?.toLowerCase() || '';
  const mimeType = tone === 'colour' && sourceMime === 'image/jpeg'
    ? 'image/jpeg'
    : 'image/png';
  return {
    dataUrl: canvas.toDataURL(mimeType, mimeType === 'image/jpeg' ? 0.88 : undefined),
    width,
    height,
    sourceWidth,
    sourceHeight,
    scale: sized.scale,
    tone,
    mimeType,
  };
}

function currentDeviceKey() {
  if (typeof document === 'undefined') return DEFAULT_DEVICE;
  return document.getElementById('deviceSelect')?.value || DEFAULT_DEVICE;
}

function currentOrientation() {
  if (typeof document === 'undefined') return 'portrait';
  const el = document.getElementById('deviceOrientation')
    || document.querySelector('select#deviceOrientation');
  return el?.value === 'landscape' ? 'landscape' : 'portrait';
}

function currentTarget() {
  return screenForDevice(currentDeviceKey(), currentOrientation());
}

function processStamp() {
  return `${currentDeviceKey()}:${currentOrientation()}`;
}

function isSvgDataUrl(src) {
  return /^data:image\/svg\+xml/i.test(src || '');
}

function isRasterDataImage(src) {
  return /^data:image\//i.test(src || '') && !isSvgDataUrl(src);
}

function collectCandidateImages() {
  if (typeof document === 'undefined') return [];
  const found = new Set();
  const book = document.getElementById('deviceBookContent');
  const roots = [];
  if (book) roots.push(book);
  roots.push(document);
  for (const root of roots) {
    const list = root.querySelectorAll ? root.querySelectorAll('img') : [];
    for (const img of list) found.add(img);
  }
  return [...found];
}

function isProcessedForStamp(img, stamp) {
  return img.getAttribute(PROCESSED_ATTR) === stamp;
}

function isOversizedForTarget(img, target) {
  const w = Number(img.naturalWidth || 0);
  const h = Number(img.naturalHeight || 0);
  if (!(w > 0) || !(h > 0)) return true;
  return w > target.width || h > target.height;
}

function parseSourceSize(img, fallbackW, fallbackH) {
  const raw = img.getAttribute(SOURCE_SIZE_ATTR) || '';
  const match = /^(\d+)x(\d+)$/i.exec(raw);
  if (match) return { width: Number(match[1]), height: Number(match[2]) };
  return { width: fallbackW, height: fallbackH };
}

function ensureNoteElement() {
  if (typeof document === 'undefined') return null;
  let noteEl = document.getElementById('imageConvertNote');
  if (noteEl) return noteEl;
  const anchor = document.getElementById('diagnostics') || document.getElementById('status');
  if (!anchor?.parentNode) return null;
  noteEl = document.createElement('p');
  noteEl.id = 'imageConvertNote';
  noteEl.className = 'mt-2 hidden text-xs leading-5 text-slate-400';
  noteEl.hidden = true;
  anchor.parentNode.insertBefore(noteEl, anchor.nextSibling);
  return noteEl;
}

function showConversionNotes(notes) {
  if (!notes.length || typeof document === 'undefined') return;
  const text = notes.join('; ');
  const noteEl = ensureNoteElement() || document.getElementById('imageConvertNote');
  if (noteEl) {
    noteEl.textContent = text;
    noteEl.hidden = false;
    noteEl.removeAttribute('hidden');
    noteEl.classList.remove('hidden');
    return;
  }
  const fallback = document.getElementById('diagnostics') || document.getElementById('status');
  if (!fallback) return;
  fallback.hidden = false;
  fallback.removeAttribute('hidden');
  fallback.classList.remove('hidden');
  const existing = (fallback.textContent || '').trim();
  fallback.textContent = existing && !existing.includes(text) ? `${existing} ${text}` : (existing || text);
}

async function convertDomImage(img, target) {
  const source = img.getAttribute('src') || '';
  const converted = await convertImageSourceForKobo(source, target);
  const original = parseSourceSize(img, converted.sourceWidth, converted.sourceHeight);
  img.setAttribute('src', converted.dataUrl);
  img.setAttribute(PROCESSED_ATTR, processStamp());
  img.setAttribute(SOURCE_SIZE_ATTR, `${original.width}x${original.height}`);
  img.setAttribute(PIXEL_SIZE_ATTR, `${converted.width}x${converted.height}`);
  img.removeAttribute('width');
  img.removeAttribute('height');
  return formatConversionNote(original.width, original.height, converted.width, converted.height);
}

let processChain = Promise.resolve();
let applying = false;

export async function processDocumentImages() {
  if (!browserCanConvert()) return [];
  const run = processChain.then(async () => {
    const stamp = processStamp();
    const target = currentTarget();
    const notes = [];
    applying = true;
    try {
      for (const img of collectCandidateImages()) {
        const src = img.getAttribute('src') || '';
        if (!isRasterDataImage(src)) continue;
        if (isProcessedForStamp(img, stamp)) continue;
        try {
          notes.push(await convertDomImage(img, target));
        } catch (error) {
          console.warn('[KoboForge] Kobo image processing failed', error);
        }
      }
    } finally {
      applying = false;
    }
    if (notes.length) showConversionNotes(notes);
    return notes;
  });
  processChain = run.catch(() => {});
  return run;
}

function pendingUnprocessedOversized() {
  const stamp = processStamp();
  const target = currentTarget();
  return collectCandidateImages().filter((img) => {
    const src = img.getAttribute('src') || '';
    if (!isRasterDataImage(src)) return false;
    if (isProcessedForStamp(img, stamp)) return false;
    return isOversizedForTarget(img, target);
  });
}

let bound = false;
let downloadReentry = false;
let observerTimer = 0;

export function bindKoboImageProcessing() {
  if (typeof document === 'undefined') return;
  if (bound) return;
  bound = true;
  ensureNoteElement();

  const schedule = () => {
    if (applying) return;
    if (observerTimer) clearTimeout(observerTimer);
    observerTimer = setTimeout(() => {
      observerTimer = 0;
      processDocumentImages();
    }, 40);
  };

  const book = document.getElementById('deviceBookContent');
  if (book && typeof MutationObserver !== 'undefined') {
    const observer = new MutationObserver(() => {
      if (applying) return;
      schedule();
    });
    observer.observe(book, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['src'],
    });
  }

  const deviceSelect = document.getElementById('deviceSelect');
  const orientation = document.getElementById('deviceOrientation')
    || document.querySelector('select#deviceOrientation');
  deviceSelect?.addEventListener('change', () => processDocumentImages());
  orientation?.addEventListener('change', () => processDocumentImages());

  const downloadBtn = document.getElementById('downloadBtn');
  downloadBtn?.addEventListener('click', async (event) => {
    if (downloadReentry) return;
    if (!pendingUnprocessedOversized().length) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    await processDocumentImages();
    downloadReentry = true;
    try {
      downloadBtn.click();
    } finally {
      downloadReentry = false;
    }
  }, true);

  schedule();
}

if (typeof document !== 'undefined') {
  bindKoboImageProcessing();
}
