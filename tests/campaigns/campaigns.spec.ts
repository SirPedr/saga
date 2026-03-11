import { test, expect } from '@playwright/test'
import { createTestUser, cleanAuth, login } from '../helpers/auth'
import { seedSystem, seedCampaign, cleanCampaigns, cleanSystems } from '../helpers/db'
import { buildSystem, buildCampaign } from '../helpers/factories'

test.describe('Campaign List', () => {
  test.beforeEach(async () => {
    await cleanCampaigns()
    await cleanSystems()
    await cleanAuth()
    await createTestUser()
  })

  test.afterAll(async () => {
    await cleanCampaigns()
    await cleanSystems()
    await cleanAuth()
  })

  test('should display empty state when no campaigns exist', async ({
    page,
  }) => {
    await login(page)
    await expect(page).toHaveURL(/\/campaigns/)

    await expect(
      page.getByRole('heading', { name: /no campaigns yet/i })
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: /create your first campaign/i })
    ).toBeVisible()
    await expect(page.getByRole('article')).toHaveCount(0)
  })

  test('should display campaign cards when campaigns exist', async ({
    page,
  }) => {
    const systemData = buildSystem({ name: 'D&D 5e', slug: 'dnd5e' })
    const system = await seedSystem(systemData.name, systemData.slug)
    const campaign1 = await seedCampaign(
      buildCampaign({ title: 'Curse of Strahd', systemId: system.id })
    )
    const campaign2 = await seedCampaign(
      buildCampaign({ title: 'Lost Mine of Phandelver', systemId: system.id })
    )

    await login(page)
    await expect(page).toHaveURL(/\/campaigns/)

    await expect(page.getByRole('article')).toHaveCount(2)
    await expect(
      page.getByRole('heading', { name: campaign1.title })
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { name: campaign2.title })
    ).toBeVisible()
    await expect(page.getByText('D&D 5e').first()).toBeVisible()
  })

  test('should show description on card when campaign has one', async ({
    page,
  }) => {
    const systemData = buildSystem({ name: 'D&D 5e', slug: 'dnd5e' })
    const system = await seedSystem(systemData.name, systemData.slug)
    await seedCampaign(
      buildCampaign({
        title: 'Curse of Strahd',
        systemId: system.id,
        description: 'A gothic horror adventure in Barovia',
      })
    )

    await login(page)
    await expect(page).toHaveURL(/\/campaigns/)

    await expect(
      page.getByText('A gothic horror adventure in Barovia')
    ).toBeVisible()
  })

  test('should not show description on card when campaign has none', async ({
    page,
  }) => {
    const systemData = buildSystem({ name: 'D&D 5e', slug: 'dnd5e' })
    const system = await seedSystem(systemData.name, systemData.slug)
    await seedCampaign(
      buildCampaign({ title: 'Curse of Strahd', systemId: system.id })
    )

    await login(page)
    await expect(page).toHaveURL(/\/campaigns/)

    await expect(
      page.getByRole('heading', { name: 'Curse of Strahd' })
    ).toBeVisible()
    const card = page.getByRole('article')
    await expect(card).toHaveCount(1)
    await expect(
      card.locator('p').filter({ hasText: /\S/ }).first()
    ).toHaveText(/Created/)
  })
})

