# ODERP-ly — Example API Responses

---

## `POST /api/auth/login`

**Request**
```json
{ "email": "operator@oderply.com", "password": "secret" }
```

**200 OK**
```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "operator": {
    "id": "a1b2c3d4-...",
    "name": "John Smith",
    "email": "operator@oderply.com"
  }
}
```

**401 Unauthorized**
```json
{ "error": "Invalid credentials" }
```

> Store the token in memory (React context). Do not persist to localStorage — it will be lost on refresh, which is acceptable for a control room context where operators are expected to remain logged in during a shift.

---

## `POST /api/v1/panics`

**Request headers:** `x-api-key: <raw-key>`
```json
{
  "externalUserId": "user-123",
  "latitude": -26.1052,
  "longitude": 28.0560,
  "idempotencyKey": "550e8400-e29b-41d4-a716-446655440000",
  "metadata": { "emergencyType": "medical", "batteryLevel": 42 }
}
```

**201 Created**
```json
{
  "id": "f47ac10b-...",
  "status": "PENDING",
  "externalUserId": "user-123",
  "latitude": -26.1052,
  "longitude": 28.0560,
  "idempotencyKey": "550e8400-e29b-41d4-a716-446655440000",
  "metadata": { "emergencyType": "medical", "batteryLevel": 42 },
  "partner": {
    "id": "b2c3d4e5-...",
    "name": "SecureLife",
    "type": "PANIC_SOURCE"
  },
  "createdAt": "2026-03-10T10:00:00.000Z"
}
```

**409 Conflict (duplicate idempotencyKey) → returns 200 with original event**
```json
{
  "id": "f47ac10b-...",
  "status": "PENDING",
  ...
}
```

> The 409 case silently returns 200 with the original event. Partners should treat any 2xx response as confirmation the event is being handled. The `idempotencyKey` must be a UUID v4, generated once per emergency, and reused on all retries of that same event.

---

## `POST /api/v1/panics/:id/claim`

**Request headers:** `x-api-key: <responder-system-key>`

**200 OK**
```json
{
  "id": "f47ac10b-...",
  "status": "ACKNOWLEDGED",
  "externalUserId": "user-123",
  "latitude": -26.1052,
  "longitude": 28.0560,
  "claimedByPartner": {
    "id": "c3d4e5f6-...",
    "name": "RapidResponse",
    "type": "RESPONDER_SYSTEM"
  },
  "partner": {
    "id": "b2c3d4e5-...",
    "name": "SecureLife",
    "type": "PANIC_SOURCE"
  },
  "createdAt": "2026-03-10T10:00:00.000Z"
}
```

**409 Conflict**
```json
{ "error": "This panic has already been claimed by another responder system" }
```

**403 Forbidden**
```json
{ "error": "Only RESPONDER_SYSTEM partners can claim a panic" }
```

> Two responder systems can race to claim the same panic. The `SELECT FOR UPDATE` lock ensures exactly one wins. Responder systems should handle 409 gracefully — it means another system got there first, not a system error.

---

## `GET /api/v1/panics`

**Query params:** `?page=1&limit=20&status=PENDING&partnerId=b2c3d4e5-...`

**200 OK**
```json
{
  "data": [
    {
      "id": "f47ac10b-...",
      "status": "PENDING",
      "externalUserId": "user-123",
      "latitude": -26.1052,
      "longitude": 28.0560,
      "metadata": { "emergencyType": "medical" },
      "partner": {
        "id": "b2c3d4e5-...",
        "name": "SecureLife",
        "type": "PANIC_SOURCE"
      },
      "createdAt": "2026-03-10T10:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 84,
    "totalPages": 5
  }
}
```

> `page` defaults to 1, `limit` defaults to 20. The dashboard should use this endpoint on initial load to hydrate state, then rely on Socket.io events for subsequent updates.

---

## `GET /api/v1/panics/:id`

**200 OK**
```json
{
  "id": "f47ac10b-...",
  "status": "ACKNOWLEDGED",
  "externalUserId": "user-123",
  "latitude": -26.1052,
  "longitude": 28.0560,
  "idempotencyKey": "550e8400-...",
  "metadata": { "emergencyType": "medical", "batteryLevel": 42 },
  "partner": {
    "id": "b2c3d4e5-...",
    "name": "SecureLife",
    "type": "PANIC_SOURCE"
  },
  "claimedByPartner": {
    "id": "c3d4e5f6-...",
    "name": "RapidResponse",
    "type": "RESPONDER_SYSTEM"
  },
  "createdAt": "2026-03-10T10:00:00.000Z"
}
```

> `claimedByPartner` is `null` until a responder system claims the event. The detail view should handle both states.

---

## `POST /api/v1/panics/:id/acknowledge`
## `POST /api/v1/panics/:id/dispatch`
## `POST /api/v1/panics/:id/resolve`

All three share the same response shape — only `status` differs.

