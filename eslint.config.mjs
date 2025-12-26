import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
    {
        languageOptions: {
            parserOptions: {
                project: './tsconfig.json',
                tsconfigRootDir: import.meta.dirname,
            },
        },
        rules: {
            '@typescript-eslint/no-explicit-any': 'off', // Allowing any for now since it's used in handlers
            '@typescript-eslint/no-unused-vars': ['warn', { 
                argsIgnorePattern: '^_', 
                varsIgnorePattern: '^_',
                destructuredArrayIgnorePattern: '^_'
            }],
        },
    },
    {
        files: ['src/test/**/*.ts'],
        rules: {
            '@typescript-eslint/no-unused-expressions': 'off',
        }
    },
    {
        ignores: ['build/**', 'node_modules/**', 'eslint.config.mjs'],
    }
);
