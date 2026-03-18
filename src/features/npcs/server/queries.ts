import { queryOptions } from '@tanstack/react-query'
import { getTemplate, listNpcs } from './index'

export const npcTemplateQueryOptions = (campaignId: string) =>
  queryOptions({
    queryKey: ['npc-template', campaignId],
    queryFn: () => getTemplate({ data: { campaignId } }),
  })

export const npcListQueryOptions = (campaignId: string) =>
  queryOptions({
    queryKey: ['npcs', campaignId],
    queryFn: () => listNpcs({ data: { campaignId } }),
  })
