import { defineConfig } from 'eslint/config';
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import typeormTypescript from 'eslint-plugin-typeorm-typescript';
import typescriptEslint from '@typescript-eslint/eslint-plugin';
import customRules from 'eslint-plugin-custom-rules';

export default defineConfig([
  { ignores: ['/dist', '/node_modules', 'eslint.config.mjs'] },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },

      sourceType: 'module',

      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      '@typescript-eslint': typescriptEslint,
      'typeorm-typescript': typeormTypescript,
      'custom-rules': customRules,
    },
    rules: {
      // TypeScript Rules
      '@typescript-eslint/no-require-imports': 'warn',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/interface-name-prefix': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/no-unused-vars': 'warn',
      'no-console': 'error',

      'prettier/prettier': [
        'error',
        {
          endOfLine: 'auto',
        },
      ],
      // Custom Rules
      'custom-rules/typeorm/no-column-name': 'error',
      'custom-rules/enforce-foo-bar': 'error',
      'custom-rules/typeorm/no-join-column-name': 'error',

      // typeorm rules
      'typeorm-typescript/enforce-column-types': ['error', { driver: 'mysql' }],
      'typeorm-typescript/enforce-relation-types': [
        'error',
        { specifyRelation: 'always' },
      ],
      'typeorm-typescript/enforce-consistent-nullability': [
        'error',
        { specifyNullable: 'non-default' },
      ],

      // SonarJS rules
      // 'sonarjs/cognitive-complexity': 'error',
      // 'sonarjs/no-duplicate-string': 'error',
    },
  },
]);
