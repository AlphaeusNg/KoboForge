# Dependabot #24 — sprintf-js precision-specifier DoS

Triage of [Dependabot alert #24](https://github.com/AlphaeusNg/KoboForge/security/dependabot/24), verified against KoboForge `main` at [`6bd65bf`](https://github.com/AlphaeusNg/KoboForge/commit/6bd65bf) (15 Oct 2026). This note documents why the alert stays open; it does not close or dismiss the alert.

## 1. What the advisory is

[GHSA-hp3w-g68c-fv3c](https://github.com/advisories/GHSA-hp3w-g68c-fv3c) / [CVE-2026-97058](https://github.com/advisories/GHSA-hp3w-g68c-fv3c): medium-severity denial of service in `sprintf-js` via unbounded precision specifiers. Vulnerable range is `<= 1.1.3`. There is no patched release; npm latest `sprintf-js@1.1.3` is still affected.

## 2. Where it is locked

`package-lock.json` chain (all `"dev": true`; Dependabot scope **development**):

`mammoth@1.12.0` (devDependency, pinned in `package.json`) → `argparse@1.0.10` → `sprintf-js@1.0.3`.

Mammoth is used by `tools/test_document_fidelity.mjs` (Node tests). The Playwright suite injects the locked `node_modules/mammoth/mammoth.browser.min.js`.

## 3. Does anything ship in the built site

No. GitHub Pages serves `main` from the repository root with no build step; `node_modules` is not committed. The live site loads Mammoth at runtime from `https://unpkg.com/mammoth@1.12.0/mammoth.browser.min.js` (`js/runtime-dependencies.js`). Nothing is vendored.

`argparse` is required only by `node_modules/mammoth/bin/mammoth` (the CLI). `mammoth.browser.min.js` contains no `argparse` or `sprintf-js` code, so `sprintf-js` never reaches visitors.

## 4. Why there is no upgrade path yet

Latest `mammoth@1.13.0` still declares `argparse@~1.0.3`, so a Mammoth bump does not drop `sprintf-js`. `argparse` 2.x (latest `3.0.2`) has no `sprintf-js` but changed API (`addArgument` → `add_argument`). An npm override of `argparse` to 2.x would drop `sprintf-js` and would break only Mammoth's CLI, which KoboForge never runs. That override is an optional cleanup, not a security need, and is not applied in this PR.

## 5. When to re-check

Re-check when Mammoth moves to `argparse` 2+, when `sprintf-js` publishes a patched release, or on Mammoth bumps. Then refresh the lock and confirm the alert auto-closes.
