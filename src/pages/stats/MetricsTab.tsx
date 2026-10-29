import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useCreateMetric, useLogValue, useMetricEntries, useMetrics } from '@/api/metrics'
import { logMonths, metricCard, metricView } from '@/app/statsMetrics'
import { useAllMetricEntries } from '@/app/statsQueries'
import { statsYears } from '@/app/statsRoutine'
import { useUserToday } from '@/app/useUserToday'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { EntriesTable } from '@/components/metrics/EntriesTable'
import { monthName } from '@/components/metrics/format'
import { LogValueForm } from '@/components/metrics/LogValueForm'
import { MetricCards } from '@/components/metrics/MetricCards'
import { MetricChart, type MetricChartMode } from '@/components/metrics/MetricChart'
import { MetricFacts } from '@/components/metrics/MetricFacts'
import { NewMetricDialog } from '@/components/metrics/NewMetricDialog'
import { Button } from '@/components/ui/button'
import { pickYear, useParam } from './params'
import { LoadError, Loading, Tabs, YearSelect } from './shared'

function isDuplicate(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === '23505'
}

/** Stats → My metrics (design/progress.png): cards, chart, facts, Log a value, entries, New metric. */
export default function MetricsTab() {
  const { today } = useUserToday()
  const years = statsYears(today)
  const [rawYear, setYear] = useParam('year')
  const year = pickYear(rawYear, years)
  const [rawMetric, setMetric] = useParam('metric')
  const [mode, setMode] = useState<MetricChartMode>('running')
  const [compare, setCompare] = useState(true)
  const [newOpen, setNewOpen] = useState(false)

  const metrics = useMetrics()
  const allEntries = useAllMetricEntries([year - 1, year])
  const selected = metrics.data?.find((m) => m.id === rawMetric) ?? metrics.data?.[0]
  // The selected metric's own query updates instantly when a value is logged.
  const entries = useMetricEntries(selected?.id, [year - 1, year])
  const logValue = useLogValue()
  const createMetric = useCreateMetric()

  const cards = useMemo(() => {
    if (!metrics.data || !allEntries.data) return null
    return metrics.data.map((m) =>
      metricCard(m, m.id === selected?.id && entries.data ? entries.data : allEntries.data.filter((e) => e.metric_id === m.id), year, today),
    )
  }, [metrics.data, allEntries.data, entries.data, selected?.id, year, today])

  const view = useMemo(
    () => (selected && entries.data ? metricView(selected, entries.data, year, today) : null),
    [selected, entries.data, year, today],
  )

  const failed = metrics.isError || allEntries.isError || entries.isError
  const months = logMonths(year, today)
  const defaultMonth = months[0] ?? `${year}-12`

  return (
    <>
      <PageHeader
        eyebrow={`Your whole year at a glance · 1 Jan – 31 Dec ${year}`}
        title="Stats"
        actions={<YearSelect value={year} years={years} onChange={(y) => setYear(y === years[0] ? null : String(y))} />}
      />
      <Tabs />
      <p className="mb-4 text-sm text-ink-2">
        Numbers you write down yourself — money, trainings, hours, anything. Log a value, and the chart shows how the year
        adds up and whether it is speeding up or slowing down.
      </p>

      {failed ? (
        <LoadError
          title="Couldn't load your metrics"
          onRetry={() => {
            void metrics.refetch()
            void allEntries.refetch()
            void entries.refetch()
          }}
        />
      ) : !cards ? (
        <Loading label="Loading your metrics…" />
      ) : (
        <div className="flex flex-col gap-4">
          <MetricCards metrics={cards} selectedId={selected?.id ?? null} onSelect={(id) => setMetric(id)} onNew={() => setNewOpen(true)} />

          {!selected ? (
            <EmptyState title="No metrics yet" description="Add something you want to count — money, trainings, hours, anything.">
              <Button onClick={() => setNewOpen(true)}>New metric</Button>
            </EmptyState>
          ) : !view ? (
            <Loading label={`Loading ${selected.name}…`} />
          ) : (
            <>
              <MetricChart
                name={selected.name}
                year={year}
                unit={selected.unit}
                months={view.months}
                lastYear={view.lastYear}
                forecast={view.forecast}
                goal={selected.yearly_goal}
                mode={mode}
                onModeChange={setMode}
                compare={compare}
                onCompareChange={setCompare}
              />
              <MetricFacts facts={view.facts} />
              <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
                <div className="self-start">
                  <LogValueForm
                    key={`${selected.id}-${year}`}
                    unit={selected.unit}
                    months={months}
                    defaultMonth={defaultMonth}
                    existing={view.existing}
                    onSubmit={async (values) => {
                      try {
                        await logValue.mutateAsync({ metricId: selected.id, values })
                      } catch (error) {
                        throw new Error("Couldn't save the value. Check your connection and try again.", { cause: error })
                      }
                      toast.success(`Saved ${monthName(values.month)} for ${selected.name}`)
                    }}
                  />
                </div>
                <EntriesTable rows={view.months} unit={selected.unit} />
              </div>
            </>
          )}
        </div>
      )}

      <NewMetricDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        onSubmit={async (values) => {
          try {
            const row = await createMetric.mutateAsync(values)
            setMetric(row.id)
            setNewOpen(false)
            toast.success(`Added ${row.name}`)
          } catch (error) {
            throw new Error(isDuplicate(error) ? 'You already have a metric with that name.' : "Couldn't add the metric. Try again.", { cause: error })
          }
        }}
      />
    </>
  )
}
