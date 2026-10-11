# CI readiness: ubuntu-latest → Ubuntu 26.04

## Context

GitHub is moving the `ubuntu-latest` label to Ubuntu 26.04, rolling out from
2026-10-19 and completing by 2026-11-19. See the
[runner image announcement](https://github.com/actions/runner-images/issues/14748).

## Probe on 2026-10-10 (SGT)

A temporary branch-only commit ran the ci.yml `test` job on the explicit
`ubuntu-26.04` label against main `f4ea067`, via PR #10. The image was
`ubuntu-26.04` version `20260927.149.1`, Ubuntu 26.04.1 LTS. See the
[Probe run](https://github.com/AlphaeusNg/KoboForge/actions/runs/38031719490).
The probe commit was reverted before review; the workflow on this branch
matches main.

| Step | What ran on 26.04 | Result |
| --- | --- | --- |
| checkout / setup-node | actions/checkout@v7, actions/setup-node@v7 Node 24 with npm cache | pass |
| Install locked dependencies | `npm ci --ignore-scripts` | pass |
| Test | full `npm test` (style rebuild diff, workflow/dependency policy, logic, fidelity, EPUB image and package tests) | pass |
| Set up Java | actions/setup-java@v5, Temurin 21.0.12+1 resolved from the image tool cache | pass |
| Restore EPUBCheck archive | actions/cache@v6 exact-key hit (`epubcheck-Linux-5.3.0-<sha256>`) | pass |
| Download EPUBCheck on cache miss | skipped (cache hit; key is per-OS, not per-distro, so the archive cached on 24.04 was reused) | not exercised |
| Verify and extract EPUBCheck | `sha256sum --check` OK, `unzip` | pass |
| Standards-check reflowable fixture | EPUBCheck 5.3.0 on Java 21: "Reflowable EPUB package passed EPUBCheck." | pass |
| Install Chromium | `npx playwright install --with-deps chromium` (Playwright 1.62.1): 9 new packages, 1 upgraded; Chrome for Testing 151.0.7922.34 | pass |
| Browser import/edit/export smoke | `npm run test:browser`: 33 passed | pass |
| JavaScript syntax | `node --check` over js/ and tools/ | pass |

## Decision and limits

No workflow change needed; the job stays on `ubuntu-latest`. The cache-miss
download is a plain `curl` of the pinned GitHub release and the downloaded
archive is still checksum-verified, so it is distro-independent. If a future
26.04 image update breaks the job, pin it to `ubuntu-24.04` with a dated
comment citing the failure and the announcement, and link this note.
