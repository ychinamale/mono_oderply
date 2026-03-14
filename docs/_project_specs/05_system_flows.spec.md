# ODERP-ly — System Flows

---

## 1. Panic Ingestion

A PANIC_SOURCE partner POSTs to `/api/v1/panics` with their API key in the header. The API Key Guard hashes the key and validates it against the Partner table. If valid, the Panic Module writes the event to PostgreSQL — the idempotency key ensures a retried request never creates a duplicate. A 201 is returned immediately to the partner. In parallel, two things happen asynchronously: Socket.io emits `panic:new` to all connected operator clients, and the Webhook Queue broadcasts the event payload to every RESPONDER_SYSTEM partner via their registered webhook URL.

---

## 2. Responder Claim

A RESPONDER_SYSTEM partner POSTs to `/api/v1/panics/:id/claim` with their API key. The API Key Guard validates the key and asserts the partner type is `RESPONDER_SYSTEM`. The Panic Module acquires a `SELECT FOR UPDATE` lock on the PanicEvent row — if two responder systems race to claim simultaneously, exactly one wins and the other receives a 409. Inside a single atomic transaction, the status moves to `ACKNOWLEDGED`, `claimedByPartnerId` is set, and a `PanicEventLog` entry is written with `triggeredBy: PARTNER_CLAIM`. Socket.io emits `panic:updated` to operator clients, and the Webhook Queue sends a targeted status update to the PANIC_SOURCE partner.

---

## 3. Operator Login

An operator POSTs credentials to `/api/auth/login`. The Auth Module queries the Operator table, compares the password against the bcrypt hash, and — if valid — signs and returns a JWT. All subsequent operator requests carry this token as a Bearer header. The JWT Guard validates it on every request before any business logic runs. The same token is used to authenticate the Socket.io WebSocket connection at handshake time.

---

## 4. Operator Status Transitions

With a valid JWT, the operator POSTs to one of the three transition endpoints (`/acknowledge`, `/dispatch`, `/resolve`). The JWT Guard validates the token, then the Panic Module checks the current status against the expected prior state — an illegal transition returns a 400 immediately. On a valid transition, a single Prisma transaction updates the PanicEvent status and writes a `PanicEventLog` entry with `triggeredBy: OPERATOR` and the operator's ID. Socket.io emits `panic:updated` to all operator clients. The Webhook Queue enqueues targeted notifications to the PANIC_SOURCE (always) and the claimed RESPONDER_SYSTEM (if one exists).

---

## 5. Operator Dashboard Live Feed

On load, the dashboard fetches `GET /api/v1/panics` to hydrate the initial panic list. Simultaneously, the Socket.io client connects using the operator's JWT. From that point, the dashboard listens for `panic:new` (prepends new events) and `panic:updated` (replaces the matching event by ID). No polling. The REST and WebSocket payloads are identical in shape, so the same rendering logic handles both the initial load and live updates.

---

## 6. Webhook Fan-out Logic

There are two distinct notification patterns:

**On panic creation** — broadcast to all RESPONDER_SYSTEM partners. Every registered responder system receives the new panic so they can surface it to their own responders for potential claiming.

**On status change** — targeted delivery only. The PANIC_SOURCE who submitted the panic always receives the update (via `panicEvent.partnerId`). The RESPONDER_SYSTEM who claimed it also receives the update (via `panicEvent.claimedByPartnerId`), but only if a claim exists. All delivery is async and non-blocking. Partners with no `webhookUrl` are silently skipped with a warning log.

---

## Key Boundaries

| Concern | Owned by |
|---|---|
| Panic submission | PANIC_SOURCE partner |
| Individual responder management | RESPONDER_SYSTEM partner |
| Claiming and lifecycle transitions | ODERP-ly |
| Status notification delivery | ODERP-ly (async, via webhook queue) |
| Live operator view | ODERP-ly (Socket.io) |
