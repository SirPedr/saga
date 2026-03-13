import { createFileRoute, notFound } from '@tanstack/react-router'
import { campaignQueryOptions } from '#/features/campaigns/server/queries'
import { CampaignDetailLayout } from '#/features/campaigns/components/CampaignDetailLayout'

export const Route = createFileRoute('/campaigns/$campaignId')({
  loader: async ({ context: { queryClient }, params }) => {
    const campaign = await queryClient.ensureQueryData(
      campaignQueryOptions(params.campaignId),
    )
    if (!campaign) throw notFound()
    return campaign
  },
  component: CampaignDetailLayout,
  notFoundComponent: () => (
    <div className="p-8 text-center text-muted-foreground">
      <h2 className="font-display text-2xl font-semibold text-foreground">
        Campaign not found
      </h2>
      <p className="mt-2">
        This campaign doesn&apos;t exist or has been deleted.
      </p>
    </div>
  ),
})
