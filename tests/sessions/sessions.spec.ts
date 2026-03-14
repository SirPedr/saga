import { test, expect } from '@playwright/test'
import { createTestUser, cleanAuth, login } from '../helpers/auth'
import {
  seedSystem,
  seedCampaign,
  seedSession,
  cleanSessions,
  cleanCampaigns,
  cleanSystems,
} from '../helpers/db'
import { buildSystem, buildCampaign } from '../helpers/factories'

async function setupCampaign() {
  const systemData = buildSystem({ name: 'D&D 5e', slug: 'dnd5e' })
  const system = await seedSystem(systemData.name, systemData.slug)
  const campaign = await seedCampaign(
    buildCampaign({ title: 'Curse of Strahd', systemId: system.id }),
  )
  return { system, campaign }
}

async function loginAndGoToSessions(
  page: import('@playwright/test').Page,
  campaignId: string,
) {
  await login(page)
  await expect(page).toHaveURL(/\/campaigns/)
  await page.goto(`/campaigns/${campaignId}/sessions`)
  await page.waitForURL(`**/campaigns/${campaignId}/sessions`)
}

test.describe('Session List', () => {
  test.beforeEach(async () => {
    await cleanSessions()
    await cleanCampaigns()
    await cleanSystems()
    await cleanAuth()
    await createTestUser()
  })

  test.afterAll(async () => {
    await cleanSessions()
    await cleanCampaigns()
    await cleanSystems()
    await cleanAuth()
  })

  test('should display empty state when no sessions exist', async ({
    page,
  }) => {
    const { campaign } = await setupCampaign()

    await loginAndGoToSessions(page, campaign.id)

    await expect(
      page.getByRole('heading', { name: /no sessions yet/i }),
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: /create your first session/i }),
    ).toBeVisible()
    await expect(page.getByRole('article')).toHaveCount(0)
  })

  test('should display session cards when sessions exist', async ({ page }) => {
    const { campaign } = await setupCampaign()
    await seedSession({
      campaignId: campaign.id,
      title: 'The Beginning',
      sessionNumber: 1,
      status: 'completed',
    })
    await seedSession({
      campaignId: campaign.id,
      title: 'The Plot Thickens',
      sessionNumber: 2,
      status: 'planned',
    })

    await loginAndGoToSessions(page, campaign.id)

    await expect(page.getByRole('article')).toHaveCount(2)
    await expect(
      page.getByRole('heading', { name: 'The Beginning' }),
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'The Plot Thickens' }),
    ).toBeVisible()
  })

  test('should sort sessions by session number descending', async ({
    page,
  }) => {
    const { campaign } = await setupCampaign()
    await seedSession({
      campaignId: campaign.id,
      title: 'Session Alpha',
      sessionNumber: 1,
    })
    await seedSession({
      campaignId: campaign.id,
      title: 'Session Beta',
      sessionNumber: 2,
    })
    await seedSession({
      campaignId: campaign.id,
      title: 'Session Gamma',
      sessionNumber: 3,
    })

    await loginAndGoToSessions(page, campaign.id)

    const articles = page.getByRole('article')
    await expect(articles).toHaveCount(3)

    // First card should be Session 3, last should be Session 1
    await expect(articles.nth(0)).toContainText('Session 3')
    await expect(articles.nth(0)).toContainText('Session Gamma')
    await expect(articles.nth(1)).toContainText('Session 2')
    await expect(articles.nth(2)).toContainText('Session 1')
  })

  test('should display correct status badges', async ({ page }) => {
    const { campaign } = await setupCampaign()
    await seedSession({
      campaignId: campaign.id,
      title: 'Done Session',
      sessionNumber: 1,
      status: 'completed',
    })
    await seedSession({
      campaignId: campaign.id,
      title: 'Upcoming Session',
      sessionNumber: 2,
      status: 'planned',
    })

    await loginAndGoToSessions(page, campaign.id)

    const completedCard = page
      .getByRole('article')
      .filter({ hasText: 'Done Session' })
    const plannedCard = page
      .getByRole('article')
      .filter({ hasText: 'Upcoming Session' })

    await expect(completedCard.getByText('completed')).toBeVisible()
    await expect(plannedCard.getByText('planned')).toBeVisible()
  })

  test('should display session date when set', async ({ page }) => {
    const { campaign } = await setupCampaign()
    await seedSession({
      campaignId: campaign.id,
      title: 'Dated Session',
      sessionNumber: 1,
      sessionDate: '2026-03-15',
    })

    await loginAndGoToSessions(page, campaign.id)

    await expect(page.getByText('Mar 15, 2026')).toBeVisible()
  })

  test('should display "No date set" when session has no date', async ({
    page,
  }) => {
    const { campaign } = await setupCampaign()
    await seedSession({
      campaignId: campaign.id,
      title: 'Undated Session',
      sessionNumber: 1,
    })

    await loginAndGoToSessions(page, campaign.id)

    await expect(page.getByText('No date set')).toBeVisible()
  })

  test('should only show sessions for the current campaign', async ({
    page,
  }) => {
    const { campaign } = await setupCampaign()
    const systemData = buildSystem({ name: 'PF2e', slug: 'pf2e' })
    const system2 = await seedSystem(systemData.name, systemData.slug)
    const otherCampaign = await seedCampaign(
      buildCampaign({ title: 'Other Campaign', systemId: system2.id }),
    )

    await seedSession({
      campaignId: campaign.id,
      title: 'My Session',
      sessionNumber: 1,
    })
    await seedSession({
      campaignId: otherCampaign.id,
      title: 'Other Session',
      sessionNumber: 1,
    })

    await loginAndGoToSessions(page, campaign.id)

    await expect(page.getByRole('article')).toHaveCount(1)
    await expect(
      page.getByRole('heading', { name: 'My Session' }),
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'Other Session' }),
    ).not.toBeVisible()
  })
})

