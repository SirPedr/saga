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

export function buildNpc(
  overrides: Partial<{
    campaignId: string
    name: string
    portraitUrl: string
    tokenUrl: string
  }> = {},
) {
  return {
    campaignId: overrides.campaignId ?? faker.string.uuid(),
    name: overrides.name ?? faker.person.fullName(),
    portraitUrl: overrides.portraitUrl,
    tokenUrl: overrides.tokenUrl,
  }
}

export function buildTemplateField(
  overrides: Partial<{
    key: string
    label: string
    type: 'text' | 'number' | 'select'
    required: boolean
    options: string[]
  }> = {},
) {
  const type = overrides.type ?? 'text'
  const base = {
    key: overrides.key ?? faker.lorem.word().toLowerCase().replace(/\s/g, '_'),
    label: overrides.label ?? faker.lorem.word(),
    type,
    required: overrides.required ?? false,
  }
  if (type === 'select') {
    return {
      ...base,
      options: overrides.options ?? [
        faker.lorem.word(),
        faker.lorem.word(),
        faker.lorem.word(),
      ],
    }
  }
  return base
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
