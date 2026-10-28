import { useQuery } from '@tanstack/react-query'
import type { Tables } from '@/lib/database.types'
import { supabase } from '@/lib/supabase'
import { queryKeys } from './keys'

export type Profile = Tables<'profiles'>

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle()
  if (error) throw error
  return data
}

/** The signed-in user's profile (settings). Pass undefined while signed out. */
export function useProfile(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.profile.me(userId ?? 'anonymous'),
    queryFn: () => fetchProfile(userId as string),
    enabled: Boolean(userId),
    staleTime: 5 * 60_000,
  })
}
