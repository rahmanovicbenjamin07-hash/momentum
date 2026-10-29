import { Plus } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'

type ImproveHeaderProps = {
  onNewReview: () => void
}

/** "Turn your numbers into changes" / Improvements / + New review. */
export function ImproveHeader({ onNewReview }: ImproveHeaderProps) {
  return (
    <PageHeader
      eyebrow="Turn your numbers into changes"
      title="Improvements"
      actions={
        <Button onClick={onNewReview}>
          <Plus aria-hidden="true" />
          New review
        </Button>
      }
    />
  )
}
