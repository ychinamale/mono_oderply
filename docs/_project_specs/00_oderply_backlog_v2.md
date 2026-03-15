# ODERP-ly — Project Backlog v2
**Format:** Epic → Story → Task → Sub-task
**Scope:** Zero to launch — tech stack setup through production deployment

---

## Hierarchy Key

| Level | Symbol | Description |
|---|---|---|
| Epic | `🏆 EPIC` | A major feature area or phase |
| Story | `STORY` | A user-facing or system-level capability |
| Task | `TASK` | A concrete unit of buildable work |
| Sub-task | `SUB` | A specific implementation step within a task |

---

## 🏆 EPIC-01 — Project Foundation & Monorepo Setup

> Establish the repository, workspace structure, tooling, and local development environment so that all subsequent work has a stable foundation to build on.

---

### STORY-01.1 — Repository Initialised and Workspace Configured

**As a** developer,
**I want** the monorepo scaffolded with all three packages wired together,
**so that** I can start writing business logic without fighting project structure.

- [x] TASK-01.1.1 — Initialise Git repository and root workspace

    - [x] SUB: Create `oderply/` directory and run `git init`
    - [x] SUB: Create root `package.json` with `workspaces: ["api", "client", "shared"]`
    - [x] SUB: Add `concurrently` as a root dev dependency
    - [x] SUB: Add root-level scripts: `dev`, `dev:api`, `dev:client`, `build`, `start`
    - [x] SUB: Create `.gitignore` (node_modules, dist, .env, .env.local)
    - [x] SUB: Create initial commit

- [x] TASK-01.1.2 — Set up `shared` package

    - [x] SUB: Create `shared/package.json` with `"name": "@oderply/shared"`, `"type": "module"`
    - [x] SUB: Create `shared/src/index.js` as the package entry point
    - [x] SUB: Export `PanicStatus` enum constants
    - [x] SUB: Verify `@oderply/shared` resolves correctly from both `api` and `client`

- [x] TASK-01.1.3 — Set up `api` package

    - [x] SUB: Create `api/package.json` with `"type": "module"` and dev/start scripts
    - [x] SUB: Add dependencies: `fastify`, `@fastify/jwt`, `@fastify/cors`, `@fastify/static`, `zod`, `@oderply/shared`, `prisma`, `@prisma/client`, `socket.io`
    - [x] SUB: Create `api/src/index.js` with a minimal Fastify server that boots and listens
    - [x] SUB: Create `api/src/routes/` directory
    - [x] SUB: Create `api/.env.example` with `NODE_ENV`, `JWT_SECRET`, `PORT`, `DATABASE_URL`
    - [x] SUB: Copy `.env.example` to `.env` and confirm server starts on `:3000`

- [x] TASK-01.1.4 — Set up `client` package

    - [x] SUB: Create `client/package.json` with Vite + React dependencies
    - [x] SUB: Create `client/vite.config.js` with `/api` proxy pointing to `http://localhost:3000`
    - [x] SUB: Create `client/index.html` and `client/src/main.jsx` entry points
    - [x] SUB: Create `client/src/App.jsx` with a placeholder component
    - [x] SUB: Confirm Vite dev server starts on `:5173` and proxy resolves correctly

- [x] TASK-01.1.5 — Install all dependencies and verify workspace

    - [x] SUB: Run `npm install` from the workspace root
    - [x] SUB: Confirm `@oderply/shared` is symlinked into `api/node_modules` and `client/node_modules`
    - [x] SUB: Run `npm run dev` and confirm both processes start cleanly
    - [x] SUB: Document any ESM gotchas (`.js` extensions, `import.meta.dirname`) in README

---

### STORY-01.2 — Local PostgreSQL Running and Prisma Configured

**As a** developer,
**I want** a local database with Prisma connected and migrations working,
**so that** I can persist data and iterate on the schema safely.

- [x] TASK-01.2.1 — Set up local PostgreSQL

    - [x] SUB: Install PostgreSQL locally or run via Docker (`docker run --name oderply-db -e POSTGRES_PASSWORD=... -p 5432:5432 -d postgres`)
    - [x] SUB: Create `oderply_dev` database
    - [x] SUB: Add `DATABASE_URL` to `api/.env`

- [x] TASK-01.2.2 — Initialise Prisma

    - [x] SUB: Run `npx prisma init` from `api/`
    - [x] SUB: Confirm `api/prisma/schema.prisma` is created
    - [x] SUB: Set `provider = "postgresql"` and wire `DATABASE_URL` from env

- [x] TASK-01.2.3 — Write the full Prisma schema

    - [x] SUB: Define `PartnerType` enum: `PANIC_SOURCE | RESPONDER_SYSTEM`
    - [x] SUB: Define `PanicStatus` enum: `PENDING | ACKNOWLEDGED | DISPATCHED | RESOLVED`
    - [x] SUB: Define `LogTrigger` enum: `OPERATOR | PARTNER_CLAIM`
    - [x] SUB: Define `Partner` model with all fields including `type`, `apiKeyHash`, `webhookUrl`, `claimedPanics` relation
    - [x] SUB: Define `PanicEvent` model with `partnerId`, `claimedByPartnerId?`, `externalUserId`, `latitude`, `longitude`, `status`, `idempotencyKey` (unique), `metadata`, relations
    - [x] SUB: Define `PanicEventLog` model with `triggeredBy`, `operatorId?`, `partnerId?`, relations
    - [x] SUB: Define `Operator` model with `email`, `passwordHash`, `name`
    - [x] SUB: Add DB indexes: `panic_events.status`, `panic_events.partnerId`, `panic_events.claimedByPartnerId`, `panic_events.createdAt DESC`

