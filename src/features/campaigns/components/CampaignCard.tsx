import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '#/components/ui/alert-dialog'
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
        <article
          className="relative flex h-full flex-col gap-3 rounded-lg border p-5 transition-all duration-200"
          style={{
            background: 'var(--vellum-3)',
            borderColor: 'var(--line)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
          }}
        >
          <button
            type="button"
            aria-label="Delete campaign"
            onClick={handleDeleteClick}
            disabled={isDeleting}
            className="absolute right-3 top-3 rounded p-1 opacity-40 transition-opacity hover:opacity-100 focus-visible:opacity-100"
            style={{ color: 'var(--crimson)' }}
          >
            <Trash2 size={14} />
          </button>

          <div className="flex items-start justify-between gap-3 pr-6">
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

      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent
          style={{
            background: 'var(--vellum-2)',
            borderColor: 'var(--line)',
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle
              style={{ fontFamily: 'Fraunces, serif', color: 'var(--ink)' }}
            >
              Are you sure?
            </AlertDialogTitle>
            <AlertDialogDescription style={{ color: 'var(--ink-soft)' }}>
              Delete &ldquo;{campaign.title}&rdquo;? This action cannot be
              undone. All sessions, NPCs, and world events associated with this
              campaign will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              style={{ borderColor: 'var(--line)', color: 'var(--ink)' }}
            >
              Cancel
            </AlertDialogCancel>
            <button
              type="button"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium text-white transition-colors disabled:pointer-events-none disabled:opacity-50"
              style={{ background: 'var(--crimson)' }}
            >
              {isDeleting ? 'Deleting…' : 'Delete'}
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
