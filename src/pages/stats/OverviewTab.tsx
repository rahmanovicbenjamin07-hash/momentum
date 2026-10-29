import { useMemo } from 'react'
import { useRoutineItems } from '@/api/routine'
import {
  useDailyCompletion,
  useOutreachFunnel,
  useReplyRates,
  useRevenue,
  useRoutineDays,
  useTasksByTag,
} from '@/api/stats'
import {
  buildKpis,
  channelReplyBars,
  completionFetchRange,
  completionPoints,
  consistencyDays,
  funnelSteps,
  inRange,
  insightCards,
  insightDays,
  insightWindow,
  periodTotals,
  revenueCard,
  sentPerDay,
  tagCounts,
  templateStats,
} from '@/app/statsOverview'
import { useEnergyInRange, useItemChecks, useSentMessages, useTasksInRange } from '@/app/statsQueries'
import { streakDaysFromRows } from '@/app/statsRoutine'
import { useTodayData } from '@/app/useTodayData'
import { PageHeader } from '@/components/PageHeader'
import { CompletionLineChart } from '@/components/stats/CompletionLineChart'
import { ConsistencyHeatmap } from '@/components/stats/ConsistencyHeatmap'
import { FunnelBars } from '@/components/stats/FunnelBars'
import { InsightsCard } from '@/components/stats/InsightsCard'
import { KpiCard } from '@/components/stats/KpiCard'
import { STATS_RANGES, type StatsRange } from '@/components/stats/meta'
import { RangeToggle } from '@/components/stats/RangeToggle'
import { ReplyRateBars } from '@/components/stats/ReplyRateBars'
import { RevenueCard } from '@/components/stats/RevenueCard'
import { TagBars } from '@/components/stats/TagBars'
import { TemplatesTable } from '@/components/stats/TemplatesTable'
import { toDateKey } from '@/lib/dates'
import { findWakeItem, insights, periodRange, strongestWeekday } from '@/lib/stats'
import { longestStreak } from '@/lib/streak'
import { useParam } from './params'
import { LoadError, Loading, Tabs } from './shared'

function pickRange(raw: string | null): StatsRange {
  const n = Number(raw)
  return (STATS_RANGES as readonly number[]).includes(n) ? (n as StatsRange) : 30
}

