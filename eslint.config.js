// eslint.config.js (monorepo root)
import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import importPlugin from 'eslint-plugin-import'
import security from 'eslint-plugin-security'
import noSecrets from 'eslint-plugin-no-secrets'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'

export default tseslint.config(
  // Base JS rules
  js.configs.recommended,

  // TypeScript rules — applied to all workspaces
  ...tseslint.configs.recommendedTypeChecked,

  // Parser options for type-checked rules
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          // Allow files that live outside tsconfig include paths (config/scripts)
          allowDefaultProject: [
            '*.js',
            'api/prisma/*.ts',
            'api/prisma.config.ts',
            'client/vite.config.ts',
          ],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  // Import plugin — extensionAlias maps .js imports to .ts source files (ESM convention)
  {
    plugins: { import: importPlugin },
    rules: {
      'import/no-duplicates': 'error',
      'import/order': ['error', { 'newlines-between': 'always' }],
    },
    settings: {
      'import/resolver': {
        typescript: {
          project: ['api/tsconfig.json', 'client/tsconfig.json', 'shared/tsconfig.json'],
          extensionAlias: { '.js': ['.ts', '.js'] },
        },
      },
    },
  },

  // Security rules — api and shared only (not client)
  {
    files: ['api/**/*.ts', 'shared/**/*.ts'],
    plugins: { security, 'no-secrets': noSecrets },
    rules: {
      ...security.configs.recommended.rules,
      // Disabled: fires on every obj[key] access; Prisma result-row iteration triggers this constantly
      'security/detect-object-injection': 'off',
      'no-secrets/no-secrets': ['error', { tolerance: 4.2 }],
    },
  },

  // React rules — client only
  {
    files: ['client/**/*.{ts,tsx}'],
    plugins: { react, 'react-hooks': reactHooks },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off', // Not needed with React 17+ JSX transform
    },
    settings: {
      react: { version: 'detect' },
    },
  },

  // Exempt script/config files outside src/ from unsafe-* rules —
  // they run under allowDefaultProject where full type resolution isn't guaranteed
  {
    files: ['api/prisma/**/*.ts', 'api/prisma.config.ts', 'client/vite.config.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
    },
  },

  // Ignored paths
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      // ESLint config files — not application source, no value linting them through themselves
      'eslint.config.js',
      'eslint.config.staged.js',
    ],
  },
)
