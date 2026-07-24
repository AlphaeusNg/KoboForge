/**
 * Build a real fixed-layout EPUB fixture from the same package-file generator
 * used by the browser. Optionally validate with EPUBCheck:
 *
 * EPUBCHECK_JAR=/path/to/epubcheck.jar node tools/test_fixed_epub.mjs
 */
import assert from 'node:assert/strict';
import {
    existsSync,
    mkdirSync,
    mkdtempSync,
    rmSync,
    writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { buildFixedLayoutPublicationFiles } from '../js/fixed-layout.js';

const fixtureRoot = mkdtempSync(join(tmpdir(), 'koboforge-fixed-'));
const outputPath = join(fixtureRoot, 'fixture.fxl.kepub.epub');
const png1x1 = new Uint8Array(Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    'base64'
));

try {
    const files = buildFixedLayoutPublicationFiles({
        title: 'KoboForge Fixed Layout Fixture',
        author: 'KoboForge',
        lang: 'en',
        identifier: 'urn:uuid:koboforge-fixed-layout-fixture',
        modified: '2026-07-24T00:00:00Z',
        pages: [
            {
                width: 1264,
                height: 1680,
                mediaType: 'image/png',
                bytes: png1x1,
                text: 'First fixed page.'
            },
            {
                width: 1264,
                height: 1680,
                mediaType: 'image/png',
                bytes: png1x1,
                text: 'Second fixed page.'
            }
        ]
    });

    files.forEach((value, path) => {
        const target = join(fixtureRoot, path);
        mkdirSync(dirname(target), { recursive: true });
        writeFileSync(target, value);
    });

    let result = spawnSync('zip', ['-X0', outputPath, 'mimetype'], {
        cwd: fixtureRoot,
        encoding: 'utf8'
    });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    result = spawnSync('zip', ['-Xr9', outputPath, 'META-INF', 'OEBPS'], {
        cwd: fixtureRoot,
        encoding: 'utf8'
    });
    assert.equal(result.status, 0, result.stderr || result.stdout);

    result = spawnSync('unzip', ['-Z1', outputPath], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.equal(
        result.stdout.trim().split(/\r?\n/)[0],
        'mimetype',
        'EPUB mimetype must be the first ZIP entry'
    );

    const epubcheckJar = process.env.EPUBCHECK_JAR;
    if (epubcheckJar) {
        assert.ok(existsSync(epubcheckJar), `EPUBCheck jar not found: ${epubcheckJar}`);
        result = spawnSync('java', ['-jar', epubcheckJar, outputPath], {
            encoding: 'utf8'
        });
        assert.equal(
            result.status,
            0,
            `${result.stdout}\n${result.stderr}`.trim()
        );
        console.log('Fixed-layout EPUB fixture passed EPUBCheck.');
    } else {
        console.log('Fixed-layout EPUB fixture packaged successfully (EPUBCHECK_JAR not set).');
    }
} finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
}
