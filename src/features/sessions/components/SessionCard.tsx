import type { Session } from '../db/schema'

const statusStyles = {
  planned: 'bg-muted text-muted-foreground',
  completed: 'bg-[rgba(78,120,64,0.15)] text-[#4e7840]',
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
    <article className="flex h-full flex-col gap-3 border border-border bg-card p-5 shadow-[0_2px_8px_rgba(0,0,0,0.4)]">
      <div className="flex items-start justify-between gap-3">
        <span className="text-xs font-bold uppercase tracking-widest text-(--ink-faint)">
          Session {session.sessionNumber}
        </span>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold uppercase tracking-widest ${statusStyles[session.status]}`}
          aria-label={`Status: ${session.status}`}
        >
          {session.status}
        </span>
      </div>

      <h3 className="font-display text-lg font-semibold text-foreground">
        {session.title}
      </h3>

      <p className="mt-auto font-sans text-xs text-(--ink-faint)">
        {formattedDate ?? 'No date set'}
      </p>
    </article>
  )
}
