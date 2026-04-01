# ODERP-ly — C# Migration Testing Backlog

**Scope:** xUnit integration and unit tests for the `api.csharp/` ASP.NET Core backend.
**References:** Each section references the task(s) it covers from `10_c_sharp_migration_task_backlog.md`.
**Total tests:** ~53

---

## How to Read This Document

Each section covers a testable concern. Tests are grouped by the thing under test. Each test is a single `[Fact]` or `[Theory]` — written as a clear assertion so you can copy it directly into your test class as a display name.

**Test types used:**
- **Unit** — isolated class, no DB, no HTTP (plain xUnit)
- **Integration** — real EF Core DB (in-memory or test PostgreSQL), real ASP.NET Core pipeline via `WebApplicationFactory`
- **E2E** — full stack, real HTTP, real SignalR client

**Conventions:**
- Test class per controller/service, e.g. `PanicsControllerTests`, `PanicServiceTests`
- Colocated next to the class under test as `ClassName.Tests.cs`
- Shared fixtures in `OderPly.Api.Tests/Fixtures/`

---

## 1. API Key Guard

> Covers: TASK-CS-03.2.1, TASK-CS-03.2.2, TASK-CS-03.2.3

**Type:** Integration (WebApplicationFactory)

- [ ] `[Fact] returns_401_when_X_API_Key_header_is_missing()`
- [ ] `[Fact] returns_401_when_X_API_Key_does_not_match_any_partner()`
- [ ] `[Fact] returns_403_when_partner_type_does_not_match_route_requirement()`
    - Specifically: PANIC_SOURCE key on claim route → 403
- [ ] `[Fact] attaches_resolved_Partner_identity_to_HttpContext_on_valid_key()`
- [ ] `[Fact] resolves_the_correct_partner_when_multiple_partners_exist()`
    - Two partners seeded; confirm the right one is resolved by its key

---

## 2. JWT Auth — Login Endpoint

> Covers: TASK-CS-03.1.1

**Type:** Integration

- [ ] `[Fact] returns_401_when_email_does_not_exist()`
- [ ] `[Fact] returns_401_when_password_is_incorrect()`
- [ ] `[Fact] returns_200_with_JWT_and_operator_object_on_valid_credentials()`
- [ ] `[Fact] returned_JWT_payload_contains_operatorId_email_and_name()`
- [ ] `[Fact] does_not_return_passwordHash_in_the_response()`
- [ ] `[Fact] returns_400_when_email_is_not_valid_format()`
- [ ] `[Fact] returns_400_when_password_field_is_missing()`

---

## 3. JWT Middleware

> Covers: TASK-CS-03.1.2, TASK-CS-03.1.3

**Type:** Integration

- [ ] `[Fact] returns_401_when_Authorization_header_is_missing()`
- [ ] `[Fact] returns_401_when_token_is_malformed()`
- [ ] `[Fact] returns_401_when_token_is_signed_with_wrong_secret()`
- [ ] `[Fact] returns_401_when_token_is_expired()`
- [ ] `[Fact] allows_request_through_when_token_is_valid()`

---

## 4. State Machine

> Covers: TASK-CS-04.1.1

**Type:** Unit

- [ ] `[Fact] allows_PENDING_to_ACKNOWLEDGED_transition()`
- [ ] `[Fact] allows_ACKNOWLEDGED_to_DISPATCHED_transition()`
- [ ] `[Fact] allows_DISPATCHED_to_RESOLVED_transition()`
- [ ] `[Fact] throws_on_PENDING_to_DISPATCHED_skip()`
- [ ] `[Fact] throws_on_ACKNOWLEDGED_to_RESOLVED_skip()`
- [ ] `[Fact] throws_on_transition_from_RESOLVED_which_is_a_final_state()`

---

## 5. Panic Ingestion

> Covers: TASK-CS-05.1.1, TASK-CS-04.2.1

**Type:** Integration

- [ ] `[Fact] returns_201_and_panic_object_when_PANIC_SOURCE_submits_valid_panic()`
- [ ] `[Fact] returns_403_when_RESPONDER_SYSTEM_tries_to_submit_panic()`
- [ ] `[Fact] returns_401_when_no_API_key_is_provided()`
- [ ] `[Fact] returns_400_when_required_fields_are_missing()`
- [ ] `[Theory] returns_400_when_latitude_is_out_of_range(double lat)` — data: -91, 91
- [ ] `[Theory] returns_400_when_longitude_is_out_of_range(double lng)` — data: -181, 181
- [ ] `[Fact] returns_400_when_idempotencyKey_is_not_a_valid_UUID_v4()`
- [ ] `[Fact] returns_200_with_original_panic_on_duplicate_idempotencyKey_from_same_partner()`
- [ ] `[Fact] returns_409_on_duplicate_idempotencyKey_from_different_partner()`
- [ ] `[Fact] created_panic_has_status_PENDING()`
- [ ] `[Fact] response_does_not_include_apiKeyHash()`
- [ ] `[Fact] enqueues_panic_created_webhook_to_all_RESPONDER_SYSTEM_partners()`

---

## 6. Panic Claim

> Covers: TASK-CS-05.1.4, TASK-CS-04.2.2

**Type:** Integration

