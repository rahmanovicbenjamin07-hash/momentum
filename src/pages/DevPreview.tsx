import { useRef, useState, type ReactNode } from 'react'
import { ContactLayout } from '@/components/contact/ContactLayout'
import { ContactBreadcrumb, ContactSummary } from '@/components/contact/ContactSummary'
import { DetailsList } from '@/components/contact/DetailsList'
import { LinkedTasks } from '@/components/contact/LinkedTasks'
import { LogTouchForm, type LogTouchFormHandle } from '@/components/contact/LogTouchForm'
import { NotesCard } from '@/components/contact/NotesCard'
import { StageStepper } from '@/components/contact/StageStepper'
import { Timeline } from '@/components/contact/Timeline'
import { WonPanel } from '@/components/contact/WonPanel'
import { addDays } from '@/lib/dates'
import { SENT_TOUCH_FOLLOW_UP_DAYS } from '@/lib/outreach'
import type { Contact, Touch } from '@/schemas/outreach'
import { toast } from 'sonner'
import { LoginCard } from '@/components/auth/LoginCard'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { Flame } from '@/components/streak/Flame'
import { StreakCard } from '@/components/streak/StreakCard'
import { StreakMini } from '@/components/streak/StreakMini'
import { DailyNoteCard } from '@/components/today/DailyNoteCard'
import { OutreachWeekCard } from '@/components/today/OutreachWeekCard'
import { ProgressCard } from '@/components/today/ProgressCard'
import { ThisWeekCard } from '@/components/today/ThisWeekCard'
import { TodayHeader } from '@/components/today/TodayHeader'
import { TodayLayout } from '@/components/today/TodayLayout'
import { MissedYesterday } from '@/components/today/MissedYesterday'
import { OverdueBlock } from '@/components/today/OverdueBlock'
import { QuickAddBar } from '@/components/today/QuickAddBar'
import { TodayTasksCard } from '@/components/today/TodayTasksCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { STREAK_LEVELS } from '@/lib/streak-levels'
import { dayIndex, toDateKey } from '@/lib/dates'
import { todayProgress } from '@/lib/progress'
import { toHHMM } from '@/lib/today-list'
import { AddLeadForm } from '@/components/outreach/AddLeadForm'
import { ContactsTable } from '@/components/outreach/ContactsTable'
import { CsvImportDialog, type CsvPreview } from '@/components/outreach/CsvImportDialog'
import { FollowUpText } from '@/components/outreach/FollowUpText'
import { PipelineBoard } from '@/components/outreach/PipelineBoard'
import { TemplatesDialog } from '@/components/outreach/TemplatesDialog'
import { findDuplicate } from '@/lib/outreach'
import type { AddLeadFormInput } from '@/schemas/outreach'
import { LEAD_SOURCES, LEAD_STAGES, type SourceFilterValue, type StageFilterValue } from '@/components/outreach/meta'
import { OutreachHeader, type OutreachView } from '@/components/outreach/OutreachHeader'
import { OutreachToolbar } from '@/components/outreach/OutreachToolbar'
import { SourceChip } from '@/components/outreach/SourceChip'
import { SourceFilter } from '@/components/outreach/SourceFilter'
import { StageCounts } from '@/components/outreach/StageCounts'
import { StagePill } from '@/components/outreach/StagePill'
import {
  MOCK_OUTREACH_TODAY,
  mockContactDetail,
  mockContacts,
  mockLinkedTasks,
  mockTouches,
  mockWonContact,
  mockCsvPreview,
  mockTemplates,
  mockFollowUps,
  mockOutreachSummary,
  mockSourceCounts,
  mockStageCounts,
} from '@/mocks/outreach'
import { mockSidebar, mockUnreadCount, mockUser } from '@/mocks/shell'
import { CompletionLineChart } from '@/components/stats/CompletionLineChart'
import { ConsistencyHeatmap } from '@/components/stats/ConsistencyHeatmap'
import { FunnelBars } from '@/components/stats/FunnelBars'
import { KpiCard } from '@/components/stats/KpiCard'
import type { StatsRange } from '@/components/stats/meta'
import { RangeToggle } from '@/components/stats/RangeToggle'
import { ReplyRateBars } from '@/components/stats/ReplyRateBars'
import { StatsTabs } from '@/components/stats/StatsTabs'
import { InsightsCard } from '@/components/stats/InsightsCard'
import { RevenueCard } from '@/components/stats/RevenueCard'
import { TagBars } from '@/components/stats/TagBars'
import { TemplatesTable } from '@/components/stats/TemplatesTable'
import { EntriesTable } from '@/components/metrics/EntriesTable'
import { LogValueForm } from '@/components/metrics/LogValueForm'
import { MetricCards } from '@/components/metrics/MetricCards'
import { MetricChart, type MetricChartMode } from '@/components/metrics/MetricChart'
import { MetricFacts } from '@/components/metrics/MetricFacts'
import { NewMetricDialog } from '@/components/metrics/NewMetricDialog'
import {
  MOCK_CURRENT_MONTH,
  MOCK_METRICS_YEAR,
  mockExisting,
  mockLogMonths,
  mockMetricCards,
  mockMoneyFacts,
  mockMoneyForecast,
  mockMoneyGoal,
  mockMoneyLastYear,
  mockMoneyMonths,
} from '@/mocks/metrics'
import { MissReasonsBars } from '@/components/routine/MissReasonsBars'
import { MonthTable } from '@/components/routine/MonthTable'
import { RoutineChart, type RoutineChartMode } from '@/components/routine/RoutineChart'
import { RoutineFacts } from '@/components/routine/RoutineFacts'
import { RoutineItemCards } from '@/components/routine/RoutineItemCards'
import { GoalStatuses } from '@/components/reports/GoalStatuses'
import { Highlights } from '@/components/reports/Highlights'
import { KeyNumbers } from '@/components/reports/KeyNumbers'
import { Lessons } from '@/components/reports/Lessons'
import { ReportLayout } from '@/components/reports/ReportLayout'
import { ReportPeriodToggle, type ReportKind } from '@/components/reports/ReportPeriodToggle'
import { RoutineConsistency } from '@/components/reports/RoutineConsistency'
import { ShareCard } from '@/components/reports/ShareCard'
import { mockGoalStatuses, mockLessons, mockMonthReport, mockYearReport } from '@/mocks/reports'
import { MOCK_ROUTINE_MONTH, MOCK_ROUTINE_YEAR, mockRoutineCards, mockWakeUpStats } from '@/mocks/routine'
import {
  MOCK_STATS_TODAY,
  mockCompletion,
  mockCompletionWithGaps,
  mockConsistency,
  mockConsistencyInsight,
  mockFunnel,
  mockInsights,
  mockKpis,
  mockReplyRates,
  mockRevenue,
  mockStatsSummary,
  mockTagCounts,
  mockTemplateStats,
} from '@/mocks/stats'
import {
  MOCK_TODAY,
  mockMissedYesterday,
  mockOverdueTasks,
  mockRoutineItems,
  mockDailyLog,
  mockOutreachWeek,
  mockTodayItems,
  mockWeekProgress,
} from '@/mocks/today'

