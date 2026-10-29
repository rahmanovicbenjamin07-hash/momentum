import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import {
  useCreateExperiment,
  useCreateIdea,
  useCreateLesson,
  useDeleteExperiment,
  useDeleteIdea,
  useDeleteLesson,
  useExperiments,
  useIdeas,
  useLessons,
  useReview,
  useReviews,
  useSaveReview,
  useUpdateExperiment,
  useUpdateIdea,
} from '@/api/improve'
import { useProfile } from '@/api/profile'
import { useUpdateProfileSettings } from '@/api/settings'
import { useCreateTask } from '@/api/tasks'
import { useAuth } from '@/app/auth-context'
import {
  beforePeriod,
  duringPeriod,
  measureMetric,
  parseTargets,
  useMeasure,
  useWeekNumbers,
  weeklyGoalRows,
} from '@/app/improveData'
import { useUserToday } from '@/app/useUserToday'
import { AiSummaryCard } from '@/components/improve/AiSummaryCard'
import { ExperimentsList } from '@/components/improve/ExperimentsList'
import { IdeasList } from '@/components/improve/IdeasList'
import { ImproveHeader } from '@/components/improve/ImproveHeader'
import { ImproveLayout } from '@/components/improve/ImproveLayout'
import { ImproveTabs } from '@/components/improve/ImproveTabs'
import { LessonsList } from '@/components/improve/LessonsList'
import { formatMetricValue, improvePanelId, improveTabId, type ImproveTab } from '@/components/improve/meta'
import { PastReviews } from '@/components/improve/PastReviews'
import { ReviewCard, type ReviewTexts } from '@/components/improve/ReviewCard'
import { RunningExperimentCard } from '@/components/improve/RunningExperimentCard'
import { WeeklyGoalsCard } from '@/components/improve/WeeklyGoalsCard'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { addDays, dayIndex, isDateKey, weekStart, type DateKey } from '@/lib/dates'
import { experimentProgress, experimentResult, weekLabel } from '@/lib/review'
import {
  EXPERIMENT_METRIC_LABELS,
  IMPROVE_LIMITS,
  weeklyTargetsFormSchema,
  type Experiment,
  type ExperimentFormValues,
  type ExperimentStatus,
  type Review,
  type ReviewStatus,
  type StatsSnapshot,
  type WeeklyTargets,
  type WeeklyTargetsFormInput,
  type WeeklyTargetsFormValues,
} from '@/schemas/improve'
import { useParam } from './stats/params'
import { LoadError, Loading } from './stats/shared'

const TABS: readonly ImproveTab[] = ['review', 'lessons', 'experiments', 'ideas']
const AUTOSAVE_MS = 800
const EMPTY_TEXTS: ReviewTexts = { wins: '', misses: '', lesson: '', focus: '' }
const EMPTY_NUMBERS: StatsSnapshot = { task_completion: 0, outreach_sent: 0, replies: 0, meetings: 0 }

/** ?week= if it's a real Monday, not in the future; else this week's Monday. */
function pickWeek(raw: string | null, currentMonday: DateKey): DateKey {
  if (raw && isDateKey(raw) && dayIndex(raw) === 0 && raw <= currentMonday) return raw
  return currentMonday
}

