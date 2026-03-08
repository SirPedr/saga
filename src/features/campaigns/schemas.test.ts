import { describe, it, expect } from 'vitest'
import { faker } from '@faker-js/faker'
import { CampaignCreateSchema, CampaignUpdateSchema } from './schemas'

const validId = faker.string.uuid()

describe('CampaignCreateSchema', () => {
  it('should accept a valid campaign when all required fields are present', () => {
    const result = CampaignCreateSchema.safeParse({
      title: 'Lost Mines',
      systemId: validId,
    })
    expect(result.success).toBe(true)
  })

  it('should accept an optional description when provided alongside required fields', () => {
    const result = CampaignCreateSchema.safeParse({
      title: 'Lost Mines',
      systemId: validId,
      description: 'A classic adventure.',
    })
    expect(result.success).toBe(true)
  })

  it.each([
    ['empty title', { title: '', systemId: validId }],
    ['missing title', { systemId: validId }],
    ['missing systemId', { title: 'Test' }],
    ['invalid systemId (not a uuid)', { title: 'Test', systemId: 'not-a-uuid' }],
  ])('should reject input when %s', (_label, input) => {
    const result = CampaignCreateSchema.safeParse(input)
    expect(result.success).toBe(false)
  })

  it('should reject a title when it exceeds 100 characters', () => {
    const result = CampaignCreateSchema.safeParse({
      title: 'a'.repeat(101),
      systemId: validId,
    })
    expect(result.success).toBe(false)
  })
})

describe('CampaignUpdateSchema', () => {
  it('should accept an empty object when all fields are optional', () => {
    const result = CampaignUpdateSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('should accept a partial update when only title is provided', () => {
    const result = CampaignUpdateSchema.safeParse({ title: 'New Title' })
    expect(result.success).toBe(true)
  })

  it('should reject an invalid systemId when provided in a partial update', () => {
    const result = CampaignUpdateSchema.safeParse({ systemId: 'bad-id' })
    expect(result.success).toBe(false)
  })
})
