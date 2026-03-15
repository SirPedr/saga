import {
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'
import { campaigns } from '#/features/campaigns/db/schema'

export const npcs = pgTable('npcs', {
  id: uuid('id').primaryKey().defaultRandom(),
  campaignId: uuid('campaign_id')
    .notNull()
    .references(() => campaigns.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  portraitUrl: text('portrait_url'),
  tokenUrl: text('token_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export type Npc = typeof npcs.$inferSelect
export type NewNpc = typeof npcs.$inferInsert

// One template per campaign. fields is [{key, label, type: 'text'|'number'|'select', required: bool}]
export const npcTemplates = pgTable('npc_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  campaignId: uuid('campaign_id')
    .notNull()
    .unique()
    .references(() => campaigns.id, { onDelete: 'cascade' }),
  fields: jsonb('fields').notNull().default([]),
})

export type NpcTemplate = typeof npcTemplates.$inferSelect
export type NewNpcTemplate = typeof npcTemplates.$inferInsert

export const npcAttributeValues = pgTable(
  'npc_attribute_values',
  {
    npcId: uuid('npc_id')
      .notNull()
      .references(() => npcs.id, { onDelete: 'cascade' }),
    key: text('key').notNull(),
    value: text('value').notNull().default(''),
  },
  (t) => [primaryKey({ columns: [t.npcId, t.key] })],
)

export type NpcAttributeValue = typeof npcAttributeValues.$inferSelect
export type NewNpcAttributeValue = typeof npcAttributeValues.$inferInsert
