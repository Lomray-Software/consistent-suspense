import typescript from 'rollup-plugin-ts';
import json from '@rollup/plugin-json';
import terser from '@rollup/plugin-terser';
import peerDepsExternal from 'rollup-plugin-peer-deps-external';
import { folderInput } from 'rollup-plugin-folder-input';
import copy from 'rollup-plugin-copy';

export default {
  input: [
    'src/index.ts',
    'src/server/stream-stores.ts',
  ],
  output: {
    dir: 'lib',
    format: 'cjs',
    sourcemap: true,
    preserveModules: true,
    preserveModulesRoot: 'src',
    exports: 'auto',
  },
  external: ['axios', 'lodash'],
  plugins: [
    folderInput(),
    typescript({
      transpiler: {
        typescriptSyntax: 'typescript',
        otherSyntax: 'babel'
      },
      babelConfig: {
        presets: [
          '@babel/preset-env',
          '@babel/preset-react'
        ],
        plugins: [
          ['@babel/plugin-proposal-class-properties'],
          ['@babel/plugin-transform-runtime', {
            "absoluteRuntime": false,
          }],
        ],
      },
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
    peerDepsExternal({
      includeDependencies: true,
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