test.describe('Create Campaign', () => {
  test.beforeEach(async () => {
    await cleanCampaigns()
    await cleanSystems()
    await cleanAuth()
    await createTestUser()
  })

  test.afterAll(async () => {
    await cleanCampaigns()
    await cleanSystems()
    await cleanAuth()
  })

  test('should create a campaign and show it in the list when form is submitted', async ({
    page,
  }) => {
    const systemData = buildSystem({ name: 'D&D 5e', slug: 'dnd5e' })
    await seedSystem(systemData.name, systemData.slug)

    await login(page)
    await expect(page).toHaveURL(/\/campaigns/)

    await page.getByRole('button', { name: /new campaign/i }).click()
    await expect(
      page.getByRole('heading', { name: /new campaign/i })
    ).toBeVisible()

    await page.getByLabel('Title').fill('Curse of Strahd')
    await page.getByLabel('System').click()
    await page.getByRole('option', { name: 'D&D 5e' }).click()
    await page.getByLabel(/description/i).fill('A gothic horror adventure')

    await page.getByRole('button', { name: /create campaign/i }).click()

    await expect(
      page.getByRole('heading', { name: 'Curse of Strahd' })
    ).toBeVisible()
    await expect(page.getByText('D&D 5e')).toBeVisible()
    await expect(page.getByText('A gothic horror adventure')).toBeVisible()
  })

  test('should create a campaign without description when description is omitted', async ({
    page,
  }) => {
    const systemData = buildSystem({ name: 'D&D 5e', slug: 'dnd5e' })
    await seedSystem(systemData.name, systemData.slug)

    await login(page)
    await expect(page).toHaveURL(/\/campaigns/)

    await page.getByRole('button', { name: /new campaign/i }).click()
    await page.getByLabel('Title').fill('Curse of Strahd')
    await page.getByLabel('System').click()
    await page.getByRole('option', { name: 'D&D 5e' }).click()

    await page.getByRole('button', { name: /create campaign/i }).click()

    await expect(
      page.getByRole('heading', { name: 'Curse of Strahd' })
    ).toBeVisible()
  })

  test('should show validation error when title is cleared after being touched', async ({
    page,
  }) => {
    const systemData = buildSystem({ name: 'D&D 5e', slug: 'dnd5e' })
    await seedSystem(systemData.name, systemData.slug)

    await login(page)
    await expect(page).toHaveURL(/\/campaigns/)

    await page.getByRole('button', { name: /new campaign/i }).click()
    await page.getByLabel('Title').fill('something')
    await page.getByLabel('Title').clear()
    await page.getByLabel(/description/i).click()

    await expect(page.getByText(/title is required/i)).toBeVisible()
  })

  test('should show validation error when title exceeds 100 characters', async ({
    page,
  }) => {
    const systemData = buildSystem({ name: 'D&D 5e', slug: 'dnd5e' })
    await seedSystem(systemData.name, systemData.slug)

    await login(page)
    await expect(page).toHaveURL(/\/campaigns/)

    await page.getByRole('button', { name: /new campaign/i }).click()
    await page.getByLabel('Title').fill('a'.repeat(101))
    await page.getByLabel(/description/i).click()

    await expect(
      page.getByText(/too big|at most 100|<=100/i)
    ).toBeVisible()
  })

  test('should dismiss dialog without creating a campaign when Escape is pressed', async ({
    page,
  }) => {
    await login(page)
    await expect(page).toHaveURL(/\/campaigns/)

    await page.getByRole('button', { name: /new campaign/i }).click()
    await expect(
      page.getByRole('heading', { name: /new campaign/i })
    ).toBeVisible()

    await page.keyboard.press('Escape')

    await expect(
      page.getByRole('heading', { name: /new campaign/i })
    ).not.toBeVisible()
    await expect(
      page.getByRole('heading', { name: /no campaigns yet/i })
    ).toBeVisible()
  })

  test('should replace empty state with campaign card when first campaign is created', async ({
    page,
  }) => {
    const systemData = buildSystem({ name: 'D&D 5e', slug: 'dnd5e' })
    await seedSystem(systemData.name, systemData.slug)

    await login(page)
    await expect(page).toHaveURL(/\/campaigns/)
    await expect(
      page.getByRole('heading', { name: /no campaigns yet/i })
    ).toBeVisible()

    await page.getByRole('button', { name: /new campaign/i }).click()
    await page.getByLabel('Title').fill('Curse of Strahd')
    await page.getByLabel('System').click()
    await page.getByRole('option', { name: 'D&D 5e' }).click()
    await page.getByRole('button', { name: /create campaign/i }).click()

    await expect(
      page.getByRole('heading', { name: /no campaigns yet/i })
    ).not.toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'Curse of Strahd' })
    ).toBeVisible()
  })
})

