import { useMemo } from 'react'
import { useDailyCompletion, useReplyRates, useTasksByTag } from '@/api/stats'
import {
  buildKpis,
  completionFetchRange,
  completionPoints,
  consistencyDays,
  inRange,
  insightWindow,
  periodTotals,
  tagCounts,
} from '@/app/statsOverview'
import { useAuth } from '@/app/auth-context'
import { useTodayData } from '@/app/useTodayData'
import { PageHeader } from '@/components/PageHeader'
import { CompletionLineChart } from '@/components/stats/CompletionLineChart'
import { ConsistencyHeatmap } from '@/components/stats/ConsistencyHeatmap'
import { KpiCard } from '@/components/stats/KpiCard'
import { STATS_RANGES, type StatsRange } from '@/components/stats/meta'
import { RangeToggle } from '@/components/stats/RangeToggle'
import { TagBars } from '@/components/stats/TagBars'
import { toDateKey } from '@/lib/dates'
import { periodRange, strongestWeekday } from '@/lib/stats'
import { longestStreak, streakDaysFromTotals } from '@/lib/streak'
import { useParam } from './params'
import { LoadError, Loading } from './shared'

function pickRange(raw: string | null): StatsRange {
  const n = Number(raw)
  return (STATS_RANGES as readonly number[]).includes(n) ? (n as StatsRange) : 30
}

/** Stats → Overview: KPIs, completion chart, consistency heatmap, tasks completed by tag. */
export default function OverviewTab() {
  const [rawRange, setRange] = useParam('range')
  const range = pickRange(rawRange)
  const { today, timeZone, view: todayView } = useTodayData()
  // The Consistency grid's first square: the day the account was made (in your time zone).
  const { user } = useAuth()
  const startDay = user?.created_at ? toDateKey(new Date(user.created_at), timeZone) : today
  const { current, previous } = periodRange(today, range)
  const fetch = completionFetchRange(today, previous.from, current.from)
  const lookback = useMemo(() => insightWindow(today), [today])
  const yearStart = `${today.slice(0, 4)}-01-01`

  const completion = useDailyCompletion(fetch.from, fetch.to)
  // Reply rows hold "sent" per channel, for the Outreach sent card.
  const repliesNow = useReplyRates(current.from, current.to)
  const repliesBefore = useReplyRates(previous.from, previous.to)
  const tagsNow = useTasksByTag(current.from, current.to)
  const tagsBefore = useTasksByTag(previous.from, previous.to)
  // Tasks + repeating items per day this year, for the best streak (90% rule).
  const yearCompletion = useDailyCompletion(yearStart, today)

  const queries = [completion, repliesNow, repliesBefore, tagsNow, tagsBefore, yearCompletion]

  const page = useMemo(() => {
    if (
      !completion.data ||
      !repliesNow.data ||
      !repliesBefore.data ||
      !tagsNow.data ||
      !tagsBefore.data ||
      !yearCompletion.data ||
      !todayView
    ) {
      return null
    }
    const currentStreak = todayView.streak.days
    const best = Math.max(currentStreak, longestStreak(streakDaysFromTotals(yearCompletion.data)))
    const totals = (from: string, to: string, tags: typeof tagsNow.data, replies: typeof repliesNow.data) =>
      periodTotals({ completion: inRange(completion.data, from, to), tags, replies })
    const heatDays = consistencyDays(completion.data)
    return {
      kpis: buildKpis(
        totals(current.from, current.to, tagsNow.data, repliesNow.data),
        totals(previous.from, previous.to, tagsBefore.data, repliesBefore.data),
        range,
        { current: currentStreak, best },
      ),
      points: completionPoints(completion.data, current.from),
      heatDays,
      heatInsight: strongestWeekday(heatDays.filter((d) => d.date >= lookback.from)),
      tags: tagCounts(tagsNow.data),
    }
  }, [
    completion.data,
    repliesNow.data,
    repliesBefore.data,
    tagsNow.data,
    tagsBefore.data,
    yearCompletion.data,
    todayView,
    lookback,
    current.from,
    current.to,
    previous.from,
    previous.to,
    range,
  ])

  const failed = queries.some((q) => q.isError)
  const caption = `Last ${range} days`

  return (
    <>
      <PageHeader
        eyebrow={`${caption} · compared with the period before`}
        title="Stats"
        actions={<RangeToggle value={range} onChange={(value) => setRange(String(value))} />}
      />
      {failed ? (
        <LoadError
          title="Couldn't load your stats"
          onRetry={() => {
            for (const q of queries) void q.refetch()
          }}
        />
      ) : !page ? (
        <Loading label="Loading your stats…" />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {page.kpis.map((kpi) => (
              <KpiCard key={kpi.label} {...kpi} />
            ))}
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <CompletionLineChart points={page.points} />
            <ConsistencyHeatmap
              days={page.heatDays}
              today={today}
              start={startDay}
              insight={
                page.heatInsight ? (
                  <>
                    <strong className="font-semibold">Insight:</strong> {page.heatInsight}
                  </>
                ) : undefined
              }
            />
          </div>
          <TagBars tags={page.tags} />
        </div>
      )}
    </>
  )
}
