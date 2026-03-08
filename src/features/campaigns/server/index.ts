import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { z } from 'zod'
import { auth } from '#/features/auth/server/auth'
import { CampaignCreateSchema, CampaignUpdateSchema } from '../schemas'
import {
  listCampaigns as dbListCampaigns,
  getCampaignById,
  createCampaign as dbCreateCampaign,
  updateCampaign as dbUpdateCampaign,
  deleteCampaign as dbDeleteCampaign,
  listSystems as dbListSystems,
} from '../db/queries'

async function requireSession() {
  const request = getRequest()
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) throw new Error('Unauthorized')
  return session
}

export const listCampaigns = createServerFn({ method: 'GET' }).handler(
  async () => {
    await requireSession()
    return dbListCampaigns()
  },
)

export const getCampaign = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ id: z.uuid() }))
  .handler(async ({ data }) => {
    await requireSession()
    return getCampaignById(data.id)
  })

export const createCampaign = createServerFn({ method: 'POST' })
  .inputValidator(CampaignCreateSchema)
  .handler(async ({ data }) => {
    await requireSession()
    return dbCreateCampaign(data)
  })

export const updateCampaign = createServerFn({ method: 'POST' })
  .inputValidator(CampaignUpdateSchema.extend({ id: z.uuid() }))
  .handler(async ({ data }) => {
    await requireSession()
    const { id, ...patch } = data
    return dbUpdateCampaign(id, patch)
  })

export const deleteCampaign = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ id: z.uuid() }))
  .handler(async ({ data }) => {
    await requireSession()
    return dbDeleteCampaign(data.id)
  })

export const listSystems = createServerFn({ method: 'GET' }).handler(
  async () => {
    await requireSession()
    return dbListSystems()
  },
)
