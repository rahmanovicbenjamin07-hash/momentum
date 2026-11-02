/**
 * Goals page: one goal + its progress → status, chart and sentences.
 * Pure; the maths lives in src/lib/forecast.ts and src/lib/goalChart.ts.
 */
import type { GoalSeries, OpenDeal } from '@/api/goals'
import type { MetricRow } from '@/api/metrics'
import type { PipelineDeal } from '@/components/goals/meta'
import type { GoalStatusRow } from '@/components/reports/GoalStatuses'
import { addDays, daysBetween, formatDate, weekDays, type DateKey, type WeekStartsOn } from '@/lib/dates'
import {
  goalStatus,
  levelForecast,
  pipelineExpected,
  recentPace,
  totalForecast,
  type GoalStatus,
} from '@/lib/forecast'
import { buildGoalChart, forecastSentence, formatGoalValue, neededSentence, type GoalChart } from '@/lib/goalChart'
import {
  doneProgress,
  habitProgress,
  milestoneProgress,
  numberPercent,
  objectiveProgress,
  type HabitProgress,
  type MilestoneProgress,
} from '@/lib/keyResults'
import type { Goal, GoalKind, GoalUnit, Milestone, Objective } from '@/schemas/goals'
import type { RoutineItem } from '@/schemas/today'

/** What a key result is measured on, with its name and unit (routine goals count days, manual goals have their own unit). */
export function goalSource(goal: Goal, metrics: readonly MetricRow[], routine: readonly RoutineItem[]): { name: string; unit: GoalUnit } {
  if (goal.kind === 'milestones' || goal.kind === 'done') return { name: '', unit: 'count' }
  if (goal.kind === 'habit') {
    if (goal.source_kind === 'manual') return { name: 'Ticked by hand', unit: 'days' }
    return { name: routine.find((r) => r.id === goal.source_id)?.title ?? 'Removed routine item', unit: 'days' }
  }
  if (goal.source_kind === 'manual') return { name: 'Updated by hand', unit: goal.unit ?? 'count' }
  if (goal.source_kind === 'metric') {
    const metric = metrics.find((m) => m.id === goal.source_id)
    return { name: metric?.name ?? 'Deleted metric', unit: metric?.unit ?? 'count' }
  }
  return { name: routine.find((r) => r.id === goal.source_id)?.title ?? 'Removed routine item', unit: 'days' }
}

/** Open deals weighted by stage, for the pipeline box. */
export function pipelineDeals(deals: readonly OpenDeal[]): { total: number; deals: PipelineDeal[] } {
  const { total, items } = pipelineExpected(deals)
  return {
    total,
    deals: items.map((d) => ({ id: d.id, name: d.name, stage: d.stage, amount: d.value, probability: d.probability, expected: d.expected })),
  }
}

/** "€20k", "20k KM", "1.5k h", "200 days" for the y axis. */
export function formatTick(value: number, unit: GoalUnit): string {
  const short = value >= 1000 ? `${Number((value / 1000).toFixed(1))}k` : String(Math.round(value))
  if (unit === 'eur') return `€${short}`
  if (unit === 'bam') return `${short} KM`
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
  /** "€13,950 + €1,910 expected of €18,000", "€4,200 of €10,000 · started at €3,000". */
  progress: string
  /** "MY METRIC · Money earned · deadline 1 Jan 2027", "UPDATED BY HAND · last update 12 Oct 2026 · deadline …". */
  sourceLine: string
}

export type GoalViewInput = {
  goal: Goal
  series: GoalSeries
  source: { name: string; unit: GoalUnit }
  today: DateKey
  /** € expected from open deals; counted only for money goals with include_pipeline on. */
  pipeline: number
  /** Slider pace; undefined = the real pace. */
  pace?: number
}

/** Whether open deals can count towards this goal (total goals in € measured on a metric). */
export function canUsePipeline(goal: Goal, unit: GoalUnit): boolean {
  return goal.type === 'total' && unit === 'eur' && goal.source_kind !== 'manual'
}

