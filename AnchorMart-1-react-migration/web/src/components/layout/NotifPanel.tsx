import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { NOTIFS_SEED } from '../../data/notifs'
import { PATH_BY_PAGE } from './nav'
import { useToast } from '../../context/ToastContext'

export function NotifPanel() {
  const [notifs, setNotifs] = useState(() => NOTIFS_SEED.map((n) => ({ ...n })))
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const toast = useToast()

  const unread = notifs.filter((n) => n.unread).length

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('click', onDoc)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('click', onDoc); document.removeEventListener('keydown', onKey) }
  }, [open])

  const markAllRead = () => {
    if (!notifs.some((n) => n.unread)) return
    setNotifs((ns) => ns.map((n) => ({ ...n, unread: false })))
    toast('All notifications marked as read', 'success', 'checks')
  }

  const clickNotif = (i: number) => {
    const n = notifs[i]
    setNotifs((ns) => ns.map((x, j) => (j === i ? { ...x, unread: false } : x)))
    setOpen(false)
    if (n.page) navigate(PATH_BY_PAGE[n.page])
  }

  return (
    <div className="tb-notif-wrap" ref={wrapRef}>
      <div
        className="tb-action"
        title="Notifications"
        id="notif-bell"
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o) }}
      >
        <i className="ti ti-bell" />
        <div className="tb-notif-dot" id="notif-dot" style={{ display: unread ? '' : 'none' }} />
      </div>
      <div className={`notif-panel${open ? ' open' : ''}`} id="notif-panel">
        <div className="notif-hd">
          <div className="flex aic g8">
            <span className="notif-hd-ttl">Notifications</span>
            <span className={`notif-hd-badge${unread === 0 ? ' zero' : ''}`}>
              {unread ? `${unread} new` : 'All read'}
            </span>
          </div>
          <button className="notif-hd-btn" onClick={markAllRead}><i className="ti ti-checks" />Mark all read</button>
        </div>
        <div className="notif-list" id="notif-list">
          {notifs.length === 0 ? (
            <div className="notif-empty">
              <i className="ti ti-bell-off" />
              <div className="et">You're all caught up</div>
              <div className="es">No new notifications right now.</div>
            </div>
          ) : notifs.map((n, i) => (
            <div key={i} className={`notif-item${n.unread ? ' unread' : ''}`} onClick={() => clickNotif(i)}>
              <div className="notif-ic" style={{ background: `var(--${n.bg})`, color: `var(--${n.fg})` }}>
                <i className={`ti ${n.ic}`} />
              </div>
              <div className="notif-bd">
                <div className="notif-t">{n.t}</div>
                <div className="notif-s">{n.s}</div>
                <div className="notif-tm">{n.tm}</div>
              </div>
              {n.unread && <div className="notif-unread-dot" />}
            </div>
          ))}
        </div>
        <div className="notif-foot">
          <button className="btn btn-secondary btn-sm wf" onClick={() => { setOpen(false); navigate('/notifications') }}>
            View all notifications<i className="ti ti-arrow-right" />
          </button>
        </div>
      </div>
    </div>
  )
}
