import { eq, sql } from 'drizzle-orm'
import { db } from '#/shared/db/client'
import { npcs, npcTemplates, npcAttributeValues } from './schema'
import type { NewNpc } from './schema'
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

export async function listNpcsByCampaign(campaignId: string) {
  return db
    .select()
    .from(npcs)
    .where(eq(npcs.campaignId, campaignId))
    .orderBy(npcs.name)
}

export async function getNpcById(id: string) {
  const npc = await db
    .select()
    .from(npcs)
    .where(eq(npcs.id, id))
    .then((r) => r.at(0) ?? null)

  if (!npc) return null

  const attributes = await getAttributeValuesByNpcId(id)
  return { ...npc, attributes }
}

export async function createNpc(input: NewNpc) {
  return db
    .insert(npcs)
    .values(input)
    .returning()
    .then((r) => r[0])
}

export async function updateNpc(id: string, input: Partial<NewNpc>) {
  return db
    .update(npcs)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(npcs.id, id))
    .returning()
    .then((r) => r[0] ?? null)
}

export async function deleteNpc(id: string) {
  await db.delete(npcs).where(eq(npcs.id, id))
}

// Enriched query types
export type NpcWithAttributes = NonNullable<
  Awaited<ReturnType<typeof getNpcById>>
>
