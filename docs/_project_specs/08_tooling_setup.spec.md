# ODERP-ly — Tooling Setup Guide
## Node Pinning · TypeScript · ESLint 9 · Pre-Commit Safety · Dependency Updates

> Adapted from the project's ESLint setup reference guide, tailored for the
> ODERP-ly stack: npm workspaces monorepo (`api/`, `client/`, `shared/`),
> Fastify + React + Vite, ESM, Node 22.13.0, ESLint 9 flat config.

---

## 1. Node.js Pinning

### Why Node 22.13.0 and not 22.11.0

The reference guide pins to 22.11.0, which forces ESLint 8 because ESLint 9
requires Node `^20.19.0, ^22.13.0, or >=24`. Since ODERP-ly is greenfield,
we pin to 22.13.0 instead — a two-character difference that unlocks ESLint 9
flat config and avoids starting on a version we'd immediately need to bump.

### `.nvmrc` (monorepo root)

```
22.13.0
```

### `.node-version` (monorepo root)

Railway reads `.node-version` rather than `.nvmrc`. Keep both files in sync.

```
22.13.0
```

### Root `package.json` — `engines` field

```json
{
  "engines": {
    "node": ">=22.13.0 <23.0.0",
    "npm": ">=10.0.0"
  }
}
```

The upper bound `<23.0.0` keeps the project on the Node 22 line intentionally.
Upgrading to Node 24 becomes a deliberate decision, not an accidental CI drift.

### `.npmrc` (monorepo root)

```ini
save-exact=true
engine-strict=true
```

- `save-exact=true` — every `npm install <pkg>` writes `"pkg": "1.2.3"` not
  `"pkg": "^1.2.3"`. This applies to all three workspaces.
- `engine-strict=true` — npm refuses to install if the running Node version
  doesn't satisfy the `engines` field, turning the check into a hard error
  rather than a warning.

---

## 2. TypeScript Configuration

ODERP-ly uses a shared root `tsconfig.base.json` that each workspace extends,
following the same pattern as the reference guide's NX setup — adapted for npm
workspaces.

### `tsconfig.base.json` (monorepo root)

```json
{
  "compilerOptions": {
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "target": "ES2022",
    "lib": ["ES2022"],
    "baseUrl": "."
  }
}
```

### `api/tsconfig.json`

```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "module": "ESNext",
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

### `client/tsconfig.json`

```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "module": "ESNext",
    "jsx": "react-jsx",
    "noEmit": true,
    "allowImportingTsExtensions": true
  },
  "include": ["src/**/*.ts", "src/**/*.tsx"],
  "exclude": ["node_modules", "dist"]
}
```

### `shared/tsconfig.json`

```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "module": "ESNext",
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

---

## 3. Installing All Packages — Fixed Versions

Run all installs from the **monorepo root**. Because `.npmrc` has
`save-exact=true`, every install writes an exact version string.

### TypeScript

```bash
npm install --save-dev \
  typescript@5.8.3
```

### ESLint 9 core + TypeScript

```bash
npm install --save-dev \
  eslint@9.25.1 \
  @eslint/js@9.25.1 \
  @typescript-eslint/eslint-plugin@8.30.1 \
  @typescript-eslint/parser@8.30.1 \
  typescript-eslint@8.30.1
```

> `@typescript-eslint` v8 supports ESLint 9 natively with flat config.
> `typescript-eslint` (the combined package) exports a ready-made `config()`
> helper that simplifies flat config setup considerably.

### Import management

```bash
npm install --save-dev \
  eslint-plugin-import@2.31.0 \
  eslint-import-resolver-typescript@3.9.1
```

### React (client workspace)

```bash
npm install --save-dev \
  eslint-plugin-react@7.37.5 \
  eslint-plugin-react-hooks@5.2.0
```

> `eslint-plugin-react-hooks@5.x` is the ESLint 9 compatible series.
> The `4.x` series from the reference guide does not support ESLint 9 flat
> config — use `5.x` here.

### Security

```bash
npm install --save-dev \
  eslint-plugin-security@3.0.1 \
  eslint-plugin-no-secrets@1.1.2
```

### Prettier

```bash
npm install --save-dev \
  prettier@3.5.3
```

### Pre-commit tooling

```bash
npm install --save-dev \
  husky@9.1.7 \
  lint-staged@15.5.0
```

### Package.json version linting

