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
const outreach = ['outreach'] as const
const stats = ['stats'] as const
const goals = ['goals'] as const

/** Filters for the contacts list. Only server-side filters belong here; keep it a plain, serialisable object. */
export type ContactFilters = {
  source?: 'linkedin' | 'maps' | 'inperson' | 'upwork' | 'other'
  stage?: 'new' | 'contacted' | 'replied' | 'meeting' | 'proposal' | 'won' | 'lost'
  search?: string
  followUpDue?: boolean
}

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
    /** Tasks linked to a lead (contact page). Under 'tasks', so task writes refresh it too. */
    contactTasks: (contactId: string) => [...today, 'tasks', 'contact', contactId] as const,
    // Prefixes: match every cached range/date of that kind (for optimistic updates and invalidation).
    routineChecksAll: () => [...today, 'routineChecks'] as const,
    tasksAll: () => [...today, 'tasks'] as const,
    overdueTasksAll: () => [...today, 'overdueTasks'] as const,
  },
  outreach: {
    all: outreach,
    contacts: (filters: ContactFilters = {}) => [...outreach, 'contacts', filters] as const,
    contact: (id: string) => [...outreach, 'contact', id] as const,
    touches: (contactId: string) => [...outreach, 'touches', contactId] as const,
    templates: () => [...outreach, 'templates'] as const,
    /** weekStart = Monday of the week, 'yyyy-MM-dd'. */
    weekTouches: (weekStart: IsoDate) => [...outreach, 'weekTouches', weekStart] as const,
    // Prefixes: every cached filter set / week.
    contactsAll: () => [...outreach, 'contacts'] as const,
    contactAll: () => [...outreach, 'contact'] as const,
    touchesAll: () => [...outreach, 'touches'] as const,
    weekTouchesAll: () => [...outreach, 'weekTouches'] as const,
  },
  /**
   * Stats page. Range args are 'yyyy-MM-dd' (both days included); null = no limit (all time).
   * Any task / routine / outreach / metric write can change these, so invalidate `stats.all`.
   */
  stats: {
    all: stats,
    metrics: () => [...stats, 'metrics'] as const,
    /** years = calendar years loaded, sorted, e.g. [2025, 2026]. */
    metricEntries: (metricId: string, years: readonly number[]) =>
      [...stats, 'metricEntries', metricId, years] as const,
    dailyCompletion: (from: IsoDate, to: IsoDate) => [...stats, 'dailyCompletion', from, to] as const,
    outreachFunnel: (from: IsoDate | null, to: IsoDate | null) => [...stats, 'outreachFunnel', from, to] as const,
    replyRates: (from: IsoDate | null, to: IsoDate | null) => [...stats, 'replyRates', from, to] as const,
    revenue: (from: IsoDate | null, to: IsoDate | null) => [...stats, 'revenue', from, to] as const,
    tasksByTag: (from: IsoDate | null, to: IsoDate | null) => [...stats, 'tasksByTag', from, to] as const,
    routineDays: (from: IsoDate, to: IsoDate) => [...stats, 'routineDays', from, to] as const,
    // Prefix: every cached metric's entries.
    metricEntriesAll: () => [...stats, 'metricEntries'] as const,
  },
  /** Goals page. A goal's progress reads metric entries / routine ticks, so it refetches when the page opens. */
  goals: {
    all: goals,
    goals: () => [...goals, 'list'] as const,
    goalSeries: (goalId: string) => [...goals, 'series', goalId] as const,
    /** Open deals with a value (contacts in contacted → proposal), for "include pipeline". */
    openDeals: () => [...goals, 'openDeals'] as const,
    // Prefix: every goal's series.
    goalSeriesAll: () => [...goals, 'series'] as const,
  },
} as const
