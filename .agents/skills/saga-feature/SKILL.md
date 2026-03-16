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

Always export `$inferSelect` and `$inferInsert` types alongside each table. Use `uuid().defaultRandom()` for PKs and timestamp defaults. Dynamic attribute tables use `text` for values. For `jsonb` columns, use `.$type<T>()` to give them a concrete TypeScript type (e.g., `jsonb('fields').$type<TemplateField[]>()`).

Drizzle table definitions are the **single source of truth** for field names and types. Zod validation schemas in `schemas.ts` should be derived from these tables using `createInsertSchema` / `createUpdateSchema` from `drizzle-orm/zod`, with refinements for validation constraints (min/max, patterns). Do not manually redefine the same fields in both Drizzle and Zod.

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

**Prefer deriving Zod schemas from Drizzle tables** using `createInsertSchema` / `createUpdateSchema` from `drizzle-orm/zod`. Only define manual Zod schemas for fields that don't map 1:1 to a DB column (e.g., `attributes` record that maps to a junction table, or JSONB structure validation like `TemplateFieldSchema`).

```ts
// features/npcs/schemas.ts
import { createInsertSchema } from 'drizzle-orm/zod'
import { z } from 'zod'
import { npcs } from './db/schema'

// Derive from Drizzle table, add validation refinements
const baseNpcSchema = createInsertSchema(npcs, {
  name: (schema) => schema.min(1).max(100),
  portraitUrl: z.url().optional(),
  tokenUrl: z.url().optional(),
})

export const NpcCreateSchema = baseNpcSchema
  .pick({
    campaignId: true,
    name: true,
    portraitUrl: true,
    tokenUrl: true,
  })
  .extend({
    // Zod-only field — maps to a separate junction table, not a column on npcs
    attributes: z.record(z.string(), z.string()).optional(),
  })

export const NpcUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  portraitUrl: z.url().nullable().optional(),
  tokenUrl: z.url().nullable().optional(),
  attributes: z.record(z.string(), z.string()).optional(),
})
```

Refinements can be **callbacks** `(schema) => schema.max(100)` (extends the existing schema) or **raw Zod schemas** like `z.url().optional()` (overwrites the field entirely, including nullability).

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

**Every UI primitive must come from shadcn/ui.** Do not use native HTML elements (`<button>`, `<input>`, `<label>`, `<select>`, `<textarea>`, `<table>`, `<dialog>`, etc.) directly in feature code. Always use the corresponding shadcn component (`Button`, `Input`, `Label`, `Select`, `Textarea`, `Table`, `Dialog`, etc.) instead. If a shadcn component doesn't exist yet in the project, install it first:

```bash
pnpm dlx shadcn@latest add button input label card dialog
```

The only exceptions to this rule are:

- **Semantic HTML structure elements** (`<form>`, `<nav>`, `<main>`, `<section>`, `<header>`, `<footer>`, `<fieldset>`, `<legend>`) — these have no shadcn equivalents and are required for accessibility.
- **Headings** (`<h1>`–`<h6>`) and **paragraphs** (`<p>`) — plain text elements with no interactive behavior.
- **Layout elements** (`<div>`, `<span>`) — used for grouping and styling, not as interactive primitives.

When in doubt, check the shadcn registry using the shadcn MCP tools. If a shadcn component exists for the element you need, use it.

Use Tailwind v4 for styling. The project uses the `cn()` utility from `#/shared/lib/utils` for conditional class merging.

For rich text fields (session notes, outcome notes, lore descriptions): use **TipTap** with `StarterKit`. For file uploads: use **Uppy** with the R2/S3 plugin. For the relationship graph: use **React Flow** — data must be shaped as `nodes[]` and `edges[]` (see architecture doc section 6 for the exact shape).

---

## Styling — Tailwind only, no inline styles

Every style in this project must come from Tailwind utility classes. Inline styles (`style={{...}}` in JSX or `style="..."` in HTML) are not allowed — they bypass the design system, break theme consistency, and make dark/light mode switching unreliable.

