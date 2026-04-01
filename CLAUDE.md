# ODERP-ly — On-Demand Emergency Response Platform

## Stack
- Backend: Fastify, Prisma, PostgreSQL, Socket.io, Zod
- Frontend: React + Vite, Tailwind CSS
- Language: TypeScript throughout (strict mode, ESM)
- Node: 22.13.0 (pinned)
- Monorepo: npm workspaces (api.typescript/, client/, shared/)
- Auth: @fastify/jwt (operators), API key guard (partners)

## Project structure
- tsconfig.base.json     — shared TS config; api.typescript/, client/, shared/ each extend it
- api.typescript/src/routes/        — Fastify route modules
- api.typescript/src/hooks/         — preHandler guards (apiKeyGuard, jwtGuard)
- api.typescript/src/lib/           — shared utilities (assertTransition, webhookQueue)
- api.typescript/prisma/            — schema, migrations, seed files
- client/src/pages/      — React pages
- client/src/components/ — React components
- client/src/hooks/      — custom React hooks
- shared/src/            — Zod schemas and types shared between api and client

## Key conventions
- TypeScript throughout — all source files are .ts (api.typescript/, shared/) or .ts/.tsx (client/)
- ESM module system — write .ts source files; use .js extensions in relative imports for the api.typescript/ workspace (NodeNext module resolution maps .js → .ts for both type checking and IDE go-to-definition, while the compiled output correctly references .js files). For client/ (Vite), use .tsx/.ts extensions directly. Never invent a different extension convention without explicit instruction.
- Strict mode is on across all workspaces via tsconfig.base.json
- Prisma transactions wrap every status transition + audit log write
- SELECT FOR UPDATE on the claim endpoint (pessimistic locking)
- idempotencyKey is a hard contract on POST /api/v1/panics
- Never return apiKeyHash in any response
- Never return passwordHash in any response (operator login or any other route)
- externalUserId is PII — treat with the same care as apiKeyHash
- triggeredBy on PanicEventLog is always OPERATOR or PARTNER_CLAIM —
  exactly one of operatorId or partnerId is populated, never both, never neither

## State machine
PENDING → ACKNOWLEDGED   (operator acknowledge, or RESPONDER_SYSTEM claim)
ACKNOWLEDGED → DISPATCHED  (operator only)
DISPATCHED → RESOLVED      (operator only)

## Webhook fan-out
- On panic CREATED: broadcast to ALL RESPONDER_SYSTEM partners
- On CLAIM (PENDING → ACKNOWLEDGED via partner): webhook to PANIC_SOURCE only
- On operator status transitions: webhook to PANIC_SOURCE + claimedByPartner (if exists)
- Webhook failures must be logged but must never throw — delivery is non-blocking
- The webhook queue is in-process only (MVP). Do not introduce Redis or BullMQ.

## Outbound webhook payloads
Use these exact event names when calling `webhookQueue.enqueue()`:
- `{ event: "panic.created", panic: <panic object> }` — on panic creation
- `{ event: "panic.status_updated", panic: <panic object> }` — on any status change

## API surface

| Method | Path                           | Auth        | Notes                                       |
|--------|--------------------------------|-------------|---------------------------------------------|
| POST   | /api/auth/login                | none        | Returns JWT                                 |
| POST   | /api/v1/panics                 | apiKeyGuard | PANIC_SOURCE only; idempotencyKey required  |
| POST   | /api/v1/panics/:id/claim       | apiKeyGuard | RESPONDER_SYSTEM only; SELECT FOR UPDATE    |
| GET    | /api/v1/panics                 | jwtGuard    | Paginated; filterable by status, partnerId  |
| GET    | /api/v1/panics/:id             | jwtGuard    |                                             |
| POST   | /api/v1/panics/:id/acknowledge | jwtGuard    | Operator only                               |
| POST   | /api/v1/panics/:id/dispatch    | jwtGuard    | Operator only                               |
| POST   | /api/v1/panics/:id/resolve     | jwtGuard    | Operator only                               |
| GET    | /api/v1/panics/:id/logs        | jwtGuard    | Paginated audit trail                       |
| GET    | /api/v1/panics/:id/logs/:logId | jwtGuard    |                                             |
| GET    | /api/v1/partners               | jwtGuard    | Paginated; filterable by type               |
| GET    | /api/v1/partners/:id           | jwtGuard    |                                             |

## Partner type rules
- PANIC_SOURCE can submit panics (POST /api/v1/panics). Cannot claim.
- RESPONDER_SYSTEM can claim panics (POST /api/v1/panics/:id/claim). Cannot submit.
- Wrong partner type → 403

## Idempotency
- idempotencyKey is required on POST /api/v1/panics (UUID v4)
- Duplicate key from the same partner → 200 with the original panic (not an error)
- Duplicate key from a different partner → 409

