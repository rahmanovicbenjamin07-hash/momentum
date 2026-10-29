import type { Stage } from '@/schemas/outreach'
import type { TaskStatus } from '@/schemas/today'
import { addDays, dayIndex, DEFAULT_TIME_ZONE, toDateKey, type DateKey } from './dates'

// ---------------------------------------------------------------------------
// Small shared helpers (also used by routineStats.ts and reports.ts)
// ---------------------------------------------------------------------------

/** Removes floating-point noise (0.1 + 0.2 → 0.3). */
export function tidy(value: number): number {
  return Math.round(value * 1e6) / 1e6
}

/** done ÷ total, or null when there was nothing to do. */
export function completionRate(done: number, total: number): number | null {
  return total > 0 ? done / total : null
}

/** 0.3125 → "31%". */
export function formatPercent(fraction: number): string {
  return `${Math.round(fraction * 100)}%`
}

/** 0.1875 → "18.8%" (one decimal, ".0" dropped). */
export function formatPercent1(fraction: number): string {
  return `${formatNumber1(fraction * 100)}%`
}

/** 6 → "6", 6.25 → "6.3". */
export function formatNumber1(value: number): string {
  return String(Math.round(value * 10) / 10)
}

const euroFormat = new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })

/** 2200 → "€2,200". */
export function formatEur(value: number): string {
  return euroFormat.format(value)
}

export const WEEKDAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const

/** "Wake up at 06:00" → "wake up at 06:00" (for use mid-sentence). */
export function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1)
}

// ---------------------------------------------------------------------------
// Periods
// ---------------------------------------------------------------------------

export const RANGE_DAYS = [7, 30, 90] as const
export type RangeDays = (typeof RANGE_DAYS)[number]

export type DateRange = { from: DateKey; to: DateKey }

/** The last `days` days up to today, and the same number of days just before. */
export function periodRange(today: DateKey, days: number): { current: DateRange; previous: DateRange } {
  const from = addDays(today, -(days - 1))
  return {
    current: { from, to: today },
    previous: { from: addDays(from, -days), to: addDays(from, -1) },
  }
}

export type PeriodComparison = {
  value: number
  previous: number
  /** value − previous ("+11", or "+6 pts" for percentages). */
  delta: number
  /** value ÷ previous − 1 (0.13 = +13%). null when previous is 0. */
  relative: number | null
}

/** A KPI vs the previous period. */
export function periodCompare(value: number, previous: number): PeriodComparison {
  return { value, previous, delta: tidy(value - previous), relative: previous !== 0 ? value / previous - 1 : null }
}

/**
 * Trailing 7-day average for a daily series (today and the 6 days before).
 * Missing days (null) are skipped; null when the whole window is empty.
 * The first days average whatever is available.
 */
export function movingAverage7(values: readonly (number | null)[]): (number | null)[] {
  return values.map((_, i) => {
    const window = values.slice(Math.max(0, i - 6), i + 1).filter((v): v is number => v !== null)
    return window.length ? window.reduce((a, b) => a + b, 0) / window.length : null
  })
}

// ---------------------------------------------------------------------------
// Outreach funnel
// ---------------------------------------------------------------------------

export const FUNNEL_STAGES = ['contacted', 'replied', 'meeting', 'proposal', 'won'] as const
export type FunnelStage = (typeof FUNNEL_STAGES)[number]

/**
 * How many leads reached each funnel stage. Give every stage a lead entered
 * (e.g. stage_history rows). A lead that skipped ahead (new → meeting) also
 * counts for the stages before it. "lost" and "new" don't count.
 */
export function funnelCounts(reached: Iterable<{ contact_id: string; stage: Stage }>): Record<FunnelStage, number> {
  const furthest = new Map<string, number>()
  for (const { contact_id, stage } of reached) {
    const index = (FUNNEL_STAGES as readonly string[]).indexOf(stage)
    if (index >= 0) furthest.set(contact_id, Math.max(index, furthest.get(contact_id) ?? -1))
  }
  const counts = Object.fromEntries(FUNNEL_STAGES.map((s) => [s, 0])) as Record<FunnelStage, number>
  for (const index of furthest.values()) {
    for (let i = 0; i <= index; i += 1) counts[FUNNEL_STAGES[i] as FunnelStage] += 1
  }
  return counts
}

