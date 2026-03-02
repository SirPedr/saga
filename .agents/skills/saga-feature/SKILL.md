---
name: saga-feature
description: >
  Implements features for the Saga TTRPG campaign planning tool following the project's architecture.

  Use this skill whenever the user asks to add, build, create, or implement anything in this project —
  UI components, server functions, database schemas, Zod validation schemas, TanStack Query hooks,
  TanStack Form wiring, API routes, Mastra AI tools or workflows, or any combination of these.
  Also use it when extending existing features (e.g. "add a field to NPCs", "add a filter to the sessions list",
  "wire up the debrief form to trigger analysis").

  Trigger on requests like: "add an NPC form", "create the factions feature", "write a server function for sessions",
  "build the relationship graph page", "add lore document upload", "add a world event type", "scaffold the campaigns
  CRUD", "implement the planning chat UI", "add a Drizzle schema for X", or any task that touches this app's code.

  When in doubt, use this skill — it knows the project's patterns and will produce code that fits correctly.
---

## Before you start

Read `docs/ARCHITECTURE.md` for the full picture: data model, API contracts, AI layer, and all tech choices.
Refer to it freely while implementing. The sections most relevant to any given task:

- **Section 4** — project folder structure and conventions
- **Section 6** — data model / entity reference
- **Section 7** — AI layer (Mastra, agents, workflows)
- **Section 11** — API contracts
- **Section 15** — frontend tooling (TanStack Form, shadcn/ui, TipTap, Uppy, React Flow)

---

## MCP tools — prefer these over reading source files

When something is unclear, you need to check an API, or you're unsure how a library works, reach for these MCPs first rather than digging through implementation files in the repo.

**shadcn MCP** — for anything shadcn/ui related: which components exist, how they're used, what props they accept, how to compose them. Use `mcp__shadcn__search_items_in_registries` to find components and `mcp__shadcn__get_item_examples_from_registries` to see usage examples. This is faster and more accurate than reading existing component files.

**Context7 MCP** — for up-to-date library documentation and code examples. Whenever you're unsure about an API (TanStack Router, TanStack Query, TanStack Form, Drizzle ORM, Better Auth, Mastra, Zod v4, Tailwind v4, etc.), use `mcp__context7__resolve-library-id` then `mcp__context7__query-docs` to get current docs. Prefer this over guessing or inferring from existing code.

The rule of thumb: if you'd otherwise open a library's source file or an existing feature file just to understand how something works, use the MCP instead.

---

## Folder structure

Every feature lives under `src/features/<domain>/`. Route files are thin shells — they import from features, never the reverse.

```
src/
  routes/                     ← thin shells only
    _authenticated.tsx         ← layout route; all protected routes are nested under it
    campaigns/
      $campaignId/
        npcs/
          index.tsx            ← imports NpcListPage from features/npcs
          $npcId.tsx           ← imports NpcDetailPage from features/npcs

  features/
    <domain>/
      components/              ← UI components for this domain
      server/                  ← server functions (createServerFn)
      db/
        schema.ts              ← Drizzle table definitions owned by this feature
        queries.ts             ← reusable query functions (called from server/)
      schemas.ts               ← Zod schemas for forms and validation

  shared/
    components/                ← cross-feature UI (Layout, Nav, shadcn wrappers)
    db/
      client.ts                ← Drizzle client (import `db` from here)
    lib/
      utils.ts
```

**Key rule:** Route files contain only a component that imports and renders the feature's page component. No logic, no queries, no form handling in route files.

---

## Drizzle schemas

Each feature's `db/schema.ts` exports only the tables it owns. A top-level migration runner imports all schema files.

```ts
// features/npcs/db/schema.ts
import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core'
import { campaigns } from '#/features/campaigns/db/schema'

export const npcs = pgTable('npcs', {
  id: uuid('id').primaryKey().defaultRandom(),
  campaignId: uuid('campaign_id')
    .notNull()
    .references(() => campaigns.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  portraitUrl: text('portrait_url'),
  tokenUrl: text('token_url'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export type Npc = typeof npcs.$inferSelect
export type NewNpc = typeof npcs.$inferInsert
```

Always export `$inferSelect` and `$inferInsert` types alongside each table. Use `uuid().defaultRandom()` for PKs and timestamp defaults. Dynamic attribute tables use `text` for values.

**Queries file** — reusable query helpers consumed by server functions:

