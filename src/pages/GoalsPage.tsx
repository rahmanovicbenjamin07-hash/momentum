import { Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useCreateGoal, useGoals, useGoalsSeries, useOpenDeals, useUpdateGoal, type GoalSeries } from '@/api/goals'
import { useMetrics } from '@/api/metrics'
import { useRoutineItems } from '@/api/routine'
import { canUsePipeline, formatTick, goalSource, goalSources, goalView, pipelineDeals, sliderRange } from '@/app/goalsView'
import { useUserToday } from '@/app/useUserToday'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { GoalChart } from '@/components/goals/GoalChart'
import { GoalChips } from '@/components/goals/GoalChips'
import { GoalHeader } from '@/components/goals/GoalHeader'
import { NewGoalDialog } from '@/components/goals/NewGoalDialog'
import { PaceSlider } from '@/components/goals/PaceSlider'
import { PipelineToggle } from '@/components/goals/PipelineToggle'
import { Button } from '@/components/ui/button'
import { formatGoalValue } from '@/lib/goalChart'
import type { Goal } from '@/schemas/goals'
import type { Unit } from '@/schemas/stats'
import { useParam } from './stats/params'
import { LoadError, Loading } from './stats/shared'

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
        series: all.get(goal.id) ?? { months: [], current: 0 },
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
          description="Set a target for one of your metrics or routine items, and see where your current pace takes you."
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
            series={series.data?.get(selected.id) ?? { months: [], current: 0 }}
            source={sourceOf(selected)}
            today={today}
            pipeline={pipeline}
            onPipelineChange={(checked) => updateGoal.mutate({ id: selected.id, patch: { include_pipeline: checked } })}
          />
        </div>
      )}

      <NewGoalDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        sources={goalSources(metrics.data ?? [], routine.data ?? [])}
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
  source: { name: string; unit: Unit }
  today: string
  pipeline: ReturnType<typeof pipelineDeals>
  onPipelineChange: (checked: boolean) => void
}

/** One goal: header, pipeline box (money goals), sentences, chart and pace slider. */
function GoalCard({ goal, series, source, today, pipeline, onPipelineChange }: GoalCardProps) {
  const { unit } = source
  const real = useMemo(
    () => goalView({ goal, series, source, today, pipeline: pipeline.total }),
    [goal, series, source, today, pipeline.total],
  )
  const [pace, setPace] = useState(real.realPace)
  const view = useMemo(
    () => (goal.type === 'total' ? goalView({ goal, series, source, today, pipeline: pipeline.total, pace }) : real),
    [goal, series, source, today, pipeline.total, pace, real],
  )
  const range = sliderRange(real.realPace, real.neededPace)
  const fmt = (v: number) => formatGoalValue(v, unit)

  return (
    <section aria-label={goal.title} className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 md:p-6">
      <GoalHeader sourceLine={view.sourceLine} title={goal.title} progressText={view.progress} status={view.status} />
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
          onChange={setPace}
          onReset={() => setPace(real.realPace)}
        />
      )}
    </section>
  )
}
