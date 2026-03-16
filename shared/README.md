# shared

Zod schemas and TypeScript types shared between the `api` and `client` workspaces.

## Purpose

A single source of truth for the data contract between backend and frontend. Both workspaces import from `@oderply/shared`, which resolves via the npm workspace symlink hoisted to the root `node_modules/`.

## Structure

```
shared/
└── src/
    └── index.ts    # Zod schemas and inferred TypeScript types
                    # (PanicEvent, Partner, PanicEventLog, enums, etc.)
```

## Scripts

```bash
npm run build    # tsc compile → dist/ (required before api or client can import)
```

## Usage

```ts
// in api or client:
import { PanicEventSchema, PartnerType } from '@oderply/shared'
```
