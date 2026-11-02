import { Loader2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { useDailyLog, useSaveDailyLog } from '@/api/dailyLog'
import {
  useCreateRoutineItem,
  useRemoveRoutineItem,
  useSetMissReason,
  useToggleRoutineCheck,
} from '@/api/routine'
import { useContacts, useUpdateContact } from '@/api/contacts'
import { useCreateTask, useDeleteTask, useDropTask, useMoveToToday, useOverdueTasks, useToggleTask } from '@/api/tasks'
import { keepFocusPlace } from '@/app/keepFocusPlace'
import { useTodayData } from '@/app/useTodayData'
import { EmptyState } from '@/components/EmptyState'
import { StreakCard } from '@/components/streak/StreakCard'
import { AddTaskDialog } from '@/components/today/AddTaskDialog'
import { DailyNoteCard } from '@/components/today/DailyNoteCard'
import { MissedYesterday } from '@/components/today/MissedYesterday'
import { OverdueBlock, type OverdueTask } from '@/components/today/OverdueBlock'
import { ProgressCard } from '@/components/today/ProgressCard'
import { ThisWeekCard } from '@/components/today/ThisWeekCard'
import { TodayHeader } from '@/components/today/TodayHeader'
import { TodayLayout } from '@/components/today/TodayLayout'
import { TodayTasksCard } from '@/components/today/TodayTasksCard'
import { Button } from '@/components/ui/button'
import { addDays, formatDate, isDateKey, type DateKey } from '@/lib/dates'
import type { QuickAddResult } from '@/lib/quickAddSubmit'
import { formatDays } from '@/lib/todayList'
import type { Contact } from '@/schemas/outreach'
import type { Task, TodayItem } from '@/schemas/today'

/** A row in the Overdue block: a late task, or a lead whose follow-up date has passed. */
type OverdueItem = OverdueTask & ({ kind: 'task'; task: Task } | { kind: 'followUp'; contact: Contact })

function overdueItems(tasks: readonly Task[], contacts: readonly Contact[], today: DateKey): OverdueItem[] {
  const late: OverdueItem[] = tasks.map((task) => ({ ...task, kind: 'task', task }))
  for (const contact of contacts) {
    if (contact.stage === 'won' || contact.stage === 'lost' || !contact.next_follow_up) continue
    if (contact.next_follow_up >= today) continue
    late.push({
      kind: 'followUp',
      contact,
      id: `follow-up-${contact.id}`,
      title: `Follow up with ${contact.name}`,
      due_date: contact.next_follow_up,
      tag: 'outreach',
      href: `/outreach/${contact.id}`,
    })
  }
  // Oldest first; the sort is stable, so tasks keep their own order within a day.
  return late.sort((a, b) => a.due_date.localeCompare(b.due_date))
}

type TaskCard = 'today' | 'tomorrow'

/** Whether a task card was folded up last time (remembered per device). */
function readCollapsed(card: TaskCard): boolean {
  try {
    return localStorage.getItem(`momentum:collapsed-${card}-tasks`) === '1'
  } catch {
    return false
  }
}

function writeCollapsed(card: TaskCard, collapsed: boolean) {
  try {
    if (collapsed) localStorage.setItem(`momentum:collapsed-${card}-tasks`, '1')
    else localStorage.removeItem(`momentum:collapsed-${card}-tasks`)
  } catch {
    // Storage blocked (private mode): the card just opens again after a reload.
  }
}

const DISMISS_KEY = 'momentum:missed-dismissed'

function readDismissed(): string | null {
  try {
    return localStorage.getItem(DISMISS_KEY)
  } catch {
    return null
  }
}

function writeDismissed(date: DateKey) {
  try {
    localStorage.setItem(DISMISS_KEY, date)
  } catch {
    // Storage blocked (private mode): dismissal just lasts until reload.
  }
}

/** A Date that falls on `key` in any time zone (noon UTC), for components that take a Date. */
function dateFromKey(key: DateKey): Date {
  return new Date(`${key}T12:00:00Z`)
}

export default function TodayPage() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  // The top bar's "New" button sends { quickAdd: <time> } to open the Add task pop-up.
  const quickAddRequest = (useLocation().state as { quickAdd?: number } | null)?.quickAdd
  const dayParam = params.get('day')
  const { today, selected, timeZone, view, isError, refetch } = useTodayData(
    dayParam && isDateKey(dayParam) ? dayParam : undefined,
  )
  const isToday = selected === today

  const overdue = useOverdueTasks(today)
  const contacts = useContacts()
  const dailyLog = useDailyLog(selected)

  const toggleCheck = useToggleRoutineCheck()
  const toggleTask = useToggleTask()
  const createTask = useCreateTask()
  const createRoutine = useCreateRoutineItem()
  const removeRoutine = useRemoveRoutineItem()
  const setMissReason = useSetMissReason()
  const moveToToday = useMoveToToday()
  const dropTask = useDropTask()
  const deleteTask = useDeleteTask()
  const saveLog = useSaveDailyLog()
  const updateContact = useUpdateContact()

  const [dismissedMissed, setDismissedMissed] = useState(readDismissed)
  const [addOpen, setAddOpen] = useState(false)
  // Each "New" click sends a new request: open the pop-up once per request (also when arriving from another page).
  const [seenRequest, setSeenRequest] = useState<number | undefined>(undefined)
  if (quickAddRequest !== seenRequest) {
    setSeenRequest(quickAddRequest)
    if (quickAddRequest) setAddOpen(true)
  }
  // Main column, so focus can stay in place when a banner, overdue row or routine item goes away.
  const mainRef = useRef<HTMLDivElement>(null)
  const keepFocus = () => keepFocusPlace(mainRef.current)

  function handleToggle(item: TodayItem, done: boolean, date: DateKey) {
    if (item.kind === 'routine') toggleCheck.mutate({ routineItemId: item.id, date, done })
    else toggleTask.mutate({ id: item.id, done })
  }

  function handleRemoveRoutine(id: string) {
    keepFocus()
    removeRoutine.mutate(id, { onSuccess: () => toast('Repeating task removed') })
  }

  function handleDeleteTask(item: TodayItem) {
    keepFocus()
    const undo = deleteTask.remove(item.id)
    if (undo) toast('Task deleted', { duration: 5000, action: { label: 'Undo', onClick: undo } })
  }

  function goTo(day: DateKey) {
    setParams(day === today ? {} : { day }, { replace: true })
  }

  async function handleQuickAdd(result: QuickAddResult) {
    try {
      if (result.kind === 'task') {
        await createTask.mutateAsync({
          title: result.title,
          dueDate: result.dueDate,
          time: result.time,
          tag: result.tag,
          priority: result.priority ?? undefined,
        })
        const dayName =
          result.dueDate === today ? 'today' : result.dueDate === addDays(today, 1) ? 'tomorrow' : formatDate(result.dueDate)
        if (result.dueDate === selected) {
          toast.success(isToday ? 'Task added' : `Task added for ${dayName}`)
        } else {
          // Planned for another day: offer to jump there.
          const day = result.dueDate
          toast.success(`Task added for ${dayName}`, { action: { label: 'View', onClick: () => goTo(day) } })
        }
      } else {
        await createRoutine.mutateAsync({ title: result.title, days: result.days, time: result.time })
        toast.success(`Repeating task added · ${formatDays(result.days)}`)
      }
    } catch {
      // The hook already showed an error toast and undid the change; keep the pop-up open so it can be retried.
      throw new Error("Couldn't save it. Your task is still here, so try again.")
    }
  }

  // Header + the Add task pop-up it opens (shown in every state, also while loading).
  const header = (
    <>
      <TodayHeader
        date={dateFromKey(selected)}
        today={today}
        timeZone={timeZone}
        onPrevDay={() => goTo(addDays(selected, -1))}
        onToday={() => goTo(today)}
        onNextDay={() => goTo(addDays(selected, 1))}
        onWeekView={() => navigate(isToday ? '/week' : `/week?start=${selected}`)}
        onAddTask={() => setAddOpen(true)}
      />
      <AddTaskDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        today={today}
        viewedDay={selected}
        onSubmit={async (result) => {
          await handleQuickAdd(result)
          setAddOpen(false)
        }}
      />
    </>
  )

  if (isError) {
    return (
      <>
        {header}
        <EmptyState title="Couldn't load your day" description="Check your connection and try again.">
          <Button onClick={refetch}>Try again</Button>
        </EmptyState>
      </>
    )
  }

  if (!view) {
    return (
      <>
        {header}
        <div role="status" className="flex items-center gap-2 py-12 text-sm text-ink-3">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          Loading your day…
        </div>
      </>
    )
  }

  const missedItems = isToday && dismissedMissed !== view.missed.date ? view.missed.items : []

  return (
    <>
      {header}
      <TodayLayout
        topCards={
          <>
            <ProgressCard progress={view.progress} />
            <StreakCard days={view.streak.days} />
          </>
        }
        main={
          <div ref={mainRef} className="contents">
            {!isToday && (
              <p className="rounded-xl border border-info-tint bg-info-tint px-4 py-3 text-sm text-info">
                You're looking at {formatDate(selected)}. Ticks and new tasks go to this day.{' '}
                <button
                  type="button"
                  className="font-semibold underline underline-offset-2 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                  onClick={() => goTo(today)}
                >
                  Back to today
                </button>
              </p>
            )}
            <MissedYesterday
              items={missedItems}
              streakSafe={view.streakSafe}
              onReason={(item, reason) => {
                keepFocus()
                setMissReason.mutate({ routineItemId: item.id, date: view.missed.date, reason })
              }}
              onDismiss={() => {
                keepFocus()
                writeDismissed(view.missed.date)
                setDismissedMissed(view.missed.date)
              }}
            />
            {isToday && overdue.data && (
              <OverdueBlock
                tasks={overdueItems(overdue.data, contacts.data ?? [], today)}
                today={today}
                onMoveToToday={(item) => {
                  keepFocus()
                  if (item.kind === 'task') {
                    moveToToday.mutate({ task: item.task, today }, { onSuccess: () => toast.success('Moved to today') })
                  } else {
                    updateContact.mutate(
                      { id: item.contact.id, patch: { next_follow_up: today } },
                      { onSuccess: () => toast.success('Follow-up moved to today') },
                    )
                  }
                }}
                onDrop={(item) => {
                  keepFocus()
                  if (item.kind === 'task') {
                    dropTask.mutate(item.task.id, { onSuccess: () => toast('Task dropped') })
                  } else {
                    updateContact.mutate(
                      { id: item.contact.id, patch: { next_follow_up: null } },
                      { onSuccess: () => toast('Follow-up cleared') },
                    )
                  }
                }}
              />
            )}
            <TodayTasksCard
              items={view.items}
              onToggle={(item, done) => handleToggle(item, done, selected)}
              onRemove={handleRemoveRoutine}
              onDeleteTask={handleDeleteTask}
              defaultCollapsed={readCollapsed('today')}
              onCollapsedChange={(collapsed) => writeCollapsed('today', collapsed)}
            />
            {isToday && (
              <TodayTasksCard
                day="tomorrow"
                items={view.tomorrowItems}
                onToggle={(item, done) => handleToggle(item, done, addDays(today, 1))}
                onRemove={handleRemoveRoutine}
                onDeleteTask={handleDeleteTask}
                defaultCollapsed={readCollapsed('tomorrow')}
                onCollapsedChange={(collapsed) => writeCollapsed('tomorrow', collapsed)}
              />
            )}
          </div>
        }
        aside={
          <>
            <ThisWeekCard week={view.week} />
            {dailyLog.isSuccess ? (
              <DailyNoteCard
                key={selected}
                note={dailyLog.data?.note ?? ''}
                energy={dailyLog.data?.energy ?? null}
                onSaveNote={(note) => saveLog.mutate({ date: selected, note })}
                onEnergyChange={(energy) => saveLog.mutate({ date: selected, energy })}
              />
            ) : dailyLog.isError ? (
              <EmptyState title="Couldn't load your note">
                <Button variant="outline" onClick={() => void dailyLog.refetch()}>
                  Try again
                </Button>
              </EmptyState>
            ) : null}
          </>
        }
      />
    </>
  )
}
