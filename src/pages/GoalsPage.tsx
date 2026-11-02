import { PencilLine, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState, type ComponentProps } from 'react'
import { toast } from 'sonner'
import {
  useAddMilestone,
  useCreateKeyResult,
  useCreateObjective,
  useDeleteGoal,
  useDeleteGoalUpdate,
  useDeleteMilestone,
  useDeleteObjective,
  useGoals,
  useGoalsSeries,
  useObjectives,
  useOpenDeals,
  useSaveGoalUpdate,
  useToggleHabitDay,
  useToggleMilestone,
  useUpdateGoal,
  useUpdateObjective,
  type GoalSeries,
} from '@/api/goals'
import { useMetrics } from '@/api/metrics'
import { useRoutineItems } from '@/api/routine'
import {
  canUsePipeline,
  formatTick,
  goalSource,
  goalView,
  habitWeekDays,
  keyResultsOf,
  keyResultSummary,
  objectiveSummary,
  pipelineDeals,
  sliderRange,
  type KeyResultSummary,
  type ObjectiveSummary,
} from '@/app/goalsView'
import { useUserToday } from '@/app/useUserToday'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { DeleteGoalDialog } from '@/components/goals/DeleteGoalDialog'
import { DoneToggle } from '@/components/goals/DoneToggle'
import { EditObjectiveDialog } from '@/components/goals/EditObjectiveDialog'
import { GoalChart } from '@/components/goals/GoalChart'
import { GoalChips } from '@/components/goals/GoalChips'
import { GoalUpdateDialog } from '@/components/goals/GoalUpdateDialog'
import { GoalUpdatesList } from '@/components/goals/GoalUpdatesList'
import { HabitTracker } from '@/components/goals/HabitTracker'
import { KeyResultCard } from '@/components/goals/KeyResultCard'
import { KeyResultDialog } from '@/components/goals/KeyResultDialog'
import { MilestoneList } from '@/components/goals/MilestoneList'
import { NewGoalDialog } from '@/components/goals/NewGoalDialog'
import { ObjectiveHeader } from '@/components/goals/ObjectiveHeader'
import { PaceSlider } from '@/components/goals/PaceSlider'
import { PipelineToggle } from '@/components/goals/PipelineToggle'
import { Button } from '@/components/ui/button'
import type { DateKey, WeekStartsOn } from '@/lib/dates'
import { formatGoalValue } from '@/lib/goalChart'
import { GOAL_LIMITS, type Goal, type GoalUnit, type GoalUpdate, type GoalUpdateFormValues, type Objective } from '@/schemas/goals'
import type { RoutineItem } from '@/schemas/today'
import { useParam } from './stats/params'
import { LoadError, Loading } from './stats/shared'

const EMPTY_SERIES: GoalSeries = { months: [], current: 0 }

type Source = { name: string; unit: GoalUnit }
type KeyResultRow = { goal: Goal; series: GoalSeries; source: Source; summary: KeyResultSummary }
type ObjectiveRow = { objective: Objective; summary: ObjectiveSummary; keyResults: KeyResultRow[] }

/**
 * Goals (design/goals.png): each goal is said in words, with up to 5 key results
 * that measure it: a number, steps, a habit or done / not done.
 */
