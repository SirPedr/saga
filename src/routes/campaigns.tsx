import { createFileRoute, redirect } from '@tanstack/react-router'
import { CampaignListPage } from '#/features/campaigns/components/CampaignListPage'
import { campaignListQueryOptions } from '#/features/campaigns/server/queries'

export const Route = createFileRoute('/campaigns')({
  beforeLoad: ({ context }) => {
    if (!context.session) {
      throw redirect({ to: '/login' })
    }
  },
  loader: ({ context: { queryClient } }) =>
    queryClient.ensureQueryData(campaignListQueryOptions()),
  component: CampaignListPage,
})
