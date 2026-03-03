import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/campaigns')({
  beforeLoad: ({ context }) => {
    if (!context.session) {
      throw redirect({ to: '/login' })
    }
  },
  component: CampaignsPage,
})

function CampaignsPage() {
  return <main className="p-8">Campaigns</main>
}
