import typescript from 'rollup-plugin-ts';
import json from '@rollup/plugin-json';
import terser from '@rollup/plugin-terser';
import peerDepsExternal from 'rollup-plugin-peer-deps-external';
import { folderInput } from 'rollup-plugin-folder-input';
import copy from 'rollup-plugin-copy';

export default {
  input: [
    'src/index.ts',
    'src/server/index.ts',
  ],
  output: {
    dir: 'lib',
    format: 'es',
    sourcemap: true,
    preserveModules: true,
    preserveModulesRoot: 'src',
    exports: 'auto',
  },
  external: [],
  plugins: [
    folderInput(),
    peerDepsExternal({
      includeDependencies: true,
    }),
    typescript({
      tsconfig: resolvedConfig => ({
        ...resolvedConfig,
        declaration: true,
        importHelpers: true,
        plugins: [
          {
            "transform": "@zerollup/ts-transform-paths",
            "exclude": ["*"]
          }
        ]
      }),
    }),
    json(),
    terser(),
    copy({
      targets: [
        { src: 'package.json', dest: 'lib' },
      ]
    })
  ],
};
