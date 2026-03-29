import { test, expect  } from '@playwright/test'
import type {Page} from '@playwright/test';
import { createTestUser, cleanAuth, login } from '../helpers/auth'
import {
  seedSystem,
  seedCampaign,
  seedNpcTemplate,
  cleanNpcTemplates,
  cleanNpcs,
  cleanCampaigns,
  cleanSystems,
} from '../helpers/db'
import {
  buildSystem,
  buildCampaign,
  buildTemplateField,
} from '../helpers/factories'
import type { TemplateField } from '../../src/features/npcs/schemas'

async function setupCampaign(fields: TemplateField[] = []) {
  const systemData = buildSystem({ name: 'D&D 5e', slug: 'dnd5e' })
  const system = await seedSystem(systemData.name, systemData.slug)
  const campaign = await seedCampaign(
    buildCampaign({ title: 'Curse of Strahd', systemId: system.id }),
  )
  if (fields.length > 0) {
    await seedNpcTemplate(campaign.id, fields)
  }
  return { system, campaign }
}

async function loginAndGoToNpcs(page: Page, campaignId: string) {
  await login(page)
  await expect(page).toHaveURL(/\/campaigns/)
  await page.goto(`/campaigns/${campaignId}/npcs`, {
    waitUntil: 'networkidle',
  })
}

