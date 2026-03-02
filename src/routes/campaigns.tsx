import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/campaigns')({
  component: CampaignsPage,
})

function CampaignsPage() {
  return <main className="p-8">Campaigns</main>
}