/** Improvements (design/improve.png): weekly review, lessons, experiments, ideas + this week at a glance. */
export default function ImprovePage() {
  const { today, timeZone } = useUserToday()
  const { user } = useAuth()
  const [rawTab, setTab] = useParam('tab')
  const [rawWeek, setWeek] = useParam('week')
  const tab: ImproveTab = (TABS as readonly string[]).includes(rawTab ?? '') ? (rawTab as ImproveTab) : 'review'
  const currentMonday = weekStart(today)
  const week = pickWeek(rawWeek, currentMonday)
  const [targetsOpen, setTargetsOpen] = useState(false)

  const lessons = useLessons()
  const experiments = useExperiments()
  const ideas = useIdeas()
  const reviews = useReviews()
  const profile = useProfile(user?.id)
  const thisWeek = useWeekNumbers(currentMonday, timeZone)

  const createLesson = useCreateLesson()
  const deleteLesson = useDeleteLesson()
  const createExperiment = useCreateExperiment()
  const updateExperiment = useUpdateExperiment()
  const deleteExperiment = useDeleteExperiment()
  const createIdea = useCreateIdea()
  const updateIdea = useUpdateIdea()
  const deleteIdea = useDeleteIdea()
  const createTask = useCreateTask()
  const updateSettings = useUpdateProfileSettings()

  const openTab = (next: ImproveTab) => setTab(next === 'review' ? null : next)
  const targets = parseTargets(profile.data?.weekly_targets)

  /** Starts an experiment and records its metric over the 14 days before it. */
  async function startExperiment(values: ExperimentFormValues): Promise<Experiment> {
    const row = await createExperiment.mutateAsync(values)
    const { from, to } = beforePeriod(values.start_date)
    const before = await measureMetric(values.metric, from, to).catch(() => null)
    if (before !== null) updateExperiment.mutate({ id: row.id, patch: { before_value: before } })
    return row
  }

  /** "Turn focus into an experiment" / idea "Test it": a two-week reply-rate experiment from today. */
  async function experimentFrom(title: string): Promise<boolean> {
    const clean = title.trim().slice(0, IMPROVE_LIMITS.experimentTitle)
    if (!clean) {
      toast.error('Write a focus first.')
      return false
    }
    try {
      await startExperiment({ title: clean, hypothesis: '', metric: 'reply_rate', start_date: today, end_date: addDays(today, 14) })
      toast.success('Experiment started — 14 days')
      openTab('experiments')
      return true
    } catch {
      return false // the hook already showed a toast
    }
  }

  async function setExperimentStatus(exp: Experiment, status: ExperimentStatus) {
    if (status === 'running') {
      updateExperiment.mutate({ id: exp.id, patch: { status } })
      return
    }
    const { from, to } = duringPeriod(exp, today)
    const during = await measureMetric(exp.metric, from, to).catch(() => null)
    updateExperiment.mutate(
      { id: exp.id, patch: { status, during_value: during } },
      { onSuccess: () => toast.success(status === 'kept' ? 'Kept — nice change' : 'Dropped') },
    )
  }

  const running = experiments.data?.find((e) => e.status === 'running')
  const during = running ? duringPeriod(running, today) : { from: today, to: today }
  const runningDuring = useMeasure(running?.metric, during.from, during.to)

  const aside = (
    <>
      {running ? (
        <RunningExperimentCardFor experiment={running} today={today} during={runningDuring.data ?? null} />
      ) : (
        <RunningExperimentCard onStart={() => openTab('experiments')} />
      )}
      <WeeklyGoalsCard rows={weeklyGoalRows(targets, thisWeek.data ?? EMPTY_NUMBERS)} onEdit={() => setTargetsOpen(true)} />
      <AiSummaryCard />
    </>
  )

  const failed = lessons.isError || experiments.isError || ideas.isError || reviews.isError

  let main: ReactNode
  if (failed) {
    main = (
      <LoadError
        title="Couldn't load your improvements"
        onRetry={() => {
          void lessons.refetch()
          void experiments.refetch()
          void ideas.refetch()
          void reviews.refetch()
        }}
      />
    )
  } else if (tab === 'review') {
    const saved = (reviews.data ?? []).filter((r) => r.status === 'saved')
    main = (
      <>
        <WeeklyReview
          key={week}
          week={week}
          currentMonday={currentMonday}
          timeZone={timeZone}
          onWeekChange={(w) => setWeek(w === currentMonday ? null : w)}
          onFocusToExperiment={(focus) => void experimentFrom(focus)}
        />
        {saved.length > 0 && (
          <PastReviews
            items={saved.map((r) => ({
              weekLabel: weekLabel(r.week_start),
              completion: r.stats_snapshot.task_completion,
              focus: r.focus,
              onOpen: () => setWeek(r.week_start === currentMonday ? null : r.week_start),
            }))}
          />
        )}
      </>
    )
  } else if (tab === 'lessons') {
    main = !lessons.data ? (
      <Loading label="Loading lessons…" />
    ) : (
      <LessonsList
        lessons={lessons.data}
        onAdd={async (values) => {
          await createLesson.mutateAsync(values).catch((error: unknown) => {
            throw new Error("Couldn't add the lesson. Try again.", { cause: error })
          })
        }}
        onDelete={(lesson) => deleteLesson.mutate(lesson.id)}
      />
    )
  } else if (tab === 'experiments') {
    main = !experiments.data ? (
      <Loading label="Loading experiments…" />
    ) : (
      <ExperimentsList
        experiments={experiments.data}
        today={today}
        onAdd={async (values) => {
          await startExperiment(values).catch((error: unknown) => {
            throw new Error("Couldn't start the experiment. Try again.", { cause: error })
          })
        }}
        onSetStatus={(exp, status) => void setExperimentStatus(exp, status)}
        onDelete={(exp) => deleteExperiment.mutate(exp.id)}
      />
    )
  } else {
    main = !ideas.data ? (
      <Loading label="Loading ideas…" />
    ) : (
      <IdeasList
        ideas={ideas.data}
        onAdd={async (values) => {
          await createIdea.mutateAsync(values).catch((error: unknown) => {
            throw new Error("Couldn't add the idea. Try again.", { cause: error })
          })
        }}
        onMakeTask={(idea) => {
          createTask.mutate(
            { title: idea.text.slice(0, 200), dueDate: today },
            {
              onSuccess: () => {
                updateIdea.mutate({ id: idea.id, patch: { status: 'done' } })
                toast.success('Added to today’s tasks')
              },
            },
          )
        }}
        onTestIt={(idea) => {
          void experimentFrom(idea.text).then((ok) => {
            if (ok) updateIdea.mutate({ id: idea.id, patch: { status: 'testing' } })
          })
        }}
        onSetStatus={(idea, status) => updateIdea.mutate({ id: idea.id, patch: { status } })}
        onDelete={(idea) => deleteIdea.mutate(idea.id)}
      />
    )
  }

  return (
    <>
      <ImproveHeader
        onNewReview={() => {
          setWeek(null)
          openTab('review')
        }}
      />
      <ImproveTabs
        active={tab}
        counts={{ lessons: lessons.data?.length ?? 0, experiments: experiments.data?.length ?? 0, ideas: ideas.data?.length ?? 0 }}
        onChange={openTab}
      />
      <ImproveLayout
        main={
          <div role="tabpanel" id={improvePanelId(tab)} aria-labelledby={improveTabId(tab)} className="flex min-w-0 flex-col gap-4">
            {main}
          </div>
        }
        aside={aside}
      />
      <WeeklyTargetsDialog
        open={targetsOpen}
        onOpenChange={setTargetsOpen}
        targets={targets}
        onSave={(values) =>
          updateSettings.mutate(
            { weekly_targets: values },
            {
              onSuccess: () => {
                setTargetsOpen(false)
                toast.success('Weekly goals saved')
              },
            },
          )
        }
        saving={updateSettings.isPending}
      />
    </>
  )
}

