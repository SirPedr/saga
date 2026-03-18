import { test, expect } from '@playwright/test'
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

async function setupCampaign() {
  const systemData = buildSystem({ name: 'D&D 5e', slug: 'dnd5e' })
  const system = await seedSystem(systemData.name, systemData.slug)
  const campaign = await seedCampaign(
    buildCampaign({ title: 'Curse of Strahd', systemId: system.id }),
  )
  return { system, campaign }
}

async function loginAndGoToNpcs(
  page: import('@playwright/test').Page,
  campaignId: string,
) {
  await login(page)
  await expect(page).toHaveURL(/\/campaigns/)
  await page.goto(`/campaigns/${campaignId}/npcs`, {
    waitUntil: 'networkidle',
  })
}

async function openTemplateEditor(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: /template fields/i }).click()
  await expect(page.getByRole('button', { name: /add field/i })).toBeVisible()
}

test.describe('NPC Template Editor — Collapsible', () => {
  test.beforeEach(async () => {
    await cleanNpcTemplates()
    await cleanNpcs()
    await cleanCampaigns()
    await cleanSystems()
    await cleanAuth()
    await createTestUser()
  })

  test.afterAll(async () => {
    await cleanNpcTemplates()
    await cleanNpcs()
    await cleanCampaigns()
    await cleanSystems()
    await cleanAuth()
  })

  test('should show template section collapsed by default', async ({
    page,
  }) => {
    const { campaign } = await setupCampaign()
    await loginAndGoToNpcs(page, campaign.id)

    await expect(page.getByText('Template Fields')).toBeVisible()
    await expect(page.getByText('Define custom attribute fields')).toBeVisible()
    await expect(
      page.getByRole('button', { name: /add field/i }),
    ).not.toBeVisible()
  })

  test('should expand and collapse the template editor when clicked', async ({
    page,
  }) => {
    const { campaign } = await setupCampaign()
    await loginAndGoToNpcs(page, campaign.id)

    await page.getByRole('button', { name: /template fields/i }).click()
    await expect(page.getByRole('button', { name: /add field/i })).toBeVisible()

    await page.getByRole('button', { name: /template fields/i }).click()
    await expect(
      page.getByRole('button', { name: /add field/i }),
    ).not.toBeVisible()
  })
})

test.describe('NPC Template Editor — Empty State', () => {
  test.beforeEach(async () => {
    await cleanNpcTemplates()
    await cleanNpcs()
    await cleanCampaigns()
    await cleanSystems()
    await cleanAuth()
    await createTestUser()
  })

  test.afterAll(async () => {
    await cleanNpcTemplates()
    await cleanNpcs()
    await cleanCampaigns()
    await cleanSystems()
    await cleanAuth()
  })

  test('should show empty message and add button when no fields exist', async ({
    page,
  }) => {
    const { campaign } = await setupCampaign()
    await loginAndGoToNpcs(page, campaign.id)
    await openTemplateEditor(page)

    await expect(page.getByText(/no custom fields defined/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /add field/i })).toBeVisible()
    await expect(page.locator('fieldset')).toHaveCount(0)
  })
})

