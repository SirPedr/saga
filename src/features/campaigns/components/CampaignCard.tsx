import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '#/components/ui/alert-dialog'
import { Button } from '#/components/ui/button'
import { deleteCampaign } from '#/features/campaigns/server/index'
import type { Campaign } from '../db/schema'

type CampaignWithSystem = Campaign & { systemName: string }

export function CampaignCard({ campaign }: { campaign: CampaignWithSystem }) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const queryClient = useQueryClient()

  const formattedDate = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(campaign.createdAt))

  function handleDeleteClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setDialogOpen(true)
  }

  async function handleConfirmDelete() {
    setIsDeleting(true)
    try {
      await deleteCampaign({ data: { id: campaign.id } })
      await queryClient.invalidateQueries({ queryKey: ['campaigns'] })
      setDialogOpen(false)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <Link
        to="/campaigns/$campaignId"
        params={{ campaignId: campaign.id }}
        className="group block"
      >
        <article className="relative flex h-full flex-col gap-3 rounded-lg border border-border bg-card p-5 shadow-[0_2px_8px_rgba(0,0,0,0.4)] transition-all duration-200">
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label="Delete campaign"
            onClick={handleDeleteClick}
            disabled={isDeleting}
            className="absolute right-3 top-3 text-destructive opacity-40 transition-opacity hover:opacity-100 focus-visible:opacity-100"
          >
            <Trash2 size={14} />
          </Button>

          <div className="flex items-start justify-between gap-3 pr-6">
            <h2 className="font-display text-lg font-semibold leading-snug text-foreground transition-colors">
              {campaign.title}
            </h2>
            <span className="system-badge shrink-0 rounded-full px-2 py-0.5 text-xs font-bold uppercase tracking-widest">
              {campaign.systemName}
            </span>
          </div>

          {campaign.description && (
            <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
              {campaign.description}
            </p>
          )}

          <p className="mt-auto font-sans text-xs text-(--ink-faint)">
            Created {formattedDate}
          </p>
        </article>
      </Link>

      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent className="bg-popover border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-foreground">
              Are you sure?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Delete &ldquo;{campaign.title}&rdquo;? This action cannot be
              undone. All sessions, NPCs, and world events associated with this
              campaign will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting\u2026' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
