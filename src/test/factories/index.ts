import { faker } from '@faker-js/faker'

export function createUser(overrides: Record<string, unknown> = {}) {
  return {
    id: faker.string.uuid(),
    email: faker.internet.email(),
    name: faker.person.fullName(),
    emailVerified: true,
    image: null as string | null,
    createdAt: faker.date.past(),
    updatedAt: faker.date.recent(),
    ...overrides,
  }
}

export function createAuthSession(overrides: Record<string, unknown> = {}) {
  return {
    id: faker.string.uuid(),
    userId: faker.string.uuid(),
    token: faker.string.alphanumeric(32),
    expiresAt: faker.date.future(),
    ipAddress: null as string | null,
    userAgent: null as string | null,
    createdAt: faker.date.past(),
    updatedAt: faker.date.recent(),
    ...overrides,
  }
}

export function createSessionResponse(
  sessionOverrides: Record<string, unknown> = {},
  userOverrides: Record<string, unknown> = {},
) {
  return {
    session: createAuthSession(sessionOverrides),
    user: createUser(userOverrides),
  }
}

export function createSystem(overrides: Record<string, unknown> = {}) {
  return {
    id: faker.string.uuid(),
    name: faker.lorem.words(2),
    slug: faker.helpers.slugify(faker.lorem.words(2)),
    ...overrides,
  }
}

export function createCampaign(overrides: Record<string, unknown> = {}) {
  return {
    id: faker.string.uuid(),
    title: faker.lorem.words(3),
    systemId: faker.string.uuid(),
    systemName: faker.lorem.word(),
    description: null as string | null,
    createdAt: faker.date.past(),
    updatedAt: faker.date.recent(),
    ...overrides,
  }
}

export function createCampaignResult(overrides: Record<string, unknown> = {}) {
  return {
    id: faker.string.uuid(),
    title: faker.lorem.words(3),
    systemId: faker.string.uuid(),
    description: null as string | null,
    createdAt: faker.date.past(),
    updatedAt: faker.date.recent(),
    ...overrides,
  }
}
