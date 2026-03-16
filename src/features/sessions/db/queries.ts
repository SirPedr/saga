import { eq } from 'drizzle-orm'
import { db } from '#/shared/db/client'
import {
  sessions,
  sessionNpcs,
  sessionFactions,
  sessionPlayableCharacters,
} from './schema'
import type { NewSession } from './schema'

export async function listSessionsByCampaign(campaignId: string) {
  return db
    .select()
    .from(sessions)
    .where(eq(sessions.campaignId, campaignId))
    .orderBy(sessions.sessionNumber)
}

export async function getSessionById(id: string) {
  const session = await db
    .select()
    .from(sessions)
    .where(eq(sessions.id, id))
    .then((r) => r.at(0))

  if (!session) return null

  const [npcs, factions, pcs] = await Promise.all([
    db
      .select({ npcId: sessionNpcs.npcId, role: sessionNpcs.role })
      .from(sessionNpcs)
      .where(eq(sessionNpcs.sessionId, id)),
    db
      .select({ factionId: sessionFactions.factionId })
      .from(sessionFactions)
      .where(eq(sessionFactions.sessionId, id)),
    db
      .select({
        playableCharacterId: sessionPlayableCharacters.playableCharacterId,
      })
      .from(sessionPlayableCharacters)
      .where(eq(sessionPlayableCharacters.sessionId, id)),
  ])

  return {
    ...session,
    npcIds: npcs.map((n) => n.npcId),
    factionIds: factions.map((f) => f.factionId),
    pcIds: pcs.map((pc) => pc.playableCharacterId),
  }
}

export async function createSession(input: NewSession) {
  return db
    .insert(sessions)
    .values(input)
    .returning()
    .then((r) => r[0])
}

export async function updateSession(id: string, input: Partial<NewSession>) {
  return db
    .update(sessions)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(sessions.id, id))
    .returning()
    .then((r) => r[0] ?? null)
}

export async function deleteSession(id: string) {
  await db.delete(sessions).where(eq(sessions.id, id))
}

// Enriched query types
export type SessionWithRelations = NonNullable<
  Awaited<ReturnType<typeof getSessionById>>
>
