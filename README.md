# On-Demand Emergency Response Platform - ODERP'ly

## Docs

- [Agentic Development Setup](docs/01_AGENTIC_DEV_SETUP.md) — explains why project conventions live in `CLAUDE.md` rather than agent skills, why hooks are used for deterministic automation, and when to inline context vs. reference a file. Read this before changing how Claude Code is configured for this project.

## ESM gotchas

- All source files are `.ts`; compiled output goes to `dist/` as `.js`
- Imports between local modules must use `.js` extensions (pointing at compiled output), e.g. `import { foo } from './lib/foo.js'`
- `import.meta.dirname` replaces `__dirname` in ESM — use it when you need the current file's directory
- `@oderply/shared` resolves via the npm workspace symlink hoisted to root `node_modules/`
