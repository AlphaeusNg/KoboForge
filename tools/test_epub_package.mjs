import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import JSZip from 'jszip';
import {
    buildReflowableEpubArchive,
    buildReflowablePublicationFiles,
    generateEpubArchive
} from '../js/epub-package.js';

const identifier = 'urn:uuid:reflowable-fixture';
const imageBytes = new Uint8Array(Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    'base64'
));
const files = buildReflowablePublicationFiles({
    title: 'Reflowable & Tested',
    author: 'KoboForge',
    lang: 'en',
    identifier,
    modified: '2026-08-09T00:00:00Z',
    chapters: [
        { title: 'Opening', html: '<h1>Opening</h1><p>First chapter.</p>' },
        { title: 'Images', html: '<h1>Images</h1><p><img src="images/image-1.png" alt="Test"/></p>' }
    ],
    assets: [
        { id: 'image-1', fileName: 'image-1.png', mediaType: 'image/png', bytes: imageBytes }
    ]
});

assert.equal(files.get('mimetype'), 'application/epub+zip');
assert.match(files.get('META-INF/container.xml'), /full-path="OEBPS\/content\.opf"/);
const opf = files.get('OEBPS/content.opf');
assert.match(opf, /<dc:identifier id="bookid">urn:uuid:reflowable-fixture<\/dc:identifier>/);
assert.match(opf, /<dc:title>Reflowable &amp; Tested<\/dc:title>/);
assert.equal(/rendition:layout|pre-paginated/.test(opf), false, 'package remains reflowable');
assert.equal((opf.match(/<itemref\b/g) || []).length, 2, 'both chapters are in the spine');
assert.match(opf, /href="images\/image-1\.png" media-type="image\/png"/);
assert.match(files.get('OEBPS/nav.xhtml'), /chapter-1\.xhtml[\s\S]*chapter-2\.xhtml/);
assert.match(files.get('OEBPS/toc.ncx'), new RegExp(identifier));
assert.match(files.get('OEBPS/chapter-2.xhtml'), /<img src="images\/image-1\.png" alt="Test"\/>/);
assert.deepEqual(files.get('OEBPS/images/image-1.png'), imageBytes);
assert.throws(
    () => buildReflowablePublicationFiles({
        identifier,
        chapters: [{ title: 'Unsafe', html: '<p>Unsafe</p>' }],
        assets: [{ id: 'image-1', fileName: '../escape.png', mediaType: 'image/png', bytes: imageBytes }]
    }),
    /Invalid EPUB image filename/
);
assert.throws(
    () => buildReflowablePublicationFiles({ identifier, chapters: [] }),
    /at least one chapter/
);

const archive = await generateEpubArchive(JSZip, files, { type: 'nodebuffer' });
assert.equal(archive.readUInt32LE(0), 0x04034b50, 'archive starts with a local file header');
assert.equal(archive.readUInt16LE(8), 0, 'mimetype entry is stored without compression');
const firstNameLength = archive.readUInt16LE(26);
assert.equal(archive.subarray(30, 30 + firstNameLength).toString('utf8'), 'mimetype');
const firstExtraLength = archive.readUInt16LE(28);
const firstCompressedSize = archive.readUInt32LE(18);
const secondHeaderOffset = 30 + firstNameLength + firstExtraLength + firstCompressedSize;
assert.equal(archive.readUInt32LE(secondHeaderOffset), 0x04034b50);
assert.equal(archive.readUInt16LE(secondHeaderOffset + 8), 8, 'publication content uses DEFLATE');

const loaded = await JSZip.loadAsync(archive);
assert.deepEqual(
    Object.keys(loaded.files).filter((name) => !loaded.files[name].dir).sort(),
    [...files.keys()].sort(),
    'archive contains exactly the publication files'
);
assert.equal(await loaded.file('mimetype').async('string'), 'application/epub+zip');

const adapterArchive = await buildReflowableEpubArchive(JSZip, {
    title: 'Adapter image test',
    author: 'KoboForge',
    lang: 'en',
    identifier: 'urn:uuid:adapter-image-fixture',
    modified: '2026-08-09T00:00:00Z',
    chapters: [
        { title: 'Image', html: '<h1>Image</h1><img src="images/image-1.png" alt="One image"/>' }
    ],
    assets: [
        { id: 'image-1', fileName: 'image-1.png', mediaType: 'image/png', bytes: imageBytes }
    ]
}, { type: 'nodebuffer' });
const adapterLoaded = await JSZip.loadAsync(adapterArchive);
assert.deepEqual(
    Object.keys(adapterLoaded.files).filter((name) => name.startsWith('OEBPS/images/')),
    ['OEBPS/images/image-1.png'],
    'the combined archive adapter packages each prepared image exactly once'
);
assert.deepEqual(
    await adapterLoaded.file('OEBPS/images/image-1.png').async('uint8array'),
    imageBytes,
    'the combined archive adapter preserves prepared image bytes'
);
assert.match(
    await adapterLoaded.file('OEBPS/content.opf').async('string'),
    /href="images\/image-1\.png" media-type="image\/png"/,
    'the combined archive adapter manifests its image'
);
assert.match(
    await adapterLoaded.file('OEBPS/chapter-1.xhtml').async('string'),
    /src="images\/image-1\.png"/,
    'the combined archive adapter keeps the chapter image reference'
);

if (process.env.EPUBCHECK_JAR) {
    const fixtureRoot = mkdtempSync(join(tmpdir(), 'koboforge-reflowable-'));
    const outputPath = join(fixtureRoot, 'fixture.epub');
    try {
        writeFileSync(outputPath, archive);
        const result = spawnSync('java', ['-jar', process.env.EPUBCHECK_JAR, outputPath], {
            encoding: 'utf8'
        });
        assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
        console.log('Reflowable EPUB package passed EPUBCheck.');
    } finally {
        rmSync(fixtureRoot, { recursive: true, force: true });
    }
}

console.log('KoboForge reflowable EPUB package tests passed (24 assertions).');
