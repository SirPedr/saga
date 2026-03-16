import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { z } from 'zod'
import { auth } from '#/features/auth/server/auth'
import {
  NpcTemplateUpdateSchema,
  NpcAttributeValuesUpsertSchema,
  NpcCreateSchema,
  NpcUpdateSchema
  
} from '../schemas'
import type {TemplateField} from '../schemas';
import {
  getOrCreateTemplate,
  getTemplateForCampaign,
  updateTemplateFields,
  getAttributeValuesByNpcId,
  upsertManyAttributeValues,
  listNpcsByCampaign,
  getNpcById,
  createNpc as dbCreateNpc,
  updateNpc as dbUpdateNpc,
  deleteNpc as dbDeleteNpc,
} from '../db/queries'

async function requireSession() {
  const request = getRequest()
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) throw new Error('Unauthorized')
  return session
}

export const getTemplate = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ campaignId: z.uuid() }))
  .handler(async ({ data }) => {
    await requireSession()
    return getOrCreateTemplate(data.campaignId)
  })

export const updateTemplate = createServerFn({ method: 'POST' })
  .inputValidator(NpcTemplateUpdateSchema)
  .handler(async ({ data }) => {
    await requireSession()
    return updateTemplateFields(data.campaignId, data.fields)
  })

export const getAttributes = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ npcId: z.uuid() }))
  .handler(async ({ data }) => {
    await requireSession()
    return getAttributeValuesByNpcId(data.npcId)
  })

export const upsertAttributes = createServerFn({ method: 'POST' })
  .inputValidator(NpcAttributeValuesUpsertSchema)
  .handler(async ({ data }) => {
    await requireSession()
    await upsertManyAttributeValues(data.npcId, data.values)
    return { success: true }
  })

// --- NPC CRUD ---

async function validateRequiredAttributes(
  campaignId: string,
  attributes?: Record<string, string>,
) {
  const template = await getTemplateForCampaign(campaignId)
  if (!template) return

  const fields = template.fields as TemplateField[]
  const requiredFields = fields.filter((f) => f.required)
  if (requiredFields.length === 0) return

  const missing = requiredFields.filter(
    (f) => !attributes?.[f.key] || attributes[f.key].trim() === '',
  )

  if (missing.length > 0) {
    throw new Error(
      `Missing required fields: ${missing.map((f) => f.label).join(', ')}`,
    )
  }
}

export const listNpcs = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ campaignId: z.uuid() }))
  .handler(async ({ data }) => {
    await requireSession()
    return listNpcsByCampaign(data.campaignId)
  })

export const getNpc = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ id: z.uuid() }))
  .handler(async ({ data }) => {
    await requireSession()
    return getNpcById(data.id)
  })

export const createNpc = createServerFn({ method: 'POST' })
  .inputValidator(NpcCreateSchema)
  .handler(async ({ data }) => {
    await requireSession()

    await validateRequiredAttributes(data.campaignId, data.attributes)

    const { attributes, ...npcData } = data
    const npc = await dbCreateNpc(npcData)

    if (attributes && Object.keys(attributes).length > 0) {
      await upsertManyAttributeValues(npc.id, attributes)
    }

    return npc
  })

export const updateNpc = createServerFn({ method: 'POST' })
  .inputValidator(NpcUpdateSchema.extend({ id: z.uuid() }))
  .handler(async ({ data }) => {
    await requireSession()
    const { id, attributes, ...patch } = data

    if (attributes) {
      const existing = await getNpcById(id)
      if (!existing) throw new Error('NPC not found')
      const merged = { ...existing.attributes, ...attributes }
      await validateRequiredAttributes(existing.campaignId, merged)
      await upsertManyAttributeValues(id, attributes)
    }

    if (Object.keys(patch).length > 0) {
      return dbUpdateNpc(id, patch)
    }

    return getNpcById(id)
  })

export const deleteNpc = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ id: z.uuid() }))
  .handler(async ({ data }) => {
    await requireSession()
    await dbDeleteNpc(data.id)
    return { success: true }
  })