- [x] TASK-01.2.4 — Run migrations and verify schema

    - [x] SUB: Run `npx prisma migrate dev --name init`
    - [x] SUB: Confirm all tables created correctly in `oderply_dev`
    - [x] SUB: Run `npx prisma studio` and verify schema visually
    - [x] SUB: Confirm `@prisma/client` is generated and importable from `api/src`

- [x] TASK-01.2.5 — Write seed file

    - [x] SUB: Create `api/prisma/seed.js`
    - [x] SUB: Seed one `PANIC_SOURCE` partner with a known raw API key (hashed with SHA-256 before storing)
    - [x] SUB: Seed one `RESPONDER_SYSTEM` partner with a known raw API key
    - [x] SUB: Seed one `Operator` with a known email/password (bcrypt hashed)
    - [x] SUB: Add `prisma.seed` script to `api/package.json`
    - [x] SUB: Run seed and confirm rows exist in all tables

---

## 🏆 EPIC-02 — Authentication

> Secure access to the system for both partner systems (API key) and operators (JWT), ensuring no unauthenticated request can reach business logic.

---

### STORY-02.1 — Partner Systems Authenticate via API Key

**As a** partner system,
**I want** to authenticate using an API key in the request header,
**so that** ODERP-ly can identify which partner is submitting or claiming a panic.

- [x] TASK-02.1.1 — Implement `apiKeyGuard` preHandler hook

    - [x] SUB: Create `api/src/hooks/apiKeyGuard.js`
    - [x] SUB: Read `x-api-key` header; return 401 if missing
    - [x] SUB: Hash the raw key with SHA-256
    - [x] SUB: Query `Partner` table by `apiKeyHash`; return 403 if not found
    - [x] SUB: Attach the resolved `Partner` record to `request.partner`

- [x] TASK-02.1.2 — Extend `apiKeyGuard` for partner type assertion

    - [x] SUB: Accept an optional `requiredType` parameter (`PANIC_SOURCE` | `RESPONDER_SYSTEM`)
    - [x] SUB: Return 403 with clear message if partner type does not match
    - [x] SUB: Apply type assertion on the claim endpoint (`RESPONDER_SYSTEM` only)

- [x] TASK-02.1.3 — Test API key guard

    - [x] SUB: Test missing header → 401
    - [x] SUB: Test invalid key → 403
    - [x] SUB: Test valid PANIC_SOURCE key → request.partner populated
    - [x] SUB: Test valid RESPONDER_SYSTEM key on claim route → passes
    - [x] SUB: Test PANIC_SOURCE key on claim route → 403

---

### STORY-02.2 — Operators Authenticate via JWT

**As a** control room operator,
**I want** to log in with my credentials and receive a JWT,
**so that** I can make authenticated requests to the operator API.

- [x] TASK-02.2.1 — Register `@fastify/jwt` plugin

    - [x] SUB: Register plugin in `api/src/index.js` with `JWT_SECRET` from env
    - [x] SUB: Confirm `fastify.jwt.sign()` and `fastify.jwt.verify()` are available

- [x] TASK-02.2.2 — Implement `POST /api/auth/login`

    - [x] SUB: Create `api/src/routes/auth.js`
    - [x] SUB: Define Zod schema: `{ email: z.string().email(), password: z.string() }`
    - [x] SUB: Query `Operator` by email; return 401 if not found
    - [x] SUB: Compare password against `passwordHash` with bcrypt; return 401 if mismatch
    - [x] SUB: Sign and return JWT containing `{ operatorId, email, name }`
    - [x] SUB: Return operator object alongside token in response

- [x] TASK-02.2.3 — Implement `jwtGuard` preHandler hook

    - [x] SUB: Create `api/src/hooks/jwtGuard.js`
    - [x] SUB: Read `Authorization: Bearer <token>` header; return 401 if missing
    - [x] SUB: Verify token with `fastify.jwt.verify()`; return 401 if invalid or expired
    - [x] SUB: Attach decoded payload to `request.operator`

- [x] TASK-02.2.4 — Test JWT auth flow

    - [x] SUB: Test login with invalid credentials → 401
    - [x] SUB: Test login with valid credentials → token + operator object returned
    - [x] SUB: Test protected route with no token → 401
    - [x] SUB: Test protected route with expired/malformed token → 401
    - [x] SUB: Test protected route with valid token → passes, `request.operator` populated

---

## 🏆 EPIC-03 — Panic Ingestion API

> Allow authenticated partner systems to submit panic events reliably, with idempotency guarantees, and trigger the downstream broadcast and real-time notification pipeline.

---

### STORY-03.1 — Partner System Can Submit a Panic Event

**As a** partner system,
**I want** to POST a panic event with location and user details,
**so that** ODERP-ly receives the emergency and begins coordinating a response.

- [x] TASK-03.1.1 — Implement `POST /api/v1/panics`

    - [x] SUB: Create `api/src/routes/panics.js`
    - [x] SUB: Apply `apiKeyGuard` (type: `PANIC_SOURCE`) as preHandler
    - [x] SUB: Define Zod request schema: `externalUserId`, `latitude`, `longitude`, `idempotencyKey` (required), `metadata?`
    - [x] SUB: Validate `latitude` range (-90 to 90) and `longitude` range (-180 to 180)
    - [x] SUB: Write `PanicEvent` to DB with `partnerId` from `request.partner.id`
    - [x] SUB: Include partner inline in response (`prisma.panicEvent.create({ include: { partner: true } })`)
    - [x] SUB: Return 201 with full panic response shape

