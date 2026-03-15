import { z } from 'zod'

export const SessionCreateSchema = z.object({
  campaignId: z.uuid(),
  title: z.string().min(1, 'Title is required').max(100),
  sessionNumber: z.number().int().positive(),
  sessionDate: z.string().optional(),
  status: z.enum(['planned', 'completed']).default('planned'),
})

export const SessionUpdateSchema = SessionCreateSchema.omit({
  campaignId: true,
})
  .extend({
    planningNotes: z.string().nullable().optional(),
    outcomeNotes: z.string().nullable().optional(),
  })
  .partial()
