import { useMutation, useQuery, useQueryClient, type MutateOptions } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuth } from '@/app/auth-context'
import { supabase } from '@/lib/supabase'
import { uuid } from '@/lib/uuid'
import type { Template, TemplateFormValues } from '@/schemas/outreach'
import { queryKeys } from './keys'
import { invalidateWhenIdle, patchCachedLists, requireUserId, restoreCache, type CacheSnapshot } from './optimistic'

const templatesKey = queryKeys.outreach.templates()
const templatesMutationKey = ['outreach', 'templates'] as const

type Rollback = { snapshot: CacheSnapshot }

/** Form values → the columns we store. "Any channel" is null. */
export function templateFields(values: TemplateFormValues): Pick<Template, 'name' | 'channel' | 'body'> {
  return { name: values.name, channel: values.channel ?? null, body: values.body }
}

/** Message templates, oldest first (the order they were added). */
export function useTemplates() {
  return useQuery({
    queryKey: templatesKey,
    queryFn: async (): Promise<Template[]> => {
      const { data, error } = await supabase.from('templates').select('*').order('created_at')
      if (error) throw error
      return data as Template[]
    },
    staleTime: 5 * 60_000,
  })
}

/** Shared optimistic wiring for the three template writes. */
function useTemplateMutation<TVars>(config: {
  save: (vars: TVars) => Promise<void>
  apply: (list: Template[], vars: TVars) => Template[]
  errorMessage: string
  /** Extra queries to refetch afterwards. */
  alsoInvalidate?: readonly (readonly unknown[])[]
}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: templatesMutationKey,
    mutationFn: config.save,
    onMutate: async (vars: TVars): Promise<Rollback> => ({
      snapshot: await patchCachedLists<Template>(queryClient, templatesKey, (list) => config.apply(list, vars)),
    }),
    onError: (_error, _vars, context) => {
      restoreCache(queryClient, context?.snapshot)
      toast.error(config.errorMessage)
    },
    onSettled: () =>
      invalidateWhenIdle(queryClient, templatesMutationKey, templatesKey, ...(config.alsoInvalidate ?? [])),
  })
}

/** Adds a template. Instant; rolls back with a toast if saving fails. */
export function useCreateTemplate() {
  const { user } = useAuth()
  const mutation = useTemplateMutation({
    save: async (row: Template) => {
      const { error } = await supabase.from('templates').insert({ id: row.id, name: row.name, channel: row.channel, body: row.body })
      if (error) throw error
    },
    apply: (list, row) => [...list, row],
    errorMessage: "Couldn't add the template. Try again.",
  })

  const toRow = (values: TemplateFormValues): Template => ({
    id: uuid(),
    user_id: requireUserId(user?.id),
    created_at: new Date().toISOString(),
    ...templateFields(values),
  })

  return {
    ...mutation,
    mutate: (values: TemplateFormValues, options?: MutateOptions<void, Error, Template, Rollback>) =>
      mutation.mutate(toRow(values), options),
    mutateAsync: (values: TemplateFormValues, options?: MutateOptions<void, Error, Template, Rollback>) =>
      mutation.mutateAsync(toRow(values), options),
  }
}

export type UpdateTemplateInput = { id: string; values: TemplateFormValues }

/** Edits a template's name, channel and text. */
export function useUpdateTemplate() {
  return useTemplateMutation({
    save: async ({ id, values }: UpdateTemplateInput) => {
      const { error } = await supabase.from('templates').update(templateFields(values)).eq('id', id)
      if (error) throw error
    },
    apply: (list, { id, values }) => list.map((t) => (t.id === id ? { ...t, ...templateFields(values) } : t)),
    errorMessage: "Couldn't save the template. Try again.",
  })
}

/** Deletes a template. Touches that used it are kept; they just lose the link. */
export function useDeleteTemplate() {
  return useTemplateMutation({
    save: async (id: string) => {
      const { error } = await supabase.from('templates').delete().eq('id', id)
      if (error) throw error
    },
    apply: (list, id) => list.filter((t) => t.id !== id),
    errorMessage: "Couldn't delete the template. Try again.",
    alsoInvalidate: [queryKeys.outreach.touchesAll()],
  })
}
