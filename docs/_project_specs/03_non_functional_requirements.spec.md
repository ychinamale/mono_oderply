# ODERP-ly — Non-Functional Requirements

---

## Consistency (CAP: CP)

ODERP-ly is a CP system. In an emergency platform, two operators acting on different beliefs about a panic's state is a life-safety failure — stale data is never acceptable.

**How we satisfy it:**
- PostgreSQL provides strong consistency by default — all writes either succeed fully or fail, never partially.
- Prisma transactions wrap every status transition and audit log write atomically. PanicEvent and PanicEventLog are always in sync.
- `SELECT FOR UPDATE` (pessimistic locking) on the claim endpoint ensures exactly one responder system wins a race to claim a panic. The loser gets a 409 — never a silent duplicate claim.
- When connectivity is degraded, the operator dashboard shows an error state rather than stale data.

---

## Idempotency

Partner systems have retry policies. If a panic submission times out, the partner will resend. Without idempotency, this creates duplicate events for the same emergency.

**How we satisfy it:**
- Every panic submission must include an `idempotencyKey` (UUID v4). This is a hard contract, not optional.
- A `UNIQUE` constraint on `PanicEvent.idempotencyKey` enforces exactly-once ingestion at the database level.
- On duplicate submission, ODERP-ly returns `200` with the original event — the partner gets confirmation without a new record being created.

---

## Latency

**Database layer:**
- Indexes on `PanicEvent.status`, `partnerId`, `claimedByPartnerId`, and `createdAt DESC` ensure the most common queries (active panics, panics by partner) are fast under load.

**Application layer:**
- Connection pooling keeps database connections warm. Without pooling, each request pays 20–100ms to open a TCP connection to PostgreSQL. With pooling, connection acquisition is near-instant.
- Fastify handlers are kept thin — validate first, reject bad requests before touching the database, one query where one will do.
- All database calls are `await`ed properly — no blocking the event loop.

**Real-time layer:**
- Socket.io delivers live updates to operator clients instantly. No polling. The dashboard reacts to `panic:new` and `panic:updated` events pushed from the server.

**Webhook delivery:**
- Outbound webhooks to partner systems are handled by an async in-process queue. Webhook delivery is completely decoupled from the request cycle — a slow or offline partner system has zero impact on ingestion or operator response time.

---

## Security

**Partner authentication:**
- API keys are hashed with SHA-256 before storage. Raw keys are never persisted.
- The `apiKeyGuard` hook validates every partner request before it reaches any business logic.
- Partner type (`PANIC_SOURCE` / `RESPONDER_SYSTEM`) is asserted at the route level — a PANIC_SOURCE cannot call the claim endpoint.

**Operator authentication:**
- Operators authenticate with email + bcrypt-hashed password and receive a signed JWT.
- The `jwtGuard` hook validates every operator request.
- WebSocket connections are authenticated at the handshake — unauthenticated clients are rejected before they can receive any events.

**Data protection:**
- `apiKeyHash` is never returned in any API response.
- `externalUserId` is flagged as PII and should be treated accordingly in any future data handling or retention policy work.

---

## Reliability

- Webhook delivery failures are logged but do not throw — a failed outbound notification never causes the originating request to fail.
- The async queue is in-process for MVP. It does not survive a process restart. This is an acceptable trade-off at this stage; a durable queue (e.g. Redis, BullMQ) is the natural next step before production scale.
- Idempotency keys ensure that if ODERP-ly itself fails mid-request and the partner retries, no duplicate data is created.
