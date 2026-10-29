import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Trash2 } from 'lucide-react'
import { useId } from 'react'
import { useForm } from 'react-hook-form'
import { cn } from 'cn'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatDate } from '@/lib/dates'
import {
  LESSON_AREAS,
  lessonFormSchema,
  type Lesson,
  type LessonFormInput,
  type LessonFormValues,
} from '@/schemas/improve'
import { cardClass, selectClass, TONE } from './meta'

type LessonsListProps = {
  lessons: Lesson[]
  /** Throw an Error to show its message. */
  onAdd: (values: LessonFormValues) => Promise<void> | void
  onDelete: (lesson: Lesson) => void
}

/** Add-a-lesson form on top, then every lesson with its area and date. */
export function LessonsList({ lessons, onAdd, onDelete }: LessonsListProps) {
  const id = useId()
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LessonFormInput, unknown, LessonFormValues>({
    resolver: zodResolver(lessonFormSchema),
    defaultValues: { area: 'Outreach', text: '' },
  })

  const add = handleSubmit(async (values) => {
    try {
      await onAdd(values)
      reset({ area: values.area, text: '' })
    } catch (error) {
      setError('root', { message: error instanceof Error ? error.message : 'Couldn’t save. Try again.' })
    }
  })

  const textError = errors.text?.message

  return (
    <section aria-labelledby={`${id}-title`} className={cardClass}>
      <h2 id={`${id}-title`} className="text-base font-semibold text-foreground">
        Lessons
      </h2>

      <form noValidate onSubmit={add} className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="grid gap-1.5 sm:w-36">
          <Label htmlFor={`${id}-area`}>Area</Label>
          <select id={`${id}-area`} className={selectClass} {...register('area')}>
            {LESSON_AREAS.map((area) => (
              <option key={area} value={area}>
                {area}
              </option>
            ))}
          </select>
        </div>
        <div className="grid flex-1 gap-1.5">
          <Label htmlFor={`${id}-text`}>Lesson</Label>
          <Input
            id={`${id}-text`}
            autoComplete="off"
            placeholder="e.g. Naming one thing from their website beats a generic compliment"
            aria-invalid={textError ? true : undefined}
            aria-describedby={textError ? `${id}-text-error` : undefined}
            {...register('text')}
          />
          {textError && (
            <p id={`${id}-text-error`} className="text-xs text-bad">
              {textError}
            </p>
          )}
        </div>
        <Button type="submit" className="h-10 sm:mt-[22px]" disabled={isSubmitting}>
          {isSubmitting && <Loader2 aria-hidden="true" className="animate-spin" />}
          Add lesson
        </Button>
      </form>
      {errors.root?.message && (
        <p role="alert" className="mt-3 rounded-lg bg-bad-tint p-3 text-[13px] text-bad">
          {errors.root.message}
        </p>
      )}

      {lessons.length === 0 ? (
        <p className="mt-4 text-sm text-ink-2">No lessons yet. Write down one thing this week taught you.</p>
      ) : (
        <ul className="mt-4 divide-y divide-border border-t border-border">
          {lessons.map((lesson) => (
            <li key={lesson.id} className="flex flex-wrap items-start gap-x-3 gap-y-1 py-3 sm:flex-nowrap">
              <Badge className={cn('mt-0.5 shrink-0', TONE.brand)}>{lesson.area}</Badge>
              <p className="min-w-0 flex-1 basis-full text-sm text-foreground sm:basis-auto">{lesson.text}</p>
              <time dateTime={lesson.created_at} className="mt-0.5 shrink-0 text-xs text-ink-3 tabular-nums">
                {formatDate(new Date(lesson.created_at))}
              </time>
              <Button
                variant="ghost"
                size="icon"
                className="-my-1.5 ml-auto size-8 text-ink-2 hover:text-bad sm:ml-0"
                aria-label="Delete lesson"
                onClick={() => onDelete(lesson)}
              >
                <Trash2 aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
