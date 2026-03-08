import { screen, within } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderWithRouter } from '#/test/utils'
import { createCampaign, createSessionResponse } from '#/test/factories'
import * as authServer from '#/features/auth/server'
import * as campaignServer from '#/features/campaigns/server/index'

const createdAt = new Date('2024-01-15T12:00:00.000Z')
const expectedDate = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
}).format(createdAt)

const campaignWithDescription = createCampaign({
  title: 'Lost Mines of Phandelver',
  systemName: 'D&D 5e',
  description: 'A classic starter adventure.',
  createdAt,
  updatedAt: createdAt,
})

const campaignWithoutDescription = createCampaign({
  title: "Storm King's Thunder",
  systemName: 'Pathfinder 2e',
  description: null,
})

beforeEach(() => {
  vi.spyOn(authServer, 'getSession').mockResolvedValue(createSessionResponse() as any)
  vi.spyOn(campaignServer, 'listCampaigns').mockResolvedValue([
    campaignWithDescription,
    campaignWithoutDescription,
  ])
})

describe('CampaignCard', () => {
  it('should render the campaign title when campaigns are loaded', async () => {
    renderWithRouter({ initialPath: '/campaigns' })

    expect(
      await screen.findByRole('heading', {
        name: 'Lost Mines of Phandelver',
        level: 2,
      }),
    ).toBeVisible()
  })

  it('should render the system name badge when campaigns are loaded', async () => {
    renderWithRouter({ initialPath: '/campaigns' })

    await screen.findByRole('heading', { name: 'Lost Mines of Phandelver', level: 2 })
    expect(screen.getByText('D&D 5e')).toBeVisible()
  })

  it('should link to the campaign detail page when a card is rendered', async () => {
    renderWithRouter({ initialPath: '/campaigns' })

    const link = await screen.findByRole('link', { name: /Lost Mines of Phandelver/i })
    expect(link).toHaveAttribute('href', `/campaigns/${campaignWithDescription.id}`)
  })

  it('should render the formatted creation date when campaigns are loaded', async () => {
    renderWithRouter({ initialPath: '/campaigns' })

    expect(await screen.findByText(`Created ${expectedDate}`)).toBeVisible()
  })

  it('should render the description when it is provided', async () => {
    renderWithRouter({ initialPath: '/campaigns' })

    expect(await screen.findByText('A classic starter adventure.')).toBeVisible()
  })

  it('should not render a description when it is null', async () => {
    renderWithRouter({ initialPath: '/campaigns' })

    const thunderLink = await screen.findByRole('link', { name: /Storm King/i })
    expect(
      within(thunderLink).queryByText('A classic starter adventure.'),
    ).not.toBeInTheDocument()
    expect(within(thunderLink).getByText(/^Created /)).toBeVisible()
  })
})
