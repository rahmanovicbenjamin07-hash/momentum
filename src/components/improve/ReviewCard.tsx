import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { useId, useState, type FormEvent } from 'react'
import { cn } from 'cn'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { reviewFormSchema, type ReviewFormValues, type ReviewStatus, type StatsSnapshot } from '@/schemas/improve'
import { cardClass, REVIEW_STATUS_PILL, TONE } from './meta'
import { StatTile } from './StatTile'

export type ReviewTexts = { wins: string; misses: string; lesson: string; focus: string }

type ReviewCardProps = {
  /** e.g. "Week 43 · 19–25 Oct". */
  weekLabel: string
  status: ReviewStatus
  numbers: StatsSnapshot
  values: ReviewTexts
  onPrevWeek: () => void
  onNextWeek: () => void
  /** False on the newest week, so you can't step into the future. Default true. */
  canGoNext?: boolean
  onChange: (values: ReviewTexts) => void
  /** Gets the trimmed, checked texts. */
  onSave: (values: ReviewFormValues) => void
  onFocusToExperiment: (focus: string) => void
  saving?: boolean
}

const FIELDS: { name: keyof ReviewTexts; label: string; placeholder: string }[] = [
  { name: 'wins', label: 'Wins this week', placeholder: 'What went well?' },
  { name: 'misses', label: 'What didn’t work', placeholder: 'What fell flat or got skipped?' },
  { name: 'lesson', label: 'Lesson learned', placeholder: 'One thing you’d tell yourself last Monday' },
  { name: 'focus', label: 'One focus for next week', placeholder: 'e.g. Send follow-ups on day 3 instead of day 7' },
]

/** The weekly review: week switcher, the week's numbers, four questions, Save. */
export function ReviewCard({
  weekLabel,
  status,
  numbers,
  values,
  onPrevWeek,
  onNextWeek,
  canGoNext = true,
  onChange,
  onSave,
  onFocusToExperiment,
  saving = false,
}: ReviewCardProps) {
  const id = useId()
  const [errors, setErrors] = useState<Partial<Record<keyof ReviewTexts, string>>>({})
  const pill = REVIEW_STATUS_PILL[status]

  const save = (event: FormEvent) => {
    event.preventDefault()
    const parsed = reviewFormSchema.safeParse(values)
    if (!parsed.success) {
      const next: Partial<Record<keyof ReviewTexts, string>> = {}
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as keyof ReviewTexts
        next[field] ??= issue.message
      }
      setErrors(next)
      return
    }
    setErrors({})
    onSave(parsed.data)
  }

  const change = (name: keyof ReviewTexts, value: string) => {
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }))
    onChange({ ...values, [name]: value })
  }

  return (
    <section aria-labelledby={`${id}-week`} className={cardClass}>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="icon" className="size-9 bg-card" aria-label="Previous week" onClick={onPrevWeek}>
          <ChevronLeft aria-hidden="true" />
        </Button>
        <h2 id={`${id}-week`} className="text-lg font-semibold text-foreground">
          {weekLabel}
        </h2>
        <Button
          variant="outline"
          size="icon"
          className="size-9 bg-card"
          aria-label="Next week"
          disabled={!canGoNext}
          onClick={onNextWeek}
        >
          <ChevronRight aria-hidden="true" />
        </Button>
        <Badge className={cn('ml-auto', TONE[pill.tone])}>{pill.label}</Badge>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Task completion" value={`${Math.round(numbers.task_completion)}%`} />
        <StatTile label="Outreach sent" value={String(numbers.outreach_sent)} />
        <StatTile label="Replies" value={String(numbers.replies)} />
        <StatTile label="Meetings" value={String(numbers.meetings)} />
      </div>
      <p className="mt-2.5 text-xs text-ink-3">These numbers fill in automatically from your tasks and outreach.</p>

      <form noValidate onSubmit={save} className="mt-4 flex flex-col gap-4">
        {FIELDS.map((field) => {
          const error = errors[field.name]
          const fieldId = `${id}-${field.name}`
          return (
            <div key={field.name} className="grid gap-1.5">
              <Label htmlFor={fieldId} className="font-semibold">
                {field.label}
              </Label>
              <Textarea
                id={fieldId}
                rows={2}
                placeholder={field.placeholder}
                value={values[field.name]}
                onChange={(e) => change(field.name, e.target.value)}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? `${fieldId}-error` : undefined}
              />
              {error && (
                <p id={`${fieldId}-error`} className="text-xs text-bad">
                  {error}
                </p>
              )}
            </div>
          )
        })}

        <div className="flex flex-wrap gap-2">
          <Button type="submit" size="lg" disabled={saving}>
            {saving && <Loader2 aria-hidden="true" className="animate-spin" />}
            Save review
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="bg-card"
            disabled={!values.focus.trim()}
            onClick={() => onFocusToExperiment(values.focus.trim())}
          >
            Turn focus into an experiment
          </Button>
        </div>
      </form>
    </section>
  )
}