test.describe('Create Session', () => {
  test.beforeEach(async () => {
    await cleanSessions()
    await cleanCampaigns()
    await cleanSystems()
    await cleanAuth()
    await createTestUser()
  })

  test.afterAll(async () => {
    await cleanSessions()
    await cleanCampaigns()
    await cleanSystems()
    await cleanAuth()
  })

  test('should create a session and show it in the list', async ({ page }) => {
    const { campaign } = await setupCampaign()

    await loginAndGoToSessions(page, campaign.id)

    await page.getByRole('button', { name: /new session/i }).click()
    await expect(
      page.getByRole('heading', { name: /new session/i }),
    ).toBeVisible()

    await page.getByLabel('Title').fill('The Dark Forest')
    await page.getByLabel('Session Number').fill('1')
    await page.getByLabel('Session Date').fill('2026-04-01')

    await page.getByRole('button', { name: /create session/i }).click()

    await expect(
      page.getByRole('heading', { name: 'The Dark Forest' }),
    ).toBeVisible()
    await expect(page.getByText('Session 1')).toBeVisible()
    await expect(page.getByText('Apr 1, 2026')).toBeVisible()
    await expect(page.getByText('planned')).toBeVisible()
  })

  test('should replace empty state with session card when first session is created', async ({
    page,
  }) => {
    const { campaign } = await setupCampaign()

    await loginAndGoToSessions(page, campaign.id)
    await expect(
      page.getByRole('heading', { name: /no sessions yet/i }),
    ).toBeVisible()

    await page.getByRole('button', { name: /new session/i }).click()
    await page.getByLabel('Title').fill('Session One')
    await page.getByLabel('Session Number').fill('1')
    await page.getByRole('button', { name: /create session/i }).click()

    await expect(
      page.getByRole('heading', { name: /no sessions yet/i }),
    ).not.toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'Session One' }),
    ).toBeVisible()
  })

  test('should show validation error when title is empty', async ({ page }) => {
    const { campaign } = await setupCampaign()

    await loginAndGoToSessions(page, campaign.id)

    await page.getByRole('button', { name: /new session/i }).click()
    await page.getByLabel('Title').fill('something')
    await page.getByLabel('Title').clear()
    await page.getByLabel('Session Number').click()

    await expect(page.getByText(/title is required/i)).toBeVisible()
  })

  test('should dismiss dialog without creating when Escape is pressed', async ({
    page,
  }) => {
    const { campaign } = await setupCampaign()

    await loginAndGoToSessions(page, campaign.id)

    await page.getByRole('button', { name: /new session/i }).click()
    await expect(
      page.getByRole('heading', { name: /new session/i }),
    ).toBeVisible()

    await page.keyboard.press('Escape')

    await expect(
      page.getByRole('heading', { name: /new session/i }),
    ).not.toBeVisible()
    await expect(
      page.getByRole('heading', { name: /no sessions yet/i }),
    ).toBeVisible()
  })
})
