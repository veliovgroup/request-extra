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

## Windows install time

`node-libcurl` 5.1.2 runs a `preinstall` script on Windows that clones vcpkg and builds libcurl from source before `node-pre-gyp` downloads the prebuilt binary. A cold install takes about 25 minutes and needs git plus Visual Studio build tools, even though the prebuilt binary is what ends up loaded. To reuse work across installs:

- Set `VCPKG_ROOT` to an existing vcpkg checkout with a bootstrapped `vcpkg.exe`.
- Set `NODE_LIBCURL_VCPKG_INSTALLED_ROOT` to a short, stable path and cache it. The repository CI does this keyed by `package-lock.json`.

macOS and Linux installs skip this step.

## Node.js 22.14 and older

`node-libcurl` 5.1.2 calls `tls.getCACertificates()` while loading, and that function first shipped in Node.js 22.15.0. On Node.js 22.14 and older the addon fails to load with:

```text
Error: Invalid argument
    at Object..node (node:internal/modules/cjs/loader)
```

`node-libcurl` declares `node >= 22.14`, so `npm install` does not warn. Upgrade to Node.js 22.15 or newer.

## Node.js 26

`node-libcurl` 5.1.2 ships a prebuilt binary for Node.js 26, but its libuv integration sometimes fails to wake the event loop. A transfer then finishes only when libcurl's fallback timer fires about one second later. Transfers to a remote server, or to a server in another process, run at normal speed. Two cases are affected on Node.js 26.10.0:

- A server in the same process as the client. After the first transfer, each request that reuses the keep-alive connection takes about 1000 ms instead of about 1 ms. Setting `curlOptions: { FORBID_REUSE: true }` avoids the delay.
- File-descriptor uploads (`upload: fd`). The upload stalls until `timeout`, then `node-libcurl` throws an uncaught `Curl handle is closed` error from its `end` handler. No workaround is known.

Any other timer or I/O activity in the process hides both problems, because it keeps the event loop waking up. The test suite sets `FORBID_REUSE` on Node.js 26 (`test/helpers/node26.js`) and skips the file-descriptor upload test there. Do not use `upload` on Node.js 26.

## Bun

Bun 1.3.14 crashes when `node-libcurl` calls unsupported `uv_timer_init`; Bun 1.4.0 fails while loading addon. Runtime support remains blocked by [Bun libuv issue #18546](https://github.com/oven-sh/bun/issues/18546). `npm run test:bun` is compatibility probe and intentionally remains outside default test command.