**200 OK**
```json
{
  "id": "f47ac10b-...",
  "status": "DISPATCHED",
  "externalUserId": "user-123",
  "latitude": -26.1052,
  "longitude": 28.0560,
  "partner": {
    "id": "b2c3d4e5-...",
    "name": "SecureLife",
    "type": "PANIC_SOURCE"
  },
  "claimedByPartner": {
    "id": "c3d4e5f6-...",
    "name": "RapidResponse",
    "type": "RESPONDER_SYSTEM"
  },
  "createdAt": "2026-03-10T10:00:00.000Z"
}
```

**400 Bad Request — invalid transition**
```json
{ "error": "Cannot dispatch a panic with status PENDING" }
```

**404 Not Found**
```json
{ "error": "Panic event not found" }
```

> The dashboard does not need to manually update local state on a successful transition — the `panic:updated` Socket.io event will arrive and update the UI automatically.

---

## `GET /api/v1/panics/:id/logs`

**200 OK**
```json
{
  "data": [
    {
      "id": "log-001-...",
      "previousStatus": "PENDING",
      "newStatus": "ACKNOWLEDGED",
      "triggeredBy": "PARTNER_CLAIM",
      "operator": null,
      "partner": {
        "id": "c3d4e5f6-...",
        "name": "RapidResponse",
        "type": "RESPONDER_SYSTEM"
      },
      "createdAt": "2026-03-10T10:02:00.000Z"
    },
    {
      "id": "log-002-...",
      "previousStatus": "ACKNOWLEDGED",
      "newStatus": "DISPATCHED",
      "triggeredBy": "OPERATOR",
      "operator": {
        "id": "a1b2c3d4-...",
        "name": "John Smith"
      },
      "partner": null,
      "createdAt": "2026-03-10T10:08:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 2,
    "totalPages": 1
  }
}
```

> Exactly one of `operator` or `partner` is always populated per log entry — never both, never neither. The UI should use `triggeredBy` to determine which to display and how to label it.

---

## `GET /api/v1/partners`

**200 OK**
```json
{
  "data": [
    {
      "id": "b2c3d4e5-...",
      "name": "SecureLife",
      "type": "PANIC_SOURCE",
      "webhookUrl": "https://securelife.com/webhook",
      "createdAt": "2026-03-01T00:00:00.000Z",
      "_count": {
        "panicEvents": 42,
        "activePanicEvents": 3
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 4,
    "totalPages": 1
  }
}
```

> `apiKeyHash` is never returned. `activePanicEvents` counts panics in `PENDING`, `ACKNOWLEDGED`, or `DISPATCHED` status.

---

## WebSocket Events

### `panic:new`
```json
{
  "id": "f47ac10b-...",
  "status": "PENDING",
  "externalUserId": "user-123",
  "latitude": -26.1052,
  "longitude": 28.0560,
  "metadata": { "emergencyType": "medical" },
  "partner": {
    "id": "b2c3d4e5-...",
    "name": "SecureLife",
    "type": "PANIC_SOURCE"
  },
  "createdAt": "2026-03-10T10:00:00.000Z"
}
```

### `panic:updated`
```json
{
  "id": "f47ac10b-...",
  "status": "ACKNOWLEDGED",
  "externalUserId": "user-123",
  "latitude": -26.1052,
  "longitude": 28.0560,
  "partner": {
    "id": "b2c3d4e5-...",
    "name": "SecureLife",
    "type": "PANIC_SOURCE"
  },
  "claimedByPartner": {
    "id": "c3d4e5f6-...",
    "name": "RapidResponse",
    "type": "RESPONDER_SYSTEM"
  },
  "createdAt": "2026-03-10T10:00:00.000Z"
}
```

> Socket.io payloads deliberately mirror the REST response shapes. The dashboard can use the same rendering logic whether it received a panic via the initial `GET /api/v1/panics` fetch or a live socket event — no special casing required. Connect with `auth: { token }` on handshake; unauthenticated connections are rejected before receiving any data.

---

## Outbound Webhook Payloads (delivered to partner `webhookUrl`)

### On panic creation — delivered to all RESPONDER_SYSTEM partners
```json
{
  "event": "panic.created",
  "panicId": "f47ac10b-...",
  "status": "PENDING",
  "latitude": -26.1052,
  "longitude": 28.0560,
  "metadata": { "emergencyType": "medical" },
  "createdAt": "2026-03-10T10:00:00.000Z"
}
```

### On status change — delivered to PANIC_SOURCE and claimed RESPONDER_SYSTEM
```json
{
  "event": "panic.status_updated",
  "panicId": "f47ac10b-...",
  "previousStatus": "PENDING",
  "newStatus": "ACKNOWLEDGED",
  "updatedAt": "2026-03-10T10:02:00.000Z"
}
```

> Webhook delivery is async and fire-and-forget at MVP. Failures are logged but not retried. Partners should implement their own reconciliation if reliable delivery is critical — a durable queue with retries is the production-grade solution.
