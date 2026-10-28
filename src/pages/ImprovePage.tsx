import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'

export default function ImprovePage() {
  return (
    <>
      <PageHeader title="Improvements" />
      <EmptyState title="Nothing to improve yet" description="Patterns and suggestions arrive in a later phase." />
    </>
  )
}
