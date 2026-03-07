import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

export const systems = pgTable('systems', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
})

export type System = typeof systems.$inferSelect
export type NewSystem = typeof systems.$inferInsert

export const campaigns = pgTable('campaigns', {
  id: uuid('id').primaryKey().defaultRandom(),
  systemId: uuid('system_id')
    .notNull()
    .references(() => systems.id),
  title: text('title').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export type Campaign = typeof campaigns.$inferSelect
export type NewCampaign = typeof campaigns.$inferInsert
