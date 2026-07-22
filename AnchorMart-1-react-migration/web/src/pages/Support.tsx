import { Avatar } from '../lib/images'
import { useUi } from '../components/modals/useUi'

interface Ticket { id: string; f: string; i: string; p: string; sc: string }

const tickets: Ticket[] = [
  { id: '#SUP-084', f: 'Lois Becket (Sailor)', i: 'Missing item in delivered order', p: 'Urgent', sc: 'danger' },
  { id: '#SUP-083', f: 'Rahul Singh (Partner)', i: 'App not updating order status', p: 'High', sc: 'warning' },
  { id: '#SUP-082', f: 'Ali Mahmoud (Sailor)', i: 'Payment deducted, order not confirmed', p: 'Urgent', sc: 'danger' },
  { id: '#SUP-081', f: 'Sara Chen (Sailor)', i: 'Coupon SHIP10 not applied', p: 'Low', sc: 'info' },
  { id: '#SUP-080', f: 'Pita Havili (Partner)', i: 'Cannot mark item as picked up', p: 'High', sc: 'warning' },
]

export function Support() {
  const ui = useUi()
  const openTicket = (t: Ticket) => ui.ticket({ id: t.id, from: t.f, issue: t.i, priority: t.p, type: 'Sailor' })

  return (
    <>
      <div className="pg-header">
        <div className="pg-header-l"><h1 className="pg-title">Support & Activity</h1><p className="pg-sub"><span>Tickets · delivery issues · activity logs</span></p></div>
        <div className="pg-actions"><button className="btn btn-primary btn-sm" onClick={() => ui.newTicket()}><i className="ti ti-plus" />New Ticket</button></div>
      </div>
      <div className="stats-row">
        <div className="stat-card sc-red"><div className="stat-stripe" /><div className="stat-top"><div className="stat-lbl">Open Tickets</div><div className="stat-icon"><i className="ti ti-lifebuoy" /></div></div><div className="stat-val">18</div><div className="stat-foot"><span>4 urgent</span></div></div>
      </div>
      <div className="card">
        <div className="card-hd"><div className="card-ttl"><i className="ti ti-lifebuoy" />Open Tickets</div></div>
        <div className="tbl-wrap">
          <table>
            <thead><tr><th>Ticket</th><th>From</th><th>Issue</th><th>Action</th></tr></thead>
            <tbody>
              {tickets.map((t) => (
                <tr key={t.id} className="tr-click" onClick={() => openTicket(t)}>
                  <td className="td-id">{t.id}</td>
                  <td><div className="flex aic g8"><Avatar name={t.f} cls="av-sm" /><span className="sm c3 w6">{t.f}</span></div></td>
                  <td className="sm c3 w5">{t.i}</td>
                  <td><button className="btn btn-ghost btn-xs" onClick={(e) => { e.stopPropagation(); openTicket(t) }}>Open</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
