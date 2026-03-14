# On-Demand Emergency Response Platform - ODERP'ly

## Docs

- [Agentic Development Setup](docs/01_AGENTIC_DEV_SETUP.md) — explains why project conventions live in `CLAUDE.md` rather than agent skills, why hooks are used for deterministic automation, and when to inline context vs. reference a file. Read this before changing how Claude Code is configured for this project.

## Local database setup

We use Docker for PostgreSQL. The config lives in `docker-compose.yml`.

```bash
docker compose up -d   # start the DB
docker compose down    # stop it
```

Connection string (also in `api/.env.example`):
```
DATABASE_URL=postgresql://oderply:oderply@localhost:5432/oderply_dev
```

### Watch out: local Homebrew PostgreSQL conflict

If you have a Homebrew-managed PostgreSQL installed, it likely runs on port 5432
and will silently intercept connections meant for Docker — Prisma will connect to
the wrong instance and fail with `P1010: User was denied access`.

**How to spot it:** run `lsof -i :5432` — if you see a `postgres` process alongside
`com.docke`, there are two things on the same port.

**Fix:** stop the local postgres before starting the Docker container:
```bash
# if brew services works:
brew services stop postgresql@14

# if Homebrew is broken (e.g. unsupported macOS version), use launchctl directly:
launchctl unload ~/Library/LaunchAgents/homebrew.mxcl.postgresql@14.plist
```

**Broken Homebrew on newer macOS?** Update it via git:
```bash
cd /opt/homebrew && git pull origin master
```

### Prisma 7 — driver adapter required

Prisma 7 uses driver adapters instead of a built-in query engine. Every place
you instantiate `PrismaClient` in application code, you must pass the adapter:

```ts
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client.js'

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
})
```

The generated client lives at `api/src/generated/prisma/` (gitignored) — run
`npx prisma generate` from `api/` to regenerate it after schema changes.

**How to recognise the problem:** if you see this error at startup or in tests —
```
PrismaClientInitializationError: `PrismaClient` needs to be constructed with a
non-empty, valid `PrismaClientOptions`
```
— it means `PrismaClient` was instantiated without the adapter. Add the `PrismaPg`
adapter as shown above.

### Running migrations

We use `prisma migrate dev` for local development. This command:
1. Diffs the schema against the current DB state
2. Generates a timestamped SQL migration file in `api/prisma/migrations/`
3. Applies it to the DB
4. Regenerates the Prisma client in `api/src/generated/prisma/`

```bash
# from api/:
npx prisma migrate dev --name <descriptive-name>
```

Never edit migration files after they have been applied. In production use
`prisma migrate deploy` instead, which only applies existing files.

## ESM gotchas

- All source files are `.ts`; compiled output goes to `dist/` as `.js`
- Imports between local modules must use `.js` extensions (pointing at compiled output), e.g. `import { foo } from './lib/foo.js'`
- `import.meta.dirname` replaces `__dirname` in ESM — use it when you need the current file's directory
- `@oderply/shared` resolves via the npm workspace symlink hoisted to root `node_modules/`
