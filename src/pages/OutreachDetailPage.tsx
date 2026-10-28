import { ChevronLeft } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'

export default function OutreachDetailPage() {
  const { id } = useParams()

  return (
    <>
      <Link
        to="/outreach"
        className="mb-3 inline-flex items-center gap-1 rounded-lg text-sm font-medium text-brand outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
        Back to Outreach
      </Link>
      <PageHeader title="Contact" />
      <EmptyState title="Contact details coming soon" description={`Contact ID: ${id ?? 'unknown'}`} />
    </>
  )
}