- [x] TASK-03.1.2 — Enforce idempotency

    - [x] SUB: Add `idempotencyKey` as `@unique` in Prisma schema
    - [x] SUB: Catch Prisma unique constraint violation (`P2002`) on `idempotencyKey`
    - [x] SUB: On duplicate key: fetch and return the original `PanicEvent` with 200 (not an error)
    - [x] SUB: Test: submit same `idempotencyKey` twice → second response is 200 with original event

- [x] TASK-03.1.3 — Trigger async webhook broadcast on creation

    - [x] SUB: After successful DB write, enqueue a broadcast job
    - [x] SUB: Queue fetches all `RESPONDER_SYSTEM` partners with a `webhookUrl`
    - [x] SUB: POST the new `PanicEvent` payload to each `webhookUrl` asynchronously
    - [x] SUB: Confirm broadcast does not block the 201 response
    - [x] SUB: Log webhook delivery failures without throwing (fire-and-forget with error logging)

- [x] TASK-03.1.4 — Emit `panic:new` Socket.io event

    - [x] SUB: After DB write, emit `panic:new` to all connected operator clients via Socket.io
    - [x] SUB: Confirm Socket.io payload mirrors the REST response shape exactly
    - [x] SUB: Test: submit panic → operator client receives `panic:new` event in real time

---

## 🏆 EPIC-04 — Responder Claim API

> Allow authenticated responder systems to claim a panic event, triggering the ACKNOWLEDGED status transition atomically and notifying the panic source.

---

### STORY-04.1 — Responder System Can Claim a Panic

**As a** responder system,
**I want** to claim a panic event on behalf of one of my responders,
**so that** ODERP-ly knows who is responding and can route subsequent notifications correctly.

- [x] TASK-04.1.1 — Implement `POST /api/v1/panics/:id/claim`

    - [x] SUB: Add claim route to `api/src/routes/panics.js`
    - [x] SUB: Apply `apiKeyGuard` with type assertion `RESPONDER_SYSTEM`
    - [x] SUB: Fetch the `PanicEvent` by `:id`; return 404 if not found
    - [x] SUB: Return 409 if `claimedByPartnerId` is already set (panic already claimed)
    - [x] SUB: Return 400 if panic status is not `PENDING` (cannot claim a non-pending panic)

- [x] TASK-04.1.2 — Implement atomic claim with pessimistic locking

    - [x] SUB: Use `prisma.$queryRaw` with `SELECT ... FOR UPDATE` to lock the `PanicEvent` row
    - [x] SUB: Inside the same transaction: update `status → ACKNOWLEDGED`, set `claimedByPartnerId`
    - [x] SUB: Inside the same transaction: create `PanicEventLog` with `triggeredBy: PARTNER_CLAIM`, `partnerId` set, `operatorId: null`
    - [x] SUB: Confirm the entire claim is atomic — no partial writes possible

- [x] TASK-04.1.3 — Trigger post-claim notifications

    - [x] SUB: Emit `panic:updated` via Socket.io to all operator clients after successful claim
    - [x] SUB: Enqueue targeted webhook notification to the `PANIC_SOURCE` partner (`panicEvent.partner.webhookUrl`)
    - [x] SUB: Webhook payload includes `event: "panic.status_updated"`, `panicId`, `previousStatus`, `newStatus`, `updatedAt`
    - [x] SUB: Skip webhook if `PANIC_SOURCE` has no `webhookUrl` (log warning, do not throw)

- [x] TASK-04.1.4 — Test claim flow

    - [x] SUB: Test PANIC_SOURCE API key on claim route → 403
    - [x] SUB: Test claim on non-existent panic → 404
    - [x] SUB: Test claim on already-claimed panic → 409
    - [x] SUB: Test valid claim → status is ACKNOWLEDGED, `claimedByPartnerId` set, log written
    - [x] SUB: Test race condition: two simultaneous claims → exactly one succeeds, one gets 409

---

## 🏆 EPIC-05 — Operator Status Transition API

> Allow authenticated operators to move panics through the lifecycle (ACKNOWLEDGED → DISPATCHED → RESOLVED), with every transition recorded in the audit log.

---

### STORY-05.1 — Operator Can Acknowledge a Panic

**As an** operator,
**I want** to manually acknowledge a panic that has not yet been claimed,
**so that** I can signal the event is being handled directly by the control room.

- [x] TASK-05.1.1 — Implement `POST /api/v1/panics/:id/acknowledge`

    - [x] SUB: Add acknowledge route with `jwtGuard` preHandler
    - [x] SUB: Fetch `PanicEvent`; return 404 if not found
    - [x] SUB: Return 400 if status is not `PENDING`
    - [x] SUB: Prisma transaction: update `status → ACKNOWLEDGED`, create `PanicEventLog` with `triggeredBy: OPERATOR`, `operatorId` set
    - [x] SUB: Emit `panic:updated` via Socket.io
    - [x] SUB: Enqueue targeted webhook to `PANIC_SOURCE`
    - [x] SUB: Return updated panic with partner inline

---

### STORY-05.2 — Operator Can Mark a Panic as Dispatched

**As an** operator,
**I want** to mark a panic as dispatched when a responder is en route,
**so that** all parties know a response is actively underway.

- [x] TASK-05.2.1 — Implement `POST /api/v1/panics/:id/dispatch`

    - [x] SUB: Add dispatch route with `jwtGuard` preHandler
    - [x] SUB: Fetch `PanicEvent`; return 404 if not found
    - [x] SUB: Return 400 if status is not `ACKNOWLEDGED`
    - [x] SUB: Prisma transaction: update `status → DISPATCHED`, create `PanicEventLog` with `triggeredBy: OPERATOR`
    - [x] SUB: Emit `panic:updated` via Socket.io
    - [x] SUB: Enqueue targeted webhooks to `PANIC_SOURCE` and `claimedByPartner` (if set)
    - [x] SUB: Return updated panic with partner inline

