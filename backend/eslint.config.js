import js from "@eslint/js";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import prettier from "eslint-config-prettier";
import globals from "globals";

/** @type {import('eslint').Linter.Config[]} */
export default [
    { ignores: ['dist/**', 'node_modules/**', 'jest.config.json', '__tests__/**'] },

    js.configs.recommended,

    {
        files: ['src/**/*.ts'],
        languageOptions: {
            parser: tsParser,
            parserOptions: {
                ecmaVersion: 2020,
                sourceType: 'module',
                project: './tsconfig.json',
            },
            globals: { ...globals.node },
        },
        plugins: { '@typescript-eslint': tsPlugin },
        rules: {
            ...tsPlugin.configs['recommended'].rules,
            ...tsPlugin.configs['recommended-requiring-type-checking'].rules,

            '@typescript-eslint/no-explicit-any': 'error',
            '@typescript-eslint/explicit-function-return-type': 'warn',
            '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
            '@typescript-eslint/no-floating-promises': 'error',
            '@typescript-eslint/await-thenable': 'error',
            '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],

            'no-console': ['warn', { allow: ['log', 'error', 'warn'] }],
            'eqeqeq': ['error', 'always'],
            'curly': ['error', 'all'],
            'prefer-const': 'error',
            'no-var': 'error',
        },
    },

    prettier,
];