/**
 * Development-only gallery (/dev). Every UI component is shown here with mock data.
 * Not included in production builds.
 */

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="mb-3 text-xs font-semibold tracking-wider text-ink-3 uppercase">{title}</h2>
      {children}
    </section>
  )
}

const log = (label: string) => (value?: unknown) =>
  toast(`${label}${value === undefined ? '' : `: ${JSON.stringify(value)}`}`)

const sampleDate = new Date('2026-10-28T10:00:00Z')

/** Dashed box standing in for a card that a later step builds. */
function Placeholder({ label, className = 'h-24' }: { label: string; className?: string }) {
  return (
    <div className={`grid place-items-center rounded-xl border border-dashed border-border bg-card text-xs text-ink-3 ${className}`}>
      {label}
    </div>
  )
}

/** "1–9 days", "100+ days" … from the level's minimum and the next level's minimum. */
const STREAK_EXAMPLES = [
  [0, '0 days · no streak yet'],
  [5, '1–9 days · Spark (yellow)'],
  [18, '10–29 days · Flame (orange)'],
  [42, '30–59 days · Blaze (red)'],
  [75, '60–99 days · Inferno (purple)'],
  [120, '100+ days · Legend (blue)'],
] as const

/** Daily note with energy kept in local state; saves show as toasts. */
function NoteDemo() {
  const [energy, setEnergy] = useState<number | null>(mockDailyLog.energy)
  return (
    <DailyNoteCard
      note={mockDailyLog.note}
      energy={energy}
      onSaveNote={(note) => log('note saved')(note)}
      onEnergyChange={(value) => {
        setEnergy(value)
        log('energy')(value)
      }}
    />
  )
}

function levelRange(minDays: number, nextMinDays: number | undefined) {
  if (nextMinDays === undefined) return `${minDays}+ days`
  if (nextMinDays - 1 === minDays) return `${minDays} days`
  return `${minDays}–${nextMinDays - 1} days`
}

