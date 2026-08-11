import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const workflowPath = join(root, '.github/workflows/ci.yml');

assert.equal(existsSync(workflowPath), true, 'CI workflow must exist');
const workflow = readFileSync(workflowPath, 'utf8');
assert.match(workflow, /uses:\s*actions\/checkout@v7\b/, 'CI uses current checkout runtime');
assert.match(workflow, /uses:\s*actions\/setup-node@v7\b/, 'CI uses current setup-node runtime');
assert.match(workflow, /node-version:\s*["']?24["']?\b/, 'CI tests on Active LTS Node 24');
assert.match(workflow, /cache:\s*["']?npm["']?\b/, 'CI caches locked npm dependencies');
assert.match(workflow, /run:\s*npm ci --ignore-scripts\b/, 'CI installs from the lockfile safely');
assert.match(workflow, /run:\s*npm test\b/, 'CI runs the full default suite');
assert.match(
    workflow,
    /run:\s*npx playwright install --with-deps chromium\b/,
    'CI installs the locked Chromium runtime'
);
assert.match(
    workflow,
    /run:\s*npm run test:browser\b/,
    'CI runs the browser import/edit/export smoke'
);
assert.match(
    workflow,
    /uses:\s*actions\/setup-java@v5\b/,
    'CI uses the Node 24-compatible Java setup action'
);
assert.match(workflow, /distribution:\s*temurin\b/, 'CI pins the Java distribution');
assert.match(workflow, /java-version:\s*["']?21["']?\b/, 'CI pins Java 21');
assert.match(
    workflow,
    /uses:\s*actions\/cache@v6\b/,
    'CI uses the Node 24-compatible cache action'
);
assert.match(
    workflow,
    /id:\s*epubcheck-cache\b/,
    'CI names the EPUBCheck cache result for exact-hit branching'
);
assert.match(
    workflow,
    /path:\s*\$\{\{\s*runner\.temp\s*\}\}\/koboforge-epubcheck\.zip\b/,
    'CI caches only the immutable EPUBCheck archive'
);
assert.match(
    workflow,
    /key:\s*epubcheck-\$\{\{\s*runner\.os\s*\}\}-\$\{\{\s*env\.EPUBCHECK_VERSION\s*\}\}-\$\{\{\s*env\.EPUBCHECK_SHA256\s*\}\}/,
    'CI keys EPUBCheck by platform, version, and committed digest'
);
assert.doesNotMatch(
    workflow,
    /restore-keys:/,
    'CI must not restore a prefix-matched EPUBCheck archive'
);
assert.match(
    workflow,
    /name:\s*Download EPUBCheck on cache miss\s*\n\s+if:\s*steps\.epubcheck-cache\.outputs\.cache-hit\s*!=\s*['"]true['"]/,
    'CI downloads EPUBCheck only when the exact cache key misses'
);
assert.match(
    workflow,
    /EPUBCHECK_VERSION:\s*["']?5\.3\.0["']?\b/,
    'CI pins EPUBCheck 5.3.0'
);
assert.match(
    workflow,
    /EPUBCHECK_SHA256:\s*6c07e68584b2e2ce2f89fe06e1246dfead3eb36b46b340e7d93524f29dcff6c5\b/,
    'CI pins the official EPUBCheck archive digest'
);
assert.doesNotMatch(workflow, /releases\/latest/, 'CI must not download a floating release');
assert.match(workflow, /sha256sum --check/, 'CI verifies EPUBCheck before extraction');
const cacheIndex = workflow.indexOf('Restore EPUBCheck archive');
const downloadIndex = workflow.indexOf('Download EPUBCheck on cache miss');
const verificationIndex = workflow.indexOf('Verify and extract EPUBCheck');
const standardsIndex = workflow.indexOf('Standards-check reflowable fixture');
assert.ok(
    cacheIndex >= 0 && cacheIndex < downloadIndex,
    'CI restores the exact cache before considering a download'
);
assert.ok(
    downloadIndex < verificationIndex && verificationIndex < standardsIndex,
    'CI always verifies cached or downloaded bytes before standards validation'
);
assert.match(
    workflow,
    /EPUBCHECK_JAR:[\s\S]*run:\s*node tools\/test_epub_package\.mjs/,
    'CI runs the package fixture through EPUBCheck'
);
assert.ok(
    workflow.indexOf('Standards-check reflowable fixture')
        < workflow.indexOf('Install Chromium'),
    'EPUB standards validation must run before the more expensive browser install'
);
assert.match(
    workflow,
    /run:\s*find js tools -type f/,
    'CI recursively discovers runtime and test modules for syntax checks'
);
assert.match(
    workflow,
    /xargs -0 -n1 node --check/,
    'CI syntax-checks every discovered module independently'
);
assert.match(workflow, /permissions:\s*\n\s+contents:\s*read\b/, 'CI retains read-only permissions');
assert.match(workflow, /timeout-minutes:\s*10\b/, 'CI retains a bounded job timeout');

console.log('KoboForge workflow policy tests passed.');
