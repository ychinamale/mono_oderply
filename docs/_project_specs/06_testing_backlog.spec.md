# ODERP-ly — Testing Backlog

**Scope:** Unit and integration tests derived from backlog v2. Organised by concern rather than epic, so related tests stay together regardless of which epic they came from.
**References:** Each test group references the backlog task(s) it covers.

---

## How to Read This Document

Each section covers a testable concern. Within each section, tests are grouped by the thing under test (a hook, an endpoint, a behaviour). Each test is a single `it()` or `test()` case — written as a clear assertion so you can copy it directly into your test file as a description string.

**Test types used:**
- **Unit** — isolated function, no DB, no HTTP
- **Integration** — real DB (test database), real Fastify instance, HTTP requests via `fastify.inject()`
- **E2E** — full stack, real HTTP, real Socket.io client

---

## 1. API Key Guard

> Covers: TASK-02.1.1, TASK-02.1.2, TASK-02.1.3

**Type:** Integration

- [x] `it('returns 401 when x-api-key header is missing')`
- [x] `it('returns 403 when x-api-key does not match any partner')`
- [x] `it('returns 403 when x-api-key is a valid key but belongs to wrong partner type')`
    - Specifically: PANIC_SOURCE key on a RESPONDER_SYSTEM-only route → 403
- [x] `it('attaches the resolved Partner record to request.partner on valid key')`
- [x] `it('attaches the correct partner — not just any partner — to request.partner')`
    - Two partners seeded; confirm the right one is resolved
- [x] `it('returns 403 with a descriptive message when partner type assertion fails')`

---

## 2. JWT Auth — Login Endpoint

> Covers: TASK-02.2.2, TASK-02.2.4

**Type:** Integration

- [x] `it('returns 401 when email does not exist')`
- [x] `it('returns 401 when password is incorrect')`
- [x] `it('returns 200 with a signed JWT and operator object on valid credentials')`
- [x] `it('returned JWT payload contains operatorId, email, and name')`
- [x] `it('does not return passwordHash in the response')`
- [x] `it('returns 400 when email field is not a valid email format')`
- [x] `it('returns 400 when password field is missing')`

---

## 3. JWT Guard

> Covers: TASK-02.2.3, TASK-02.2.4

**Type:** Integration

- [x] `it('returns 401 when Authorization header is missing')`
- [x] `it('returns 401 when Authorization header is present but token is malformed')`
- [x] `it('returns 401 when token is signed with a different secret')`
- [x] `it('returns 401 when token is expired')`
- [x] `it('attaches decoded operator payload to request.operator on valid token')`
- [x] `it('allows request to proceed to route handler when token is valid')`

---

## 4. Panic Submission — `POST /api/v1/panics`

> Covers: TASK-03.1.1, TASK-03.1.2

**Type:** Integration

- [x] `it('returns 401 when x-api-key header is missing')`
- [x] `it('returns 403 when API key belongs to a RESPONDER_SYSTEM partner')`
- [x] `it('returns 400 when externalUserId is missing')`
- [x] `it('returns 400 when latitude is missing')`
- [x] `it('returns 400 when longitude is missing')`
- [x] `it('returns 400 when idempotencyKey is missing')`
- [x] `it('returns 400 when latitude is out of range (e.g. 91)')`
- [x] `it('returns 400 when longitude is out of range (e.g. -181)')`
- [x] `it('returns 201 with the created PanicEvent on valid request')`
- [x] `it('created PanicEvent has status PENDING')`
- [x] `it('created PanicEvent has partnerId matching the authenticated partner')`
- [x] `it('response includes partner object inline — not just partnerId')`
- [x] `it('response does not include apiKeyHash on the inline partner')`
- [x] `it('metadata is stored and returned when provided')`
- [x] `it('metadata is null when not provided')`

**Idempotency:**
- [x] `it('returns 200 with the original event when idempotencyKey is submitted a second time')`
- [x] `it('does not create a second PanicEvent row on duplicate idempotencyKey')`
- [x] `it('returns a different event for a different idempotencyKey')`

---

## 5. Responder Claim — `POST /api/v1/panics/:id/claim`

> Covers: TASK-04.1.1, TASK-04.1.2, TASK-04.1.4

**Type:** Integration

- [x] `it('returns 403 when API key belongs to a PANIC_SOURCE partner')`
- [x] `it('returns 404 when panic id does not exist')`
- [x] `it('returns 409 when panic has already been claimed by another partner')`
- [x] `it('returns 400 when panic status is not PENDING')`
    - Test with ACKNOWLEDGED, DISPATCHED, and RESOLVED panics
