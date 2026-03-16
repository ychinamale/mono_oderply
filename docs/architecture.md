# System Architecture

## Component Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          ODERP-ly System                                 │
│                                                                          │
│  ┌─────────────────┐         ┌──────────────────────────────────────┐   │
│  │  Partner Systems │         │           Fastify API                │   │
│  │                 │         │           (Node 22, ESM)             │   │
│  │  PANIC_SOURCE   │──POST──►│                                      │   │
│  │  (API key auth) │  panics │  ┌──────────┐   ┌────────────────┐  │   │
│  │                 │         │  │  Routes  │   │  Prisma 7      │  │   │
│  │  RESPONDER_SYS  │──POST──►│  │          │──►│  PostgreSQL 16 │  │   │
│  │  (API key auth) │  claim  │  │  Zod     │   │                │  │   │
│  │                 │         │  │  Guards  │   │  Transactions  │  │   │
│  └────────┬────────┘         │  └────┬─────┘   │  SELECT FOR   │  │   │
│           │                  │       │          │  UPDATE        │  │   │
│           │ Webhook           │       │          └────────────────┘  │   │
│           │ fan-out          │       │                               │   │
│           │                  │  ┌────▼─────────────────┐            │   │
│           │◄─────────────────│  │     Socket.io         │            │   │
│                              │  │  (JWT handshake auth) │            │   │
│                              │  └──────────┬────────────┘            │   │
│                              │             │                          │   │
│                              └─────────────│──────────────────────────┘   │
│                                            │ panic:new                    │
│                                            │ panic:updated                │
│                                            ▼                              │
│                              ┌─────────────────────────┐                 │
│                              │   Operator Dashboard     │                 │
│                              │   React 19 + Vite        │                 │
│                              │   Tailwind CSS           │                 │
│                              │                          │                 │
│                              │   Login page             │                 │
│                              │   Live panic feed        │                 │
│                              │   Panic detail + actions │                 │
│                              │   Audit log viewer       │                 │
│                              └─────────────────────────┘                 │
└─────────────────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Panic ingestion

```
PANIC_SOURCE
    │
    ├── POST /api/v1/panics (x-api-key header)
    │       │
    │       ├── apiKeyGuard validates key, resolves partner
    │       ├── Zod validates body (idempotencyKey, lat/lng, metadata)
    │       ├── Idempotency check — return 200 if duplicate from same partner
    │       ├── Prisma INSERT PanicEvent (status: PENDING) + PanicEventLog
    │       ├── Socket.io emit: panic:new → all operator clients
    │       └── webhookQueue.enqueue: panic.created → ALL RESPONDER_SYSTEM partners
    │
    └── ← 201 { panic }
```

### 2. Responder claim

```
RESPONDER_SYSTEM
    │
    ├── POST /api/v1/panics/:id/claim (x-api-key header)
    │       │
    │       ├── apiKeyGuard validates key, confirms RESPONDER_SYSTEM type
    │       ├── Prisma transaction: SELECT FOR UPDATE on PanicEvent
    │       ├── assertTransition(PENDING → ACKNOWLEDGED)
    │       ├── UPDATE PanicEvent (status, claimedByPartnerId) + INSERT PanicEventLog
    │       ├── Socket.io emit: panic:updated → all operator clients
    │       └── webhookQueue.enqueue: panic.status_updated → PANIC_SOURCE only
    │
    └── ← 200 { panic }
```

### 3. Operator status transitions

```
Operator (browser)
    │
    ├── POST /api/v1/panics/:id/acknowledge|dispatch|resolve (Bearer JWT)
    │       │
    │       ├── jwtGuard validates token
    │       ├── Prisma transaction: assertTransition + UPDATE + INSERT log
    │       ├── Socket.io emit: panic:updated → all operator clients
    │       └── webhookQueue.enqueue: panic.status_updated → PANIC_SOURCE + claimedByPartner
    │
    └── ← 200 { panic }
```

## State Machine

```
PENDING ──► ACKNOWLEDGED ──► DISPATCHED ──► RESOLVED
              ▲
              │ (via RESPONDER_SYSTEM claim, or operator acknowledge)
```

- `PENDING → ACKNOWLEDGED`: operator acknowledge, or RESPONDER_SYSTEM claim
- `ACKNOWLEDGED → DISPATCHED`: operator only
- `DISPATCHED → RESOLVED`: operator only

Any other transition returns `400 Bad Request`.

## Webhook Fan-Out Rules

| Event              | Recipients                              |
|--------------------|-----------------------------------------|
| `panic.created`    | ALL RESPONDER_SYSTEM partners           |
| `panic.status_updated` (claim) | PANIC_SOURCE only               |
| `panic.status_updated` (operator) | PANIC_SOURCE + claimedByPartner (if set) |

Webhook failures are logged but never throw — delivery is non-blocking (in-process queue, MVP).

## Auth Model

| Consumer         | Mechanism         | Guard       |
|------------------|-------------------|-------------|
| Operators        | JWT (HS256)       | `jwtGuard`  |
| Partner systems  | API key header    | `apiKeyGuard` |

- `apiKeyGuard`: hashes the incoming key with SHA-256, looks up matching `Partner` record. Never stores raw keys.
- `jwtGuard`: verifies signature using `JWT_SECRET`, attaches operator payload to request.

## Monorepo Layout

```
fullstack_oderply/
├── api/          # Fastify backend (see api/README.md)
├── client/       # React frontend (see client/README.md)
├── shared/       # Zod schemas shared between api and client (see shared/README.md)
├── bruno/        # Bruno API collection (33 requests)
├── docs/         # Architecture, partner guides
└── docker-compose.yml
```
