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
    <div className="p-8 text-center" style={{ color: 'var(--ink-soft)' }}>
      <h2
        className="text-2xl font-semibold"
        style={{ fontFamily: 'Fraunces, serif', color: 'var(--ink)' }}
      >
        Campaign not found
      </h2>
      <p className="mt-2">
        This campaign doesn&apos;t exist or has been deleted.
      </p>
    </div>
  ),
})
