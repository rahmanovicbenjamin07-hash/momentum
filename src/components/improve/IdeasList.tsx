import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Trash2 } from 'lucide-react'
import { useId } from 'react'
import { useForm } from 'react-hook-form'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ideaFormSchema, type Idea, type IdeaFormInput, type IdeaFormValues, type IdeaStatus } from '@/schemas/improve'
import { cardClass, IDEA_STATUS_PILL, TONE } from './meta'

type IdeasListProps = {
  ideas: Idea[]
  /** Throw an Error to show its message. */
  onAdd: (values: IdeaFormValues) => Promise<void> | void
  onMakeTask: (idea: Idea) => void
  onTestIt: (idea: Idea) => void
  onSetStatus: (idea: Idea, status: IdeaStatus) => void
  onDelete: (idea: Idea) => void
}

/** Quick idea inbox: add one line, then turn ideas into tasks or experiments. */
export function IdeasList({ ideas, onAdd, onMakeTask, onTestIt, onSetStatus, onDelete }: IdeasListProps) {
  const id = useId()
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<IdeaFormInput, unknown, IdeaFormValues>({
    resolver: zodResolver(ideaFormSchema),
    defaultValues: { text: '' },
  })

  const add = handleSubmit(async (values) => {
    try {
      await onAdd(values)
      reset({ text: '' })
    } catch (error) {
      setError('root', { message: error instanceof Error ? error.message : 'Couldn’t save. Try again.' })
    }
  })

  const textError = errors.text?.message

  return (
    <section aria-labelledby={`${id}-title`} className={cardClass}>
      <h2 id={`${id}-title`} className="text-base font-semibold text-foreground">
        Ideas
      </h2>

      <form noValidate onSubmit={add} className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="grid flex-1 gap-1.5">
          <Label htmlFor={`${id}-text`}>New idea</Label>
          <Input
            id={`${id}-text`}
            autoComplete="off"
            placeholder="e.g. Ask happy clients for one referral each"
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
          Add idea
        </Button>
      </form>
      {errors.root?.message && (
        <p role="alert" className="mt-3 rounded-lg bg-bad-tint p-3 text-[13px] text-bad">
          {errors.root.message}
        </p>
      )}

      {ideas.length === 0 ? (
        <p className="mt-4 text-sm text-ink-2">No ideas yet. Jot down anything worth trying.</p>
      ) : (
        <ul className="mt-4 divide-y divide-border border-t border-border">
          {ideas.map((idea) => {
            const pill = IDEA_STATUS_PILL[idea.status]
            const open = idea.status === 'new' || idea.status === 'testing'
            return (
              <li key={idea.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-start gap-2">
                  <p className="min-w-0 text-sm text-foreground">{idea.text}</p>
                  <Badge className={`shrink-0 ${TONE[pill.tone]}`}>{pill.label}</Badge>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  {open && (
                    <Button size="sm" variant="outline" className="bg-card" onClick={() => onMakeTask(idea)}>
                      Make task
                    </Button>
                  )}
                  {idea.status === 'new' && (
                    <Button size="sm" variant="outline" className="bg-card" onClick={() => onTestIt(idea)}>
                      Test it
                    </Button>
                  )}
                  {open ? (
                    <Button size="sm" variant="ghost" onClick={() => onSetStatus(idea, 'dropped')}>
                      Drop
                    </Button>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => onSetStatus(idea, 'new')}>
                      Reopen
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-ink-2 hover:text-bad"
                    aria-label="Delete idea"
                    onClick={() => onDelete(idea)}
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