```bash
npm install --save-dev \
  npm-package-json-lint@8.0.0 \
  npm-package-json-lint-config-default@7.0.1
```

---

## 4. Complete `devDependencies` Reference

After running all installs above, your root `package.json` `devDependencies`
should contain these exact versions:

```json
{
  "devDependencies": {
    "@eslint/js": "9.25.1",
    "@typescript-eslint/eslint-plugin": "8.30.1",
    "@typescript-eslint/parser": "8.30.1",
    "eslint": "9.25.1",
    "eslint-import-resolver-typescript": "3.9.1",
    "eslint-plugin-import": "2.31.0",
    "eslint-plugin-no-secrets": "1.1.2",
    "eslint-plugin-react": "7.37.5",
    "eslint-plugin-react-hooks": "5.2.0",
    "eslint-plugin-security": "3.0.1",
    "husky": "9.1.7",
    "lint-staged": "15.5.0",
    "npm-package-json-lint": "8.0.0",
    "npm-package-json-lint-config-default": "7.0.1",
    "prettier": "3.5.3",
    "typescript": "5.8.3",
    "typescript-eslint": "8.30.1"
  }
}
```

---

## 5. Prettier Configuration

Prettier handles all formatting. ESLint is not configured for formatting rules —
Prettier is the sole authority on style.

### Install

```bash
npm install --save-dev \
  prettier@3.5.3
```

### `.prettierrc` (monorepo root)

```json
{
  "singleQuote": true,
  "semi": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2
}
```

`singleQuote` and `trailingComma: "all"` reduce git diff noise. `semi: true` enforces
semicolons on every statement.

### `.prettierignore` (monorepo root)

```
node_modules/
dist/
build/
*.lock
package-lock.json
api/prisma/migrations/
```

Lock files and auto-generated Prisma migration SQL are excluded from formatting.

---

## 6. ESLint 9 Flat Config

ESLint 9 uses `eslint.config.js` at the monorepo root instead of the legacy
`.eslintrc.*` format. Create `eslint.config.js`:

```js
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
```

---

## 7. Pre-Commit Safety Net

### Why this layer matters

CI catches linting errors after the code is already pushed and a pipeline is
running. The pre-commit hook catches problems before the code leaves the
machine — no failed pipeline, no forced push.

### How Husky and lint-staged divide responsibilities

| Tool | Responsibility |
|---|---|
| **Husky** | Registers Git hooks so Git calls our scripts at the right lifecycle points |
| **lint-staged** | Filters the hook to run only on staged files, not the entire codebase |

### Initialise Husky

```bash
npx husky init
```

This creates the `.husky/` directory and adds a `prepare` script to
`package.json` so every developer who clones the repo and runs `npm install`
gets Husky wired up automatically — no manual step.

### `.husky/pre-commit`

Husky v9 hooks are plain shell scripts — no sourcing of `husky.sh` required.

```sh
# .husky/pre-commit
npx lint-staged
```

### `.husky/pre-push`

Tests run on pre-push, not pre-commit. A slow pre-commit hook gets disabled
within days. Tests belong here — developers expect a slightly longer wait
when pushing, and the hook runs far less frequently. Only the `api` workspace
runs here; client tests are covered by CI.

```sh
# .husky/pre-push
npm test --workspace=api
```

### lint-staged configuration

Add the `lint-staged` key to root `package.json`. Note the globs use
`api/`, `client/`, and `shared/` — not `apps/**` or `libs/**` (those are NX
monorepo paths). Using the wrong globs causes lint-staged to silently pass
without linting anything.

```json
{
  "lint-staged": {
    "package.json": [
      "npmPkgJsonLint --allowEmptyInput ."
    ],
    "{api,shared}/src/**/*.ts": [
      "eslint --fix --max-warnings 0"
    ],
    "client/src/**/*.{ts,tsx}": [
      "eslint --fix --max-warnings 0"
    ],
    "{api,client,shared}/src/**/*.{json,md,yml}": [
      "prettier --write"
    ]
  }
}
```

### The typed-rules problem in lint-staged

Several `@typescript-eslint` rules (e.g. `no-floating-promises`,
`no-misused-promises`) require a full TypeScript program to operate. When
lint-staged passes ESLint only a subset of staged files, the TypeScript
program is incomplete and these rules crash or produce false positives.

The fix is a second, lighter ESLint config used only by lint-staged that
turns off the type-checked rules. Create `eslint.config.staged.js`:

```js
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
```

Then reference it in lint-staged:

```json
{
  "lint-staged": {
    "{api,shared}/src/**/*.ts": [
      "eslint --fix --max-warnings 0 --config eslint.config.staged.js"
    ],
    "client/src/**/*.{ts,tsx}": [
      "eslint --fix --max-warnings 0 --config eslint.config.staged.js"
    ]
  }
}
```

### Complete local safety-net model

```
You write code
      │
      ▼
VS Code (ESLint extension)
  → Real-time squiggles on every save
      │
      ▼
git commit
  → Husky fires .husky/pre-commit
  → lint-staged runs eslint --fix (staged config) on staged .ts/.tsx files
  → npm-package-json-lint checks package.json for ^ ranges
  → Commit blocked if any non-auto-fixable error remains
      │
      ▼
git push
  → Husky fires .husky/pre-push
  → npm test runs the api test suite
  → Push blocked if any test fails
      │
      ▼
CI (GitHub Actions — future)
  → Full ESLint run with type-checked rules (full project in context)
  → Full test suite
  → Build verification
  → Final gate before merge to develop
```

---

## 8. `npm-package-json-lint` Configuration

`.npmrc save-exact=true` prevents `npm install` from writing ranges. But it
cannot protect against a developer manually typing `"fastify": "^5.0.0"` into
`package.json` or copy-pasting a version string from documentation.
`npm-package-json-lint` catches this at commit time.

Create `.npmpackagejsonlintrc.json` at the monorepo root:

```json
{
  "extends": "npm-package-json-lint-config-default",
  "rules": {
    "prefer-absolute-version-dependencies": "error",
    "prefer-absolute-version-devDependencies": "error"
  }
}
```

When a range is found, the commit is blocked:

```
✖  1  error

  ●  api/package.json

    line 12  prefer-absolute-version-dependencies  ✖  error
    "fastify" is set to "^5.0.0". Absolute versions are required.
    Use "5.0.0" instead.
```

---

## 9. Updating Dependencies Safely

Renovate is not configured for this project at current scope. All updates are
manual. The process below must be followed every time.

### 1. Check what is outdated

```bash
npm outdated
```

### 2. Update one package at a time

```bash
# --save-exact is redundant with .npmrc save-exact=true but included
# explicitly to make intent visible.
npm install --save-exact fastify@5.3.1
```

Never run `npm update` without specifying a package — it iterates all
packages and can silently override pinned versions.

### 3. Run the full lint and test suite

```bash
npm run lint          # from root
npm test --workspaces # all workspaces
```

### 4. Commit `package.json` and `package-lock.json` atomically

Both files must be committed together. A `package.json` change without a
matching `package-lock.json` is a broken state — `npm ci` in CI will refuse
to install.

```bash
git add package.json package-lock.json api/package.json
git commit -m "chore(deps): bump fastify to 5.3.1"
```

### 5. Major version upgrades — isolated branch, never bundled with features

Major bumps (e.g. Fastify 4 → 5, Node 22 → 24, ESLint 9 → 10) involve
breaking changes and must:
- Go on their own branch: `chore/bump-fastify-v5`
- Have all tests passing before the PR is opened
- Include a link to the library's migration guide in the PR description
- Never be bundled with feature work

---

## 10. Root `package.json` — Complete Scripts and Config

For reference, here is the full set of root-level scripts, engines, and
lint-staged config in one place:

```json
{
  "private": true,
  "workspaces": ["api", "client", "shared"],
  "type": "module",
  "engines": {
    "node": ">=22.13.0 <23.0.0",
    "npm": ">=10.0.0"
  },
  "scripts": {
    "dev": "concurrently \"npm run dev:api\" \"npm run dev:client\"",
    "dev:api": "npm run dev --workspace=api",
    "dev:client": "npm run dev --workspace=client",
    "build": "npm run build --workspace=client",
    "start": "npm run start --workspace=api",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "test": "npm test --workspaces --if-present",
    "prepare": "husky"
  },
  "lint-staged": {
    "package.json": ["npmPkgJsonLint --allowEmptyInput ."],
    "{api,shared}/src/**/*.ts": [
      "eslint --fix --max-warnings 0 --config eslint.config.staged.js"
    ],
    "client/src/**/*.{ts,tsx}": [
      "eslint --fix --max-warnings 0 --config eslint.config.staged.js"
    ],
    "{api,client,shared}/src/**/*.{json,md,yml}": ["prettier --write"]
  }
}
```
