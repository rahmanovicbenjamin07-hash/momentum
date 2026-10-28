import { useEffect, useState } from 'react'
import { useProfile } from '@/api/profile'
import { DEFAULT_TIME_ZONE, getToday, type DateKey } from '@/lib/dates'
import { useAuth } from './auth-context'

/**
 * The user's "today" (their time zone and day_end_hour from the profile).
 * Re-checks every minute and when the tab comes back, so it rolls over at the right moment.
 */
export function useUserToday(): { today: DateKey; timeZone: string } {
  const { user } = useAuth()
  const { data: profile } = useProfile(user?.id)
  const timeZone = profile?.timezone ?? DEFAULT_TIME_ZONE
  const dayEndHour = profile?.day_end_hour ?? 0

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

  return { today: getToday({ now, timeZone, dayEndHour }), timeZone }
}
