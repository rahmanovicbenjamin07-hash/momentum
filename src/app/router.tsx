import { lazy } from 'react'
import { createBrowserRouter, Navigate, Outlet, type RouteObject } from 'react-router'
import FinancePage from '@/pages/FinancePage'
import GoalsPage from '@/pages/GoalsPage'
import LoginPage from '@/pages/LoginPage'
import NotFoundPage from '@/pages/NotFoundPage'
import ContactPage from '@/pages/ContactPage'
import OutreachPage from '@/pages/OutreachPage'
import SettingsPage from '@/pages/SettingsPage'
import StatsPage from '@/pages/StatsPage'
import OverviewTab from '@/pages/stats/OverviewTab'
import TodayPage from '@/pages/TodayPage'
import WeekPage from '@/pages/WeekPage'
import AppLayout from './AppLayout'
import { AuthProvider } from './AuthProvider'
import RequireAuth from './RequireAuth'

// Only loaded in development; Vite removes it from production builds.
const DevPreview = import.meta.env.DEV ? lazy(() => import('@/pages/DevPreview')) : null

const devRoutes: RouteObject[] = DevPreview ? [{ path: '/dev', element: <DevPreview /> }] : []

export const routes: RouteObject[] = [
  {
    // AuthProvider sits inside the router so pages can use both auth and navigation.
    element: (
      <AuthProvider>
        <Outlet />
      </AuthProvider>
    ),
    children: [
      { path: '/login', element: <LoginPage /> },
      ...devRoutes,
      {
        element: <RequireAuth />,
        children: [
          {
            element: <AppLayout />,
            children: [
              { index: true, element: <TodayPage /> },
              { path: 'week', element: <WeekPage /> },
              { path: 'outreach', element: <OutreachPage /> },
              { path: 'outreach/:id', element: <ContactPage /> },
              {
                path: 'stats',
                element: <StatsPage />,
                children: [
                  { index: true, element: <Navigate to="overview" replace /> },
                  { path: 'overview', element: <OverviewTab /> },
                  // My metrics, Routine progress and Reports were removed (their data is kept); old links land on Overview.
                  { path: '*', element: <Navigate to="/stats/overview" replace /> },
                ],
              },
              { path: 'goals', element: <GoalsPage /> },
              { path: 'finance', element: <FinancePage /> },
              // Improvements was removed (its data is kept); old links, e.g. weekly-review notifications, open Today.
              { path: 'improve', element: <Navigate to="/" replace /> },
              { path: 'settings', element: <SettingsPage /> },
              { path: '*', element: <NotFoundPage /> },
            ],
          },
        ],
      },
    ],
  },
]

export function createRouter() {
  return createBrowserRouter(routes)
}
