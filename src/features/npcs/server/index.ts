import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { z } from 'zod'
import { auth } from '#/features/auth/server/auth'
import { NpcTemplateUpdateSchema, NpcAttributeValuesUpsertSchema } from '../schemas'
import {
  getOrCreateTemplate,
  updateTemplateFields,
  getAttributeValuesByNpcId,
  upsertManyAttributeValues,
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
