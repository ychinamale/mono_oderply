# api

Fastify backend for ODERP-ly. TypeScript, ESM, Prisma 7, Socket.io.

## Structure

```
api/
├── src/
│   ├── app.ts              # App factory — registers plugins, routes, Socket.io
│   ├── index.ts            # Entry point — builds app, starts server
│   ├── routes/
│   │   ├── auth.ts         # POST /api/auth/login
│   │   ├── panics.ts       # All panic endpoints (submit, claim, list, detail, transitions, logs)
│   │   └── partners.ts     # GET /api/v1/partners, /api/v1/partners/:id
│   ├── hooks/
│   │   ├── apiKeyGuard.ts  # preHandler — validates x-api-key, attaches partner to request
│   │   └── jwtGuard.ts     # preHandler — validates Bearer JWT, attaches operator to request
│   ├── lib/
│   │   ├── prisma.ts       # Singleton PrismaClient (with PrismaPg driver adapter)
│   │   ├── assertTransition.ts  # State machine guard — throws on invalid status transition
│   │   └── webhookQueue.ts # In-process webhook fan-out queue
│   └── generated/prisma/   # Generated Prisma client (gitignored — run `npx prisma generate`)
├── prisma/
│   ├── schema.prisma       # Data model (Partner, PanicEvent, PanicEventLog, Operator)
│   ├── migrations/         # Timestamped SQL migration files
│   └── seed.ts             # Seeds demo partners and operator
└── tests/
    ├── auth.test.ts
    ├── panics.test.ts
    ├── partners.test.ts
    ├── webhooks.test.ts
    ├── socketio.test.ts
    └── ...                 # 137 tests total
```

## Key modules

- **`app.ts`** — registers `@fastify/jwt`, `@fastify/swagger`, `@scalar/fastify-api-reference`, Socket.io, and all route modules
- **`apiKeyGuard`** — SHA-256 hashes the incoming key, looks up the partner; never returns `apiKeyHash` in responses
- **`assertTransition`** — enforces `PENDING → ACKNOWLEDGED → DISPATCHED → RESOLVED`; throws `400` on invalid move
- **`webhookQueue`** — non-blocking fan-out; fires POST to partner `webhookUrl`s after state changes; failures are logged, never thrown

## Scripts

```bash
npm run dev     # tsx watch mode — restarts on changes
npm run build   # tsc compile → dist/
npm run start   # node dist/index.js
npm test        # Jest — requires running DB (see api/.env.test)
npm run seed    # Prisma seed — inserts demo partners and operator
```

## Database

PostgreSQL 16 via Docker. Managed with Prisma 7 (driver adapter pattern).

```bash
# Apply existing migrations (deploy — no new migration created):
npx prisma migrate deploy

# Create a new migration during development:
npx prisma migrate dev --name <descriptive-name>

# Regenerate client after schema change:
npx prisma generate
```

## ESM note

Source files are `.ts`. Compiled output is `.js`. All relative imports between local modules must use `.js` extensions (e.g. `import { foo } from './lib/foo.js'`). This is NodeNext module resolution — the `.js` extension maps correctly to `.ts` at compile time and to the real `.js` at runtime.