/** TodayTasksCard with mock data kept in local state, so ticking and editing feel real. */
function TasksDemo() {
  const [items, setItems] = useState(mockTodayItems)
  const [routineItems, setRoutineItems] = useState(mockRoutineItems)
  // Mock "today" is Wednesday 28 Oct 2026.
  const today = dayIndex(toDateKey(sampleDate))

  return (
    <TodayTasksCard
      items={items}
      routineItems={routineItems}
      onToggle={(item, done) => setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, done } : i)))}
      onChangeDays={(id, days) => {
        setRoutineItems((prev) => prev.map((r) => (r.id === id ? { ...r, days } : r)))
        setItems((prev) => {
          const routine = routineItems.find((r) => r.id === id)
          const listed = prev.some((i) => i.id === id)
          if (!days[today]) return prev.filter((i) => i.id !== id)
          if (listed || !routine) return prev.map((i) => (i.id === id ? { ...i, days } : i))
          return [...prev, { kind: 'routine', id, title: routine.title, time: toHHMM(routine.time), done: false, days }]
        })
        log('days')({ id, days })
      }}
      onChangeTime={(id, time) => {
        setRoutineItems((prev) => prev.map((r) => (r.id === id ? { ...r, time } : r)))
        setItems((prev) => prev.map((i) => (i.id === id ? { ...i, time } : i)))
        log('time')({ id, time })
      }}
      onRemove={(id) => {
        setRoutineItems((prev) => prev.filter((r) => r.id !== id))
        setItems((prev) => prev.filter((i) => i.id !== id))
        log('remove')(id)
      }}
    />
  )
}

/** Quick-add bar + missed-yesterday + overdue, with local state and a reset button. */
function PromptsDemo() {
  const [missed, setMissed] = useState(mockMissedYesterday)
  const [overdue, setOverdue] = useState(mockOverdueTasks)

  return (
    <div className="flex max-w-[830px] flex-col gap-4">
      <QuickAddBar
        onSubmit={async (result) => {
          await new Promise((resolve) => setTimeout(resolve, 300))
          if (result.title.includes('fail')) throw new Error("Couldn't save. Check your connection and try again.")
          log('add')(result)
        }}
      />
      <MissedYesterday
        items={missed}
        streakSafe
        onReason={(item, reason) => {
          setMissed((prev) => prev.filter((m) => m.id !== item.id))
          log('reason')({ title: item.title, reason })
        }}
        onDismiss={() => setMissed([])}
      />
      <OverdueBlock
        tasks={overdue}
        today={MOCK_TODAY}
        onMoveToToday={(task) => {
          setOverdue((prev) => prev.filter((t) => t.id !== task.id))
          log('move to today')(task.title)
        }}
        onDrop={(task) => {
          setOverdue((prev) => prev.filter((t) => t.id !== task.id))
          log('drop')(task.title)
        }}
      />
      <Button
        variant="outline"
        className="w-fit bg-card"
        onClick={() => {
          setMissed(mockMissedYesterday)
          setOverdue(mockOverdueTasks)
        }}
      >
        Reset prompts
      </Button>
    </div>
  )
}

/** Outreach header + filters + toolbar with local state, so clicks and typing feel real. */
function OutreachControlsDemo() {
  const [view, setView] = useState<OutreachView>('table')
  const [source, setSource] = useState<SourceFilterValue>('all')
  const [stage, setStage] = useState<StageFilterValue>('all')
  const [search, setSearch] = useState('')
  const [followUpDue, setFollowUpDue] = useState(false)

  return (
    <div className="flex flex-col gap-4">
      <OutreachHeader
        {...mockOutreachSummary}
        view={view}
        onViewChange={(v) => {
          setView(v)
          log('view')(v)
        }}
        onTemplates={log('templates')}
        onImportCsv={log('import CSV')}
        onAddLead={log('add lead')}
      />
      <SourceFilter counts={mockSourceCounts} value={source} onChange={setSource} />
      <StageCounts counts={mockStageCounts} value={stage} onChange={setStage} />
      <OutreachToolbar
        search={search}
        onSearchChange={setSearch}
        followUpDue={followUpDue}
        onFollowUpDueChange={setFollowUpDue}
      />
      <p className="text-xs text-ink-3">
        State: view={view} · source={source} · stage={stage} · search=&quot;{search}&quot; · followUpDue={String(followUpDue)}
      </p>
    </div>
  )
}

/** Board with local state, so dragging really moves cards. */
function BoardDemo() {
  const [contacts, setContacts] = useState(mockContacts)
  return (
    <PipelineBoard
      contacts={contacts}
      today={MOCK_OUTREACH_TODAY}
      onMove={(id, stage) => {
        setContacts((prev) => prev.map((c) => (c.id === id ? { ...c, stage } : c)))
        log('move')({ id, stage })
      }}
    />
  )
}

/** Add lead form with a live duplicate check against the mock leads. */
function AddLeadDemo() {
  const [open, setOpen] = useState(true)
  const [draft, setDraft] = useState<Partial<AddLeadFormInput>>({})
  const duplicate = findDuplicate(draft as Parameters<typeof findDuplicate>[0], mockContacts)

  if (!open) {
    return (
      <Button variant="outline" className="bg-card" onClick={() => setOpen(true)}>
        Open Add lead again
      </Button>
    )
  }
  return (
    <AddLeadForm
      defaultSource="maps"
      onDraftChange={setDraft}
      duplicateWarning={
        duplicate && (
          <>
            <strong>{duplicate.contact.name}</strong> already has this {duplicate.field === 'email' ? 'email' : 'link'}. You can
            still save it.
          </>
        )
      }
      onCancel={() => setOpen(false)}
      onSubmit={async (values) => {
        await new Promise((resolve) => setTimeout(resolve, 300))
        if (JSON.stringify(values).includes('fail')) throw new Error("Couldn't save. Check your connection and try again.")
        log('save lead')(values)
        setOpen(false)
      }}
    />
  )
}

