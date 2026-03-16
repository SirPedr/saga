import { createInsertSchema } from 'drizzle-orm/zod'
import { sessions } from './db/schema'

const baseSessionSchema = createInsertSchema(sessions, {
  title: (schema) => schema.min(1, 'Title is required').max(100),
  sessionNumber: (schema) => schema.positive(),
})

export const SessionCreateSchema = baseSessionSchema.pick({
  campaignId: true,
  title: true,
  sessionNumber: true,
  sessionDate: true,
  status: true,
})

export const SessionUpdateSchema = baseSessionSchema
  .pick({
    title: true,
    sessionNumber: true,
    sessionDate: true,
    status: true,
    planningNotes: true,
    outcomeNotes: true,
  })
  .partial()
