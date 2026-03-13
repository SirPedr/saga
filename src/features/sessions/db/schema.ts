import {
  date,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'
import { campaigns } from '#/features/campaigns/db/schema'

export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  campaignId: uuid('campaign_id')
    .notNull()
    .references(() => campaigns.id, { onDelete: 'cascade' }),
  mastraThreadId: text('mastra_thread_id'),
  title: text('title').notNull(),
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

export type Session = typeof sessions.$inferSelect
export type NewSession = typeof sessions.$inferInsert

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

export type SessionNpc = typeof sessionNpcs.$inferSelect
export type NewSessionNpc = typeof sessionNpcs.$inferInsert

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

export type SessionFaction = typeof sessionFactions.$inferSelect
export type NewSessionFaction = typeof sessionFactions.$inferInsert

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

export type SessionPlayableCharacter =
  typeof sessionPlayableCharacters.$inferSelect
export type NewSessionPlayableCharacter =
  typeof sessionPlayableCharacters.$inferInsert
