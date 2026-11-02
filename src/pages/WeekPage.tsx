import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { useCreateRoutineItem, useToggleRoutineCheck } from '@/api/routine'
import { useCreateTask, useToggleTask } from '@/api/tasks'
import { useUserToday } from '@/app/useUserToday'
import { useWeekData } from '@/app/useWeekData'
import { EmptyState } from '@/components/EmptyState'
import { AddTaskDialog } from '@/components/today/AddTaskDialog'
import { Button } from '@/components/ui/button'
import { WeekGrid } from '@/components/week/WeekGrid'
import { WeekHeader } from '@/components/week/WeekHeader'
import { addDays, formatDate, weekStart, type DateKey } from '@/lib/dates'
import type { QuickAddResult } from '@/lib/quickAddSubmit'
import { formatDays } from '@/lib/todayList'
import { weekFromParam, weekRangeLabel, weekTitle } from '@/lib/week'
import type { TodayItem } from '@/schemas/today'

/** /week?start=YYYY-MM-DD: the 7 days of a week with their tasks. No start = this week. */
export default function WeekPage() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const { today, weekStartsOn } = useUserToday()
  const first = weekFromParam(params.get('start'), today, weekStartsOn)
  const thisWeek = weekStart(today, weekStartsOn)
  const { columns, isError, refetch } = useWeekData(first)

  const toggleCheck = useToggleRoutineCheck()
  const toggleTask = useToggleTask()
  const createTask = useCreateTask()
  const createRoutine = useCreateRoutineItem()
  const [addDay, setAddDay] = useState<DateKey | null>(null)

  function goToWeek(day: DateKey) {
    setParams(day === thisWeek ? {} : { start: day }, { replace: true })
  }

  function handleToggle(item: TodayItem, done: boolean, date: DateKey) {
    if (item.kind === 'routine') toggleCheck.mutate({ routineItemId: item.id, date, done })
    else toggleTask.mutate({ id: item.id, done })
  }

  async function handleAdd(result: QuickAddResult) {
    try {
      if (result.kind === 'task') {
        await createTask.mutateAsync({
          title: result.title,
          dueDate: result.dueDate,
          time: result.time,
          tag: result.tag,
          priority: result.priority ?? undefined,
        })
        toast.success(`Task added for ${result.dueDate === today ? 'today' : formatDate(result.dueDate)}`)
      } else {
        await createRoutine.mutateAsync({ title: result.title, days: result.days, time: result.time })
        toast.success(`Repeating task added · ${formatDays(result.days)}`)
      }
    } catch {
      // The hook already showed an error toast and undid the change; keep the pop-up open so it can be retried.
      throw new Error("Couldn't save it. Your task is still here, so try again.")
    }
  }

  const header = (
    <WeekHeader
      title={weekTitle(first, today, weekStartsOn)}
      range={weekRangeLabel(first)}
      isThisWeek={first === thisWeek}
      onPrevWeek={() => goToWeek(addDays(first, -7))}
      onThisWeek={() => goToWeek(thisWeek)}
      onNextWeek={() => goToWeek(addDays(first, 7))}
      onDayView={() => navigate('/')}
    />
  )

  return (
    <div className="glass-page">
      {header}
      {isError ? (
        <EmptyState title="Couldn't load your week" description="Check your connection and try again.">
          <Button onClick={refetch}>Try again</Button>
        </EmptyState>
      ) : !columns ? (
        <div role="status" className="flex items-center gap-2 py-12 text-sm text-ink-3">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          Loading your week…
        </div>
      ) : (
        <WeekGrid
          columns={columns}
          onToggle={handleToggle}
          onAdd={setAddDay}
          dayHref={(date) => (date === today ? '/' : `/?day=${date}`)}
        />
      )}
      <AddTaskDialog
        open={addDay !== null}
        onOpenChange={(open) => !open && setAddDay(null)}
        today={today}
        viewedDay={addDay ?? today}
        onSubmit={async (result) => {
          await handleAdd(result)
          setAddDay(null)
        }}
      />
    </div>
  )
}
