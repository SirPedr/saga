import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { campaignListQueryOptions } from '#/features/campaigns/server/queries'

export const Route = createFileRoute('/campaigns')({
  beforeLoad: ({ context }) => {
    if (!context.session) {
      throw redirect({ to: '/login' })
    }
  },
  loader: ({ context: { queryClient } }) =>
    queryClient.ensureQueryData(campaignListQueryOptions()),
  component: () => <Outlet />,
})
