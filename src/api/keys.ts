/**
 * All TanStack Query keys live here, so cache reads, writes and invalidations
 * always use the exact same key. Add one group per feature.
 *
 * Usage: useQuery({ queryKey: queryKeys.profile.me(userId), ... })
 *        queryClient.invalidateQueries({ queryKey: queryKeys.profile.all })
 */
export const queryKeys = {
  profile: {
    all: ['profile'] as const,
    me: (userId: string) => ['profile', userId] as const,
  },
} as const