export type FunnelRow = {
  stage: FunnelStage
  count: number
  /** count ÷ previous stage's count; null for the first stage or after a 0. */
  ofPrevious: number | null
  /** count ÷ contacted; for the bar width. */
  ofStart: number | null
}

/** Funnel rows with "% of previous" (contacted 96 → replied 18 = 19% → meeting 7 = 39% …). */
export function funnelPercents(counts: Record<FunnelStage, number>): FunnelRow[] {
  const start = counts.contacted
  return FUNNEL_STAGES.map((stage, i) => {
    const previous = i > 0 ? counts[FUNNEL_STAGES[i - 1] as FunnelStage] : 0
    return {
      stage,
      count: counts[stage],
      ofPrevious: i > 0 && previous > 0 ? counts[stage] / previous : null,
      ofStart: start > 0 ? counts[stage] / start : null,
    }
  })
}

// ---------------------------------------------------------------------------
// Reply rate
// ---------------------------------------------------------------------------

/** Fewer sends than this are "too few to judge" (bars faded, "Too few sends" badge). */
export const MIN_SENDS_TO_JUDGE = 30

export type ReplyRate = {
  sent: number
  replies: number
  /** replies ÷ sent, null with nothing sent. */
  rate: number | null
  tooFew: boolean
}

export function replyRate(sent: number, replies: number): ReplyRate {
  return { sent, replies, rate: completionRate(replies, sent), tooFew: sent < MIN_SENDS_TO_JUDGE }
}

/**
 * Reply rate per group (channel, source, template…) from sent messages.
 * Highest rate first; on a tie, the group with more sends first.
 */
export function replyRatesBy(sentMessages: readonly { key: string; got_reply: boolean }[]): (ReplyRate & { key: string })[] {
  const groups = new Map<string, { sent: number; replies: number }>()
  for (const { key, got_reply } of sentMessages) {
    const g = groups.get(key) ?? { sent: 0, replies: 0 }
    g.sent += 1
    if (got_reply) g.replies += 1
    groups.set(key, g)
  }
  return [...groups.entries()]
    .map(([key, g]) => ({ key, ...replyRate(g.sent, g.replies) }))
    .sort((a, b) => (b.rate ?? -1) - (a.rate ?? -1) || b.sent - a.sent)
}

/** The group with the best rate among those with enough sends (the "Best" badge), or null. */
export function bestReplyKey(rates: readonly (ReplyRate & { key: string })[]): string | null {
  let best: (ReplyRate & { key: string }) | null = null
  for (const r of rates) {
    if (r.tooFew || r.rate === null) continue
    if (!best || r.rate > (best.rate ?? -1)) best = r
  }
  return best?.key ?? null
}

// ---------------------------------------------------------------------------
// Insights: 4 sentences computed from the user's own data
// ---------------------------------------------------------------------------

export type InsightId = 'wake' | 'replyWeekday' | 'timedTasks' | 'lowEnergy'
export type Insight = { id: InsightId; title: string; detail: string }

/** One row per calendar day in the range. */
export type InsightDay = {
  date: DateKey
  /** Was the wake-up routine item done? null when it wasn't scheduled that day. */
  wakeDone: boolean | null
  tasksDone: number
  tasksTotal: number
  /** Energy 1–5 from the daily note, or null. */
  energy: number | null
  /** Outreach messages sent that day. */
  outreachSent: number
}

export type InsightsInput = {
  days: readonly InsightDay[]
  /** Title of the wake-up routine item (see findWakeItem), or null if there is none. */
  wakeTitle: string | null
  sentMessages: readonly { occurred_at: string; got_reply: boolean }[]
  tasks: readonly { time: string | null; status: TaskStatus }[]
  timeZone?: string
}

