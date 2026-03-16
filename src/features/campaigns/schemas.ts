import { createInsertSchema } from 'drizzle-orm/zod'
import { campaigns } from './db/schema'

export const CampaignCreateSchema = createInsertSchema(campaigns, {
  title: (schema) => schema.min(1, 'Title is required').max(100),
}).pick({
  title: true,
  systemId: true,
  description: true,
})

export const CampaignUpdateSchema = CampaignCreateSchema.partial()
