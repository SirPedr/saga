# Saga — Build Plan

> LLM agent reference. Work tasks in dependency order. Mark status as tasks complete.
> Cross-reference `docs/ARCHITECTURE.md` for full specs on any section.

---

## Project Context

### Stack (confirmed from package.json + scaffolding)

| Concern       | Technology                               | State                      |
| ------------- | ---------------------------------------- | -------------------------- |
| Framework     | TanStack Start (Vite + Nitro + React 19) | installed                  |
| Routing / SSR | TanStack Router (file-based)             | installed                  |
| Server state  | TanStack Query v5                        | installed                  |
| Forms         | TanStack Form v1 + Zod v4                | installed                  |
| Auth          | Better Auth v1                           | installed, partially wired |
| ORM           | Drizzle ORM + drizzle-kit                | installed, demo schema     |
| DB driver     | `pg` (node-postgres)                     | installed                  |
| Styling       | Tailwind CSS v4                          | installed                  |
| UI components | shadcn/ui (components.json present)      | installed                  |
| AI framework  | Mastra                                   | **NOT installed**          |
| Graph viz     | React Flow (`@xyflow/react`)             | **NOT installed**          |
| Rich text     | TipTap                                   | **NOT installed**          |
| File uploads  | Uppy                                     | **NOT installed**          |
| File storage  | Cloudflare R2 (S3-compat)                | **NOT installed**          |
| PDF parsing   | unpdf                                    | **NOT installed**          |

### Import alias

`#/*` → `./src/*` (configured in `package.json` imports field and `tsconfig.json`)

### Current repo state (all files untracked — no commits yet)

- Demo routes: `src/routes/blog.*`, `about.tsx`, `rss[.]xml.ts` → **delete**
- Demo components: `MdxCallout`, `MdxMetrics`, `demo.*`, `demo-store*`, `site.ts` → **delete**
- Demo schema: `src/db/schema.ts` exports `todos` table → **replace**
- DB client: `src/db/index.ts` → **move** to `src/shared/db/client.ts`
- Auth: `src/lib/auth.ts` wired (email+password, tanstackStartCookies) but **no Drizzle adapter**
- Auth client: `src/lib/auth-client.ts` exists
- Auth route: `src/routes/api/auth/$.ts` exists
- `content-collections` wired in `vite.config.ts` → **remove**
- `zod` duplicated in deps + devDeps → **canonicalize to deps only**

### Critical invariants (never violate)

1. `get_world_state` and `getApprovedWorldEvents` queries **must** filter `status = 'approved'` only — the AI must never see pending proposals
2. `propose_world_event` Mastra tool **must** run Zod validation before any DB write
3. Server functions are server-only — **never** import API keys or Drizzle client in client-side code
4. Mastra `PostgresStore` and `PgVector` share `DATABASE_URL` but manage their own tables — Drizzle must not touch `mastra_*` tables
5. pgvector extension **must** be enabled before Mastra `PgVector` initializes

### Conventions

- Route files are thin shells — import page components and server functions from `src/features/`, never the reverse
- Feature owns: `components/`, `server/`, `db/schema.ts`, `db/queries.ts`, `schemas.ts`
- Cross-feature imports are direct (no barrel re-exports that create cycles)
- `drizzle.config.ts` schema glob must cover all `src/features/**/db/schema.ts` files
- All server functions validate input with Zod before any DB write
- TanStack Query keys: `['campaigns']`, `['sessions', campaignId]`, `['npcs', campaignId]`, `['world-events', 'pending', campaignId]`, etc.

### Environment variables (all required)

```
DATABASE_URL=
ANTHROPIC_API_KEY=
OPENAI_API_KEY=          # Mastra default embeddings (text-embedding-3-small)
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_URL=           # public base URL for R2 bucket
BETTER_AUTH_SECRET=
```

---

## Task Status Key

- `[ ]` pending
- `[~]` in progress
- `[x]` complete

---

## Phase 0 — Foundation Cleanup & Scaffolding

### T01 · Remove demo artifacts

**Status:** `[x]` | **Depends:** —

**Delete:**

- `src/routes/blog.$slug.tsx`
- `src/routes/blog.index.tsx`
- `src/routes/about.tsx`
- `src/routes/rss[.]xml.ts`
- `src/components/MdxCallout.tsx`
- `src/components/MdxMetrics.tsx`
- `src/components/ThemeToggle.tsx`
- `src/components/demo.FormComponents.tsx`
- `src/hooks/demo.form-context.ts`
- `src/hooks/demo.form.ts`
- `src/lib/demo-store-devtools.tsx`
- `src/lib/demo-store.ts`
- `src/lib/site.ts`
- `content/` (entire directory)
- `content-collections.ts` (root)

**Modify `vite.config.ts`:**

- Remove `import contentCollections from '@content-collections/vite'`
- Remove `contentCollections()` from plugins array

**Modify `package.json`:**

- Remove from `devDependencies`: `@content-collections/core`, `@content-collections/markdown`, `@content-collections/mdx`, `@content-collections/vite`
- Remove `zod` from `devDependencies` (keep only in `dependencies`)

**Modify `src/db/schema.ts`:** Remove the `todos` table export. Leave file empty (will be replaced in T03).

**Run:** `pnpm install`

**Done when:** `pnpm dev` starts without import errors. No demo routes accessible. No TS errors.

---

### T02 · Establish feature-based directory structure

**Status:** `[x]` | **Depends:** T01

**Create directories** (add `.gitkeep` in each leaf):

```
src/features/campaigns/components/
src/features/campaigns/server/
src/features/campaigns/db/
src/features/sessions/components/
src/features/sessions/server/
src/features/sessions/db/
src/features/npcs/components/
src/features/npcs/server/
src/features/npcs/db/
src/features/factions/components/
src/features/factions/server/
src/features/factions/db/
src/features/characters/components/
src/features/characters/server/
src/features/characters/db/
src/features/relationships/components/
src/features/relationships/server/
src/features/relationships/db/
src/features/world-events/components/
src/features/world-events/server/
src/features/world-events/db/
src/features/documents/components/
src/features/documents/server/
src/features/documents/db/
src/features/ai/agents/
src/features/ai/tools/
src/features/ai/workflows/
src/features/auth/components/
src/features/auth/server/
src/shared/components/
src/shared/db/
src/shared/storage/
src/shared/lib/
src/shared/hooks/
```

**Move:**

- `src/db/index.ts` → `src/shared/db/client.ts` (update import path inside file: `./schema.ts` → will be replaced in T03)
- `src/lib/auth.ts` → `src/features/auth/server/auth.ts`
- `src/lib/auth-client.ts` → `src/features/auth/server/auth-client.ts`
- `src/lib/utils.ts` → `src/shared/lib/utils.ts`
- `src/integrations/` → keep in place for now (TanStack Query root provider still needed)

**Update all imports** that reference moved files. Run `pnpm tsc --noEmit` to find broken refs.

**Done when:** `pnpm tsc --noEmit` passes. `pnpm dev` starts.

---

### T03 · Update Drizzle config for multi-file schema glob

**Status:** `[x]` | **Depends:** T02

**Modify `drizzle.config.ts`:**

```ts
schema: './src/features/**/db/schema.ts',
out: './drizzle',
```

**Modify `src/shared/db/client.ts`:**

```ts
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
export const db = drizzle(pool)
```

Remove the schema import — Drizzle client doesn't need the schema object for query builder usage.

**Delete** `src/db/schema.ts` (now empty) and `src/db/` directory.

**Verify:** Run `pnpm db:generate` — should produce an empty migration (no tables yet). If it errors, the glob pattern is wrong.

**Done when:** `pnpm db:generate` runs without error and produces an empty migration file.

---

### T04 · Add missing core packages

**Status:** `[x]` | **Depends:** T01

**Run:**

```bash
pnpm add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

**Create `.env.example`** at repo root with all vars from the Environment Variables section above (values empty).

**Create `.env.local`** (gitignored) with local dev values — `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ttrpg`.

**Verify `.gitignore`** includes `.env.local` and `.env`.

**Done when:** `pnpm install` clean. `.env.example` committed.

---

### T05 · Docker Compose + local DB setup

**Status:** `[x]` | **Depends:** —

**Create `docker-compose.yml`** at repo root:

```yaml
services:
  db:
    image: pgvector/pgvector:pg16
    ports:
      - '5432:5432'
    environment:
      POSTGRES_DB: ttrpg
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    volumes:
      - postgres_data:/var/lib/postgresql/data
volumes:
  postgres_data:
