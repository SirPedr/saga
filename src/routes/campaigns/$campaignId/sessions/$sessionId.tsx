import { createFileRoute, notFound } from '@tanstack/react-router'
import { SessionDetailPage } from '#/features/sessions/components/SessionDetailPage'
import { sessionQueryOptions } from '#/features/sessions/server/queries'

export const Route = createFileRoute(
  '/campaigns/$campaignId/sessions/$sessionId',
)({
  loader: async ({ context: { queryClient }, params }) => {
    const session = await queryClient.ensureQueryData(
      sessionQueryOptions(params.sessionId),
    )
    if (!session) throw notFound()
    return session
  },
  component: SessionDetailPage,
  notFoundComponent: () => (
    <div className="flex flex-col items-center gap-2 py-16 text-center">
      <h2 className="font-display text-2xl font-semibold text-foreground">
        Session not found
      </h2>
      <p className="text-sm text-muted-foreground">
        This session doesn&apos;t exist or has been deleted.
      </p>
    </div>
  ),
})
