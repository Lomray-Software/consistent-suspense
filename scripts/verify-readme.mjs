// Run from the temporary consumer with the packed build installed.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8');
const snippet = readme.split('## Analyze suspense html chunks (streaming)')[1].match(/```typescript jsx\n([\s\S]*?)```/)[1];
const ts = (await import(pathToFileURL(`${process.cwd()}/node_modules/typescript/lib/typescript.js`))).default;
const source = `import React from 'react';\n${snippet}`;
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.React } });
writeFileSync('readme-example.mjs', outputText);
writeFileSync('readme-probe.mjs', `
import assert from 'node:assert/strict';
import { Writable } from 'node:stream';
import React from 'react';
const chunks = [];
let done;
const finished = new Promise(resolve => { done = resolve; });
const res = new Writable({write(c, e, cb) { chunks.push(c.toString()); cb(); }});
res.on('finish', done);
let ready = false, resolve;
const promise = new Promise(r => { resolve = r; });
const { Suspense, ConsistentSuspenseProvider, useId } = await import('@lomray/consistent-suspense');
function Item() { const id = useId(); if (!ready) throw promise; return React.createElement('span', {id}, id); }
globalThis.App = () => React.createElement(ConsistentSuspenseProvider, null, React.createElement('main', null, React.createElement(Suspense, {fallback:'wait'}, React.createElement(Item))));
globalThis.anyStateManager = {getStateForSuspense() {return {toJSON() {return '{}';}};}};
globalThis.app = {use(path, handler) {handler({}, res, error => {throw error;}); setTimeout(() => {ready = true; resolve();}, 30);}};
await import('./readme-example.mjs');
await finished;
const output = chunks.join('');
const result = {shellEndsWithUndefined:chunks[0].endsWith('undefined'),duplicateSegmentCount:[...output.matchAll(/id="S:0"/g)].length,duplicateRevealCalls:[...output.matchAll(/\\$RC\\("B:0","S:0"\\)/g)].length,firstRevealBeforeState:output.indexOf('$RC("B:0"') < output.indexOf('var managerState')};
console.log(JSON.stringify(result));
assert.deepEqual(result, {shellEndsWithUndefined:false,duplicateSegmentCount:1,duplicateRevealCalls:1,firstRevealBeforeState:false});
console.log('README named import and response transform: PASS');
`);
const result = spawnSync(process.execPath, ['readme-probe.mjs'], { encoding: 'utf8' });
process.stdout.write(result.stdout + result.stderr);
assert.equal(result.status, 0);
