import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'

export default function GoalsPage() {
  return (
    <>
      <PageHeader title="Goals" />
      <EmptyState title="No goals yet" description="Goals and progress tracking arrive in a later phase." />
    </>
  )
}
