import { useState } from 'react'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { formatLongDate } from '@/lib/dates'

export default function TodayPage() {
  // Read the clock once when the page opens.
  const [now] = useState(() => new Date())

  return (
    <>
      <PageHeader eyebrow={formatLongDate(now)} title="Today" />
      <EmptyState
        title="Your day will live here"
        description="Progress, streak, tasks and the daily note arrive in a later phase."
      />
    </>
  )
}
