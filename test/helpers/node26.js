import request from '../../index.js';

// On Node.js 26, node-libcurl misses readiness on a reused keep-alive connection
// when the server runs in the same process, so each transfer waits for libcurl's
// ~1 s fallback timeout. Tests use in-process servers; disable reuse there only.
// See docs/platform-notes.md.
export const isNode26 = Number(process.versions.node.split('.')[0]) >= 26;

if (isNode26) {
  request.defaultOptions.curlOptions = { ...request.defaultOptions.curlOptions, FORBID_REUSE: true };
}