```ts
// features/npcs/db/queries.ts
import { eq } from 'drizzle-orm'
import { db } from '#/shared/db/client'
import { npcs } from './schema'

export async function getNpcsByCampaign(campaignId: string) {
  return db.select().from(npcs).where(eq(npcs.campaignId, campaignId))
}

export async function getNpcById(id: string) {
  return db
    .select()
    .from(npcs)
    .where(eq(npcs.id, id))
    .then((r) => r[0] ?? null)
}
```

---

## Server functions

TanStack Start server functions are the primary data access layer. They replace a traditional REST API for most operations.

```ts
// features/npcs/server/index.ts
import { createServerFn } from '@tanstack/react-start'
import { getWebRequest } from '@tanstack/react-start/server'
import { auth } from '#/features/auth/server'
import { getNpcsByCampaign } from '../db/queries'
import { z } from 'zod'

export const listNpcs = createServerFn({ method: 'GET' })
  .validator(z.object({ campaignId: z.uuid() }))
  .handler(async ({ data }) => {
    const { campaignId } = data

    // Auth check — every server function must verify session
    const request = getWebRequest()
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session) throw new Error('Unauthorized')

    return getNpcsByCampaign(campaignId)
  })

export const createNpc = createServerFn({ method: 'POST' })
  .validator(z.object({ campaignId: z.uuid(), name: z.string().min(1) }))
  .handler(async ({ data }) => {
    const request = getWebRequest()
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session) throw new Error('Unauthorized')

    return db
      .insert(npcs)
      .values(data)
      .returning()
      .then((r) => r[0])
  })
```

Every server function must check the session before doing anything. Use `getWebRequest()` + `auth.api.getSession()` — this is the Better Auth pattern for server functions.

---

## Zod schemas

Define form/validation schemas in `features/<domain>/schemas.ts`. These are shared between server-side validation (the `.validator()` call) and client-side form validation.

```ts
// features/npcs/schemas.ts
import { z } from 'zod'

export const createNpcSchema = z.object({
  campaignId: z.uuid(),
  name: z.string().min(1, 'Name is required'),
  portraitUrl: z.url().optional(),
})

export const updateNpcSchema = createNpcSchema.partial().extend({
  id: z.uuid(),
})
```

**Zod v4 format validators** — this project uses Zod v4. String format validators are now first-class types, not `.string()` refinements. Use `z.uuid()` not `z.string().uuid()`, `z.url()` not `z.string().url()`, `z.email()` not `z.string().email()`. The `.string().uuid()` / `.string().url()` forms are deprecated in v4.

World event type payload schemas live in `features/world-events/event-schemas.ts` and are keyed by event type string (see architecture doc section 7 for the pattern).

---

## TanStack Query integration

Wrap server functions in query options using `queryOptions` from `@tanstack/react-query`:

```ts
// features/npcs/server/queries.ts
import { queryOptions } from '@tanstack/react-query'
import { listNpcs } from './index'

export const npcListQueryOptions = (campaignId: string) =>
  queryOptions({
    queryKey: ['npcs', campaignId],
    queryFn: () => listNpcs({ data: { campaignId } }),
  })
```

In route loaders, prefetch data:

```ts
// routes/campaigns/$campaignId/npcs/index.tsx
import { createFileRoute } from '@tanstack/react-router'
import { npcListQueryOptions } from '#/features/npcs/server/queries'
import { NpcListPage } from '#/features/npcs/components/NpcListPage'

export const Route = createFileRoute('/campaigns/$campaignId/npcs/')({
  loader: ({ context: { queryClient }, params }) =>
    queryClient.ensureQueryData(npcListQueryOptions(params.campaignId)),
  component: NpcListPage,
})
```

In components, consume with `useSuspenseQuery`:

```ts
const { data: npcs } = useSuspenseQuery(npcListQueryOptions(campaignId))
```

Invalidate queries after mutations:

```ts
const queryClient = useQueryClient()
await createNpc({ data: { campaignId, name } })
queryClient.invalidateQueries({ queryKey: ['npcs', campaignId] })
```

---

## TanStack Form

Use TanStack Form with Zod for all forms. The Zod schema goes in `schemas.ts`; the form component lives in `features/<domain>/components/`.

