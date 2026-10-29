import { Loader2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { useDailyLog, useSaveDailyLog } from '@/api/dailyLog'
import {
  useCreateRoutineItem,
  useRemoveRoutineItem,
  useSetMissReason,
  useToggleRoutineCheck,
  useUpdateRoutineItem,
} from '@/api/routine'
import { useContacts, useUpdateContact } from '@/api/contacts'
import { useCreateTask, useDeleteTask, useDropTask, useMoveToToday, useOverdueTasks, useToggleTask } from '@/api/tasks'
import { keepFocusPlace } from '@/app/keepFocusPlace'
import { useOutreachWeek } from '@/app/useOutreachWeek'
import { useTodayData } from '@/app/useTodayData'
import { EmptyState } from '@/components/EmptyState'
import { StreakCard } from '@/components/streak/StreakCard'
import { DailyNoteCard } from '@/components/today/DailyNoteCard'
import { MissedYesterday } from '@/components/today/MissedYesterday'
import { OutreachWeekCard } from '@/components/today/OutreachWeekCard'
import { OverdueBlock, type OverdueTask } from '@/components/today/OverdueBlock'
import { ProgressCard } from '@/components/today/ProgressCard'
import { QuickAddBar } from '@/components/today/QuickAddBar'
import { ThisWeekCard } from '@/components/today/ThisWeekCard'
import { TodayHeader } from '@/components/today/TodayHeader'
import { TodayLayout } from '@/components/today/TodayLayout'
import { TodayTasksCard } from '@/components/today/TodayTasksCard'
import { Button } from '@/components/ui/button'
import { addDays, formatDate, isDateKey, type DateKey } from '@/lib/dates'
import type { QuickAddResult } from '@/lib/quickAddSubmit'
import { formatDays } from '@/lib/todayList'
import type { Contact } from '@/schemas/outreach'
import type { Task } from '@/schemas/today'

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
  const dayParam = params.get('day')
  const { today, selected, timeZone, weekStartsOn, view, isError, refetch } = useTodayData(
    dayParam && isDateKey(dayParam) ? dayParam : undefined,
  )
  const isToday = selected === today

  const overdue = useOverdueTasks(today)
  const contacts = useContacts()
  const outreachWeek = useOutreachWeek(today, timeZone, weekStartsOn)
  const dailyLog = useDailyLog(selected)

  const toggleCheck = useToggleRoutineCheck()
  const toggleTask = useToggleTask()
  const createTask = useCreateTask()
  const createRoutine = useCreateRoutineItem()
  const updateRoutine = useUpdateRoutineItem()
  const removeRoutine = useRemoveRoutineItem()
  const setMissReason = useSetMissReason()
  const moveToToday = useMoveToToday()
  const dropTask = useDropTask()
  const deleteTask = useDeleteTask()
  const saveLog = useSaveDailyLog()
  const updateContact = useUpdateContact()

  const [dismissedMissed, setDismissedMissed] = useState(readDismissed)
  // Main column, so focus can stay in place when a banner, overdue row or routine item goes away.
  const mainRef = useRef<HTMLDivElement>(null)
  const keepFocus = () => keepFocusPlace(mainRef.current)

  function goTo(day: DateKey) {
    setParams(day === today ? {} : { day }, { replace: true })
  }

  async function handleQuickAdd(result: QuickAddResult) {
    try {
      if (result.kind === 'task') {
        await createTask.mutateAsync({
          title: result.title,
          dueDate: selected,
          time: result.time,
          tag: result.tag,
          priority: result.priority ?? undefined,
        })
        toast.success(isToday ? 'Task added' : `Task added for ${formatDate(selected)}`)
      } else {
        await createRoutine.mutateAsync({ title: result.title, days: result.days, time: result.time })
        toast.success(`Repeating task added · ${formatDays(result.days)}`)
      }
    } catch {
      // The hook already showed an error toast and undid the change; keep the text so it can be retried.
      throw new Error("Couldn't save it. Your text is still here, so try again.")
    }
  }

  const header = (
    <TodayHeader
      date={dateFromKey(selected)}
      timeZone={timeZone}
      onPrevDay={() => goTo(addDays(selected, -1))}
      onToday={() => goTo(today)}
      onNextDay={() => goTo(addDays(selected, 1))}
      onWeekView={() => toast('Week view is coming in a later phase.')}
    />
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
            <OutreachWeekCard {...outreachWeek} />
          </>
        }
        quickAdd={<QuickAddBar onSubmit={handleQuickAdd} />}
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
              routineItems={view.routineItems}
              onToggle={(item, done) =>
                item.kind === 'routine'
                  ? toggleCheck.mutate({ routineItemId: item.id, date: selected, done })
                  : toggleTask.mutate({ id: item.id, done })
              }
              onChangeDays={(id, days) => updateRoutine.mutate({ id, days })}
              onChangeTime={(id, time) => updateRoutine.mutate({ id, time })}
              onRemove={(id) => {
                keepFocus()
                removeRoutine.mutate(id, { onSuccess: () => toast('Repeating task removed') })
              }}
              onDeleteTask={(item) => {
                keepFocus()
                const undo = deleteTask.remove(item.id)
                if (undo) toast('Task deleted', { duration: 5000, action: { label: 'Undo', onClick: undo } })
              }}
            />
          </div>
        }
        aside={
          <>
            <ThisWeekCard week={view.week} outreach={outreachWeek} />
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
