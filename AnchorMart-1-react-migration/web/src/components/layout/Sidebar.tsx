import { NavLink } from 'react-router-dom'
import { asset } from '../../lib/images'
import { useAuth } from '../../context/AuthContext'
import { NAV } from './nav'

export function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const { logout } = useAuth()
  return (
    <aside className="sidebar">
      <div className="sb-logo logo-only">
        <img src={asset('assets/logo-wordmark-white.svg')} alt="AnchorMart logo" className="logo-graphic" />
        <img src={asset('assets/logo-icon-white.svg')} alt="AnchorMart" className="logo-collapsed" />
        <button
          className="sb-toggle"
          id="sb-toggle-btn"
          onClick={onToggle}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <i className={`ti ${collapsed ? 'ti-chevron-right' : 'ti-chevron-left'}`} />
        </button>
      </div>
      <div className="sb-scroll">
        {NAV.map((section) => (
          <div key={section.title}>
            <div className="sb-section">{section.title}</div>
            {section.items.map((item) => (
              <NavLink
                key={item.page}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              >
                <i className={`ti ${item.icon}`} />
                {item.label}
                {item.badge && (
                  <span className={`nav-badge ${item.badge.variant ? item.badge.variant + ' ' : ''}mla`}>
                    {item.badge.text}
                  </span>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </div>
      <div className="sb-footer">
        <div className="sb-avatar">SA</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="sb-uname">Super Admin</div>
          <div className="sb-urole">admin@anchormart.io</div>
        </div>
        <div className="sb-logout" onClick={logout} title="Sign out"><i className="ti ti-logout" /></div>
      </div>
    </aside>
  )
}
