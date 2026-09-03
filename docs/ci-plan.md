# Deferred CI Plan

No workflow is added yet.

## Required pull-request checks

1. Run `npm ci`, `npm test`, `npm audit`, and `npm pack --dry-run` on Ubuntu with Node.js 22.14, latest 24 LTS, and latest 26 Current.
2. Run native install and local-request smoke tests on macOS and Windows with latest Node.js 24 LTS.
3. Split deterministic local tests from external `httpbin` and `badssl.com` tests. Keep local suite required; run external suite on schedule and manual dispatch to reduce unrelated pull-request failures.

## Bun compatibility gate

Run `npm run test:bun` with latest stable Bun as informational `continue-on-error` job. Optionally probe Bun canary on schedule. Make job required and add `engines.bun` only after native addon loads and local request test passes.

## Maintenance

Use dependency update automation for production and development dependencies. Require full Node matrix for `node-libcurl` updates because native binary availability varies by Node ABI and platform.

Root override pins `brace-expansion@2` to patched 2.1.4 for repository installs. Published npm overrides do not control consumer dependency trees. Remove override after `node-libcurl` updates its install-time `rimraf` dependency; until then, consumer applications can apply same root override.
