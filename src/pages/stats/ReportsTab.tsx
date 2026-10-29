import { Loader2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useContacts } from '@/api/contacts'
import { useMetrics } from '@/api/metrics'
import { useRoutineItems } from '@/api/routine'
import { useOutreachFunnel, useReplyRates, useRoutineDays, useTasksByTag } from '@/api/stats'
import { shareCardImage } from '@/app/shareImage'
import { useAllMetricEntries } from '@/app/statsQueries'
import { buildReportInput, reportRanges } from '@/app/statsReports'
import { useUserToday } from '@/app/useUserToday'
import { PageHeader } from '@/components/PageHeader'
import { GoalStatuses } from '@/components/reports/GoalStatuses'
import { Highlights } from '@/components/reports/Highlights'
import { KeyNumbers } from '@/components/reports/KeyNumbers'
import { Lessons } from '@/components/reports/Lessons'
import { ReportLayout } from '@/components/reports/ReportLayout'
import { ReportPeriodToggle } from '@/components/reports/ReportPeriodToggle'
import { RoutineConsistency } from '@/components/reports/RoutineConsistency'
import { ShareCard } from '@/components/reports/ShareCard'
import { Button } from '@/components/ui/button'
import { monthReport, yearReport } from '@/lib/reports'
import { useParam } from './params'
import { LoadError, Loading, Tabs } from './shared'

/** Stats → Reports (design/reports.png): month / year so far, share card, highlights, key numbers, routine. */
export default function ReportsTab() {
  const { today, timeZone } = useUserToday()
  const [rawPeriod, setPeriod] = useParam('period')
  const kind = rawPeriod === 'year' ? 'year' : 'month'
  const ranges = useMemo(() => reportRanges(kind, today), [kind, today])
  const [sharing, setSharing] = useState(false)

  const tagsNow = useTasksByTag(ranges.current.from, ranges.current.to)
  const tagsBefore = useTasksByTag(ranges.previous.from, ranges.previous.to)
  const repliesNow = useReplyRates(ranges.current.from, ranges.current.to)
  const repliesBefore = useReplyRates(ranges.previous.from, ranges.previous.to)
  const funnelNow = useOutreachFunnel(ranges.current.from, ranges.current.to)
  const funnelBefore = useOutreachFunnel(ranges.previous.from, ranges.previous.to)
  const contacts = useContacts()
  const routineItems = useRoutineItems()
  const routineDays = useRoutineDays(ranges.previous.from, today)
  const metrics = useMetrics()
  const entries = useAllMetricEntries([ranges.year - 1, ranges.year])
  const queries = [tagsNow, tagsBefore, repliesNow, repliesBefore, funnelNow, funnelBefore, contacts, routineItems, routineDays, metrics, entries]

  const report = useMemo(() => {
    if (
      !tagsNow.data ||
      !tagsBefore.data ||
      !repliesNow.data ||
      !repliesBefore.data ||
      !funnelNow.data ||
      !funnelBefore.data ||
      !contacts.data ||
      !routineItems.data ||
      !routineDays.data ||
      !metrics.data ||
      !entries.data
    ) {
      return null
    }
    const input = buildReportInput({
      ranges,
      today,
      timeZone,
      current: { tags: tagsNow.data, replies: repliesNow.data, funnel: funnelNow.data },
      previous: { tags: tagsBefore.data, replies: repliesBefore.data, funnel: funnelBefore.data },
      contacts: contacts.data,
      routineItems: routineItems.data,
      routineDays: routineDays.data,
      metrics: metrics.data,
      entries: entries.data,
    })
    return kind === 'month' ? monthReport(ranges.month, input) : yearReport(ranges.year, input)
  }, [
    kind,
    ranges,
    today,
    timeZone,
    tagsNow.data,
    tagsBefore.data,
    repliesNow.data,
    repliesBefore.data,
    funnelNow.data,
    funnelBefore.data,
    contacts.data,
    routineItems.data,
    routineDays.data,
    metrics.data,
    entries.data,
  ])

  async function share() {
    if (!report) return
    setSharing(true)
    try {
      const result = await shareCardImage(report.share)
      if (result === 'downloaded') toast.success('Image saved to your downloads')
    } catch {
      toast.error("Couldn't make the image. Try again.")
    } finally {
      setSharing(false)
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Made automatically at the end of every month and year"
        title="Stats"
        actions={
          <>
            <ReportPeriodToggle
              value={kind}
              monthLabel={ranges.monthLabel}
              yearLabel={ranges.yearLabel}
              onChange={(value) => setPeriod(value === 'year' ? 'year' : null)}
            />
            <Button variant="outline" className="bg-card print:hidden" disabled={!report} onClick={() => window.print()}>
              Download PDF
            </Button>
            <Button className="print:hidden" disabled={!report || sharing} onClick={() => void share()}>
              {sharing && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              Share image
            </Button>
          </>
        }
      />
      <Tabs />
      {queries.some((q) => q.isError) ? (
        <LoadError
          title="Couldn't load your report"
          onRetry={() => {
            for (const q of queries) void q.refetch()
          }}
        />
      ) : !report ? (
        <Loading label="Building your report…" />
      ) : (
        <ReportLayout
          share={<ShareCard share={report.share} />}
          highlights={<Highlights highlights={report.highlights} />}
          keyNumbers={<KeyNumbers numbers={report.keyNumbers} previousLabel={report.previousLabel} />}
          routine={<RoutineConsistency routine={report.routine} />}
          goals={<GoalStatuses />}
          lessons={<Lessons lessons={[]} />}
        />
      )}
    </>
  )
}
