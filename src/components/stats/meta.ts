/** Date ranges on the Stats page, in days. */
export const STATS_RANGES = [7, 30, 90] as const
export type StatsRange = (typeof STATS_RANGES)[number]
