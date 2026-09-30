import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fixture = join(root, 'test', 'package-consumer');
const temporaryDirectory = mkdtempSync(join(tmpdir(), 'request-libcurl-packed-'));
const consumer = join(temporaryDirectory, 'consumer');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const tsc = join(root, 'node_modules', 'typescript', 'bin', 'tsc');
const npmCache = process.env.npm_config_cache
  || process.env.NPM_CONFIG_CACHE
  || join(temporaryDirectory, 'npm-cache');
const commandOptions = {
  env: { ...process.env, npm_config_cache: npmCache },
  stdio: 'inherit'
};

const run = (command, args, cwd = consumer) => {
  execFileSync(command, args, { ...commandOptions, cwd });
};

try {
  const packed = JSON.parse(execFileSync(npm, [
    'pack',
    '--silent',
    '--json',
    '--pack-destination',
    temporaryDirectory
  ], { ...commandOptions, cwd: root, encoding: 'utf8', stdio: ['inherit', 'pipe', 'inherit'] }));
  const packageFiles = packed[0].files.map(({ path }) => path).sort();
  assert.deepEqual(packageFiles, [
    'LICENSE',
    'README.md',
    'index.cjs',
    'index.d.cts',
    'index.d.ts',
    'index.js',
    'package.json'
  ]);

  cpSync(fixture, consumer, { recursive: true });
  const tarball = join(temporaryDirectory, packed[0].filename);
  run(npm, ['install', '--no-audit', '--no-fund', tarball]);

  run(process.execPath, ['runtime-esm.mjs']);
  run(process.execPath, ['runtime-cjs.cjs']);
  for (const config of ['tsconfig.node.json', 'tsconfig.node-cjs.json', 'tsconfig.bun.json']) {
    run(process.execPath, [tsc, '-p', config, '--noEmit']);
  }

  const installedPackage = JSON.parse(readFileSync(
    join(consumer, 'node_modules', 'request-libcurl', 'package.json'),
    'utf8'
  ));
  const sourcePackage = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  assert.equal(installedPackage.version, sourcePackage.version);
} finally {
  rmSync(temporaryDirectory, { recursive: true, force: true });
}
