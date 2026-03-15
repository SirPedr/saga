import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { eq } from 'drizzle-orm'

import { systems, campaigns } from '../../src/features/campaigns/db/schema'
import { sessions } from '../../src/features/sessions/db/schema'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const db = drizzle(pool)

export async function seedSystem(name: string, slug: string) {
  const [existing] = await db
    .select()
    .from(systems)
    .where(eq(systems.slug, slug))
  if (existing) return existing
  const [created] = await db.insert(systems).values({ name, slug }).returning()
  return created
}

export async function seedCampaign(fields: {
  title: string
  systemId: string
  description?: string
}) {
  const [created] = await db
    .insert(campaigns)
    .values({
      title: fields.title,
      systemId: fields.systemId,
      description: fields.description,
    })
    .returning()
  return created
}

export async function seedSession(fields: {
  campaignId: string
  title: string
  sessionNumber: number
  status?: 'planned' | 'completed'
  sessionDate?: string
  planningNotes?: string
  outcomeNotes?: string
}) {
  const [created] = await db
    .insert(sessions)
    .values({
      campaignId: fields.campaignId,
      title: fields.title,
      sessionNumber: fields.sessionNumber,
      status: fields.status ?? 'planned',
      sessionDate: fields.sessionDate,
      planningNotes: fields.planningNotes,
      outcomeNotes: fields.outcomeNotes,
    })
    .returning()
  return created
}

export async function cleanSessions() {
  await db.delete(sessions)
}

export async function cleanCampaigns() {
  await db.delete(campaigns)
}

export async function cleanSystems() {
  await db.delete(systems)
}