/** Buttons that open the Templates and Import CSV dialogs. */
function OutreachDialogsDemo() {
  const [templatesOpen, setTemplatesOpen] = useState(false)
  const [templates, setTemplates] = useState(mockTemplates)
  const [csvOpen, setCsvOpen] = useState(false)
  const [csvPreview, setCsvPreview] = useState<CsvPreview | null>(null)
  const [parsing, setParsing] = useState(false)

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" className="bg-card" onClick={() => setTemplatesOpen(true)}>
        Templates
      </Button>
      <Button variant="outline" className="bg-card" onClick={() => setCsvOpen(true)}>
        Import CSV
      </Button>
      <TemplatesDialog
        open={templatesOpen}
        onOpenChange={setTemplatesOpen}
        templates={templates}
        onSave={async (values, id) => {
          await new Promise((resolve) => setTimeout(resolve, 300))
          const row = { name: values.name, channel: values.channel ?? null, body: values.body }
          setTemplates((prev) =>
            id ? prev.map((t) => (t.id === id ? { ...t, ...row } : t)) : [...prev, { id: crypto.randomUUID(), ...row }],
          )
          log('template saved')(values.name)
        }}
      />
      <CsvImportDialog
        open={csvOpen}
        onOpenChange={(next) => {
          setCsvOpen(next)
          if (!next) setCsvPreview(null)
        }}
        preview={csvPreview}
        parsing={parsing}
        onFileSelect={(file) => {
          // Any file shows the same mock preview here; the real parsing comes from [LOGIC].
          setParsing(true)
          setTimeout(() => {
            setParsing(false)
            setCsvPreview(mockCsvPreview)
            log('file')(file.name)
          }, 400)
        }}
        onImport={async () => {
          await new Promise((resolve) => setTimeout(resolve, 400))
          log('imported')(csvPreview?.rows.length)
          setCsvOpen(false)
          setCsvPreview(null)
        }}
      />
    </div>
  )
}

/** Whole contact page with local state: click stages (Won shows the deal panel), log touches, tick notes and tasks. */
function ContactPageDemo({ initial }: { initial: Contact }) {
  const [contact, setContact] = useState(initial)
  const [touches, setTouches] = useState<Touch[]>(mockTouches)
  const [tasks, setTasks] = useState(mockLinkedTasks)
  const touchForm = useRef<LogTouchFormHandle>(null)
  const newest = [...touches].sort((a, b) => Date.parse(b.occurred_at) - Date.parse(a.occurred_at))[0] ?? null
  const wait = () => new Promise((resolve) => setTimeout(resolve, 300))

  return (
    <ContactLayout
      header={
        <>
          <ContactBreadcrumb name={contact.name} />
          <ContactSummary
            contact={contact}
            onLogTouch={() => touchForm.current?.focusMessage()}
            onUseTemplate={() => touchForm.current?.focusTemplate()}
            onAddTask={log('add task')}
            onEdit={log('edit details')}
            onMarkLost={() => setContact((c) => ({ ...c, stage: 'lost' }))}
            onDelete={log('delete lead')}
          >
            <StageStepper
              stage={contact.stage}
              onChange={(stage) => {
                setContact((c) => ({ ...c, stage }))
                log('stage')(stage)
              }}
            />
            {contact.stage === 'won' && (
              <WonPanel
                contact={contact}
                today={MOCK_OUTREACH_TODAY}
                onSave={async (values) => {
                  await wait()
                  setContact((c) => ({ ...c, won_amount: values.amount, won_month: `${values.month}-01` }))
                  log('deal saved')(values)
                }}
              />
            )}
          </ContactSummary>
        </>
      }
      aside={
        <>
          <DetailsList contact={contact} lastTouch={newest} today={MOCK_OUTREACH_TODAY} />
          <NotesCard
            notes={contact.notes}
            onSave={async (drafts) => {
              await wait()
              if (drafts.some((d) => d.body.includes('fail'))) throw new Error("Couldn't save. Check your connection and try again.")
              const now = new Date().toISOString()
              setContact((c) => ({
                ...c,
                notes: drafts.map((d) => c.notes.find((n) => n.id === d.id && n.body === d.body) ?? {
                  id: d.id ?? crypto.randomUUID(),
                  body: d.body,
                  created_at: c.notes.find((n) => n.id === d.id)?.created_at ?? now,
                }),
              }))
            }}
          />
          <LinkedTasks
            tasks={tasks}
            today={MOCK_OUTREACH_TODAY}
            onToggle={(task, done) =>
              setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: done ? 'done' : 'todo' } : t)))
            }
            onAddTask={log('add task')}
          />
        </>
      }
      main={
        <>
          <LogTouchForm
            ref={touchForm}
            contactName={contact.name}
            defaultChannel={contact.channel}
            templates={mockTemplates}
            onSubmit={async (values) => {
              await wait()
              if (values.body?.includes('fail')) throw new Error("Couldn't save. Check your connection and try again.")
              const now = new Date().toISOString()
              setTouches((prev) => [
                ...prev,
                {
                  id: crypto.randomUUID(),
                  user_id: contact.user_id,
                  created_at: now,
                  contact_id: contact.id,
                  occurred_at: now,
                  channel: values.channel,
                  direction: values.direction,
                  template_id: values.template_id ?? null,
                  body: values.body ?? null,
                  got_reply: values.got_reply,
                },
              ])
              if (values.direction === 'sent') {
                setContact((c) => ({ ...c, next_follow_up: addDays(MOCK_OUTREACH_TODAY, SENT_TOUCH_FOLLOW_UP_DAYS) }))
              }
            }}
          />
          <Timeline touches={touches} templates={mockTemplates} today={MOCK_OUTREACH_TODAY} />
        </>
      }
    />
  )
}