/** Minimum days in each group before comparing them. */
export const MIN_INSIGHT_DAYS = 5
/** Minimum sends on a weekday before it can be best or worst. */
export const MIN_WEEKDAY_SENDS = 5
/** Minimum tasks in each group (timed / anytime). */
export const MIN_INSIGHT_TASKS = 10
/** Minimum low-energy days. */
export const MIN_LOW_ENERGY_DAYS = 3

/** The routine item that counts as "waking up" (title contains "wake"). */
export function findWakeItem<T extends { title: string }>(items: readonly T[]): T | null {
  return items.find((item) => /\bwake\b/i.test(item.title)) ?? null
}

function pooledRate(days: readonly InsightDay[]): number {
  const done = days.reduce((n, d) => n + d.tasksDone, 0)
  const total = days.reduce((n, d) => n + d.tasksTotal, 0)
  return total > 0 ? done / total : 0
}

/** "On days you wake up at 06:00 you finish 31% more tasks." */
export function wakeInsight(days: readonly InsightDay[], wakeTitle: string | null): Insight | null {
  if (!wakeTitle) return null
  const counted = days.filter((d) => d.wakeDone !== null && d.tasksTotal > 0)
  const woke = counted.filter((d) => d.wakeDone)
  const late = counted.filter((d) => !d.wakeDone)
  if (woke.length < MIN_INSIGHT_DAYS || late.length < MIN_INSIGHT_DAYS) return null

  const wokeRate = pooledRate(woke)
  const lateRate = pooledRate(late)
  if (lateRate === 0 || wokeRate === 0) return null
  const diff = wokeRate / lateRate - 1
  const phrase = `On days you ${lowerFirst(wakeTitle)} you finish`
  const title =
    diff >= 0.05
      ? `${phrase} ${formatPercent(diff)} more tasks.`
      : diff <= -0.05
        ? `${phrase} ${formatPercent(-diff)} fewer tasks.`
        : `${phrase} about the same share of tasks.`
  return {
    id: 'wake',
    title,
    detail: `${formatPercent(wokeRate)} completion vs ${formatPercent(lateRate)} on late days · based on ${counted.length} days`,
  }
}

/** "Messages sent on Tuesday get the most replies (27%)." */
export function replyWeekdayInsight(
  sentMessages: InsightsInput['sentMessages'],
  timeZone: string = DEFAULT_TIME_ZONE,
): Insight | null {
  const byDay = Array.from({ length: 7 }, () => ({ sent: 0, replies: 0 }))
  for (const m of sentMessages) {
    const day = byDay[dayIndex(toDateKey(new Date(m.occurred_at), timeZone))]
    if (!day) continue
    day.sent += 1
    if (m.got_reply) day.replies += 1
  }
  const ranked = byDay
    .map((d, weekday) => ({ weekday, rate: d.replies / d.sent, sent: d.sent }))
    .filter((d) => d.sent >= MIN_WEEKDAY_SENDS)
  if (ranked.length < 2) return null
  // Best: highest rate (earlier weekday on a tie). Worst: lowest rate.
  const best = ranked.reduce((a, b) => (b.rate > a.rate ? b : a))
  const worst = ranked.reduce((a, b) => (b.rate < a.rate ? b : a))
  if (best.rate === worst.rate) return null
  const bestName = WEEKDAY_NAMES[best.weekday] ?? ''
  const worstName = WEEKDAY_NAMES[worst.weekday] ?? ''
  return {
    id: 'replyWeekday',
    title: `Messages sent on ${bestName} get the most replies (${formatPercent(best.rate)}).`,
    detail: `${worstName}s are lowest at ${formatPercent(worst.rate)} · consider batching outreach on ${bestName}s`,
  }
}