// ---------------------------------------------------------------------------
// Weekly review
// ---------------------------------------------------------------------------

type WeeklyReviewProps = {
  week: DateKey
  currentMonday: DateKey
  timeZone: string
  onWeekChange: (week: DateKey) => void
  onFocusToExperiment: (focus: string) => void
}

/** Loads one week's review, then shows the editor. Keyed by week, so each week starts fresh. */
function WeeklyReview(props: WeeklyReviewProps) {
  const review = useReview(props.week)
  const live = useWeekNumbers(props.week, props.timeZone)

  if (review.isError || live.isError) {
    return <LoadError title="Couldn't load this week" onRetry={() => void review.refetch()} />
  }
  if (review.data === undefined || !live.data) return <Loading label="Loading the week…" />
  // The current week is always live; a saved past week keeps the numbers it was saved with.
  const numbers = review.data?.status === 'saved' && props.week !== props.currentMonday ? review.data.stats_snapshot : live.data
  return <ReviewEditor {...props} review={review.data} numbers={numbers} />
}

function ReviewEditor({
  week,
  currentMonday,
  onWeekChange,
  onFocusToExperiment,
  review,
  numbers,
}: WeeklyReviewProps & { review: Review | null; numbers: StatsSnapshot }) {
  const saveReview = useSaveReview()
  const [texts, setTexts] = useState<ReviewTexts>(
    review ? { wins: review.wins, misses: review.misses, lesson: review.lesson, focus: review.focus } : EMPTY_TEXTS,
  )
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pending = useRef<ReviewTexts | null>(null)
  // A saved review stays saved while you edit it; a new one is a draft until "Save review".
  const draftStatus: ReviewStatus = review?.status === 'saved' ? 'saved' : 'draft'

  // What the autosave sends, kept current for the timer and the unmount save.
  const latest = useRef({ week, numbers, draftStatus, mutate: saveReview.mutate })
  useEffect(() => {
    latest.current = { week, numbers, draftStatus, mutate: saveReview.mutate }
  })

  /** Saves the waiting texts now (only refs inside, so it never changes). */
  const flush = useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
    const values = pending.current
    pending.current = null
    if (!values) return
    const tooLong = Object.values(values).some((v) => v.length > IMPROVE_LIMITS.reviewText)
    if (tooLong) return
    const { week: w, numbers: n, draftStatus: status, mutate } = latest.current
    mutate({ ...values, week_start: w, stats_snapshot: n, status })
  }, [])

  // Save what's still waiting when leaving the week or the page.
  useEffect(() => () => flush(), [flush])

  return (
    <ReviewCard
      weekLabel={weekLabel(week)}
      status={review?.status ?? 'draft'}
      numbers={numbers}
      values={texts}
      onPrevWeek={() => onWeekChange(addDays(week, -7))}
      onNextWeek={() => onWeekChange(addDays(week, 7))}
      canGoNext={week < currentMonday}
      onChange={(values) => {
        setTexts(values)
        pending.current = values
        if (timer.current) clearTimeout(timer.current)
        timer.current = setTimeout(flush, AUTOSAVE_MS)
      }}
      onSave={(values) => {
        if (timer.current) clearTimeout(timer.current)
        timer.current = null
        pending.current = null
        saveReview.mutate(
          { ...values, week_start: week, stats_snapshot: numbers, status: 'saved' },
          { onSuccess: () => toast.success('Review saved') },
        )
      }}
      onFocusToExperiment={onFocusToExperiment}
      saving={saveReview.isPending}
    />
  )
}

