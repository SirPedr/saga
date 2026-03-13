import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { CampaignCard } from './CampaignCard'
import { CampaignForm } from './CampaignForm'
import { campaignListQueryOptions } from '../server/queries'

export function CampaignListPage() {
  const [open, setOpen] = useState(false)
  const { data: campaigns = [] } = useQuery(campaignListQueryOptions())

  return (
    <section
      aria-labelledby="campaigns-heading"
      className="mx-auto max-w-6xl px-6 py-10"
    >
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1
            id="campaigns-heading"
            className="font-display text-3xl font-semibold text-foreground"
          >
            Campaigns
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your ongoing and archived campaigns
          </p>
        </div>

        <Button onClick={() => setOpen(true)} className="font-bold">
          New Campaign
        </Button>
      </div>

      {campaigns.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-24 text-center">
          <h2 className="font-display text-2xl font-semibold text-foreground">
            No campaigns yet
          </h2>
          <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
            Every great adventure starts somewhere. Create your first campaign
            and begin building your world.
          </p>
          <Button onClick={() => setOpen(true)} className="font-bold">
            Create your first campaign
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((campaign) => (
            <CampaignCard key={campaign.id} campaign={campaign} />
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-popover border-border">
          <DialogHeader>
            <DialogTitle className="font-display text-foreground">
              New Campaign
            </DialogTitle>
          </DialogHeader>
          <CampaignForm onSuccess={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </section>
  )
}
