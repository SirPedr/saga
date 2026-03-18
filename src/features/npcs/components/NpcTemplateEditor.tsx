import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSuspenseQuery, useQueryClient } from '@tanstack/react-query'
import { Trash2, Plus } from 'lucide-react'
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
import { Toggle } from '#/components/ui/toggle'
import { TemplateFieldSchema } from '../schemas'
import { updateTemplate } from '../server/index'
import { npcTemplateQueryOptions } from '../server/queries'

type FieldType = 'text' | 'number' | 'select'

type EditorField = {
  _clientId: string
  key: string
  label: string
  type: FieldType
  required: boolean
  options?: string[]
}

function toEditorFields(
  fields: z.infer<typeof TemplateFieldSchema>[],
): EditorField[] {
  return fields.map((f) => ({
    _clientId: crypto.randomUUID(),
    key: f.key,
    label: f.label,
    type: f.type,
    required: f.required,
    options: f.type === 'select' ? f.options : undefined,
  }))
}

function stripClientIds(
  fields: EditorField[],
): z.infer<typeof TemplateFieldSchema>[] {
  return fields.map((f) => {
    const { _clientId, ...rest } = f
    if (rest.type === 'select') {
      return {
        key: rest.key,
        label: rest.label,
        type: rest.type,
        required: rest.required,
        options: rest.options ?? [],
      }
    }
    return {
      key: rest.key,
      label: rest.label,
      type: rest.type,
      required: rest.required,
    }
  })
}

const KEY_PATTERN = /^[a-z_]+$/

