import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { z } from 'zod'
import { auth } from '#/features/auth/server/auth'
import { SessionCreateSchema, SessionUpdateSchema } from '../schemas'
import {
  listSessionsByCampaign,
  getSessionById,
  createSession as dbCreateSession,
  updateSession as dbUpdateSession,
  deleteSession as dbDeleteSession,
} from '../db/queries'

async function requireSession() {
  const request = getRequest()
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) throw new Error('Unauthorized')
  return session
}

export const listSessions = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ campaignId: z.uuid() }))
  .handler(async ({ data }) => {
    await requireSession()
    return listSessionsByCampaign(data.campaignId)
  })

export const getSession = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ id: z.uuid() }))
  .handler(async ({ data }) => {
    await requireSession()
    return getSessionById(data.id)
  })

export const createSession = createServerFn({ method: 'POST' })
  .inputValidator(SessionCreateSchema)
  .handler(async ({ data }) => {
    await requireSession()
    return dbCreateSession(data)
  })

export const updateSession = createServerFn({ method: 'POST' })
  .inputValidator(SessionUpdateSchema.extend({ id: z.uuid() }))
  .handler(async ({ data }) => {
    await requireSession()
    const { id, ...patch } = data
    return dbUpdateSession(id, patch)
  })

export const deleteSession = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ id: z.uuid() }))
  .handler(async ({ data }) => {
    await requireSession()
    return dbDeleteSession(data.id)
  })
