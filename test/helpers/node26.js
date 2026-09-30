import request from '../../index.js';

// On Node.js 26, node-libcurl delivers a finished transfer only when another JS
// callback runs. With an in-process server and a reused connection, each request
// then waits about 1 s. Tests use in-process servers; disable reuse there only.
// See docs/platform-notes.md and JCMais/node-libcurl#454.
export const isNode26 = Number(process.versions.node.split('.')[0]) >= 26;

if (isNode26) {
  request.defaultOptions.curlOptions = { ...request.defaultOptions.curlOptions, FORBID_REUSE: true };
}
