import { Link, Outlet, useParams } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { campaignQueryOptions } from '../server/queries'

// These child routes will be created in future issues. The `as string` cast
// prevents TanStack Router's strict route-type registry from rejecting them
// before the corresponding route files exist.
const tabs: { label: string; to: string }[] = [
  { label: 'Sessions', to: '/campaigns/$campaignId/sessions' },
  { label: 'NPCs', to: '/campaigns/$campaignId/npcs' },
  { label: 'Factions', to: '/campaigns/$campaignId/factions' },
  { label: 'Characters', to: '/campaigns/$campaignId/characters' },
  { label: 'Graph', to: '/campaigns/$campaignId/graph' },
  { label: 'World Events', to: '/campaigns/$campaignId/world-events' },
  { label: 'Documents', to: '/campaigns/$campaignId/documents' },
]

export function CampaignDetailLayout() {
  const { campaignId } = useParams({
    from: '/campaigns/$campaignId',
  })
  const { data: campaign } = useSuspenseQuery(campaignQueryOptions(campaignId))

  return (
    <div className="flex flex-1 flex-col">
      <div className="border-b border-border bg-muted px-6 pb-0 pt-6">
        <div className="page-wrap flex flex-col gap-3">
          <div className="flex items-start justify-between gap-4">
            <h1 className="font-display text-2xl font-semibold leading-tight text-foreground sm:text-3xl">
              {campaign.title}
            </h1>
            <span className="system-badge mt-1 shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-widest">
              {campaign.systemName}
            </span>
          </div>

          {campaign.description && (
            <p
              data-testid="campaign-description"
              className="max-w-2xl text-sm leading-relaxed text-muted-foreground"
            >
              {campaign.description}
            </p>
          )}

          <nav className="-mb-px flex gap-1 overflow-x-auto pt-2">
            {tabs.map((tab) => (
              <Link
                key={tab.to}
                to={tab.to}
                params={{ campaignId }}
                className="whitespace-nowrap border-b-2 border-transparent px-3 py-2 text-xs font-bold uppercase tracking-widest text-(--ink-faint) transition-colors"
                activeProps={{
                  className:
                    'whitespace-nowrap border-b-2 border-primary px-3 py-2 text-xs font-bold uppercase tracking-widest text-primary transition-colors',
                }}
              >
                {tab.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      <div className="flex-1 px-6 py-6">
        <div className="page-wrap">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
