import { createRequire } from 'node:module';
import terser from '@rollup/plugin-terser';
import peerDepsExternal from 'rollup-plugin-peer-deps-external';
import copy from 'rollup-plugin-copy';

// The plugin's ESM dependency uses JSON import assertions removed in Node 22.
// Its public CommonJS entry loads the same compiler without that syntax.
const typescript = createRequire(import.meta.url)('rollup-plugin-ts');

const dest = 'lib';

export default {
  input: [
    'src/index.ts',
    'src/server/index.ts',
  ],
  output: {
    dir: dest,
    format: 'es',
    sourcemap: true,
    preserveModules: true,
    preserveModulesRoot: 'src',
    exports: 'auto',
  },
  external: [],
  plugins: [
    peerDepsExternal({
      includeDependencies: true,
    }),
    typescript({
      tsconfig: resolvedConfig => ({
        ...resolvedConfig,
        declaration: true,
        importHelpers: true,
      }),
    }),
    terser(),
    copy({
      targets: [
        { src: 'package.json', dest: dest },
        { src: 'README.md', dest: dest },
        { src: 'LICENSE', dest: dest },
      ]
    })
  ],
};