- [x] `it('returns 200 on successful claim')`
- [x] `it('sets status to ACKNOWLEDGED after successful claim')`
- [x] `it('sets claimedByPartnerId to the claiming partner after successful claim')`
- [x] `it('creates a PanicEventLog entry with triggeredBy PARTNER_CLAIM')`
- [x] `it('PanicEventLog entry has partnerId set and operatorId null')`
- [x] `it('PanicEventLog entry records previousStatus as PENDING and newStatus as ACKNOWLEDGED')`
- [x] `it('response includes claimedByPartner object inline')`

**Race condition (pessimistic locking):**
- [x] `it('when two claims are submitted concurrently, exactly one succeeds and one receives 409')`
    - Use `Promise.all` to fire two simultaneous requests; assert DB has exactly one log entry and one claimedByPartnerId

---

## 6. State Machine — Status Transitions

> Covers: TASK-05.1.1, TASK-05.2.1, TASK-05.3.1, TASK-05.4.1

**Type:** Integration

### `POST /api/v1/panics/:id/acknowledge`

- [x] `it('returns 401 when JWT is missing')`
- [x] `it('returns 404 when panic id does not exist')`
- [x] `it('returns 400 when panic status is not PENDING')`
    - Test with ACKNOWLEDGED, DISPATCHED, RESOLVED
- [x] `it('returns 200 and sets status to ACKNOWLEDGED')`
- [x] `it('creates a PanicEventLog with triggeredBy OPERATOR and operatorId set')`
- [x] `it('PanicEventLog has operatorId set and partnerId null')`

### `POST /api/v1/panics/:id/dispatch`

- [x] `it('returns 400 when panic status is not ACKNOWLEDGED')`
    - Test with PENDING, DISPATCHED, RESOLVED
- [x] `it('returns 200 and sets status to DISPATCHED')`
- [x] `it('creates a PanicEventLog with triggeredBy OPERATOR')`

### `POST /api/v1/panics/:id/resolve`

- [x] `it('returns 400 when panic status is not DISPATCHED')`
    - Test with PENDING, ACKNOWLEDGED, RESOLVED
- [x] `it('returns 200 and sets status to RESOLVED')`
- [x] `it('creates a PanicEventLog with triggeredBy OPERATOR')`

### Shared transition assertions

- [x] `it('every transition response includes partner inline')`
- [x] `it('every transition response does not include apiKeyHash')`
- [x] `it('assertTransition returns a 400 with a descriptive message on any invalid transition')`
    - Message format: `"Cannot [action] a panic with status [currentStatus]"`

---

## 7. Read APIs

> Covers: TASK-06.1.1, TASK-06.1.2, TASK-06.2.1, TASK-06.2.2, TASK-06.3.1, TASK-06.3.2

**Type:** Integration

### `GET /api/v1/panics`

- [x] `it('returns 401 when JWT is missing')`
- [x] `it('returns paginated results with data and pagination fields')`
- [x] `it('pagination.total reflects the actual count of matching records')`
- [x] `it('defaults to page 1 and limit 20 when query params are omitted')`
- [x] `it('filters by status when status query param is provided')`
- [x] `it('filters by partnerId when partnerId query param is provided')`
- [x] `it('each panic in data includes partner inline')`
- [x] `it('does not include apiKeyHash on any inline partner')`

### `GET /api/v1/panics/:id`

- [x] `it('returns 401 when JWT is missing')`
- [x] `it('returns 404 when panic id does not exist')`
- [x] `it('returns the panic with partner and claimedByPartner inline')`
- [x] `it('claimedByPartner is null when panic has not been claimed')`
- [x] `it('claimedByPartner is populated when panic has been claimed')`

### `GET /api/v1/panics/:id/logs`

- [x] `it('returns 401 when JWT is missing')`
- [x] `it('returns 404 when parent panic does not exist')`
- [x] `it('returns logs in ascending createdAt order')`
- [x] `it('each log entry includes operator inline when triggeredBy is OPERATOR')`
- [x] `it('each log entry includes partner inline when triggeredBy is PARTNER_CLAIM')`
- [x] `it('operator is null when triggeredBy is PARTNER_CLAIM')`
- [x] `it('partner is null when triggeredBy is OPERATOR')`
- [x] `it('returns paginated results with correct pagination metadata')`

### `GET /api/v1/panics/:id/logs/:logId`