/** Stats → Overview (design/stats.png): KPIs, charts, funnel, reply rates, insights, revenue, templates, tags. */
export default function OverviewTab() {
  const [rawRange, setRange] = useParam('range')
  const range = pickRange(rawRange)
  const { today, timeZone, view: todayView } = useTodayData()
  const { current, previous } = periodRange(today, range)
  const fetch = completionFetchRange(today, previous.from, current.from)
  const lookback = useMemo(() => insightWindow(today), [today])
  const yearStart = `${today.slice(0, 4)}-01-01`

  const completion = useDailyCompletion(fetch.from, fetch.to)
  const funnelNow = useOutreachFunnel(current.from, current.to)
  const funnelBefore = useOutreachFunnel(previous.from, previous.to)
  const repliesNow = useReplyRates(current.from, current.to)
  const repliesBefore = useReplyRates(previous.from, previous.to)
  const tagsNow = useTasksByTag(current.from, current.to)
  const tagsBefore = useTasksByTag(previous.from, previous.to)
  const revenue = useRevenue(yearStart, today)
  const repliesYear = useReplyRates(yearStart, today)
  const routineYear = useRoutineDays(yearStart, today)
  const routineItems = useRoutineItems()
  const wakeItem = routineItems.data ? findWakeItem(routineItems.data) : null
  const wakeChecks = useItemChecks(wakeItem?.id, lookback.from, lookback.to)
  const energy = useEnergyInRange(lookback.from, lookback.to)
  const sent = useSentMessages(lookback.from, lookback.to, timeZone)
  const tasks = useTasksInRange(lookback.from, lookback.to)

  const queries = [
    completion,
    funnelNow,
    funnelBefore,
    repliesNow,
    repliesBefore,
    tagsNow,
    tagsBefore,
    revenue,
    repliesYear,
    routineYear,
    routineItems,
    energy,
    sent,
    tasks,
  ]
  const wakeReady = !wakeItem || wakeChecks.data !== undefined

  const page = useMemo(() => {
    if (
      !completion.data ||
      !funnelNow.data ||
      !funnelBefore.data ||
      !repliesNow.data ||
      !repliesBefore.data ||
      !tagsNow.data ||
      !tagsBefore.data ||
      !revenue.data ||
      !repliesYear.data ||
      !routineYear.data ||
      !energy.data ||
      !sent.data ||
      !tasks.data ||
      !todayView ||
      !wakeReady
    ) {
      return null
    }
    const currentStreak = todayView.streak.days
    const best = Math.max(currentStreak, longestStreak(streakDaysFromRows(routineYear.data, yearStart, today)))
    const totals = (from: string, to: string, tags: typeof tagsNow.data, replies: typeof repliesNow.data, funnel: typeof funnelNow.data) =>
      periodTotals({ completion: inRange(completion.data, from, to), tags, replies, funnel })
    const heatDays = consistencyDays(completion.data)
    const days = insightDays({
      ...lookback,
      completion: completion.data,
      wakeItem,
      wakeChecks: wakeChecks.data ?? [],
      energy: energy.data,
      sentByDay: sentPerDay(sent.data, (iso) => toDateKey(new Date(iso), timeZone)),
      timeZone,
    })
    return {
      kpis: buildKpis(
        totals(current.from, current.to, tagsNow.data, repliesNow.data, funnelNow.data),
        totals(previous.from, previous.to, tagsBefore.data, repliesBefore.data, funnelBefore.data),
        range,
        { current: currentStreak, best },
      ),
      points: completionPoints(completion.data, current.from),
      heatDays,
      heatInsight: strongestWeekday(heatDays.filter((d) => d.date >= lookback.from)),
      funnel: funnelSteps(funnelNow.data),
      channels: channelReplyBars(repliesNow.data),
      insights: insightCards(
        insights({ days, wakeTitle: wakeItem?.title ?? null, sentMessages: sent.data, tasks: tasks.data, timeZone }),
      ),
      revenue: revenueCard(revenue.data, repliesYear.data),
      templates: templateStats(repliesNow.data),
      tags: tagCounts(tagsNow.data),
    }
  }, [
    completion.data,
    funnelNow.data,
    funnelBefore.data,
    repliesNow.data,
    repliesBefore.data,
    tagsNow.data,
    tagsBefore.data,
    revenue.data,
    repliesYear.data,
    routineYear.data,
    energy.data,
    sent.data,
    tasks.data,
    todayView,
    wakeReady,
    wakeItem,
    wakeChecks.data,
    lookback,
    today,
    timeZone,
    yearStart,
    current.from,
    current.to,
    previous.from,
    previous.to,
    range,
  ])

  const failed = queries.some((q) => q.isError) || wakeChecks.isError
  const caption = `Last ${range} days`

  return (
    <>
      <PageHeader
        eyebrow={`${caption} · compared with the period before`}
        title="Stats"
        actions={<RangeToggle value={range} onChange={(value) => setRange(String(value))} />}
      />
      <Tabs />
      {failed ? (
        <LoadError
          title="Couldn't load your stats"
          onRetry={() => {
            for (const q of [...queries, wakeChecks]) void q.refetch()
          }}
        />
      ) : !page ? (
        <Loading label="Loading your stats…" />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            {page.kpis.map((kpi) => (
              <KpiCard key={kpi.label} {...kpi} />
            ))}
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <CompletionLineChart points={page.points} />
            <ConsistencyHeatmap
              days={page.heatDays}
              today={today}
              insight={
                page.heatInsight ? (
                  <>
                    <strong className="font-semibold">Insight:</strong> {page.heatInsight}
                  </>
                ) : undefined
              }
            />
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2">
            <FunnelBars steps={page.funnel} caption={caption} />
            <ReplyRateBars rows={page.channels} />
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2">
            <InsightsCard insights={page.insights} />
            <RevenueCard {...page.revenue} caption={`This year · from won deals`} />
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <TemplatesTable templates={page.templates} />
            <TagBars tags={page.tags} />
          </div>
        </div>
      )}
    </>
  )
}
