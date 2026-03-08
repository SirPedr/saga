import { queryOptions } from '@tanstack/react-query'
import { listCampaigns, listSystems } from './index'

export const campaignListQueryOptions = () =>
  queryOptions({
    queryKey: ['campaigns'],
    queryFn: () => listCampaigns(),
  })

export const systemListQueryOptions = () =>
  queryOptions({
    queryKey: ['systems'],
    queryFn: () => listSystems(),
  })
