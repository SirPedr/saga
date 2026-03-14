import { faker } from '@faker-js/faker'

export function buildSystem(
  overrides: Partial<{ name: string; slug: string }> = {},
) {
  const name = overrides.name ?? faker.word.noun() + ' RPG'
  return {
    name,
    slug: overrides.slug ?? faker.helpers.slugify(name).toLowerCase(),
  }
}

export function buildCampaign(
  overrides: Partial<{
    title: string
    systemId: string
    description: string
  }> = {},
) {
  return {
    title: overrides.title ?? faker.lorem.words(3),
    systemId: overrides.systemId ?? faker.string.uuid(),
    description: overrides.description,
  }
}

export function buildSession(
  overrides: Partial<{
    campaignId: string
    title: string
    sessionNumber: number
    status: 'planned' | 'completed'
    sessionDate: string
  }> = {},
) {
  return {
    campaignId: overrides.campaignId ?? faker.string.uuid(),
    title: overrides.title ?? faker.lorem.words(3),
    sessionNumber:
      overrides.sessionNumber ?? faker.number.int({ min: 1, max: 100 }),
    status: overrides.status ?? ('planned' as const),
    sessionDate: overrides.sessionDate,
  }
}
