import { useState } from 'react'
import { useParams } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { SessionCard } from './SessionCard'
import { SessionForm } from './SessionForm'
import { sessionListQueryOptions } from '../server/queries'

export function SessionListPage() {
  const [open, setOpen] = useState(false)
  const { campaignId } = useParams({ from: '/campaigns/$campaignId' })
  const { data: sessions = [] } = useQuery(sessionListQueryOptions(campaignId))

  const sortedSessions = [...sessions].sort(
    (a, b) => b.sessionNumber - a.sessionNumber,
  )

  return (
    <section aria-labelledby="sessions-heading">
      <div className="mb-8 flex items-center justify-between">
        <h2
          id="sessions-heading"
          className="font-display text-2xl font-semibold text-foreground"
        >
          Sessions
        </h2>

        <Button onClick={() => setOpen(true)} className="font-bold">
          New Session
        </Button>
      </div>

      {sortedSessions.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-24 text-center">
          <h3 className="font-display text-2xl font-semibold text-foreground">
            No sessions yet
          </h3>
          <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
            Plan your first session and start tracking your campaign&apos;s
            story as it unfolds.
          </p>
          <Button onClick={() => setOpen(true)} className="font-bold">
            Create your first session
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {sortedSessions.map((session) => (
            <SessionCard key={session.id} session={session} />
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-popover border-border">
          <DialogHeader>
            <DialogTitle className="font-display text-foreground">
              New Session
            </DialogTitle>
          </DialogHeader>
          <SessionForm
            campaignId={campaignId}
            onSuccess={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </section>
  )
}
