import { useEffect, useState } from 'react'
import { useProfile } from '@/api/profile'
import { DEFAULT_TIME_ZONE, getToday, type DateKey, type WeekStartsOn } from '@/lib/dates'
import { useAuth } from './auth-context'

/**
 * The user's "today" (their time zone and day_end_hour from the profile) and the day their week starts on.
 * Re-checks every minute and when the tab comes back, so it rolls over at the right moment.
 */
export function useUserToday(): { today: DateKey; timeZone: string; weekStartsOn: WeekStartsOn } {
  const { user } = useAuth()
  const { data: profile } = useProfile(user?.id)
  const timeZone = profile?.timezone ?? DEFAULT_TIME_ZONE
  const dayEndHour = profile?.day_end_hour ?? 0
  const weekStartsOn: WeekStartsOn = profile?.week_start === 0 ? 0 : 1

  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const tick = () => setNow(new Date())
    const id = setInterval(tick, 60_000)
    const onVisible = () => {
      if (document.visibilityState === 'visible') tick()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  return { today: getToday({ now, timeZone, dayEndHour }), timeZone, weekStartsOn }
}
