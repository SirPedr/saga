import { eq, sql } from 'drizzle-orm'
import { db } from '#/shared/db/client'
import { npcTemplates, npcAttributeValues } from './schema'
import type { TemplateField } from '../schemas'

export async function getTemplateForCampaign(campaignId: string) {
  return db
    .select()
    .from(npcTemplates)
    .where(eq(npcTemplates.campaignId, campaignId))
    .then((r) => r.at(0) ?? null)
}

export async function getOrCreateTemplate(campaignId: string) {
  const existing = await getTemplateForCampaign(campaignId)
  if (existing) return existing

  await db.insert(npcTemplates).values({ campaignId }).onConflictDoNothing()

  return getTemplateForCampaign(campaignId)
}

export async function updateTemplateFields(
  campaignId: string,
  fields: TemplateField[],
) {
  return db
    .update(npcTemplates)
    .set({ fields })
    .where(eq(npcTemplates.campaignId, campaignId))
    .returning()
    .then((r) => r[0] ?? null)
}

export async function getAttributeValuesByNpcId(npcId: string) {
  const rows = await db
    .select({ key: npcAttributeValues.key, value: npcAttributeValues.value })
    .from(npcAttributeValues)
    .where(eq(npcAttributeValues.npcId, npcId))

  return Object.fromEntries(rows.map((r) => [r.key, r.value]))
}

export async function upsertManyAttributeValues(
  npcId: string,
  values: Record<string, string>,
) {
  const entries = Object.entries(values)
  if (entries.length === 0) return

  const rows = entries.map(([key, value]) => ({ npcId, key, value }))

  await db
    .insert(npcAttributeValues)
    .values(rows)
    .onConflictDoUpdate({
      target: [npcAttributeValues.npcId, npcAttributeValues.key],
      set: { value: sql`excluded.value` },
    })
}