```

Note: omit the `app` service for now — developers run `pnpm dev` directly.

**Done when:** `docker compose up db -d` starts Postgres. `psql postgresql://postgres:postgres@localhost:5432/ttrpg` connects successfully.

---

## Phase 1 — Database Foundation

### T06 · Shared DB client + pgvector migration

**Status:** `[ ]` | **Depends:** T03, T05

**Modify `src/shared/db/client.ts`** — finalize with Pool and connection validation:

```ts
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required')
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
export const db = drizzle(pool)
```

**Create `src/shared/db/migrate.ts`:**

```ts
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { db } from './client'

export async function runMigrations() {
  // Enable pgvector before any Mastra PgVector initialization
  await db.execute(`CREATE EXTENSION IF NOT EXISTS vector`)
  await migrate(db, { migrationsFolder: './drizzle' })
}
```

**Wire `runMigrations()`** to run on server startup. In TanStack Start, add to the server entry or a startup hook. Call it before the app handles any requests.

**Add to `package.json` scripts:**

```json
"db:migrate:run": "tsx src/shared/db/migrate.ts"
```

**Done when:** `pnpm db:migrate:run` connects, enables pgvector, and runs migrations without error.

---

## Phase 2 — Auth

### T07 · Wire Better Auth to Drizzle adapter

**Status:** `[ ]` | **Depends:** T06

**Install:** `pnpm add @better-auth/drizzle-adapter` (check current Better Auth docs — adapter may be bundled)

**Modify `src/features/auth/server/auth.ts`:**

```ts
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { tanstackStartCookies } from 'better-auth/tanstack-start'
import { db } from '#/shared/db/client'

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: 'pg' }),
  emailAndPassword: { enabled: true },
  plugins: [tanstackStartCookies()],
})
```

**Run:** `npx @better-auth/cli generate` to output Better Auth schema. Add the generated migration to the `drizzle/` folder or let it run via `db:push` in dev. Better Auth manages `user`, `session`, `account`, `verification` tables.

**Done when:** `pnpm db:migrate:run` creates auth tables. POST to `/api/auth/sign-up/email` returns 200.

---

### T08 · Auth guard — `_authenticated` layout route

**Status:** `[ ]` | **Depends:** T07

**Create `src/routes/_authenticated.tsx`:**

- On `beforeLoad`: call `auth.api.getSession` (server-side). If no session, `throw redirect({ to: '/login' })`.
- Export session via `loaderData` or context for child routes to consume.
- Render `<Outlet />` — no UI in this file.

**Done when:** Navigating to any `/_authenticated/*` route without a session redirects to `/login`.

---

### T09 · Login page + signOut action

**Status:** `[ ]` | **Depends:** T08

**Create `src/features/auth/components/LoginForm.tsx`:**

- TanStack Form + Zod schema: `{ email: z.string().email(), password: z.string().min(8) }`
- On submit: call `authClient.signIn.email({ email, password })` from `auth-client.ts`
- On success: `router.navigate({ to: '/campaigns' })`
- Show field-level errors inline

**Create `src/routes/login.tsx`:**

- Public route (not under `_authenticated`)
- Renders `<LoginForm />`
- If already authenticated, redirect to `/campaigns`

**Create server function `signOut`** in `src/features/auth/server/`:

- Calls `auth.api.signOut`

**Done when:** Can log in with email+password. Session cookie set. `/login` redirects to `/campaigns` when already authenticated.

---

## Phase 3 — App Shell

### T10 · Root layout + navigation

**Status:** `[ ]` | **Depends:** T09

**Create `src/shared/components/Layout.tsx`:** Wraps children with a top-level shell (header + main content area).

**Create `src/shared/components/Nav.tsx`:**

- Logo / app name
- "Campaigns" nav link
- Sign out button (calls `signOut` server function)
- Conditionally renders user email from session

**Modify `src/routes/_authenticated.tsx`:** Render `<Layout><Nav /><Outlet /></Layout>`.

**Modify `src/routes/__root.tsx`:** Ensure TanStack Query `QueryClientProvider` wraps everything (already in `src/integrations/tanstack-query/root-provider.tsx` — wire it in).

**Done when:** Authenticated pages show consistent shell. Sign out works and redirects to `/login`.

---

## Phase 4 — Campaigns & Systems

### T11 · Schema: `systems` + `campaigns`

**Status:** `[ ]` | **Depends:** T06

**Create `src/features/campaigns/db/schema.ts`:**

```ts
export const systems = pgTable('systems', {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull(),
  slug: text().notNull().unique(), // e.g. 'dnd5e', 'coc7e'
})

export const campaigns = pgTable('campaigns', {
  id: uuid().primaryKey().defaultRandom(),
  systemId: uuid('system_id')
    .notNull()
    .references(() => systems.id),
  title: text().notNull(),
  description: text(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})
```

**Run:** `pnpm db:generate` then `pnpm db:migrate:run`

**Done when:** `systems` and `campaigns` tables exist in DB.

---

### T12 · Seed default TTRPG systems

**Status:** `[ ]` | **Depends:** T11

**Create `src/shared/db/seed.ts`:**

- Insert the following systems if `systems` table is empty:
  - `{ name: "D&D 5e", slug: "dnd5e" }`
  - `{ name: "Call of Cthulhu 7e", slug: "coc7e" }`
  - `{ name: "Pathfinder 2e", slug: "pf2e" }`
  - `{ name: "Shadowrun 6e", slug: "sr6e" }`
- Use `INSERT ... ON CONFLICT DO NOTHING` for idempotency

**Add to `package.json`:** `"db:seed": "tsx src/shared/db/seed.ts"`

**Wire into `runMigrations()`:** call `seed()` after migrations complete.

**Done when:** `pnpm db:seed` inserts systems. Running again is a no-op.

---

### T13 · Campaign server functions + Zod schemas

**Status:** `[ ]` | **Depends:** T11

**Create `src/features/campaigns/schemas.ts`:**

```ts
export const CampaignCreateSchema = z.object({
  title: z.string().min(1).max(100),
  systemId: z.string().uuid(),
  description: z.string().optional(),
})
export const CampaignUpdateSchema = CampaignCreateSchema.partial()
```

**Create `src/features/campaigns/server/index.ts`** with server functions:

- `listCampaigns()` → `Campaign[]`
- `getCampaign(id: string)` → `Campaign | null`
- `createCampaign(input: CampaignCreate)` → `Campaign` ← will be patched in T45 to also seed world event types
- `updateCampaign(id: string, input: CampaignUpdate)` → `Campaign`
- `deleteCampaign(id: string)` → `void`

All functions: validate input with Zod, query via `db` from `src/shared/db/client.ts`.

**Done when:** Server functions importable and callable without runtime errors.

---

### T14 · Campaign list page + CampaignCard + CampaignForm

**Status:** `[ ]` | **Depends:** T10, T13

**Create `src/features/campaigns/components/CampaignCard.tsx`:** Title, system name badge, created date. Links to `/$campaignId`.

**Create `src/features/campaigns/components/CampaignForm.tsx`:**

- TanStack Form + `CampaignCreateSchema`
- Fields: title (text), systemId (select — fetched from `listSystems()`), description (textarea)
- Renders in a Dialog/Sheet

**Create `src/routes/_authenticated/campaigns/index.tsx`:**

- Loads campaigns via TanStack Query `['campaigns']`
- Renders grid of `CampaignCard`
- "New Campaign" button → opens `CampaignForm`
- Empty state with CTA if no campaigns

**Done when:** Can create and view campaigns. System dropdown populated from seeded data.

---

### T15 · Campaign detail layout route

**Status:** `[ ]` | **Depends:** T14

**Create `src/routes/_authenticated/campaigns/$campaignId.tsx`:**

- `loader`: call `getCampaign(params.campaignId)`, throw 404 if null
- Provides campaign to children via `loaderData`
- Sub-navigation tabs: Sessions · NPCs · Factions · Characters · Graph · World Events · Documents
- Renders `<Outlet />`

