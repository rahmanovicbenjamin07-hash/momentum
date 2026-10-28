/**
 * All TanStack Query keys live here, so cache reads, writes and invalidations
 * always use the exact same key. Add one group per feature.
 *
 * Usage: useQuery({ queryKey: queryKeys.profile.me(userId), ... })
 *        queryClient.invalidateQueries({ queryKey: queryKeys.profile.all })
 *
 * Keys match by prefix, so ['today', 'routineChecks'] hits every routineChecks(from, to) range.
 * The cache is cleared on sign-out (AuthProvider), so keys don't need the user id.
 */

/** Dates in keys are plain 'yyyy-MM-dd' strings (Europe/Sarajevo calendar day). */
type IsoDate = string

const today = ['today'] as const

export const queryKeys = {
  profile: {
    all: ['profile'] as const,
    me: (userId: string) => ['profile', userId] as const,
  },
  today: {
    all: today,
    routineItems: () => [...today, 'routineItems'] as const,
    routineChecks: (from: IsoDate, to: IsoDate) => [...today, 'routineChecks', from, to] as const,
    tasks: (date: IsoDate) => [...today, 'tasks', date] as const,
    overdueTasks: (todayDate: IsoDate) => [...today, 'overdueTasks', todayDate] as const,
    dailyLog: (date: IsoDate) => [...today, 'dailyLog', date] as const,
  },
} as const
