import { createInsertSchema } from 'drizzle-orm/zod'
import { z } from 'zod'
import { npcs, npcTemplates } from './db/schema'

// --- Template field schema (manual — validates JSONB structure) ---

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

// --- NPC template schemas ---

export const NpcTemplateUpdateSchema = createInsertSchema(npcTemplates)
  .pick({
    campaignId: true,
  })
  .extend({
    fields: z.array(TemplateFieldSchema),
  })

// --- NPC attribute schemas (manual — maps to junction table) ---

export const NpcAttributeValuesUpsertSchema = z.object({
  npcId: z.uuid(),
  values: z.record(z.string(), z.string()),
})

// --- NPC CRUD schemas ---

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
    attributes: z.record(z.string(), z.string()).optional(),
  })

export const NpcUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  portraitUrl: z.url().nullable().optional(),
  tokenUrl: z.url().nullable().optional(),
  attributes: z.record(z.string(), z.string()).optional(),
})
