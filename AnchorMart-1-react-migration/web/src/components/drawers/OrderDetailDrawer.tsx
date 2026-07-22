import { useDrawer } from '../../context/DrawerContext'
import { useModal } from '../../context/ModalContext'
import { useToast } from '../../context/ToastContext'
import { DELIVERY_PROOF_IMG, ProductThumb } from '../../lib/images'

const SYM_ARROW = (
  <svg
    viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor"
    strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
    style={{ verticalAlign: '-2px' }}
  >
    <path d="M5 12h14" />
    <path d="m12 5 7 7-7 7" />
  </svg>
)

export function OrderDetailDrawer({ order }: { order?: any }) {
  const { close } = useDrawer()
  const { confirm } = useModal()
  const toast = useToast()

  order = order || {
    id: '#AM2458', sailor: 'Lois Becket', source: 'Mobile App', ship: 'IMO 0123456',
    terminal: 'Anchorage 2',
    items: [{ name: 'Titan Watch', qty: 1, price: '$75.00' }, { name: 'Card Holder', qty: 1, price: '$12.00' }],
    total: '$84.00', status: 'In Progress', sc: 'warning', partner: 'Rahul Singh',
    payment: 'Card · Paid', coupon: 'SHIP10',
  }

  /* Status-aware delivery timeline — reflects the order's tab/status (New, Verifying, Awaiting Payment, In Progress, Delivered, Cancelled) */
  const STEPS = [
    { icon: 'ti-file-invoice', t: 'Intent submitted', d: '22 Apr · ' + (order.intent || '#INT-0047') },
    { icon: 'ti-checks', t: 'Intent confirmed / verified', d: '22 Apr · 14:58' },
    { icon: 'ti-credit-card', t: 'Payment confirmed — ' + (order.total || ''), d: '22 Apr · 15:24' },
    { icon: 'ti-user-check', t: 'Assigned to ' + (order.partner || 'partner'), d: '22 Apr · 15:30' },
    { icon: 'ti-motorbike', t: 'Out for delivery', d: 'En route to ' + (order.terminal || 'ship') },
    { icon: 'ti-package-check', t: 'Delivery confirmed', d: order.delivered ? 'Delivered to ship' : 'Awaiting' },
  ]
  const STAGE: Record<string, number> = { 'New': 0, 'Verifying': 1, 'Awaiting Payment': 2, 'In Progress': 4, 'Delivered': 6, 'Cancelled': -1 }
  let stg = STAGE[order.status]
  if (stg === undefined) stg = 4

  const showPayLink = (order.chTo && !order.paid) || order.status === 'Awaiting Payment'

  return (
    <>
      <div className="drawer-hd">
        <div className="drawer-title">Order {order.id}</div>
        <div className="modal-close" onClick={close}><i className="ti ti-x" /></div>
      </div>
      <div className="drawer-body">
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          <span className={`badge badge-${order.sc || 'warning'}`} style={{ fontSize: 13, padding: '5px 12px' }}>{order.status}</span>
          {order.source && (
            <span className={`badge badge-${order.source === 'Mobile App' ? 'teal' : 'navy'}`} style={{ fontSize: 13, padding: '5px 12px' }}>
              <i className={`ti ${order.source === 'Mobile App' ? 'ti-device-mobile' : 'ti-world'}`} /> {order.source}
            </span>
          )}
        </div>

        {order.enq && (
          <>
            <div className="sec-label"><i className="ti ti-route" /> {order.enq} — Live Steps</div>
            <div className="card mb20"><div className="card-body">
              <div className="dstep done"><div className="dstep-icon"><i className="ti ti-check" /></div><div className="f1"><div className="sm w7 c1">Items verified at shop</div><div className="xs c4">2 available · 1 substituted · 10:04 AM</div></div><span className="badge badge-success">Done</span></div>
              <div className="dstep done"><div className="dstep-icon"><i className="ti ti-currency-dollar" /></div><div className="f1"><div className="sm w7 c1">Payment confirmed — {order.total}</div><div className="xs c4">Via payment link · 10:52 AM</div></div><span className="badge badge-success">Done</span></div>
              <div className="dstep active"><div className="dstep-icon"><i className="ti ti-package" /></div><div className="f1"><div className="sm w7 c1">Items picked up from shop</div><div className="xs c4">{order.partner} en route to {order.terminal}</div></div><span className="badge badge-warning">Active</span></div>
              <div className="dstep pending"><div className="dstep-icon"><i className="ti ti-anchor" /></div><div className="f1"><div className="sm w7 c1">Deliver to ship</div><div className="xs c4">Handover at {order.terminal}</div></div><span className="badge badge-neutral">Pending</span></div>
              <div className="flex g8 mt16">
                <button className="btn btn-secondary btn-sm" onClick={() => toast('Chat opened with ' + order.partner, '', 'message')}><i className="ti ti-message" />Chat Partner</button>
                <button className="btn btn-accent btn-sm" onClick={() => toast('Sailor notified of ETA', 'success', 'bell')}><i className="ti ti-bell" />Notify Sailor</button>
              </div>
            </div></div>
          </>
        )}

        <div className="tl-compact mb20">
          {STEPS.map((s, i) => {
            const st = order.status === 'Cancelled'
              ? (i < 2 ? 'done' : 'pend')
              : (i < stg ? 'done' : (i === stg ? 'active' : 'pend'))
            return (
              <div className="tl-c-item" key={i}>
                <div className={`tl-c-dot ${st}`}><i className={`ti ${s.icon}`} /></div>
                <div className="tl-c-body">
                  <div className="tl-c-title">{s.t}</div>
                  <div className="tl-c-sub">{s.d}</div>
                </div>
              </div>
            )
          })}
          {order.status === 'Cancelled' && (
            <div className="tl-c-item">
              <div className="tl-c-dot pend" style={{ background: 'var(--danger-bg)', color: 'var(--danger-text)' }}><i className="ti ti-x" /></div>
              <div className="tl-c-body">
                <div className="tl-c-title">Order cancelled</div>
                <div className="tl-c-sub">Refund processed</div>
              </div>
            </div>
          )}
        </div>

        <div className="sec-label">Order Information</div>
        <div className="detail-kv"><div className="detail-k">Sailor</div><div className="detail-v">{order.sailor}</div></div>
        <div className="detail-kv"><div className="detail-k">Order Source</div><div className="detail-v">{order.source || '—'}</div></div>
        <div className="detail-kv"><div className="detail-k">Intent Ref</div><div className="detail-v mono">{order.intent || '—'}</div></div>
        <div className="detail-kv"><div className="detail-k">Ship / IMO</div><div className="detail-v mono cteal">{order.ship}</div></div>
        <div className="detail-kv"><div className="detail-k">Terminal</div><div className="detail-v">{order.terminal}</div></div>
        {order.chTo && (
          <div className="detail-kv"><div className="detail-k">Anchorage Change</div><div className="detail-v">
            <span className="c4">{order.chFrom}</span> {SYM_ARROW} <span className="cteal w7">{order.chTo}</span> · +{order.ecost} {order.paid
              ? <span className="badge badge-success" style={{ fontSize: 10 }}>Paid</span>
              : <span className="badge badge-warning" style={{ fontSize: 10 }}>Balance due</span>}
          </div></div>
        )}
        <div className="detail-kv"><div className="detail-k">Delivery Partner</div><div className="detail-v">{order.partner}</div></div>
        <div className="detail-kv"><div className="detail-k">Payment</div><div className={`detail-v ${order.payment && order.payment.indexOf('Paid') >= 0 ? 'csuccess' : ''}`}>{order.payment}</div></div>
        <div className="detail-kv"><div className="detail-k">Coupon</div><div className="detail-v">{order.coupon || 'None'}</div></div>

        <div className="sec-label mt16">Items</div>
        {(order.items || []).map((item: any, i: number) => (
          <div className="detail-kv" key={i}>
            <div className="detail-k w5 c4" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ProductThumb keyword={item.name} cls="sm" /><span>{item.name} ×{item.qty}</span>
            </div>
            <div className="detail-v">{item.price}</div>
          </div>
        ))}
        <div style={{ background: 'var(--navy-25)', borderRadius: 'var(--radius-md)', padding: '14px 16px', marginTop: 14 }}>
          <div className="flex jb" style={{ marginBottom: 6 }}><span className="sm c3 w6">Order Total</span><span className="w8" style={{ fontSize: 16 }}>{order.total}</span></div>
        </div>

        {order.delivered && (
          <>
            <div className="sec-label mt16"><i className="ti ti-camera" /> Delivery Proof</div>
            <div style={{ border: '1px solid var(--border-sm)', borderRadius: 'var(--radius-md)', overflow: 'hidden', maxWidth: 280 }}>
              <img src={DELIVERY_PROOF_IMG} alt="Delivery proof photo" style={{ width: '100%', display: 'block' }} />
              <div className="xs c4" style={{ padding: '8px 10px', background: 'var(--surface-alt)' }}><i className="ti ti-photo" /> Uploaded by {order.partner} on delivery</div>
            </div>
          </>
        )}

        <div className="flex g8 mt20">
          {showPayLink && (
            <button className="btn btn-primary" onClick={() => { close(); toast('Payment link sent to ' + order.sailor, 'success', 'send') }}><i className="ti ti-send" />Send Payment Link</button>
          )}
          <button className="btn btn-accent" onClick={() => toast('Notification sent to sailor', 'success', 'bell')}><i className="ti ti-bell" />Notify Sailor</button>
          <button className="btn btn-danger mla" onClick={() => { close(); confirm({ title: 'Cancel Order', msg: 'This will cancel order ' + order.id + ' and trigger refund processing. This cannot be undone.', icon: 'x-circle', danger: true, confirmText: 'Cancel Order' }, () => { toast('Order cancelled', 'danger', 'x') }) }}><i className="ti ti-x" />Cancel</button>
        </div>
      </div>
    </>
  )
}