---

### STORY-05.3 — Operator Can Resolve a Panic

**As an** operator,
**I want** to mark a panic as resolved when the emergency is closed,
**so that** the event is removed from the active queue and archived.

- [x] TASK-05.3.1 — Implement `POST /api/v1/panics/:id/resolve`

    - [x] SUB: Add resolve route with `jwtGuard` preHandler
    - [x] SUB: Fetch `PanicEvent`; return 404 if not found
    - [x] SUB: Return 400 if status is not `DISPATCHED`
    - [x] SUB: Prisma transaction: update `status → RESOLVED`, create `PanicEventLog` with `triggeredBy: OPERATOR`
    - [x] SUB: Emit `panic:updated` via Socket.io
    - [x] SUB: Enqueue targeted webhooks to `PANIC_SOURCE` and `claimedByPartner` (if set)
    - [x] SUB: Return updated panic with partner inline

---

### STORY-05.4 — Invalid Status Transitions Are Rejected

**As a** system,
**I want** illegal status transitions to be rejected with a clear error,
**so that** the panic lifecycle state machine is never violated.

- [x] TASK-05.4.1 — Centralise transition guard logic

    - [x] SUB: Create `api/src/lib/assertTransition.js`
    - [x] SUB: Accept `(currentStatus, requiredStatus, endpointName)` and throw a structured 400 if mismatch
    - [x] SUB: Error message format: `"Cannot [action] a panic with status [currentStatus]"`
    - [x] SUB: Apply `assertTransition` consistently across all three transition endpoints
    - [x] SUB: Test all invalid transitions: e.g. resolve a PENDING, dispatch a RESOLVED, acknowledge an ACKNOWLEDGED

---

## 🏆 EPIC-06 — Read APIs (Panics, Logs, Partners)

> Provide paginated, filterable read endpoints for operators to query panics, audit logs, and partner information from the dashboard.

---

### STORY-06.1 — Operator Can List and View Panics

**As an** operator,
**I want** to fetch a paginated list of panic events with filtering,
**so that** I can build and populate the dashboard without loading all records.

- [x] TASK-06.1.1 — Implement `GET /api/v1/panics`

    - [x] SUB: Apply `jwtGuard`
    - [x] SUB: Define Zod query schema: `page` (default 1), `limit` (default 20), `status?`, `partnerId?`
    - [x] SUB: Query with `prisma.panicEvent.findMany` + `include: { partner: true }`
    - [x] SUB: Apply `skip` and `take` for pagination
    - [x] SUB: Run `prisma.panicEvent.count` with same filters for total
    - [x] SUB: Return `{ data, pagination: { page, limit, total, totalPages } }`

- [x] TASK-06.1.2 — Implement `GET /api/v1/panics/:id`

    - [x] SUB: Apply `jwtGuard`
    - [x] SUB: Query with `include: { partner: true, claimedByPartner: true }`
    - [x] SUB: Return 404 if not found
    - [x] SUB: Return full panic object

---

### STORY-06.2 — Operator Can View the Audit Log for a Panic

**As an** operator,
**I want** to see every status transition for a specific panic with timestamps and actor details,
**so that** I have a complete record of how the event was handled.

- [x] TASK-06.2.1 — Implement `GET /api/v1/panics/:id/logs`

    - [x] SUB: Apply `jwtGuard`
    - [x] SUB: Verify parent `PanicEvent` exists; return 404 if not
    - [x] SUB: Query logs with `include: { operator: true, partner: true }`
    - [x] SUB: Order by `createdAt ASC`
    - [x] SUB: Apply pagination with `page` and `limit` query params
    - [x] SUB: Return `{ data, pagination }`

- [x] TASK-06.2.2 — Implement `GET /api/v1/panics/:id/logs/:logId`

    - [x] SUB: Apply `jwtGuard`
    - [x] SUB: Return 404 if log not found or does not belong to the specified panic
    - [x] SUB: Return single log entry with operator and partner inline

---

### STORY-06.3 — Operator Can List and View Partners

**As an** operator,
**I want** to browse registered partners with their panic event counts,
**so that** I can understand which systems are connected and how active they are.

- [x] TASK-06.3.1 — Implement `GET /api/v1/partners`

    - [x] SUB: Apply `jwtGuard`
    - [x] SUB: Define Zod query schema: `page`, `limit`, `type?`
    - [x] SUB: Query with `include: { _count: { select: { panicEvents: true } } }`
    - [x] SUB: Compute `activePanicEvents` count (status IN [PENDING, ACKNOWLEDGED, DISPATCHED]) as a separate aggregation
    - [x] SUB: Return `{ data, pagination }`
    - [x] SUB: Never return `apiKeyHash` in any partner response

- [x] TASK-06.3.2 — Implement `GET /api/v1/partners/:id`

    - [x] SUB: Apply `jwtGuard`
    - [x] SUB: Return 404 if not found
    - [x] SUB: Return partner with `_count` aggregations
    - [x] SUB: Never return `apiKeyHash`

---

## 🏆 EPIC-07 — Real-Time WebSocket Gateway

> Deliver live panic events and status updates to connected operator clients over WebSocket, keeping the dashboard current without polling.

---

### STORY-07.1 — Operators Receive Live Updates via WebSocket

**As an** operator,
**I want** my dashboard to update automatically when new panics arrive or statuses change,
**so that** I never need to manually refresh to see the current state.