export function NpcTemplateEditor({ campaignId }: { campaignId: string }) {
  const queryClient = useQueryClient()
  const { data: template } = useSuspenseQuery(
    npcTemplateQueryOptions(campaignId),
  )

  const [fields, setFields] = useState<EditorField[]>(() =>
    toEditorFields(template?.fields ?? []),
  )
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Map<string, string[]>>(new Map())
  const [saveError, setSaveError] = useState<string | null>(null)

  // Track which keys are "saved" (existed in the last fetched template)
  const savedKeysRef = useRef<Set<string>>(
    new Set((template?.fields ?? []).map((f) => f.key)),
  )

  // Sync local state when template data changes (after save + invalidation)
  const templateFieldsJson = JSON.stringify(template?.fields ?? [])
  useEffect(() => {
    const parsed = JSON.parse(templateFieldsJson) as z.infer<
      typeof TemplateFieldSchema
    >[]
    setFields(toEditorFields(parsed))
    savedKeysRef.current = new Set(parsed.map((f) => f.key))
    setErrors(new Map())
    setSaveError(null)
  }, [templateFieldsJson])

  const updateField = useCallback(
    (clientId: string, patch: Partial<Omit<EditorField, '_clientId'>>) => {
      setFields((prev) =>
        prev.map((f) => {
          if (f._clientId !== clientId) return f
          const updated = { ...f, ...patch }
          // Clear options when switching away from select
          if (patch.type && patch.type !== 'select') {
            delete updated.options
          }
          // Initialize options when switching to select
          if (patch.type === 'select' && !updated.options) {
            updated.options = []
          }
          return updated
        }),
      )
      // Clear errors for this field when editing
      setErrors((prev) => {
        const next = new Map(prev)
        next.delete(clientId)
        return next
      })
    },
    [],
  )

  const addField = useCallback(() => {
    setFields((prev) => [
      ...prev,
      {
        _clientId: crypto.randomUUID(),
        key: '',
        label: '',
        type: 'text' as FieldType,
        required: false,
      },
    ])
  }, [])

  const removeField = useCallback((clientId: string) => {
    setFields((prev) => prev.filter((f) => f._clientId !== clientId))
    setErrors((prev) => {
      const next = new Map(prev)
      next.delete(clientId)
      return next
    })
  }, [])

  const isDirty = useMemo(() => {
    const currentJson = JSON.stringify(stripClientIds(fields))
    return currentJson !== templateFieldsJson
  }, [fields, templateFieldsJson])

  const handleSave = async () => {
    const newErrors = new Map<string, string[]>()

    // Check for duplicate keys
    const keyCounts = new Map<string, string[]>()
    for (const f of fields) {
      if (f.key) {
        const ids = keyCounts.get(f.key) ?? []
        ids.push(f._clientId)
        keyCounts.set(f.key, ids)
      }
    }
    for (const [, ids] of keyCounts) {
      if (ids.length > 1) {
        for (const id of ids) {
          const existing = newErrors.get(id) ?? []
          existing.push('Duplicate key')
          newErrors.set(id, existing)
        }
      }
    }

    // Validate each field with Zod
    const cleaned = stripClientIds(fields)
    const result = z.array(TemplateFieldSchema).safeParse(cleaned)

    if (!result.success) {
      for (const issue of result.error.issues) {
        const index = issue.path[0]
        if (typeof index === 'number') {
          const clientId = fields[index]?._clientId
          if (clientId) {
            const existing = newErrors.get(clientId) ?? []
            existing.push(issue.message)
            newErrors.set(clientId, existing)
          }
        }
      }
    }

    if (newErrors.size > 0) {
      setErrors(newErrors)
      return
    }

    setSaving(true)
    setSaveError(null)
    try {
      await updateTemplate({
        data: { campaignId, fields: cleaned },
      })
      await queryClient.invalidateQueries({
        queryKey: ['npc-template', campaignId],
      })
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {fields.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No custom fields defined yet. Add fields to create a template for NPCs
          in this campaign.
        </p>
      )}

      {fields.map((field, index) => {
        const fieldErrors = errors.get(field._clientId)
        const isSaved = savedKeysRef.current.has(field.key) && field.key !== ''

        return (
          <fieldset
            key={field._clientId}
            className="flex flex-col gap-3 rounded-md border border-border bg-popover p-4"
          >
            <legend className="sr-only">
              Field {index + 1}: {field.label || 'New field'}
            </legend>

            <div className="flex flex-wrap items-end gap-3">
              {/* Key */}
              <div className="flex min-w-[140px] flex-1 flex-col gap-1.5">
                <Label
                  htmlFor={`key-${field._clientId}`}
                  className="text-foreground"
                >
                  Key
                </Label>
                <Input
                  id={`key-${field._clientId}`}
                  value={field.key}
                  onChange={(e) =>
                    updateField(field._clientId, { key: e.target.value })
                  }
                  readOnly={isSaved}
                  placeholder="e.g. alignment"
                  className="bg-popover border-border text-foreground read-only:cursor-not-allowed read-only:opacity-60"
                  aria-invalid={!!fieldErrors}
                  aria-describedby={
                    fieldErrors ? `errors-${field._clientId}` : undefined
                  }
                />
                {!isSaved &&
                  field.key !== '' &&
                  !KEY_PATTERN.test(field.key) && (
                    <p className="text-xs text-destructive">
                      Only lowercase letters and underscores
                    </p>
                  )}
              </div>

              {/* Label */}
              <div className="flex min-w-[140px] flex-1 flex-col gap-1.5">
                <Label
                  htmlFor={`label-${field._clientId}`}
                  className="text-foreground"
                >
                  Label
                </Label>
                <Input
                  id={`label-${field._clientId}`}
                  value={field.label}
                  onChange={(e) =>
                    updateField(field._clientId, { label: e.target.value })
                  }
                  placeholder="e.g. Alignment"
                  className="bg-popover border-border text-foreground"
                />
              </div>

              {/* Type */}
              <div className="flex min-w-[120px] flex-col gap-1.5">
                <Label
                  htmlFor={`type-${field._clientId}`}
                  className="text-foreground"
                >
                  Type
                </Label>
                <Select
                  value={field.type}
                  onValueChange={(val) =>
                    updateField(field._clientId, { type: val as FieldType })
                  }
                >
                  <SelectTrigger
                    id={`type-${field._clientId}`}
                    className="bg-popover border-border text-foreground"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="number">Number</SelectItem>
                    <SelectItem value="select">Select</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Required toggle */}
              <Toggle
                variant="outline"
                size="sm"
                pressed={field.required}
                onPressedChange={(pressed) =>
                  updateField(field._clientId, { required: pressed })
                }
                aria-label={`Mark ${field.label || 'field'} as required`}
                className="self-end"
              >
                Required
              </Toggle>

              {/* Delete */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeField(field._clientId)}
                className="self-end text-muted-foreground hover:text-destructive"
                aria-label={`Delete ${field.label || 'field'}`}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>

            {/* Select options */}
            {field.type === 'select' && (
              <div className="flex flex-col gap-1.5">
                <Label
                  htmlFor={`options-${field._clientId}`}
                  className="text-foreground"
                >
                  Options{' '}
                  <span className="text-muted-foreground">
                    (comma-separated)
                  </span>
                </Label>
                <Input
                  id={`options-${field._clientId}`}
                  value={(field.options ?? []).join(', ')}
                  onChange={(e) => {
                    const opts = e.target.value
                      .split(',')
                      .map((s) => s.trim())
                      .filter(Boolean)
                    updateField(field._clientId, { options: opts })
                  }}
                  placeholder="e.g. Good, Neutral, Evil"
                  className="bg-popover border-border text-foreground"
                />
              </div>
            )}

            {/* Field errors */}
            {fieldErrors && (
              <div
                id={`errors-${field._clientId}`}
                role="alert"
                className="flex flex-col gap-0.5"
              >
                {fieldErrors.map((err) => (
                  <p key={err} className="text-sm text-destructive">
                    {err}
                  </p>
                ))}
              </div>
            )}
          </fieldset>
        )
      })}

      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addField}
          className="gap-1.5"
        >
          <Plus className="size-4" />
          Add field
        </Button>

        {(fields.length > 0 || isDirty) && (
          <Button
            type="button"
            onClick={handleSave}
            disabled={saving || !isDirty}
            className="font-bold"
          >
            {saving ? 'Saving\u2026' : 'Save Template'}
          </Button>
        )}
      </div>

      {saveError && (
        <p role="alert" className="text-sm text-destructive">
          {saveError}
        </p>
      )}
    </div>
  )
}
