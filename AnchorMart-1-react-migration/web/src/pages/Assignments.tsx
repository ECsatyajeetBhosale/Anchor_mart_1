import { Avatar } from '../lib/images'
import { useUi } from '../components/modals/useUi'

interface Assignment { e: string; p: string; o: string; sh: string; d: string; s: string; sc: string; t: string }
interface Unassigned { id: string; s: string; it: string; p: string; pr: string }

const assignments: Assignment[] = [
  { e: 'ENQ-0042', p: 'Rahul Singh', o: '#AM2461', sh: 'Wegmans PSA', d: 'MSC Marvela·B7', s: 'Delivering', sc: 'teal', t: '12:02 PM' },
  { e: 'ENQ-0047', p: 'Pita Havili', o: '#AM2463', sh: 'EuroSpar Keppel', d: 'Evergreen·Brani', s: 'Verifying', sc: 'warning', t: '3:00 PM' },
  { e: 'ENQ-0039', p: 'Marco Reyes', o: '#AM2458', sh: 'Port Marine', d: 'APL Vanda·B14', s: 'Delivering', sc: 'teal', t: '11:45 AM' },
  { e: 'ENQ-0051', p: 'Rahul Singh', o: '#AM2467', sh: 'Wegmans PSA', d: 'IMO 0123456', s: 'New', sc: 'info', t: '1:30 PM' },
]

const unassigned: Unassigned[] = [
  { id: '#AM2467', s: 'Ravi Patel', it: 'Express items ×6', p: 'PSA Terminal', pr: 'High' },
  { id: '#AM2469', s: 'Omar Karim', it: 'Water Bottle, Tablets ×2', p: 'Keppel', pr: 'Normal' },
]

export function Assignments() {
  const ui = useUi()

  return (
    <>
      <div className="pg-header">
        <div className="pg-header-l"><h1 className="pg-title">Order Assignments</h1><p className="pg-sub"><span>Assign, reassign and monitor active delivery operations</span></p></div>
      </div>
      <div className="grid-2" style={{ gridTemplateColumns: '1.4fr 1fr' }}>
        <div>
          <div className="card">
            <div className="card-hd"><div className="card-ttl"><i className="ti ti-clipboard-list" />Active Assignments</div><span className="sm c4 w6">Click a row to view live delivery steps</span></div>
            <div className="tbl-wrap">
              <table>
                <thead><tr><th>ENQ</th><th>Partner</th><th>Order</th><th>Deliver To</th><th>Status</th><th>ETA</th></tr></thead>
                <tbody>
                  {assignments.map((a) => (
                    <tr
                      key={a.e}
                      className="tr-click"
                      onClick={() => ui.orderDetail({ id: a.o, enq: a.e, sailor: 'Lois Becket', ship: 'IMO 0123456', terminal: a.d, partner: a.p, payment: 'Card · Paid', coupon: '—', total: '$70.45', status: a.s, items: [{ name: 'Items', qty: 3, price: '$70.45' }] })}
                    >
                      <td className="td-id">{a.e}</td>
                      <td><div className="flex aic g6"><Avatar name={a.p} cls="av-sm" /><span className="sm c1 w7">{a.p.split(' ')[0]}</span></div></td>
                      <td className="td-id xs">{a.o}</td>
                      <td className="td-m">{a.d}</td>
                      <td><span className={`badge badge-${a.sc}`}>{a.s}</span></td>
                      <td className="td-m">{a.t}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div>
          <div className="card">
            <div className="card-hd"><div className="card-ttl"><i className="ti ti-alert-circle" />Unassigned Orders</div><span className="badge badge-danger">2 urgent</span></div>
            <div className="card-body-sm">
              {unassigned.map((u) => (
                <div key={u.id} className="ecard mb10" style={{ borderLeft: '3px solid var(--danger-icon)' }}>
                  <div className="flex aic g10">
                    <div className="f1">
                      <div className="flex aic g8 mb4"><span className="w8 mono cteal">{u.id}</span><span className={`badge badge-${u.pr === 'High' ? 'danger' : 'info'}`} style={{ fontSize: '10.5px' }}>{u.pr}</span></div>
                      <div className="sm c2 w6">{u.s}</div>
                      <div className="xs c4">{u.it} · {u.p}</div>
                    </div>
                    <button className="btn btn-primary btn-sm" onClick={() => ui.assignPartner(u.id)}>Assign</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
