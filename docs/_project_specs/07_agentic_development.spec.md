# ODERP-ly — Agentic Development Setup

**Tool:** Claude Code for VS Code (official Anthropic extension)
**Requires:** Claude Pro or Max subscription

---

## 1. Install Claude Code for VS Code

Open Extensions (`Cmd+Shift+X` on Mac / `Ctrl+Shift+X` on Windows/Linux), search for **Claude Code**, and install the one published by **Anthropic**. The marketplace has impostors — verify the publisher before installing.

Once installed, open the Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`), type `Claude Code`, and select **Open in New Tab**.

---

## 2. Directory Structure (Now Outdated - DO NOT REFERENCE)

Create the following inside `oderply/`:

```
oderply/
├── CLAUDE.md                            ← project context, loaded every session
├── .claude/
│   ├── settings.json                    ← hooks
│   └── skills/
│       ├── tdd-cycle/
│       │   └── SKILL.md
│       ├── prisma-migration/
│       │   └── SKILL.md
│       └── api-route/
│           └── SKILL.md
├── api/
├── client/
└── shared/
```

Commit `.claude/` and `CLAUDE.md` into the repo so the setup travels with the codebase.

---

## 3. `CLAUDE.md` — Project Context (Now Outdated - DO NOT REFERENCE)

Create `CLAUDE.md` at the root of `oderply/`. This is the most important file — it is loaded at the start of every session so you never have to re-explain the project.

```markdown
# ODERP-ly — On-Demand Emergency Response Platform

## Stack
- Backend: Fastify (ESM, Node 21+), Prisma, PostgreSQL, Socket.io, Zod
- Frontend: React + Vite, Tailwind CSS
- Monorepo: npm workspaces (api/, client/, shared/)
- Auth: @fastify/jwt (operators), API key guard (partners)

## Project structure
- api/src/routes/        — Fastify route modules
- api/src/hooks/         — preHandler guards (apiKeyGuard, jwtGuard)
- api/src/lib/           — shared utilities (assertTransition, webhookQueue)
- api/prisma/            — schema, migrations, seed files
- client/src/pages/      — React pages
- client/src/components/ — React components
- client/src/hooks/      — custom React hooks
- shared/src/            — Zod schemas shared between api and client

## Key conventions
- ESM throughout — always use .js extensions in imports
- Prisma transactions wrap every status transition + audit log write
- SELECT FOR UPDATE on the claim endpoint (pessimistic locking)
- idempotencyKey is a hard contract on POST /api/v1/panics
- Never return apiKeyHash in any response
- triggeredBy on PanicEventLog is always OPERATOR or PARTNER_CLAIM —
  exactly one of operatorId or partnerId is populated, never both, never neither

## State machine
PENDING → ACKNOWLEDGED   (operator acknowledge, or RESPONDER_SYSTEM claim)
ACKNOWLEDGED → DISPATCHED  (operator only)
DISPATCHED → RESOLVED      (operator only)

## Webhook fan-out
- On panic CREATED: broadcast to ALL RESPONDER_SYSTEM partners
- On status CHANGE: targeted to PANIC_SOURCE + claimed RESPONDER_SYSTEM only

## Git workflow
- Branch from develop: feature/TASK-XX-short-description
- Commit format: type(scope): description [RED|GREEN|REFACTOR]
- One PR per task, reviewed before merging into develop
- Never commit .env files

## TDD rule
Write a failing test before any implementation. Every time. No exceptions.
Run tests before every commit: npm test --workspace=api
```

---

## 4. Skills (Now Outdated - DO NOT REFERENCE)

Skills are markdown files that teach Claude how to handle specific tasks. Claude loads them automatically when relevant, or you can invoke one with `/skill-name`.

### `.claude/skills/tdd-cycle/SKILL.md`

```markdown
---
name: tdd-cycle
description: Guide a Red-Green-Refactor TDD cycle for a single test. Use when
  writing a new test or implementing a feature test-first.
---

Follow this sequence strictly. Do not skip steps.

1. **RED** — Write one failing test only. Run the test suite and confirm it
   fails with a meaningful error, not a syntax error. Stop here. Do not write
   implementation yet.

2. **GREEN** — Write the minimum implementation to make that one test pass.
   Nothing more. Run the suite and confirm it passes.

3. **REFACTOR** — Clean up the implementation if needed. The test suite must
   remain green after every refactor.

Commit after each phase:
- RED:      `git commit -m "test(scope): description [RED]"`
- GREEN:    `git commit -m "feat(scope): description [GREEN]"`
- REFACTOR: `git commit -m "refactor(scope): description"` (only if needed)

Never write more than one test at a time.
Never write implementation code without a failing test in front of it.
```

### `.claude/skills/prisma-migration/SKILL.md`

```markdown
---
name: prisma-migration
description: Create and apply a Prisma schema change. Use when modifying the
  database schema.
---

