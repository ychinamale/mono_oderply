# RESPONDER_SYSTEM Integration Guide

## Overview

RESPONDER_SYSTEM partners receive real-time notifications when new panics are created and can claim panics to initiate a response. This guide covers authentication, receiving panic broadcasts, claiming panics, and the subsequent status webhooks.

---

## Authentication

All RESPONDER_SYSTEM requests use API key authentication via the `x-api-key` header.

```http
x-api-key: <your-api-key>
```

Your API key is provisioned by the ODERP-ly team. Keep it secret — it is never returned by any API response.

---

## Webhook Registration

You **must** have a `webhookUrl` configured with ODERP-ly to receive panic broadcasts. Contact the ODERP-ly team to register your endpoint. If no URL is set, you will not receive any notifications.

Your webhook endpoint must:
- Accept `POST` requests with a JSON body
- Return a 2xx response within a reasonable timeout
- Be publicly reachable from the ODERP-ly server

---

## Receiving a Panic Broadcast

When a PANIC_SOURCE partner submits a new panic, ODERP-ly broadcasts it to **all** RESPONDER_SYSTEM partners with a configured `webhookUrl`.

**Payload shape:**
```json
{
  "event": "panic.created",
  "panic": {
    "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "status": "PENDING",
    "externalUserId": "user-abc-123",
    "latitude": -26.1052,
    "longitude": 28.0560,
    "idempotencyKey": "550e8400-e29b-41d4-a716-446655440000",
    "metadata": { "emergencyType": "medical" },
    "partnerId": "b2c3d4e5-...",
    "partner": { "id": "b2c3d4e5-...", "name": "SecureLife", "type": "PANIC_SOURCE" },
    "claimedByPartner": null,
    "createdAt": "2026-03-10T10:00:00.000Z"
  }
}
```

Key fields to parse:
- `panic.id` — use this to claim the panic
- `panic.status` — will always be `PENDING` at broadcast time
- `panic.latitude` / `panic.longitude` — location of the user in distress
- `panic.metadata` — additional context provided by the source partner

---

## Claiming a Panic

**Endpoint:** `POST /api/v1/panics/:id/claim`

**Headers:**
```http
x-api-key: <your-api-key>
```

**No request body required.**

**Success response (200):** Returns the updated panic object with `status: "ACKNOWLEDGED"` and `claimedByPartner` set to your partner.

**When to call it:** Call this as soon as your system decides to respond to a panic. Only one RESPONDER_SYSTEM can claim a panic.

### Claim outcomes

| Status code | Meaning |
|-------------|---------|
| 200 | Claim succeeded — panic is now ACKNOWLEDGED and assigned to you |
| 400 | Panic is not in PENDING status (already transitioned) |
| 403 | Your API key is not a RESPONDER_SYSTEM key |
| 404 | Panic ID not found |
| 409 | Another responder claimed this panic first |

**Handling 409 Conflict:** A 409 means a different RESPONDER_SYSTEM already claimed the panic. You should discard this panic and wait for the next broadcast.

---

## Status Update Webhooks

After you claim a panic, ODERP-ly will notify you when the operator advances its status.

**Payload shape:**
```json
{
  "event": "panic.status_updated",
  "panic": {
    "id": "f47ac10b-...",
    "status": "DISPATCHED",
    ...
  }
}
```

Status updates you will receive after claiming:
- `panic.status_updated` with `status: "DISPATCHED"` — operator has dispatched a response
- `panic.status_updated` with `status: "RESOLVED"` — incident resolved

> Webhook delivery is best-effort — failures are logged but not retried at this time.
