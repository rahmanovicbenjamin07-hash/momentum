import { Outlet } from 'react-router'

/** /stats: each tab (src/pages/stats) shows its own header, tabs and content, on the glass background (index.css → .glass-page). */
export default function StatsPage() {
  return (
    <div className="glass-page">
      <Outlet />
    </div>
  )
}
