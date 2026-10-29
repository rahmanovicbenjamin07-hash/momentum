import { PencilLine, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  useCreateGoal,
  useDeleteGoal,
  useDeleteGoalUpdate,
  useGoals,
  useGoalsSeries,
  useOpenDeals,
  useSaveGoalUpdate,
  useUpdateGoal,
  type GoalSeries,
} from '@/api/goals'
import { useMetrics } from '@/api/metrics'
import { useRoutineItems } from '@/api/routine'
import { canUsePipeline, formatTick, goalSource, goalView, pipelineDeals, sliderRange } from '@/app/goalsView'
import { useUserToday } from '@/app/useUserToday'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { DeleteGoalDialog } from '@/components/goals/DeleteGoalDialog'
import { GoalChart } from '@/components/goals/GoalChart'
import { GoalChips } from '@/components/goals/GoalChips'
import { GoalHeader } from '@/components/goals/GoalHeader'
import { GoalUpdateDialog } from '@/components/goals/GoalUpdateDialog'
import { GoalUpdatesList } from '@/components/goals/GoalUpdatesList'
import { NewGoalDialog } from '@/components/goals/NewGoalDialog'
import { PaceSlider } from '@/components/goals/PaceSlider'
import { PipelineToggle } from '@/components/goals/PipelineToggle'
import { Button } from '@/components/ui/button'
import { formatGoalValue } from '@/lib/goalChart'
import type { Goal, GoalUnit, GoalUpdate, GoalUpdateFormValues } from '@/schemas/goals'
import { useParam } from './stats/params'
import { LoadError, Loading } from './stats/shared'

const EMPTY_SERIES: GoalSeries = { months: [], current: 0 }

/** Goals (design/goals.png): pick a goal, see where the current pace takes you, and try a faster one. */
export default function GoalsPage() {
  const { today } = useUserToday()
  const [rawGoal, setGoal] = useParam('goal')
  const [newOpen, setNewOpen] = useState(false)

  const goals = useGoals()
  const series = useGoalsSeries(goals.data)
  const metrics = useMetrics()
  const routine = useRoutineItems()
  const openDeals = useOpenDeals()
  const createGoal = useCreateGoal()
  const updateGoal = useUpdateGoal()
  const deleteGoal = useDeleteGoal()
  const saveUpdate = useSaveGoalUpdate()
  const deleteUpdate = useDeleteGoalUpdate()

  const ready = goals.data && series.data && metrics.data && routine.data && openDeals.data
  const failed = goals.isError || series.isError || metrics.isError || routine.isError || openDeals.isError
  const selected = goals.data?.find((g) => g.id === rawGoal) ?? goals.data?.[0]
  const pipeline = useMemo(() => pipelineDeals(openDeals.data ?? []), [openDeals.data])

  const sourceOf = (goal: Goal) => goalSource(goal, metrics.data ?? [], routine.data ?? [])
  const chips = useMemo(() => {
    if (!goals.data || !series.data || !metrics.data || !routine.data) return []
    const all = series.data
    return goals.data.map((goal) => ({
      id: goal.id,
      label: goal.short_label,
      status: goalView({
        goal,
        series: all.get(goal.id) ?? EMPTY_SERIES,
        source: goalSource(goal, metrics.data ?? [], routine.data ?? []),
        today,
        pipeline: pipeline.total,
      }).status,
    }))
  }, [goals.data, series.data, metrics.data, routine.data, today, pipeline.total])

  return (
    <>
      <PageHeader
        eyebrow="See where your current pace takes you — and what changes if you push harder"
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
          description="Pick any number you want to reach by a date, like money saved, and update it whenever it changes."
        >
          <Button onClick={() => setNewOpen(true)}>
            <Plus aria-hidden="true" />
            New goal
          </Button>
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-4">
          <GoalChips goals={chips} selectedId={selected.id} onSelect={(id) => setGoal(id)} />
          {/* key: a new goal starts with its own real pace on the slider. */}
          <GoalCard
            key={selected.id}
            goal={selected}
            series={series.data?.get(selected.id) ?? EMPTY_SERIES}
            source={sourceOf(selected)}
            today={today}
            pipeline={pipeline}
            onPipelineChange={(checked) => updateGoal.mutate({ id: selected.id, patch: { include_pipeline: checked } })}
            onSaveUpdate={async (values) => {
              await saveUpdate.mutateAsync({ goal: selected, values })
              toast.success('Update saved')
            }}
            onDeleteUpdate={(update) => deleteUpdate.mutate({ goal: selected, id: update.id })}
            onDelete={() => {
              const next = goals.data?.find((g) => g.id !== selected.id)
              deleteGoal.mutate(selected.id)
              setGoal(next?.id ?? null)
              toast.success(`Deleted ${selected.title}`)
            }}
          />
        </div>
      )}

      <NewGoalDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        today={today}
        onSubmit={async (values) => {
          try {
            const goal = await createGoal.mutateAsync(values)
            setGoal(goal.id)
            setNewOpen(false)
            toast.success(`Added ${goal.title}`)
          } catch (error) {
            throw new Error("Couldn't add the goal. Try again.", { cause: error })
          }
        }}
      />
    </>
  )
}

type GoalCardProps = {
  goal: Goal
  series: GoalSeries
  source: { name: string; unit: GoalUnit }
  today: string
  pipeline: ReturnType<typeof pipelineDeals>
  onPipelineChange: (checked: boolean) => void
  onSaveUpdate: (values: GoalUpdateFormValues) => Promise<void>
  onDeleteUpdate: (update: GoalUpdate) => void
  onDelete: () => void
}

/** One goal: header, actions, pipeline box (money goals), sentences, chart, pace slider and updates. */
function GoalCard({
  goal,
  series,
  source,
  today,
  pipeline,
  onPipelineChange,
  onSaveUpdate,
  onDeleteUpdate,
  onDelete,
}: GoalCardProps) {
  const { unit } = source
  const [updateOpen, setUpdateOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
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
    <section aria-label={goal.title} className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 md:p-6">
      <GoalHeader sourceLine={view.sourceLine} title={goal.title} progressText={view.progress} status={view.status} />
      <div className="flex flex-wrap gap-2">
        {manual && (
          <Button onClick={() => setUpdateOpen(true)}>
            <PencilLine aria-hidden="true" />
            Update
          </Button>
        )}
        <Button variant="outline" onClick={() => setDeleteOpen(true)}>
          <Trash2 aria-hidden="true" />
          Delete goal
        </Button>
      </div>
      {canUsePipeline(goal, unit) && (
        <PipelineToggle checked={goal.include_pipeline} onChange={onPipelineChange} total={pipeline.total} deals={pipeline.deals} />
      )}
      <div>
        <p className="text-lg leading-snug font-semibold text-foreground" aria-live="polite">
          {view.forecast}
        </p>
        {view.needed && <p className="mt-1 text-[13px] text-ink-2">{view.needed}</p>}
      </div>
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
      <DeleteGoalDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        goalTitle={goal.title}
        hasUpdates={manual && (series.manual?.updates.length ?? 0) > 0}
        onConfirm={() => {
          setDeleteOpen(false)
          onDelete()
        }}
      />
    </section>
  )
}
