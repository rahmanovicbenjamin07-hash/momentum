import { useState, type ReactNode } from 'react'
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
  mockContacts,
  mockCsvPreview,
  mockTemplates,
  mockFollowUps,
  mockOutreachSummary,
  mockSourceCounts,
  mockStageCounts,
} from '@/mocks/outreach'
import { mockSidebar, mockUnreadCount, mockUser } from '@/mocks/shell'
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
