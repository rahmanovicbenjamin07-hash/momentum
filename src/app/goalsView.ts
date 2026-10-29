/**
 * Goals page: one goal + its progress → status, chart and sentences.
 * Pure; the maths lives in src/lib/forecast.ts and src/lib/goalChart.ts.
 */
import type { GoalSeries, OpenDeal } from '@/api/goals'
import type { MetricRow } from '@/api/metrics'
import type { GoalSource } from '@/components/goals/NewGoalDialog'
import type { PipelineDeal } from '@/components/goals/meta'
import type { GoalStatusRow } from '@/components/reports/GoalStatuses'
import { addDays, daysBetween, formatDate, type DateKey } from '@/lib/dates'
import {
  goalStatus,
  levelForecast,
  pipelineExpected,
  recentPace,
  totalForecast,
  type GoalStatus,
} from '@/lib/forecast'
import { buildGoalChart, forecastSentence, formatGoalValue, neededSentence, type GoalChart } from '@/lib/goalChart'
import type { Goal } from '@/schemas/goals'
import type { Unit } from '@/schemas/stats'
import type { RoutineItem } from '@/schemas/today'

/** What a goal is measured on, with its name and unit (routine goals count days). */
export function goalSource(goal: Goal, metrics: readonly MetricRow[], routine: readonly RoutineItem[]): { name: string; unit: Unit } {
  if (goal.source_kind === 'metric') {
    const metric = metrics.find((m) => m.id === goal.source_id)
    return { name: metric?.name ?? 'Deleted metric', unit: metric?.unit ?? 'count' }
  }
  return { name: routine.find((r) => r.id === goal.source_id)?.title ?? 'Removed routine item', unit: 'days' }
}

/** Choices for "New goal": every metric, then every routine item. */
export function goalSources(metrics: readonly MetricRow[], routine: readonly RoutineItem[]): GoalSource[] {
  return [
    ...metrics.map((m) => ({ kind: 'metric' as const, id: m.id, name: m.name, unit: m.unit })),
    ...routine.map((r) => ({ kind: 'routine' as const, id: r.id, name: r.title, unit: 'days' as const })),
  ]
}

/** Open deals weighted by stage, for the pipeline box. */
export function pipelineDeals(deals: readonly OpenDeal[]): { total: number; deals: PipelineDeal[] } {
  const { total, items } = pipelineExpected(deals)
  return {
    total,
    deals: items.map((d) => ({ id: d.id, name: d.name, stage: d.stage, amount: d.value, probability: d.probability, expected: d.expected })),
  }
}

/** "€20k", "1.5k h", "200 days" for the y axis. */
export function formatTick(value: number, unit: Unit): string {
  const short = value >= 1000 ? `${Number((value / 1000).toFixed(1))}k` : String(Math.round(value))
  if (unit === 'eur') return `€${short}`
  if (unit === 'hours') return `${short} h`
  if (unit === 'km') return `${short} km`
  return short
}

