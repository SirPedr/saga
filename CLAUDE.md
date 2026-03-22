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
- Task tracker: [GitHub Issues](https://github.com/SirPedr/saga/issues) — filter by `status:` and `area:` labels
- Design system and tokens: `docs/design-system.md`

---

## Design Context

### Users

Dungeon Masters who are both passionate storytellers and productive planners. They use Saga to
immerse themselves in their world-building process while staying organized and on task. DMs often
work in dim environments during sessions, making dark mode the natural default. The ideal experience
balances world-building atmosphere with clean, task-oriented UX — a well-crafted creative workspace
that feels atmospheric enough to inspire and efficient enough to get real work done.

### Brand Personality

**Reverent, Monumental, Purposeful**

Saga is a master DM's consecrated sanctum — stone walls, stained glass light, meticulously
inscribed. The voice is quiet authority: confident, knowing, reverent. The interface should feel
like entering a cathedral that holds centuries of secrets. Think cold stone, moonlight, blood-red
ink. Dramatic and atmospheric, never garish.

### Aesthetic Direction

**Primary theme: Dark mode first.** All component design decisions begin with dark mode. Light mode
is a valid but secondary experience (cold stone tones, not tropical or pastel).

**Visual metaphor: Cathedral + stained glass.** A gothic cathedral digitized — near-black stone
surfaces with blue undertones, silver text hierarchy, deep crimson accents, subtle texture
suggesting stone lattice. Components feel like carved inscriptions or illuminated manuscripts.
Cards have weight and depth rather than glass-morphism lightness.

**Color palette — cathedral gothic (oklch format):**

| Token            | Purpose                              | Dark Mode                         | Light Mode                        |
| ---------------- | ------------------------------------ | --------------------------------- | --------------------------------- |
| `--stone`        | Page background                      | `oklch(0.08 0.005 280)`          | `oklch(0.93 0.01 280)`           |
| `--stone-2`      | Elevated surface                     | `oklch(0.12 0.01 280)`           | `oklch(0.89 0.015 280)`          |
| `--stone-3`      | Card / panel                         | `oklch(0.16 0.012 280)`          | `oklch(0.84 0.018 280)`          |
| `--silver`       | Primary text                         | `oklch(0.83 0.012 280)`          | `oklch(0.12 0.01 280)`           |
| `--silver-soft`  | Secondary text                       | `oklch(0.57 0.02 280)`           | `oklch(0.30 0.02 280)`           |
| `--silver-faint` | Placeholder / disabled               | `oklch(0.33 0.025 280)`          | `oklch(0.62 0.025 280)`          |
| `--crimson`      | Primary accent / interactive         | `oklch(0.45 0.18 20)`            | `oklch(0.38 0.16 18)`            |
| `--crimson-deep` | Accent hover / pressed               | `oklch(0.38 0.16 18)`            | `oklch(0.32 0.14 16)`            |
| `--arcane`       | Secondary accent (stained glass)     | `oklch(0.35 0.09 300)`           | `oklch(0.22 0.08 296)`           |
| `--arcane-soft`  | Arcane hover                         | `oklch(0.30 0.08 298)`           | `oklch(0.18 0.07 294)`           |
| `--line`         | Borders / dividers                   | `oklch(0.83 0.012 280 / 0.08)`   | `oklch(0.12 0.01 280 / 0.10)`    |
| `--blood`        | Destructive / danger                 | `oklch(0.48 0.19 22)`            | `oklch(0.44 0.17 20)`            |
| `--glint`        | Inset highlight                      | `oklch(0.85 0.02 250 / 0.03)`    | `oklch(1 0 0 / 0.65)`            |

**Typography:**

- **Display / headings**: Cinzel (serif, 500–700) — chiseled, monumental; cathedral inscriptions
- **Body / UI**: Crimson Pro (serif, 400–700) — elegant readability, gothic warmth
- **Labels / kickers**: Crimson Pro 700, uppercase, wide letter-spacing — gothic annotation style
- **Code / IDs / data**: System monospace (`ui-monospace, 'Cascadia Code', monospace`)

Typography is the primary design tool. Hierarchy is communicated through type weight and scale
before color. Every heading must earn its display treatment.

**Component feel:**

- Cards and panels: deep stone surface, subtle cold border, soft moonlight inner glow
- Dividers: stone-stroke style — thin, cool-toned, slightly transparent
- Shadows: layered cold-dark with blue undertone (not warm/sepia)
- Hover/interactive states: crimson glow or subtle border brightening, never jarring color shifts
- Decorative touches: minimal gothic geometric or lattice-style flourishes (restrained)

**Anti-references — Saga must NEVER look like:**

- Dragon's Lair / DndBeyond: maximalist fantasy marketplace aesthetic
- Monday.com / Airtable: generic SaaS color-blocking
- Neon / cyberpunk UI
- Gamified dashboards (XP bars, achievement badges, leveling chrome)
- Tropical / coastal aesthetics (lagoon blues, palm greens, sandy pastels — fully retired)
- Warm amber/gold grimoire aesthetic (previous theme — fully retired)

### Design Principles

1. **Typography First** — Hierarchy is built from type, not color blasts. Cinzel earns its
   display moments. Every label, heading, and body span should feel deliberate.

2. **Atmospheric but Functional** — The interface sets a mood without sacrificing usability.
   Texture and shadow create depth; the DM's content (campaigns, NPCs, sessions) is always the hero.

3. **Stone Over Chrome** — Prefer cold-dark surfaces, cool borders, and shadow depth over
   glass-morphism and bright gradients. Components feel carved and grounded.

4. **Dark Mode is Canon** — All new components are designed dark-first. Light mode should evoke
   cold stone and muted silver.

5. **Quiet Reverence** — No excessive animation, badges, or gamification. Motion is purposeful
   and minimal. The tool respects the DM's creative focus and never competes with their content.
