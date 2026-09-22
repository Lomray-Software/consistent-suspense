import lomrayConfig from '@lomray/eslint-config-react';
import globals from 'globals';

export default [
  { ignores: ['node_modules/**', 'lib/**', 'coverage/**'] },
  ...lomrayConfig.config({
    files: ['src/**/*.{ts,tsx}', '__tests__/**/*.{ts,tsx}', '__helpers__/**/*.{ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.serviceworker,
        NodeJS: true,
        JSX: true,
      },
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    settings: {
      'import-x/resolver': { typescript: { project: './tsconfig.json' } },
    },
    rules: {
      '@typescript-eslint/ban-ts-comment': 'off',
      'no-await-in-loop': 'off',
      '@typescript-eslint/no-for-in-array': 'off',
      'unicorn/no-nested-ternary': 'off',
      '@eslint-react/jsx-no-useless-fragment': ['error', { allowExpressions: true }],
      'prettier/prettier': ['error', { endOfLine: 'auto' }],
    },
  }),
  {
    files: ['__tests__/**/*.{ts,tsx}', '__helpers__/**/*.{ts,tsx}'],
    rules: {
      'sonarjs/no-duplicate-string': 'off',
      // Vitest convention directories are wrapped in double underscores.
      'unicorn/filename-case': 'off',
    },
  },
];