async function openCreateSheet(page: Page) {
  await page.getByRole('button', { name: /create npc/i }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
}

function cleanup() {
  return Promise.all([
    cleanNpcTemplates(),
    cleanNpcs(),
    cleanCampaigns(),
    cleanSystems(),
    cleanAuth(),
  ])
}

test.describe('CreateNpcForm — static fields', () => {
  test.beforeEach(async () => {
    await cleanup()
    await createTestUser()
  })

  test.afterAll(async () => {
    await cleanup()
  })

  test('should render name and portrait URL fields but no token URL field', async ({
    page,
  }) => {
    const { campaign } = await setupCampaign()
    await loginAndGoToNpcs(page, campaign.id)
    await openCreateSheet(page)

    await expect(page.getByLabel(/^name$/i)).toBeVisible()
    await expect(page.getByLabel(/portrait url/i)).toBeVisible()
    await expect(page.getByLabel(/token/i)).not.toBeVisible()
  })

  test('should show validation error on blur when name is empty', async ({
    page,
  }) => {
    const { campaign } = await setupCampaign()
    await loginAndGoToNpcs(page, campaign.id)
    await openCreateSheet(page)

    await page.getByLabel(/^name$/i).click()
    await page.getByLabel(/^name$/i).blur()

    await expect(page.getByRole('alert').first()).toBeVisible()
    await expect(page.getByLabel(/^name$/i)).toHaveAttribute(
      'aria-invalid',
      'true',
    )
  })

  test('should create an NPC with name only and close the sheet', async ({
    page,
  }) => {
    const { campaign } = await setupCampaign()
    await loginAndGoToNpcs(page, campaign.id)
    await openCreateSheet(page)

    await page.getByLabel(/^name$/i).fill('Strahd von Zarovich')
    await page.getByRole('button', { name: /create npc/i }).click()

    await expect(page.getByRole('dialog')).not.toBeVisible()
  })

  test('should create an NPC with name and portrait URL', async ({ page }) => {
    const { campaign } = await setupCampaign()
    await loginAndGoToNpcs(page, campaign.id)
    await openCreateSheet(page)

    await page.getByLabel(/^name$/i).fill('Ireena Kolyana')
    await page
      .getByLabel(/portrait url/i)
      .fill('https://example.com/ireena.jpg')
    await page.getByRole('button', { name: /create npc/i }).click()

    await expect(page.getByRole('dialog')).not.toBeVisible()
  })
})

test.describe('CreateNpcForm — dynamic fields', () => {
  test.beforeEach(async () => {
    await cleanup()
    await createTestUser()
  })

  test.afterAll(async () => {
    await cleanup()
  })

  test('should render a dynamic text field from the template', async ({
    page,
  }) => {
    const { campaign } = await setupCampaign([
      buildTemplateField({
        key: 'backstory',
        label: 'Backstory',
        type: 'text',
        required: false,
      }) as TemplateField,
    ])
    await loginAndGoToNpcs(page, campaign.id)
    await openCreateSheet(page)

    await expect(page.getByLabel(/backstory/i)).toBeVisible()
  })

  test('should render a dynamic number field with correct input type', async ({
    page,
  }) => {
    const { campaign } = await setupCampaign([
      buildTemplateField({
        key: 'hit_points',
        label: 'Hit Points',
        type: 'number',
        required: false,
      }) as TemplateField,
    ])
    await loginAndGoToNpcs(page, campaign.id)
    await openCreateSheet(page)

    const input = page.getByLabel(/hit points/i)
    await expect(input).toBeVisible()
    await expect(input).toHaveAttribute('type', 'number')
  })

  test('should render a dynamic select field with all options', async ({
    page,
  }) => {
    const { campaign } = await setupCampaign([
      buildTemplateField({
        key: 'race',
        label: 'Race',
        type: 'select',
        required: false,
        options: ['Human', 'Elf', 'Dwarf'],
      }) as TemplateField,
    ])
    await loginAndGoToNpcs(page, campaign.id)
    await openCreateSheet(page)

    await page.getByLabel(/race/i).click()
    await expect(page.getByRole('option', { name: 'Human' })).toBeVisible()
    await expect(page.getByRole('option', { name: 'Elf' })).toBeVisible()
    await expect(page.getByRole('option', { name: 'Dwarf' })).toBeVisible()
  })

  test('should show error on blur when a required dynamic field is empty', async ({
    page,
  }) => {
    const { campaign } = await setupCampaign([
      buildTemplateField({
        key: 'class',
        label: 'Class',
        type: 'text',
        required: true,
      }) as TemplateField,
    ])
    await loginAndGoToNpcs(page, campaign.id)
    await openCreateSheet(page)

    await page.getByLabel(/^class$/i).click()
    await page.getByLabel(/^class$/i).blur()

    await expect(page.getByRole('alert').first()).toBeVisible()
    await expect(page.getByLabel(/^class$/i)).toHaveAttribute(
      'aria-invalid',
      'true',
    )
  })

  test('should clear the error once a required dynamic field is filled', async ({
    page,
  }) => {
    const { campaign } = await setupCampaign([
      buildTemplateField({
        key: 'class',
        label: 'Class',
        type: 'text',
        required: true,
      }) as TemplateField,
    ])
    await loginAndGoToNpcs(page, campaign.id)
    await openCreateSheet(page)

    await page.getByLabel(/^class$/i).click()
    await page.getByLabel(/^class$/i).blur()
    await expect(page.getByRole('alert').first()).toBeVisible()

    await page.getByLabel(/^class$/i).fill('Wizard')
    await expect(page.getByRole('alert')).toHaveCount(0)
  })

  test('should create an NPC with dynamic attribute values', async ({
    page,
  }) => {
    const { campaign } = await setupCampaign([
      buildTemplateField({
        key: 'alignment',
        label: 'Alignment',
        type: 'text',
        required: false,
      }) as TemplateField,
    ])
    await loginAndGoToNpcs(page, campaign.id)
    await openCreateSheet(page)

    await page.getByLabel(/^name$/i).fill('Mordenkainen')
    await page.getByLabel(/alignment/i).fill('Neutral')
    await page.getByRole('button', { name: /create npc/i }).click()

    await expect(page.getByRole('dialog')).not.toBeVisible()
  })
})

test.describe('EditNpcForm — pre-population and edit', () => {
  test.skip('should pre-populate name and portrait URL from the npc prop', async () => {})
  test.skip('should pre-populate dynamic attribute values from npc.attributes', async () => {})
  test.skip('should update the NPC name on submit', async () => {})
  test.skip('should preserve unchanged attributes on a partial update', async () => {})
})
