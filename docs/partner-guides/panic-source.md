# PANIC_SOURCE Integration Guide

## Overview

PANIC_SOURCE partners submit emergency panic events to ODERP-ly on behalf of their users. This guide covers authentication, submitting panics, idempotency, and the webhook notifications you will receive as the panic progresses through the system.

---

## Authentication

All PANIC_SOURCE requests use API key authentication via the `x-api-key` header.

```http
x-api-key: <your-api-key>
```

Your API key is provisioned by the ODERP-ly team. Keep it secret — it is never returned by any API response.

---

## Submitting a Panic

**Endpoint:** `POST /api/v1/panics`

**Headers:**
```http
Content-Type: application/json
x-api-key: <your-api-key>
```

**Request body:**
```json
{
  "externalUserId": "user-abc-123",
  "latitude": -26.1052,
  "longitude": 28.0560,
  "idempotencyKey": "550e8400-e29b-41d4-a716-446655440000",
  "metadata": {
    "emergencyType": "medical",
    "batteryLevel": 42
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `externalUserId` | string | yes | Your internal identifier for the user in distress |
| `latitude` | number | yes | Geographic latitude (-90 to 90) |
| `longitude` | number | yes | Geographic longitude (-180 to 180) |
| `idempotencyKey` | string (UUID v4) | yes | Deduplication key — see below |
| `metadata` | object | no | Arbitrary JSON object (e.g. device info, emergency type) |

**Success response (201):**
```json
{
  "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "status": "PENDING",
  "externalUserId": "user-abc-123",
  "latitude": -26.1052,
  "longitude": 28.0560,
  "idempotencyKey": "550e8400-e29b-41d4-a716-446655440000",
  "metadata": { "emergencyType": "medical", "batteryLevel": 42 },
  "partnerId": "b2c3d4e5-...",
  "partner": { "id": "b2c3d4e5-...", "name": "SecureLife", "type": "PANIC_SOURCE" },
  "claimedByPartner": null,
  "createdAt": "2026-03-10T10:00:00.000Z"
}
```

---

## Idempotency

`idempotencyKey` is **required** and must be a UUID v4. It prevents duplicate panics when a request is retried.

- Generate a fresh UUID v4 for each new panic event.
- If you retry a request (e.g. due to a network timeout), use the **same** `idempotencyKey`.
- A duplicate key from your partner returns **200** with the original panic (not an error).
- A duplicate key from a **different** partner returns **409 Conflict**.

**Example using Node.js:**
```js
import { randomUUID } from 'crypto'
const idempotencyKey = randomUUID() // e.g. "550e8400-e29b-41d4-a716-446655440000"
```

---

## Panic Status Values

| Status | Meaning |
|--------|---------|
| `PENDING` | Submitted, awaiting acknowledgement |
| `ACKNOWLEDGED` | Acknowledged by an operator or claimed by a responder |
| `DISPATCHED` | Response dispatched by an operator |
| `RESOLVED` | Incident resolved |

---

## Webhook Notifications

ODERP-ly will send HTTP POST requests to your `webhookUrl` (configured during partner setup) when your panic's status changes.

**Payload shape:**
```json
{
  "event": "panic.status_updated",
  "panic": {
    "id": "f47ac10b-...",
    "status": "ACKNOWLEDGED",
    ...
  }
}
```

Events you will receive:
- `panic.status_updated` — fired on every status transition (ACKNOWLEDGED, DISPATCHED, RESOLVED)

> If your `webhookUrl` is not set, no notifications will be delivered.
> Webhook delivery is best-effort — failures are logged but not retried at this time.
