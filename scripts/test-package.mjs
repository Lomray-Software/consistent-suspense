import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const temporary = mkdtempSync(path.join(tmpdir(), 'consistent-suspense-package-'));
const env = { ...process.env };

delete env.NO_COLOR;

/**
 * Resolve npm from the active invocation or the current Node installation.
 */
const npmCli =
  process.env.npm_execpath ??
  path.join(path.dirname(process.execPath), '../lib/node_modules/npm/bin/npm-cli.js');

/**
 * Run package checks with the current Node binary.
 */
const run = (args, cwd = temporary, capture = false) =>
  execFileSync(process.execPath, args, {
    cwd,
    env,
    encoding: 'utf8',
    stdio: capture ? ['ignore', 'pipe', 'inherit'] : 'inherit',
  });

try {
  const lib = path.join(root, 'lib');
  const { main, types, exports, peerDependencies } = JSON.parse(
    readFileSync(path.join(root, 'package.json'), 'utf8'),
  );

  run([npmCli, 'pkg', 'delete', 'scripts.prepare'], lib);

  const [packed] = JSON.parse(
    run([npmCli, 'pack', '--ignore-scripts', '--json', '--pack-destination', temporary], lib, true),
  );
  const archive = path.join(temporary, packed.filename);
  const files = new Set(packed.files.map(({ path: filename }) => filename));

  for (const file of [
    'index.js',
    'index.d.ts',
    'server/index.js',
    'server/index.d.ts',
    'suspense.js',
    'suspense.d.ts',
    'suspense-store.js',
    'suspense-store.d.ts',
    'server/stream-suspense.js',
    'server/stream-suspense.d.ts',
    'package.json',
    'README.md',
    'LICENSE',
  ]) {
    assert.ok(files.has(file), `Missing package file: ${file}`);
  }

  const lockfile = JSON.parse(readFileSync(path.join(root, 'package-lock.json'), 'utf8'));
  const dependencies = Object.fromEntries(
    ['react', 'react-dom', '@types/react', '@types/react-dom', 'typescript'].map((name) => [
      name,
      lockfile.packages[`node_modules/${name}`].version,
    ]),
  );
  const consumer = {
    name: 'consistent-suspense-consumer',
    private: true,
    type: 'module',
    dependencies,
  };

  writeFileSync(path.join(temporary, 'package.json'), JSON.stringify(consumer));

  /**
   * Keep consumer dependencies reproducible; npm prunes unrelated development packages.
   */
  writeFileSync(
    path.join(temporary, 'package-lock.json'),
    JSON.stringify({
      name: consumer.name,
      lockfileVersion: lockfile.lockfileVersion,
      requires: true,
      packages: { ...lockfile.packages, '': consumer },
    }),
  );
  run([npmCli, 'install', '--ignore-scripts', '--no-audit', '--no-fund', archive]);

  const installed = JSON.parse(
    readFileSync(
      path.join(temporary, 'node_modules/@lomray/consistent-suspense/package.json'),
      'utf8',
    ),
  );

  assert.deepEqual(
    [installed.main, installed.types, installed.exports, installed.peerDependencies],
    [main, types, exports, peerDependencies],
  );

  run([path.join(root, 'scripts/verify-exports.mjs')]);
  run([path.join(root, 'scripts/verify-readme.mjs')]);
  run([path.join(root, 'scripts/verify-peers.mjs'), archive]);
  console.info('[package] All checks passed.');
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
