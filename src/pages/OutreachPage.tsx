import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'

export default function OutreachPage() {
  return (
    <>
      <PageHeader title="Outreach" />
      <EmptyState title="No contacts yet" description="Client outreach and follow-ups arrive in a later phase." />
    </>
  )
}
