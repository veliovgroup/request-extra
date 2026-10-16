# Repository guide

`request-libcurl` (`request-extra` repository) is a callback/Promise wrapper around `node-libcurl`. Node.js >=22.15; use Node 22/24 in production. Node 26 and Bun limitations: `docs/platform-notes.md`.

## Commands

```shell
npm test                 # required: deterministic runtime tests + declarations
npm run test:external    # legacy suite with httpbin/badssl; requires network
npm run test:types       # Node ESM, Node CJS, and bundler resolution
npm run test:package     # packed consumers + attw
npm run test:coverage    # c8; writes coverage/lcov.info
npm run test:bun         # informational compatibility probe; currently unsupported
npm run lint
npm run lint:package     # publint
npm run build            # index.js -> index.cjs
```

Single test: `npx cross-env SKIP_EXTERNAL=true mocha ./test/npm.js ./test/local.js -g "pattern"`.

## Files and invariants

- `index.js` is the only runtime source. After changes, build and commit `index.cjs` too. CI rebuilds but does not commit generated changes or enforce a clean diff.
- Keep `index.d.ts` and `index.d.cts` identical; extensions select ESM/CJS semantics. Verify both through `test/package-consumer/`.
- Tarball contains only `index.js`, `index.cjs`, both declarations, `package.json`, `README.md`, and `LICENSE`. `test/packed-package.mjs` asserts this list.
- Add deterministic behavior tests to `test/local.js`, using `test/helpers/local-server.js`. Use `test/fixtures/` child processes for crashes and timer leaks. External cases in `test/npm.js` are skipped by `test:local`.
- Keep README compact; API details, examples, migration, and platform notes belong in `docs/`.

## Runtime safeguards

- `normalizeOptions()` validates before transfer; `validateCurlConfiguration()` preflights native options. Native setup failures must close handles, clear timers, and settle once.
- `sendRequest()` owns one attempt and writable backpressure. `LibCurlRequest` owns retry, timeout, and cancellation state. Preserve writable error handlers through asynchronous teardown.
- `retries` counts additional attempts. Never retry descriptor uploads, writable destinations, or streaming callbacks; their data cannot be replayed safely. Keep serialized bytes and content type stable across retries.
- Allow synchronous streaming registration; reject registration after native setup starts. Promise mode defers only for explicit `wait: true`, regardless of global defaults.
- Bound individual timer delays and split oversized overall deadlines. Abort must clear retry, attempt, and overall timers.
- User callbacks may run inside native data/header callbacks, where libcurl rejects handle changes; ticks and microtasks still run there. Start `perform()` from `setImmediate()`. Close handles torn down mid-transfer with `closeCurlDeferred()`; it overrides the instance's node-libcurl `onEnd`/`onError` so a late queued settlement cannot touch the closed handle. Re-check this on `node-libcurl` updates.
- Copy reusable errors before exposing them. Native error 52 maps to 503; 47 (too many redirects) maps to 429; selected TLS errors map to 526; other native errors map to 408. See `docs/retries-and-errors.md`.
- TLS verification defaults remain `false` for compatibility. Do not change without a major-version decision.

## Contribution and release

- Commit headers: one emoji followed by `type: scope / title`.
- Require the native CI matrix for `node-libcurl` updates; details in `docs/ci-plan.md`. Root npm overrides do not protect consumer dependency trees.
- Releases are manual: update version/changelog, tag, publish from a local checkout. `prepack` builds the CommonJS output.
- `docs/superpowers/` and `.superpowers/` contain ignored working notes; never reference them from tracked files except ignore configs.