// ---------------------------------------------------------------------------
// Right column
// ---------------------------------------------------------------------------

function RunningExperimentCardFor({ experiment, today, during }: { experiment: Experiment; today: DateKey; during: number | null }) {
  const { day, totalDays } = experimentProgress(experiment, today)
  const before = experiment.before_value
  const verdict = before !== null && during !== null ? experimentResult(before, during).verdict : null
  return (
    <RunningExperimentCard
      title={experiment.title}
      day={day}
      totalDays={totalDays}
      beforeLabel={`${EXPERIMENT_METRIC_LABELS[experiment.metric]} before`}
      before={formatMetricValue(experiment.metric, before)}
      during={during === null ? null : formatMetricValue(experiment.metric, during)}
      better={verdict === 'better' ? true : verdict === 'worse' ? false : null}
      note={during === null ? 'No data yet for this period — keep going.' : undefined}
    />
  )
}

type WeeklyTargetsDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  targets: WeeklyTargets
  onSave: (values: WeeklyTargetsFormValues) => void
  saving: boolean
}

/** "Edit" on This week's goals: three numbers. */
function WeeklyTargetsDialog({ open, onOpenChange, targets, onSave, saving }: WeeklyTargetsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">This week’s goals</DialogTitle>
          <DialogDescription>Targets for every week. The card compares them with this week’s numbers.</DialogDescription>
        </DialogHeader>
        {open && <WeeklyTargetsForm targets={targets} onSave={onSave} onCancel={() => onOpenChange(false)} saving={saving} />}
      </DialogContent>
    </Dialog>
  )
}

function WeeklyTargetsForm({ targets, onSave, onCancel, saving }: Omit<WeeklyTargetsDialogProps, 'open' | 'onOpenChange'> & { onCancel: () => void }) {
  const id = useId()
  const defaultValues = useMemo(
    () => ({ outreaches: String(targets.outreaches), task_completion: String(targets.task_completion), meetings: String(targets.meetings) }),
    [targets],
  )
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<WeeklyTargetsFormInput, unknown, WeeklyTargetsFormValues>({
    resolver: zodResolver(weeklyTargetsFormSchema),
    defaultValues,
  })
  const fields = [
    { name: 'outreaches', label: 'Outreaches per week', hint: '1–200' },
    { name: 'task_completion', label: 'Task completion (%)', hint: '1–100' },
    { name: 'meetings', label: 'Meetings per week', hint: '0–50' },
  ] as const

  return (
    <form noValidate onSubmit={handleSubmit(onSave)} className="flex flex-col gap-4">
      {fields.map((f) => {
        const error = errors[f.name]?.message
        return (
          <div key={f.name} className="grid gap-1.5">
            <Label htmlFor={`${id}-${f.name}`}>{f.label}</Label>
            <Input
              id={`${id}-${f.name}`}
              inputMode="numeric"
              autoComplete="off"
              aria-invalid={error ? true : undefined}
              aria-describedby={`${id}-${f.name}-hint`}
              {...register(f.name)}
            />
            <p id={`${id}-${f.name}-hint`} className={error ? 'text-xs text-bad' : 'text-xs text-ink-2'}>
              {error ?? f.hint}
            </p>
          </div>
        )
      })}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving && <Loader2 aria-hidden="true" className="animate-spin" />}
          Save goals
        </Button>
      </div>
    </form>
  )
}
