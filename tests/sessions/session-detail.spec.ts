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

async function loginAndGoToSessionDetail(
  page: import('@playwright/test').Page,
  campaignId: string,
  sessionId: string,
) {
  await login(page)
  await expect(page).toHaveURL(/\/campaigns/)
  await page.goto(`/campaigns/${campaignId}/sessions/${sessionId}`)
  await page.waitForURL(`**/campaigns/${campaignId}/sessions/${sessionId}`)
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

test.describe('Session Detail — Navigation & Display', () => {
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

  test('should navigate to session detail when clicking a session card', async ({
    page,
  }) => {
    const { campaign } = await setupCampaign()
    const session = await seedSession({
      campaignId: campaign.id,
      title: 'The Dark Forest',
      sessionNumber: 1,
    })

    await loginAndGoToSessions(page, campaign.id)

    await page
      .getByRole('article')
      .filter({ hasText: 'The Dark Forest' })
      .click()

    await expect(page).toHaveURL(
      new RegExp(`/campaigns/${campaign.id}/sessions/${session.id}`),
    )
    await expect(
      page.getByRole('heading', { name: 'The Dark Forest', level: 1 }),
    ).toBeVisible()
  })

  test('should display session metadata', async ({ page }) => {
    const { campaign } = await setupCampaign()
    const session = await seedSession({
      campaignId: campaign.id,
      title: 'Into the Mist',
      sessionNumber: 3,
      status: 'completed',
      sessionDate: '2026-04-15',
    })

    await loginAndGoToSessionDetail(page, campaign.id, session.id)

    await expect(page.getByText('Session 3')).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'Into the Mist', level: 1 }),
    ).toBeVisible()
    await expect(page.getByText('completed')).toBeVisible()
    await expect(page.getByText('Apr 15, 2026')).toBeVisible()
  })

  test('should show "Session not found" for invalid session ID', async ({
    page,
  }) => {
    const { campaign } = await setupCampaign()

    await login(page)
    await expect(page).toHaveURL(/\/campaigns/)
    await page.goto(
      `/campaigns/${campaign.id}/sessions/00000000-0000-0000-0000-000000000000`,
    )

    await expect(page.getByText('Session not found')).toBeVisible()
  })
})

test.describe('Session Detail — Planning Notes', () => {
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

  test('should display empty editor when no planning notes exist', async ({
    page,
  }) => {
    const { campaign } = await setupCampaign()
    const session = await seedSession({
      campaignId: campaign.id,
      title: 'Empty Notes Session',
      sessionNumber: 1,
    })

    await loginAndGoToSessionDetail(page, campaign.id, session.id)

    await expect(page.getByText('Planning Notes')).toBeVisible()
    // The editor should be visible (TipTap renders a contenteditable div)
    await expect(page.locator('[contenteditable="true"]').first()).toBeVisible()
  })

  test('should display existing planning notes', async ({ page }) => {
    const { campaign } = await setupCampaign()
    const session = await seedSession({
      campaignId: campaign.id,
      title: 'Pre-filled Session',
      sessionNumber: 1,
      planningNotes: '<p>Attack the goblin camp at dawn</p>',
    })

    await loginAndGoToSessionDetail(page, campaign.id, session.id)

    await expect(page.getByText('Attack the goblin camp at dawn')).toBeVisible()
  })

  test('should auto-save planning notes on blur', async ({ page }) => {
    const { campaign } = await setupCampaign()
    const session = await seedSession({
      campaignId: campaign.id,
      title: 'Auto-save Test',
      sessionNumber: 1,
    })

    await loginAndGoToSessionDetail(page, campaign.id, session.id)

    // Type in the planning notes editor (first contenteditable)
    const planningEditor = page.locator('[contenteditable="true"]').first()
    await planningEditor.click()
    await planningEditor.type('The party needs to cross the bridge')

    // Click outside to blur
    await page
      .getByRole('heading', { name: 'Auto-save Test', level: 1 })
      .click()

    // Wait for save indicator
    await expect(
      page.getByText('Saving\u2026').or(page.getByText('Saved')),
    ).toBeVisible()

    // Reload and verify persistence
    await page.reload()
    await expect(
      page.getByText('The party needs to cross the bridge'),
    ).toBeVisible()
  })
})

