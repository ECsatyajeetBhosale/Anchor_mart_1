import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { NAV } from './nav'
import { PAGE_TITLES } from '../../data/pageTitles'

const TITLE_BY_PATH: Record<string, string> = Object.fromEntries(
  NAV.flatMap((s) => s.items).map((i) => [i.path, PAGE_TITLES[i.page]]),
)

export function AppShell() {
  const [collapsed, setCollapsed] = useState(false)
  const { pathname } = useLocation()
  const title = TITLE_BY_PATH[pathname] || 'Dashboard'

  return (
    <div className={`app-shell in${collapsed ? ' collapsed' : ''}`} id="app">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <Topbar title={title} />
      <main className="main-content" id="mc">
        {/* key by pathname so the page-enter animation re-runs on navigation */}
        <div className="page-enter" key={pathname}>
          <Outlet />
        </div>
      </main>
    </div>
  )
}