**Done when:** `/campaigns/:id` shows campaign header + sub-nav. Navigating to `/campaigns/nonexistent` shows 404 (handled by TanStack Router's `notFoundComponent`).

---

## Phase 5 — Sessions

### T16 · Schema: `sessions` + junction tables

**Status:** `[ ]` | **Depends:** T11

**Create `src/features/sessions/db/schema.ts`:**

```ts
export const sessions = pgTable('sessions', {
  id: uuid().primaryKey().defaultRandom(),
  campaignId: uuid('campaign_id')
    .notNull()
    .references(() => campaigns.id, { onDelete: 'cascade' }),
  mastraThreadId: text('mastra_thread_id'), // soft ref — no FK constraint
  title: text().notNull(),
  sessionNumber: integer('session_number').notNull(),
  status: text('status', { enum: ['planned', 'completed'] })
    .default('planned')
    .notNull(),
  sessionDate: date('session_date'),
  planningNotes: text('planning_notes'),
  outcomeNotes: text('outcome_notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const sessionNpcs = pgTable(
  'session_npcs',
  {
    sessionId: uuid('session_id')
      .notNull()
      .references(() => sessions.id, { onDelete: 'cascade' }),
    npcId: uuid('npc_id').notNull(),
    role: text('role'),
  },
  (t) => [primaryKey({ columns: [t.sessionId, t.npcId] })],
)

export const sessionFactions = pgTable(
  'session_factions',
  {
    sessionId: uuid('session_id')
      .notNull()
      .references(() => sessions.id, { onDelete: 'cascade' }),
    factionId: uuid('faction_id').notNull(),
  },
  (t) => [primaryKey({ columns: [t.sessionId, t.factionId] })],
)

export const sessionPlayableCharacters = pgTable(
  'session_playable_characters',
  {
    sessionId: uuid('session_id')
      .notNull()
      .references(() => sessions.id, { onDelete: 'cascade' }),
    playableCharacterId: uuid('playable_character_id').notNull(),
  },
  (t) => [primaryKey({ columns: [t.sessionId, t.playableCharacterId] })],
)
```

**Run:** `pnpm db:generate && pnpm db:migrate:run`

**Done when:** All four tables exist in DB.

---

### T17 · Session server functions + Zod schemas

**Status:** `[ ]` | **Depends:** T16

**Create `src/features/sessions/schemas.ts`:**

```ts
export const SessionCreateSchema = z.object({
  campaignId: z.string().uuid(),
  title: z.string().min(1).max(100),
  sessionNumber: z.number().int().positive(),
  sessionDate: z.string().optional(), // ISO date string
  status: z.enum(['planned', 'completed']).default('planned'),
})
export const SessionUpdateSchema = SessionCreateSchema.omit({
  campaignId: true,
}).partial()
```

**Create `src/features/sessions/server/index.ts`:**

- `listSessions(campaignId)` → sessions ordered by `session_number` desc
- `getSession(id)` → session with `{ npcs, factions, pcs }` joined
- `createSession(input)` → `Session`
- `updateSession(id, input)` → `Session`
- `deleteSession(id)` → `void`

**Done when:** Server functions work. `getSession` returns session + associated entity IDs.

---

### T18 · TipTap rich text editor component

**Status:** `[ ]` | **Depends:** T01 (parallel with any Phase 4-5 task)

**Install:** `pnpm add @tiptap/react @tiptap/starter-kit @tiptap/extension-placeholder`

**Create `src/shared/components/RichTextEditor.tsx`:**

- Props: `value: string`, `onChange: (html: string) => void`, `placeholder?: string`, `disabled?: boolean`
- Uses `useEditor` with `StarterKit` + `Placeholder` extensions
- Basic toolbar: Bold, Italic, BulletList, OrderedList, Heading (H2, H3)
- Controlled: syncs `value` prop to editor content on external change
- Outputs HTML string

**Does NOT include:** Image extension (added in T42 when attachments are built).

**Done when:** Component renders, accepts input, fires `onChange` with valid HTML.

---

### T19 · Session list + SessionCard

**Status:** `[ ]` | **Depends:** T15, T17

**Create `src/features/sessions/components/SessionCard.tsx`:** Session number, title, date, status badge (planned = muted, completed = green).

**Create `src/routes/_authenticated/campaigns/$campaignId/sessions/index.tsx`:**

- TanStack Query `['sessions', campaignId]`
- List of `SessionCard` sorted by session_number desc
- "New Session" button → `SessionForm` in dialog

**Create `src/features/sessions/components/SessionForm.tsx`:**

- TanStack Form + `SessionCreateSchema`
- Fields: title, session_number, session_date (date picker), status

**Done when:** Can create and list sessions within a campaign.

---

### T20 · Session detail route with planning notes

**Status:** `[ ]` | **Depends:** T18, T19

**Create `src/routes/_authenticated/campaigns/$campaignId/sessions/$sessionId.tsx`:**

- `loader`: `getSession(params.sessionId)`
- Renders: session title, metadata (date, number, status)
- `RichTextEditor` for `planningNotes` — auto-saves on blur via `updateSession`
- Outcome notes section: `RichTextEditor` for `outcomeNotes`, disabled when `status = 'planned'`
- Tab or section placeholders for: Entities (T33), Planning Chat (T57), Debrief (T61)

**Done when:** Can view session, edit planning notes, and see them persist on reload.

---

## Phase 6 — NPCs

### T21 · Schema: `npcs` + `npc_templates` + `npc_attribute_values`

**Status:** `[ ]` | **Depends:** T11

**Create `src/features/npcs/db/schema.ts`:**

```ts
export const npcs = pgTable('npcs', {
  id: uuid().primaryKey().defaultRandom(),
  campaignId: uuid('campaign_id')
    .notNull()
    .references(() => campaigns.id, { onDelete: 'cascade' }),
  name: text().notNull(),
  portraitUrl: text('portrait_url'),
  tokenUrl: text('token_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// One template per campaign. fields is [{key, label, type: 'text'|'number'|'select', required: bool}]
export const npcTemplates = pgTable('npc_templates', {
  id: uuid().primaryKey().defaultRandom(),
  campaignId: uuid('campaign_id')
    .notNull()
    .unique()
    .references(() => campaigns.id, { onDelete: 'cascade' }),
  fields: jsonb('fields').notNull().default([]),
})

export const npcAttributeValues = pgTable(
  'npc_attribute_values',
  {
    npcId: uuid('npc_id')
      .notNull()
      .references(() => npcs.id, { onDelete: 'cascade' }),
    key: text().notNull(),
    value: text().notNull().default(''),
  },
  (t) => [primaryKey({ columns: [t.npcId, t.key] })],
)
```

**Run:** `pnpm db:generate && pnpm db:migrate:run`

**Done when:** Tables exist in DB.

---

### T22 · NPC template server functions

**Status:** `[ ]` | **Depends:** T21

**Create `src/features/npcs/server/templates.ts`:**

- `getOrCreateTemplate(campaignId)` → `NpcTemplate` (creates empty template if none exists)
- `updateTemplateFields(campaignId, fields: TemplateField[])` → `NpcTemplate`

**Create `src/features/npcs/schemas.ts`:**

```ts
export const TemplateFieldSchema = z.object({
  key: z
    .string()
    .min(1)
    .regex(/^[a-z_]+$/),
  label: z.string().min(1),
  type: z.enum(['text', 'number', 'select']),
  required: z.boolean().default(false),
  options: z.array(z.string()).optional(), // for 'select' type
})
export const NpcTemplateUpdateSchema = z.object({
  fields: z.array(TemplateFieldSchema),
})
```

**Done when:** Can retrieve and update an NPC template for a campaign.

---

### T23 · NPC attribute value server functions

**Status:** `[ ]` | **Depends:** T22

**Add to `src/features/npcs/server/`:**

- `getAttributeValues(npcId)` → `Record<string, string>`
- `upsertManyAttributeValues(npcId, values: Record<string, string>)` → uses `INSERT ... ON CONFLICT DO UPDATE`

**Done when:** Can read and write attribute values. Upsert is idempotent.

---

### T24 · NPC CRUD server functions

**Status:** `[ ]` | **Depends:** T21, T23

**Add to `src/features/npcs/server/index.ts`:**

- `listNpcs(campaignId)` → `Npc[]` (without attribute values — list view only)
- `getNpc(id)` → `Npc & { attributes: Record<string, string> }`
- `createNpc(input)` → `Npc` — validates required fields against template
- `updateNpc(id, input)` → `Npc`
- `deleteNpc(id)` → `void`

**Create `src/features/npcs/schemas.ts` additions:**

```ts
export const NpcCreateSchema = z.object({
  campaignId: z.string().uuid(),
  name: z.string().min(1).max(100),
  portraitUrl: z.string().url().optional(),
  tokenUrl: z.string().url().optional(),
  attributes: z.record(z.string()).optional(),
})
```

**Done when:** NPC CRUD server functions work end-to-end.

---

### T25 · NPC template editor UI

**Status:** `[ ]` | **Depends:** T22, T15

**Create `src/features/npcs/components/NpcTemplateEditor.tsx`:**

- Renders list of template fields (drag-to-reorder optional, can be added later)
- Each field: key (readonly after creation), label (editable), type dropdown, required toggle, delete button
- "Add field" button appends a new empty field row
- Save triggers `updateTemplateFields`
- Place on a Campaign Settings page or as a collapsible section on the NPCs list page

**Done when:** Can define and save custom NPC fields for a campaign.

---

### T26 · NpcForm with dynamic attribute rendering

**Status:** `[ ]` | **Depends:** T24, T25

**Create `src/features/npcs/components/NpcForm.tsx`:**

- Fetches campaign template on mount via TanStack Query
- Renders static fields: name
- Renders dynamic fields from template: text → `<input type="text">`, number → `<input type="number">`, select → `<select>`
- Required fields show validation error if empty
- Portrait URL: plain text input for now (Uppy upload added in T41)
- On submit: calls `createNpc` + `upsertManyAttributeValues` in sequence
- On edit: pre-populates from `getNpc` response

**Done when:** Can create an NPC with dynamic attributes. Attributes persist on reload.

---

### T27 · NPC list + NPC detail route

**Status:** `[ ]` | **Depends:** T24, T26

**Create `src/features/npcs/components/NpcCard.tsx`:** Portrait thumbnail (if set), name, 2-3 key attribute preview.

**Create `src/routes/_authenticated/campaigns/$campaignId/npcs/index.tsx`:**

- TanStack Query `['npcs', campaignId]`
- Grid of `NpcCard`
- "New NPC" button → `NpcForm` in dialog/sheet

**Create `src/routes/_authenticated/campaigns/$campaignId/npcs/$npcId.tsx`:**

- `loader`: `getNpc(params.npcId)`
- Renders `NpcForm` in edit mode
- Delete button with confirmation

**Done when:** Can view, create, and edit NPCs with dynamic attributes.

---

## Phase 7 — Factions

### T28 · Schema + CRUD: `factions`

**Status:** `[ ]` | **Depends:** T11

**Create `src/features/factions/db/schema.ts`:**

```ts
export const factions = pgTable('factions', {
  id: uuid().primaryKey().defaultRandom(),
  campaignId: uuid('campaign_id')
    .notNull()
    .references(() => campaigns.id, { onDelete: 'cascade' }),
  name: text().notNull(),
  description: text(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})
```

**Run:** `pnpm db:generate && pnpm db:migrate:run`

**Create `src/features/factions/schemas.ts`:** `FactionCreateSchema`, `FactionUpdateSchema`

**Create `src/features/factions/server/index.ts`:** `listFactions`, `getFaction`, `createFaction`, `updateFaction`, `deleteFaction`

**Done when:** Tables exist. Server functions work.

---

### T29 · Faction list + FactionCard + FactionForm

**Status:** `[ ]` | **Depends:** T15, T28

**Create components:** `FactionCard` (name, description excerpt), `FactionForm` (name + description textarea).

**Create `src/routes/_authenticated/campaigns/$campaignId/factions/index.tsx`:** List + create dialog.

**Done when:** Can create and view factions.

---

## Phase 8 — Playable Characters

### T30 · Schema + CRUD: `playable_characters` + templates

**Status:** `[ ]` | **Depends:** T11

**Create `src/features/characters/db/schema.ts`** — mirrors NPC schema pattern:

```ts
export const playableCharacters = pgTable('playable_characters', {
  id: uuid().primaryKey().defaultRandom(),
  campaignId: uuid('campaign_id')
    .notNull()
    .references(() => campaigns.id, { onDelete: 'cascade' }),
  name: text().notNull(),
  portraitUrl: text('portrait_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})
export const pcTemplates = pgTable('pc_templates', {
  id: uuid().primaryKey().defaultRandom(),
  campaignId: uuid('campaign_id')
    .notNull()
    .unique()
    .references(() => campaigns.id, { onDelete: 'cascade' }),
  fields: jsonb('fields').notNull().default([]),
})
export const pcAttributeValues = pgTable(
  'pc_attribute_values',
  {
    playableCharacterId: uuid('playable_character_id')
      .notNull()
      .references(() => playableCharacters.id, { onDelete: 'cascade' }),
    key: text().notNull(),
    value: text().notNull().default(''),
  },
  (t) => [primaryKey({ columns: [t.playableCharacterId, t.key] })],
)
```

**Run:** `pnpm db:generate && pnpm db:migrate:run`

**Create server functions** in `src/features/characters/server/` — identical pattern to NPCs (template CRUD + PC CRUD + attribute value upsert).

**Done when:** Tables exist. Server functions work.

---

### T31 · PC template editor + PcForm + PC list

**Status:** `[ ]` | **Depends:** T25, T26, T30

Replicate the NPC template editor and form patterns for PCs. The component structure is structurally identical — reuse `NpcTemplateEditor` logic, not the component itself.

**Create:** `PcTemplateEditor`, `PcForm`, `PcCard`, PC list route, PC detail route.

**Done when:** Can create and manage PCs with dynamic attributes.

---

## Phase 9 — Session-Entity Associations

### T32 · Session-entity association server functions

**Status:** `[ ]` | **Depends:** T16, T21, T28, T30

**Create `src/features/sessions/server/associations.ts`:**

- `addNpcToSession(sessionId, npcId, role?: string)` → upsert into `session_npcs`
- `removeNpcFromSession(sessionId, npcId)` → delete from `session_npcs`
- `addFactionToSession(sessionId, factionId)` → upsert into `session_factions`
- `removeFactionFromSession(sessionId, factionId)`
- `addPcToSession(sessionId, pcId)` → upsert into `session_playable_characters`
- `removePcFromSession(sessionId, pcId)`
- `getSessionEntities(sessionId)` → `{ npcs: NpcWithRole[], factions: Faction[], pcs: PlayableCharacter[] }`

**Done when:** Can add/remove all entity types from a session.

---

### T33 · Entity picker UI on session detail

**Status:** `[ ]` | **Depends:** T20, T32

**Create `src/shared/components/EntityPicker.tsx`:**

- Combobox with search filtering
- Props: `entities: {id, name}[]`, `selected: string[]`, `onAdd: (id) => void`, `onRemove: (id) => void`
- Renders selected items as dismissible chips

**Wire into session detail page (T20):**

- Three `EntityPicker` instances: NPCs (with role text input), Factions, PCs
- Mutations call association server functions, invalidate `['session', sessionId]` query

**Done when:** Can associate entities with a session from the session detail page. Association persists on reload.

---

## Phase 10 — Relationships + Graph

### T34 · Schema: `relationships`

**Status:** `[ ]` | **Depends:** T11

**Create `src/features/relationships/db/schema.ts`:**

```ts
export const relationships = pgTable('relationships', {
  id: uuid().primaryKey().defaultRandom(),
  campaignId: uuid('campaign_id')
    .notNull()
    .references(() => campaigns.id, { onDelete: 'cascade' }),
  sourceEntityType: text('source_entity_type', {
    enum: ['npc', 'faction', 'pc'],
  }).notNull(),
  sourceEntityId: uuid('source_entity_id').notNull(),
  targetEntityType: text('target_entity_type', {
    enum: ['npc', 'faction', 'pc'],
  }).notNull(),
  targetEntityId: uuid('target_entity_id').notNull(),
  type: text('type').notNull(), // 'member_of', 'allied_with', 'rivals', etc.
  sentiment: text('sentiment', { enum: ['positive', 'neutral', 'negative'] })
    .notNull()
    .default('neutral'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})
```

**Run:** `pnpm db:generate && pnpm db:migrate:run`

**Done when:** Table exists in DB.

---

### T35 · Relationship server functions + graph data query

**Status:** `[ ]` | **Depends:** T21, T28, T30, T34

**Create `src/features/relationships/server/index.ts`:**

- `createRelationship(input)`, `updateRelationship(id, input)`, `deleteRelationship(id)`
- `getGraphData(campaignId)` → returns exact React Flow shape:
  ```ts
  {
    nodes: Array<{ id: string, type: 'npc'|'faction'|'pc', data: { name: string, portraitUrl?: string } }>,
    edges: Array<{ id: string, source: string, target: string, data: { type: string, sentiment: string } }>
  }
  ```
  Node IDs are entity UUIDs. Edge IDs are relationship UUIDs.

**Create `src/features/relationships/schemas.ts`:** `RelationshipCreateSchema`, `RelationshipUpdateSchema`

**Done when:** `getGraphData` returns valid nodes/edges JSON for a campaign with NPCs, factions, and relationships.

---

### T36 · React Flow graph canvas route

**Status:** `[ ]` | **Depends:** T35

**Install:** `pnpm add @xyflow/react`

**Create `src/routes/_authenticated/campaigns/$campaignId/graph.tsx`:**

- `loader`: `getGraphData(params.campaignId)`
- Renders `<ReactFlowProvider><RelationshipGraph /></ReactFlowProvider>`

**Create `src/features/relationships/components/RelationshipGraph.tsx`:**

- `useNodesState` + `useEdgesState` initialized from loader data
- `<ReactFlow nodes={nodes} edges={edges} fitView />`
- Default node/edge types for now (custom types added in T37)

**Done when:** Graph route loads and displays entities as nodes and relationships as edges.

---

### T37 · Custom React Flow node types

**Status:** `[ ]` | **Depends:** T36

**Create `src/features/relationships/components/NpcNode.tsx`:**

- Props: `data: { name: string, portraitUrl?: string }`
- Renders: portrait thumbnail (or initials avatar if no portrait), name label
- Styled with campaign theme colors

**Create `src/features/relationships/components/FactionNode.tsx`:**

- Props: `data: { name: string }`
- Distinct visual style from NPC nodes

Register in `RelationshipGraph.tsx`:

```ts
const nodeTypes = { npc: NpcNode, faction: FactionNode, pc: NpcNode } // pc reuses NpcNode for now
```

Edge labels: display `data.type`, color-coded by `data.sentiment` (green/gray/red).

**Done when:** Graph renders custom styled nodes with portraits and edge labels.

---

### T38 · Relationship create/edit panel

**Status:** `[ ]` | **Depends:** T37

**Create `src/features/relationships/components/RelationshipPanel.tsx`:**

- Triggered by: clicking an edge (edit mode) or "onConnect" handler (create mode)
- Fields: type (text), sentiment (select), notes (textarea), delete button
- Mutations: create/update/delete via server functions
- On save/delete: invalidate `['graph', campaignId]` query

**Wire into `RelationshipGraph.tsx`:**

- `onEdgeClick` → opens panel in edit mode
- `onConnect` → opens panel in create mode with source/target pre-filled

**Done when:** Can create, edit, and delete relationships from the graph view.

---

## Phase 11 — File Storage Foundation

### T39 · R2 client + upload helpers

**Status:** `[ ]` | **Depends:** T04

**Create `src/shared/storage/r2.ts`:**

```ts
import { S3Client } from '@aws-sdk/client-s3'

export const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})
```

**Create `src/shared/storage/upload.ts`:**

```ts
// Key patterns from architecture doc
export function buildR2Key(
  type: 'npc-portrait' | 'session-map' | 'document',
  campaignId: string,
  entityId: string,
  filename: string,
): string

export async function uploadToR2(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<string> // returns public URL
export async function deleteFromR2(key: string): Promise<void>
```

Public URL = `${process.env.R2_PUBLIC_URL}/${key}`

**Done when:** `uploadToR2` and `deleteFromR2` work against real R2 bucket.

---

## Phase 12 — Attachments

### T40 · Schema + CRUD: `attachments`

**Status:** `[ ]` | **Depends:** T39

**Create `src/features/attachments/db/schema.ts`** (or inline in `src/shared/db/`):

```ts
export const attachments = pgTable('attachments', {
  id: uuid().primaryKey().defaultRandom(),
  entityType: text('entity_type', { enum: ['session', 'npc', 'pc'] }).notNull(),
  entityId: uuid('entity_id').notNull(),
  attachmentType: text('attachment_type', {
    enum: ['image', 'link'],
  }).notNull(),
  url: text('url').notNull(),
  label: text('label'),
  r2Key: text('r2_key'), // null for link attachments
  createdAt: timestamp('created_at').defaultNow().notNull(),
})
```

**Run:** `pnpm db:generate && pnpm db:migrate:run`

**Create server functions:**

- `createAttachment(input)` — for images: upload to R2 first, store key + URL
- `listAttachments(entityType, entityId)` → `Attachment[]`
- `deleteAttachment(id)` — deletes R2 file if `r2Key` is set

**Done when:** Tables exist. Server functions work.

---

### T41 · Uppy uploader component + NPC portrait upload

**Status:** `[ ]` | **Depends:** T39, T40

**Install:** `pnpm add uppy @uppy/core @uppy/react @uppy/dashboard @uppy/xhr-upload`

**Create server function `getUploadProxy`** in `src/shared/storage/`:

- Accepts multipart form data (file + entityType + entityId + campaignId)
- Calls `uploadToR2`, creates `attachments` record
- Returns `{ url, attachmentId }`
- Route this as a conventional API route: `POST /api/upload`

**Create `src/shared/components/FileUploader.tsx`:**

- Props: `entityType`, `entityId`, `campaignId`, `onUpload: (url: string) => void`
- Uppy with XHR upload to `/api/upload`
- Single-file mode for portraits, multi-file for maps

**Wire NPC portrait upload:** In `NpcForm.tsx`, replace plain URL input with `FileUploader`. On upload success, set `portraitUrl` field value.

**Done when:** Can upload an NPC portrait. Image appears in `NpcCard` thumbnail.

---

### T42 · Attachment gallery on session + PC detail

**Status:** `[ ]` | **Depends:** T41

**Add TipTap `Image` extension** to `RichTextEditor.tsx`.

**Create `src/shared/components/AttachmentGallery.tsx`:**

- Props: `entityType`, `entityId`, `campaignId`
- Renders: `FileUploader` + grid of existing attachments (thumbnail or link card) with delete button
- TanStack Query `['attachments', entityType, entityId]`

**Wire into:**

- Session detail: "Maps & Attachments" tab
- PC detail: portrait + attachments section

**Done when:** Can upload and view attachments on sessions and PCs.

---

## Phase 13 — World Events

### T43 · Schema: `world_event_types` + `world_events` + `world_event_sessions`

**Status:** `[ ]` | **Depends:** T11, T16

**Create `src/features/world-events/db/schema.ts`:**

```ts
export const worldEventTypes = pgTable(
  'world_event_types',
  {
    id: uuid().primaryKey().defaultRandom(),
    campaignId: uuid('campaign_id')
      .notNull()
      .references(() => campaigns.id, { onDelete: 'cascade' }),
    key: text('key').notNull(), // references worldEventSchemas in code
    label: text('label').notNull(),
    targetEntityType: text('target_entity_type', {
      enum: ['npc', 'faction', 'pc', 'world'],
    }).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [unique({ columns: [t.campaignId, t.key] })],
)

export const worldEvents = pgTable('world_events', {
  id: uuid().primaryKey().defaultRandom(),
  campaignId: uuid('campaign_id')
    .notNull()
    .references(() => campaigns.id, { onDelete: 'cascade' }),
  eventTypeKey: text('event_type_key').notNull(),
  targetEntityType: text('target_entity_type', {
    enum: ['npc', 'faction', 'pc', 'world'],
  }).notNull(),
  targetEntityId: uuid('target_entity_id'),
  payload: jsonb('payload').notNull(),
  summary: text('summary').notNull(),
  status: text('status', { enum: ['pending', 'approved', 'rejected'] })
    .notNull()
    .default('pending'),
  proposedAt: timestamp('proposed_at').defaultNow().notNull(),
  reviewedAt: timestamp('reviewed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const worldEventSessions = pgTable(
  'world_event_sessions',
  {
    worldEventId: uuid('world_event_id')
      .notNull()
      .references(() => worldEvents.id, { onDelete: 'cascade' }),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => sessions.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.worldEventId, t.sessionId] })],
)
```

**Run:** `pnpm db:generate && pnpm db:migrate:run`

**Done when:** All three tables exist in DB.

---

### T44 · World event type Zod schemas (all 24 default types)

**Status:** `[ ]` | **Depends:** T01 (pure TypeScript — no DB dependency)

**Create `src/features/world-events/event-schemas.ts`** with all 24 types:

NPC events (8): `npc_died`, `npc_resurrected`, `npc_changed_loyalty`, `npc_changed_location`, `npc_relationship_changed`, `npc_revealed_secret`, `npc_joined_faction`, `npc_left_faction`

Faction events (7): `faction_alliance_formed`, `faction_alliance_broken`, `faction_war_declared`, `faction_peace_declared`, `faction_dissolved`, `faction_created`, `faction_power_shift`

World events (6): `location_discovered`, `location_destroyed`, `major_political_event`, `artifact_found`, `artifact_lost`, `prophecy_fulfilled`

Session events (3): `party_decision_consequence`, `quest_completed`, `quest_failed`

**Export:**

```ts
export const worldEventSchemas = { ... } satisfies Record<string, z.ZodSchema>
export type WorldEventSchemaKey = keyof typeof worldEventSchemas
```

Each schema must include at minimum: the primary entity ID (e.g. `npc_id: z.string().uuid()`), a cause/reason field, and any secondary entity IDs as optional arrays.

**Done when:** `tsc --noEmit` passes on this file. 24 schemas exported.

---

### T45 · Seed default world_event_types on campaign creation

**Status:** `[ ]` | **Depends:** T13, T43, T44

**Create `src/features/world-events/server/seed.ts`:**

```ts
export async function seedDefaultEventTypes(campaignId: string): Promise<void>
```

Inserts one row per key from `worldEventSchemas`. Uses `INSERT ... ON CONFLICT DO NOTHING`.

**Patch `createCampaign`** in `src/features/campaigns/server/index.ts`:

- After campaign insert, call `seedDefaultEventTypes(campaign.id)` within the same transaction

**Done when:** Creating a campaign via `createCampaign` results in 24 `world_event_types` rows for that campaign.

---

### T46 · World event approval server functions

**Status:** `[ ]` | **Depends:** T43

**Create `src/features/world-events/server/index.ts`:**

- `listPendingWorldEvents(campaignId)` — **MUST filter `status = 'pending'` only**
- `approveWorldEvent(eventId)` — sets `status = 'approved'`, `reviewedAt = now()`
- `rejectWorldEvent(eventId)` — sets `status = 'rejected'`, `reviewedAt = now()`
- `getApprovedWorldEvents(campaignId, limit = 30)` — **MUST filter `status = 'approved'` only**, ordered by `proposedAt` desc — **this is the function the AI reads; naming is intentional**
- `getWorldStateByEntity(entityType, entityId)` — all approved events for one entity

**⚠ Critical:** Every query touching `world_events` that is consumed by AI tools must filter `status = 'approved'`. Never create a convenience query that returns all statuses.

**Done when:** Server functions enforce status filtering. Calling `listPendingWorldEvents` on a campaign with only approved events returns `[]`.

---

### T47 · World event approval UI

**Status:** `[ ]` | **Depends:** T46, T15

**Create `src/routes/_authenticated/campaigns/$campaignId/world-events.tsx`:**

**`PendingProposals` section:**

- TanStack Query `['world-events', 'pending', campaignId]`
- List of `ApprovalCard`: event type label, target entity name, AI-generated summary, payload formatted as readable key-value pairs, Approve + Reject buttons
- Approve/Reject mutations invalidate `['world-events', 'pending', campaignId]`

**`WorldStateView` section:**

- TanStack Query `['world-events', 'approved', campaignId]`
- Approved events grouped by target entity, chronological order
- Read-only view

**Done when:** World events page loads both sections. Approve/Reject actions work and update the list in real-time.

---

## Phase 14 — Lore Documents

### T48 · Schema + CRUD: `lore_documents` + `lore_document_entities`

**Status:** `[ ]` | **Depends:** T11, T39

**Create `src/features/documents/db/schema.ts`:**

```ts
export const loreDocuments = pgTable('lore_documents', {
  id: uuid().primaryKey().defaultRandom(),
  campaignId: uuid('campaign_id')
    .notNull()
    .references(() => campaigns.id, { onDelete: 'cascade' }),
  filename: text('filename').notNull(),
  r2Key: text('r2_key').notNull(),
  r2Url: text('r2_url').notNull(),
  documentType: text('document_type', { enum: ['lore', 'rules'] }).notNull(),
  status: text('status', {
    enum: ['uploading', 'processing', 'ready', 'failed'],
  })
    .notNull()
    .default('uploading'),
  retryCount: integer('retry_count').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const loreDocumentEntities = pgTable(
  'lore_document_entities',
  {
    documentId: uuid('document_id')
      .notNull()
      .references(() => loreDocuments.id, { onDelete: 'cascade' }),
    entityType: text('entity_type', {
      enum: ['npc', 'faction', 'pc'],
    }).notNull(),
    entityId: uuid('entity_id').notNull(),
  },
  (t) => [primaryKey({ columns: [t.documentId, t.entityType, t.entityId] })],
)
```

**Run:** `pnpm db:generate && pnpm db:migrate:run`

**Create server functions:**

- `createLoreDocument(input)` → creates DB record (`status: 'uploading'`), triggers workflow stub (logs warning — real trigger wired in T52)
- `listLoreDocuments(campaignId)` → `LoreDocument[]`
- `getLoreDocument(id)` → `LoreDocument`
- `deleteLoreDocument(id)` → deletes R2 file via `deleteFromR2`, deletes DB record
- `tagDocumentEntity(documentId, entityType, entityId)` → upsert into `lore_document_entities`
- `untagDocumentEntity(documentId, entityType, entityId)` → delete from `lore_document_entities`

**Done when:** Tables exist. Server functions work. `deleteLoreDocument` removes the R2 file.

---

### T49 · Lore document upload UI + entity tagging

**Status:** `[ ]` | **Depends:** T41, T48

**Create `src/routes/_authenticated/campaigns/$campaignId/documents.tsx`:**

**`LoreDocumentUploader`:** Uppy configured for PDF + text files only. On upload: calls `createLoreDocument` then uploads file to R2. File size limit: 50MB.

**`DocumentList`:** Table/list of documents with: filename, type badge, status badge (color-coded: uploading=gray, processing=yellow, ready=green, failed=red), created date, delete button, retry button (visible only on failed).

**`EntityTagger`:** Autocomplete for NPCs/factions/PCs in the campaign. Attached entities shown as chips with remove. Calls `tagDocumentEntity` / `untagDocumentEntity`.

**Done when:** Can upload a document, see it in the list with `uploading` status. Entity tagging works.

---

## Phase 15 — Mastra Foundation + Document Processing

### T50 · Install Mastra + initialize core

**Status:** `[ ]` | **Depends:** T06

**Install:** `pnpm add @mastra/core @mastra/pg`

**Create `src/features/ai/index.ts`:**

```ts
import { Mastra } from '@mastra/core'
import { PostgresStore, PgVector } from '@mastra/pg'

export const mastra = new Mastra({
  storage: new PostgresStore({ connectionString: process.env.DATABASE_URL! }),
  vectors: {
    campaigns: new PgVector({ connectionString: process.env.DATABASE_URL! }),
  },
  agents: {}, // populated in T55, T59
  workflows: {}, // populated in T51, T59
})
```

**⚠ Critical:** This file must only be imported in server-side contexts (server functions, API routes). Never import in route components or client-side code.

**⚠ Critical:** `runMigrations()` (T06) must run before Mastra initializes. Specifically, `CREATE EXTENSION IF NOT EXISTS vector` must execute before `new PgVector(...)` is constructed.

**Done when:** Server starts without error. Mastra tables (`mastra_threads`, `mastra_messages`, `mastra_workflow_snapshot`, etc.) created in DB.

---

### T51 · Document processing Mastra workflow

**Status:** `[ ]` | **Depends:** T48, T50

**Install:** `pnpm add unpdf` (PDF text extraction, zero-dependency)

**Create `src/features/ai/workflows/document-processing.ts`:**

Steps:

1. `fetchDocument` — query DB for `lore_documents` record, fetch file buffer from R2
2. `extractText` — use `unpdf` for PDFs, direct string for `.txt`
3. `chunkText` — split into ~500-token chunks with 50-token overlap (implement with character count approximation: ~4 chars/token)
4. `embedChunks` — use Mastra's default embedder (OpenAI `text-embedding-3-small`)
5. `upsertChunks` — upsert into PgVector with metadata: `{ documentId, campaignId, documentType, entityIds: string[] }`. `entityIds` fetched from `lore_document_entities` for this document.
6. `markReady` — update `lore_documents.status = 'ready'`

**Retry policy:** 2 attempts per step. On permanent failure: call `deleteFromR2(r2Key)`, set `status = 'failed'`, emit `document_failed` SSE event.

**Documents with `status !== 'ready'` must be excluded from all RAG queries** — enforce this in `search_lore` tool (T54).

**Register workflow** in `mastra` instance in `src/features/ai/index.ts`.

**Done when:** Workflow can be triggered manually (e.g. via a test script) and processes a test PDF to `status = 'ready'`.

---

### T52 · Wire document upload trigger + SSE notifications endpoint

**Status:** `[ ]` | **Depends:** T49, T51

**Create API route `src/routes/api/ai/notifications.ts`:**

- `GET /api/ai/notifications` — SSE stream
- Keeps connection alive with 30s heartbeat comments
- Emits events: `document_ready`, `document_failed`, `analysis_complete`, `analysis_failed`
- In-process event emitter (no Redis needed at single-user scale). Export `notificationEmitter` singleton for use in workflows.

**Patch `createLoreDocument`** in `src/features/documents/server/index.ts`:

- After creating DB record, call `mastra.getWorkflow('documentProcessing').createRun().start({ documentId })`
- Catch workflow trigger errors — do not let them fail the document creation response

**Emit from workflow steps:**

- `markReady` step: emit `document_ready` with `{ documentId }`
- Failure handler: emit `document_failed` with `{ documentId }`

**Done when:** Uploading a document triggers the workflow. `document_ready` event fires on the SSE stream when complete.

---

### T53 · SSE client hook + document status real-time update

**Status:** `[ ]` | **Depends:** T52

**Create `src/shared/hooks/useNotifications.ts`:**

```ts
export function useNotifications(handlers: {
  onDocumentReady?: (data: { documentId: string }) => void
  onDocumentFailed?: (data: { documentId: string }) => void
  onAnalysisComplete?: (data: {
    sessionId: string
    proposedCount: number
  }) => void
  onAnalysisFailed?: (data: { sessionId: string }) => void
}): void
```

- Connects to `/api/ai/notifications` via `EventSource`
- Auto-reconnects on connection loss (exponential backoff, max 30s)
- Cleans up `EventSource` on unmount

**Create API route `src/routes/api/jobs/$jobId/status.ts`:**

- `GET /api/jobs/:jobId/status` — polling fallback
- Returns `{ status: 'running'|'complete'|'failed', result?: object }`

**Wire in document list page (T49):**

- `useNotifications({ onDocumentReady, onDocumentFailed })` handlers invalidate `['documents', campaignId]` TanStack Query

**Done when:** Upload a document → status updates from `uploading` → `processing` → `ready` in the UI without a page refresh.

---

## Phase 16 — Planning Agent (Mode 1)

### T54 · Mastra tools: `get_session_data`, `get_world_state`, `search_lore`

**Status:** `[ ]` | **Depends:** T32, T46, T51

**Create `src/features/ai/tools/get-session-data.ts`:**

- Input: `{ sessionId: string }`
- Fetches session + `getSessionEntities(sessionId)` (NPCs with attributes, factions, PCs)
- Returns structured summary of the session and involved entities

**Create `src/features/ai/tools/get-world-state.ts`:**

- Input: `{ campaignId: string }`
- Calls `getApprovedWorldEvents(campaignId, 30)` — **approved only, enforced by that function**
- Returns array of `{ eventTypeKey, summary, targetEntityType, targetEntityId, proposedAt }`
- Never returns payload — summary field only (to conserve tokens)

**Create `src/features/ai/tools/search-lore.ts`:**

- Input: `{ query: string, campaignId: string, entityIds?: string[] }`
- Queries PgVector similarity search with metadata filter: `campaignId` always, `entityIds` when provided
- Only returns chunks from documents with `status = 'ready'`
- Returns top 5 chunks with their text content
- Filter: `document_type IN ('lore', 'rules')`

**Done when:** Each tool function callable and returns correct data. `search-lore` returns empty array for campaigns with no processed documents.

---

### T55 · Planning agent definition

**Status:** `[ ]` | **Depends:** T54

**Create `src/features/ai/agents/planning-agent.ts`:**

```ts
export const planningAgent = new Agent({
  name: 'planning-assistant',
  instructions: `You are a TTRPG session planning assistant for a Dungeon Master.
  Your role is to help plan upcoming sessions by reasoning over campaign history,
  world state, and relevant lore.
  ALWAYS use tools to retrieve context before answering.
  NEVER propose changes to world state — that is handled by a separate process.
  Be specific, creative, and grounded in the campaign's established facts.`,
  model: anthropic('claude-haiku-4-5'), // use claude-sonnet-4-6 for complex reasoning if needed
  tools: { getSessionData, getWorldState, searchLore },
  // Thread memory managed by Mastra via PostgresStore
})
```

**Register** in `mastra` instance (`agents: { planningAgent }`).

**Done when:** Agent defined and registered. `tsc --noEmit` passes.

---

### T56 · `POST /api/ai/chat` endpoint + rate limiter

**Status:** `[ ]` | **Depends:** T55

**Create `src/shared/lib/rate-limiter.ts`:**

```ts
// In-memory token bucket — resets on server restart (acceptable for single-user)
export class RateLimiter {
  constructor(
    private maxTokens: number,
    private windowMs: number,
  ) {}
  check(key: string): boolean // returns false if rate limited
  consume(key: string): void
}
export const chatRateLimiter = new RateLimiter(30, 60 * 60 * 1000) // 30/session/hour
```

**Create `src/routes/api/ai/chat.ts`:**

- `POST /api/ai/chat`
- Body: `{ sessionId: string, message: string, threadId?: string }`
- Rate limit check: `chatRateLimiter.check(sessionId)` → 429 if exceeded
- Call `mastra.getAgent('planningAgent').stream(message, { threadId: threadId ?? sessionId })`
- Stream response as SSE: `event: message`, `data: { delta: string }`, terminal `event: done`
- On Anthropic API 4xx: do not retry, return error immediately
- On Anthropic API 5xx: retry up to 3 times with exponential backoff

**Done when:** `curl -X POST /api/ai/chat` with valid body returns a streaming SSE response. 31st request in an hour returns 429.

---

### T57 · PlanningChat UI + session detail integration

**Status:** `[ ]` | **Depends:** T20, T56

**Create `src/features/ai/components/PlanningChat.tsx`:**

- State: `messages: {role: 'user'|'assistant', content: string}[]`, `threadId: string | null`
- Message list: user messages right-aligned, assistant messages left-aligned
- Streaming display: append token-by-token as SSE `delta` events arrive
- Input: textarea + send button (disabled while streaming)
- Rate limit error: inline message "Rate limit reached. Try again in X minutes."
- Stream error: inline error with retry option
- `threadId` persisted to `sessionStorage` keyed by `sessionId` for in-session persistence
- On first response, store `threadId` returned in SSE metadata

**Wire into session detail (T20):** "Planning Chat" tab/panel renders `<PlanningChat sessionId={session.id} />`.

**Done when:** Can hold a multi-turn planning conversation within a session. Conversation history survives tab switches within the session.

---

## Phase 17 — Analysis Agent (Mode 2)

### T58 · Mastra tools: `get_recent_sessions`, `get_world_events`, `propose_world_event`

**Status:** `[ ]` | **Depends:** T44, T46

**Create `src/features/ai/tools/get-recent-sessions.ts`:**

- Input: `{ campaignId: string, limit?: number }` (default 5)
- Returns last N **completed** sessions with `outcomeNotes`, `sessionNumber`, `title`

**Create `src/features/ai/tools/get-world-events.ts`:**

- Input: `{ campaignId: string, limit?: number }` (default 30)
- Calls `getApprovedWorldEvents` — **approved only**
- Returns `{ eventTypeKey, summary, targetEntityType, targetEntityId, proposedAt }[]`

**Create `src/features/ai/tools/propose-world-event.ts`:**

- Input: `{ eventTypeKey: string, targetEntityType: string, targetEntityId: string | null, payload: unknown, summary: string }`
- **Step 1:** `worldEventSchemas[eventTypeKey].safeParse(payload)` — if invalid, throw with Zod error details so the agent can retry with corrected payload
- **Step 2 (only if valid):** Insert into `world_events` with `status = 'pending'`
- Returns `{ eventId, eventTypeKey, summary }`

**Done when:** `propose_world_event` rejects invalid payloads before writing to DB. Valid proposals create a `pending` world event.

---

### T59 · Analysis agent + session analysis workflow

**Status:** `[ ]` | **Depends:** T58

**Create `src/features/ai/agents/analysis-agent.ts`:**

```ts
export const analysisAgent = new Agent({
  name: 'world-state-analyzer',
  instructions: `You are a world state analyzer for a TTRPG campaign.
  After a session, analyze the outcome notes and recent history to propose discrete world state changes.
  For each change: identify the event type, the affected entity, construct a valid payload, and write a one-sentence summary.
  Use propose_world_event for each change. Propose only changes clearly supported by the session outcomes.
  Do not propose speculative changes.`,
  model: anthropic('claude-haiku-4-5'), // Haiku only — no Sonnet for cost control
  tools: { getRecentSessions, getWorldEvents, proposeWorldEvent },
  // No memory — stateless per run
})
```

**Create `src/features/ai/workflows/session-analysis.ts`:**

Steps:

1. `fetchContext` — call `getRecentSessions`, `getApprovedWorldEvents`, fetch involved entities for triggering session
2. `runAnalysis` — call `analysisAgent.generate(systemPromptWithContext)` — agent will call `propose_world_event` tool for each proposed change
3. `emitNotification` — emit `analysis_complete` SSE with `{ sessionId, proposedCount }`

Retry: 2 attempts. On permanent failure: emit `analysis_failed` SSE.

**Register** agent + workflow in `mastra` instance.

**Done when:** Workflow can be triggered manually and produces `pending` world events for a test session.

---

### T60 · `POST /api/sessions/:id/debrief` endpoint

**Status:** `[ ]` | **Depends:** T53, T59

**Create `src/routes/api/sessions/$sessionId/debrief.ts`:**

- `POST /api/sessions/:sessionId/debrief`
- Body: `{ outcomeNotes: string }`
- Rate limit: max 3 analysis runs per session (use separate `analysisRateLimiter` keyed by sessionId, max 3, no time window — lifetime cap)
- Actions:
  1. `updateSession(sessionId, { outcomeNotes, status: 'completed' })`
  2. `const run = mastra.getWorkflow('sessionAnalysis').createRun(); await run.start({ sessionId })`
  3. Return `{ jobId: run.runId }`

**Done when:** POST to debrief endpoint saves notes, triggers workflow, returns job ID. 4th call to same session returns 429.

---

### T61 · Debrief form + SSE-driven proposal refresh

**Status:** `[ ]` | **Depends:** T47, T53, T60

**Wire into session detail (T20):**

- When `session.status === 'completed'`, render debrief section (or allow re-debrief)
- "Outcome Notes" section: `RichTextEditor` for `outcomeNotes` already present from T20 — add "Analyze Session" button
- On click: POST to `/api/sessions/:id/debrief`, show spinner with "Analyzing campaign changes..."
- `useNotifications({ onAnalysisComplete, onAnalysisFailed })`:
  - `onAnalysisComplete`: invalidate `['world-events', 'pending', campaignId]`, show toast "X world state changes proposed. Review them →"
  - `onAnalysisFailed`: hide spinner, show "Analysis failed. Try again." with retry button
- Add link from session detail to world-events page

**Done when:** Full Mode 2 loop works end-to-end: write outcome notes → analyze → proposals appear on world events page.

---

## Phase 18 — Production Hardening

### T62 · Error boundaries + 404 handling

**Status:** `[ ]` | **Depends:** T10

**Modify `src/routes/__root.tsx`:** Add TanStack Router `errorComponent` — renders a generic error UI with "Reload page" and "Go to campaigns" buttons.

**Modify `src/routes/_authenticated/campaigns/$campaignId.tsx`:** Add `notFoundComponent` — "Campaign not found" with back link.

**Create `src/shared/components/ErrorFallback.tsx`:** Reusable error UI (title, message, action buttons).

**Done when:** Navigating to `/campaigns/nonexistent-id` shows 404 UI. Throwing inside a route loader shows error UI.

---

### T63 · Loading skeletons

**Status:** `[ ]` | **Depends:** T14

Install shadcn `Skeleton` component if not already present: `npx shadcn@latest add skeleton`

**Create skeletons:** `CampaignListSkeleton`, `SessionListSkeleton`, `NpcListSkeleton`, `WorldEventListSkeleton`

**Wire into route `pendingComponent` props** for each list route.

**Done when:** Artificially throttling network shows skeletons instead of blank content areas.

---

### T64 · Environment variable validation on startup

**Status:** `[ ]` | **Depends:** T04

**Create `src/shared/lib/env.ts`:**

```ts
const EnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  ANTHROPIC_API_KEY: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1),
  R2_ACCOUNT_ID: z.string().min(1),
  R2_ACCESS_KEY_ID: z.string().min(1),
  R2_SECRET_ACCESS_KEY: z.string().min(1),
  R2_BUCKET_NAME: z.string().min(1),
  R2_PUBLIC_URL: z.string().url(),
  BETTER_AUTH_SECRET: z.string().min(32),
})

