import { EmptyState } from '@/components/EmptyState'

type StatsTabPageProps = {
  label: string
}

export default function StatsTabPage({ label }: StatsTabPageProps) {
  return <EmptyState title={`${label} coming soon`} description="Charts and numbers arrive in a later phase." />
}
