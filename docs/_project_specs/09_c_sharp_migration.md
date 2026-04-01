# ODERP-ly — C# Backend Migration Guide

## Executive Summary

Migrating from **Node.js/Fastify/Prisma** to **C#/ASP.NET Core/EF Core** is a straightforward framework replacement. Core business logic, data model, state machine, and real-time architecture remain identical. The main considerations are framework conventions and the shared type contract strategy.

---

## Architecture Overview — What Translates 1:1

- Panic ingestion workflow (partner API key auth)
- Responder claim mechanics (pessimistic locking)
- Operator status transitions (state machine)
- Webhook fanout pattern (async, non-blocking)
- Real-time operator dashboard (Socket.io → SignalR)
- Audit logging (immutable log tables)
- Consistency model (CP; atomic transactions)

---

## Technology Stack — Layer by Layer

### 1. Web Framework

| Current | Migration |
|---------|-----------|
| Fastify 4.x | **ASP.NET Core 8/9 (Kestrel)** |
| `npm install fastify` | `dotnet new webapi` as project template |

**Rationale:** Kestrel (ASP.NET Core's built-in server) has feature parity with Fastify. Both are async-first, both support middleware pipelines, both scale to high throughput.

**Learning curve:** Moderate. ASP.NET Core's middleware and dependency injection patterns differ from Fastify, but the async/await model is identical to Node.js.

---

### 2. Database Layer — ORM & Migrations

| Current | Migration |
|---------|-----------|
| Prisma + PostgreSQL | **EF Core 8+ with Npgsql provider** |
| `npx prisma migrate dev` | `dotnet ef migrations add <Name>` |

**EF Core Advantages:**
- Automatic migration generation (compile schema → migration file)
- Native support for `SELECT FOR UPDATE` (pessimistic locking)
- Change tracking built in; `SaveChangesAsync()` is atomic
- Rich LINQ query building

**Entity Definition Example:**
```csharp
public class PanicEvent
{
    public Guid Id { get; set; }
    public Guid PartnerId { get; set; }
    public Guid? ClaimedByPartnerId { get; set; }
    
    public string ExternalUserId { get; set; } = null!;
    public float Latitude { get; set; }
    public float Longitude { get; set; }
    
    [EnumDataType(typeof(PanicStatus))]
    public PanicStatus Status { get; set; }
    
    public string IdempotencyKey { get; set; } = null!;
    public JsonElement? Metadata { get; set; }
    
    public DateTime CreatedAt { get; set; }
    
    // Navigation
    public Partner Partner { get; set; } = null!;
    public Partner? ClaimedByPartner { get; set; }
    public ICollection<PanicEventLog> Logs { get; set; } = new List<PanicEventLog>();
}

public class PanicEventLog
{
    public Guid Id { get; set; }
    public Guid PanicEventId { get; set; }
    
    [EnumDataType(typeof(PanicStatus))]
    public PanicStatus PreviousStatus { get; set; }
    
    [EnumDataType(typeof(PanicStatus))]
    public PanicStatus NewStatus { get; set; }
    
    [EnumDataType(typeof(AuditTrigger))]
    public AuditTrigger TriggeredBy { get; set; }
    
    public Guid? OperatorId { get; set; }
    public Guid? PartnerId { get; set; }
    
    public DateTime CreatedAt { get; set; }
    
    // Navigation
    public PanicEvent PanicEvent { get; set; } = null!;
    public Operator? Operator { get; set; }
    public Partner? Partner { get; set; }
}
```

**Indexes:** Defined in `OnModelCreating`:
```csharp
protected override void OnModelCreating(ModelBuilder modelBuilder)
{
    modelBuilder.Entity<PanicEvent>()
        .HasIndex(p => p.Status);
    
    modelBuilder.Entity<PanicEvent>()
        .HasIndex(p => p.PartnerId);
    
    modelBuilder.Entity<PanicEvent>()
        .HasIndex(p => p.ClaimedByPartnerId);
    
    modelBuilder.Entity<PanicEvent>()
        .HasIndex(p => new { p.CreatedAt })
        .IsDescending(new[] { true });
}
```

---

### 3. Real-time Communication

| Current | Migration |
|---------|-----------|
| Socket.io | **SignalR (ASP.NET Core native)** |
| `socket.emit('event', data)` | `await hub.Clients.All.SendAsync("event", data)` |

**Feature Parity:** SignalR hubs are identical in concept to Socket.io namespaces. All event names (`panic:new`, `panic:updated`) map 1:1. Browser client libraries are nearly identical.

**Hub Implementation:**
```csharp
public class PanicHub : Hub
{
    [Authorize]
    public override async Task OnConnectedAsync()
    {
        // Verify JWT on handshake (done by Authorize attribute)
        await base.OnConnectedAsync();
    }
    
    // Called from panic creation handler
    public async Task BroadcastPanicCreated(PanicEventDto panic)
    {
        await Clients.All.SendAsync("panic:new", panic);
    }
    
    // Called from status transition handler
    public async Task BroadcastPanicUpdated(PanicEventDto panic)
    {
        await Clients.All.SendAsync("panic:updated", panic);
    }
}
```

---

### 4. Validation & Schemas

**Technology:** FluentValidation

Validator for panic ingestion:
```csharp
public class SubmitPanicRequestValidator : AbstractValidator<SubmitPanicRequest>
{
    public SubmitPanicRequestValidator()
    {
        RuleFor(x => x.Latitude)
            .InclusiveBetween(-90, 90)
            .WithMessage("Latitude must be between -90 and 90");
        
        RuleFor(x => x.Longitude)
            .InclusiveBetween(-180, 180)
            .WithMessage("Longitude must be between -180 and 180");
        
        RuleFor(x => x.IdempotencyKey)
            .NotEmpty()
            .Must(k => Guid.TryParse(k, out _))
            .WithMessage("IdempotencyKey must be a valid UUID v4");
        
        RuleFor(x => x.ExternalUserId)
            .NotEmpty()
            .MaximumLength(255);
    }
}

// Register in Program.cs
services.AddFluentValidationAutoValidation();
services.AddValidatorsFromAssemblyContaining<SubmitPanicRequestValidator>();
```

**Advantage:** Live validation on request binding; validation errors are automatically formatted and returned as 400 responses.

---

## 5. Shared Type Contracts — OpenAPI/Swagger-First Approach

### Strategy

Define all API contracts in an **OpenAPI 3.0 specification file** (`openapi.yaml`). Both the C# backend and TypeScript frontend **generate code from this single source of truth**.

### Workflow

```
1. Write/update openapi.yaml (contract definition)
2. Generate C# models: OpenAPI Generator or NSwag
3. Generate TypeScript client: openapi-typescript or Swagger Codegen
4. Backend team implements C# controllers
5. Frontend team consumes generated TypeScript client
```

### Benefits

- **Contract-first development** — teams agree on API shape before implementation
- **Type safety** — both languages have identical type contracts
- **Minimal drift** — changes to one spec automatically propagate
- **Team independence** — once contract is locked, teams work in parallel

### Example OpenAPI Fragment

```yaml
openapi: 3.0.0
info:
  title: ODERP-ly API
  version: 1.0.0

paths:
  /api/v1/panics:
    post:
      summary: Submit a panic event
      security:
        - ApiKeyAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/SubmitPanicRequest'
      responses:
        '201':
          description: Panic event created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/PanicEventResponse'

components:
  schemas:
    SubmitPanicRequest:
      type: object
      required:
        - externalUserId
        - latitude
        - longitude
        - idempotencyKey
      properties:
        externalUserId:
          type: string
            maxLength: 255
            description: PII — end user identifier from partner system
        latitude:
          type: number
          format: float
          minimum: -90
          maximum: 90
        longitude:
          type: number
          format: float
          minimum: -180
          maximum: 180
        idempotencyKey:
          type: string
          format: uuid
        metadata:
          type: object
          nullable: true
    
    PanicEventResponse:
      type: object
      properties:
        id:
          type: string
          format: uuid
        partnerId:
          type: string
          format: uuid
        status:
          type: string
          enum: [PENDING, ACKNOWLEDGED, DISPATCHED, RESOLVED]
        createdAt:
          type: string
          format: date-time
```

### Generation Setup

#### C# (using NSwag)

```bash
# Install CLI
dotnet tool install NSwag.ConsoleCore

# Generate models
nswag openapi2csharp /input:openapi.yaml /output:Generated/PanicClient.cs
```

#### TypeScript (using openapi-typescript)

```bash
# Install
npm install --save-dev openapi-typescript

# Generate types
npx openapi-typescript openapi.yaml -o src/types/generated.ts
```

### Agreement: This Approach ✅

**Yes, this is the right choice for contract-driven development.** It forces teams to think about API contracts before implementation, prevents surprises, and scales to multiple teams without coordination overhead. This is the standard practice at organizations like Stripe, GitHub, and most enterprise backends.

---

## Atomic Operations — PanicEvent + PanicEventLog

### The Challenge

Every status transition must update `PanicEvent` (status field) AND write an immutable `PanicEventLog` entry. These two writes must be atomic — if one fails, both must roll back.

### Solution: EF Core Transactions (Recommended)

**Do NOT use database procedures.** EF Core's built-in transaction mechanism is both simpler and more maintainable.

```csharp
public class PanicService
{
    private readonly OderPlyDbContext _context;
    
    public async Task AcknowledgeAsync(Guid panicId, Guid operatorId)
    {
        // Begin transaction
        using var transaction = await _context.Database.BeginTransactionAsync();
        
        try
        {
            // 1. Fetch with pessimistic lock (if needed)
            var panic = await _context.PanicEvents
                .FirstOrDefaultAsync(p => p.Id == panicId);
            
            if (panic == null)
                throw new PanicNotFoundException();
            
            // 2. Validate state machine
            if (panic.Status != PanicStatus.Pending)
                throw new InvalidTransitionException(panic.Status, PanicStatus.Acknowledged);
            
            // 3. Update panic status
            panic.Status = PanicStatus.Acknowledged;
            _context.PanicEvents.Update(panic);
            
            // 4. Write audit log
            var log = new PanicEventLog
            {
                Id = Guid.NewGuid(),
                PanicEventId = panicId,
                PreviousStatus = PanicStatus.Pending,
                NewStatus = PanicStatus.Acknowledged,
                TriggeredBy = AuditTrigger.Operator,
                OperatorId = operatorId,
                CreatedAt = DateTime.UtcNow
            };
            
            _context.PanicEventLogs.Add(log);
            
            // 5. Save both changes atomically
            await _context.SaveChangesAsync();
            
            // 6. Commit transaction
            await transaction.CommitAsync();
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }
}
```

### Why NOT Database Procedures?

| Procedure | EF Core Transaction |
|-----------|---------------------|
| SQL versioning burden | Version controlled in C# migrations |
| Harder to debug | Plain C# code, debuggable |
| Coupling to DB engine | Portable across DB vendors |
| Complex deployment | Automatic via EF migrations |
| Requires context switching | Pure C# workflow |

### Alternative: `SaveChangesAsync()` Auto-Transaction

By default, **`SaveChangesAsync()` wraps all pending changes in a single database transaction**. You don't need explicit `BeginTransactionAsync()` for simple cases:

```csharp
var panic = await _context.PanicEvents.FirstOrDefaultAsync(p => p.Id == panicId);
panic.Status = PanicStatus.Acknowledged;

var log = new PanicEventLog { /* ... */ };
_context.PanicEventLogs.Add(log);

// Atomic by default
await _context.SaveChangesAsync();
```

**Use explicit transactions only when:**
- You need multiple `SaveChangesAsync()` calls to be atomic
- You need specific isolation levels
- You need to retry logic or deadlock handling

### Pessimistic Locking (SELECT FOR UPDATE) for Claim Endpoint

For the claim endpoint specifically, you need `SELECT FOR UPDATE`:

```csharp
public async Task<PanicEventDto> ClaimAsync(Guid panicId, Guid partnerId)
{
    using var transaction = await _context.Database.BeginTransactionAsync(
        IsolationLevel.Serializable  // Strongest isolation for claim race
    );
    
    try
    {
        // Fetch with lock (prevents concurrent claims)
        var panic = await _context.PanicEvents
            .FromSql($"SELECT * FROM \"PanicEvent\" WHERE \"Id\" = {panicId} FOR UPDATE")
            .FirstOrDefaultAsync();
        
        if (panic == null)
            throw new PanicNotFoundException();
        
        if (panic.Status != PanicStatus.Pending)
            throw new ConflictException("Panic already claimed or transitioned");
        
        // Update
        panic.Status = PanicStatus.Acknowledged;
        panic.ClaimedByPartnerId = partnerId;
        _context.PanicEvents.Update(panic);
        
        // Log
        var log = new PanicEventLog
        {
            Id = Guid.NewGuid(),
            PanicEventId = panicId,
            PreviousStatus = PanicStatus.Pending,
            NewStatus = PanicStatus.Acknowledged,
            TriggeredBy = AuditTrigger.PartnerClaim,
            PartnerId = partnerId,
            CreatedAt = DateTime.UtcNow
        };
        
        _context.PanicEventLogs.Add(log);
        
        // Save atomically
        await _context.SaveChangesAsync();
        await transaction.CommitAsync();
        
        return MapToDto(panic);
    }
    catch
    {
        await transaction.RollbackAsync();
        throw;
    }
}
```

### Summary: Atomic Operations Strategy

✅ **Use:** EF Core transactions + explicit `BeginTransactionAsync()` for complex multi-step operations  
✅ **Use:** Default auto-transaction from `SaveChangesAsync()` for simple updates  
✅ **Use:** `SELECT FOR UPDATE` (via `FromSql`) for pessimistic locking on claim endpoint  
❌ **Avoid:** Database procedures (maintenance burden outweighs benefits)  

---

## Authentication & Authorization

### Operator Login (JWT)

```csharp
[HttpPost("auth/login")]
[AllowAnonymous]
public async Task<LoginResponse> LoginAsync([FromBody] LoginRequest request)
{
    var op = await _context.Operators
        .FirstOrDefaultAsync(o => o.Email == request.Email);
    
    if (op == null || !BCrypt.Net.BCrypt.Verify(request.Password, op.PasswordHash))
        return Unauthorized("Invalid credentials");
    
    var token = _jwtService.GenerateToken(op);
    return new LoginResponse { Token = token, Operator = MapToDto(op) };
}
```

### API Key Guard (Partner Authentication)

```csharp
public class ApiKeyAuthenticationHandler : AuthenticationHandler<ApiKeyAuthenticationOptions>
{
    private readonly OderPlyDbContext _context;
    
    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!Request.Headers.TryGetValue("X-API-Key", out var apiKeyValue))
            return AuthenticateResult.Fail("Missing API key");
        
        var apiKeyHash = SHA256.HashData(Encoding.UTF8.GetBytes(apiKeyValue));
        var partner = await _context.Partners
            .FirstOrDefaultAsync(p => p.ApiKeyHash == apiKeyHash);
        
        if (partner == null)
            return AuthenticateResult.Fail("Invalid API key");
        
        var claims = new[] {
            new Claim("PartnerId", partner.Id.ToString()),
            new Claim("PartnerType", partner.Type.ToString())
        };
        
        var identity = new ClaimsIdentity(claims, nameof(ApiKeyAuthenticationHandler));
        var ticket = new AuthenticationTicket(new ClaimsPrincipal(identity), Scheme.Name);
        
        return AuthenticateResult.Success(ticket);
    }
}

// In Program.cs
services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = "ApiKey";
    options.DefaultChallengeScheme = "ApiKey";
})
.AddScheme<ApiKeyAuthenticationOptions, ApiKeyAuthenticationHandler>("ApiKey", null);
```

---

## Webhook Queue (Async Delivery)

### In-Process Queue (MVP)

```csharp
public class WebhookQueue
{
    private readonly Channel<WebhookEvent> _channel;
    private readonly OderPlyDbContext _context;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<WebhookQueue> _logger;
    
    public WebhookQueue(
        OderPlyDbContext context,
        IHttpClientFactory httpClientFactory,
        ILogger<WebhookQueue> logger)
    {
        _context = context;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
        _channel = Channel.CreateUnbounded<WebhookEvent>();
    }
    
    public async ValueTask EnqueueAsync(WebhookEvent evt)
    {
        await _channel.Writer.WriteAsync(evt);
    }
    
    public async Task ProcessAsync(CancellationToken ct)
    {
        await foreach (var evt in _channel.Reader.ReadAllAsync(ct))
        {
            try
            {
                await DeliverAsync(evt);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Webhook delivery failed: {@Event}", evt);
                // Do NOT throw; failures are logged but non-fatal
            }
        }
    }
    
    private async Task DeliverAsync(WebhookEvent evt)
    {
        var partner = await _context.Partners
            .FirstOrDefaultAsync(p => p.Id == evt.PartnerId);
        
        if (partner?.WebhookUrl == null)
        {
            _logger.LogWarning("Partner {PartnerId} has no webhook URL", evt.PartnerId);
            return;
        }
        
        var client = _httpClientFactory.CreateClient();
        var response = await client.PostAsJsonAsync(
            partner.WebhookUrl,
            evt,
            new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase }
        );
        
        response.EnsureSuccessStatusCode();
    }
}

// Host background service for processing
public class WebhookProcessorBackgroundService : BackgroundService
{
    private readonly WebhookQueue _queue;
    
    public WebhookProcessorBackgroundService(WebhookQueue queue) => _queue = queue;
    
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await _queue.ProcessAsync(stoppingToken);
    }
}

// Register in Program.cs
services.AddSingleton<WebhookQueue>();
services.AddHostedService<WebhookProcessorBackgroundService>();
```

---

## Project Structure

```
OderPly.sln
├── OderPly.Api/
│   ├── Program.cs                        (Kestrel setup, DI container)
│   ├── appsettings.json                 (configuration)
│   ├── OderPly.Api.csproj
│   │
│   ├── Controllers/
│   │   ├── AuthController.cs
│   │   ├── AuthController.Tests.cs      (colocated test)
│   │   ├── PanicsController.cs
│   │   ├── PanicsController.Tests.cs
│   │   ├── PartnersController.cs
│   │   ├── PartnersController.Tests.cs
│   │   ├── LogsController.cs
│   │   └── LogsController.Tests.cs
│   │
│   ├── Services/
│   │   ├── PanicService.cs
│   │   ├── PanicService.Tests.cs        (colocated test)
│   │   ├── PartnerService.cs
│   │   ├── PartnerService.Tests.cs
│   │   ├── JwtService.cs
│   │   ├── JwtService.Tests.cs
│   │   ├── WebhookQueue.cs
│   │   └── WebhookQueue.Tests.cs
│   │
│   ├── Middleware/
│   │   ├── ApiKeyAuthenticationHandler.cs
│   │   ├── ApiKeyAuthenticationHandler.Tests.cs
│   │   ├── ErrorHandlingMiddleware.cs
│   │   └── ErrorHandlingMiddleware.Tests.cs
│   │
│   ├── Data/
│   │   ├── OderPlyDbContext.cs
│   │   ├── OderPlyDbContext.Tests.cs
│   │   └── Migrations/
│   │       ├── 001_InitialCreate.cs
│   │       └── ...
│   │
│   ├── SignalR/
│   │   ├── PanicHub.cs
│   │   └── PanicHub.Tests.cs
│   │
│   ├── Models/
│   │   ├── PanicEventDto.cs
│   │   ├── SubmitPanicRequest.cs
│   │   ├── SubmitPanicRequest.Tests.cs
│   │   ├── LoginRequest.cs
│   │   └── ...
│   │
│   ├── Validators/
│   │   ├── SubmitPanicRequestValidator.cs
│   │   ├── SubmitPanicRequestValidator.Tests.cs
│   │   └── ...
│   │
│   └── TestFixtures/
│       ├── DbContextFixture.cs      (test helper — shared across tests)
│       ├── TestDataSeeder.cs
│       ├── JwtTokenFixture.cs
│       └── ApiKeyFixture.cs
│
├── OderPly.Shared/
│   ├── OderPly.Shared.csproj
│   ├── Enums/
│   │   ├── PanicStatus.cs
│   │   ├── PartnerType.cs
│   │   ├── AuditTrigger.cs
│   │   └── ...
│   │
│   ├── Contracts/               (OpenAPI-generated)
│   │   ├── PanicEventResponse.cs
│   │   ├── SubmitPanicRequest.cs
│   │   └── ...
│   │
│   └── Constants/
│       └── ApiPaths.cs
│
├── openapi.yaml                    (API contract — single source of truth)
│
└── client/                         (React + Vite, unchanged)
    ├── src/
    │   ├── types/
    │   │   └── generated.ts        (generated from openapi.yaml)
    │   └── ...
    └── ...
```

**Test File Naming:** `ClassName.Tests.cs` — colocated next to the source file. Both files live in the same folder.

---

## Testing Strategy — Colocated Tests

Tests live next to source code using the `ClassName.Tests.cs` naming convention. Both files reside in the same folder.

### Unit Tests (xUnit)

Example: `Services/PanicService.cs` and `Services/PanicService.Tests.cs`

```csharp
namespace OderPly.Api.Services;

public class PanicServiceTests
{
    private readonly OderPlyDbContext _context;
    private readonly PanicService _service;
    
    public PanicServiceTests()
    {
        // In-memory SQLite for tests
        var options = new DbContextOptionsBuilder<OderPlyDbContext>()
            .UseSqlite("Data Source=:memory:")
            .Options;
        
        _context = new OderPlyDbContext(options);
        _context.Database.EnsureCreated();
        
        _service = new PanicService(_context);
    }
    
    [Fact]
    public async Task AcknowledgeAsync_WithValidPanic_TransitionsStatus()
    {
        // Arrange
        var panic = new PanicEvent
        {
            Id = Guid.NewGuid(),
            PartnerId = Guid.NewGuid(),
            Status = PanicStatus.Pending,
            ExternalUserId = "user123",
            Latitude = 40.7128f,
            Longitude = -74.0060f,
            IdempotencyKey = Guid.NewGuid().ToString(),
            CreatedAt = DateTime.UtcNow
        };
        
        _context.PanicEvents.Add(panic);
        await _context.SaveChangesAsync();
        
        // Act
        await _service.AcknowledgeAsync(panic.Id, Guid.NewGuid());
        
        // Assert
        var updated = await _context.PanicEvents.FindAsync(panic.Id);
        Assert.Equal(PanicStatus.Acknowledged, updated.Status);
        
        var log = await _context.PanicEventLogs
            .FirstOrDefaultAsync(l => l.PanicEventId == panic.Id);
        Assert.NotNull(log);
        Assert.Equal(AuditTrigger.Operator, log.TriggeredBy);
    }
}
```

### Integration Tests (Controllers via WebApplicationFactory)

Example: `Controllers/PanicsController.cs` and `Controllers/PanicsController.Tests.cs`

Controller tests wire up the full HTTP pipeline:

```csharp
namespace OderPly.Api.Controllers;

public class PanicsControllerIntegrationTests : IAsyncLifetime
{
    private WebApplicationFactory<Program> _factory = null!;
    private HttpClient _client = null!;
    
    public async Task InitializeAsync()
    {
        _factory = new WebApplicationFactory<Program>()
            .WithWebHostBuilder(builder =>
            {
                builder.ConfigureServices(services =>
                {
                    // Replace real DB with in-memory SQLite
                    var descriptor = services.SingleOrDefault(
                        d => d.ServiceType == typeof(DbContextOptions<OderPlyDbContext>));
                    
                    if (descriptor != null)
                        services.Remove(descriptor);
                    
                    services.AddDbContext<OderPlyDbContext>(options =>
                        options.UseSqlite("Data Source=:memory:"));
                });
            });
        
        _client = _factory.CreateClient();
        
        // Initialize in-memory DB schema
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<OderPlyDbContext>();
        await db.Database.EnsureCreatedAsync();
    }
    
    public async Task DisposeAsync() => await _factory.DisposeAsync();
    
    [Fact]
    public async Task SubmitPanic_WithValidApiKeyAndRequest_Returns201()
    {
        // Arrange
        const string apiKey = "test-key-12345";
        var partner = new Partner
        {
            Id = Guid.NewGuid(),
            Name = "Test Source",
            Type = PartnerType.PanicSource,
            ApiKeyHash = SHA256.HashData(Encoding.UTF8.GetBytes(apiKey)),
            CreatedAt = DateTime.UtcNow
        };
        
        // Seed test data
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<OderPlyDbContext>();
            db.Partners.Add(partner);
            await db.SaveChangesAsync();
        }
        
        var request = new SubmitPanicRequest
        {
            ExternalUserId = "user@example.com",
            Latitude = 40.7128f,
            Longitude = -74.0060f,
            IdempotencyKey = Guid.NewGuid().ToString()
        };
        
        // Act
        var httpRequest = new HttpRequestMessage(HttpMethod.Post, "/api/v1/panics")
        {
            Headers = { { "X-API-Key", apiKey } },
            Content = JsonContent.Create(request)
        };
        
        var response = await _client.SendAsync(httpRequest);
        
        // Assert
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var content = await response.Content.ReadAsAsync<PanicEventDto>();
        Assert.NotNull(content.Id);
        Assert.Equal(PanicStatus.Pending, content.Status);
    }
}
```

### Shared Test Fixtures (TestFixtures folder)

Helper utilities used across multiple test files:

```csharp
// TestFixtures/DbContextFixture.cs
namespace OderPly.Api.TestFixtures;

public class DbContextFixture : IDisposable
{
    private OderPlyDbContext? _context;
    
    public OderPlyDbContext GetContext()
    {
        var options = new DbContextOptionsBuilder<OderPlyDbContext>()
            .UseSqlite("Data Source=:memory:")
            .Options;
        
        _context = new OderPlyDbContext(options);
        _context.Database.EnsureCreated();
        return _context;
    }
    
    public void Dispose() => _context?.Dispose();
}

// TestFixtures/TestDataSeeder.cs
public static class TestDataSeeder
{
    public static Partner CreateTestPartner(
        this OderPlyDbContext context,
        PartnerType type = PartnerType.PanicSource)
    {
        var partner = new Partner
        {
            Id = Guid.NewGuid(),
            Name = $"Test {type} Partner",
            Type = type,
            ApiKeyHash = SHA256.HashData(Encoding.UTF8.GetBytes(Guid.NewGuid().ToString())),
            CreatedAt = DateTime.UtcNow
        };
        
        context.Partners.Add(partner);
        context.SaveChanges();
        return partner;
    }
    
    public static PanicEvent CreateTestPanic(
        this OderPlyDbContext context,
        Guid? partnerId = null,
        PanicStatus status = PanicStatus.Pending)
    {
        var panic = new PanicEvent
        {
            Id = Guid.NewGuid(),
            PartnerId = partnerId ?? Guid.NewGuid(),
            Status = status,
            ExternalUserId = "test@example.com",
            Latitude = 40.7128f,
            Longitude = -74.0060f,
            IdempotencyKey = Guid.NewGuid().ToString(),
            CreatedAt = DateTime.UtcNow
        };
        
        context.PanicEvents.Add(panic);
        context.SaveChanges();
        return panic;
    }
}
```

**Usage in tests:**

```csharp
public class ValidatorTests
{
    [Fact]
    public void SubmitPanicRequestValidator_WithInvalidLatitude_FailsValidation()
    {
        // Arrange
        var validator = new SubmitPanicRequestValidator();
        var request = new SubmitPanicRequest
        {
            Latitude = 95f,  // Invalid (> 90)
            Longitude = -74.0060f,
            ExternalUserId = "user@example",
            IdempotencyKey = Guid.NewGuid().ToString()
        };
        
        // Act
        var result = validator.Validate(request);
        
        // Assert
        Assert.False(result.IsValid);
        Assert.Any(result.Errors, e => e.PropertyName == nameof(SubmitPanicRequest.Latitude));
    }
}
```

---

## Migration Checklist

### Phase 1: Project Setup
- [ ] Create new `.sln` with `OderPly.Api` and `OderPly.Shared` projects
- [ ] Add NuGet packages: `EntityFrameworkCore`, `Npgsql.EntityFrameworkCore.PostgreSQL`, `FluentValidation`, `SignalR`, `xUnit`, `Moq`
- [ ] Set up `Program.cs` (Kestrel, DI, middleware pipeline)
- [ ] Create `DbContext` with all entity mappings
- [ ] Create `TestFixtures/` folder with helper classes

### Phase 2: Database & Schemas
- [ ] Translate Prisma schema to EF Core entities
- [ ] Create initial EF migration
- [ ] Add indexes, constraints, unique keys
- [ ] Create `openapi.yaml` (contract-first)
- [ ] Generate C# DTOs from OpenAPI

### Phase 3: Authentication & Authorization
- [ ] Implement JWT signing/validation (`JwtService.cs` + `JwtService.Tests.cs`)
- [ ] Implement API key guard (`ApiKeyAuthenticationHandler.cs` + tests)
- [ ] Add middleware to `Program.cs`

### Phase 4: Core Domain Services
- [ ] Implement `PanicService.cs` + `PanicService.Tests.cs`
- [ ] Implement `PartnerService.cs` + tests
- [ ] Implement `WebhookQueue.cs` + tests
- [ ] Write unit tests alongside each service

### Phase 5: API Controllers
- [ ] Implement `AuthController.cs` + `AuthController.Tests.cs`
- [ ] Implement `PanicsController.cs` + `PanicsController.Tests.cs`
- [ ] Implement `PartnersController.cs` + tests
- [ ] Implement `LogsController.cs` + tests
- [ ] Add FluentValidation validators

### Phase 6: Real-time
- [ ] Implement `PanicHub` (SignalR)
- [ ] Wire up broadcasts (panic:new, panic:updated)
- [ ] Test WebSocket connections

### Phase 7: Testing
- [ ] Write unit tests for all services
- [ ] Write integration tests for controllers
- [ ] End-to-end tests for critical flows

### Phase 8: Frontend & Contract Binding
- [ ] Generate TypeScript client from `openapi.yaml`
- [ ] Update React client to use generated client types
- [ ] Verify end-to-end with real API

---

## Key Differences from Node.js Implementation

| Concern | Node.js (Current) | C#/.NET (Target) |
|---------|-------------------|------------------|
| **Type Safety** | Runtime validation with Zod | Compile-time types + FluentValidation |
| **Migrations** | Manual SQL files | Automatic via `dotnet ef migrations add` |
| **Async Model** | Identical | Identical (async/await) |
| **Real-time** | Socket.io | SignalR (similar, native to ASP.NET Core) |
| **Dependency Injection** | Manual or Awilix | Built-in service container |
| **HTTP Server** | Fastify (third-party) | Kestrel (built-in) |
| **Error Handling** | Middleware | Middleware (identical pattern) |
| **Database Connection Pooling** | Manual (Prisma) | Automatic (EF Core + ADO.NET) |

---

## Performance Expectations

- **Request latency:** Comparable or slightly faster than Node.js (C# JIT compilation amortizes over time)
- **Connection pooling:** native to EF Core; no manual tuning needed for MVP
- **Memory footprint:** .NET runtime ~50–100MB; per-request memory similar to Node.js
- **Throughput:** Kestrel + EF Core scales to 10k+ RPS easily on modest hardware
- **Cold start:** Slower than Node.js (~500ms vs ~50ms), but irrelevant for long-running services

---

## When to Use Database Procedures (Avoid for Now)

❌ **Not recommended for ODERP-ly** because:
- Adds SQL version management overhead
- Harder to debug and test in isolation
- Couples business logic to database engine
- Requires deployment coordination (ORM + DB schema)

✅ **Consider database procedures only if:**
- Complex reporting queries with poor LINQ translation (use Dapper instead)
- Extreme bulk-operation performance needs
- Multi-step workflows that cannot be expressed in C#

For this project's use case (atomic panic + log writes), **EF Core transactions are the right tool.**

---

## Recommended Reading

- [EF Core Transactions](https://learn.microsoft.com/en-us/ef/core/saving/transactions)
- [ASP.NET Core Middleware](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/middleware)
- [SignalR Hubs](https://learn.microsoft.com/en-us/aspnet/core/signalr/hubs)
- [FluentValidation](https://docs.fluentvalidation.net/)
- [OpenAPI/Swagger Best Practices](https://swagger.io/resources/articles/best-practices-in-api-design/)
