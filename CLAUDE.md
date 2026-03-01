# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Saga is an AI-first TTRPG campaign planning tool for Dungeon Masters. It supports multiple TTRPG systems and campaigns with entity management (NPCs, factions, PCs, relationships), session planning, AI-assisted planning via RAG, and a world-state change approval workflow.

## Commands

```bash
pnpm dev           # Start dev server on port 3000
pnpm build         # Production build
pnpm test          # Run tests (Vitest)
pnpm lint          # ESLint
pnpm check         # Prettier write + ESLint fix

# Database (Drizzle)
pnpm db:generate   # Generate migration files
pnpm db:migrate    # Apply migrations
pnpm db:push       # Push schema directly (dev)
pnpm db:studio     # Drizzle Studio
```

Run a single test file: `pnpm vitest run src/path/to/file.test.ts`

## Stack

| Concern       | Technology                                                                         |
| ------------- | ---------------------------------------------------------------------------------- |
| Framework     | TanStack Start (Vite + Nitro + React 19) — fullstack Node.js, **not** edge/Workers |
| Routing / SSR | TanStack Router (file-based)                                                       |
| Server state  | TanStack Query v5                                                                  |
| Forms         | TanStack Form v1 + Zod v4                                                          |
| Auth          | Better Auth v1                                                                     |
| ORM           | Drizzle ORM + drizzle-kit (PostgreSQL + pgvector)                                  |
| Styling       | Tailwind CSS v4 + shadcn/ui                                                        |
| AI framework  | Mastra (agents, workflows, vector store)                                           |
| AI models     | Claude API (Haiku for analysis/RAG, Sonnet for planning)                           |
| Graph viz     | React Flow (`@xyflow/react`)                                                       |
| Rich text     | TipTap                                                                             |
| File uploads  | Uppy → Cloudflare R2 (S3-compat)                                                   |

## Project Structure

Code is organized **by feature/domain**, not by technical layer. Each feature owns everything it needs.

```
src/
  routes/              # Thin shells only — import from features, not the reverse
  features/
    campaigns/
      components/      # React components for this feature
      server/          # TanStack Start server functions (data access)
      db/
        schema.ts      # Drizzle table definitions owned by this feature
        queries.ts     # Reusable query functions
      schemas.ts       # Zod schemas (shared between server validation + forms)
    sessions/
    npcs/
    factions/
    characters/
    relationships/
    world-events/
      event-schemas.ts # Zod schemas keyed by event type (npc_died, etc.)
    documents/
    ai/
      agents/          # planning-agent.ts, analysis-agent.ts
      tools/           # Mastra tools used by agents
      workflows/       # session-analysis.ts, document-processing.ts
      index.ts         # Mastra initialization and export
    auth/
  shared/
    components/        # Cross-feature UI
    db/
      client.ts        # Drizzle client (db = drizzle(DATABASE_URL))
    lib/
      utils.ts         # cn() helper (clsx + tailwind-merge)
  integrations/
    tanstack-query/    # QueryClient provider and devtools
    better-auth/       # Auth header component
```

## Import Alias

`#/*` maps to `./src/*` — use this for all internal imports (e.g. `import { db } from '#/shared/db/client'`).

## Architecture Invariants

**Never violate these:**

1. **AI only sees approved world state.** `get_world_state` and any query serving AI context must filter `status = 'approved'` only — pending proposals must never reach the AI.
2. **Zod validates before every DB write.** The `propose_world_event` Mastra tool (and all server functions) must validate against the relevant Zod schema before writing to the database.
3. **Server functions are server-only.** Never import `ANTHROPIC_API_KEY`, the Drizzle client, or any secrets in client-side code. TanStack Start server functions guarantee server-side execution.
4. **Drizzle never touches Mastra tables.** Mastra manages its own tables (`mastra_*` prefix) via `PostgresStore`. Drizzle schema files must not define or reference these tables.
5. **pgvector must be enabled before Mastra `PgVector` initializes.** Run `CREATE EXTENSION IF NOT EXISTS vector;` on first deploy.
6. **Do not deploy to Cloudflare Workers or Pages.** The architecture requires long-running processes and full Node.js compatibility.

## Key Patterns

**Route files are thin shells.** They import page components and server functions from `src/features/`. Features never import from route files.

**Database schema is per-feature.** Each `features/*/db/schema.ts` exports only the tables owned by that feature. The Drizzle config glob must cover all `src/features/**/db/schema.ts` files.

**Two AI agents with distinct roles:**

- _Planning Agent_ — conversational, thread-scoped memory (Mastra `PostgresStore`), streaming output, tools: `get_session_data`, `get_world_state`, `search_lore`
- _Analysis Agent_ — stateless, structured JSON output validated against Zod, runs as a Mastra Workflow after session debrief, tools: `get_recent_sessions`, `get_world_events`, `propose_world_event`

**World events are an append-only log.** World state is never a mutable document — it is derived from approved events. The `world_event_types` table stores only a `key` that references a Zod schema defined in `features/world-events/event-schemas.ts`.

**TanStack Query key conventions:** `['campaigns']`, `['sessions', campaignId]`, `['npcs', campaignId]`, `['world-events', 'pending', campaignId]`.

**Graph endpoint** (`/campaigns/:id/graph`) returns data pre-shaped for React Flow: `{ nodes[], edges[] }`.

**SSE for real-time.** A single SSE stream at `/api/ai/notifications` pushes `analysis_complete`, `analysis_failed`, `document_ready`, `document_failed` events. Implement polling on `/api/jobs/:jobId/status` as fallback.

## Environment Variables

```
DATABASE_URL=
ANTHROPIC_API_KEY=
OPENAI_API_KEY=        # Mastra default embeddings (text-embedding-3-small)
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_URL=         # public base URL for R2 bucket
BETTER_AUTH_SECRET=
```

Place in `.env.local` for local development.

## Local Development

Use the `pgvector/pgvector:pg16` Docker image for local Postgres — it includes the `pgvector` extension. See `docs/ARCHITECTURE.md` §16 for a full `docker-compose.yml` reference.

## Further Reference

- Full architecture: `docs/ARCHITECTURE.md`
- Build plan and task tracker: `docs/PLANNING.md`
