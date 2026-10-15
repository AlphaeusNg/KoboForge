# Dependabot #24 — sprintf-js precision-specifier DoS

**Status: RESOLVED — 15 Oct 2026.** A Mammoth-scoped npm override in `package.json` (`"overrides": {"mammoth": {"argparse": "^2.0.1"}}`) moves `argparse` to 2.0.1, which has no dependencies, so `sprintf-js` is no longer in `package-lock.json`. The alert should auto-close once this merges to `main`.

Original triage of [Dependabot alert #24](https://github.com/AlphaeusNg/KoboForge/security/dependabot/24), verified against KoboForge `main` at [`6bd65bf`](https://github.com/AlphaeusNg/KoboForge/commit/6bd65bf) (15 Oct 2026), is retained below with the resolution. This note does not manually close or dismiss the GitHub alert.

## 1. What the advisory is

[GHSA-hp3w-g68c-fv3c](https://github.com/advisories/GHSA-hp3w-g68c-fv3c) / [CVE-2026-97058](https://github.com/advisories/GHSA-hp3w-g68c-fv3c): medium-severity denial of service in `sprintf-js` via unbounded precision specifiers. Vulnerable range is `<= 1.1.3`. There is no patched release; npm latest `sprintf-js@1.1.3` is still affected.

## 2. Where it was locked

Original `package-lock.json` chain (all `"dev": true`; Dependabot scope **development**):

`mammoth@1.12.0` (devDependency, pinned in `package.json`) → `argparse@1.0.10` → `sprintf-js@1.0.3`.

Mammoth is used by `tools/test_document_fidelity.mjs` (Node tests). The Playwright suite injects the locked `node_modules/mammoth/mammoth.browser.min.js`.

## 3. Does anything ship in the built site

No. GitHub Pages serves `main` from the repository root with no build step; `node_modules` is not committed. The live site loads Mammoth at runtime from `https://unpkg.com/mammoth@1.12.0/mammoth.browser.min.js` (`js/runtime-dependencies.js`). Nothing is vendored.

`argparse` is required only by `node_modules/mammoth/bin/mammoth` (the CLI). `mammoth.browser.min.js` contains no `argparse` or `sprintf-js` code, so `sprintf-js` never reaches visitors.

## 4. Why there is no upgrade path yet

Latest `mammoth@1.13.0` still declares `argparse@~1.0.3`, so a Mammoth bump does not drop `sprintf-js`. `argparse` 2.x has no `sprintf-js` but changed API (`addArgument` → `add_argument`). The applied override drops `sprintf-js` and would break Mammoth's CLI (`bin/mammoth`), which KoboForge never runs: KoboForge uses only the library API and browser bundle. This override was applied on 15 Oct 2026 to resolve the locked dependency alert.

## 5. Verification (15 Oct 2026)

After regenerating the lockfile and a clean `npm ci`:

```
$ npm ls sprintf-js
koboforge@
└── (empty)

$ npm ls argparse
koboforge@
└─┬ mammoth@1.12.0 overridden
  └── argparse@2.0.1 overridden
```

`grep -c sprintf-js package-lock.json` → `0`. `npm test` and `npm run test:browser` pass.

**Caveat:** Mammoth's CLI (`node_modules/mammoth/bin/mammoth`) uses the argparse 1.x API and would break under this override. Nothing in KoboForge (package.json scripts, `tools/`, workflows, docs) invokes it; only `mammoth.convertToHtml` (Node tests) and `mammoth.browser.min.js` are used. Remove the override once Mammoth itself depends on argparse 2+.

## 6. When to re-check

On each Mammoth bump, check whether it now depends on `argparse` 2+; if so, drop the override. Confirm the alert auto-closed after merge.
