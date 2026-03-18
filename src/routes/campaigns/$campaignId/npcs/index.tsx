import { createFileRoute } from '@tanstack/react-router'
import { NpcListPage } from '#/features/npcs/components/NpcListPage'
import {
  npcListQueryOptions,
  npcTemplateQueryOptions,
} from '#/features/npcs/server/queries'

export const Route = createFileRoute('/campaigns/$campaignId/npcs/')({
  loader: ({ context: { queryClient }, params }) =>
    Promise.all([
      queryClient.ensureQueryData(npcTemplateQueryOptions(params.campaignId)),
      queryClient.ensureQueryData(npcListQueryOptions(params.campaignId)),
    ]),
  component: NpcListPage,
})
