import { lazy } from 'react'
import { createBrowserRouter, Navigate, Outlet, type RouteObject } from 'react-router'
import GoalsPage from '@/pages/GoalsPage'
import ImprovePage from '@/pages/ImprovePage'
import LoginPage from '@/pages/LoginPage'
import NotFoundPage from '@/pages/NotFoundPage'
import OutreachDetailPage from '@/pages/OutreachDetailPage'
import OutreachPage from '@/pages/OutreachPage'
import SettingsPage from '@/pages/SettingsPage'
import StatsPage from '@/pages/StatsPage'
import StatsTabPage from '@/pages/StatsTabPage'
import TodayPage from '@/pages/TodayPage'
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
              { path: 'outreach', element: <OutreachPage /> },
              { path: 'outreach/:id', element: <OutreachDetailPage /> },
              {
                path: 'stats',
                element: <StatsPage />,
                children: [
                  { index: true, element: <Navigate to="overview" replace /> },
                  { path: 'overview', element: <StatsTabPage label="Overview" /> },
                  { path: 'metrics', element: <StatsTabPage label="Metrics" /> },
                  { path: 'routine', element: <StatsTabPage label="Routine" /> },
                  { path: 'reports', element: <StatsTabPage label="Reports" /> },
                ],
              },
              { path: 'goals', element: <GoalsPage /> },
              { path: 'improve', element: <ImprovePage /> },
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