- [x] TASK-07.1.1 — Set up Socket.io server alongside Fastify

    - [x] SUB: Create `api/src/gateway.js`
    - [x] SUB: Attach Socket.io to the Fastify HTTP server instance
    - [x] SUB: Register `@fastify/cors` before Socket.io to avoid CORS issues on handshake
    - [x] SUB: Export the `io` instance so route modules can emit events

- [x] TASK-07.1.2 — Implement WebSocket authentication guard

    - [x] SUB: Use `io.use()` middleware to intercept every new connection
    - [x] SUB: Read `socket.handshake.auth.token`
    - [x] SUB: Verify the JWT using the same secret as the REST guard
    - [x] SUB: Call `next(new Error('Unauthorised'))` if token is missing or invalid
    - [x] SUB: Attach decoded operator payload to `socket.data.operator`

- [x] TASK-07.1.3 — Emit `panic:new` on panic creation

    - [x] SUB: Import `io` in the panic ingestion route
    - [x] SUB: After DB write, call `io.emit('panic:new', panicPayload)`
    - [x] SUB: Confirm payload shape matches `GET /api/v1/panics/:id` response exactly
    - [x] SUB: Test: POST a panic → connected operator client receives `panic:new`

- [x] TASK-07.1.4 — Emit `panic:updated` on every status transition

    - [x] SUB: Call `io.emit('panic:updated', panicPayload)` after every successful transition (acknowledge, dispatch, resolve, claim)
    - [x] SUB: Confirm payload mirrors REST response shape
    - [x] SUB: Test: transition a panic status → connected operator client receives `panic:updated`

---

## 🏆 EPIC-08 — Async Webhook Delivery Queue

> Deliver outbound webhook notifications to partner systems asynchronously, ensuring partner system latency or unavailability never impacts ODERP-ly's critical ingestion and response paths.

---

### STORY-08.1 — Webhook Notifications Are Delivered Asynchronously

**As** ODERP-ly,
**I want** to notify partner systems of panic events and status changes without blocking the main request cycle,
**so that** a slow or unavailable partner system never degrades operator or ingestion performance.

- [x] TASK-08.1.1 — Implement in-process webhook queue

    - [x] SUB: Create `api/src/lib/webhookQueue.js`
    - [x] SUB: Implement a simple async FIFO queue using `setImmediate` or a promise chain
    - [x] SUB: Expose `enqueue(job)` function that accepts `{ url, payload }`
    - [x] SUB: Process jobs sequentially, non-blocking relative to the HTTP request cycle

- [x] TASK-08.1.2 — Implement webhook delivery worker

    - [x] SUB: Worker reads each job from the queue and sends `HTTP POST` to `job.url`
    - [x] SUB: Set request timeout (e.g. 5 seconds) — do not wait indefinitely
    - [x] SUB: On success (2xx): log delivery confirmation
    - [x] SUB: On failure (non-2xx or timeout): log error with `panicId`, `partnerId`, `url`, and response status
    - [x] SUB: Do not retry on failure for MVP (log and move on)

- [x] TASK-08.1.3 — Define webhook payload shapes

    - [x] SUB: Creation broadcast payload: `{ event: "panic.created", panicId, status, latitude, longitude, metadata, createdAt }`
    - [x] SUB: Status change payload: `{ event: "panic.status_updated", panicId, previousStatus, newStatus, updatedAt }`
    - [x] SUB: Add shared Zod schemas for both payloads in `shared/src/index.js`

- [x] TASK-08.1.4 — Wire queue into all trigger points

    - [x] SUB: Panic creation → enqueue broadcast to ALL `RESPONDER_SYSTEM` partners with `webhookUrl`
    - [x] SUB: Claim → enqueue status update to `PANIC_SOURCE` only
    - [x] SUB: Acknowledge → enqueue status update to `PANIC_SOURCE` only
    - [x] SUB: Dispatch → enqueue status update to `PANIC_SOURCE` + `claimedByPartner` (if set)
    - [x] SUB: Resolve → enqueue status update to `PANIC_SOURCE` + `claimedByPartner` (if set)
    - [x] SUB: Skip silently (with warning log) if partner has no `webhookUrl`

---

## 🏆 EPIC-09 — Control Room Operator Dashboard (Frontend)

> Build the React-based operator dashboard that displays live panic events, enables status management, and shows the audit log for each event.

---

### STORY-09.1 — Operator Can Log In to the Dashboard

**As an** operator,
**I want** to log in with my email and password,
**so that** I can access the secure control room dashboard.

- [x] TASK-09.1.1 — Build login page

    - [x] SUB: Create `client/src/pages/Login.jsx`
    - [x] SUB: Build email + password form (no HTML `<form>` tags — use `onClick` + `onChange` handlers)
    - [x] SUB: On submit: call `POST /api/auth/login`, store JWT in memory (React state or context)
    - [x] SUB: On success: redirect to dashboard
    - [x] SUB: On failure: display inline error message
    - [x] SUB: Style with Tailwind CSS

- [x] TASK-09.1.2 — Implement auth context and protected routes

    - [x] SUB: Create `client/src/context/AuthContext.jsx` with `token`, `operator`, `login()`, `logout()`
    - [x] SUB: Create `ProtectedRoute` component that redirects to `/login` if no token
    - [x] SUB: Wrap dashboard routes in `ProtectedRoute`
    - [x] SUB: Add logout button that clears auth context and redirects to login

---

### STORY-09.2 — Operator Sees Live Panic Feed

**As an** operator,
**I want** to see all active panic events update in real time without refreshing,
**so that** I always have the current picture of ongoing emergencies.

- [x] TASK-09.2.1 — Implement Socket.io client connection

    - [x] SUB: Install `socket.io-client` in `client/`
    - [x] SUB: Create `client/src/hooks/useSocket.js`
    - [x] SUB: Connect with `auth: { token }` from auth context on mount
    - [x] SUB: Disconnect cleanly on unmount
    - [x] SUB: Handle connection errors (display reconnecting state)

