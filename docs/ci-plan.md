# CI checks

## Required pull-request checks

1. Ubuntu runs lint, tests, build, production audit, package lint, packed consumer checks, and package dry-run on Node.js 22.15, latest 24 LTS, and latest 26 Current. The Node.js 26 job is `continue-on-error` while `node-libcurl` delays every transfer by about one second on that runtime (see `platform-notes.md`).
2. macOS, Windows, and a `node:24-alpine` container run native install and local-request smoke tests on latest Node.js 24 LTS. The Alpine job verifies the musl prebuilt binary.
3. Deterministic local tests remain required. External `httpbin` and `badssl.com` tests run weekly and by manual dispatch to avoid unrelated pull-request failures.

## Bun compatibility gate

CI runs `npm run test:bun` with latest stable Bun as an informational `continue-on-error` job. Make job required and add `engines.bun` only after native addon loads and local request test passes.

## Maintenance

Use dependency update automation for production and development dependencies. Require full Node matrix for `node-libcurl` updates because native binary availability varies by Node ABI and platform.

Root overrides pin `brace-expansion@2`, `brace-expansion@5`, and `undici@6` to patched versions for repository installs. Published npm overrides do not control consumer dependency trees. `brace-expansion@2` and `undici@6` come from `node-libcurl` install-time dependencies (`rimraf`, `node-gyp`); remove those overrides after `node-libcurl` updates them. Until then, consumer applications can apply the same root overrides.

Production audit fails only on `critical` advisories because install-time tooling inside `node-libcurl` regularly picks up `high` advisories that do not affect runtime code. Dependabot alerts still surface every advisory.
