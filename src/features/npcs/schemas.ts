import { z } from 'zod'

const baseFields = {
  key: z
    .string()
    .min(1)
    .regex(/^[a-z_]+$/),
  label: z.string().min(1),
  required: z.boolean().default(false),
}

export const TemplateFieldSchema = z.discriminatedUnion('type', [
  z.object({
    ...baseFields,
    type: z.literal('text'),
  }),
  z.object({
    ...baseFields,
    type: z.literal('number'),
  }),
  z.object({
    ...baseFields,
    type: z.literal('select'),
    options: z.array(z.string().min(1)).min(1),
  }),
])

export type TemplateField = z.infer<typeof TemplateFieldSchema>

export const NpcTemplateUpdateSchema = z.object({
  campaignId: z.uuid(),
  fields: z.array(TemplateFieldSchema),
})

export const NpcAttributeValuesUpsertSchema = z.object({
  npcId: z.uuid(),
  values: z.record(z.string(), z.string()),
})

export const NpcCreateSchema = z.object({
  campaignId: z.uuid(),
  name: z.string().min(1).max(100),
  portraitUrl: z.url().optional(),
  tokenUrl: z.url().optional(),
  attributes: z.record(z.string(), z.string()).optional(),
})

export const NpcUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  portraitUrl: z.url().nullable().optional(),
  tokenUrl: z.url().nullable().optional(),
  attributes: z.record(z.string(), z.string()).optional(),
})
