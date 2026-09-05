// Run in a temporary consumer with the packed package and TypeScript installed:
// node /path/to/checkout/scripts/verify-exports.mjs
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync } from 'node:fs';
import { join } from 'node:path';

for (const name of ['consumer.tsx', 'boundary.tsx', 'tsconfig.bundler.json', 'tsconfig.node16.json']) {
  cpSync(new URL(`./consumer/${name}`, import.meta.url), join(process.cwd(), name));
}
for (const mode of ['bundler', 'node16']) {
  const result = spawnSync(process.execPath, ['node_modules/typescript/bin/tsc', '--project', `tsconfig.${mode}.json`, '--noEmit'], { encoding: 'utf8' });
  process.stdout.write(result.stdout + result.stderr);
  assert.equal(result.status, 0, `${mode} declarations must resolve`);
  console.log(`${mode}: PASS (0 diagnostics)`);
}
const result = spawnSync(process.execPath, ['--input-type=module', '-e', `
  import assert from 'node:assert/strict';
  import { StreamSuspense } from '@lomray/consistent-suspense/server';
  import { SuspenseStore } from '@lomray/consistent-suspense';
  import { StreamSuspense as DeepStream } from '@lomray/consistent-suspense/server/index.js';
  import DeepStore from '@lomray/consistent-suspense/suspense-store.js';
  import { createRequire } from 'node:module';
  const require = createRequire(import.meta.url);
  assert.equal(StreamSuspense, DeepStream);
  assert.equal(SuspenseStore, DeepStore);
  assert.equal(require('@lomray/consistent-suspense/package.json').name, '@lomray/consistent-suspense');
  console.log('Node ESM root, /server, deep imports, /package.json: PASS');
`], { encoding: 'utf8' });
process.stdout.write(result.stdout + result.stderr);
assert.equal(result.status, 0, 'native ESM imports must resolve');