export default function GoalsPage() {
  const { today, weekStartsOn } = useUserToday()
  const [rawGoal, setGoal] = useParam('goal')
  const [newOpen, setNewOpen] = useState(false)

  const objectives = useObjectives()
  const goals = useGoals()
  const series = useGoalsSeries(goals.data)
  const metrics = useMetrics()
  const routine = useRoutineItems()
  const openDeals = useOpenDeals()
  const createObjective = useCreateObjective()

  const queries = [objectives, goals, series, metrics, routine, openDeals]
  const failed = queries.some((q) => q.isError)
  const pipeline = useMemo(() => pipelineDeals(openDeals.data ?? []), [openDeals.data])

  const rows = useMemo((): ObjectiveRow[] | null => {
    if (!objectives.data || !goals.data || !series.data || !metrics.data || !routine.data || !openDeals.data) return null
    const all = series.data
    const m = metrics.data
    const r = routine.data
    const goalRows = goals.data
    return objectives.data.map((objective) => {
      const keyResults = keyResultsOf(objective.id, goalRows).map((goal): KeyResultRow => {
        const s = all.get(goal.id) ?? EMPTY_SERIES
        const source = goalSource(goal, m, r)
        return { goal, series: s, source, summary: keyResultSummary({ goal, series: s, source, today, pipeline: pipeline.total, weekStartsOn }) }
      })
      return { objective, keyResults, summary: objectiveSummary(objective, keyResults) }
    })
  }, [objectives.data, goals.data, series.data, metrics.data, routine.data, openDeals.data, today, pipeline.total, weekStartsOn])

  // ?goal= is an objective id (or, from older links, one of its key results).
  const selected =
    rows?.find((row) => row.objective.id === rawGoal) ??
    rows?.find((row) => row.keyResults.some((kr) => kr.goal.id === rawGoal)) ??
    rows?.[0]
  const ready = rows !== null

  return (
    <>
      <PageHeader
        title="Goals"
        actions={
          <Button onClick={() => setNewOpen(true)}>
            <Plus aria-hidden="true" />
            New goal
          </Button>
        }
      />

      {failed ? (
        <LoadError
          title="Couldn't load your goals"
          onRetry={() => {
            void objectives.refetch()
            void goals.refetch()
            void series.refetch()
            void metrics.refetch()
            void routine.refetch()
            void openDeals.refetch()
          }}
        />
      ) : !ready ? (
        <Loading label="Loading your goals…" />
      ) : !selected ? (
        <EmptyState
          title="No goals yet"
          description="Say what you want in words, then measure it: a number to reach, steps to finish, a habit to keep or one thing to get done."
        >
          <Button onClick={() => setNewOpen(true)}>
            <Plus aria-hidden="true" />
            New goal
          </Button>
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-4">
          <GoalChips
            goals={(rows ?? []).map((row) => ({ id: row.objective.id, label: row.objective.title, status: row.summary.status }))}
            selectedId={selected.objective.id}
            onSelect={(id) => setGoal(id)}
          />
          <ObjectiveCard
            key={selected.objective.id}
            row={selected}
            today={today}
            weekStartsOn={weekStartsOn}
            pipeline={pipeline}
            routineItems={routine.data ?? []}
            onDeleted={() => setGoal(rows?.find((row) => row.objective.id !== selected.objective.id)?.objective.id ?? null)}
          />
        </div>
      )}

      <NewGoalDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        today={today}
        routineItems={routine.data ?? []}
        onSubmit={async (values) => {
          try {
            const objective = await createObjective.mutateAsync(values)
            setGoal(objective.id)
            setNewOpen(false)
            toast.success(`Added ${objective.title}`)
          } catch (error) {
            throw new Error("Couldn't add the goal. Try again.", { cause: error })
          }
        }}
      />
    </>
  )
}

type ObjectiveCardProps = {
  row: ObjectiveRow
  today: DateKey
  weekStartsOn: WeekStartsOn
  pipeline: ReturnType<typeof pipelineDeals>
  routineItems: readonly RoutineItem[]
  /** After "Delete goal": pick another goal. */
  onDeleted: () => void
}