const result = EnvSchema.safeParse(process.env)
if (!result.success) {
  console.error('Missing or invalid environment variables:')
  console.error(result.error.flatten().fieldErrors)
  process.exit(1)
}
export const env = result.data
```

**Import `env`** at the top of `src/shared/db/client.ts` and `src/features/auth/server/auth.ts` to ensure validation runs at startup.

**Done when:** Starting server with a missing env var prints a clear error and exits. Starting with all vars proceeds normally.

---

### T65 · Dockerfile for production

**Status:** `[ ]` | **Depends:** T05

**Create `Dockerfile`** at repo root:

```dockerfile
FROM node:22-slim AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM node:22-slim AS runner
WORKDIR /app
RUN corepack enable
COPY --from=builder /app/.output ./.output
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/package.json ./
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
```

Note: `CMD` runs the built Nitro server. Migrations (`pnpm db:migrate:run`) should be run as a release command, not in the `CMD` — configure this in Fly.io `[deploy] release_command` or Railway deploy hooks.

**Create `.dockerignore`:** `node_modules`, `.env*`, `.git`, `drizzle/meta` (migrations are copied, snapshots are not needed at runtime).

**Done when:** `docker build -t saga .` succeeds. Container starts and serves the app on port 3000.

---

## Risk Register

| ID  | Risk                                                                | Severity | Mitigation                                                                                                                                                                                |
| --- | ------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | Drizzle schema glob silently misses feature schema files            | High     | After T03, create a throwaway test table in a feature schema, run `db:generate`, verify it appears in the migration diff. Remove before merge.                                            |
| R2  | pgvector extension not present when Mastra `PgVector` initializes   | High     | `runMigrations()` (T06) runs `CREATE EXTENSION IF NOT EXISTS vector` as its first statement. `PgVector` is only constructed after migrations complete.                                    |
| R3  | Pending world events leaking into AI context                        | Critical | `getApprovedWorldEvents` is named explicitly. Every AI tool uses this function, never raw queries on `world_events`. Add a comment block on the function: "AI READ PATH — approved only." |
| R4  | `propose_world_event` tool writing invalid payloads                 | High     | Zod validation runs before any DB write in T58. Invalid payload → tool throws → agent retries with corrected payload. Never write on schema mismatch.                                     |
| R5  | Mastra `mastra_thread_id` dangling reference if Mastra tables reset | Medium   | `sessions.mastraThreadId` is nullable. Chat endpoint (T56) handles null by creating a new thread. Treat it as a soft pointer, not a FK.                                                   |
| R6  | SSE long-lived connections on Fly.io/Railway                        | Medium   | Verify Nitro server config allows persistent connections. Set `keep_alive_timeout` appropriately. Polling fallback (T53) handles reconnection.                                            |
| R7  | Zod v4 API differences from v3 examples                             | Medium   | Project starts on v4. Mastra may peer-dep on v3 internally — check for `zod` version conflicts during T50 install. Resolve with `pnpm dedupe` if needed.                                  |
| R8  | Uppy direct-to-R2 CORS issues                                       | Medium   | Route uploads through server proxy (`POST /api/upload`) in T41. Avoids CORS configuration entirely at the cost of slightly higher latency.                                                |
| R9  | `content-collections` Vite plugin not removed from `vite.config.ts` | Low      | T01 removes both the package and the plugin import in the same commit. Build will fail fast if import is missed.                                                                          |
| R10 | `createCampaign` not seeding world event types                      | Medium   | T45 patches `createCampaign` within the same transaction. After T45, write a quick smoke test: create a campaign, assert 24 rows in `world_event_types` for that campaign.                |

---

## Dependency Graph (abbreviated critical path)

```
T01 → T02 → T03 → T06 → T07 → T08 → T09 → T10 → T11 → T13 → T14 → T15
                                                              ↓
                                                    T16 → T17 → T19 → T20
                                                              ↓
                                                    T21 → T24 → T27
                                                              ↓
                                          T28 → T29   T30 → T31
                                                              ↓
                                                    T32 → T33 (entity picker)
                                                              ↓
                                                    T34 → T35 → T36 → T38
                                                              ↓
                                                    T39 → T41 (file storage)
                                                              ↓
                                         T43 → T44 → T45 → T46 → T47 (world events)
                                                              ↓
                                                    T48 → T49 (documents)
                                                              ↓
                                         T50 → T51 → T52 → T53 (Mastra + SSE)
                                                              ↓
                                              T54 → T55 → T56 → T57 (Mode 1)
                                                              ↓
                                              T58 → T59 → T60 → T61 (Mode 2)
                                                              ↓
                                                   T62 → T63 → T64 → T65
```

**Parallelizable after T11:**

- T16 (Sessions schema) || T21 (NPC schema) || T28 (Factions schema) || T30 (PC schema) || T34 (Relationships schema) || T39 (R2 client) || T43 (World Events schema) || T44 (Zod event schemas — no DB dep)

---

_Last updated: 2026-03-01_