/** Routine progress tab with local state: pick a card, switch chart mode, toggle the perfect year. */
function RoutineDemo() {
  const [selected, setSelected] = useState<string | null>('r-wake')
  const [mode, setMode] = useState<RoutineChartMode>('running')
  const [showPerfect, setShowPerfect] = useState(true)
  return (
    <div className="flex flex-col gap-4">
      <RoutineItemCards items={mockRoutineCards} selectedId={selected} onSelect={setSelected} />
      <RoutineChart
        title="Wake up at 06:00 · Mon–Fri"
        year={MOCK_ROUTINE_YEAR}
        months={mockWakeUpStats.months}
        perfectLine={mockWakeUpStats.perfectLine}
        forecast={mockWakeUpStats.forecast?.line ?? null}
        mode={mode}
        onModeChange={setMode}
        showPerfect={showPerfect}
        onShowPerfectChange={setShowPerfect}
      />
      <RoutineFacts stats={mockWakeUpStats} currentMonth={MOCK_ROUTINE_MONTH} />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
        <div className="self-start">
          <MissReasonsBars reasons={mockWakeUpStats.missReasons} pattern={mockWakeUpStats.missWeekday?.sentence} />
        </div>
        <MonthTable months={mockWakeUpStats.months} />
      </div>
    </div>
  )
}

/** Reports tab: Month / Year toggle, Download PDF (prints), Share image (logs), and the report. */
function ReportsDemo() {
  const [kind, setKind] = useState<ReportKind>('month')
  const report = kind === 'month' ? mockMonthReport : mockYearReport
  return (
    <>
      <PageHeader
        eyebrow="Made automatically at the end of every month and year"
        title="Stats"
        actions={
          <>
            <ReportPeriodToggle value={kind} monthLabel="October 2026" yearLabel="2026 so far" onChange={setKind} />
            <Button variant="outline" className="bg-card print:hidden" onClick={() => window.print()}>
              Download PDF
            </Button>
            <Button className="print:hidden" onClick={log('share image')}>
              Share image
            </Button>
          </>
        }
      />
      <ReportLayout
        share={<ShareCard share={report.share} />}
        highlights={<Highlights highlights={report.highlights} />}
        keyNumbers={<KeyNumbers numbers={report.keyNumbers} previousLabel={report.previousLabel} />}
        routine={<RoutineConsistency routine={report.routine} />}
        goals={<GoalStatuses goals={mockGoalStatuses} />}
        lessons={<Lessons lessons={mockLessons} />}
      />
    </>
  )
}

/** My metrics tab with local state: pick a card, switch chart mode, compare, new metric, log a value. */
function MetricsDemo() {
  const [selected, setSelected] = useState<string | null>('m-money')
  const [mode, setMode] = useState<MetricChartMode>('running')
  const [compare, setCompare] = useState(true)
  const [newOpen, setNewOpen] = useState(false)
  const wait = () => new Promise((resolve) => setTimeout(resolve, 300))

  return (
    <div className="flex flex-col gap-4">
      <MetricCards metrics={mockMetricCards} selectedId={selected} onSelect={setSelected} onNew={() => setNewOpen(true)} />
      <MetricChart
        name="Money earned"
        year={MOCK_METRICS_YEAR}
        unit="eur"
        months={mockMoneyMonths}
        lastYear={mockMoneyLastYear}
        forecast={mockMoneyForecast}
        goal={mockMoneyGoal}
        mode={mode}
        onModeChange={setMode}
        compare={compare}
        onCompareChange={setCompare}
      />
      <MetricFacts facts={mockMoneyFacts} />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
        <div className="self-start">
          <LogValueForm
            unit="eur"
            months={mockLogMonths}
            defaultMonth={MOCK_CURRENT_MONTH}
            existing={mockExisting}
            onSubmit={async (values) => {
              await wait()
              if (values.note?.includes('fail')) throw new Error("Couldn't save. Check your connection and try again.")
              log('entry saved')(values)
            }}
          />
        </div>
        <EntriesTable rows={mockMoneyMonths} unit="eur" />
      </div>
      <NewMetricDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        onSubmit={async (values) => {
          await wait()
          log('metric created')(values)
          setNewOpen(false)
        }}
      />
    </div>
  )
}