/** One goal: header with its buttons top right, then a card per key result. */
function ObjectiveCard({ row, today, weekStartsOn, pipeline, routineItems, onDeleted }: ObjectiveCardProps) {
  const { objective, summary, keyResults } = row
  const [addOpen, setAddOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletingKr, setDeletingKr] = useState<KeyResultRow | null>(null)

  const updateObjective = useUpdateObjective()
  const deleteObjective = useDeleteObjective()
  const createKeyResult = useCreateKeyResult()
  const updateGoal = useUpdateGoal()
  const deleteGoal = useDeleteGoal()
  const saveUpdate = useSaveGoalUpdate()
  const deleteUpdate = useDeleteGoalUpdate()
  const toggleHabit = useToggleHabitDay()
  const addMilestone = useAddMilestone()
  const toggleMilestone = useToggleMilestone()
  const deleteMilestone = useDeleteMilestone()

  const full = keyResults.length >= GOAL_LIMITS.keyResults
  const onlyOneSameName = keyResults.length === 1 && keyResults[0]?.goal.title === objective.title
  const card = (kr: KeyResultRow): CardProps => ({
    title: kr.goal.title,
    titleHidden: onlyOneSameName,
    progress: kr.summary.progress,
    percent: kr.summary.percent,
    status: kr.summary.status,
    onDelete: () => setDeletingKr(kr),
  })

  return (
    <section aria-label={objective.title} className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 md:p-6">
      <ObjectiveHeader
        line={summary.line}
        title={objective.title}
        why={objective.why}
        overall={keyResults.length > 1 ? { percent: summary.percent, status: summary.status } : undefined}
        actions={
          <>
            <Button onClick={() => setAddOpen(true)} disabled={full}>
              <Plus aria-hidden="true" />
              Add key result
            </Button>
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <PencilLine aria-hidden="true" />
              Edit goal
            </Button>
            <Button variant="outline" onClick={() => setDeleteOpen(true)}>
              <Trash2 aria-hidden="true" />
              Delete goal
            </Button>
          </>
        }
      />
      {full && <p className="-mt-2 text-xs text-ink-2">A goal can have up to {GOAL_LIMITS.keyResults} key results.</p>}

      {keyResults.length === 0 ? (
        <p className="text-[13px] text-ink-2">No key results yet. Add one to start measuring this goal.</p>
      ) : (
        keyResults.map((kr) => {
          switch (kr.goal.kind) {
            case 'number':
              return (
                <NumberKeyResult
                  // key: a new key result starts with its own real pace on the slider.
                  key={kr.goal.id}
                  kr={kr}
                  card={card(kr)}
                  today={today}
                  pipeline={pipeline}
                  onPipelineChange={(checked) => updateGoal.mutate({ id: kr.goal.id, patch: { include_pipeline: checked } })}
                  onSaveUpdate={async (values) => {
                    await saveUpdate.mutateAsync({ goal: kr.goal, values })
                    toast.success('Update saved')
                  }}
                  onDeleteUpdate={(update) => deleteUpdate.mutate({ goal: kr.goal, id: update.id })}
                />
              )
            case 'milestones':
              return (
                <KeyResultCard key={kr.goal.id} {...card(kr)}>
                  <MilestoneList
                    milestones={kr.series.milestones ?? []}
                    today={today}
                    onToggle={(id, done) => toggleMilestone.mutate({ goalId: kr.goal.id, id, doneOn: done ? today : null })}
                    onDelete={(id) => deleteMilestone.mutate({ goalId: kr.goal.id, id })}
                    onAdd={async (values) => {
                      await addMilestone.mutateAsync({ goalId: kr.goal.id, values })
                    }}
                  />
                </KeyResultCard>
              )
            case 'habit':
              return (
                <KeyResultCard key={kr.goal.id} {...card(kr)}>
                  {kr.summary.habit && (
                    <HabitTracker
                      perWeek={kr.goal.target}
                      days={habitWeekDays(kr.goal, kr.series.habit?.doneDates ?? [], today, weekStartsOn)}
                      weeks={kr.summary.habit.weeks}
                      linkedTo={kr.goal.source_kind === 'routine' ? kr.source.name : null}
                      summary={
                        kr.summary.habit.rate === null
                          ? 'No full week yet'
                          : `Hit ${kr.summary.habit.weeksHit} of ${kr.summary.habit.weeksCounted} weeks so far (${Math.round(kr.summary.habit.rate * 100)}%)`
                      }
                      onToggleDay={(date, done) => toggleHabit.mutate({ goal: kr.goal, date, done })}
                    />
                  )}
                </KeyResultCard>
              )
            case 'done':
              return (
                <KeyResultCard
                  key={kr.goal.id}
                  {...card(kr)}
                  actions={
                    <DoneToggle
                      done={kr.goal.completed_on !== null}
                      onChange={(done) => {
                        updateGoal.mutate({ id: kr.goal.id, patch: { completed_on: done ? today : null } })
                        if (done) toast.success(`Done: ${kr.goal.title}`)
                      }}
                    />
                  }
                />
              )
          }
        })
      )}

      <KeyResultDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        goalTitle={objective.title}
        routineItems={routineItems}
        today={today}
        onSubmit={async (draft) => {
          try {
            await createKeyResult.mutateAsync({ objectiveId: objective.id, draft })
            setAddOpen(false)
            toast.success(`Added ${draft.title}`)
          } catch (error) {
            throw new Error("Couldn't add the key result. Try again.", { cause: error })
          }
        }}
      />
      <EditObjectiveDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        title={objective.title}
        why={objective.why}
        onSubmit={async (values) => {
          await updateObjective.mutateAsync({ id: objective.id, values })
          setEditOpen(false)
        }}
      />
      <DeleteGoalDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        goalTitle={objective.title}
        onConfirm={() => {
          setDeleteOpen(false)
          deleteObjective.mutate(objective.id)
          onDeleted()
          toast.success(`Deleted ${objective.title}`)
        }}
      />
      <DeleteGoalDialog
        open={deletingKr !== null}
        onOpenChange={(open) => !open && setDeletingKr(null)}
        what="key result"
        goalTitle={deletingKr?.goal.title ?? ''}
        hasUpdates={deletingKr !== null && deletingKr.series.current > 0 && deletingKr.goal.source_kind === 'manual'}
        onConfirm={() => {
          if (deletingKr) {
            deleteGoal.mutate(deletingKr.goal.id)
            toast.success(`Deleted ${deletingKr.goal.title}`)
          }
          setDeletingKr(null)
        }}
      />
    </section>
  )
}

