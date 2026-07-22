import { useState } from 'react'
import { useToast } from '../context/ToastContext'

const ORDER_VALUES: Record<string, string> = {
  '#AM2458': '$84.00',
  '#AM2461': '$70.45',
  '#AM2463': '$48.00',
  '#AM2465': '$94.99',
  '#AM2466': '$120.00',
  '#AM2467': '$32.00',
  '#AM2451': '$67.00',
}

interface Recent {
  o: string
  v: string
  r: string
  s: string
  sc: string
}

const recent: Recent[] = [
  { o: '#AM2451', v: '$67.00', r: '$67.00', s: 'Refunded', sc: 'success' },
  { o: '#AM2466', v: '$120.00', r: '$90.00', s: 'Pending', sc: 'warning' },
  { o: '#AM2467', v: '$32.00', r: '$32.00', s: 'Pending', sc: 'warning' },
]

export function Cancellation() {
  const toast = useToast()
  const [orderId, setOrderId] = useState('')
  const [refund, setRefund] = useState('')

  const orderValue = ORDER_VALUES[orderId.trim()] || '—'

  const save = () => {
    const id = orderId.trim()
    const ref = refund.trim()
    if (!id) { toast('Enter an order ID', 'warning'); return }
    if (!ORDER_VALUES[id]) { toast('Order not found', 'warning'); return }
    if (!ref) { toast('Enter a refund amount', 'warning'); return }
    toast('Cancellation saved — customer notified of $' + ref + ' refund', 'success', 'send')
  }

  return (
    <>
      <div className="pg-header">
        <div className="pg-header-l"><h1 className="pg-title">Special Request Cancellation</h1><p className="pg-sub"><span>Process cancellations and issue refunds to customers</span></p></div>
      </div>
      <div className="grid-2" style={{ gridTemplateColumns: '1fr 1fr', alignItems: 'start' }}>
        <div className="card">
          <div className="card-hd"><div className="card-ttl"><i className="ti ti-receipt-refund" />Cancel &amp; Refund</div></div>
          <div className="card-body">
            <div className="fg">
              <label className="fg-label">Order ID</label>
              <input className="form-input" id="canc-orderid" list="canc-orders" placeholder="e.g. #AM2458" autoComplete="off" value={orderId} onChange={(e) => setOrderId(e.currentTarget.value)} />
              <datalist id="canc-orders">
                {Object.keys(ORDER_VALUES).map((o) => <option value={o} key={o}></option>)}
              </datalist>
              <div className="fg-hint">Enter the order ID to auto-load its value</div>
            </div>
            <div className="fg"><label className="fg-label">Order Value</label><div className="ecard" id="canc-ordervalue" style={{ fontWeight: 700, color: 'var(--t1)' }}>{orderValue}</div></div>
            <div className="fg"><label className="fg-label">Refund to Customer ($)</label><input className="form-input" id="canc-refund" type="number" placeholder="Enter refund amount" value={refund} onChange={(e) => setRefund(e.currentTarget.value)} /></div>
            <div className="flex" style={{ justifyContent: 'flex-end' }}><button className="btn btn-primary" id="canc-save" onClick={save}><i className="ti ti-send" />Save and Notify</button></div>
          </div>
        </div>
        <div className="card">
          <div className="card-hd"><div className="card-ttl"><i className="ti ti-history" />Recent Cancellations</div><span className="badge badge-warning">3 pending</span></div>
          <div className="tbl-wrap"><table>
            <thead><tr><th>Order ID</th><th>Order Value</th><th>Refund</th><th>Status</th></tr></thead>
            <tbody id="canc-list">
              {recent.map((x) => (
                <tr key={x.o}>
                  <td className="td-id">{x.o}</td>
                  <td className="td-p">{x.v}</td>
                  <td className="td-p w7">{x.r}</td>
                  <td><span className={`badge badge-${x.sc}`}>{x.s}</span></td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </div>
      </div>
    </>
  )
}