- [x] TASK-09.2.2 — Build panic feed state management

    - [x] SUB: Create `client/src/hooks/usePanics.js`
    - [x] SUB: On mount: fetch `GET /api/v1/panics?status=PENDING,ACKNOWLEDGED,DISPATCHED` for initial state
    - [x] SUB: On `panic:new` event: prepend new panic to the list
    - [x] SUB: On `panic:updated` event: replace the matching panic in the list by id
    - [x] SUB: Expose `panics`, `loading`, `error`

- [x] TASK-09.2.3 — Build panic feed UI

    - [x] SUB: Create `client/src/pages/Dashboard.jsx`
    - [x] SUB: Create `client/src/components/PanicCard.jsx` — displays status, partner name, location, time received
    - [x] SUB: Render a list of `PanicCard` components from `usePanics`
    - [x] SUB: Highlight PENDING panics visually (colour, badge)
    - [x] SUB: Show loading skeleton while initial fetch is in progress
    - [x] SUB: Style with Tailwind CSS

---

### STORY-09.3 — Operator Can Manage Panic Status from the Dashboard

**As an** operator,
**I want** to acknowledge, dispatch, and resolve panics directly from the dashboard,
**so that** I can manage the full emergency lifecycle without leaving the UI.

- [ ] TASK-09.3.1 — Build status action buttons

    - [ ] SUB: Create `client/src/components/PanicActions.jsx`
    - [ ] SUB: Render the correct action button(s) based on current status: PENDING → Acknowledge, ACKNOWLEDGED → Dispatch, DISPATCHED → Resolve
    - [ ] SUB: On click: call the appropriate `POST /api/v1/panics/:id/[action]` endpoint
    - [ ] SUB: Show loading state on the button while request is in-flight
    - [ ] SUB: On success: local state updates via `panic:updated` Socket.io event (no manual re-fetch needed)
    - [ ] SUB: On error: display inline error with the server's error message

---

### STORY-09.4 — Operator Can View Panic Detail and Audit Log

**As an** operator,
**I want** to click into a panic event and see its full details and status history,
**so that** I have complete context when making decisions and for post-incident review.

- [ ] TASK-09.4.1 — Build panic detail view

    - [ ] SUB: Create `client/src/pages/PanicDetail.jsx`
    - [ ] SUB: Fetch `GET /api/v1/panics/:id` on mount
    - [ ] SUB: Display: status badge, partner name and type, external user ID, coordinates, metadata, claimed by (if set), created at
    - [ ] SUB: Include `PanicActions` component for status transitions
    - [ ] SUB: Subscribe to `panic:updated` events and refresh detail if the current panic is updated

- [ ] TASK-09.4.2 — Build audit log component

    - [ ] SUB: Create `client/src/components/AuditLog.jsx`
    - [ ] SUB: Fetch `GET /api/v1/panics/:id/logs` on mount
    - [ ] SUB: Render each log entry as a timeline row: previous status → new status, triggered by (operator name or partner name), timestamp
    - [ ] SUB: Differentiate `OPERATOR` and `PARTNER_CLAIM` triggers visually
    - [ ] SUB: Support pagination if log has more than 20 entries

---

## 🏆 EPIC-10 — End-to-End Integration & Testing

> Verify that all system components work together correctly, covering the critical paths from panic submission through to resolution and all notification fan-out.

---

### STORY-10.1 — Critical Paths Are Verified End-to-End

**As a** developer,
**I want** to verify the complete panic lifecycle works across all components,
**so that** I can deploy with confidence.

- [ ] TASK-10.1.1 — Verify panic ingestion end-to-end

    - [ ] SUB: Submit panic via Postman/curl as `PANIC_SOURCE` partner
    - [ ] SUB: Confirm 201 response with correct shape
    - [ ] SUB: Confirm `PanicEvent` row exists in DB with correct data
    - [ ] SUB: Confirm operator dashboard receives `panic:new` WebSocket event
    - [ ] SUB: Confirm all `RESPONDER_SYSTEM` webhook URLs receive the broadcast

- [ ] TASK-10.1.2 — Verify responder claim end-to-end

    - [ ] SUB: Claim the panic as a `RESPONDER_SYSTEM` partner
    - [ ] SUB: Confirm 200 response, status is `ACKNOWLEDGED`, `claimedByPartnerId` set
    - [ ] SUB: Confirm `PanicEventLog` row with `triggeredBy: PARTNER_CLAIM`
    - [ ] SUB: Confirm operator dashboard receives `panic:updated`
    - [ ] SUB: Confirm `PANIC_SOURCE` webhook receives status update
    - [ ] SUB: Confirm second claim attempt returns 409

- [ ] TASK-10.1.3 — Verify operator status transitions end-to-end

    - [ ] SUB: Dispatch the panic as an operator
    - [ ] SUB: Confirm `PanicEventLog` with `triggeredBy: OPERATOR`, `operatorId` set
    - [ ] SUB: Confirm `PANIC_SOURCE` and `RESPONDER_SYSTEM` both receive status update webhooks
    - [ ] SUB: Resolve the panic and confirm all downstream notifications fire
    - [ ] SUB: Attempt an illegal transition (e.g. resolve a PENDING) and confirm 400

- [ ] TASK-10.1.4 — Verify idempotency

    - [ ] SUB: Submit panic with an `idempotencyKey`
    - [ ] SUB: Submit same panic again with the same `idempotencyKey`
    - [ ] SUB: Confirm second response is 200 with original event (no duplicate row in DB)
    - [ ] SUB: Confirm only one `panic:new` was emitted