/** "Tasks with a set time get done 1.6× more often." */
export function timedTasksInsight(tasks: InsightsInput['tasks']): Insight | null {
  const timed = tasks.filter((t) => t.time !== null)
  const anytime = tasks.filter((t) => t.time === null)
  if (timed.length < MIN_INSIGHT_TASKS || anytime.length < MIN_INSIGHT_TASKS) return null
  const rate = (list: typeof tasks) => list.filter((t) => t.status === 'done').length / list.length
  const timedRate = rate(timed)
  const anytimeRate = rate(anytime)
  if (timedRate === 0 || anytimeRate === 0) return null

  const ratio = timedRate / anytimeRate
  if (ratio >= 1.05) {
    return {
      id: 'timedTasks',
      title: `Tasks with a set time get done ${formatNumber1(ratio)}× more often.`,
      detail: `${formatPercent(timedRate)} vs ${formatPercent(anytimeRate)} for “anytime” tasks`,
    }
  }
  if (ratio <= 1 / 1.05) {
    return {
      id: 'timedTasks',
      title: `“Anytime” tasks get done ${formatNumber1(1 / ratio)}× more often than timed ones.`,
      detail: `${formatPercent(anytimeRate)} vs ${formatPercent(timedRate)} for tasks with a set time`,
    }
  }
  return {
    id: 'timedTasks',
    title: 'Timed and “anytime” tasks get done about equally often.',
    detail: `${formatPercent(timedRate)} vs ${formatPercent(anytimeRate)}`,
  }
}

/** "Low-energy days cut your outreach in half." */
export function lowEnergyInsight(days: readonly InsightDay[]): Insight | null {
  const logged = days.filter((d) => d.energy !== null)
  const low = logged.filter((d) => (d.energy ?? 0) <= 2)
  if (low.length < MIN_LOW_ENERGY_DAYS || logged.length === low.length) return null
  const avg = (list: readonly InsightDay[]) => list.reduce((n, d) => n + d.outreachSent, 0) / list.length
  const average = avg(logged)
  if (average === 0) return null
  const lowAverage = avg(low)
  const ratio = lowAverage / average

  let title: string
  if (ratio >= 0.45 && ratio <= 0.55) title = 'Low-energy days cut your outreach in half.'
  else if (ratio < 0.95) title = `Low-energy days cut your outreach by ${formatPercent(1 - ratio)}.`
  else if (ratio > 1.05) title = 'You send more outreach on low-energy days.'
  else title = 'Low energy doesn’t slow your outreach down.'

  return {
    id: 'lowEnergy',
    title,
    detail: `${formatNumber1(lowAverage)} messages on energy 1–2 days vs ${formatNumber1(average)} on average`,
  }
}

/** The 4 insight sentences, in a fixed order. Ones without enough data are left out. */
export function insights({ days, wakeTitle, sentMessages, tasks, timeZone }: InsightsInput): Insight[] {
  return [
    wakeInsight(days, wakeTitle),
    replyWeekdayInsight(sentMessages, timeZone),
    timedTasksInsight(tasks),
    lowEnergyInsight(days),
  ].filter((i): i is Insight => i !== null)
}

/**
 * The weekday with the highest average completion, as a sentence for the
 * Consistency card: "Tuesdays are your strongest day (88% done on average)."
 * Days with nothing planned (null) are skipped. Needs 2 weeks of data on at
 * least 2 weekdays; null otherwise or when every weekday ties.
 */
export function strongestWeekday(days: readonly { date: DateKey; rate: number | null }[]): string | null {
  const byDay = Array.from({ length: 7 }, () => [] as number[])
  for (const d of days) {
    if (d.rate !== null) byDay[dayIndex(d.date)]?.push(d.rate)
  }
  const ranked = byDay
    .map((rates, weekday) => ({ weekday, rates }))
    .filter((d) => d.rates.length >= 2)
    .map(({ weekday, rates }) => ({ weekday, avg: rates.reduce((a, b) => a + b, 0) / rates.length }))
  if (ranked.length < 2) return null
  const best = ranked.reduce((a, b) => (b.avg > a.avg ? b : a))
  if (ranked.every((d) => d.avg === best.avg)) return null
  return `${WEEKDAY_NAMES[best.weekday]}s are your strongest day (${formatPercent(best.avg)} done on average).`
}