/** What every key result card gets: title, bar and Delete. */
type CardProps = Omit<ComponentProps<typeof KeyResultCard>, 'headline' | 'actions' | 'children'>

type NumberKeyResultProps = {
  kr: KeyResultRow
  card: CardProps
  today: string
  pipeline: ReturnType<typeof pipelineDeals>
  onPipelineChange: (checked: boolean) => void
  onSaveUpdate: (values: GoalUpdateFormValues) => Promise<void>
  onDeleteUpdate: (update: GoalUpdate) => void
}

/**
 * A number key result: the forecast and what's needed top left, Update (by hand) and Delete top right,
 * the progress bar, then the pipeline box (money), chart, pace slider and updates.
 */
function NumberKeyResult({ kr, card, today, pipeline, onPipelineChange, onSaveUpdate, onDeleteUpdate }: NumberKeyResultProps) {
  const { goal, series, source } = kr
  const { unit } = source
  const [updateOpen, setUpdateOpen] = useState(false)
  const real = useMemo(
    () => goalView({ goal, series, source, today, pipeline: pipeline.total }),
    [goal, series, source, today, pipeline.total],
  )
  // null = follow the real pace (which changes when you save an update).
  const [customPace, setCustomPace] = useState<number | null>(null)
  const pace = customPace ?? real.realPace
  const view = useMemo(
    () => (goal.type === 'total' ? goalView({ goal, series, source, today, pipeline: pipeline.total, pace }) : real),
    [goal, series, source, today, pipeline.total, pace, real],
  )
  const range = sliderRange(real.realPace, real.neededPace)
  const fmt = (v: number) => formatGoalValue(v, unit)
  const manual = goal.source_kind === 'manual'

  return (
    <KeyResultCard
      {...card}
      headline={
        <>
          <p className="text-lg leading-snug font-semibold text-foreground" aria-live="polite">
            {view.forecast}
          </p>
          {view.needed && <p className="mt-1 text-[13px] text-ink-2">{view.needed}</p>}
        </>
      }
      actions={
        manual && (
          <Button onClick={() => setUpdateOpen(true)}>
            <PencilLine aria-hidden="true" />
            Update
          </Button>
        )
      }
    >
      {canUsePipeline(goal, unit) && (
        <PipelineToggle checked={goal.include_pipeline} onChange={onPipelineChange} total={pipeline.total} deals={pipeline.deals} />
      )}
      <GoalChart chart={view.chart} formatY={fmt} formatTick={(v) => formatTick(v, unit)} />
      {goal.type === 'total' && (
        <PaceSlider
          value={pace}
          min={range.min}
          max={range.max}
          step={range.step}
          neededPace={real.neededPace}
          formatValue={fmt}
          onChange={setCustomPace}
          onReset={() => setCustomPace(null)}
        />
      )}
      {manual && <GoalUpdatesList updates={series.manual?.updates ?? []} unit={unit} onDelete={onDeleteUpdate} />}

      <GoalUpdateDialog
        open={updateOpen}
        onOpenChange={setUpdateOpen}
        goalTitle={goal.title}
        unit={unit}
        current={series.current}
        startDate={goal.start_date}
        today={today}
        onSubmit={async (values) => {
          await onSaveUpdate(values)
          setUpdateOpen(false)
        }}
      />
    </KeyResultCard>
  )
}
