# ODERP-ly

**On-Demand Emergency Response Platform** — a real-time incident management system that receives emergency "panic" requests from partner systems, persists them in a relational database, and streams live updates to an operator control-room dashboard.

Think of it like a ride-hailing dispatcher: a PANIC_SOURCE submits an emergency, a RESPONDER_SYSTEM claims it, and an operator drives it through to resolution — all with live WebSocket updates.

---

## Architecture

See [docs/architecture.md](docs/architecture.md) for the full system diagram.

**At a glance:**

```
PANIC_SOURCE partner ──POST /api/v1/panics──────────┐
                                                     │
RESPONDER_SYSTEM partner ──POST /panics/:id/claim───►  Fastify API
                                                     │   (Node 22, TypeScript)
Operator browser ──────GET /api/v1/panics───────────┘       │
        ▲                                               PostgreSQL
        │  Socket.io (JWT)                                   │
        └──────────────── panic:new / panic:updated ◄────────┘
                                                       Webhook fan-out
                                                    (PANIC_SOURCE / RESPONDER)
```

---

## Tech Stack

| Layer      | Technology                                   |
|------------|----------------------------------------------|
| API        | Fastify, TypeScript, Zod, Prisma 7, Socket.io |
| Database   | PostgreSQL 16 (Docker)                       |
| Frontend   | React 19, Vite, Tailwind CSS                 |
| Auth       | `@fastify/jwt` (operators), API key (partners) |
| Monorepo   | npm workspaces (`api/`, `client/`, `shared/`) |
| API docs   | Scalar UI (OpenAPI 3.1, auto-generated)       |

---

## Quick Start

### Prerequisites

