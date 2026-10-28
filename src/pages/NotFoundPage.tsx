import { Link } from 'react-router'
import { EmptyState } from '@/components/EmptyState'
import { Button } from '@/components/ui/button'

export default function NotFoundPage() {
  return (
    <EmptyState title="Page not found" description="This page doesn't exist or was moved.">
      <Button asChild>
        <Link to="/">Go to Today</Link>
      </Button>
    </EmptyState>
  )
}
