import { createFileRoute } from '@tanstack/react-router'
import { CampaignListPage } from '#/features/campaigns/components/CampaignListPage'

export const Route = createFileRoute('/campaigns/')({
  component: CampaignListPage,
})