## WebSocket events
- `panic:new` — emitted after every successful POST /api/v1/panics
- `panic:updated` — emitted after every status transition (claim, acknowledge, dispatch, resolve)
- Auth: JWT validated at handshake
- Payload mirrors the REST response shape for the panic

## Response shapes
When implementing a route or writing a response assertion in a test, consult
docs/_project_specs/04_example_responses.spec.md for the expected JSON shape,
pagination structure, and WebSocket payload format.

## Testing backlog
147 tests are pre-specified in docs/_project_specs/06_testing_backlog.spec.md.
Before writing a new test, check that file — the test may already be defined there.
Implement tests in the order they appear in the backlog.

## Backlog workflow

The backlog is at docs/_project_specs/00_oderply_backlog_v2.md. Treat it as
the issue tracker for the entire project.

Before starting any task, run `git status` and check for uncommitted or untracked
files. If any exist, prepare the commit message and present it to the user for
confirmation before committing and pushing.

Before every commit (not just at the start of a task), run `git status` to confirm
you are staging all changed files — including package-lock.json, generated files, or
anything else modified as a side effect of the work. Never stage files by name alone;
always verify with `git status` first so nothing is accidentally omitted.

When asked "what is the next task":
1. Read the backlog
2. Find the first unchecked task (`- [ ]`) in order, skipping any checked (`- [x]`) tasks
3. Present the epic, story, task, and its sub-tasks clearly
4. Before writing any test, search docs/_project_specs/06_testing_backlog.spec.md for
   sections that reference the current TASK ID (e.g. `> Covers: TASK-02.1.1`). Those
   pre-specified tests are the TDD cases to implement — use them in the order they appear,
   one at a time. Being pre-specified does not exempt them from the vertical slice rule:
   write one test, make it pass, refactor if needed, commit all three phases, then and
   only then move on to the next test.
5. Implement it following the TDD cycle and git workflow in this file,
   and referencing section 17 of docs/_project_specs/06_testing_backlog.spec.md
   for the step-by-step development loop and branching strategy

When a task is complete:
1. Before committing, give a brief note on how to verify the task is done — commands
   to run, things to check. Sacrifice grammar for concision. Await confirmation.
2. Commit all implementation changes and push to remote.
3. Mark the task complete in the backlog: check the task checkbox AND all sub-task
   checkboxes (`- [x]`) in docs/_project_specs/00_oderply_backlog_v2.md.
4. Commit the backlog update and push.
5. Open a PR: run `npm run lint` first, fix any errors and commit the fixes, then create the PR.

Do NOT open a PR before the backlog has been updated, committed, and pushed.
Do NOT ask about marking a task complete before the work is committed and pushed.

## Git workflow
- Branch from develop: feature/TASK-XX-short-description
- Commit format: type(scope): description [RED|GREEN|REFACTOR]
- One PR per task, reviewed before merging into develop
- Never commit .env files

## Linting

Never run `npm run lint` during task implementation — it wastes tokens and the output is
irrelevant until the work is done.

Lint only as the first step of opening a PR (step 5 above):
1. `npm run lint`
2. Fix any errors
3. Commit the fixes (if any)
4. Then create the PR

## Useful commands
- npm run lint              — lint entire project
- npm test --workspace=api.typescript  — run api tests
- npm run dev               — start api + client concurrently

---

## TDD Cycle — Follow This on Every Implementation Task

IMPORTANT: Prefer retrieval-led reasoning over pre-training-led reasoning.
Write a failing test before any implementation. Every time. No exceptions.

Follow this sequence strictly. Do not skip steps.

### What is permitted before the first RED (infrastructure only)

Sometimes a test file cannot compile until a module exists to import. In that case,
create the minimum scaffolding to make the file compile — nothing more.

**Permitted before RED:**
- Creating files and directories
- Type definitions and module augmentations
- Framework/plugin registration (e.g. `app.register(jwt, ...)`)
- App factory skeleton (creates instance, registers plugins, returns app)
- Function/route stubs that export a name but contain no logic — handlers must
  return `reply.code(501).send()` or nothing; guards must be a no-op

**Not permitted before RED — these belong in GREEN:**
- Validation logic (Zod parsing, field checks)
- Database queries
- Password comparison, hashing, token signing
- Any conditional branching that affects the response

If the plan contains a detailed design for a module, that design is a reference for
the GREEN phase only. Do not transcribe it into code before the first RED.

### Test quality rules
- Tests verify behavior through public interfaces, not implementation details.
  A test that breaks during a refactor without behavior changing is a bad test.
- For good/bad test examples see .claude/skills/tdd/tests.md.

### Anti-pattern: horizontal slicing
DO NOT write multiple tests up front, then implement them all.
This is horizontal slicing — it produces tests that verify imagined behavior
and are insensitive to real changes.

