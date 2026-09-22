import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import Ajv from 'ajv';

const root = new URL('../', import.meta.url);
const config = JSON.parse(await readFile(new URL('context7.json', root), 'utf8'));
const schemaResponse = await fetch('https://context7.com/schema/context7.json');
assert.equal(schemaResponse.status, 200);
const schema = await schemaResponse.json();
const ajv = new Ajv({ strict: false, formats: { uri: true } });
const validate = ajv.compile(schema);
assert.ok(validate(config), JSON.stringify(validate.errors));
assert.equal(config.branch, 'prod');
assert.ok(config.excludeFolders.includes('docs-tests'));
async function runExample(output) {
  const React = await import('react');
  const { renderToString } = await import('react-dom/server');
  const { App } = await import(output.href);
  const first = renderToString(React.createElement(App));
  const second = renderToString(React.createElement(App));
  assert.equal(first, second, 'Fresh provider renders should have matching IDs');
  const label = first.match(/for="([^"]+)"/);
  const input = first.match(/<input id="([^"]+)"/);
  assert.ok(label && input);
  assert.equal(label[1], input[1]);
}

const require = createRequire(import.meta.url);
const { build } = await import('esbuild');
const dir = new URL('.generated/', import.meta.url);
await mkdir(dir, { recursive: true });
try {
  const readme = await readFile(new URL('README.md', root), 'utf8');
  const matches = [...readme.matchAll(/<!-- docs-test:example -->\s*```(?:typescript|tsx)\n([\s\S]*?)```/g)];
  assert.equal(matches.length, 1, 'Expected exactly one marked README example');
  const input = new URL('example.tsx', dir);
  await writeFile(input, matches[0][1]);
  const tsc = require.resolve('typescript/bin/tsc');
  execFileSync(process.execPath, [tsc, '--noEmit', '--strict', '--skipLibCheck', '--target', 'ES2022', '--module', 'ESNext', '--moduleResolution', 'bundler', '--jsx', 'react-jsx', '--esModuleInterop', fileURLToPath(input)], { stdio: 'inherit' });
  const output = new URL('example.mjs', dir);
  await build({ entryPoints: [fileURLToPath(input)], outfile: fileURLToPath(output), bundle: true, platform: 'node', format: 'esm', packages: 'external', jsx: 'automatic', logLevel: 'silent' });
  await runExample(output);
  const streamBlock = readme.split('## Analyze suspense html chunks (streaming)')[1].match(/```typescript jsx\n([\s\S]*?)```/)[1];
  const streamInput = new URL('stream.tsx', dir);
  const streamHeader = `import React from 'react';
import { PassThrough } from 'node:stream';
import { App } from './example.js';
export const response = new PassThrough();
export const finished = new Promise<string>((resolve, reject) => {
  let html = '';
  response.on('data', (chunk) => { html += chunk.toString(); });
  response.on('end', () => resolve(html));
  response.on('error', reject);
});
const app = {
  use(_path: string, handler: (req: unknown, res: PassThrough, next: (error: unknown) => void) => void) {
    handler({}, response, (error) => response.destroy(error instanceof Error ? error : new Error(String(error))));
  },
};
`;
  await writeFile(streamInput, streamHeader + streamBlock);
  execFileSync(process.execPath, [tsc, '--noEmit', '--strict', '--skipLibCheck', '--target', 'ES2022', '--module', 'ESNext', '--moduleResolution', 'bundler', '--jsx', 'react-jsx', '--esModuleInterop', fileURLToPath(streamInput)], { stdio: 'inherit' });
  const streamOutput = new URL('stream.mjs', dir);
  await build({ entryPoints: [fileURLToPath(streamInput)], outfile: fileURLToPath(streamOutput), bundle: true, platform: 'node', format: 'esm', packages: 'external', jsx: 'automatic', logLevel: 'silent' });
  const { finished } = await import(streamOutput.href);
  const html = await finished;
  assert.match(html, /<label/);
  assert.match(html, /<input/);
  console.log('PASS: Context7 schema, README semantic typechecks, released-package render and streaming wiring');
} finally {
  await rm(dir, { recursive: true, force: true });
}
