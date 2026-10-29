import { useContacts } from '@/api/contacts'
import { useWeekTouches } from '@/api/touches'
import { toDateKey, weekStart, addDays, type DateKey, type WeekStartsOn } from '@/lib/dates'
import { isFollowUpDue, WEEKLY_OUTREACH_GOAL, weekOutreachCount } from '@/lib/outreachList'

/** Today's "Outreaches this week" card: sent touches this week vs the goal, and replies received. */
export function useOutreachWeek(today: DateKey, timeZone: string, weekStartsOn: WeekStartsOn = 1) {
  const { data: touches } = useWeekTouches(today, weekStartsOn)
  const monday = weekStart(today, weekStartsOn)
  const sunday = addDays(monday, 6)
  const replies = (touches ?? []).filter((t) => {
    if (t.direction !== 'received') return false
    const day = toDateKey(new Date(t.occurred_at), timeZone)
    return day >= monday && day <= sunday
  }).length
  return { sent: weekOutreachCount(touches ?? [], today, timeZone, weekStartsOn), goal: WEEKLY_OUTREACH_GOAL, replies }
}

/** Leads whose follow-up is today or late (sidebar "N due" badge). */
export function useFollowUpsDue(today: DateKey): number | undefined {
  const { data: contacts } = useContacts()
  return contacts?.filter((c) => isFollowUpDue(c, today)).length
}
