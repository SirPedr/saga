import { faker } from '@faker-js/faker'

export function buildSystem(
  overrides: Partial<{ name: string; slug: string }> = {}
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
  }> = {}
) {
  return {
    title: overrides.title ?? faker.lorem.words(3),
    systemId: overrides.systemId ?? faker.string.uuid(),
    description: overrides.description,
  }
}
