import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { useRoutineItems } from '@/api/routine'
import { useRoutineDays } from '@/api/stats'
import { checksFromRows, routineCards, statsYears, yearSpan } from '@/app/statsRoutine'
import { useUserToday } from '@/app/useUserToday'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { MissReasonsBars } from '@/components/routine/MissReasonsBars'
import { MonthTable } from '@/components/routine/MonthTable'
import { RoutineChart, type RoutineChartMode } from '@/components/routine/RoutineChart'
import { RoutineFacts } from '@/components/routine/RoutineFacts'
import { RoutineItemCards } from '@/components/routine/RoutineItemCards'
import { Button } from '@/components/ui/button'
import { routineItemStats, type RoutineItemStats } from '@/lib/routineStats'
import { formatDays } from '@/lib/todayList'
import { pickYear, useParam } from './params'
import { LoadError, Loading, Tabs, YearSelect } from './shared'

/** Stats → Routine progress (design/progress-routine.png): cards, year chart, facts, miss reasons, months. */
export default function RoutineTab() {
  const { today, timeZone } = useUserToday()
  const years = statsYears(today)
  const [rawYear, setYear] = useParam('year')
  const year = pickYear(rawYear, years)
  const [rawItem, setItem] = useParam('item')
  const [mode, setMode] = useState<RoutineChartMode>('running')
  const [showPerfect, setShowPerfect] = useState(true)

  const span = yearSpan(year, today)
  const items = useRoutineItems()
  const days = useRoutineDays(span.from, span.to)

  const stats = useMemo(() => {
    if (!items.data || !days.data) return null
    const rows = days.data
    return new Map<string, RoutineItemStats>(
      items.data.map((item) => [item.id, routineItemStats(item, checksFromRows(rows, item.id, today), { year, today, timeZone })]),
    )
  }, [items.data, days.data, year, today, timeZone])

  const selected = items.data?.find((i) => i.id === rawItem) ?? items.data?.[0]
  const selectedStats = selected ? stats?.get(selected.id) : undefined
  const isCurrentYear = Number(today.slice(0, 4)) === year

  return (
    <>
      <PageHeader
        eyebrow={`Your whole year at a glance · 1 Jan – 31 Dec ${year}`}
        title="Stats"
        actions={<YearSelect value={year} years={years} onChange={(y) => setYear(y === years[0] ? null : String(y))} />}
      />
      <Tabs />
      <p className="mb-4 text-sm text-ink-2">
        Every routine item gets its own year chart. Instead of done / not done, you see the days add up — and how close you
        are to a perfect year.
      </p>

      {items.isError || days.isError ? (
        <LoadError
          title="Couldn't load your routine"
          onRetry={() => {
            void items.refetch()
            void days.refetch()
          }}
        />
      ) : !stats || !items.data ? (
        <Loading label="Loading your routine…" />
      ) : !selected || !selectedStats ? (
        <EmptyState title="No routine items yet" description="Add a repeating task on Today and its progress shows up here.">
          <Button asChild>
            <Link to="/">Go to Today</Link>
          </Button>
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-4">
          <RoutineItemCards items={routineCards(items.data, stats)} selectedId={selected.id} onSelect={(id) => setItem(id)} />
          <RoutineChart
            title={`${selected.title} · ${formatDays(selected.days)}`}
            year={year}
            months={selectedStats.months}
            perfectLine={selectedStats.perfectLine}
            forecast={selectedStats.forecast?.line ?? null}
            mode={mode}
            onModeChange={setMode}
            showPerfect={showPerfect}
            onShowPerfectChange={setShowPerfect}
          />
          <RoutineFacts stats={selectedStats} currentMonth={isCurrentYear ? today.slice(0, 7) : `${year}-12`} />
          <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
            <div className="self-start">
              <MissReasonsBars reasons={selectedStats.missReasons} pattern={selectedStats.missWeekday?.sentence} />
            </div>
            <MonthTable months={selectedStats.months} />
          </div>
        </div>
      )}
    </>
  )
}