1. Edit `api/prisma/schema.prisma` with the required change
2. Run `npx prisma migrate dev --name <descriptive-name>` from `api/`
3. Confirm the migration file was created in `api/prisma/migrations/`
4. Run `npx prisma generate` to update the client
5. Confirm `@prisma/client` reflects the change before proceeding
6. Never edit migration files manually after they have been applied
```

### `.claude/skills/api-route/SKILL.md`

```markdown
---
name: api-route
description: Scaffold a new Fastify route following ODERP-ly conventions. Use
  when adding a new endpoint.
---

Every new Fastify route must:

1. Apply the correct preHandler:
   - `apiKeyGuard` for partner-facing routes (ingestion, claim)
   - `jwtGuard` for operator-facing routes (all others)
2. Define a Zod schema for request body and/or query params
3. Validate input before any DB call — reject bad requests early
4. Use `prisma.$transaction` when writing more than one table
5. Include `partner: true` or `claimedByPartner: true` in Prisma
   includes where applicable
6. Never return `apiKeyHash` in any response — exclude it explicitly
7. Emit a Socket.io event after every state-changing write
8. Enqueue webhook notifications via `webhookQueue.enqueue()` after
   state changes, following the fan-out rules in CLAUDE.md
9. Return correct HTTP status codes:
   - 201 for creates
   - 200 for updates
   - 400 for invalid transitions or bad input
   - 401 for missing/invalid auth
   - 403 for wrong partner type
   - 404 for not found
   - 409 for conflicts (duplicate claim, duplicate idempotencyKey)
```

---

## 5. Hooks (Now Outdated - DO NOT REFERENCE)

Hooks run shell commands automatically at specific points in Claude's lifecycle. Create `.claude/settings.json`:

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "echo \"Branch: $(git branch --show-current) | Last commit: $(git log --oneline -1)\""
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "jq -r '.tool_input.file_path' | grep -qE '\\.(js|jsx)$' && echo 'File written — run tests: npm test --workspace=api' || true"
          }
        ]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "jq -r '.tool_input.command' | grep -qE '^git commit' && git diff --cached --name-only | xargs grep -l 'apiKeyHash' 2>/dev/null | grep -v test | head -1 | xargs -I{} echo 'WARNING: apiKeyHash may be exposed in response in {}' || true"
          }
        ]
      }
    ]
  }
}
```

**What each hook does:**
- `SessionStart` — prints your current branch and last commit at the top of every session so Claude always has git context
- `PostToolUse` — reminds you to run tests after any `.js` or `.jsx` file is written
- `PreToolUse` — warns before a `git commit` if `apiKeyHash` appears in a non-test source file, catching accidental exposure before it reaches version control

You can also add and manage hooks interactively by typing `/hooks` in the Claude Code panel.

---

## 6. MCP — GitHub Integration (optional but recommended)

MCP (Model Context Protocol) servers connect Claude to external tools. Adding the GitHub MCP server lets you create PRs, check CI status, and review issues directly from the agent without leaving VS Code.

```bash
claude mcp add --transport http github https://api.githubcopilot.com/mcp/ \
  --header "Authorization: Bearer YOUR_GITHUB_TOKEN"
```

Once connected, you can say things like:
- `"Create a PR for this branch into develop"`
- `"Check if CI is passing on the current branch"`
- `"Show me open PRs targeting develop"`

---

## 7. What the VS Code Extension Adds

Beyond the terminal experience, the Claude Code VS Code extension gives you:

- **Inline diffs** — every file change Claude proposes appears as a diff in the editor before it is applied
- **Plan review mode** — Claude proposes a plan, you approve or adjust it, then it executes
- **Sidebar chat** — the agent panel sits alongside your code so you never switch windows
- **Integrated terminal** — drop to the VS Code terminal for `git commit`, `npm test`, or any command that should stay in your control

---

## 8. Day-to-Day Workflow

When you start work on a task:

```
1. Open VS Code in oderply/
2. Open Claude Code panel (Cmd+Shift+P → "Claude Code: Open in New Tab")
3. Claude loads CLAUDE.md and your skills automatically
4. Start with: "implement TASK-02.1.1 using TDD"
   → Claude invokes the tdd-cycle skill and follows RED → GREEN → REFACTOR
5. Review inline diffs in the editor before accepting each change
6. Drop to the integrated terminal to run tests and commit after each phase
```

For schema changes:
```
"add claimedByPartnerId to PanicEvent following the prisma-migration skill"
→ Claude edits schema.prisma, runs the migration, regenerates the client
```

For new routes:
```
"scaffold the claim endpoint following the api-route skill"
→ Claude creates the route file with correct guard, Zod schema, transaction,
  Socket.io emit, and webhook enqueue wired up
```

---

## 9. Skills vs CLAUDE.md — When to Use Each

| Put it in | When |
|---|---|
| `CLAUDE.md` | Project-wide facts that are always true — stack, conventions, state machine rules, git workflow |
| A skill | A repeatable process with steps — TDD cycle, migration workflow, route scaffolding |

Keep `CLAUDE.md` factual and concise. Keep skills procedural and step-by-step. If you find yourself writing "always do X when Y" in a prompt, it belongs in one of these files instead.
