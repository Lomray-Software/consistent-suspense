import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import terser from '@rollup/plugin-terser';
import typescript from '@rollup/plugin-typescript';
import peerDepsExternal from 'rollup-plugin-peer-deps-external';
import copy from 'rollup-plugin-copy';

const dest = 'lib';

/**
 * Declarations keep extensionless relative imports, which Node16/NodeNext resolution rejects.
 */
const resolveDeclarationImports = () => ({
  name: 'resolve-declaration-imports',
  writeBundle() {
    const files = readdirSync(dest, { recursive: true, encoding: 'utf8' })
      .filter((file) => file.endsWith('.d.ts'))
      .map((file) => path.join(dest, file));

    for (const file of files) {
      const source = readFileSync(file, 'utf8');
      const resolved = source.replace(
        /(from\s+|import\()(['"])(\.{1,2}\/[^'"]*)\2/g,
        (match, keyword, quote, specifier) => {
          if (specifier.endsWith('.js')) {
            return match;
          }

          const target = path.join(path.dirname(file), specifier);
          const suffix = existsSync(`${target}.d.ts`) ? '.js' : '/index.js';

          return `${keyword}${quote}${specifier}${suffix}${quote}`;
        },
      );

      if (resolved !== source) {
        writeFileSync(file, resolved);
      }
    }
  },
});

export default {
  input: ['src/index.ts', 'src/server/index.ts'],
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
    typescript({ tsconfig: './tsconfig.build.json' }),
    terser(),
    copy({
      targets: [
        { src: 'package.json', dest: dest },
        { src: 'README.md', dest: dest },
        { src: 'LICENSE', dest: dest },
      ],
    }),
    resolveDeclarationImports(),
  ],
};
