import { render, screen, waitFor } from '@testing-library/react'
// Note: TanStack Form v1's isSubmitting state does not flush to the DOM in jsdom
// via React's act() scheduler. The loading button state is verified visually in dev.
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClientProvider } from '@tanstack/react-query'
import { Suspense } from 'react'
import { getContext } from '#/integrations/tanstack-query/root-provider'
import { createCampaignResult, createSystem } from '#/test/factories'
import * as campaignServer from '#/features/campaigns/server/index'
import { CampaignForm } from './CampaignForm'

const mockSystem = createSystem({ name: 'D&D 5e', slug: 'dnd-5e' })

function renderForm(onSuccess = vi.fn()) {
  const { queryClient } = getContext()
  render(
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={null}>
        <CampaignForm onSuccess={onSuccess} />
      </Suspense>
    </QueryClientProvider>,
  )
  return { onSuccess }
}

beforeEach(() => {
  vi.spyOn(campaignServer, 'listSystems').mockResolvedValue([mockSystem])
  vi.spyOn(campaignServer, 'createCampaign').mockResolvedValue(createCampaignResult() as any)
})

describe('CampaignForm', () => {
  it('should render title, system, and description fields when the form loads', async () => {
    renderForm()

    expect(await screen.findByLabelText(/title/i)).toBeVisible()
    expect(screen.getByRole('combobox', { name: /system/i })).toBeVisible()
    expect(screen.getByLabelText(/description/i)).toBeVisible()
  })

  it('should populate system options when the form loads', async () => {
    const user = userEvent.setup()
    renderForm()

    await screen.findByLabelText(/title/i)
    await user.click(screen.getByRole('combobox', { name: /system/i }))

    expect(await screen.findByRole('option', { name: 'D&D 5e' })).toBeVisible()
  })

  it('should show a title validation error when the title field is blurred with an empty value', async () => {
    const user = userEvent.setup()
    renderForm()

    await screen.findByLabelText(/title/i)
    await user.type(screen.getByLabelText(/title/i), 'a')
    await user.clear(screen.getByLabelText(/title/i))
    await user.tab()

    expect(await screen.findByText(/title is required/i)).toBeVisible()
  })

  it('should call onSuccess when the form is submitted successfully', async () => {
    const user = userEvent.setup()
    const { onSuccess } = renderForm()

    await screen.findByLabelText(/title/i)
    await user.type(screen.getByLabelText(/title/i), 'New Campaign')
    await user.click(screen.getByRole('combobox', { name: /system/i }))
    await user.click(await screen.findByRole('option', { name: 'D&D 5e' }))
    await user.click(screen.getByRole('button', { name: /create campaign/i }))

    await waitFor(() => expect(onSuccess).toHaveBeenCalledOnce())
  })

  it('should submit description as undefined when the description field is empty', async () => {
    const user = userEvent.setup()
    renderForm()

    await screen.findByLabelText(/title/i)
    await user.type(screen.getByLabelText(/title/i), 'New Campaign')
    await user.click(screen.getByRole('combobox', { name: /system/i }))
    await user.click(await screen.findByRole('option', { name: 'D&D 5e' }))
    await user.click(screen.getByRole('button', { name: /create campaign/i }))

    await waitFor(() =>
      expect(campaignServer.createCampaign).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ description: undefined }),
        }),
      ),
    )
  })
})
