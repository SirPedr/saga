import { Link } from '@tanstack/react-router'
import type { Campaign } from '../db/schema'

type CampaignWithSystem = Campaign & { systemName: string }

export function CampaignCard({ campaign }: { campaign: CampaignWithSystem }) {
  const formattedDate = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(campaign.createdAt))

  return (
    <Link
      to="/campaigns/$campaignId"
      params={{ campaignId: campaign.id }}
      className="group block"
    >
      <article
        className="relative flex h-full flex-col gap-3 rounded-lg border p-5 transition-all duration-200"
        style={{
          background: 'var(--vellum-3)',
          borderColor: 'var(--line)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <h2
            className="font-display text-lg font-semibold leading-snug transition-colors"
            style={{ color: 'var(--ink)', fontFamily: 'Fraunces, serif' }}
          >
            {campaign.title}
          </h2>
          <span
            className="shrink-0 rounded-full px-2 py-0.5 text-xs font-bold uppercase tracking-widest"
            style={{
              background: 'rgba(212,163,72,0.15)',
              color: 'var(--amber)',
              border: '1px solid rgba(212,163,72,0.3)',
            }}
          >
            {campaign.systemName}
          </span>
        </div>

        {campaign.description && (
          <p
            className="line-clamp-2 text-sm leading-relaxed"
            style={{ color: 'var(--ink-soft)' }}
          >
            {campaign.description}
          </p>
        )}

        <p
          className="mt-auto text-xs"
          style={{
            color: 'var(--ink-faint)',
            fontFamily: 'Manrope, sans-serif',
          }}
        >
          Created {formattedDate}
        </p>
      </article>
    </Link>
  )
}
