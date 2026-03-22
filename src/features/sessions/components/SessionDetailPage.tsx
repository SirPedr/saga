import { useRef, useState, useCallback } from 'react'
import { Link, useParams } from '@tanstack/react-router'
import { useSuspenseQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Users, MessageSquare, FileText } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs'
import { RichTextEditor } from '#/shared/components/RichTextEditor'
import { sessionQueryOptions } from '../server/queries'
import { updateSession } from '../server/index'

const statusStyles = {
  planned: 'bg-muted text-muted-foreground',
  completed: 'bg-[rgba(78,120,64,0.15)] text-[#4e7840]',
} as const

function useAutoSaveEditor(
  sessionId: string,
  field: 'planningNotes' | 'outcomeNotes',
  initialValue: string | null,
) {
  const queryClient = useQueryClient()
  const lastSaved = useRef(initialValue ?? '')
  const [value, setValue] = useState(initialValue ?? '')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>(
    'idle',
  )

  const handleChange = useCallback((html: string) => {
    setValue(html)
  }, [])

  const handleBlur = useCallback(async () => {
    if (value === lastSaved.current) return
    setSaveStatus('saving')
    try {
      await updateSession({ data: { id: sessionId, [field]: value } })
      lastSaved.current = value
      setSaveStatus('saved')
      await queryClient.invalidateQueries({
        queryKey: ['sessions', 'detail', sessionId],
      })
    } catch {
      setSaveStatus('idle')
    }
  }, [value, sessionId, field, queryClient])

  return { value, saveStatus, handleChange, handleBlur }
}

function SaveIndicator({ status }: { status: 'idle' | 'saving' | 'saved' }) {
  if (status === 'idle') return null
  return (
    <span
      className="text-xs text-(--silver-faint) transition-opacity"
      aria-live="polite"
    >
      {status === 'saving' ? 'Saving\u2026' : 'Saved'}
    </span>
  )
}

function PlaceholderSection({
  title,
  description,
  icon: Icon,
}: {
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <Icon className="size-10 text-(--silver-faint)" />
      <h3 className="font-display text-lg font-semibold text-foreground">
        {title}
      </h3>
      <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
    </div>
  )
}

export function SessionDetailPage() {
  const { campaignId, sessionId } = useParams({
    from: '/campaigns/$campaignId/sessions/$sessionId',
  })
  const { data: session } = useSuspenseQuery(sessionQueryOptions(sessionId))

  const planning = useAutoSaveEditor(
    sessionId,
    'planningNotes',
    session!.planningNotes,
  )
  const outcome = useAutoSaveEditor(
    sessionId,
    'outcomeNotes',
    session!.outcomeNotes,
  )

  const formattedDate = session!.sessionDate
    ? new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }).format(new Date(session!.sessionDate + 'T00:00:00'))
    : null

  const isPlanned = session!.status === 'planned'

  return (
    <div className="flex flex-col gap-6">
      {/* Back link */}
      <Link
        to="/campaigns/$campaignId/sessions"
        params={{ campaignId }}
        className="inline-flex items-center gap-1.5 text-sm text-(--silver-faint) transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Sessions
      </Link>

      {/* Session header */}
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <span className="island-kicker">
            Session {session!.sessionNumber}
          </span>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold uppercase tracking-widest ${statusStyles[session!.status]}`}
            aria-label={`Status: ${session!.status}`}
          >
            {session!.status}
          </span>
        </div>
        <h1 className="font-display text-2xl font-semibold text-foreground sm:text-3xl">
          {session!.title}
        </h1>
        {formattedDate && (
          <p className="text-sm text-(--silver-faint)">{formattedDate}</p>
        )}
      </header>

      {/* Tabs */}
      <Tabs defaultValue="planning">
        <TabsList variant="line">
          <TabsTrigger value="planning">Planning</TabsTrigger>
          <TabsTrigger value="entities">Entities</TabsTrigger>
          <TabsTrigger value="ai-chat">AI Chat</TabsTrigger>
          <TabsTrigger value="debrief">Debrief</TabsTrigger>
        </TabsList>

        <TabsContent value="planning" className="flex flex-col gap-8 pt-6">
          {/* Planning Notes */}
          <section aria-labelledby="planning-notes-heading">
            <div className="mb-2 flex items-center justify-between">
              <h2 id="planning-notes-heading" className="island-kicker">
                Planning Notes
              </h2>
              <SaveIndicator status={planning.saveStatus} />
            </div>
            <RichTextEditor
              value={planning.value}
              onChange={planning.handleChange}
              onBlur={planning.handleBlur}
              placeholder="Write your session planning notes here\u2026"
            />
          </section>

          {/* Outcome Notes */}
          <section aria-labelledby="outcome-notes-heading">
            <div className="mb-2 flex items-center justify-between">
              <h2 id="outcome-notes-heading" className="island-kicker">
                Outcome Notes
              </h2>
              <SaveIndicator status={outcome.saveStatus} />
            </div>
            {isPlanned && (
              <p className="mb-2 text-sm text-(--silver-faint)">
                Outcome notes unlock after the session is marked as completed.
              </p>
            )}
            <RichTextEditor
              value={outcome.value}
              onChange={outcome.handleChange}
              onBlur={outcome.handleBlur}
              placeholder="Record what happened during the session\u2026"
              disabled={isPlanned}
            />
          </section>
        </TabsContent>

        <TabsContent value="entities">
          <PlaceholderSection
            title="Entities"
            description="Link NPCs, factions, and characters to this session. Coming soon."
            icon={Users}
          />
        </TabsContent>

        <TabsContent value="ai-chat">
          <PlaceholderSection
            title="AI Chat"
            description="Chat with your AI planning assistant about this session. Coming soon."
            icon={MessageSquare}
          />
        </TabsContent>

        <TabsContent value="debrief">
          <PlaceholderSection
            title="Debrief"
            description="Run a post-session analysis to generate world events and insights. Coming soon."
            icon={FileText}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