Correct approach — vertical slices, one at a time:
  RED→GREEN: test1→impl1
  RED→GREEN: test2→impl2
  ...

### RED
Write one failing test only. Run the test suite and confirm it fails with a
meaningful error — not a syntax error. Stop here. Do not write implementation.

    npm test --workspace=api
    # Expected: test fails with a clear assertion error

Commit:

    git commit -m "test(scope): description [RED]"

### GREEN
Write the minimum implementation to make that one test pass. Nothing more.
Hardcoded return values are not valid — implement the real mechanism the test exercises.

For every line or block you add, apply this check: would removing it cause the current
test to fail and at the same time not cause future tests to pass? If the answer to
that question is no, it may be too broad to go in this GREEN. This prevents
implementations that are broad enough to make future tests pass for free — which would
rob those tests of a genuine RED phase and hide gaps in behaviour. The implementation must target the precise behaviour exercised by the current test.

Run the suite and confirm it passes.

    npm test --workspace=api
    # Expected: that one test passes, all others still pass

Commit:

    git commit -m "feat(scope): description [GREEN]"

### REFACTOR
Clean up the implementation if needed. The test suite must remain green after
every refactor. Skip this phase if the implementation is already clean.
See .claude/skills/tdd/refactoring.md for refactor candidates to look for.

Commit (only if changes were made):

    git commit -m "refactor(scope): description"

Repeat this loop for every test. The complete cycle for a single test is:

  1. RED — write one test, confirm it fails with a meaningful assertion error, commit
  2. GREEN — write minimum implementation to pass that test, confirm it passes, commit
  3. REFACTOR — clean up if needed, confirm still green, commit (skip if nothing to clean)
  4. Only after all three phases are committed, move on to the next test

Never write more than one test at a time. Never write implementation code without a
failing test in front of it. Never start the next RED until the current cycle (RED +
GREEN + REFACTOR) is fully committed.

When designing new modules, see .claude/skills/tdd/interface-design.md and
.claude/skills/tdd/deep-modules.md.

---

## Prisma Schema Changes — Follow This Process Every Time

PanicEvent must have DB indexes on: `status`, `partnerId`, `claimedByPartnerId`, `createdAt DESC`.
Add these in the migration when the PanicEvent model is first created.

1. Edit `api.typescript/prisma/schema.prisma` with the required change
2. Run `npx prisma migrate dev --name <descriptive-name>` from `api.typescript/`
3. Confirm the migration file was created in `api.typescript/prisma/migrations/`
4. Run `npx prisma generate` to update the client
5. Confirm `@prisma/client` reflects the change before proceeding
6. Never edit migration files manually after they have been applied

---

## New Fastify Routes — Follow These Conventions Every Time

Every new Fastify route must:

1. Apply the correct preHandler:
   - `apiKeyGuard` for partner-facing routes (ingestion, claim)
   - `jwtGuard` for operator-facing routes (all others)
2. Define a Zod schema for request body and/or query params
3. Validate input before any DB call — reject bad requests early
4. Use `prisma.$transaction` when writing more than one table
5. Include `partner: true` or `claimedByPartner: true` in Prisma includes
   where applicable
6. Never return `apiKeyHash` in any response — exclude it explicitly
7. Emit a Socket.io event after every state-changing write
8. Enqueue webhook notifications via `webhookQueue.enqueue()` after state
   changes, following the fan-out rules above
9. Return correct HTTP status codes (see also docs/_project_specs/04_example_responses.spec.md):
   - 201 for creates
   - 200 for updates
   - 400 for invalid transitions or bad input
   - 401 for missing/invalid auth
   - 403 for wrong partner type
   - 404 for not found
   - 409 for conflicts (duplicate claim, duplicate idempotencyKey)

---

## Spec file changes

If a file in docs/_project_specs/ is modified or a new one is added, read it
and apply the inline-vs-reference framework from docs/01_AGENTIC_DEV_SETUP.md
to determine whether this file (CLAUDE.md) needs updating. Do not wait to be asked.

---

## Skills folder

If a file in .claude/skills/ is modified or a new one is added, read it
and apply the inline-vs-reference framework from docs/01_AGENTIC_DEV_SETUP.md
to determine whether this file (CLAUDE.md) needs updating. Do not wait to be asked.

---

## Plan Mode

- Make the plan brief and to the point. Sacrifice some grammar to maximize concision.
- At the end of each plan give me a list of unresolved questions to answer, if any. Also ask questions aimed to help address possible edge cases.

---

## Agent Mode

- Make explanations and summaries brief and to the point. Sacrifice some grammar to maximize concision.

---

## Comments

- Only add comments when absolutely necessary. Necessary comments are those that talk about WHY something was done. Comments that tell the reader WHAT something is/does or HOW it does something are not useful.