test.describe('Delete Campaign', () => {
  test.beforeEach(async () => {
    await cleanCampaigns()
    await cleanSystems()
    await cleanAuth()
    await createTestUser()
  })

  test.afterAll(async () => {
    await cleanCampaigns()
    await cleanSystems()
    await cleanAuth()
  })

  test('should remove campaign card when deletion is confirmed', async ({
    page,
  }) => {
    const systemData = buildSystem({ name: 'D&D 5e', slug: 'dnd5e' })
    const system = await seedSystem(systemData.name, systemData.slug)
    const campaign = await seedCampaign(
      buildCampaign({ title: 'Curse of Strahd', systemId: system.id })
    )

    await login(page)
    await expect(page).toHaveURL(/\/campaigns/)
    await expect(
      page.getByRole('heading', { name: campaign.title })
    ).toBeVisible()

    await page.getByRole('button', { name: /delete campaign/i }).click()
    await expect(
      page.getByRole('heading', { name: /are you sure/i })
    ).toBeVisible()
    await expect(page.getByText(`\u201C${campaign.title}\u201D`)).toBeVisible()

    await page.getByRole('button', { name: /^delete$/i }).click()

    await expect(
      page.getByRole('heading', { name: campaign.title })
    ).not.toBeVisible()
  })

  test('should keep campaign when deletion is cancelled', async ({ page }) => {
    const systemData = buildSystem({ name: 'D&D 5e', slug: 'dnd5e' })
    const system = await seedSystem(systemData.name, systemData.slug)
    const campaign = await seedCampaign(
      buildCampaign({ title: 'Curse of Strahd', systemId: system.id })
    )

    await login(page)
    await expect(page).toHaveURL(/\/campaigns/)

    await page.getByRole('button', { name: /delete campaign/i }).click()
    await expect(
      page.getByRole('heading', { name: /are you sure/i })
    ).toBeVisible()

    await page.getByRole('button', { name: /cancel/i }).click()

    await expect(
      page.getByRole('heading', { name: /are you sure/i })
    ).not.toBeVisible()
    await expect(
      page.getByRole('heading', { name: campaign.title })
    ).toBeVisible()
  })

  test('should show empty state when the last campaign is deleted', async ({
    page,
  }) => {
    const systemData = buildSystem({ name: 'D&D 5e', slug: 'dnd5e' })
    const system = await seedSystem(systemData.name, systemData.slug)
    await seedCampaign(
      buildCampaign({ title: 'Curse of Strahd', systemId: system.id })
    )

    await login(page)
    await expect(page).toHaveURL(/\/campaigns/)

    await page.getByRole('button', { name: /delete campaign/i }).click()
    await page.getByRole('button', { name: /^delete$/i }).click()

    await expect(
      page.getByRole('heading', { name: /no campaigns yet/i })
    ).toBeVisible()
  })

  test('should preserve other campaigns when one is deleted', async ({
    page,
  }) => {
    const systemData = buildSystem({ name: 'D&D 5e', slug: 'dnd5e' })
    const system = await seedSystem(systemData.name, systemData.slug)
    await seedCampaign(
      buildCampaign({ title: 'Curse of Strahd', systemId: system.id })
    )
    await seedCampaign(
      buildCampaign({
        title: 'Lost Mine of Phandelver',
        systemId: system.id,
      })
    )

    await login(page)
    await expect(page).toHaveURL(/\/campaigns/)
    await expect(page.getByRole('article')).toHaveCount(2)

    await page
      .getByRole('article')
      .filter({ hasText: 'Curse of Strahd' })
      .getByRole('button', { name: /delete campaign/i })
      .click()
    await page.getByRole('button', { name: /^delete$/i }).click()

    await expect(page.getByRole('article')).toHaveCount(1)
    await expect(
      page.getByRole('heading', { name: 'Lost Mine of Phandelver' })
    ).toBeVisible()
  })
})

