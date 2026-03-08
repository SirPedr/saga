import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/campaigns/$campaignId')({
  beforeLoad: ({ context }) => {
    if (!context.session) {
      throw redirect({ to: '/login' })
    }
  },
  component: CampaignDetailPage,
})

function CampaignDetailPage() {
  const { campaignId } = Route.useParams()
  return <main className="p-8">Campaign {campaignId}</main>
}
