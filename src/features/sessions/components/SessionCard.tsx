import { Link } from '@tanstack/react-router'
import type { Session } from '../db/schema'

const statusStyles = {
  planned: 'bg-(--chip-bg) text-(--silver-soft) border border-(--line)',
  completed:
    'bg-(--badge-system-bg) text-(--crimson) border border-(--badge-system-border)',
} as const

export function SessionCard({ session }: { session: Session }) {
  const formattedDate = session.sessionDate
    ? new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }).format(new Date(session.sessionDate + 'T00:00:00'))
    : null

  return (
    <Link
      to="/campaigns/$campaignId/sessions/$sessionId"
      params={{ campaignId: session.campaignId, sessionId: session.id }}
      className="group block"
    >
      <article className="feature-card flex h-full flex-col border border-(--line) p-5 shadow-sm transition-all duration-200">
        {/* Kicker row — tight grouping */}
        <div className="flex items-center justify-between gap-3">
          <span className="island-kicker">Session {session.sessionNumber}</span>
          <span
            className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${statusStyles[session.status]}`}
            aria-label={`Status: ${session.status}`}
          >
            {session.status}
          </span>
        </div>

        {/* Title — generous space above, the card's hero content */}
        <h3 className="mt-4 font-display text-xl font-semibold leading-snug text-foreground">
          {session.title}
        </h3>

        {/* Date — pushed to bottom with breathing room */}
        <p className="mt-auto pt-5 text-sm text-(--silver-soft)">
          {formattedDate ?? 'No date set'}
        </p>
      </article>
    </Link>
  )
}
