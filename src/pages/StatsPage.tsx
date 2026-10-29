import { Outlet } from 'react-router'

/** /stats: each tab (src/pages/stats) shows its own header, tabs and content. */
export default function StatsPage() {
  return <Outlet />
}