/** "2027-03" → "2027-03-31". */
function monthEnd(month: string): DateKey {
  const y = Number(month.slice(0, 4))
  const m = Number(month.slice(5, 7))
  return addDays(m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`, -1)
}

export type GoalView = {
  status: GoalStatus
  /** Real pace (total) or growth (level) per month. */
  realPace: number
  /** Per month needed by the deadline (total goals), for the slider range and colour. */
  neededPace: number | null
  chart: GoalChart
  forecast: string
  /** Only for total goals. */
  needed: string | null
  /** "€13,950 + €1,910 expected of €18,000". */
  progress: string
  /** "MY METRIC · Money earned · deadline 1 Jan 2027". */
  sourceLine: string
}

export type GoalViewInput = {
  goal: Goal
  series: GoalSeries
  source: { name: string; unit: Unit }
  today: DateKey
  /** € expected from open deals; counted only for money goals with include_pipeline on. */
  pipeline: number
  /** Slider pace; undefined = the real pace. */
  pace?: number
}

/** Whether open deals can count towards this goal (total goals in €). */
export function canUsePipeline(goal: Goal, unit: Unit): boolean {
  return goal.type === 'total' && unit === 'eur'
}

/** Everything one goal card shows. The status always uses the real pace, not the slider. */
export function goalView({ goal, series, source, today, pipeline, pace }: GoalViewInput): GoalView {
  const { unit } = source
  const fmt = (v: number) => formatGoalValue(v, unit)
  const sourceLine = `${goal.source_kind === 'metric' ? 'MY METRIC' : 'MY ROUTINE'} · ${source.name} · deadline ${formatDate(goal.deadline)}`

  if (goal.type === 'level') {
    const level = levelForecast({ months: series.months, target: goal.target, today })
    const finishDate = level.reachMonth ? monthEnd(level.reachMonth) : null
    const daysEarly = finishDate ? daysBetween(finishDate, goal.deadline) : null
    const actual = [...series.months]
      .sort((a, b) => a.month.localeCompare(b.month))
      .map((m) => ({ date: monthEnd(m.month) < today ? monthEnd(m.month) : today, value: m.value }))
    const last = actual.at(-1)
    const finish = finishDate && !level.reached ? { date: finishDate, value: goal.target } : null
    const xMax = finish && finish.date > goal.deadline ? finish.date : goal.deadline
    return {
      status: goalStatus({ reached: level.reached, daysEarly, pace: level.growth }),
      realPace: level.growth,
      neededPace: null,
      chart: {
        actual,
        forecast: finish && last ? [last, finish] : [],
        ghost: null,
        pipelineJump: null,
        targetY: goal.target,
        deadlineX: goal.deadline,
        todayX: today,
        finish,
        xMax,
        yMax: Math.max(goal.target * 1.1, ...actual.map((p) => p.value)),
      },
      forecast: forecastSentence({
        type: 'level',
        unit,
        target: goal.target,
        growth: level.growth,
        reachMonth: level.reachMonth,
        deadline: goal.deadline,
        reached: level.reached,
      }),
      needed: null,
      progress: `Best month ${fmt(series.current)} of ${fmt(goal.target)} a month`,
      sourceLine,
    }
  }

  const usedPipeline = canUsePipeline(goal, unit) && goal.include_pipeline ? pipeline : 0
  const realPace = recentPace(series.months, today)
  const common = { months: series.months, current: series.current, target: goal.target, today, deadline: goal.deadline, pipeline: usedPipeline }
  const real = totalForecast(common)
  const shown = pace === undefined || pace === realPace ? real : totalForecast({ ...common, paceOverride: pace })

  return {
    status: goalStatus(real),
    realPace,
    neededPace: real.neededPace,
    chart: buildGoalChart({
      months: series.months,
      startDate: goal.start_date,
      deadline: goal.deadline,
      today,
      target: goal.target,
      pace: shown.pace,
      realPace,
      pipeline: usedPipeline,
      finishDate: shown.finishDate,
    }),
    forecast: forecastSentence({
      type: 'total',
      unit,
      target: goal.target,
      pace: shown.pace,
      custom: shown !== real,
      finishDate: shown.finishDate,
      deadline: goal.deadline,
      reached: shown.reached,
      pipeline: usedPipeline,
    }),
    needed: shown.reached ? null : neededSentence({ unit, neededPace: real.neededPace, deadline: goal.deadline }),
    progress:
      usedPipeline > 0
        ? `${fmt(series.current)} + ${formatGoalValue(usedPipeline, 'eur')} expected of ${fmt(goal.target)}`
        : `${fmt(series.current)} of ${fmt(goal.target)}`,
    sourceLine,
  }
}

/** Slider range: 0 to 3 × the needed pace (and never below the real pace), with a round step. */
export function sliderRange(realPace: number, neededPace: number | null): { min: number; max: number; step: number } {
  const raw = Math.max(3 * (neededPace ?? 0), realPace * 1.5, 1)
  const step = raw >= 100 ? 10 ** Math.floor(Math.log10(raw / 100)) : raw >= 10 ? 0.5 : 0.1
  return { min: 0, max: Math.ceil(raw / step) * step, step }
}

const REPORT_STATUS: Record<GoalStatus, Pick<GoalStatusRow, 'status' | 'label'>> = {
  reached: { status: 'ahead', label: 'Reached' },
  ahead: { status: 'ahead' },
  on_track: { status: 'on-track' },
  slightly_behind: { status: 'behind', label: 'Slightly behind' },
  behind: { status: 'behind' },
  off_track: { status: 'off-track' },
}

/** Rows for the Reports tab's "Goals" card. */
export function reportGoalRows(
  goals: readonly Goal[],
  series: ReadonlyMap<string, GoalSeries>,
  sourceOf: (goal: Goal) => { name: string; unit: Unit },
  today: DateKey,
  pipeline: number,
): GoalStatusRow[] {
  return goals.map((goal) => {
    const s = series.get(goal.id) ?? { months: [], current: 0 }
    const { status } = goalView({ goal, series: s, source: sourceOf(goal), today, pipeline })
    return { id: goal.id, title: goal.title, ...REPORT_STATUS[status] }
  })
}
