import { queryOptions } from '@tanstack/react-query'
import { getCampaign, listCampaigns, listSystems } from './index'

export const campaignListQueryOptions = () =>
  queryOptions({
    queryKey: ['campaigns'],
    queryFn: () => listCampaigns(),
  })

export const campaignQueryOptions = (campaignId: string) =>
  queryOptions({
    queryKey: ['campaigns', campaignId],
    queryFn: () => getCampaign({ data: { id: campaignId } }),
  })

export const systemListQueryOptions = () =>
  queryOptions({
    queryKey: ['systems'],
    queryFn: () => listSystems(),
  })