/** Stats page top: summary line, title, range toggle, Export CSV, tabs and the six KPI cards. */
function StatsHeaderDemo() {
  const [range, setRange] = useState<StatsRange>(30)
  return (
    <>
      <PageHeader
        eyebrow={mockStatsSummary.replace('30', String(range))}
        title="Stats"
        actions={
          <>
            <RangeToggle
              value={range}
              onChange={(value) => {
                setRange(value)
                log('range')(value)
              }}
            />
            <Button variant="outline" className="bg-card" onClick={log('export CSV')}>
              Export CSV
            </Button>
          </>
        }
      />
      <StatsTabs search={`?range=${range}`} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {mockKpis.map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} />
        ))}
      </div>
    </>
  )
}

const swatches = [
  ['Page', 'bg-background'],
  ['Card', 'bg-card'],
  ['Border', 'bg-border'],
  ['Text', 'bg-foreground'],
  ['Text 2', 'bg-ink-2'],
  ['Text 3', 'bg-ink-3'],
  ['Accent', 'bg-brand'],
  ['Accent tint', 'bg-brand-tint'],
  ['Top bar', 'bg-topbar'],
  ['Good', 'bg-good'],
  ['Warn', 'bg-warn'],
  ['Bad', 'bg-bad'],
  ['Info', 'bg-info'],
] as const