function goalSourceLine(goal: Goal, series: GoalSeries, sourceName: string): string {
  const deadline = `deadline ${formatDate(goal.deadline)}`
  if (goal.source_kind === 'manual') {
    const last = series.manual?.lastUpdate
    return `UPDATED BY HAND · ${last ? `last update ${formatDate(last)}` : 'no updates yet'} · ${deadline}`
  }
  return `${goal.source_kind === 'metric' ? 'MY METRIC' : 'MY ROUTINE'} · ${sourceName} · ${deadline}`
}

/** Everything one goal card shows. The status always uses the real pace, not the slider. */
export function goalView({ goal, series, source, today, pipeline, pace }: GoalViewInput): GoalView {
  const { unit } = source
  const fmt = (v: number) => formatGoalValue(v, unit)
  const sourceLine = goalSourceLine(goal, series, source.name)

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
  // Hand-updated goals: pace from the typed-in values; others: the last 3 complete months.
  const realPace = series.manual ? series.manual.pace : recentPace(series.months, today)
  const common = { months: series.months, current: series.current, target: goal.target, today, deadline: goal.deadline, pipeline: usedPipeline }
  const real = totalForecast({ ...common, paceOverride: realPace })
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
      startValue: goal.start_value,
      points: series.manual?.points,
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
      manual: Boolean(series.manual),
    }),
    needed: shown.reached ? null : neededSentence({ unit, neededPace: real.neededPace, deadline: goal.deadline }),
    progress:
      (usedPipeline > 0
        ? `${fmt(series.current)} + ${formatGoalValue(usedPipeline, 'eur')} expected of ${fmt(goal.target)}`
        : `${fmt(series.current)} of ${fmt(goal.target)}`) +
      (goal.start_value > 0 ? ` · started at ${fmt(goal.start_value)}` : ''),
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


// ===========================================================================
// Key results of every kind, and the objective they belong to
// ===========================================================================

/** One key result as its card shows it. */
export type KeyResultSummary = {
  id: string
  title: string
  kind: GoalKind
  /** 0–100. */
  percent: number
  status: GoalStatus
  /** "€4,200 of €10,000", "3 of 5 steps done", "6 of 12 weeks hit · 3-week streak", "Done on 12 Oct 2026". */
  progress: string
  /** "STEPS · deadline 31 Dec 2026", "HABIT · Ticked by hand · 3× a week · until 31 Mar 2027". */
  line: string
  habit?: HabitProgress
  milestones?: MilestoneProgress<Milestone>
}

export type KeyResultInput = GoalViewInput & { weekStartsOn?: WeekStartsOn }

const plural = (count: number, one: string, many = `${one}s`) => `${count} ${count === 1 ? one : many}`

/** Percent, status and the two lines of text for any kind of key result. */
export function keyResultSummary({ goal, series, source, today, pipeline, weekStartsOn = 1 }: KeyResultInput): KeyResultSummary {
  const base = { id: goal.id, title: goal.title, kind: goal.kind }
  const deadline = formatDate(goal.deadline)

  switch (goal.kind) {
    case 'milestones': {
      const steps = milestoneProgress({ milestones: series.milestones ?? [], startDate: goal.start_date, deadline: goal.deadline, today })
      return {
        ...base,
        percent: steps.percent,
        status: steps.status,
        progress: `${steps.done} of ${plural(steps.total, 'step')} done${steps.overdue ? ` · ${steps.overdue} overdue` : ''}`,
        line: `STEPS · deadline ${deadline}`,
        milestones: steps,
      }
    }
    case 'habit': {
      const habit = habitProgress({
        perWeek: goal.target,
        startDate: goal.start_date,
        deadline: goal.deadline,
        today,
        doneDates: series.habit?.doneDates ?? [],
        weekStartsOn,
      })
      return {
        ...base,
        percent: habit.percent,
        status: habit.status,
        progress: `${habit.weeksHit} of ${plural(habit.totalWeeks, 'week')} hit${habit.streak > 1 ? ` · ${habit.streak}-week streak` : ''}`,
        line: `HABIT · ${source.name} · ${goal.target}× a week · until ${deadline}`,
        habit,
      }
    }
    case 'done': {
      const done = doneProgress({ completedOn: goal.completed_on, deadline: goal.deadline, today })
      const left = daysBetween(today, goal.deadline)
      return {
        ...base,
        ...done,
        progress: goal.completed_on
          ? `Done on ${formatDate(goal.completed_on)}`
          : left < 0
            ? `Not done · the deadline was ${deadline}`
            : `Not done yet · ${plural(left, 'day')} left`,
        line: `DONE / NOT DONE · deadline ${deadline}`,
      }
    }
    case 'number': {
      const view = goalView({ goal, series, source, today, pipeline })
      return {
        ...base,
        percent: numberPercent({
          type: goal.type,
          current: series.current,
          startValue: goal.start_value,
          target: goal.target,
        }),
        status: view.status,
        progress: view.progress,
        line: view.sourceLine,
      }
    }
  }
}

