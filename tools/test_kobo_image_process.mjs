/**
 * Node tests for Kobo image processing helpers (no browser/canvas).
 * Run: node tools/test_kobo_image_process.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  formatConversionNote,
  koboTargetPixelSize,
  screenForDevice,
} from '../js/kobo-image-process.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const bootPath = join(__dirname, '../js/boot.js');
const bootScript = readFileSync(bootPath, 'utf8');

const downsized = koboTargetPixelSize(4032, 3024, 1264, 1680);
assert.ok(downsized.scale < 1, 'phone-sized photos must downsize for Libra Colour');
assert.ok(downsized.width <= 1264, 'output width must fit the device');
assert.ok(downsized.height <= 1680, 'output height must fit the device');
assert.ok(downsized.width < 4032 && downsized.height < 3024, 'both dimensions must shrink');

const alreadySmall = koboTargetPixelSize(800, 600, 1264, 1680);
assert.equal(alreadySmall.width, 800);
assert.equal(alreadySmall.height, 600);
assert.equal(alreadySmall.scale, 1, 'already-small images must keep their pixel size');

const landscape = screenForDevice('libra-colour', 'landscape');
assert.equal(landscape.width, 1680, 'landscape must swap Libra Colour width');
assert.equal(landscape.height, 1264, 'landscape must swap Libra Colour height');
const portrait = screenForDevice('libra-colour', 'portrait');
assert.equal(portrait.width, 1264);
assert.equal(portrait.height, 1680);

assert.equal(
  formatConversionNote(4032, 3024, 1264, 945),
  '4032\u00d73024 \u2192 1264\u00d7945',
);

assert.ok(
  bootScript.includes('new URL("kobo-image-process.js", import.meta.url).href')
    && bootScript.includes('await import(koboImageProcessUrl)'),
  'boot must import kobo-image-process.js with the SITE_VERSION asset helper',
);
assert.ok(
  !bootScript.includes('asset("js/kobo-image-process.js")')
    && new URL('kobo-image-process.js', 'https://alphaeusng.github.io/KoboForge/js/boot.js').href
      === 'https://alphaeusng.github.io/KoboForge/js/kobo-image-process.js',
  'boot must resolve kobo-image-process.js beside boot.js instead of requesting js/js/kobo-image-process.js',
);
assert.ok(
  bootScript.includes('new URL("image-size-hold.js", import.meta.url).href'),
  'boot must keep loading image-size-hold.js',
);

console.log('KoboForge Kobo image-process tests passed.');