test.describe('NPC Template Editor — Add Fields', () => {
  test.beforeEach(async () => {
    await cleanNpcTemplates()
    await cleanNpcs()
    await cleanCampaigns()
    await cleanSystems()
    await cleanAuth()
    await createTestUser()
  })

  test.afterAll(async () => {
    await cleanNpcTemplates()
    await cleanNpcs()
    await cleanCampaigns()
    await cleanSystems()
    await cleanAuth()
  })

  test('should add a text field and persist it after save and refresh', async ({
    page,
  }) => {
    const { campaign } = await setupCampaign()
    await loginAndGoToNpcs(page, campaign.id)
    await openTemplateEditor(page)

    await page.getByRole('button', { name: /add field/i }).click()
    await expect(page.locator('fieldset')).toHaveCount(1)

    const fieldset = page.locator('fieldset').first()
    await fieldset.getByLabel('Key').fill('alignment')
    await fieldset.getByLabel('Label').fill('Alignment')

    await page.getByRole('button', { name: /save template/i }).click()
    await expect(
      page.getByRole('button', { name: /save template/i }),
    ).toBeVisible()

    await page.reload({ waitUntil: 'networkidle' })
    await openTemplateEditor(page)

    const reloadedFieldset = page.locator('fieldset').first()
    await expect(reloadedFieldset.getByLabel('Key')).toHaveValue('alignment')
    await expect(reloadedFieldset.getByLabel('Label')).toHaveValue('Alignment')
  })

  test('should add a select field with comma-separated options', async ({
    page,
  }) => {
    const { campaign } = await setupCampaign()
    await loginAndGoToNpcs(page, campaign.id)
    await openTemplateEditor(page)

    await page.getByRole('button', { name: /add field/i }).click()
    const fieldset = page.locator('fieldset').first()

    await fieldset.getByLabel('Key').fill('moral_alignment')
    await fieldset.getByLabel('Label').fill('Moral Alignment')

    await fieldset.getByLabel('Type').click()
    await page.getByRole('option', { name: 'Select' }).click()

    await expect(fieldset.getByLabel(/options/i)).toBeVisible()
    await fieldset.getByLabel(/options/i).fill('Good, Neutral, Evil')

    await page.getByRole('button', { name: /save template/i }).click()

    await page.reload({ waitUntil: 'networkidle' })
    await openTemplateEditor(page)

    const reloadedFieldset = page.locator('fieldset').first()
    await expect(reloadedFieldset.getByLabel(/options/i)).toHaveValue(
      'Good, Neutral, Evil',
    )
  })

  test('should add a required number field', async ({ page }) => {
    const { campaign } = await setupCampaign()
    await loginAndGoToNpcs(page, campaign.id)
    await openTemplateEditor(page)

    await page.getByRole('button', { name: /add field/i }).click()
    const fieldset = page.locator('fieldset').first()

    await fieldset.getByLabel('Key').fill('hit_points')
    await fieldset.getByLabel('Label').fill('Hit Points')

    await fieldset.getByLabel('Type').click()
    await page.getByRole('option', { name: 'Number' }).click()

    await fieldset.getByRole('button', { name: /required/i }).click()

    await page.getByRole('button', { name: /save template/i }).click()

    await page.reload({ waitUntil: 'networkidle' })
    await openTemplateEditor(page)

    const reloadedFieldset = page.locator('fieldset').first()
    await expect(reloadedFieldset.getByLabel('Key')).toHaveValue('hit_points')
    await expect(
      reloadedFieldset.getByRole('button', { name: /required/i }),
    ).toHaveAttribute('data-state', 'on')
  })

  test('should persist multiple fields in order', async ({ page }) => {
    const { campaign } = await setupCampaign()
    await loginAndGoToNpcs(page, campaign.id)
    await openTemplateEditor(page)

    await page.getByRole('button', { name: /add field/i }).click()
    await page.locator('fieldset').nth(0).getByLabel('Key').fill('race')
    await page.locator('fieldset').nth(0).getByLabel('Label').fill('Race')

    await page.getByRole('button', { name: /add field/i }).click()
    await page.locator('fieldset').nth(1).getByLabel('Key').fill('class')
    await page.locator('fieldset').nth(1).getByLabel('Label').fill('Class')

    await page.getByRole('button', { name: /add field/i }).click()
    await page.locator('fieldset').nth(2).getByLabel('Key').fill('level')
    await page.locator('fieldset').nth(2).getByLabel('Label').fill('Level')

    await page.getByRole('button', { name: /save template/i }).click()

    await page.reload({ waitUntil: 'networkidle' })
    await openTemplateEditor(page)

    await expect(page.locator('fieldset')).toHaveCount(3)
    await expect(page.locator('fieldset').nth(0).getByLabel('Key')).toHaveValue(
      'race',
    )
    await expect(page.locator('fieldset').nth(1).getByLabel('Key')).toHaveValue(
      'class',
    )
    await expect(page.locator('fieldset').nth(2).getByLabel('Key')).toHaveValue(
      'level',
    )
  })
})