- [x] `it('returns 404 when logId does not exist')`
- [x] `it('returns 404 when logId exists but belongs to a different panic')`
- [x] `it('returns the log entry with operator or partner inline')`

### `GET /api/v1/partners`

- [x] `it('returns 401 when JWT is missing')`
- [x] `it('returns paginated list with _count.panicEvents on each partner')`
- [x] `it('_count.activePanicEvents excludes RESOLVED panics')`
- [x] `it('filters by type when type query param is provided')`
- [x] `it('does not include apiKeyHash on any partner in the response')`

### `GET /api/v1/partners/:id`

- [x] `it('returns 401 when JWT is missing')`
- [x] `it('returns 404 when partner does not exist')`
- [x] `it('returns partner with _count aggregations')`
- [x] `it('does not include apiKeyHash')`

---

## 8. WebSocket Gateway

> Covers: TASK-07.1.2, TASK-07.1.3, TASK-07.1.4

**Type:** Integration / E2E

- [x] `it('rejects connection when no auth token is provided')`
- [x] `it('rejects connection when auth token is invalid')`
- [x] `it('accepts connection when auth token is a valid operator JWT')`
- [x] `it('emits panic:new to connected operator clients when a panic is submitted')`
- [x] `it('panic:new payload matches the shape of GET /api/v1/panics/:id response')`
- [x] `it('emits panic:updated to connected operator clients when a panic is acknowledged')`
- [x] `it('emits panic:updated to connected operator clients when a panic is claimed')`
- [x] `it('emits panic:updated to connected operator clients when a panic is dispatched')`
- [x] `it('emits panic:updated to connected operator clients when a panic is resolved')`
- [x] `it('does not emit panic:updated to clients that connected with an invalid token')`

---

## 9. Webhook Queue

> Covers: TASK-08.1.1, TASK-08.1.2, TASK-08.1.4

**Type:** Unit (queue logic) + Integration (trigger points)

### Queue behaviour

- [x] `it('enqueue() adds a job to the queue')`
- [x] `it('jobs are processed in FIFO order')`
- [x] `it('a failed webhook delivery does not throw or crash the queue')`
- [x] `it('queue continues processing subsequent jobs after a delivery failure')`
- [x] `it('a job with no webhookUrl is skipped without throwing')`

### Trigger points (use a mock/spy on the queue's enqueue function)

- [x] `it('enqueues a broadcast to all RESPONDER_SYSTEM partners on panic creation')`
- [x] `it('does not enqueue a broadcast to PANIC_SOURCE partners on panic creation')`
- [x] `it('enqueues a status update to PANIC_SOURCE only on claim')`
- [x] `it('does not enqueue a status update to RESPONDER_SYSTEM on acknowledge (no claimer)')`
- [x] `it('enqueues a status update to both PANIC_SOURCE and claimedByPartner on dispatch')`
- [x] `it('enqueues a status update to both PANIC_SOURCE and claimedByPartner on resolve')`
- [x] `it('skips enqueue for a partner with no webhookUrl and logs a warning')`

---

## 10. Data Integrity

> Covers: TASK-03.1.2, TASK-04.1.2, TASK-05.4.1 — cross-cutting DB correctness

**Type:** Integration

- [ ] `it('idempotencyKey UNIQUE constraint prevents duplicate PanicEvent rows at the DB level')`
    - Insert two rows with the same key directly via Prisma; expect a constraint error
- [ ] `it('PanicEvent and PanicEventLog are always written together — never one without the other')`
    - Simulate a transaction failure midway; confirm neither partial write persists
- [ ] `it('every PanicEventLog has exactly one of operatorId or partnerId set — never both, never neither')`
    - Assert across all log entries created by tests
- [ ] `it('claimedByPartnerId always references a RESPONDER_SYSTEM partner — never a PANIC_SOURCE')`
- [ ] `it('apiKeyHash is never returned by any API endpoint')`
    - Exhaustively check all response shapes across all partner-returning endpoints

---

## 11. Frontend — Auth Flow

> Covers: TASK-09.1.1, TASK-09.1.2

**Type:** Unit (React Testing Library)

- [ ] `it('renders email and password inputs')`
- [ ] `it('displays an inline error message on failed login')`
- [ ] `it('redirects to dashboard on successful login')`
- [ ] `it('ProtectedRoute redirects to /login when no token is in AuthContext')`
- [ ] `it('ProtectedRoute renders children when token is present in AuthContext')`
- [ ] `it('logout clears token from AuthContext and redirects to /login')`

---

## 12. Frontend — Panic Feed

