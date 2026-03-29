import { useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { useQuery, useQueryClient } from '@tanstack/react-query'
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
import { updateNpc } from '../server/index'
import { npcTemplateQueryOptions } from '../server/queries'
import type { NpcWithAttributes } from '../db/queries'

const staticFieldSchema = z.object({
  name: z.string().min(1).max(100),
  portraitUrl: z.string(),
})

interface EditNpcFormProps {
  npc: NpcWithAttributes
  campaignId: string
  onSuccess: () => void
}

export function EditNpcForm({ npc, campaignId, onSuccess }: EditNpcFormProps) {
  const queryClient = useQueryClient()
  const { data: template } = useQuery(npcTemplateQueryOptions(campaignId))
  const [attributes, setAttributes] = useState<Record<string, string>>(
    npc.attributes,
  )
  const [touchedAttributes, setTouchedAttributes] = useState<Set<string>>(
    new Set(),
  )

  const form = useForm({
    defaultValues: {
      name: npc.name,
      portraitUrl: npc.portraitUrl ?? '',
    },
    validators: { onChange: staticFieldSchema },
    onSubmit: async ({ value }) => {
      await updateNpc({
        data: {
          id: npc.id,
          name: value.name,
          portraitUrl: value.portraitUrl || undefined,
          attributes,
        },
      })
      await queryClient.invalidateQueries({ queryKey: ['npcs', campaignId] })
      onSuccess()
    },
  })

  const touchAttribute = (key: string) => {
    setTouchedAttributes((prev) => new Set(prev).add(key))
  }

  const setAttributeValue = (key: string, value: string) => {
    setAttributes((prev) => ({ ...prev, [key]: value }))
  }

  const getAttributeError = (key: string, required: boolean) => {
    const value = attributes[key] as string | undefined
    if (touchedAttributes.has(key) && required && !value?.trim()) {
      return 'This field is required'
    }
    return null
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        form.handleSubmit()
      }}
      className="flex flex-col gap-5"
    >
      <form.Field name="name">
        {(field) => {
          const errorId = `${field.name}-error`
          const hasError =
            field.state.meta.isTouched && field.state.meta.errors.length > 0
          return (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={field.name} className="text-foreground">
                Name
              </Label>
              <Input
                id={field.name}
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
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

      <form.Field name="portraitUrl">
        {(field) => (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={field.name} className="text-foreground">
              Portrait URL{' '}
              <span className="text-(--silver-faint)">(optional)</span>
            </Label>
            <Input
              id={field.name}
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              placeholder="https://example.com/portrait.jpg"
              className="bg-popover border-border text-foreground"
            />
          </div>
        )}
      </form.Field>

      {(template?.fields ?? []).length > 0 && (
        <div className="flex flex-col gap-5">
          <div className="border-t border-border pt-2">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Attributes
            </p>
          </div>
          {(template?.fields ?? []).map((templateField) => {
            const error = getAttributeError(
              templateField.key,
              templateField.required,
            )
            const errorId = `attr-${templateField.key}-error`
            const inputId = `attr-${templateField.key}`

            return (
              <div key={templateField.key} className="flex flex-col gap-1.5">
                <Label htmlFor={inputId} className="text-foreground">
                  {templateField.label}
                  {!templateField.required && (
                    <span className="text-(--silver-faint)"> (optional)</span>
                  )}
                </Label>

                {templateField.type === 'select' ? (
                  <Select
                    value={attributes[templateField.key] ?? ''}
                    onValueChange={(val) => {
                      setAttributeValue(templateField.key, val)
                      touchAttribute(templateField.key)
                    }}
                  >
                    <SelectTrigger
                      id={inputId}
                      className="bg-popover border-border text-foreground data-placeholder:text-(--silver-faint)"
                      aria-invalid={!!error}
                      aria-errormessage={error ? errorId : undefined}
                    >
                      <SelectValue
                        placeholder={`Select ${templateField.label}`}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {templateField.options.map((opt) => (
                        <SelectItem key={opt} value={opt}>
                          {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id={inputId}
                    type={templateField.type === 'number' ? 'number' : 'text'}
                    value={attributes[templateField.key] ?? ''}
                    onChange={(e) =>
                      setAttributeValue(templateField.key, e.target.value)
                    }
                    onBlur={() => touchAttribute(templateField.key)}
                    className="bg-popover border-border text-foreground"
                    aria-invalid={!!error}
                    aria-errormessage={error ? errorId : undefined}
                  />
                )}

                {error && (
                  <p
                    id={errorId}
                    role="alert"
                    className="text-sm text-destructive"
                  >
                    {error}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}

      <Button
        type="submit"
        disabled={form.state.isSubmitting}
        className="mt-1 self-end font-bold"
      >
        {form.state.isSubmitting ? 'Saving…' : 'Save'}
      </Button>
    </form>
  )
}
