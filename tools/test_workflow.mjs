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
    /run:\s*node --check js\/\*\.js && node --check tools\/\*\.mjs/,
    'CI syntax-checks every runtime and test module'
);
assert.match(workflow, /permissions:\s*\n\s+contents:\s*read\b/, 'CI retains read-only permissions');
assert.match(workflow, /timeout-minutes:\s*10\b/, 'CI retains a bounded job timeout');

console.log('KoboForge workflow policy tests passed.');
