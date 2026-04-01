# ODERP-ly — C# Migration Task Backlog

**Format:** Epic → Story → Task → Sub-task
**Scope:** Full migration from Node.js/Fastify/Prisma to C#/ASP.NET Core/EF Core
**Prerequisite:** Complete the workspace rename (`api/` → `api.typescript/`, new `api.csharp/`) before starting EPIC-CS-01.

---

## Hierarchy Key

| Level | Symbol | Description |
|---|---|---|
| Epic | `🏆 EPIC` | A major feature area or phase |
| Story | `STORY` | A user-facing or system-level capability |
| Task | `TASK` | A concrete unit of buildable work |
| Sub-task | `SUB` | A specific implementation step within a task |

---

## 🏆 EPIC-CS-01 — Project Setup

> Establish the `api.csharp/` solution structure, NuGet packages, Program.cs stub, and shared test infrastructure so all subsequent TDD cycles have a compilable foundation.

---

### STORY-CS-01.1 — Solution & Project Scaffolding

**As a** developer,
**I want** the .NET solution created with Api and Shared projects wired together,
**so that** I can start writing business logic without fighting project structure.

- [ ] TASK-CS-01.1.1 — Create solution and project files

    - [ ] SUB: `dotnet new sln -n OderPly -o api.csharp/`
    - [ ] SUB: `dotnet new webapi -n OderPly.Api -o api.csharp/OderPly.Api --no-openapi`
    - [ ] SUB: `dotnet new classlib -n OderPly.Shared -o api.csharp/OderPly.Shared`
    - [ ] SUB: Add both projects to solution: `dotnet sln add`
    - [ ] SUB: Add `OderPly.Shared` project reference to `OderPly.Api`
    - [ ] SUB: Create `api.csharp/.gitignore` with `obj/`, `bin/`, `*.user`, `*.suo`

- [ ] TASK-CS-01.1.2 — Add NuGet packages to OderPly.Api

    - [ ] SUB: `Microsoft.AspNetCore.Authentication.JwtBearer`
    - [ ] SUB: `Npgsql.EntityFrameworkCore.PostgreSQL`
    - [ ] SUB: `Microsoft.EntityFrameworkCore.Design`
    - [ ] SUB: `Microsoft.AspNetCore.SignalR` (included in ASP.NET Core; add `Microsoft.AspNetCore.SignalR.Client` for tests)
    - [ ] SUB: `FluentValidation.AspNetCore`
    - [ ] SUB: `BCrypt.Net-Next`
    - [ ] SUB: `Swashbuckle.AspNetCore`
    - [ ] SUB: `Microsoft.AspNetCore.Mvc.Testing` (for integration tests)
    - [ ] SUB: `xunit`, `xunit.runner.visualstudio`, `coverlet.collector`

- [ ] TASK-CS-01.1.3 — Stub Program.cs

    - [ ] SUB: Register services (DI stubs — no logic yet)
    - [ ] SUB: Configure middleware pipeline order: auth, routing, CORS, endpoints
    - [ ] SUB: Add Swagger/OpenAPI middleware
    - [ ] SUB: Map SignalR hub route stub
    - [ ] SUB: Confirm `dotnet build` passes with zero errors

- [ ] TASK-CS-01.1.4 — Create shared test fixtures

    - [ ] SUB: Create `OderPly.Api.Tests/` project inside `api.csharp/`
    - [ ] SUB: Implement `DbContextFixture` (in-memory SQLite or Npgsql test DB)
    - [ ] SUB: Implement `TestDataSeeder` extension methods: `SeedPartner()`, `SeedOperator()`, `SeedPanic()`
    - [ ] SUB: Confirm test project builds and fixture compiles

---

## 🏆 EPIC-CS-02 — Database & Schemas

> Translate the Prisma schema to EF Core entities, generate the initial migration, create seed data, and author the `openapi.yaml` contract that drives type generation for both C# and TypeScript.

---

### STORY-CS-02.1 — EF Core Entity Models

**As a** developer,
**I want** EF Core entity classes and a configured `DbContext`,
**so that** all database operations are type-safe and migrations are reproducible.

