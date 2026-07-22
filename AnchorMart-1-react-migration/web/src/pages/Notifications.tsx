import { useUi } from '../components/modals/useUi'
import { useToast } from '../context/ToastContext'

interface Notif { t: string; tg: string; m: string; tm: string; i: string; bg: string; c: string }

const notifs: Notif[] = [
  { t: 'Payment Required', tg: 'Lois Becket', m: 'Complete payment for Order #AM2458 within 48 hours.', tm: '1m ago', i: 'ti-currency-dollar', bg: 'var(--warning-bg)', c: 'var(--warning-icon)' },
  { t: 'Order Confirmed', tg: 'Ali Mahmoud', m: 'Titan Watch confirmed and being packed.', tm: '10m ago', i: 'ti-package', bg: 'var(--success-bg)', c: 'var(--success-icon)' },
  { t: 'Product Update', tg: 'Sara Chen', m: 'Shaving Kit unavailable — substitute suggested.', tm: '18m ago', i: 'ti-alert-triangle', bg: 'var(--danger-bg)', c: 'var(--danger-icon)' },
  { t: 'Assignment', tg: 'Rahul Singh (DP)', m: 'New ENQ-0051 assigned — deliver by 1:30 PM.', tm: '22m ago', i: 'ti-motorbike', bg: 'var(--info-bg)', c: 'var(--info-icon)' },
  { t: 'Gift Unlocked', tg: 'James Wren', m: 'Special gift unlocked for your next order!', tm: '38m ago', i: 'ti-gift', bg: 'var(--purple-bg)', c: 'var(--purple-icon)' },
]

const SymArrow = () => (
  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: '-2px' }}>
    <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
  </svg>
)

export function Notifications() {
  const ui = useUi()
  const toast = useToast()

  return (
    <>
      <div className="pg-header">
        <div className="pg-header-l"><h1 className="pg-title">Notifications</h1><p className="pg-sub"><span>Push notifications, announcements, and history</span></p></div>
        <div className="pg-actions"><button className="btn btn-secondary" onClick={() => ui.addNotification()}><i className="ti ti-plus" />Add Notification</button><button className="btn btn-primary" onClick={() => ui.sendNotif()}><i className="ti ti-bell-plus" />Send Notification</button></div>
      </div>
      <div className="grid-2">
        <div className="card">
          <div className="card-hd"><div className="card-ttl"><i className="ti ti-send" />Compose Notification</div></div>
          <div className="card-body">
            <div className="fg"><label className="fg-label">Target Audience</label><select className="form-select"><option>All Sailors</option><option>All Delivery Partners</option><option>Specific Sailor</option><option>Specific Partner</option><option>Port-specific Sailors</option><option>Sailors with Pending Payment</option></select></div>
            <div className="fg"><label className="fg-label">Notification Type</label><select className="form-select"><option>Payment Required</option><option>Order Confirmed</option><option>Out for Delivery</option><option>Gift / Reward</option><option>Product Update</option><option>General Announcement</option><option>Assignment (Partner)</option></select></div>
            <div className="fg"><label className="fg-label">Message</label><textarea className="form-input" style={{ height: '90px' }} placeholder="Notification message…" /><div className="fg-hint">Max 280 characters · Use {'{name}'}, {'{order_id}'} for personalisation.</div></div>
            <div className="form-row"><div className="fg"><label className="fg-label">Send Time</label><select className="form-select"><option>Send Immediately</option><option>Schedule</option></select></div><div className="fg"><label className="fg-label">Channel</label><select className="form-select"><option>Push + WhatsApp</option><option>Push Only</option><option>Email Only</option></select></div></div>
            <button className="btn btn-primary wf" onClick={() => toast('Notification sent successfully', 'success', 'send')}><i className="ti ti-send" />Send Notification</button>
          </div>
        </div>
        <div className="card">
          <div className="card-hd"><div className="card-ttl"><i className="ti ti-history" />Recent Notifications</div><button className="btn btn-ghost btn-sm" onClick={() => toast('All marked as read', '', 'check')}>Mark all read</button></div>
          <div className="card-body-sm">
            {notifs.map((n, i) => (
              <div key={i} className="notif-item" style={{ cursor: 'pointer' }} onClick={() => ui.sendNotif({ audience: n.tg, msg: n.m })}>
                <div className="notif-icon" style={{ background: n.bg, color: n.c }}><i className={`ti ${n.i}`} /></div>
                <div className="f1">
                  <div className="flex aic g8 mb4"><span className="w7 c1 sm">{n.t}</span><span className="xs c4"><SymArrow /> {n.tg}</span></div>
                  <div className="sm c3 w5">{n.m}</div>
                </div>
                <div className="notif-time">{n.tm}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
