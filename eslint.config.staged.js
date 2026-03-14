// eslint.config.staged.js — used by lint-staged only
import baseConfig from './eslint.config.js'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  ...baseConfig,
  {
    rules: {
      // Disabled because lint-staged only passes a subset of files —
      // the TypeScript program is incomplete and these rules will crash.
      // The full type-checked run still happens in CI.
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/no-misused-promises': 'off',
      '@typescript-eslint/no-unnecessary-condition': 'off',
      '@typescript-eslint/await-thenable': 'off',
    },
  },
)