- [ ] TASK-CS-02.1.1 — Define entity models and enums

    - [ ] SUB: Create `OderPly.Shared/Enums/PartnerType.cs` (`PANIC_SOURCE`, `RESPONDER_SYSTEM`)
    - [ ] SUB: Create `OderPly.Shared/Enums/PanicStatus.cs` (`PENDING`, `ACKNOWLEDGED`, `DISPATCHED`, `RESOLVED`)
    - [ ] SUB: Create `OderPly.Shared/Enums/LogTrigger.cs` (`OPERATOR`, `PARTNER_CLAIM`)
    - [ ] SUB: Create `OderPly.Api/Data/Entities/Partner.cs`
    - [ ] SUB: Create `OderPly.Api/Data/Entities/PanicEvent.cs` (with navigation properties)
    - [ ] SUB: Create `OderPly.Api/Data/Entities/PanicEventLog.cs`
    - [ ] SUB: Create `OderPly.Api/Data/Entities/Operator.cs`

- [ ] TASK-CS-02.1.2 — Configure DbContext

    - [ ] SUB: Create `OderPly.Api/Data/OderPlyDbContext.cs`
    - [ ] SUB: `OnModelCreating`: configure unique constraints (apiKeyHash, idempotencyKey, email)
    - [ ] SUB: `OnModelCreating`: add indexes on PanicEvent (status, partnerId, claimedByPartnerId, createdAt DESC)
    - [ ] SUB: Configure enum storage as strings
    - [ ] SUB: Register `OderPlyDbContext` in Program.cs with Npgsql connection string

- [ ] TASK-CS-02.1.3 — Generate and apply initial migration

    - [ ] SUB: `dotnet ef migrations add InitialCreate` from `api.csharp/OderPly.Api/`
    - [ ] SUB: Confirm migration file created in `Data/Migrations/`
    - [ ] SUB: `dotnet ef database update` against local dev PostgreSQL
    - [ ] SUB: Verify schema matches Prisma model exactly (same tables, columns, indexes)

- [ ] TASK-CS-02.1.4 — Seed data

    - [ ] SUB: Create `OderPly.Api/Data/DbSeeder.cs`
    - [ ] SUB: Seed one operator, one PANIC_SOURCE partner, one RESPONDER_SYSTEM partner
    - [ ] SUB: Hash API keys with SHA256 before storing
    - [ ] SUB: Hash password with BCrypt before storing
    - [ ] SUB: Call `DbSeeder` from Program.cs on startup in Development environment only

---

### STORY-CS-02.2 — OpenAPI Contract

**As a** developer,
**I want** a single `openapi.yaml` at repo root that is the source of truth for all request/response types,
**so that** both C# server and TypeScript client can generate type-safe code from it.

