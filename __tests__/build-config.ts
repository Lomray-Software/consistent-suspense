import { execFileSync } from 'node:child_process';
import { expect, it } from 'vitest';

it('loads the build configuration in native Node without import assertion syntax', () => {
  const output = execFileSync(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      'const { default: config } = await import("./rollup.config.js"); console.log(config.plugins.map(plugin => plugin.name).join(","));',
    ],
    { encoding: 'utf8' },
  );

  expect(output).toContain('Typescript');
});
