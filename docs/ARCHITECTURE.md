# TTRPG Campaign Planning Tool — Architecture Document

> **Audience:** Staff+ engineer implementing from scratch.
> **Scope:** Full-stack architecture, data model, AI layer, and tooling decisions.
> **Version:** 1.0

---

## Table of Contents

1. [Overview](#1-overview)
2. [Stack Summary](#2-stack-summary)
3. [Hosting & Infrastructure](#3-hosting--infrastructure)
4. [Application Layer](#4-application-layer)
5. [Authentication](#5-authentication)
6. [Data Model](#6-data-model)
7. [AI Layer](#7-ai-layer)
8. [File Storage](#8-file-storage)
9. [Background Jobs & Workflows](#9-background-jobs--workflows)
10. [Real-time Notifications](#10-real-time-notifications)
11. [API Contracts](#11-api-contracts)
12. [Document Processing Pipeline](#12-document-processing-pipeline)
13. [Security](#13-security)
14. [Failure Handling](#14-failure-handling)
15. [Frontend Tooling](#15-frontend-tooling)
16. [Local Development](#16-local-development)

---

## 1. Overview

A browser-based, AI-first tool for tabletop RPG Dungeon Masters to plan and manage campaigns. The system supports multiple TTRPG systems (D&D 5e, Call of Cthulhu, etc.) and multiple campaigns. It is a single-user application with authentication.

### Core Capabilities

- **Entity management** — NPCs, factions, playable characters, and their relationships, modeled as a graph.
- **Session management** — each session is a first-class entity with notes, planning, outcomes, maps, and references to other entities.
- **AI-assisted planning** — a conversational assistant helps plan sessions using RAG over campaign lore, world state, and system rules.
- **World state tracking** — the AI proposes structured world state changes after each session debrief; the user approves or rejects each individually.
- **Multi-system support** — NPC and character attributes are dynamic and schema-driven per campaign, not hardcoded to any one system.

### Key Design Principles

- **AI proposes, human approves.** The AI never mutates world state silently. Every proposed change is surfaced for review before being committed.
- **Confirmed state only.** The AI always reasons over approved world state. Pending proposals are never included in AI context.
- **World events as compressed history.** Approved world events are the canonical, queryable record of what has happened in the campaign. They include a human-readable summary alongside the structured payload, allowing the AI to reconstruct campaign history without raw session notes.
- **RAG over full context injection.** Campaign lore, system rules, and entity data are retrieved selectively rather than injected wholesale into every prompt.

---

## 2. Stack Summary

| Concern             | Technology                                               |
| ------------------- | -------------------------------------------------------- |
| Hosting             | Fly.io or Railway                                        |
| Application         | TanStack Start (fullstack, Node.js)                      |
| Database            | PostgreSQL + pgvector                                    |
| ORM                 | Drizzle (application schema only)                        |
| AI Framework        | Mastra                                                   |
| AI Model            | Claude API (Haiku for analysis/RAG, Sonnet for planning) |
| File Storage        | Cloudflare R2                                            |
| Auth                | Better Auth                                              |
| Background Jobs     | Mastra Workflows                                         |
| Real-time           | Server-Sent Events (SSE)                                 |
| Forms               | TanStack Form + Zod                                      |
| UI Components       | shadcn/ui                                                |
| Rich Text           | TipTap                                                   |
| File Uploads        | Uppy                                                     |
| Graph Visualization | React Flow                                               |
| Server State        | TanStack Query                                           |

---

## 3. Hosting & Infrastructure

### Production

Deploy on **Fly.io** or **Railway** as a standard Node.js server. Both support persistent volumes, managed Postgres add-ons, and straightforward environment variable management.

**Do not deploy to Cloudflare Workers or Pages.** The edge runtime has constraints that conflict with this architecture: no long-running processes, limited Node.js API compatibility, and streaming Claude responses require a persistent connection.

### Database

Use the managed Postgres add-on provided by the hosting platform. Enable the `pgvector` extension on first deploy:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

Mastra manages its own tables in the same Postgres instance using a separate schema (`mastra_*` prefix). Drizzle manages the application schema. Both share the same `DATABASE_URL` connection string.

### File Storage

Cloudflare R2 for all uploaded files (NPC portraits, token images, session maps, lore documents). R2 assets are public — no signed URLs required. Use the S3-compatible API with the AWS SDK.

---

## 4. Application Layer

### TanStack Start

The entire application — frontend and backend — lives in a single TanStack Start project. There is no separate backend service. Server functions handle all data access and AI interactions.

TanStack Start server functions replace a traditional REST API for most operations. They provide type-safe RPC between client and server without network boilerplate.

### Project Structure (feature-based)

Code is organized by **feature/domain** rather than technical layer. Each feature owns its routes, components, server functions, database schema, and Zod schemas. Shared infrastructure lives in `shared/`.

```
src/
  start.ts                         # TanStack Start entry — global request middleware (auth guard)
  routes/                          # TanStack Start file-based routes (thin shells only)
    __root.tsx
    campaigns/
      index.tsx
      $campaignId/
        index.tsx
        sessions/
          index.tsx
          $sessionId.tsx
        npcs/
          index.tsx
          $npcId.tsx
        graph.tsx
        world-events.tsx
        documents.tsx

  features/
    campaigns/
      components/                  # CampaignCard, CampaignForm, etc.
      server/                      # createCampaign, getCampaign, listCampaigns, etc.
      db/
        schema.ts                  # Drizzle table definitions (campaigns, systems)
        queries.ts                 # Reusable query functions
      schemas.ts                   # Zod schemas for forms and validation
    sessions/
      components/                  # SessionCard, DebriefForm, PlanningChat, etc.
      server/
      db/
        schema.ts                  # sessions, session_npcs, session_factions, session_pcs
        queries.ts
      schemas.ts
    npcs/
      components/                  # NpcCard, NpcForm, AttributeEditor, etc.
      server/
      db/
        schema.ts                  # npcs, npc_templates, npc_attribute_values
        queries.ts
      schemas.ts
    factions/
      components/
      server/
      db/
        schema.ts
        queries.ts
      schemas.ts
    characters/
      components/
      server/
      db/
        schema.ts                  # playable_characters, pc_templates, pc_attribute_values
        queries.ts
      schemas.ts
    relationships/
      components/                  # RelationshipGraph (React Flow), EdgeForm, etc.
      server/
      db/
        schema.ts                  # relationships
        queries.ts
    world-events/
      components/                  # PendingProposals, ApprovalCard, WorldStateView, etc.
      server/
      db/
        schema.ts                  # world_event_types, world_events, world_event_sessions
        queries.ts
      event-schemas.ts             # Zod schemas keyed by event type (npc_died, etc.)
    documents/
      components/                  # LoreDocumentUploader, DocumentList, etc.
      server/
      db/
        schema.ts                  # lore_documents, lore_document_entities
        queries.ts
      schemas.ts
    ai/
      agents/
        planning-agent.ts          # Conversational planning assistant
        analysis-agent.ts          # Stateless world-state analyzer
      tools/
        get-session-data.ts
        get-world-state.ts
        search-lore.ts
        get-recent-sessions.ts
        get-world-events.ts
        propose-world-event.ts
      workflows/
        session-analysis.ts        # Mode 2: triggered after debrief
        document-processing.ts     # Chunk, embed, upsert lore documents
      index.ts                     # Mastra initialization and export
    auth/
      server/                      # Better Auth setup and session middleware
      components/                  # LoginForm, etc.

  shared/
    components/                    # Cross-feature UI (Layout, Nav, shadcn wrappers)
    db/
      client.ts                    # Drizzle client and connection pool
      migrate.ts                   # Migration runner
    storage/
      r2.ts                        # R2 / S3-compatible client
      upload.ts                    # Upload helpers
    lib/
      utils.ts
      rate-limiter.ts
```

**Conventions:**

- Route files are thin shells: they import page components and server functions from the relevant feature, not the other way around.
- Cross-feature imports go through `shared/` or are done directly (e.g. `sessions` may import from `npcs` to render a session's NPC list). Avoid circular imports.
- Each `db/schema.ts` exports only the tables owned by that feature. A top-level migration script imports all schema files to build the full Drizzle schema.

---

## 5. Authentication

Use **Better Auth** for session-based authentication. Better Auth integrates natively with Drizzle and manages its own user/session tables. Configure it to use the same Postgres instance.

Since this is a single-user application, no role-based access control is required. All authenticated routes simply verify a valid session exists.

### Auth Guard

Authentication is enforced globally via a TanStack Start **request middleware** in `src/start.ts`. The middleware runs before every server request — including SSR page loads, client-side navigations, and server function calls — and redirects to `/login` if no session is found.

```typescript
// src/start.ts
const authMiddleware = createMiddleware().server(async ({ next, request }) => {
  const { pathname } = new URL(request.url)
  const isPublic = ['/login', '/api/auth'].some((p) => pathname.startsWith(p))
  if (!isPublic) {
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session) throw redirect({ to: '/login' })
  }
  return next()
})

export const startInstance = createStart(() => ({
  requestMiddleware: [authMiddleware],
}))
```

Public paths that bypass the guard: `/login`, `/api/auth/*`.

---

## 6. Data Model

### Design Decisions

- **Graph model for relationships.** NPCs, factions, and their relationships form a graph. Relationships are stored as a typed edge table (`relationships`) with source entity, target entity, type, and sentiment. This maps directly to React Flow's node/edge model.
- **Dynamic attributes for NPCs and characters.** Because the tool supports multiple TTRPG systems with different stat blocks, NPC and playable character attributes are not hardcoded columns. They are defined by a per-campaign template and stored as key-value pairs.
- **World events as an event log.** World state is not a mutable document. It is derived from an append-only log of approved events. Each event has a typed, Zod-validated payload and a human-readable summary.
- **Event type schemas live in code, not the database.** World event type definitions (their Zod schemas) are version-controlled TypeScript. The database stores a `key` reference to the schema. Adding a new event type requires a code change and redeploy — this is an intentional tradeoff for full type safety.
- **Mastra owns conversation storage.** Conversation history (messages, threads) is managed by Mastra's `PostgresStore`, not by application Drizzle schema. The `sessions` table stores a `mastra_thread_id` foreign key to link a session to its Mastra conversation thread.
- **Embeddings are Mastra-managed.** The `PgVector` store from `@mastra/pg` manages vector embeddings. The application does not write to embedding tables directly.

### Entity Reference

```
campaigns
  id, system_id, title, description, created_at, updated_at

systems
  id, name, slug (e.g. "dnd5e", "coc7e")

sessions
  id, campaign_id, mastra_thread_id, title, session_number,
  status (planned | completed), session_date,
  planning_notes, outcome_notes, created_at, updated_at

session_npcs                          -- many-to-many with role
  session_id, npc_id, role (text)

session_factions                      -- many-to-many
  session_id, faction_id

session_playable_characters           -- many-to-many
  session_id, playable_character_id

npcs
  id, campaign_id, name, portrait_url, token_url, created_at, updated_at

npc_templates                         -- defines available fields per campaign
  id, campaign_id, fields (jsonb)     -- [{key, label, type, required}]

npc_attribute_values                  -- dynamic attributes per NPC
  npc_id, key, value (text)

factions
  id, campaign_id, name, description, created_at, updated_at

playable_characters
  id, campaign_id, name, portrait_url, created_at, updated_at

pc_templates
  id, campaign_id, fields (jsonb)

pc_attribute_values
  playable_character_id, key, value (text)

relationships                         -- graph edges (typed, directional)
  id, campaign_id,
  source_entity_type (npc | faction | pc),
  source_entity_id,
  target_entity_type (npc | faction | pc),
  target_entity_id,
  type (text),                        -- e.g. "member_of", "allied_with", "rivals"
  sentiment (positive | neutral | negative),
  notes (text), created_at, updated_at

world_event_types
  id, campaign_id, key (text),        -- references Zod schema in code
  label, target_entity_type, created_at

world_events
  id, campaign_id, event_type_key,
  target_entity_type, target_entity_id,
  payload (jsonb),                    -- validated against Zod schema at write time
  summary (text),                     -- human-readable one-liner, AI-generated
  status (pending | approved | rejected),
  proposed_at, reviewed_at, created_at

world_event_sessions                  -- events can emerge from multiple sessions
  world_event_id, session_id

lore_documents
  id, campaign_id, filename, r2_key, r2_url,
  document_type (lore | rules),
  status (uploading | processing | ready | failed),
  retry_count (int, default 0),
  created_at, updated_at

lore_document_entities                -- tags documents to structured entities
  document_id, entity_type, entity_id

attachments                           -- images/links on sessions, npcs, pcs
  id, entity_type, entity_id,
  attachment_type (image | link),
  url, label, r2_key (nullable),
  created_at
```

### Graph API Shape

The `/campaigns/:id/graph` endpoint returns data pre-shaped for React Flow:

```json
{
  "nodes": [
    {
      "id": "npc_uuid",
      "type": "npc",
      "data": { "name": "Aldric", "portrait_url": "..." }
    },
    { "id": "faction_uuid", "type": "faction", "data": { "name": "Ironclad" } }
  ],
  "edges": [
    {
      "id": "rel_uuid",
      "source": "npc_uuid",
      "target": "faction_uuid",
      "data": { "type": "member_of", "sentiment": "positive" }
    }
  ]
}
```

---

## 7. AI Layer

### Overview

The AI layer is built on **Mastra** using the Claude API. There are two distinct agents with different responsibilities, instructions, tools, and memory configurations.

Mastra is initialized with `PostgresStore` pointing to the same Postgres instance as the application. Mastra manages its own tables (`mastra_threads`, `mastra_messages`, `mastra_workflow_snapshot`, etc.) under its own schema.

```typescript
// features/ai/index.ts
import { Mastra } from '@mastra/core'
import { PostgresStore } from '@mastra/pg'
import { PgVector } from '@mastra/pg'

export const mastra = new Mastra({
  storage: new PostgresStore({ connectionString: process.env.DATABASE_URL }),
  vectors: {
    campaigns: new PgVector({ connectionString: process.env.DATABASE_URL }),
  },
  agents: { planningAgent, analysisAgent },
  workflows: { sessionAnalysisWorkflow, documentProcessingWorkflow },
})
```

### Agent 1 — Planning Assistant (Conversational)

Handles Mode 1: the interactive chat interface for session planning.

**Characteristics:**

- Thread-scoped memory via Mastra (conversation history persists per session)
- Streaming text output
- Rate limited: **30 messages per session per hour** (enforced in application middleware)

**Tools:**

- `get_session_data` — fetches current session details, involved NPCs/factions
- `get_world_state` — queries approved world events for the campaign, most recent first
- `search_lore` — vector similarity search over lore documents and rules PDFs tagged to relevant entities

**Context assembly order (assembled before each request):**

| Layer                       | Approx. Tokens | Notes                                    |
| --------------------------- | -------------- | ---------------------------------------- |
| Recent conversation history | ~2,000         | Last 10 messages, managed by Mastra      |
| Current session data        | ~1,000         | Title, notes, outcome, involved entities |
| Involved NPC/faction data   | ~1,500         | Top 5–10 entities in the session         |
| Confirmed world events      | ~1,000         | Last 20–30 events, summary field only    |
| RAG lore chunks             | ~2,000         | Retrieved via pgvector similarity search |
| **Total**                   | **~7,500**     |                                          |

**Model:** Claude Haiku for most turns; escalate to Sonnet for complex multi-step planning reasoning.

### Agent 2 — World State Analyzer (Analysis)

Handles Mode 2: triggered automatically after a session debrief is saved.

**Characteristics:**

- Stateless — no persistent memory, no conversation thread
- Structured JSON output, validated against Zod schemas for each event type
- Rate limited: **3 analysis runs per session** (enforced in application middleware)
- Runs as a Mastra Workflow (see Section 9)

**Tools:**

- `get_recent_sessions` — fetches the last 3–5 sessions and their outcomes
- `get_world_events` — fetches recent confirmed world events (compressed history)
- `propose_world_event` — outputs a structured world event proposal conforming to the event type's Zod schema

**Context:** Recent sessions + confirmed world events + involved entity data. Does not use RAG — analytical context is fetched directly by SQL queries.

**Model:** Claude Haiku only (cost control). Sonnet is not used for analysis runs.

### World Event Type Schemas

Event type schemas are Zod schemas defined in code, referenced by `key` in the database. The `world_event_types` table stores only the key, label, and target entity type — not the schema itself.

Example:

```typescript
// features/world-events/event-schemas.ts

export const worldEventSchemas = {
  npc_died: z.object({
    npc_id: z.string().uuid(),
    cause: z.string(),
    witnessed_by: z.array(z.string().uuid()).optional(),
  }),
  faction_alignment_changed: z.object({
    faction_id: z.string().uuid(),
    previous_alignment: z.string(),
    new_alignment: z.string(),
    reason: z.string(),
  }),
  // ... etc
} satisfies Record<string, z.ZodSchema>
```

When the Analysis Agent proposes a world event, the payload is validated against the relevant schema before being written to the database.

### World Event Taxonomy

The following event types are seeded per campaign by default. Additional types can be added via the UI (triggering a new type key that maps to a Zod schema in code).

**NPC Events:** `npc_died`, `npc_resurrected`, `npc_changed_loyalty`, `npc_changed_location`, `npc_relationship_changed`, `npc_revealed_secret`, `npc_joined_faction`, `npc_left_faction`

**Faction Events:** `faction_alliance_formed`, `faction_alliance_broken`, `faction_war_declared`, `faction_peace_declared`, `faction_dissolved`, `faction_created`, `faction_power_shift`

**World Events:** `location_discovered`, `location_destroyed`, `major_political_event`, `artifact_found`, `artifact_lost`, `prophecy_fulfilled`

**Session Events:** `party_decision_consequence`, `quest_completed`, `quest_failed`

### RAG Configuration

- **Embedding model:** Use Mastra's default embedding (OpenAI `text-embedding-3-small` or equivalent).
- **Chunk size:** ~500 tokens with 50-token overlap.
- **Index type:** `hnsw` for fast approximate search.
- **Metadata on each chunk:** `document_id`, `campaign_id`, `document_type` (`lore` | `rules`), `entity_ids[]` (from `lore_document_entities`).
- **Retrieval filter:** Always filter by `campaign_id`. Filter by `entity_ids` when the session has known involved entities to scope retrieval.

---

## 8. File Storage

All file uploads go to **Cloudflare R2** via the S3-compatible API. Files are public — no signed URLs.

Use **Uppy** on the frontend for the upload UI. Uppy supports multipart uploads and drag-and-drop, and handles large files (maps, PDFs) gracefully.

Uploaded files are stored with R2 keys structured as:

```
campaigns/{campaign_id}/npcs/{npc_id}/portrait.{ext}
campaigns/{campaign_id}/sessions/{session_id}/maps/{filename}
campaigns/{campaign_id}/documents/{document_id}/{filename}
```

Store both the `r2_key` and the public `r2_url` in the database. Use the key for deletion operations and the URL for display.

---

## 9. Background Jobs & Workflows

**Mastra Workflows** replace a dedicated job queue. Mastra persists workflow state to Postgres (`mastra_workflow_snapshot`), supports suspend/resume, and handles retries natively.

### Session Analysis Workflow (Mode 2)

Triggered when a session's outcome notes are saved.

```
1. Fetch recent sessions (last 3–5)
2. Fetch confirmed world events for campaign
3. Fetch entities involved in triggering session
4. Call Analysis Agent with assembled context
5. Parse and validate proposed world events against Zod schemas
6. Write proposed events to world_events table (status: pending)
7. Emit SSE notification to client
```

**Retry policy:** 2 attempts on failure. On permanent failure, mark all associated pending proposals as failed and emit a failure SSE notification.

### Document Processing Workflow

Triggered when a lore document is uploaded to R2.

```
1. Set document status: processing
2. Fetch file from R2
3. Extract text (PDF parsing)
4. Chunk text (~500 tokens, 50-token overlap)
5. Generate embeddings for each chunk
6. Upsert chunks into PgVector with metadata
7. Set document status: ready
```

**Retry policy:** 2 attempts on failure. On permanent failure: delete file from R2, set document status to `failed`.

**Document status state machine:**

```
uploading → processing → ready
                      ↘ failed  (after 2 retries → R2 cleanup)
```

---

## 10. Real-time Notifications

Use **Server-Sent Events (SSE)** for server-to-client push notifications. SSE is sufficient since communication is unidirectional (server notifies client of job completion).

Implement a single SSE endpoint the client connects to on app load:

```
GET /api/notifications   (SSE stream)
```

Events emitted:

```
event: analysis_complete
data: { "session_id": "...", "proposed_count": 3 }

event: analysis_failed
data: { "session_id": "...", "error": "..." }

event: document_ready
data: { "document_id": "..." }

event: document_failed
data: { "document_id": "..." }
```

**Fallback:** Implement polling on `/api/jobs/:jobId/status` as a fallback for clients that lose the SSE connection mid-analysis.

---

## 11. API Contracts

TanStack Start server functions serve as the primary interface. The following endpoints are exposed as conventional HTTP routes for SSE and any non-server-function needs.

### CRUD (via server functions)

All entities support standard create/read/update/delete server functions:
`campaigns`, `sessions`, `npcs`, `factions`, `playable_characters`, `relationships`, `world_event_types`, `attachments`, `lore_documents`

### AI Endpoints

```
POST /api/ai/chat
  Body: { session_id, message, thread_id }
  Response: SSE stream (streaming text)

POST /api/ai/analyze-session
  Body: { session_id }
  Response: { job_id }

GET  /api/ai/notifications
  Response: SSE stream
```

### World Event Approval

```
POST /api/world-events/:id/approve
POST /api/world-events/:id/reject
GET  /api/world-events/pending?campaign_id=...
```

### Documents

```
POST /api/documents/upload
  Body: multipart — file + campaign_id + entity_tags[]
  Response: { document_id, status: "uploading" }

POST /api/documents/:id/tag
  Body: { entity_type, entity_id }

DELETE /api/documents/:id
  Side effect: deletes R2 file + embeddings
```

### World State

```
GET /api/world-state?campaign_id=...
  Response: aggregated view of approved events, grouped by entity

GET /api/world-state/entity/:type/:id
  Response: all approved events targeting this entity

GET /campaigns/:id/graph
  Response: { nodes[], edges[] }  -- pre-shaped for React Flow
```

### Session Debrief

```
POST /api/sessions/:id/debrief
  Body: { outcome_notes }
  Side effect: saves notes + triggers session analysis workflow
  Response: { job_id }
```

---

## 12. Document Processing Pipeline

When a user uploads a lore document or rules PDF:

1. **Frontend** — Uppy uploads directly to a pre-signed R2 URL (or via server proxy).
2. **Server function** — creates a `lore_documents` record with `status: uploading`, stores `r2_key` and `r2_url`.
3. **Server function** — triggers the Mastra Document Processing Workflow.
4. **Workflow** — fetches file from R2, extracts text, chunks, embeds, upserts into PgVector with metadata including `campaign_id`, `document_type`, and `entity_ids` from `lore_document_entities`.
5. **Workflow** — updates document status to `ready` and emits SSE.

Documents with `status !== ready` are excluded from RAG retrieval queries.

---

## 13. Security

### API Key Management

The Claude API key lives in server environment variables only. It is never exposed to the client. TanStack Start server functions guarantee server-side execution — verify no API keys are referenced in client-side code.

### Rate Limiting

Enforced in-process (no Redis required at single-user scale) via application middleware on AI endpoints:

- **Planning Agent (Mode 1):** 30 messages per session per hour
- **Analysis Agent (Mode 2):** 3 analysis runs per session

Use a simple in-memory token bucket per session ID. Reset on server restart is acceptable for a single-user tool.

### HTTPS

Enforced automatically by Fly.io and Railway for all production deployments. No additional configuration required.

### R2 Assets

Files are public. If sensitive campaign assets become a concern in future, migrate to signed R2 URLs at that time.

---

## 14. Failure Handling

### Claude API Failures (Mode 1 — Chat)

- Retry up to **3 times** with exponential backoff.
- **Do not retry on 4xx errors** (bad request, context too large, rate limit exceeded) — surface the error immediately.
- After 3 failed attempts, display a clear error message to the user.
- Streaming failures mid-response: abort stream, display partial content with an error indicator.

### Mastra Workflow Failures (Mode 2 — Analysis)

- Mastra handles retries internally. Configure **2 retry attempts** per workflow step.
- On permanent failure: emit `analysis_failed` SSE event, surface a retry button in the UI.

### Document Processing Failures

- **2 retry attempts** via Mastra Workflow.
- On permanent failure: delete the file from R2, set document status to `failed`, emit `document_failed` SSE event.
- The user must re-upload the document manually.

### Database Failures

No special handling beyond standard Postgres connection pooling (Drizzle defaults). If Postgres is unavailable, requests fail fast with a 500 error. For a single-user personal tool, manual recovery is acceptable.

---

## 15. Frontend Tooling

### Forms

**TanStack Form** with **Zod** for validation. Zod schemas are defined in each feature's `schemas.ts` (or `event-schemas.ts` for world events) and are shared between server-side validation and client-side form validation.

### UI Components

**shadcn/ui** — accessible, unstyled-by-default component library. Install components individually as needed rather than importing the entire library.

### Rich Text

**TipTap** for all rich text fields: session planning notes, outcome notes, lore document descriptions. Use the `StarterKit` extension and add `Image` support for inline map references.

### File Uploads

**Uppy** with the R2/S3 plugin. Configure it to upload directly to R2 or through a server proxy depending on CORS requirements.

### Graph Visualization

**React Flow** for the NPC/faction relationship graph. Design the data layer with React Flow in mind from the start — the `/campaigns/:id/graph` endpoint returns data pre-shaped as `nodes[]` and `edges[]`.

Custom node types for `npc` and `faction` nodes display portrait thumbnails and key attributes inline. Edge labels display relationship type and sentiment.

### Server State

**TanStack Query** for all server state management. Key patterns:

- Invalidate `world-events/pending` after approval/rejection actions.
- Invalidate session data after debrief submission.
- Poll `/api/jobs/:jobId/status` as SSE fallback using `refetchInterval`.

---

## 16. Local Development

Use **Docker Compose** for local development, mirroring the production setup as closely as possible.

```yaml
# docker-compose.yml
services:
  app:
    build: .
    ports:
      - '3000:3000'
    environment:
      DATABASE_URL: postgresql://postgres:postgres@db:5432/ttrpg
      # ... other env vars
    depends_on:
      - db

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

Use the `pgvector/pgvector` Docker image — it ships with the `pgvector` extension pre-installed.

Cloudflare R2 in local development: use the real R2 bucket with a separate `dev` prefix, or use a local MinIO instance as an S3-compatible substitute if offline development is needed.

### Environment Variables

```
DATABASE_URL=
ANTHROPIC_API_KEY=
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_URL=
BETTER_AUTH_SECRET=
```

---

_Document generated from architecture design session. Last updated: February 2026._