- [ ] TASK-CS-02.2.1 — Write `openapi.yaml` at repo root

    - [ ] SUB: Define `info` block (title: ODERP-ly, version: 1.0.0)
    - [ ] SUB: Define `servers` (http://localhost:3000)
    - [ ] SUB: Define all `paths` matching the API surface table in CLAUDE.md
    - [ ] SUB: Define `components/schemas` for all request and response shapes
    - [ ] SUB: Mark `apiKeyHash`, `passwordHash` as `writeOnly: true` (excluded from responses)

- [ ] TASK-CS-02.2.2 — Set up NSwag C# code generation

    - [ ] SUB: Add `NSwag.MSBuild` or `nswag.json` config to `OderPly.Shared`
    - [ ] SUB: Generate C# contracts into `OderPly.Shared/Contracts/`
    - [ ] SUB: Confirm generated contracts compile

- [ ] TASK-CS-02.2.3 — Set up openapi-typescript for client

    - [ ] SUB: Add `openapi-typescript` to root `devDependencies`
    - [ ] SUB: Add `gen:types` script in root `package.json`: `openapi-typescript openapi.yaml -o client/src/types/generated.ts`
    - [ ] SUB: Run codegen and confirm `client/src/types/generated.ts` is generated

---

## 🏆 EPIC-CS-03 — Auth & Authorization

> Implement JWT-based operator login and SHA256 API key guard for partners, matching the existing Node.js auth behaviour exactly.

---

### STORY-CS-03.1 — JWT Operator Login

**As an** operator,
**I want** to exchange email + password for a JWT,
**so that** I can make authenticated API calls.

- [ ] TASK-CS-03.1.1 — Implement POST /api/auth/login

    - [ ] SUB: Create `AuthController` with `[HttpPost("login")]`
    - [ ] SUB: Accept `LoginRequest` DTO (email, password)
    - [ ] SUB: Validate request with FluentValidation (`LoginRequestValidator`)
    - [ ] SUB: Look up operator by email; return 401 if not found
    - [ ] SUB: Verify BCrypt hash; return 401 if wrong
    - [ ] SUB: Sign JWT with `operatorId`, `email`, `name` claims
    - [ ] SUB: Return 200 `{ token, operator }` — never include `passwordHash`

- [ ] TASK-CS-03.1.2 — Configure JWT bearer middleware

    - [ ] SUB: Add `AddAuthentication(JwtBearerDefaults.AuthenticationScheme)` in Program.cs
    - [ ] SUB: Configure `TokenValidationParameters` (issuer, audience, signing key from env)
    - [ ] SUB: Read `JWT_SECRET` from `appsettings.json` / env var

- [ ] TASK-CS-03.1.3 — Apply `[Authorize]` to operator routes

    - [ ] SUB: Add `[Authorize]` to `PanicsController` (all operator actions)
    - [ ] SUB: Add `[Authorize]` to `PartnersController`
    - [ ] SUB: Confirm unauthenticated requests return 401

---

### STORY-CS-03.2 — API Key Guard for Partners

**As a** partner system,
**I want** to authenticate via `X-API-Key` header,
**so that** I can submit or claim panics without managing JWT tokens.

- [ ] TASK-CS-03.2.1 — Implement ApiKeyAuthenticationHandler

    - [ ] SUB: Create `OderPly.Api/Middleware/ApiKeyAuthenticationHandler.cs`
    - [ ] SUB: Extract `X-API-Key` header; return 401 if missing
    - [ ] SUB: SHA256-hash the key and look up Partner by `apiKeyHash`; return 401 if not found
    - [ ] SUB: Populate `ClaimsPrincipal` with `partnerId` and `partnerType` claims

- [ ] TASK-CS-03.2.2 — Register API key scheme and apply to partner routes

    - [ ] SUB: Register `ApiKeyAuthenticationHandler` in Program.cs as an auth scheme
    - [ ] SUB: Apply `[Authorize(AuthenticationSchemes = "ApiKey")]` to `POST /panics`
    - [ ] SUB: Apply `[Authorize(AuthenticationSchemes = "ApiKey")]` to `POST /panics/:id/claim`

- [ ] TASK-CS-03.2.3 — Partner type enforcement

    - [ ] SUB: Create `PartnerTypeRequirement` authorization policy
    - [ ] SUB: `POST /panics` requires `PANIC_SOURCE`; return 403 for other types
    - [ ] SUB: `POST /panics/:id/claim` requires `RESPONDER_SYSTEM`; return 403 for other types

---

## 🏆 EPIC-CS-04 — Core Domain Services

> Implement the state machine, PanicService (all transitions with pessimistic locking and atomic audit logging), WebhookQueue, and PartnerService.

---

### STORY-CS-04.1 — State Machine

- [ ] TASK-CS-04.1.1 — Implement assertTransition equivalent

    - [ ] SUB: Create `OderPly.Api/Services/PanicStateMachine.cs`
    - [ ] SUB: Define valid transitions as a dictionary
    - [ ] SUB: `AssertTransition(PanicStatus from, PanicStatus to)` — throws `InvalidTransitionException` if invalid
    - [ ] SUB: Create `InvalidTransitionException` (maps to HTTP 400)

---

### STORY-CS-04.2 — PanicService

- [ ] TASK-CS-04.2.1 — SubmitPanic

    - [ ] SUB: Check idempotencyKey uniqueness — return existing panic if same partner, 409 if different
    - [ ] SUB: Create `PanicEvent` with status `PENDING`
    - [ ] SUB: Write `PanicEventLog` entry atomically (EF Core transaction)
    - [ ] SUB: Enqueue `panic.created` webhook to all `RESPONDER_SYSTEM` partners
    - [ ] SUB: Never include `apiKeyHash` in returned panic object

- [ ] TASK-CS-04.2.2 — ClaimPanic

    - [ ] SUB: Begin transaction with Serializable isolation
    - [ ] SUB: `SELECT FOR UPDATE` via `FromSql` to pessimistically lock the row
    - [ ] SUB: Assert transition `PENDING → ACKNOWLEDGED`
    - [ ] SUB: Set `claimedByPartnerId`, update status to `ACKNOWLEDGED`
    - [ ] SUB: Write `PanicEventLog` with `triggeredBy = PARTNER_CLAIM`, `partnerId` set, `operatorId` null
    - [ ] SUB: Enqueue `panic.status_updated` webhook to `PANIC_SOURCE` only

- [ ] TASK-CS-04.2.3 — Operator transitions (Acknowledge, Dispatch, Resolve)

    - [ ] SUB: `AcknowledgePanic` — assert `PENDING → ACKNOWLEDGED`; write log with `triggeredBy = OPERATOR`
    - [ ] SUB: `DispatchPanic` — assert `ACKNOWLEDGED → DISPATCHED`; write log with `triggeredBy = OPERATOR`
    - [ ] SUB: `ResolvePanic` — assert `DISPATCHED → RESOLVED`; write log with `triggeredBy = OPERATOR`
    - [ ] SUB: Each writes `PanicEventLog` with `operatorId` set, `partnerId` null
    - [ ] SUB: Each enqueues `panic.status_updated` to `PANIC_SOURCE` + `claimedByPartner` (if any)
    - [ ] SUB: Wrap each in a `BeginTransactionAsync()` block

---

### STORY-CS-04.3 — WebhookQueue

- [ ] TASK-CS-04.3.1 — In-process Channel-based queue

    - [ ] SUB: Create `OderPly.Api/Services/WebhookQueue.cs`
    - [ ] SUB: Use `System.Threading.Channels.Channel<WebhookPayload>`
    - [ ] SUB: `EnqueueAsync(string url, object payload)` — write to channel
    - [ ] SUB: Register as singleton in Program.cs

- [ ] TASK-CS-04.3.2 — BackgroundService delivery

    - [ ] SUB: Create `OderPly.Api/Services/WebhookDeliveryService.cs` (inherits `BackgroundService`)
    - [ ] SUB: Read from channel; HTTP POST to target URL with `JsonContent`
    - [ ] SUB: Catch exceptions; log failure but never rethrow
    - [ ] SUB: Register as hosted service in Program.cs

---

### STORY-CS-04.4 — PartnerService

- [ ] TASK-CS-04.4.1 — GetPartners (paginated, filterable)

    - [ ] SUB: Accept `page`, `limit`, optional `type` filter
    - [ ] SUB: Return `{ data: Partner[], total, page, limit }` — exclude `apiKeyHash`

- [ ] TASK-CS-04.4.2 — GetPartner (single)

    - [ ] SUB: Look up by id; throw `NotFoundException` (maps to 404) if not found
    - [ ] SUB: Return partner — exclude `apiKeyHash`

---

## 🏆 EPIC-CS-05 — API Controllers + Validators

> Wire up all HTTP endpoints, FluentValidation, response projections, and correct HTTP status codes matching the API surface table in CLAUDE.md.

---

### STORY-CS-05.1 — PanicsController

- [ ] TASK-CS-05.1.1 — POST /api/v1/panics
- [ ] TASK-CS-05.1.2 — GET /api/v1/panics (paginated + status/partnerId filters)
- [ ] TASK-CS-05.1.3 — GET /api/v1/panics/:id
- [ ] TASK-CS-05.1.4 — POST /api/v1/panics/:id/claim
- [ ] TASK-CS-05.1.5 — POST /api/v1/panics/:id/acknowledge
- [ ] TASK-CS-05.1.6 — POST /api/v1/panics/:id/dispatch
- [ ] TASK-CS-05.1.7 — POST /api/v1/panics/:id/resolve
- [ ] TASK-CS-05.1.8 — GET /api/v1/panics/:id/logs (paginated)
- [ ] TASK-CS-05.1.9 — GET /api/v1/panics/:id/logs/:logId

---

### STORY-CS-05.2 — PartnersController

- [ ] TASK-CS-05.2.1 — GET /api/v1/partners (paginated + type filter)
- [ ] TASK-CS-05.2.2 — GET /api/v1/partners/:id

---

### STORY-CS-05.3 — FluentValidation

- [ ] TASK-CS-05.3.1 — SubmitPanicRequestValidator

    - [ ] SUB: `latitude` in `[-90, 90]`
    - [ ] SUB: `longitude` in `[-180, 180]`
    - [ ] SUB: `idempotencyKey` matches UUID v4 regex
    - [ ] SUB: `externalUserId` not empty

- [ ] TASK-CS-05.3.2 — LoginRequestValidator

    - [ ] SUB: `email` is valid email format
    - [ ] SUB: `password` not empty

---

## 🏆 EPIC-CS-06 — Real-Time (SignalR)

> Replace Socket.io with SignalR, preserving identical event names and payload shapes for the operator dashboard.

---

### STORY-CS-06.1 — PanicHub

- [ ] TASK-CS-06.1.1 — Create SignalR hub with JWT auth

    - [ ] SUB: Create `OderPly.Api/SignalR/PanicHub.cs` (inherits `Hub`)
    - [ ] SUB: Apply `[Authorize]` — JWT validated at handshake
    - [ ] SUB: Map hub to `/socket.io` path (or `/hubs/panics`) in Program.cs
    - [ ] SUB: Configure SignalR in Program.cs with `AddSignalR()`

- [ ] TASK-CS-06.1.2 — Inject IHubContext into PanicService

    - [ ] SUB: Inject `IHubContext<PanicHub>` into `PanicService`
    - [ ] SUB: Broadcast after `SubmitPanic`: `Clients.All.SendAsync("panic:new", panic)`
    - [ ] SUB: Broadcast after every transition: `Clients.All.SendAsync("panic:updated", panic)`

- [ ] TASK-CS-06.1.3 — Confirm payload shape

    - [ ] SUB: SignalR payload mirrors REST response shape (same fields as GET /panics/:id)
    - [ ] SUB: Never include `apiKeyHash` in broadcast payload

---

## 🏆 EPIC-CS-07 — Frontend Contract Binding

> Update the React client to consume OpenAPI-generated types and replace the socket.io-client with the SignalR client.

---

### STORY-CS-07.1 — TypeScript Codegen

- [ ] TASK-CS-07.1.1 — Run openapi-typescript

    - [ ] SUB: `npm run gen:types` → confirm `client/src/types/generated.ts` is up-to-date
    - [ ] SUB: Import generated types in `client/src/lib/apiClient.ts`
    - [ ] SUB: Remove any hand-written type duplicates that are now generated

- [ ] TASK-CS-07.1.2 — Update apiClient.ts

    - [ ] SUB: Replace all untyped `axios` calls with typed request/response using generated interfaces
    - [ ] SUB: Confirm TypeScript compiler reports zero type errors in `client/`

- [ ] TASK-CS-07.1.3 — Replace socket.io-client with SignalR client

    - [ ] SUB: `npm install @microsoft/signalr --workspace=client`
    - [ ] SUB: Remove `socket.io-client` dependency from `client/package.json`
    - [ ] SUB: Update all `socket.io-client` imports to `@microsoft/signalr`
    - [ ] SUB: Update connection setup: `new HubConnectionBuilder().withUrl("/hubs/panics", { accessTokenFactory: () => token })`
    - [ ] SUB: Update event listener calls: `connection.on("panic:new", handler)`
    - [ ] SUB: Confirm real-time updates still work end-to-end
