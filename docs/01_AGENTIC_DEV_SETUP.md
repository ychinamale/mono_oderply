# Agentic Development Setup — Rationale

This project uses Claude Code (via the VS Code extension) as the primary agentic development tool. The setup differs slightly from the default conventions, and here's why.

---

## Why procedures live in `CLAUDE.md` rather than skills

The Agent Skills standard — supported by VS Code, GitHub Copilot, Claude Code, and others — recommends storing reusable workflows as `SKILL.md` files that the agent loads on demand. That's the out-of-the-box approach most people follow.

The problem is that Vercel published evals in January 2026 showing it doesn't actually work that reliably. In 56% of their test cases, the agent never invoked the skill at all — zero improvement over having nothing. They also found the approach brittle: small wording changes in the trigger instructions caused large swings in outcome. When they embedded the same content directly into `AGENTS.md` (Claude Code's equivalent is `CLAUDE.md`) as passive context that's always present, the pass rate jumped from 53% to 100%.

So rather than betting on the agent deciding to load the right skill at the right time, the TDD cycle, Prisma migration steps, and Fastify route conventions all live directly in `CLAUDE.md`. They're in context on every turn, no decision required. Skills would still be the right choice for large, infrequent, explicitly user-triggered workflows — but nothing in this project at current scope qualifies.

---

## Why hooks are kept separately

Hooks fire deterministically at specific points in the agent's lifecycle — they don't rely on the agent choosing to invoke them. So they don't have the same reliability problem and are used as-is via `.claude/settings.json`.

---

## When to inline context vs. reference a file

**Inline into `CLAUDE.md` when:**
- The information is needed on most turns, not just specific ones
- It is small enough to fit in a few lines or a compact table
- Having it absent would cause Claude to silently make wrong decisions

**Reference a file when:**
- The information is only needed at a specific, predictable moment
- The content is too large to inline without crowding out other context
- The instruction to Claude is behavioral — "before doing X, go read Y"

**The test:** Ask "would Claude need this to make a correct decision right now, without being prompted?" If yes, inline it. If it only matters at a specific step, reference it.

### Example from this project

The **API surface** (12 endpoints, their auth types, and constraints) is inlined as a table in `CLAUDE.md`. Claude needs it on almost every turn — when writing a route, a test, a guard, or a Zod schema. If it were behind a file reference, Claude would have to decide to fetch it, and that decision fails more than half the time per [the Vercel evals](https://vercel.com/blog/agents-md-outperforms-skills-in-our-agent-evals).

The **testing backlog** (147 tests across 15 sections) is kept in `docs/_project_specs/06_testing_backlog.spec.md` and referenced with a behavioral instruction: "before writing a new test, check that file." It is only relevant at one specific moment, and it is far too large to inline without crowding out context that matters on every turn.

---

## Resources

- [VS Code — Agent Skills documentation](https://code.visualstudio.com/docs/copilot/customization/agent-skills)
- [GitHub Docs — Creating agent skills for GitHub Copilot](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/coding-agent/create-skills)
- [Vercel — `AGENTS.md` outperforms skills in our agent evals](https://vercel.com/blog/agents-md-outperforms-skills-in-our-agent-evals)
- [Claude Code — Hooks documentation](https://code.claude.com/docs/en/hooks-guide)