test.describe('Navigation', () => {
  test.beforeEach(async () => {
    await cleanCampaigns()
    await cleanSystems()
    await cleanAuth()
    await createTestUser()
  })

  test.afterAll(async () => {
    await cleanCampaigns()
    await cleanSystems()
    await cleanAuth()
  })

  test('should navigate to detail page when campaign card is clicked', async ({
    page,
  }) => {
    const systemData = buildSystem({ name: 'D&D 5e', slug: 'dnd5e' })
    const system = await seedSystem(systemData.name, systemData.slug)
    const campaign = await seedCampaign(
      buildCampaign({ title: 'Curse of Strahd', systemId: system.id })
    )

    await login(page)
    await expect(page).toHaveURL(/\/campaigns/)

    await page
      .getByRole('article')
      .filter({ hasText: campaign.title })
      .click()

    await expect(page).toHaveURL(new RegExp(`/campaigns/${campaign.id}`))
    await expect(page.getByText(campaign.id)).toBeVisible()
  })

  test('should load detail page when navigated to directly', async ({
    page,
  }) => {
    const systemData = buildSystem({ name: 'D&D 5e', slug: 'dnd5e' })
    const system = await seedSystem(systemData.name, systemData.slug)
    const campaign = await seedCampaign(
      buildCampaign({ title: 'Curse of Strahd', systemId: system.id })
    )

    await login(page)
    await expect(page).toHaveURL(/\/campaigns/)

    await page.goto(`/campaigns/${campaign.id}`)
    await expect(page.getByText(campaign.id)).toBeVisible()
  })

  test('should return to campaign list when navigating back from detail', async ({
    page,
  }) => {
    const systemData = buildSystem({ name: 'D&D 5e', slug: 'dnd5e' })
    const system = await seedSystem(systemData.name, systemData.slug)
    const campaign = await seedCampaign(
      buildCampaign({ title: 'Curse of Strahd', systemId: system.id })
    )

    await login(page)
    await expect(page).toHaveURL(/\/campaigns/)

    await page
      .getByRole('article')
      .filter({ hasText: campaign.title })
      .click()
    await expect(page).toHaveURL(new RegExp(`/campaigns/${campaign.id}`))

    await page.goBack()
    await expect(page).toHaveURL(/\/campaigns\/?$/)
    await expect(
      page.getByRole('heading', { name: campaign.title })
    ).toBeVisible()
  })
})

test.describe('Auth Guard', () => {
  test.beforeEach(async () => {
    await cleanAuth()
  })

  test.afterAll(async () => {
    await cleanAuth()
  })

  const protectedPaths = [
    ['/campaigns', 'campaign list'],
    [
      '/campaigns/00000000-0000-0000-0000-000000000000',
      'campaign detail',
    ],
  ] as const

  for (const [path, label] of protectedPaths) {
    test(`should redirect to /login when unauthenticated user visits ${label}`, async ({
      page,
    }) => {
      await page.goto(path)
      await expect(page).toHaveURL(/\/login/)
    })
  }
})

test.describe('Edge Cases', () => {
  test.beforeEach(async () => {
    await cleanCampaigns()
    await cleanSystems()
    await cleanAuth()
    await createTestUser()
  })

  test.afterAll(async () => {
    await cleanCampaigns()
    await cleanSystems()
    await cleanAuth()
  })

  test('should render a campaign card when title is exactly 100 characters', async ({
    page,
  }) => {
    const title = 'a'.repeat(100)
    const systemData = buildSystem({ name: 'D&D 5e', slug: 'dnd5e' })
    const system = await seedSystem(systemData.name, systemData.slug)
    await seedCampaign(buildCampaign({ title, systemId: system.id }))

    await login(page)
    await expect(page).toHaveURL(/\/campaigns/)

    await expect(page.getByRole('heading', { name: title })).toBeVisible()
  })
})
