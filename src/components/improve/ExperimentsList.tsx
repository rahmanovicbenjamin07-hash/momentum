import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Trash2 } from 'lucide-react'
import { useId } from 'react'
import { useForm } from 'react-hook-form'
import { cn } from 'cn'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { addDays, formatDate, type DateKey } from '@/lib/dates'
import {
  EXPERIMENT_METRIC_LABELS,
  EXPERIMENT_METRICS,
  experimentFormSchema,
  type Experiment,
  type ExperimentFormInput,
  type ExperimentFormValues,
  type ExperimentStatus,
} from '@/schemas/improve'
import { cardClass, changeText, EXPERIMENT_STATUS_PILL, formatMetricValue, selectClass, TONE } from './meta'

type ExperimentsListProps = {
  experiments: Experiment[]
  /** Fills the form's start date; the end date defaults to two weeks later. */
  today: DateKey
  /** Throw an Error to show its message. */
  onAdd: (values: ExperimentFormValues) => Promise<void> | void
  onSetStatus: (experiment: Experiment, status: ExperimentStatus) => void
  onDelete: (experiment: Experiment) => void
}

const CHANGE_TEXT = { good: 'text-good', bad: 'text-bad', neutral: 'text-ink-2' } as const

/** Two weeks is the default experiment length. */
const DEFAULT_DAYS = 14

/** Add-an-experiment form, then each experiment with before → during and Keep / Drop while running. */
export function ExperimentsList({ experiments, today, onAdd, onSetStatus, onDelete }: ExperimentsListProps) {
  const id = useId()
  const defaults = (): ExperimentFormInput => ({
    title: '',
    hypothesis: '',
    metric: 'reply_rate',
    start_date: today,
    end_date: addDays(today, DEFAULT_DAYS - 1),
  })
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ExperimentFormInput, unknown, ExperimentFormValues>({
    resolver: zodResolver(experimentFormSchema),
    defaultValues: defaults(),
  })

  const add = handleSubmit(async (values) => {
    try {
      await onAdd(values)
      reset(defaults())
    } catch (error) {
      setError('root', { message: error instanceof Error ? error.message : 'Couldn’t save. Try again.' })
    }
  })

  const fieldError = (name: 'title' | 'hypothesis' | 'start_date' | 'end_date') => {
    const message = errors[name]?.message
    return {
      message,
      props: {
        'aria-invalid': message ? true : undefined,
        'aria-describedby': message ? `${id}-${name}-error` : undefined,
      },
      node: message && (
        <p id={`${id}-${name}-error`} className="text-xs text-bad">
          {message}
        </p>
      ),
    }
  }
  const title = fieldError('title')
  const hypothesis = fieldError('hypothesis')
  const start = fieldError('start_date')
  const end = fieldError('end_date')

  return (
    <section aria-labelledby={`${id}-title`} className={cardClass}>
      <h2 id={`${id}-title`} className="text-base font-semibold text-foreground">
        Experiments
      </h2>

      <form noValidate onSubmit={add} className="mt-3 grid gap-3 sm:grid-cols-3">
        <div className="grid gap-1.5 sm:col-span-3">
          <Label htmlFor={`${id}-name`}>Experiment</Label>
          <Input
            id={`${id}-name`}
            autoComplete="off"
            placeholder="e.g. Follow up on day 3 instead of day 7"
            {...title.props}
            {...register('title')}
          />
          {title.node}
        </div>
        <div className="grid gap-1.5 sm:col-span-3">
          <Label htmlFor={`${id}-hypothesis`}>Hypothesis (optional)</Label>
          <Input
            id={`${id}-hypothesis`}
            autoComplete="off"
            placeholder="What do you expect to change, and why?"
            {...hypothesis.props}
            {...register('hypothesis')}
          />
          {hypothesis.node}
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`${id}-metric`}>Measure</Label>
          <select id={`${id}-metric`} className={selectClass} {...register('metric')}>
            {EXPERIMENT_METRICS.map((metric) => (
              <option key={metric} value={metric}>
                {EXPERIMENT_METRIC_LABELS[metric]}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`${id}-start`}>Start</Label>
          <Input id={`${id}-start`} type="date" {...start.props} {...register('start_date')} />
          {start.node}
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`${id}-end`}>End</Label>
          <Input id={`${id}-end`} type="date" {...end.props} {...register('end_date')} />
          {end.node}
        </div>
        <div className="sm:col-span-3">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 aria-hidden="true" className="animate-spin" />}
            Add experiment
          </Button>
        </div>
      </form>
      {errors.root?.message && (
        <p role="alert" className="mt-3 rounded-lg bg-bad-tint p-3 text-[13px] text-bad">
          {errors.root.message}
        </p>
      )}

      {experiments.length === 0 ? (
        <p className="mt-4 text-sm text-ink-2">No experiments yet. Pick one small change and test it for two weeks.</p>
      ) : (
        <ul className="mt-4 divide-y divide-border border-t border-border">
          {experiments.map((experiment) => (
            <ExperimentRow key={experiment.id} experiment={experiment} onSetStatus={onSetStatus} onDelete={onDelete} />
          ))}
        </ul>
      )}
    </section>
  )
}

function ExperimentRow({
  experiment,
  onSetStatus,
  onDelete,
}: {
  experiment: Experiment
  onSetStatus: ExperimentsListProps['onSetStatus']
  onDelete: ExperimentsListProps['onDelete']
}) {
  const { metric, before_value, during_value, status } = experiment
  const pill = EXPERIMENT_STATUS_PILL[status]
  const change = changeText(before_value, during_value)

  return (
    <li className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">{experiment.title}</p>
        <p className="mt-0.5 text-xs text-ink-3 tabular-nums">
          {EXPERIMENT_METRIC_LABELS[metric]} · {formatDate(experiment.start_date)} – {formatDate(experiment.end_date)}
        </p>
        {experiment.hypothesis && <p className="mt-1 text-[13px] text-ink-2">{experiment.hypothesis}</p>}
        <p className="mt-1.5 text-sm text-foreground tabular-nums">
          <span className="text-ink-2">Before</span> {formatMetricValue(metric, before_value)}{' '}
          <span aria-hidden="true">→</span>
          <span className="sr-only">, </span> <span className="text-ink-2">during</span>{' '}
          {during_value === null ? 'not measured yet' : formatMetricValue(metric, during_value)}
          {change && (
            <span className={cn('ml-1.5 font-semibold', CHANGE_TEXT[change.tone])}>
              ({change.text})
            </span>
          )}
        </p>
        {experiment.result && <p className="mt-1 text-xs text-ink-3">{experiment.result}</p>}
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <Badge className={TONE[pill.tone]}>{pill.label}</Badge>
        {status === 'running' && (
          <>
            <Button size="sm" variant="outline" className="bg-card" onClick={() => onSetStatus(experiment, 'kept')}>
              Keep
            </Button>
            <Button size="sm" variant="outline" className="bg-card" onClick={() => onSetStatus(experiment, 'dropped')}>
              Drop
            </Button>
          </>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-ink-2 hover:text-bad"
          aria-label="Delete experiment"
          onClick={() => onDelete(experiment)}
        >
          <Trash2 aria-hidden="true" />
        </Button>
      </div>
    </li>
  )
}