> Covers: TASK-09.2.1, TASK-09.2.2, TASK-09.2.3

**Type:** Unit (React Testing Library)

- [ ] `it('renders a PanicCard for each panic in the initial fetch response')`
- [ ] `it('prepends a new PanicCard when panic:new socket event is received')`
- [ ] `it('updates the correct PanicCard when panic:updated socket event is received')`
- [ ] `it('shows a loading skeleton while the initial fetch is in progress')`
- [ ] `it('shows an error state when the initial fetch fails')`
- [ ] `it('PENDING panics are visually distinct from other statuses')`
- [ ] `it('disconnects the socket on component unmount')`

---

## 13. Frontend — Status Actions

> Covers: TASK-09.3.1

**Type:** Unit (React Testing Library)

- [ ] `it('renders Acknowledge button for a PENDING panic')`
- [ ] `it('renders Dispatch button for an ACKNOWLEDGED panic')`
- [ ] `it('renders Resolve button for a DISPATCHED panic')`
- [ ] `it('renders no action button for a RESOLVED panic')`
- [ ] `it('button shows loading state while request is in-flight')`
- [ ] `it('displays inline error when the API returns an error response')`
- [ ] `it('calls the correct endpoint for each action button')`

---

## 14. Frontend — Panic Detail and Audit Log

> Covers: TASK-09.4.1, TASK-09.4.2

**Type:** Unit (React Testing Library)

- [ ] `it('renders status badge, partner name, coordinates, and createdAt')`
- [ ] `it('renders claimedByPartner name when panic has been claimed')`
- [ ] `it('does not render claimedByPartner section when panic is unclaimed')`
- [ ] `it('renders each log entry as a timeline row')`
- [ ] `it('log entries triggered by OPERATOR show operator name')`
- [ ] `it('log entries triggered by PARTNER_CLAIM show partner name')`
- [ ] `it('updates detail view when panic:updated event is received for the current panic')`
- [ ] `it('does not update detail view when panic:updated event is for a different panic')`

---

## 15. Security

> Cross-cutting — derived from auth tasks and data handling concerns throughout

**Type:** Integration

- [ ] `it('apiKeyHash is not present in any response body across all endpoints')`
- [ ] `it('operator passwordHash is not present in any response body')`
- [ ] `it('a PANIC_SOURCE partner cannot access any operator-facing endpoint')`
    - Attempt each JWT-guarded route using an API key instead of a JWT → 401
- [ ] `it('a RESPONDER_SYSTEM partner cannot submit a panic')`
    - RESPONDER_SYSTEM key on POST /api/v1/panics → 403
- [ ] `it('an unauthenticated request cannot access any protected endpoint')`
    - Exhaustively test every route with no auth header
- [ ] `it('JWT signed with wrong secret is rejected')`
- [ ] `it('WebSocket connection with a PANIC_SOURCE API key (not a JWT) is rejected')`

---

## Summary

| Section | Tests | Type |
|---|---|---|
| 1. API Key Guard | 6 | Integration |
| 2. JWT Login | 7 | Integration |
| 3. JWT Guard | 6 | Integration |
| 4. Panic Submission | 15 | Integration |
| 5. Responder Claim | 12 | Integration |
| 6. State Machine | 17 | Integration |
| 7. Read APIs | 22 | Integration |
| 8. WebSocket Gateway | 10 | Integration / E2E |
| 9. Webhook Queue | 12 | Unit + Integration |
| 10. Data Integrity | 5 | Integration |
| 11. Frontend — Auth | 6 | Unit |
| 12. Frontend — Panic Feed | 7 | Unit |
| 13. Frontend — Status Actions | 7 | Unit |
| 14. Frontend — Detail & Logs | 8 | Unit |
| 15. Security | 7 | Integration |
| **Total** | **147** | |

---

## 16. TDD Workflow — The Mental Model

TDD has three steps, repeated in a tight loop: **Red → Green → Refactor.**

**Red** — Write the test first. It must fail. A failing test is proof the behaviour doesn't exist yet and that your test is actually checking something real.

**Green** — Write the minimum code to make the test pass. No more. Resist the urge to build ahead.

**Refactor** — Clean up the implementation now that it's covered. The test suite is your safety net.

Each Red → Green → Refactor loop maps to a **single commit**, or at most two (one for the failing test, one for the passing implementation). This creates a git history that reads as a series of verified, intentional decisions — which is exactly what a code reviewer wants to see.

**What this means for ODERP-ly specifically:**