export default function DevPreview() {
  return (
    <div className="min-h-svh bg-background">
      <div className="mx-auto max-w-[1200px] px-4 py-8 md:px-8">
        <PageHeader eyebrow="Development only" title="Component preview" />

        <Section title="TopBar">
          <div className="overflow-hidden rounded-xl border border-border">
            <TopBar
              user={mockUser}
              unreadCount={mockUnreadCount}
              onSearch={log('search')}
              onNew={log('new')}
              onNotifications={log('notifications')}
              onSignOut={log('sign out')}
            />
          </div>
        </Section>

        <Section title="Sidebar (with badges and streak / empty)">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="overflow-hidden rounded-xl border border-border">
              <Sidebar {...mockSidebar} />
            </div>
            <div className="overflow-hidden rounded-xl border border-border">
              <Sidebar />
            </div>
          </div>
        </Section>

        <Section title="PageHeader">
          <div className="rounded-xl border border-dashed border-border p-4">
            <PageHeader
              eyebrow="Wednesday, 28 October 2026"
              title="Today"
              actions={
                <>
                  <Button variant="outline">Today</Button>
                  <Button variant="outline">Week view</Button>
                </>
              }
            />
          </div>
        </Section>

        <Section title="TodayHeader">
          <div className="rounded-xl border border-dashed border-border p-4">
            <TodayHeader
              date={sampleDate}
              onPrevDay={log('previous day')}
              onToday={log('today')}
              onNextDay={log('next day')}
              onWeekView={log('week view')}
            />
          </div>
        </Section>

        <Section title="TodayLayout with the cards (narrow the window: aside drops under main below 1024px; type in the note)">
          <div className="rounded-xl border border-dashed border-border p-4">
            <TodayLayout
              topCards={
                <>
                  <ProgressCard progress={todayProgress(mockTodayItems)} />
                  <StreakCard days={12} />
                  <OutreachWeekCard {...mockOutreachWeek} />
                </>
              }
              quickAdd={<Placeholder label="Quick add (see the demo below)" className="h-20" />}
              main={<Placeholder label="Missed yesterday, overdue and today's tasks (see the demos below)" className="h-64" />}
              aside={
                <>
                  <ThisWeekCard week={mockWeekProgress} outreach={mockOutreachWeek} />
                  <NoteDemo />
                </>
              }
            />
          </div>
        </Section>

        <Section title="StreakCard (0, 5, 18, 42, 75, 120 days) and StreakMini">
          <div className="grid gap-x-4 gap-y-5 md:grid-cols-2 xl:grid-cols-3">
            {STREAK_EXAMPLES.map(([days, caption]) => (
              <figure key={days} className="flex flex-col gap-2">
                <StreakCard days={days} />
                <figcaption className="text-[13px] font-semibold text-ink-2">{caption}</figcaption>
              </figure>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            {STREAK_EXAMPLES.map(([days]) => (
              <div key={days} className="w-[196px] bg-card">
                <StreakMini days={days} />
              </div>
            ))}
          </div>
        </Section>

        <Section title="QuickAddBar, MissedYesterday, OverdueBlock (put 'fail' in a task to see an error)">
          <PromptsDemo />
        </Section>

        <Section title="TodayTasksCard (tick, filter, Edit repeating — changes stay until reload)">
          <div className="max-w-[830px]">
            <TasksDemo />
          </div>
        </Section>

        <Section title="Outreach: header, source filter, stage counts, toolbar (click and type)">
          <div className="rounded-xl border border-dashed border-border p-4">
            <OutreachControlsDemo />
          </div>
        </Section>

        <Section title="Outreach: AddLeadForm (switch source; paste https://novadental.ba as website to see the duplicate warning; 'fail' in a field shows an error)">
          <AddLeadDemo />
        </Section>

        <Section title="Outreach: Templates and Import CSV dialogs (any file shows the mock preview)">
          <OutreachDialogsDemo />
        </Section>

        <Section title="Outreach: ContactsTable (click a row → /outreach/:id)">
          <ContactsTable
            contacts={mockContacts}
            today={MOCK_OUTREACH_TODAY}
            footer={
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-ink-2">
                Showing 8 of 38
                <div className="flex gap-2">
                  <Button variant="outline">Previous</Button>
                  <Button variant="outline">Next</Button>
                </div>
              </div>
            }
          />
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <ContactsTable contacts={[]} today={MOCK_OUTREACH_TODAY} onAddLead={log('add lead')} />
            <ContactsTable contacts={[]} today={MOCK_OUTREACH_TODAY} filtered onClearFilters={log('clear filters')} />
          </div>
        </Section>

        <Section title="Outreach: PipelineBoard (drag a card; or Tab to a ⋮⋮ grip, Space, ← →, Space)">
          <BoardDemo />
        </Section>

        <Section title="Contact page (click a stage — Won opens the deal panel; log a touch; tick notes/tasks; 'fail' in a note or message shows an error)">
          <div className="rounded-xl border border-dashed border-border p-4">
            <ContactPageDemo initial={mockContactDetail} />
          </div>
        </Section>

        <Section title="Contact page: won (design/contact-won.png)">
          <div className="rounded-xl border border-dashed border-border p-4">
            <ContactPageDemo initial={mockWonContact} />
          </div>
        </Section>

        <Section title="Contact pieces: empty states">
          <div className="grid gap-4 md:grid-cols-3">
            <NotesCard notes={[]} onSave={(notes) => void log('notes')(notes)} />
            <LinkedTasks tasks={[]} today={MOCK_OUTREACH_TODAY} onAddTask={log('add task')} />
            <Timeline touches={[]} today={MOCK_OUTREACH_TODAY} />
          </div>
        </Section>

        <Section title="Outreach: SourceChip, StagePill, FollowUpText (today = 28 Oct 2026)">
          <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
            <div className="flex flex-wrap gap-2">
              {LEAD_SOURCES.map((s) => (
                <SourceChip key={s} source={s} />
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {LEAD_STAGES.map((s) => (
                <StagePill key={s} stage={s} />
              ))}
            </div>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:w-fit">
              {mockFollowUps.map(({ label, date }) => (
                <div key={label} className="contents">
                  <dt className="text-ink-2">{label}</dt>
                  <dd>
                    <FollowUpText date={date} today={MOCK_OUTREACH_TODAY} />
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </Section>

        <Section title="Stats: header, tabs, range toggle, KPI cards (tabs are real links)">
          <div className="rounded-xl border border-dashed border-border p-4">
            <StatsHeaderDemo />
          </div>
        </Section>

        <Section title="Stats: charts (hover the line, or Tab to it and use ← → Home End; hover heatmap squares)">
          <div className="flex flex-col gap-4">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
              <CompletionLineChart points={mockCompletion} />
              <ConsistencyHeatmap
                days={mockConsistency}
                today={MOCK_STATS_TODAY}
                insight={
                  <>
                    <strong className="font-semibold">Insight:</strong> {mockConsistencyInsight}
                  </>
                }
              />
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <FunnelBars steps={mockFunnel} caption="Last 30 days" />
              <ReplyRateBars rows={mockReplyRates} />
            </div>
          </div>
        </Section>

        <Section title="Stats: insights, revenue, templates table, completed by tag">
          <div className="flex flex-col gap-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <InsightsCard insights={mockInsights} />
              <RevenueCard {...mockRevenue} />
            </div>
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
              <TemplatesTable templates={mockTemplateStats} onManage={log('manage templates')} />
              <TagBars tags={mockTagCounts} />
            </div>
            <div className="grid gap-4 lg:grid-cols-4">
              <InsightsCard insights={[]} />
              <RevenueCard total={0} deals={0} perMessage={null} byChannel={[]} byTemplate={[]} />
              <TemplatesTable templates={[]} />
              <TagBars tags={[]} />
            </div>
          </div>
        </Section>

        <Section title="My metrics (click cards, switch Running total / Per month, hover or Tab + ← → on the chart, pick a logged month in the form, 'fail' in the note shows an error)">
          <div className="rounded-xl border border-dashed border-border p-4">
            <MetricsDemo />
          </div>
        </Section>

        <Section title="Routine progress (click cards, Running total / Per month, Show perfect year, hover or Tab + ← → on the chart)">
          <div className="rounded-xl border border-dashed border-border p-4">
            <RoutineDemo />
          </div>
        </Section>

        <Section title="Routine progress: empty states">
          <div className="grid gap-4 lg:grid-cols-3">
            <RoutineItemCards items={[]} selectedId={null} onSelect={log('select')} />
            <MissReasonsBars reasons={[]} />
            <MonthTable months={[]} />
          </div>
        </Section>

        <Section title="Reports (switch October 2026 / 2026 so far; Download PDF opens the print preview with only the report)">
          <div className="rounded-xl border border-dashed border-border p-4">
            <ReportsDemo />
          </div>
        </Section>

        <Section title="Reports: before Goals exist, and empty lists">
          <div className="grid gap-4 lg:grid-cols-3">
            <GoalStatuses />
            <Lessons lessons={[]} />
            <Highlights highlights={[]} />
          </div>
        </Section>

        <Section title="My metrics: empty states">
          <div className="grid gap-4 lg:grid-cols-2">
            <MetricChart
              name="Books read"
              year={MOCK_METRICS_YEAR}
              unit="count"
              months={[]}
              lastYear={[]}
              forecast={null}
              goal={null}
              mode="running"
              onModeChange={log('mode')}
              compare={false}
              onCompareChange={log('compare')}
            />
            <EntriesTable rows={[]} unit="count" />
          </div>
        </Section>

        <Section title="Stats: chart edge cases (days with nothing planned, empty data)">
          <div className="grid gap-4 lg:grid-cols-2">
            <CompletionLineChart points={mockCompletionWithGaps} title="Completion with gaps" />
            <CompletionLineChart points={[]} />
            <FunnelBars steps={[]} />
            <ReplyRateBars rows={[]} />
          </div>
        </Section>

        <Section title="Flame (all six streak levels)">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {STREAK_LEVELS.map((level, i) => (
              <div key={level.id} className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-4">
                <Flame level={level.id} />
                <p className="text-[13px] font-semibold text-foreground">{level.name}</p>
                <p className="text-xs text-ink-3">{levelRange(level.minDays, STREAK_LEVELS[i + 1]?.minDays)}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-end gap-4 rounded-xl border border-border bg-card p-4">
            <Flame level="flame" size={24} />
            <Flame level="flame" size={40} />
            <Flame level="flame" size={64} />
            <Flame level="legend" />
            <Flame level="legend" sparkles={false} />
            <span className="text-xs text-ink-3">Sizes 24 / 40 / 64 / 96 · Legend with and without sparkles</span>
          </div>
        </Section>

        <Section title="EmptyState">
          <EmptyState title="No contacts yet" description="Client outreach and follow-ups arrive in a later phase.">
            <Button>Add contact</Button>
          </EmptyState>
        </Section>

        <Section title="LoginCard (type an email with 'fail' to see an error)">
          <div className="grid place-items-center rounded-xl border border-dashed border-border py-8">
            <LoginCard
              onSendLink={async (email) => {
                await new Promise((resolve) => setTimeout(resolve, 600))
                if (email.includes('fail')) throw new Error('Too many sign-in emails were sent. Wait a few minutes and try again.')
              }}
              onGoogle={async () => {
                log('google')()
              }}
            />
          </div>
        </Section>

        <Section title="Colour tokens">
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 md:grid-cols-7">
            {swatches.map(([name, cls]) => (
              <div key={name} className="text-xs text-ink-2">
                <div className={`mb-1 h-10 rounded-lg border border-border ${cls}`} />
                {name}
              </div>
            ))}
          </div>
        </Section>

        <Section title="Primitives">
          <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
            <div className="flex flex-wrap gap-2">
              <Button>Add task</Button>
              <Button variant="outline">Move to today</Button>
              <Button variant="ghost">Drop</Button>
              <Button variant="destructive">Delete</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-good-tint text-good">Done</Badge>
              <Badge className="bg-warn-tint text-warn">Overdue · 1</Badge>
              <Badge className="bg-bad-tint text-bad">High</Badge>
              <Badge className="bg-info-tint text-info">Work</Badge>
              <Badge className="bg-brand-tint text-brand">Outreach</Badge>
            </div>
            <div className="grid max-w-sm gap-1.5">
              <Label htmlFor="dev-input">Task</Label>
              <Input id="dev-input" placeholder="e.g. Call Amir about the website #outreach !high" />
            </div>
          </div>
        </Section>
      </div>
    </div>
  )
}
