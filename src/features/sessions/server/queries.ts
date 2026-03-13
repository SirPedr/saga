import { queryOptions } from '@tanstack/react-query'
import { listSessions, getSession } from './index'

export const sessionListQueryOptions = (campaignId: string) =>
  queryOptions({
    queryKey: ['sessions', campaignId],
    queryFn: () => listSessions({ data: { campaignId } }),
  })

export const sessionQueryOptions = (sessionId: string) =>
  queryOptions({
    queryKey: ['sessions', 'detail', sessionId],
    queryFn: () => getSession({ data: { id: sessionId } }),
  })