- Node 22.13.0 (`nvm use` or install from [nodejs.org](https://nodejs.org))
- Docker Desktop (for PostgreSQL)
- npm 10+

> **macOS gotcha — Homebrew PostgreSQL conflict:** if you have a local `postgres` running on port 5432, stop it before starting Docker or Prisma will connect to the wrong instance:
> ```bash
> brew services stop postgresql@14
> # or, if Homebrew is broken on a newer macOS:
> launchctl unload ~/Library/LaunchAgents/homebrew.mxcl.postgresql@14.plist
> ```

### 1. Clone and install

```bash
git clone https://github.com/ychinamale/fullstack_oderply.git
cd fullstack_oderply
npm install
```

### 2. Configure environment

```bash
cp api/.env.example api/.env
```

The defaults in `.env.example` work out of the box for local development — no edits needed.

### 3. Start the database

```bash
docker compose up -d
```

### 4. Run migrations and seed

```bash
cd api
npx prisma migrate deploy
npm run seed
cd ..
```

### 5. Start the app

```bash
npm run dev        # starts API (port 3000) + frontend (port 5173) concurrently
```

Open `http://localhost:5173` — log in with the [demo credentials](#demo-credentials).

---

## Environment Variables

All vars are set in `api/.env`. The `.env.example` file documents all of them:

| Variable       | Description                                        | Default (dev)                                         |
|----------------|----------------------------------------------------|-------------------------------------------------------|
| `NODE_ENV`     | Runtime environment                                | `development`                                         |
| `PORT`         | API server port                                    | `3000`                                                |
| `JWT_SECRET`   | Secret for signing operator JWTs                   | `your-secret-here` (change in production)             |
| `DATABASE_URL` | PostgreSQL connection string                       | `postgresql://oderply:oderply@localhost:5432/oderply_dev` |

---

## API Reference

Full interactive documentation is available at **`http://localhost:3000/docs`** (Scalar UI) once the API is running. Raw OpenAPI spec: `http://localhost:3000/docs/openapi.json`.

### Endpoints

| Method | Path                             | Auth          | Description                           |
|--------|----------------------------------|---------------|---------------------------------------|
| POST   | `/api/auth/login`                | none          | Returns a JWT for operator use        |
| POST   | `/api/v1/panics`                 | API key       | Submit a panic (PANIC_SOURCE only)    |
| POST   | `/api/v1/panics/:id/claim`       | API key       | Claim a panic (RESPONDER_SYSTEM only) |
| GET    | `/api/v1/panics`                 | JWT           | List panics (paginated, filterable)   |
| GET    | `/api/v1/panics/:id`             | JWT           | Get a single panic                    |
| POST   | `/api/v1/panics/:id/acknowledge` | JWT           | Acknowledge (operator)                |
| POST   | `/api/v1/panics/:id/dispatch`    | JWT           | Dispatch (operator)                   |
| POST   | `/api/v1/panics/:id/resolve`     | JWT           | Resolve (operator)                    |
| GET    | `/api/v1/panics/:id/logs`        | JWT           | Paginated audit trail                 |
| GET    | `/api/v1/panics/:id/logs/:logId` | JWT           | Single audit log entry                |
| GET    | `/api/v1/partners`               | JWT           | List partners (paginated, filterable) |
| GET    | `/api/v1/partners/:id`           | JWT           | Get a single partner                  |

### Example: Submit a panic

```bash
curl -X POST http://localhost:3000/api/v1/panics \
  -H "x-api-key: ps-test-api-key-001" \
  -H "Content-Type: application/json" \
  -d '{
    "idempotencyKey": "550e8400-e29b-41d4-a716-446655440000",
    "latitude": -26.2041,
    "longitude": 28.0473,
    "metadata": { "userId": "user-123", "deviceType": "mobile" }
  }'
```

### Example: Claim a panic

```bash
curl -X POST http://localhost:3000/api/v1/panics/<panicId>/claim \
  -H "x-api-key: rs-test-api-key-001"
```

### Example: Operator login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{ "email": "admin@oderply.com", "password": "Admin1234!" }'
```

---

## Real-Time Events

The API broadcasts Socket.io events to all connected operator clients:

| Event           | Trigger                              | Payload               |
|-----------------|--------------------------------------|-----------------------|
| `panic:new`     | Successful POST `/api/v1/panics`     | Full panic object     |
| `panic:updated` | Any status transition (claim → resolve) | Updated panic object |

Socket.io connections are authenticated via JWT passed during the handshake. The operator dashboard uses these events to update the live feed without polling or page refresh.

---

## Partner Integration Guides

Detailed integration documentation for each partner type:

- [PANIC_SOURCE integration guide](docs/partner-guides/panic-source.md) — how to submit panics, idempotency, webhooks received
- [RESPONDER_SYSTEM integration guide](docs/partner-guides/responder-system.md) — how to claim panics, webhook payloads, error handling

---

## Demo Credentials

These are seeded by `npm run seed` in the `api/` workspace.

| Type               | Credential                   | Value                   |
|--------------------|------------------------------|-------------------------|
| Operator login     | Email                        | `admin@oderply.com`     |
| Operator login     | Password                     | `Admin1234!`            |
| PANIC_SOURCE       | API key (`x-api-key` header) | `ps-test-api-key-001`   |
| RESPONDER_SYSTEM   | API key (`x-api-key` header) | `rs-test-api-key-001`   |

---

## Demo Walkthrough

With the app running and DB seeded, follow these steps to see the full end-to-end flow:

**1. Open the operator dashboard**

Navigate to `http://localhost:5173` and log in with `admin@oderply.com` / `Admin1234!`.

**2. Submit a panic (PANIC_SOURCE)**

```bash
curl -X POST http://localhost:3000/api/v1/panics \
  -H "x-api-key: ps-test-api-key-001" \
  -H "Content-Type: application/json" \
  -d '{
    "idempotencyKey": "550e8400-e29b-41d4-a716-446655440000",
    "latitude": -26.2041,
    "longitude": 28.0473,
    "metadata": { "userId": "demo-user" }
  }'
```

Watch the panic appear in the dashboard feed in real time (`panic:new` event).

**3. Claim the panic (RESPONDER_SYSTEM)**

Copy the `id` from the response above, then:

```bash
curl -X POST http://localhost:3000/api/v1/panics/<id>/claim \
  -H "x-api-key: rs-test-api-key-001"
```

The panic status transitions to `ACKNOWLEDGED`. Dashboard updates live (`panic:updated` event).

**4. Dispatch and resolve (Operator)**

Use the dashboard action buttons to move the panic through `DISPATCHED` → `RESOLVED`, or do it via API:

```bash
# Get a JWT first
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@oderply.com","password":"Admin1234!"}' \
  | jq -r '.token')

curl -X POST http://localhost:3000/api/v1/panics/<id>/dispatch \
  -H "Authorization: Bearer $TOKEN"

curl -X POST http://localhost:3000/api/v1/panics/<id>/resolve \
  -H "Authorization: Bearer $TOKEN"
```

**5. Review the audit log**

```bash
curl -s http://localhost:3000/api/v1/panics/<id>/logs \
  -H "Authorization: Bearer $TOKEN" | jq .
```

Every status change is captured with timestamp, trigger source, and actor identity.

---

## Bruno Collection

The `bruno/` directory contains a ready-to-use [Bruno](https://www.usebruno.com/) collection with **33 pre-built requests** covering all 12 endpoints and key error scenarios (auth failures, wrong partner type, idempotency, invalid transitions, sensitive field checks).

**To use it:**

1. Install [Bruno](https://www.usebruno.com/downloads) (free, open-source)
2. Open Bruno → **Open Collection** → select the `bruno/` folder in this repo
3. Select the `local` environment (pre-configured with seed credentials and `http://localhost:3000`)
4. Ensure the API is running and the DB is seeded
5. Run requests individually or use **Run Collection** to execute the full suite

**Collection structure:**

```
bruno/
├── auth/           # Login (success, wrong password, missing fields)
├── panics/
│   ├── submit/     # Panic ingestion (happy path, idempotency, auth errors)
│   ├── claim/      # Panic claim (happy path, already claimed, wrong type)
│   ├── list/       # Listing + filtering + pagination
│   ├── detail/     # Single panic fetch
│   ├── transitions/# Acknowledge, dispatch, resolve, invalid transition
│   └── logs/       # Audit log list and single entry
├── partners/       # Partner list, filter, single fetch, 404
├── security/       # Auth header missing/invalid, sensitive field absence
└── environments/
    └── local.bru   # Pre-configured for local dev (seeds credentials baked in)
```

---

## Testing

```bash
npm test --workspace=api     # 137 tests — all routes, guards, webhooks, Socket.io, data integrity
npm test --workspace=client  # 29 tests — login flow, dashboard, panic detail, components
```

Both suites run against a live PostgreSQL instance (no mocks). The API test suite uses a dedicated test database configured via `api/.env.test`.

---

## Agentic Development

This project was built using an **agentic TDD workflow** with [Claude Code](https://claude.com/claude-code) as an AI pair programmer. The development approach is documented in two files:

- **[CLAUDE.md](CLAUDE.md)** — the project's AI pair-programming constitution: every architectural convention, state machine rule, webhook contract, TDD cycle requirement, and git workflow that governed how this codebase was built.
- **[docs/01_AGENTIC_DEV_SETUP.md](docs/01_AGENTIC_DEV_SETUP.md)** — explains the philosophy behind the setup: why project context lives in `CLAUDE.md` rather than agent skills, how hooks automate deterministic steps, and the inline-vs-reference framework for managing context window efficiency.

The result is a codebase where every architectural decision is traceable, every feature was test-driven, and the AI's behaviour was constrained to produce consistent, predictable output across a 12-epic backlog.