test.describe('Session Detail — Outcome Notes', () => {
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

  test('should disable outcome notes editor when status is "planned"', async ({
    page,
  }) => {
    const { campaign } = await setupCampaign()
    const session = await seedSession({
      campaignId: campaign.id,
      title: 'Planned Session',
      sessionNumber: 1,
      status: 'planned',
    })

    await loginAndGoToSessionDetail(page, campaign.id, session.id)

    await expect(
      page.getByText(
        'Outcome notes unlock after the session is marked as completed',
      ),
    ).toBeVisible()

    // The outcome editor should have contenteditable="false"
    const editors = page.locator('[contenteditable]')
    // Second editor is outcome notes
    await expect(editors.nth(1)).toHaveAttribute('contenteditable', 'false')
  })

  test('should enable outcome notes editor when status is "completed"', async ({
    page,
  }) => {
    const { campaign } = await setupCampaign()
    const session = await seedSession({
      campaignId: campaign.id,
      title: 'Completed Session',
      sessionNumber: 1,
      status: 'completed',
    })

    await loginAndGoToSessionDetail(page, campaign.id, session.id)

    // The outcome editor should be editable
    const editors = page.locator('[contenteditable="true"]')
    await expect(editors).toHaveCount(2)
  })

  test('should auto-save outcome notes on blur', async ({ page }) => {
    const { campaign } = await setupCampaign()
    const session = await seedSession({
      campaignId: campaign.id,
      title: 'Outcome Save Test',
      sessionNumber: 1,
      status: 'completed',
    })

    await loginAndGoToSessionDetail(page, campaign.id, session.id)

    // Type in the outcome notes editor (second contenteditable)
    const outcomeEditor = page.locator('[contenteditable="true"]').nth(1)
    await outcomeEditor.click()
    await outcomeEditor.type('The party defeated the goblins')

    // Click outside to blur
    await page
      .getByRole('heading', { name: 'Outcome Save Test', level: 1 })
      .click()

    // Wait for save
    await expect(
      page.getByText('Saving\u2026').or(page.getByText('Saved')),
    ).toBeVisible()

    // Reload and verify persistence
    await page.reload()
    await expect(page.getByText('The party defeated the goblins')).toBeVisible()
  })
})

test.describe('Session Detail — Tabs', () => {
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

  test('should show Planning tab as default active tab', async ({ page }) => {
    const { campaign } = await setupCampaign()
    const session = await seedSession({
      campaignId: campaign.id,
      title: 'Tabs Test',
      sessionNumber: 1,
    })

    await loginAndGoToSessionDetail(page, campaign.id, session.id)

    // Planning tab should be active
    const planningTab = page.getByRole('tab', { name: 'Planning' })
    await expect(planningTab).toHaveAttribute('data-state', 'active')

    // Section headings should be visible
    await expect(
      page.getByRole('heading', { name: 'Planning Notes' }),
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'Outcome Notes' }),
    ).toBeVisible()
  })

  test('should show placeholder content for Entities tab', async ({ page }) => {
    const { campaign } = await setupCampaign()
    const session = await seedSession({
      campaignId: campaign.id,
      title: 'Entities Tab Test',
      sessionNumber: 1,
    })

    await loginAndGoToSessionDetail(page, campaign.id, session.id)

    await page.getByRole('tab', { name: 'Entities' }).click()

    await expect(
      page.getByRole('heading', { name: 'Entities', exact: true }),
    ).toBeVisible()
    await expect(page.getByText('Coming soon')).toBeVisible()
  })

  test('should show placeholder content for AI Chat tab', async ({ page }) => {
    const { campaign } = await setupCampaign()
    const session = await seedSession({
      campaignId: campaign.id,
      title: 'AI Chat Tab Test',
      sessionNumber: 1,
    })

    await loginAndGoToSessionDetail(page, campaign.id, session.id)

    await page.getByRole('tab', { name: 'AI Chat', exact: true }).click()

    await expect(
      page.getByRole('heading', { name: 'AI Chat', exact: true }),
    ).toBeVisible()
    await expect(page.getByText('Coming soon')).toBeVisible()
  })

  test('should show placeholder content for Debrief tab', async ({ page }) => {
    const { campaign } = await setupCampaign()
    const session = await seedSession({
      campaignId: campaign.id,
      title: 'Debrief Tab Test',
      sessionNumber: 1,
    })

    await loginAndGoToSessionDetail(page, campaign.id, session.id)

    await page.getByRole('tab', { name: 'Debrief' }).click()

    await expect(
      page.getByRole('heading', { name: 'Debrief', exact: true }),
    ).toBeVisible()
    await expect(page.getByText('Coming soon')).toBeVisible()
  })
})

test.describe('Session Detail — Back Navigation', () => {
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

  test('should navigate back to sessions list', async ({ page }) => {
    const { campaign } = await setupCampaign()
    const session = await seedSession({
      campaignId: campaign.id,
      title: 'Back Nav Test',
      sessionNumber: 1,
    })

    await loginAndGoToSessionDetail(page, campaign.id, session.id)

    // Use the back link (second "Sessions" link, the one inside the page content)
    await page.getByRole('link', { name: 'Sessions' }).nth(1).click()

    await expect(page).toHaveURL(
      new RegExp(`/campaigns/${campaign.id}/sessions$`),
    )
  })
})