/** The key results of one objective, oldest first (`goals` is already in that order). */
export function keyResultsOf(objectiveId: string, goals: readonly Goal[]): Goal[] {
  return goals.filter((g) => (g.objective_id ?? g.id) === objectiveId)
}

export type ObjectiveSummary = {
  id: string
  title: string
  why: string | null
  percent: number
  /** null without key results. */
  status: GoalStatus | null
  /** "3 KEY RESULTS · BY 3 MAY 2027" (the latest deadline). */
  line: string
}

export function objectiveSummary(
  objective: Objective,
  keyResults: readonly { goal: Goal; summary: KeyResultSummary }[],
): ObjectiveSummary {
  const { percent, status } = objectiveProgress(keyResults.map((kr) => kr.summary))
  const latest = keyResults.map((kr) => kr.goal.deadline).sort().at(-1)
  return {
    id: objective.id,
    title: objective.title,
    why: objective.why,
    percent,
    status,
    line: latest
      ? `${plural(keyResults.length, 'KEY RESULT', 'KEY RESULTS')} · BY ${formatDate(latest).toUpperCase()}`
      : 'NO KEY RESULTS YET',
  }
}

/** Rows for the Reports tab's "Goals" card: one per objective that has key results. */
export function reportGoalRows(
  objectives: readonly Objective[],
  goals: readonly Goal[],
  series: ReadonlyMap<string, GoalSeries>,
  sourceOf: (goal: Goal) => { name: string; unit: GoalUnit },
  today: DateKey,
  pipeline: number,
  weekStartsOn: WeekStartsOn = 1,
): GoalStatusRow[] {
  return objectives.flatMap((objective) => {
    const keyResults = keyResultsOf(objective.id, goals).map((goal) => ({
      goal,
      summary: keyResultSummary({
        goal,
        series: series.get(goal.id) ?? { months: [], current: 0 },
        source: sourceOf(goal),
        today,
        pipeline,
        weekStartsOn,
      }),
    }))
    const { status } = objectiveSummary(objective, keyResults)
    return status ? [{ id: objective.id, title: objective.title, ...REPORT_STATUS[status] }] : []
  })
}

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

/** This week's days for a habit: done or not, and disabled in the future or outside the habit's dates. */
export function habitWeekDays(
  goal: Pick<Goal, 'start_date' | 'deadline'>,
  doneDates: readonly DateKey[],
  today: DateKey,
  weekStartsOn: WeekStartsOn = 1,
): { date: DateKey; weekday: string; done: boolean; disabled: boolean }[] {
  const done = new Set(doneDates)
  return weekDays(today, weekStartsOn).map((date) => ({
    date,
    weekday: WEEKDAY_NAMES[new Date(`${date}T12:00:00Z`).getUTCDay()] ?? '',
    done: done.has(date),
    disabled: date > today || date < goal.start_date || date > goal.deadline,
  }))
}
