import { useForm } from '@tanstack/react-form'
import { useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { createSession } from '../server/index'
import { SessionCreateSchema } from '../schemas'

// Form schema: sessionDate always a string, status always required (no default)
const sessionFormSchema = SessionCreateSchema.omit({ campaignId: true }).extend(
  {
    sessionDate: z.string(),
    status: z.enum(['planned', 'completed']),
  },
)

export function SessionForm({
  campaignId,
  onSuccess,
}: {
  campaignId: string
  onSuccess: () => void
}) {
  const queryClient = useQueryClient()

  const form = useForm({
    defaultValues: {
      title: '',
      sessionNumber: 1,
      sessionDate: '',
      status: 'planned' as 'planned' | 'completed',
    },
    validators: { onChange: sessionFormSchema },
    onSubmit: async ({ value }) => {
      await createSession({
        data: {
          campaignId,
          title: value.title,
          sessionNumber: value.sessionNumber,
          sessionDate: value.sessionDate || undefined,
          status: value.status,
        },
      })
      await queryClient.invalidateQueries({
        queryKey: ['sessions', campaignId],
      })
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
                placeholder="The Siege of Whitestone"
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

      <form.Field name="sessionNumber">
        {(field) => {
          const errorId = `${field.name}-error`
          const hasError =
            field.state.meta.isTouched && field.state.meta.errors.length > 0
          return (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={field.name} className="text-foreground">
                Session Number
              </Label>
              <Input
                id={field.name}
                type="number"
                min={1}
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.valueAsNumber)}
                onBlur={field.handleBlur}
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

      <form.Field name="sessionDate">
        {(field) => (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={field.name} className="text-foreground">
              Session Date{' '}
              <span className="text-(--ink-faint)">(optional)</span>
            </Label>
            <Input
              id={field.name}
              type="date"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              className="bg-popover border-border text-foreground [&::-webkit-calendar-picker-indicator]:invert"
            />
          </div>
        )}
      </form.Field>

      <form.Field name="status">
        {(field) => (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={field.name} className="text-foreground">
              Status
            </Label>
            <Select
              value={field.state.value}
              onValueChange={(val) =>
                field.handleChange(val as 'planned' | 'completed')
              }
            >
              <SelectTrigger
                id={field.name}
                className="bg-popover border-border text-foreground"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="planned">Planned</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </form.Field>

      <Button
        type="submit"
        disabled={form.state.isSubmitting}
        className="mt-1 self-end font-bold"
      >
        {form.state.isSubmitting ? 'Creating\u2026' : 'Create Session'}
      </Button>
    </form>
  )
}
