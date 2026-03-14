# ODERP-ly — API Surface

---

## Auth

### `POST /api/auth/login`
Operator submits email and password. Returns a signed JWT and operator object.
> **Satisfies:** Operator must be able to log in securely to access the dashboard.

---

## Panics — Partner-Facing (API Key auth)

### `POST /api/v1/panics`
Partner system submits a panic event with location, user identifier, idempotency key, and optional metadata. Returns the created event with partner inline.
> **Satisfies:** Partner system can submit a panic event via an authenticated endpoint. Partner can include location coordinates and a user identifier. Partner can include optional metadata. Partner receives a confirmation response on success.

### `POST /api/v1/panics/:id/claim`
A RESPONDER_SYSTEM partner claims a panic. Atomically sets `status → ACKNOWLEDGED` and records `claimedByPartnerId`. Uses `SELECT FOR UPDATE` to prevent race conditions. Only available to partners of type `RESPONDER_SYSTEM`.
> **Satisfies:** Enables responder systems to take ownership of a panic, triggering the first status transition and routing all subsequent notifications correctly.

---

## Panics — Operator-Facing (JWT auth)

### `GET /api/v1/panics`
Returns a paginated, filterable list of panic events. Each event includes the submitting partner inline. Supports filtering by `status` and `partnerId`.
> **Satisfies:** Operator can view all panic events. Key details (location, time received, partner source, current status) are present in every response item.

### `GET /api/v1/panics/:id`
Returns a single panic event by ID, including both the submitting partner and the claiming partner inline.
> **Satisfies:** Operator can view full details for a specific panic event.

### `POST /api/v1/panics/:id/acknowledge`
Transitions status from `PENDING → ACKNOWLEDGED`. Writes a `PanicEventLog` entry with `triggeredBy: OPERATOR` in the same transaction. Emits `panic:updated` via Socket.io. Enqueues webhook notification to PANIC_SOURCE.
> **Satisfies:** Operator can acknowledge a panic event to indicate it is being handled.

### `POST /api/v1/panics/:id/dispatch`
Transitions status from `ACKNOWLEDGED → DISPATCHED`. Writes audit log. Emits Socket.io event. Enqueues webhooks to PANIC_SOURCE and claimed RESPONDER_SYSTEM.
> **Satisfies:** Operator can mark a panic event as dispatched when a response has been sent.

### `POST /api/v1/panics/:id/resolve`
Transitions status from `DISPATCHED → RESOLVED`. Writes audit log. Emits Socket.io event. Enqueues webhooks to PANIC_SOURCE and claimed RESPONDER_SYSTEM.
> **Satisfies:** Operator can mark a panic event as resolved when the emergency is closed.

---

## Logs — Operator-Facing (JWT auth)

### `GET /api/v1/panics/:id/logs`
Returns a paginated, chronological list of all status transitions for a panic event. Each log entry includes the triggering operator or partner inline.
> **Satisfies:** Operator can see a history of status changes on a panic event.

### `GET /api/v1/panics/:id/logs/:logId`
Returns a single log entry by ID.
> **Satisfies:** Supports detailed audit trail access per transition.

---

## Partners — Operator-Facing (JWT auth)

### `GET /api/v1/partners`
Returns a paginated list of all registered partners. Each partner includes total panic event count and active panic event count inline. Supports filtering by `type`. Never returns `apiKeyHash`.
> **Satisfies:** Supports the operator dashboard's need to resolve partner names from panic events without secondary fetches.

### `GET /api/v1/partners/:id`
Returns a single partner by ID with panic event counts inline. Never returns `apiKeyHash`.
> **Satisfies:** Supports single-partner detail view and name resolution.

---

## WebSocket Events (JWT auth on handshake)

### `panic:new` — Server → all operator clients
Emitted immediately after a panic event is written to the database. Payload mirrors `GET /api/v1/panics/:id` response shape exactly.
> **Satisfies:** Operator can view all active panic events in real time without manually refreshing.

### `panic:updated` — Server → all operator clients
Emitted after every status transition (acknowledge, dispatch, resolve, claim). Payload mirrors the REST response shape.
> **Satisfies:** Operator dashboard stays current across all status changes without polling.

---

## State Machine Enforcement

All transition endpoints enforce valid prior status before writing. Illegal transitions return `400` with a descriptive error message. The valid sequence is:

```
PENDING → ACKNOWLEDGED → DISPATCHED → RESOLVED
```

No endpoint allows skipping a step or reversing a transition.
