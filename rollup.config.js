export default {
  input: 'index.js',
  output: {
    file: 'index.cjs',
    format: 'cjs',
    exports: 'named',
    generatedCode: {
      constBindings: true,
    },
  },
  external: ['node:fs', 'node:url', 'node-libcurl'],
};
