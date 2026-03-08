import { eq } from 'drizzle-orm'
import { db } from '#/shared/db/client'
import { campaigns, systems  } from './schema'
import type {NewCampaign} from './schema';

export async function listCampaigns() {
  return db
    .select({
      id: campaigns.id,
      title: campaigns.title,
      description: campaigns.description,
      systemId: campaigns.systemId,
      systemName: systems.name,
      createdAt: campaigns.createdAt,
      updatedAt: campaigns.updatedAt,
    })
    .from(campaigns)
    .innerJoin(systems, eq(campaigns.systemId, systems.id))
    .orderBy(campaigns.createdAt)
}

export async function getCampaignById(id: string) {
  return db
    .select({
      id: campaigns.id,
      title: campaigns.title,
      description: campaigns.description,
      systemId: campaigns.systemId,
      systemName: systems.name,
      createdAt: campaigns.createdAt,
      updatedAt: campaigns.updatedAt,
    })
    .from(campaigns)
    .innerJoin(systems, eq(campaigns.systemId, systems.id))
    .where(eq(campaigns.id, id))
    .then((r) => r[0] ?? null)
}

export async function createCampaign(input: NewCampaign) {
  return db
    .insert(campaigns)
    .values(input)
    .returning()
    .then((r) => r[0])
}

export async function updateCampaign(id: string, input: Partial<NewCampaign>) {
  return db
    .update(campaigns)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(campaigns.id, id))
    .returning()
    .then((r) => r[0] ?? null)
}

export async function deleteCampaign(id: string) {
  await db.delete(campaigns).where(eq(campaigns.id, id))
}

export async function listSystems() {
  return db.select().from(systems).orderBy(systems.name)
}