test.describe('NPC Template Editor — Edit & Delete', () => {
  test.beforeEach(async () => {
    await cleanNpcTemplates()
    await cleanNpcs()
    await cleanCampaigns()
    await cleanSystems()
    await cleanAuth()
    await createTestUser()
  })

  test.afterAll(async () => {
    await cleanNpcTemplates()
    await cleanNpcs()
    await cleanCampaigns()
    await cleanSystems()
    await cleanAuth()
  })

  test('should show saved field key as readonly', async ({ page }) => {
    const { campaign } = await setupCampaign()
    await seedNpcTemplate(campaign.id, [
      buildTemplateField({
        key: 'alignment',
        label: 'Alignment',
        type: 'text',
      }),
    ])

    await loginAndGoToNpcs(page, campaign.id)
    await openTemplateEditor(page)

    const keyInput = page.locator('fieldset').first().getByLabel('Key')
    await expect(keyInput).toHaveValue('alignment')
    await expect(keyInput).toHaveAttribute('readonly', '')
  })

  test('should edit field label while key stays readonly', async ({ page }) => {
    const { campaign } = await setupCampaign()
    await seedNpcTemplate(campaign.id, [
      buildTemplateField({
        key: 'alignment',
        label: 'Alignment',
        type: 'text',
      }),
    ])

    await loginAndGoToNpcs(page, campaign.id)
    await openTemplateEditor(page)

    const fieldset = page.locator('fieldset').first()
    await fieldset.getByLabel('Label').fill('Moral Alignment')

    await page.getByRole('button', { name: /save template/i }).click()

    await page.reload({ waitUntil: 'networkidle' })
    await openTemplateEditor(page)

    const reloadedFieldset = page.locator('fieldset').first()
    await expect(reloadedFieldset.getByLabel('Key')).toHaveValue('alignment')
    await expect(reloadedFieldset.getByLabel('Label')).toHaveValue(
      'Moral Alignment',
    )
  })

  test('should delete a field and persist the change', async ({ page }) => {
    const { campaign } = await setupCampaign()
    await seedNpcTemplate(campaign.id, [
      buildTemplateField({
        key: 'alignment',
        label: 'Alignment',
        type: 'text',
      }),
      buildTemplateField({ key: 'race', label: 'Race', type: 'text' }),
    ])

    await loginAndGoToNpcs(page, campaign.id)
    await openTemplateEditor(page)

    await expect(page.locator('fieldset')).toHaveCount(2)

    await page
      .locator('fieldset')
      .first()
      .getByRole('button', { name: /delete/i })
      .click()

    await expect(page.locator('fieldset')).toHaveCount(1)

    await page.getByRole('button', { name: /save template/i }).click()

    await page.reload({ waitUntil: 'networkidle' })
    await openTemplateEditor(page)

    await expect(page.locator('fieldset')).toHaveCount(1)
    await expect(
      page.locator('fieldset').first().getByLabel('Key'),
    ).toHaveValue('race')
  })
})

test.describe('NPC Template Editor — Validation', () => {
  test.beforeEach(async () => {
    await cleanNpcTemplates()
    await cleanNpcs()
    await cleanCampaigns()
    await cleanSystems()
    await cleanAuth()
    await createTestUser()
  })

  test.afterAll(async () => {
    await cleanNpcTemplates()
    await cleanNpcs()
    await cleanCampaigns()
    await cleanSystems()
    await cleanAuth()
  })

  test('should show inline error for invalid key format', async ({ page }) => {
    const { campaign } = await setupCampaign()
    await loginAndGoToNpcs(page, campaign.id)
    await openTemplateEditor(page)

    await page.getByRole('button', { name: /add field/i }).click()
    await page.locator('fieldset').first().getByLabel('Key').fill('My Field')

    await expect(
      page.getByText(/only lowercase letters and underscores/i),
    ).toBeVisible()
  })

  test('should show error when saving fields with duplicate keys', async ({
    page,
  }) => {
    const { campaign } = await setupCampaign()
    await loginAndGoToNpcs(page, campaign.id)
    await openTemplateEditor(page)

    await page.getByRole('button', { name: /add field/i }).click()
    await page.locator('fieldset').nth(0).getByLabel('Key').fill('alignment')
    await page.locator('fieldset').nth(0).getByLabel('Label').fill('Alignment')

    await page.getByRole('button', { name: /add field/i }).click()
    await page.locator('fieldset').nth(1).getByLabel('Key').fill('alignment')
    await page
      .locator('fieldset')
      .nth(1)
      .getByLabel('Label')
      .fill('Alignment 2')

    await page.getByRole('button', { name: /save template/i }).click()

    await expect(page.getByText(/duplicate key/i).first()).toBeVisible()
  })

  test('should show error when saving select field with no options', async ({
    page,
  }) => {
    const { campaign } = await setupCampaign()
    await loginAndGoToNpcs(page, campaign.id)
    await openTemplateEditor(page)

    await page.getByRole('button', { name: /add field/i }).click()
    const fieldset = page.locator('fieldset').first()

    await fieldset.getByLabel('Key').fill('faction')
    await fieldset.getByLabel('Label').fill('Faction')

    await fieldset.getByLabel('Type').click()
    await page.getByRole('option', { name: 'Select' }).click()

    await page.getByRole('button', { name: /save template/i }).click()

    await expect(page.getByRole('alert')).toBeVisible()
  })
})

test.describe('NPC List Page', () => {
  test.beforeEach(async () => {
    await cleanNpcTemplates()
    await cleanNpcs()
    await cleanCampaigns()
    await cleanSystems()
    await cleanAuth()
    await createTestUser()
  })

  test.afterAll(async () => {
    await cleanNpcTemplates()
    await cleanNpcs()
    await cleanCampaigns()
    await cleanSystems()
    await cleanAuth()
  })

  test('should display the NPCs heading and empty state', async ({ page }) => {
    const { campaign } = await setupCampaign()
    await loginAndGoToNpcs(page, campaign.id)

    await expect(
      page.getByRole('heading', { name: 'NPCs', exact: true }),
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { name: /no npcs yet/i }),
    ).toBeVisible()
  })
})
