# ODERP-ly — Core Entities

---

## Partner

Represents any external system that connects to ODERP-ly. A partner is either a panic source or a responder system — this type determines how they interact with the platform.

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `name` | String | Display name |
| `type` | Enum | `PANIC_SOURCE` or `RESPONDER_SYSTEM` |
| `apiKeyHash` | String (unique) | SHA-256 hash of the raw API key — raw key never stored |
| `webhookUrl` | String? | Outbound URL for status notifications — required in practice |
| `createdAt` | DateTime | |

**PANIC_SOURCE** partners submit panic events. **RESPONDER_SYSTEM** partners receive panic broadcasts and claim events on behalf of their responders.

---

## PanicEvent

The central fact of the system. Represents a single emergency submitted by a PANIC_SOURCE partner, tracked through its lifecycle from receipt to resolution.

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `partnerId` | UUID (FK → Partner) | The PANIC_SOURCE who submitted this event |
| `claimedByPartnerId` | UUID? (FK → Partner) | The RESPONDER_SYSTEM who claimed this event — null until claimed |
| `externalUserId` | String | The end user identifier from the partner system — treat as PII |
| `latitude` | Float | Validated: -90 to 90 |
| `longitude` | Float | Validated: -180 to 180 |
| `status` | Enum | `PENDING` → `ACKNOWLEDGED` → `DISPATCHED` → `RESOLVED` |
| `idempotencyKey` | String (unique) | UUID v4 supplied by partner — enforces exactly-once ingestion |
| `metadata` | JSON? | Optional partner-supplied context (e.g. emergency type, battery level) |
| `createdAt` | DateTime | |

**Indexes:** `status`, `partnerId`, `claimedByPartnerId`, `createdAt DESC`

---

## PanicEventLog

An immutable audit record written on every status transition. Captures who triggered the change and how. Never updated or deleted.

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `panicEventId` | UUID (FK → PanicEvent) | Parent event |
| `previousStatus` | Enum | Status before the transition |
| `newStatus` | Enum | Status after the transition |
| `triggeredBy` | Enum | `OPERATOR` or `PARTNER_CLAIM` |
| `operatorId` | UUID? (FK → Operator) | Populated when `triggeredBy = OPERATOR` |
| `partnerId` | UUID? (FK → Partner) | Populated when `triggeredBy = PARTNER_CLAIM` |
| `createdAt` | DateTime | |

Exactly one of `operatorId` or `partnerId` is always populated — never both, never neither. This is enforced at the application layer.

---

## Operator

A control room user who manages panic events through the dashboard. Operators authenticate via JWT and are the only principals who can transition status beyond ACKNOWLEDGED.

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `name` | String | Display name |
| `email` | String (unique) | Login credential |
| `passwordHash` | String | bcrypt hash — raw password never stored |
| `createdAt` | DateTime | |

---

## Relationships

```
Partner (PANIC_SOURCE)      ──1:many──▶  PanicEvent
Partner (RESPONDER_SYSTEM)  ──1:many──▶  PanicEvent (via claimedByPartnerId)
PanicEvent                  ──1:many──▶  PanicEventLog
Operator                    ──1:many──▶  PanicEventLog (via operatorId)
Partner                     ──1:many──▶  PanicEventLog (via partnerId)
```

---

## Status Machine

```
PENDING → ACKNOWLEDGED   via operator (acknowledge) or RESPONDER_SYSTEM (claim)
ACKNOWLEDGED → DISPATCHED   via operator only
DISPATCHED → RESOLVED       via operator only
```

Transitions are strictly linear. No skipping, no reverting.
