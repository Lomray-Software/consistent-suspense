// node scripts/verify-peers.mjs /absolute/path/to/packed-library.tgz
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const archive = resolve(process.argv[2]);
const cwd = mkdtempSync(join(tmpdir(), 'consistent-suspense-react17-'));
writeFileSync(join(cwd, 'package.json'), JSON.stringify({ name: 'react17-probe', private: true }));
const env = { ...process.env };
delete env.NO_COLOR;
const result = spawnSync('npm', ['install', '--ignore-scripts', archive, 'react@17.0.2', 'react-dom@17.0.2'], { cwd, env, encoding: 'utf8' });
assert.notEqual(result.status, 0, 'React 17 must be refused');
assert.match(result.stderr, /ERESOLVE/);
assert.match(result.stderr, /peer react@">=18\.0\.0"/);
console.log(result.stderr.split('\n').filter((line) => /ERESOLVE|peer react@|consistent-suspense@/.test(line)).join('\n'));
console.log(`React 17 peer install: refused (exit ${result.status}); PASS`);
