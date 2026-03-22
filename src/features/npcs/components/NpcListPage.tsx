import { Suspense, useState } from 'react'
import { useParams } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import { cn } from '#/lib/utils'
import { npcListQueryOptions } from '../server/queries'
import { NpcTemplateEditor } from './NpcTemplateEditor'

export function NpcListPage() {
  const { campaignId } = useParams({ from: '/campaigns/$campaignId' })
  const [templateOpen, setTemplateOpen] = useState(false)
  const { data: npcs = [] } = useQuery(npcListQueryOptions(campaignId))

  return (
    <section aria-labelledby="npcs-heading">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2
            id="npcs-heading"
            className="font-display text-3xl font-semibold text-foreground"
          >
            NPCs
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Characters that inhabit your world
          </p>
        </div>
      </div>

      {/* Collapsible Template Editor */}
      <Card className="mb-8 border-border">
        <CardHeader
          className="cursor-pointer select-none"
          onClick={() => setTemplateOpen((v) => !v)}
          role="button"
          tabIndex={0}
          aria-expanded={templateOpen}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              setTemplateOpen((v) => !v)
            }
          }}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="font-display text-base">
              Template Fields
            </CardTitle>
            <ChevronDown
              className={cn(
                'size-4 text-muted-foreground transition-transform',
                templateOpen && 'rotate-180',
              )}
              aria-hidden="true"
            />
          </div>
          <CardDescription>
            Define custom attribute fields for NPCs in this campaign
          </CardDescription>
        </CardHeader>
        {templateOpen && (
          <CardContent>
            <Suspense
              fallback={
                <p className="py-4 text-sm text-muted-foreground">
                  Loading template…
                </p>
              }
            >
              <NpcTemplateEditor campaignId={campaignId} />
            </Suspense>
          </CardContent>
        )}
      </Card>

      {/* NPC list */}
      {npcs.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-24 text-center">
          <h3 className="font-display text-2xl font-semibold text-foreground">
            No NPCs yet
          </h3>
          <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
            NPCs you create for this campaign will appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {/* NPC cards — future issue */}
        </div>
      )}
    </section>
  )
}