---

## 🏆 EPIC-11 — Deployment

> Deploy the ODERP-ly platform to Railway with a managed PostgreSQL instance, run production migrations, seed demo data, and confirm the full system is operational.

---

### STORY-11.1 — Application Deployed and Publicly Accessible on Railway

**As a** stakeholder,
**I want** the platform running on a live URL,
**so that** I can access the dashboard and observe the full system working.

- [ ] TASK-11.1.1 — Set up Railway project

    - [ ] SUB: Create Railway account and new project
    - [ ] SUB: Add a PostgreSQL plugin to the Railway project
    - [ ] SUB: Note the `DATABASE_URL` provided by Railway

- [ ] TASK-11.1.2 — Configure environment variables on Railway

    - [ ] SUB: Set `NODE_ENV=production`
    - [ ] SUB: Set `DATABASE_URL` from Railway PostgreSQL plugin
    - [ ] SUB: Set `JWT_SECRET` to a securely generated random string (min 32 chars)
    - [ ] SUB: Set `PORT` to `3000` (or use Railway's `$PORT` variable)

- [ ] TASK-11.1.3 — Configure build and start commands

    - [ ] SUB: Set Railway build command: `npm install && npm run build`
    - [ ] SUB: Set Railway start command: `npm start`
    - [ ] SUB: Confirm `@fastify/static` serves `client/dist` correctly in production
    - [ ] SUB: Confirm single process, single port deployment works

- [ ] TASK-11.1.4 — Run production migrations

    - [ ] SUB: Add a `migrate` script to `api/package.json`: `prisma migrate deploy`
    - [ ] SUB: Run migrations against the Railway PostgreSQL instance
    - [ ] SUB: Confirm all tables and indexes exist in the production database

- [ ] TASK-11.1.5 — Seed production demo data

    - [ ] SUB: Create a separate `api/prisma/seed.demo.js` for realistic demo data
    - [ ] SUB: Seed 2 partners: one `PANIC_SOURCE`, one `RESPONDER_SYSTEM`, both with `webhookUrl` set
    - [ ] SUB: Seed 1 operator with known demo credentials
    - [ ] SUB: Seed 3–5 `PanicEvent` records in various statuses (PENDING, ACKNOWLEDGED, DISPATCHED, RESOLVED) with realistic coordinates and metadata
    - [ ] SUB: Seed corresponding `PanicEventLog` entries for each non-PENDING event
    - [ ] SUB: Run seed against production and confirm data visible in dashboard

- [ ] TASK-11.1.6 — Smoke test production deployment

    - [ ] SUB: Open the Railway URL and confirm login page loads
    - [ ] SUB: Log in with demo operator credentials — confirm JWT issued and dashboard renders
    - [ ] SUB: Submit a test panic via the `PANIC_SOURCE` API key — confirm it appears live on dashboard
    - [ ] SUB: Claim the panic as `RESPONDER_SYSTEM` — confirm status updates in dashboard
    - [ ] SUB: Dispatch and resolve via dashboard — confirm audit log entries visible
    - [ ] SUB: Confirm WebSocket reconnects after navigating away and back

---

### STORY-11.2 — Repository and Documentation Are Demo-Ready

**As a** presenter,
**I want** a clean README and well-structured codebase,
**so that** I can walk through the project confidently during the demo.

- [ ] TASK-11.2.1 — Write README

    - [ ] SUB: Document project overview and tech stack
    - [ ] SUB: Document local setup steps (prerequisites, install, migrate, seed, dev)
    - [ ] SUB: Document all environment variables with descriptions
    - [ ] SUB: Document API endpoints with example curl commands for ingestion and claim
    - [ ] SUB: Document demo credentials (operator login, partner API keys)
    - [ ] SUB: Include architecture diagram (link to `.md` file in repo)

- [ ] TASK-11.2.2 — Clean up codebase for demo

    - [ ] SUB: Remove all `console.log` debug statements (replace with structured log where appropriate)
    - [ ] SUB: Confirm no hardcoded secrets anywhere in source
    - [ ] SUB: Confirm `.env` is in `.gitignore` and not committed
    - [ ] SUB: Review and tidy all route files for consistency
    - [ ] SUB: Final `git push` with clean commit history

---

## 🏆 EPIC-12 — Partner API Documentation

> Produce interactive, accurate API documentation so that partner systems (PANIC_SOURCE and RESPONDER_SYSTEM) can self-serve their integration without needing direct support from the ODERP-ly team.

---

### STORY-12.1 — API Documentation Is Auto-Generated and Served from the App

**As a** partner developer,
**I want** to read accurate, interactive API documentation at a stable URL,
**so that** I can understand every endpoint, request shape, and response shape without reading source code.

- [ ] TASK-12.1.1 — Install and register `@fastify/swagger` and Scalar

    - [ ] SUB: Install `@fastify/swagger` and `@scalar/fastify-api-reference` in `api/`
    - [ ] SUB: Register `@fastify/swagger` in `api/src/index.js` before any routes
    - [ ] SUB: Configure OpenAPI metadata: `title: "ODERP-ly API"`, `version`, `description`, `contact`
    - [ ] SUB: Register Scalar at `/docs` to serve the interactive UI
    - [ ] SUB: Confirm `/docs` loads in the browser and shows an empty spec

- [ ] TASK-12.1.2 — Define OpenAPI security schemes

    - [ ] SUB: Define `ApiKeyAuth` security scheme: `in: header`, `name: x-api-key`
    - [ ] SUB: Define `BearerAuth` security scheme: `type: http`, `scheme: bearer`, `bearerFormat: JWT`
    - [ ] SUB: Register both schemes under `components.securitySchemes` in the swagger config
    - [ ] SUB: Confirm both schemes appear in the Scalar UI security section

- [ ] TASK-12.1.3 — Annotate auth routes

    - [ ] SUB: Add OpenAPI schema to `POST /api/auth/login` — request body, 200 response with token + operator, 401 response
    - [ ] SUB: Tag the route with `"Auth"`

- [ ] TASK-12.1.4 — Annotate partner-facing panic routes

    - [ ] SUB: Add OpenAPI schema to `POST /api/v1/panics` — request body (with `idempotencyKey`), 201 response, 400/401/403/409 responses
    - [ ] SUB: Apply `ApiKeyAuth` security to this route
    - [ ] SUB: Add OpenAPI schema to `POST /api/v1/panics/:id/claim` — params, 200 response, 400/403/404/409 responses
    - [ ] SUB: Apply `ApiKeyAuth` security to this route
    - [ ] SUB: Tag both routes with `"Panics — Partner"`

- [ ] TASK-12.1.5 — Annotate operator-facing panic routes

    - [ ] SUB: Add OpenAPI schema to `GET /api/v1/panics` — query params (page, limit, status, partnerId), paginated response shape
    - [ ] SUB: Add OpenAPI schema to `GET /api/v1/panics/:id` — params, 200 response, 404 response
    - [ ] SUB: Add OpenAPI schema to `POST /api/v1/panics/:id/acknowledge` — params, 200 response, 400/404 responses
    - [ ] SUB: Add OpenAPI schema to `POST /api/v1/panics/:id/dispatch` — params, 200 response, 400/404 responses
    - [ ] SUB: Add OpenAPI schema to `POST /api/v1/panics/:id/resolve` — params, 200 response, 400/404 responses
    - [ ] SUB: Apply `BearerAuth` security to all operator panic routes
    - [ ] SUB: Tag all routes with `"Panics — Operator"`

- [ ] TASK-12.1.6 — Annotate log routes

    - [ ] SUB: Add OpenAPI schema to `GET /api/v1/panics/:id/logs` — query params, paginated response with inline operator and partner
    - [ ] SUB: Add OpenAPI schema to `GET /api/v1/panics/:id/logs/:logId` — params, 200 response, 404 response
    - [ ] SUB: Apply `BearerAuth` security to both routes
    - [ ] SUB: Tag both routes with `"Logs"`

- [ ] TASK-12.1.7 — Annotate partner routes

    - [ ] SUB: Add OpenAPI schema to `GET /api/v1/partners` — query params, paginated response with `_count`
    - [ ] SUB: Add OpenAPI schema to `GET /api/v1/partners/:id` — params, 200 response with `_count`, 404 response
    - [ ] SUB: Apply `BearerAuth` security to both routes
    - [ ] SUB: Tag both routes with `"Partners"`
    - [ ] SUB: Confirm `apiKeyHash` field is excluded from all partner response schemas

---

### STORY-12.2 — Documentation Includes Integration Guides for Partners

**As a** partner developer,
**I want** prose guides alongside the endpoint reference,
**so that** I understand the authentication flow, idempotency requirements, and webhook contract before writing any code.

- [ ] TASK-12.2.1 — Write PANIC_SOURCE integration guide

    - [ ] SUB: Document how to obtain and use an API key (`x-api-key` header)
    - [ ] SUB: Document the panic submission flow with a full example request and response
    - [ ] SUB: Document the `idempotencyKey` contract — what it is, how to generate it (UUID v4), retry behaviour
    - [ ] SUB: Document the webhook notification shape partners will receive on status changes
    - [ ] SUB: Document all status values and what each means from the partner's perspective

- [ ] TASK-12.2.2 — Write RESPONDER_SYSTEM integration guide

    - [ ] SUB: Document how to obtain and use a RESPONDER_SYSTEM API key
    - [ ] SUB: Document the webhook broadcast received on panic creation — shape, fields, how to parse it
    - [ ] SUB: Document the claim flow — when to call it, what happens when claim succeeds vs 409 conflict
    - [ ] SUB: Document the status update webhooks received after claiming a panic
    - [ ] SUB: Document `webhookUrl` registration requirement — what happens if it is not set

- [ ] TASK-12.2.3 — Expose and protect the `/docs` route appropriately

    - [ ] SUB: Decide on access policy for `/docs` — open (partner-accessible) or gated (internal only)
    - [ ] SUB: If open: confirm no sensitive internal details (e.g. operator routes) are exposed to partner audience
    - [ ] SUB: If gated: add a lightweight access control mechanism to the `/docs` route
    - [ ] SUB: Confirm `/docs` is excluded from Railway's public-facing routing if gated

---

## Summary

| Epic | Title | Stories | Tasks |
|---|---|---|---|
| EPIC-01 | Project Foundation & Monorepo Setup | 2 | 10 |
| EPIC-02 | Authentication | 2 | 7 |
| EPIC-03 | Panic Ingestion API | 1 | 4 |
| EPIC-04 | Responder Claim API | 1 | 4 |
| EPIC-05 | Operator Status Transition API | 4 | 5 |
| EPIC-06 | Read APIs | 3 | 6 |
| EPIC-07 | Real-Time WebSocket Gateway | 1 | 4 |
| EPIC-08 | Async Webhook Delivery Queue | 1 | 4 |
| EPIC-09 | Control Room Dashboard (Frontend) | 4 | 9 |
| EPIC-10 | End-to-End Integration & Testing | 1 | 4 |
| EPIC-11 | Deployment | 2 | 8 |
| EPIC-12 | Partner API Documentation | 2 | 10 |
| **Total** | | **24** | **75** |
