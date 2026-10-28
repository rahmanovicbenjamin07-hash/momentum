import { QueryClientProvider } from '@tanstack/react-query'
import { Suspense, useState } from 'react'
import { RouterProvider } from 'react-router/dom'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { createQueryClient } from './queryClient'
import { createRouter } from './router'

export default function App() {
  const [queryClient] = useState(createQueryClient)
  const [router] = useState(createRouter)

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Suspense fallback={null}>
          <RouterProvider router={router} />
        </Suspense>
        <Toaster theme="light" position="bottom-right" />
      </TooltipProvider>
    </QueryClientProvider>
  )
}