- [ ] `[Fact] returns_200_when_RESPONDER_SYSTEM_claims_a_PENDING_panic()`
- [ ] `[Fact] returns_403_when_PANIC_SOURCE_tries_to_claim()`
- [ ] `[Fact] returns_409_when_panic_is_already_claimed()`
- [ ] `[Fact] creates_PanicEventLog_entry_with_PARTNER_CLAIM_trigger()`
- [ ] `[Fact] sets_claimedByPartnerId_on_panic_after_claim()`
- [ ] `[Fact] enqueues_panic_status_updated_webhook_to_PANIC_SOURCE_only()`

---

## 7. Operator Status Transitions

> Covers: TASK-CS-05.1.5, TASK-CS-05.1.6, TASK-CS-05.1.7, TASK-CS-04.2.3

**Type:** Integration

- [ ] `[Fact] returns_200_when_operator_acknowledges_a_PENDING_panic()`
- [ ] `[Fact] returns_400_when_operator_acknowledges_a_non_PENDING_panic()`
- [ ] `[Fact] returns_200_when_operator_dispatches_an_ACKNOWLEDGED_panic()`
- [ ] `[Fact] returns_400_when_operator_dispatches_a_non_ACKNOWLEDGED_panic()`
- [ ] `[Fact] returns_200_when_operator_resolves_a_DISPATCHED_panic()`
- [ ] `[Fact] returns_400_when_operator_resolves_a_non_DISPATCHED_panic()`
- [ ] `[Fact] each_transition_creates_a_PanicEventLog_entry_with_OPERATOR_trigger()`
- [ ] `[Fact] each_transition_enqueues_panic_status_updated_webhook_to_PANIC_SOURCE_and_claimedByPartner()`

---

## 8. Panic List & Detail

> Covers: TASK-CS-05.1.2, TASK-CS-05.1.3

**Type:** Integration

- [ ] `[Fact] returns_401_without_JWT()`
- [ ] `[Fact] returns_paginated_list_of_panics()`
- [ ] `[Fact] filter_by_status_returns_only_matching_panics()`
- [ ] `[Fact] filter_by_partnerId_returns_only_matching_panics()`
- [ ] `[Fact] GET_panics_by_id_returns_single_panic()`
- [ ] `[Fact] GET_panics_by_id_returns_404_for_unknown_id()`
- [ ] `[Fact] response_does_not_include_apiKeyHash_on_partner_object()`

---

## 9. Audit Logs

> Covers: TASK-CS-05.1.8, TASK-CS-05.1.9

**Type:** Integration

- [ ] `[Fact] returns_paginated_audit_log_for_a_panic()`
- [ ] `[Fact] returns_single_log_entry_by_logId()`
- [ ] `[Fact] log_entry_has_correct_fromStatus_and_toStatus()`
- [ ] `[Fact] log_entry_triggeredBy_is_OPERATOR_when_operator_acted()`
- [ ] `[Fact] log_entry_triggeredBy_is_PARTNER_CLAIM_when_partner_claimed()`
- [ ] `[Fact] exactly_one_of_operatorId_or_partnerId_is_set_never_both_never_neither()`

---

## 10. Partners

> Covers: TASK-CS-05.2.1, TASK-CS-05.2.2

**Type:** Integration

- [ ] `[Fact] returns_401_without_JWT()`
- [ ] `[Fact] returns_paginated_list_of_partners()`
- [ ] `[Fact] filter_by_type_returns_only_matching_partners()`
- [ ] `[Fact] GET_partners_by_id_returns_single_partner()`
- [ ] `[Fact] GET_partners_by_id_returns_404_for_unknown_id()`
- [ ] `[Fact] response_does_not_include_apiKeyHash()`

---

## 11. Webhook Queue

> Covers: TASK-CS-04.3.1, TASK-CS-04.3.2

**Type:** Unit

- [ ] `[Fact] enqueue_adds_item_to_channel()`
- [ ] `[Fact] processor_delivers_payload_via_HTTP_POST_to_target_url()`
- [ ] `[Fact] delivery_failure_is_logged_but_does_not_throw()`
- [ ] `[Fact] failed_delivery_does_not_affect_the_calling_thread()`

---

## 12. SignalR Hub

> Covers: TASK-CS-06.1.1, TASK-CS-06.1.2, TASK-CS-06.1.3

**Type:** E2E (SignalR test client via `Microsoft.AspNetCore.SignalR.Client`)

- [ ] `[Fact] rejects_unauthenticated_connection()`
- [ ] `[Fact] accepts_connection_with_valid_JWT()`
- [ ] `[Fact] emits_panic_new_after_successful_POST_panics()`
- [ ] `[Fact] emits_panic_updated_after_claim()`
- [ ] `[Fact] emits_panic_updated_after_each_operator_transition()`
- [ ] `[Fact] SignalR_payload_mirrors_REST_response_shape()`

---

## 17. TDD Development Loop

Follow the same RED → GREEN → REFACTOR cycle as the Node.js backend.

### Step-by-step
1. Find the first unchecked test (`- [ ]`) in this file, in order
2. Write that single test — confirm it fails with a meaningful assertion error (`dotnet test`)
3. Commit: `test(scope): description [RED]`
4. Write minimum implementation to pass that one test
5. Confirm it passes (`dotnet test`)
6. Commit: `feat(scope): description [GREEN]`
7. Refactor if needed; confirm still green; commit: `refactor(scope): description`
8. Mark the test `[x]` in this file
9. Move to the next unchecked test

### Branching
- Branch from `main`: `feature/TASK-CS-XX.Y.Z-short-description`
- One PR per task; reviewed before merging

### `dotnet test` equivalent of `npm test --workspace=api`
```bash
dotnet test api.csharp/OderPly.Api.Tests/OderPly.Api.Tests.csproj
```
