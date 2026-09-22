import baseConfig from '@lomray/eslint-config';
import lomrayConfig from '@lomray/eslint-config-react';
import globals from 'globals';

const customFilesIgnores = {
  ...baseConfig.filesIgnores,
  files: [
    ...baseConfig.filesIgnores.files,
    '__tests__/**/*.{ts,tsx,*.ts,*tsx}',
    '__mocks__/**/*.{ts,tsx,*.ts,*tsx}',
    '__helpers__/**/*.{ts,tsx,*.ts,*tsx}',
  ],
};

export default [
  ...lomrayConfig.config(customFilesIgnores),
  {
    ...customFilesIgnores,
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.serviceworker,
        NodeJS: true,
        JSX: true,
      },
    },
    rules: {
      'unicorn/import-index': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      'no-await-in-loop': 'off',
      '@typescript-eslint/no-for-in-array': 'off',
      'unicorn/no-nested-ternary': 'off',
      'react/jsx-no-useless-fragment': ['error', { allowExpressions: true }],
      'prettier/prettier': ['error', { endOfLine: 'auto' }],
    },
  },
];
