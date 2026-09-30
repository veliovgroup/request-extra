# Platform notes

`request-libcurl` itself has no build step during consumer installation. It uses `node-libcurl`, a native addon with prebuilt binaries for supported Node.js ABI, OS, and CPU combinations.

## Fast-path install

`node-libcurl` publishes prebuilt binaries for latest two active Node.js LTS releases and Current on:

- Linux x64, ARM64, and Alpine/musl x64
- macOS Intel and Apple silicon
- Windows x64

On these targets, regular install downloads binary instead of compiling:

```shell
npm install request-libcurl
```

Keep Node.js within package `engines` range, allow package install scripts, and allow downloads from GitHub Releases. CI can cache npm download cache, but should not cache `node_modules` across Node ABI, OS, architecture, or libc combinations.

Vendoring another set of native binaries in `request-libcurl` is not recommended. It would duplicate `node-libcurl` release matrix, increase package size, and require independent security and ABI maintenance. Better long-term improvement belongs upstream: platform-specific optional packages or broader Node-API support in `node-libcurl`.

## Node ABI mismatch

Error examples:

```text
This module was compiled against a different Node.js version
Cannot find module '../lib/binding/node_libcurl.node'
```

Fix:

```shell
npm rebuild node-libcurl
```

If no prebuilt binary exists for current Node.js version, use a supported Node.js LTS release or build locally:

```shell
npm install request-libcurl --build-from-source
```

## Build from source

Local builds require C/C++ build tools, Python, and `node-gyp` prerequisites for target OS.

```shell
npm install request-libcurl --build-from-source --curl_static_build=true
```

Use this only when prebuilt binaries are unavailable or system libcurl features must be customized.

## Missing system libraries

Errors may include:

```text
Library not loaded
image not found
```

Install missing libcurl dependency through target platform package manager, then rebuild.

macOS example:

```shell
brew install zstd
npm rebuild node-libcurl
```

Debian/Ubuntu example:

```shell
apt-get update
apt-get install zstd
npm rebuild node-libcurl
```

CentOS/RHEL example:

```shell
yum install zstd
npm rebuild node-libcurl
```

After any native rebuild, run package tests in target environment.

## Node.js 26

`node-libcurl` 5.1.2 ships a prebuilt binary for Node.js 26, but every transfer waits about one second before completing. A raw `curly.get()` to a local server takes 5 ms on Node.js 24 and about 1000 ms on Node.js 26.10.0, so the delay is in the addon's event-loop integration, not in `request-libcurl`. Retry timing tests fail on Node.js 26 for this reason. CI keeps the Node.js 26 job informational until upstream resolves it. Use Node.js 22 or 24 in production.

## Bun

Bun 1.3.14 crashes when `node-libcurl` calls unsupported `uv_timer_init`; Bun 1.4.0 fails while loading addon. Runtime support remains blocked by [Bun libuv issue #18546](https://github.com/oven-sh/bun/issues/18546). `npm run test:bun` is compatibility probe and intentionally remains outside default test command.
