import { QueryClientProvider } from '@tanstack/react-query'
import { Suspense, useState } from 'react'
import { RouterProvider } from 'react-router/dom'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { createQueryClient } from './queryClient'
import { createRouter } from './router'
import { useTheme } from './theme'

export default function App() {
  const [queryClient] = useState(createQueryClient)
  const [router] = useState(createRouter)
  const theme = useTheme()

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Suspense fallback={null}>
          <RouterProvider router={router} />
        </Suspense>
        <Toaster theme={theme} position="bottom-right" />
      </TooltipProvider>
    </QueryClientProvider>
  )
}