**Use theme tokens via Tailwind classes.** The project's design tokens are defined as CSS custom properties in `src/styles.css` and mapped into Tailwind's theme system via `@theme inline`. Reference them through Tailwind classes:

```tsx
// Correct — uses theme tokens through Tailwind
<h2 className="font-display text-ink text-2xl">Chapter Title</h2>
<div className="bg-vellum-2 border-line p-4">...</div>
<button className="bg-amber hover:bg-amber-deep text-ink">Save</button>

// Wrong — inline styles bypass the theme
<h2 style={{ fontFamily: 'Fraunces', color: '#e8ddc8' }}>Chapter Title</h2>
<div style={{ background: '#17140f', borderColor: 'rgba(232,221,200,0.10)' }}>...</div>
```

**When a value isn't in the theme**, use the closest existing token rather than hardcoding a color or size. For example, if a design calls for `#d9a840`, use `text-amber` (which maps to `#d4a348`) — the small difference won't matter, and theme consistency will. If the design genuinely requires a new token that nothing existing covers, add it properly: define the CSS custom property in both `:root` and `.dark` blocks in `src/styles.css`, then register it in the `@theme inline` block so Tailwind can generate classes for it.

**Avoid arbitrary Tailwind values** like `bg-[#1a1510]` or `text-[14px]` when a theme token or standard Tailwind scale value exists. Arbitrary values are better than inline styles, but they still sidestep the design system. Reserve them for truly one-off layout values (e.g., `max-w-[680px]` for a content column) where no semantic token applies.

---

## Accessibility

Every component generated by this skill must follow these rules. For the full reference, see `docs/A11y.md`.

1. **Semantic HTML first.** Use native elements (`<button>`, `<nav>`, `<table>`, `<label>`) before reaching for ARIA roles. Never use `<div onClick>` as a button or `<a>` without `href` for actions.

2. **Heading hierarchy.** Never skip heading levels. One `<h1>` per page. Each heading must describe the content that follows it.

3. **Landmarks.** All visible content must live within a landmark (`<header>`, `<nav>`, `<main>`, `<aside>`, `<footer>`). Label duplicate landmarks with `aria-label`. A `<section>` only becomes a landmark when it has an accessible name (`aria-labelledby` or `aria-label`).

4. **Form accessibility.** Every `<input>` needs a visible `<label>` (connected via `htmlFor`/`id`). Mark invalid fields with `aria-invalid="true"` and link error messages via `aria-describedby`. Group related controls with `<fieldset>` + `<legend>`.

5. **Keyboard navigation.** All interactive elements must be operable via keyboard. Maintain visible focus indicators (never `outline: none` without a replacement). Manage focus on route changes and trap focus inside modals.

6. **Live regions.** Use `aria-live="polite"` (or `"assertive"` for errors) for dynamic content updates (toasts, loading states, async results). The live-region container must exist in the DOM before content is injected into it.

7. **Screen reader support.** Use the `sr-only` class for icon-only buttons and contextual link text (e.g., "View details" → `<span className="sr-only">for {name}</span>`). Use `aria-hidden="true"` only on purely decorative elements — never on focusable elements.

> **shadcn/ui components are assumed fully accessible out of the box.** Do not add redundant ARIA attributes or keyboard handling to them. Focus accessibility effort on custom components, page structure, and content semantics.

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
- [ ] `features/<domain>/schemas.ts` — Zod schemas derived from Drizzle tables via `drizzle-orm/zod`, plus manual schemas for form-only or JSONB fields
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

### 5. Close the GitHub issue

Task tracking has moved to GitHub Issues (https://github.com/SirPedr/saga/issues). `docs/PLANNING.md` no longer exists.

Each task maps 1-to-1 to an issue: T11 → #11, T12 → #12, etc. When a task is complete, close the corresponding issue using the GitHub MCP tool:

```
mcp__github__issue_write({
  method: "update",
  owner: "SirPedr",
  repo: "saga",
  issue_number: <issue-number>,
  state: "closed",
  state_reason: "completed"
})
```

Also update the label: remove `status: todo` or `status: in-progress` and add `status: done`.

If you don't know which issue corresponds to the work that was done, ask the user before closing anything.
