import { createFileRoute } from '@tanstack/react-router'
import { SessionListPage } from '#/features/sessions/components/SessionListPage'
import { sessionListQueryOptions } from '#/features/sessions/server/queries'

export const Route = createFileRoute('/campaigns/$campaignId/sessions/')({
  loader: ({ context: { queryClient }, params }) =>
    queryClient.ensureQueryData(sessionListQueryOptions(params.campaignId)),
  component: SessionListPage,
})
