import { useForm } from '@tanstack/react-form'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Textarea } from '#/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { createCampaign } from '../server/index'
import { systemListQueryOptions } from '../server/queries'

// Form schema keeps description as string (empty string = no description)
const campaignFormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100),
  systemId: z.uuid(),
  description: z.string(),
})

export function CampaignForm({ onSuccess }: { onSuccess: () => void }) {
  const queryClient = useQueryClient()
  const { data: systems = [] } = useQuery(systemListQueryOptions())

  const form = useForm({
    defaultValues: {
      title: '',
      systemId: '',
      description: '',
    },
    validators: { onChange: campaignFormSchema },
    onSubmit: async ({ value }) => {
      await createCampaign({
        data: {
          ...value,
          description: value.description || undefined,
        },
      })
      await queryClient.invalidateQueries({ queryKey: ['campaigns'] })
      onSuccess()
    },
  })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        form.handleSubmit()
      }}
      className="flex flex-col gap-5"
    >
      <form.Field name="title">
        {(field) => {
          const errorId = `${field.name}-error`
          const hasError =
            field.state.meta.isTouched && field.state.meta.errors.length > 0
          return (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={field.name} className="text-foreground">
                Title
              </Label>
              <Input
                id={field.name}
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                placeholder="The Lost Mines of Phandelver"
                className="bg-popover border-border text-foreground"
                aria-invalid={hasError}
                aria-errormessage={hasError ? errorId : undefined}
              />
              {hasError && (
                <p
                  id={errorId}
                  role="alert"
                  className="text-sm text-destructive"
                >
                  {field.state.meta.errors[0]?.message}
                </p>
              )}
            </div>
          )
        }}
      </form.Field>

      <form.Field name="systemId">
        {(field) => {
          const errorId = `${field.name}-error`
          const hasError =
            field.state.meta.isTouched && field.state.meta.errors.length > 0
          return (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={field.name} className="text-foreground">
                System
              </Label>
              <Select
                value={field.state.value}
                onValueChange={(val) => field.handleChange(val)}
              >
                <SelectTrigger
                  id={field.name}
                  className="bg-popover border-border text-foreground data-placeholder:text-(--ink-faint)"
                  aria-invalid={hasError}
                  aria-errormessage={hasError ? errorId : undefined}
                >
                  <SelectValue placeholder="Select a system" />
                </SelectTrigger>
                <SelectContent>
                  {systems.map((system) => (
                    <SelectItem key={system.id} value={system.id}>
                      {system.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {hasError && (
                <p
                  id={errorId}
                  role="alert"
                  className="text-sm text-destructive"
                >
                  {field.state.meta.errors[0]?.message}
                </p>
              )}
            </div>
          )
        }}
      </form.Field>

      <form.Field name="description">
        {(field) => (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={field.name} className="text-foreground">
              Description <span className="text-(--ink-faint)">(optional)</span>
            </Label>
            <Textarea
              id={field.name}
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              placeholder="A short description of your campaign\u2026"
              rows={3}
              className="bg-popover border-border text-foreground"
            />
          </div>
        )}
      </form.Field>

      <Button
        type="submit"
        disabled={form.state.isSubmitting}
        className="mt-1 self-end font-bold"
      >
        {form.state.isSubmitting ? 'Creating\u2026' : 'Create Campaign'}
      </Button>
    </form>
  )
}
