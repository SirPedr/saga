import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { eq } from 'drizzle-orm'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const db = drizzle(pool)

import { systems, campaigns } from '../../src/features/campaigns/db/schema'

export async function seedSystem(name: string, slug: string) {
  const [existing] = await db.select().from(systems).where(eq(systems.slug, slug))
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

export async function cleanCampaigns() {
  await db.delete(campaigns)
}
