import { Navigate, Outlet, useLocation } from 'react-router'
import { FullPageSpinner } from '@/components/FullPageSpinner'
import { useAuth } from './auth-context'

/** Wraps every private page. Not signed in → go to /login and come back afterwards. */
export default function RequireAuth() {
  const { session, loading } = useAuth()
  const location = useLocation()

  if (loading) return <FullPageSpinner />
  if (!session) {
    const from = location.pathname + location.search
    return <Navigate to="/login" replace state={{ from }} />
  }
  return <Outlet />
}
