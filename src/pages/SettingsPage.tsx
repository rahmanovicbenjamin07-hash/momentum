import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" />
      <EmptyState title="Settings coming soon" description="Profile, time zone and preferences arrive in a later phase." />
    </>
  )
}
