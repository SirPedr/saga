import { z } from 'zod'

export const CampaignCreateSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100),
  systemId: z.uuid(),
  description: z.string().optional(),
})

export const CampaignUpdateSchema = CampaignCreateSchema.partial()