Pick one test from this backlog. Write it. Watch it fail. Implement only what's needed to pass it. Commit. Move to the next test. Never write implementation code without a failing test in front of it. Never write more than one test at a time.

The discipline is in the constraint: small loops, small commits, always green before moving on.

---

## 17. TDD Workflow — In Practice

### Branch strategy

```
main
  └── develop          ← integration branch; PRs merge here first
        └── feature/   ← your working branch per task
```

One feature branch per backlog **task** (not per sub-task, not per epic). Named after the task ID.

### The loop, step by step

**1. Create your feature branch**
```bash
git checkout develop
git pull origin develop
git checkout -b feature/TASK-02.1.1-api-key-guard
```

**2. Write one failing test**

Open (or create) the test file for the thing you're building. Write the first `it()` from the testing backlog. Run the suite — confirm it fails with a clear reason, not a syntax error.

```bash
npm test --workspace=api
# Expected: 1 failing — "returns 401 when x-api-key header is missing"
```

**3. Commit the failing test**
```bash
git add api/src/hooks/apiKeyGuard.test.js
git commit -m "test(auth): returns 401 when x-api-key header is missing [RED]"
```

**4. Write the minimum implementation to pass**

Write only what makes that one test green. Nothing else.

```bash
npm test --workspace=api
# Expected: 1 passing
```

**5. Commit the passing implementation**
```bash
git add api/src/hooks/apiKeyGuard.js
git commit -m "feat(auth): return 401 when x-api-key header is missing [GREEN]"
```

**6. Refactor if needed, then commit**

If the implementation is already clean, skip this. If you need to tidy it up:
```bash
git add api/src/hooks/apiKeyGuard.js
git commit -m "refactor(auth): extract header check into guard preHandler"
```

**7. Repeat for the next test in the same task**

Continue the Red → Green → Refactor loop for every test that belongs to `TASK-02.1.1`. Each loop produces one or two commits.

**8. When all tests for the task are green, push the branch**
```bash
git push -u origin feature/TASK-02.1.1-api-key-guard
```

**9. Open a Pull Request into `develop`**

Title format: `[TASK-02.1.1] Implement apiKeyGuard preHandler hook`

In the PR description, link to the task in the backlog and briefly note what was implemented and what the tests cover. The reviewer will see a commit history that tells the full Red → Green story.

---

### Commit message convention

```
<type>(<scope>): <description> [RED|GREEN|REFACTOR]

Types:  test | feat | refactor | fix | chore
Scope:  auth | panics | claim | transitions | reads | websocket | webhooks | frontend
```

Examples:
```bash
git commit -m "test(claim): returns 409 when panic is already claimed [RED]"
git commit -m "feat(claim): return 409 on duplicate claim attempt [GREEN]"
git commit -m "test(claim): exactly one claim succeeds under concurrent requests [RED]"
git commit -m "feat(claim): add SELECT FOR UPDATE pessimistic lock on claim [GREEN]"
git commit -m "refactor(claim): extract lock logic into claimPanic service function"
```

---

### Full example — TASK-02.1.1 from first commit to PR

```bash
# Start
git checkout develop && git pull origin develop
git checkout -b feature/TASK-02.1.1-api-key-guard

# Test 1
git commit -m "test(auth): returns 401 when x-api-key header is missing [RED]"
git commit -m "feat(auth): return 401 when x-api-key header is missing [GREEN]"

# Test 2
git commit -m "test(auth): returns 403 when x-api-key does not match any partner [RED]"
git commit -m "feat(auth): hash key and query partner table, return 403 if not found [GREEN]"

# Test 3
git commit -m "test(auth): returns 403 when partner type does not match required type [RED]"
git commit -m "feat(auth): add requiredType assertion to apiKeyGuard [GREEN]"

# Test 4
git commit -m "test(auth): attaches resolved Partner to request.partner on valid key [RED]"
git commit -m "feat(auth): attach partner to request after successful validation [GREEN]"

# Test 5
git commit -m "test(auth): attaches the correct partner when multiple partners exist [RED]"
git commit -m "feat(auth): confirm hash lookup is partner-specific [GREEN]"

# Test 6
git commit -m "test(auth): returns descriptive 403 message on type assertion failure [RED]"
git commit -m "feat(auth): include partner type in 403 error message [GREEN]"
git commit -m "refactor(auth): consolidate guard error responses into single helper"

# Push and open PR
git push -u origin feature/TASK-02.1.1-api-key-guard
# Open PR: [TASK-02.1.1] Implement apiKeyGuard preHandler hook → develop
```