```tsx
// features/npcs/components/NpcForm.tsx
import { useForm } from '@tanstack/react-form'
import { zodValidator } from '@tanstack/zod-form-adapter'
import { createNpcSchema } from '../schemas'

export function NpcForm({
  campaignId,
  onSuccess,
}: {
  campaignId: string
  onSuccess: () => void
}) {
  const form = useForm({
    defaultValues: { name: '', campaignId },
    validatorAdapter: zodValidator(),
    validators: { onChange: createNpcSchema },
    onSubmit: async ({ value }) => {
      await createNpc({ data: value })
      onSuccess()
    },
  })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        form.handleSubmit()
      }}
    >
      <form.Field name="name">
        {(field) => (
          <div>
            <label htmlFor={field.name}>Name</label>
            <input
              id={field.name}
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
            />
            {field.state.meta.errors.map((err) => (
              <p key={err?.toString()} className="text-destructive text-sm">
                {err}
              </p>
            ))}
          </div>
        )}
      </form.Field>
      <button type="submit" disabled={form.state.isSubmitting}>
        Save
      </button>
    </form>
  )
}
```

---

## UI components

Use **shadcn/ui** components where they exist. Install individually as needed:

```bash
pnpm dlx shadcn@latest add button input label card dialog
```

Use Tailwind v4 for styling. The project uses the `cn()` utility from `#/shared/lib/utils` for conditional class merging.

For rich text fields (session notes, outcome notes, lore descriptions): use **TipTap** with `StarterKit`. For file uploads: use **Uppy** with the R2/S3 plugin. For the relationship graph: use **React Flow** — data must be shaped as `nodes[]` and `edges[]` (see architecture doc section 6 for the exact shape).

---

## AI layer (Mastra)

When a feature involves AI, work within the existing Mastra setup at `features/ai/index.ts`.

**Adding a new tool** — tools live in `features/ai/tools/`:

```ts
// features/ai/tools/get-faction-data.ts
import { createTool } from '@mastra/core'
import { z } from 'zod'

export const getFactionData = createTool({
  id: 'get_faction_data',
  description: 'Fetches factions involved in a session',
  inputSchema: z.object({ sessionId: z.uuid() }),
  execute: async ({ context }) => {
    // query db
  },
})
```

Register the tool on the relevant agent in `features/ai/index.ts`. The Planning Agent uses streaming and conversation memory; the Analysis Agent is stateless and outputs structured JSON validated against Zod schemas.

**Adding a workflow step** — see architecture doc section 9 for the exact workflow pattern. Mastra handles retries (2 attempts) and persists state to `mastra_workflow_snapshot`.

---

## Checklist for a new feature

When adding a complete new feature domain:

- [ ] `features/<domain>/db/schema.ts` — Drizzle tables with exported types
- [ ] `features/<domain>/db/queries.ts` — reusable query functions
- [ ] `features/<domain>/schemas.ts` — Zod schemas for forms/validation
- [ ] `features/<domain>/server/index.ts` — server functions (each with auth check)
- [ ] `features/<domain>/server/queries.ts` — `queryOptions` wrappers
- [ ] `features/<domain>/components/` — page and form components
- [ ] Route files under `src/routes/` — thin shells only, using `ensureQueryData` in the loader
- [ ] Run `pnpm db:generate && pnpm db:migrate` after schema changes

When only adding to an existing feature, touch only the files that need changing. Don't create new files unless necessary.

---

## After implementation

Once the implementation is complete and working, do all of these in order:

### 1. Run `pnpm check`

Run `pnpm check` (Prettier + ESLint autofix) and fix any errors it reports before continuing.

### 2. TypeScript type-check

Run `pnpm tsc --noEmit` to catch any type errors. Fix all reported errors before continuing — do not skip or suppress them.

### 3. Run tests

Use the `/kcd-testing` skill to write and run tests for the code you just implemented. At minimum, cover the server functions and any non-trivial logic. For UI components, add component tests if the component has meaningful interaction or state. Fix any failing tests before continuing.

### 4. Commit the changes

Commit all changed files using conventional commit messages. Split into multiple commits if the changes span different domains or concerns (e.g. schema changes separate from UI changes, or unrelated features). Use the `/conventional-commit` skill if available.

### 5. Update `docs/PLANNING.md`

Mark the relevant task(s) as complete by changing their status from `[ ]` or `[~]` to `[x]`. The file uses the format:

```
**Status:** `[x]` | **Depends:** …
```

### 6. Close the GitHub issue (if applicable)

If the work was requested as part of a GitHub issue, close it using the GitHub MCP tool:

```
mcp__github__issue_write({
  method: "update",
  owner: <repo-owner>,
  repo: <repo-name>,
  issue_number: <issue-number>,
  state: "closed",
  state_reason: "completed"
})
```

If you don't know the issue number or which PLANNING.md task to mark, ask the user before making any changes.
