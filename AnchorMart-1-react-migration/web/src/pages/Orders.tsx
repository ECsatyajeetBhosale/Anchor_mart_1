import { useState } from 'react'
import { Avatar, ProductThumb } from '../lib/images'
import { useUi } from '../components/modals/useUi'
import { useToast } from '../context/ToastContext'

interface OrderItem { name: string; qty: number; price: string }
interface Order {
  id: string; s: string; src: string; it: string; sh: string; imo: string; term: string
  intent: string; chFrom?: string; chTo?: string; ecost?: string; paid?: boolean
  pt: string; pay: string; cp: string; t: string; st: string; sc: string
  delivered?: boolean; items: OrderItem[]
}

const orders: Order[] = [
  { id: '#AM2458', s: 'Lois Becket', src: 'Mobile App', it: 'Titan Watch, Card Holder', sh: '0123456 · Anch.2', imo: 'IMO 0123456', term: 'Anchorage 2', intent: '#INT-0047', chFrom: 'Anchorage 1', chTo: 'Anchorage 2', ecost: '$4.50', paid: false, pt: 'Rahul Singh', pay: 'Card ✓', cp: 'SHIP10', t: '$84.00', st: 'In Progress', sc: 'warning', items: [{ name: 'Titan Quartz Watch', qty: 1, price: '$75.00' }, { name: 'Leather Card Holder', qty: 1, price: '$9.00' }] },
  { id: '#AM2461', s: 'Ali Mahmoud', src: 'Website', it: 'Nu Republic ×2, Protein Bar', sh: 'MSC Marvela · B7', imo: 'MSC Marvela', term: 'Berth 7', intent: '#INT-0048', pt: 'Rahul Singh', pay: 'Card ✓', cp: '—', t: '$70.45', st: 'Verifying', sc: 'info', items: [{ name: 'Nu Republic Power Bank', qty: 2, price: '$24.00' }, { name: 'Protein Bar Variety Pack', qty: 1, price: '$22.45' }] },
  { id: '#AM2463', s: 'James Wren', src: 'Mobile App', it: 'Coffee, Tablets, Side table', sh: 'Evergreen · Brani', imo: 'Evergreen Ace', term: 'Brani Terminal', intent: '#INT-0049', pt: 'Pita Havili', pay: 'Card ✓', cp: 'FREESHIP', t: '$48.00', st: 'In Progress', sc: 'warning', items: [{ name: 'Lavazza Coffee', qty: 1, price: '$11.30' }, { name: 'Paracetamol Tablets', qty: 2, price: '$24.00' }, { name: 'Folding Side Table', qty: 1, price: '$12.70' }] },
  { id: '#AM2465', s: 'Sara Chen', src: 'Website', it: 'Echo Dot 5th Gen, Echo Buds', sh: 'APL Vanda · PSA', imo: 'APL Vanda', term: 'PSA Terminal', intent: '#INT-0050', chFrom: 'Berth PSA', chTo: 'Berth 14', ecost: '$6.00', paid: true, pt: 'Marco Reyes', pay: 'Card ✓', cp: '—', t: '$94.99', st: 'Delivered', sc: 'success', delivered: true, items: [{ name: 'Echo Dot 5th Gen', qty: 1, price: '$39.99' }, { name: 'Echo Buds', qty: 1, price: '$55.00' }] },
  { id: '#AM2466', s: 'Lois Becket', src: 'Mobile App', it: 'Sennheiser HD 450BT', sh: 'MSC Marvela · B7', imo: 'MSC Marvela', term: 'Berth 7', intent: '#INT-0051', pt: 'Unassigned', pay: 'Pending', cp: '—', t: '$120.00', st: 'Awaiting Payment', sc: 'warning', items: [{ name: 'Sennheiser HD 450BT', qty: 1, price: '$120.00' }] },
  { id: '#AM2467', s: 'Ravi Patel', src: 'Mobile App', it: 'Express items ×6', sh: 'IMO 0123456', imo: 'IMO 0123456', term: 'PSA', intent: '#INT-0052', pt: 'Unassigned', pay: 'Pending', cp: '—', t: '$32.00', st: 'New', sc: 'neutral', items: [{ name: 'Bisleri Water 1L', qty: 3, price: '$6.00' }, { name: "Lay's Classic", qty: 3, price: '$9.00' }, { name: 'Amul Milk 500ml', qty: 6, price: '$17.00' }] },
  { id: '#AM2451', s: 'Maria Santos', src: 'Website', it: 'KILLER Running Shoes', sh: 'MSC Marvela', imo: 'MSC Marvela', term: '—', intent: '#INT-0045', pt: '—', pay: 'Refund', cp: '—', t: '$67.00', st: 'Cancelled', sc: 'danger', items: [{ name: 'KILLER Running Shoes', qty: 1, price: '$67.00' }] },
]

const TABS = [
  { st: 'All', label: 'All (184)' },
  { st: 'New', label: 'New (12)' },
  { st: 'Verifying', label: 'Verifying (8)' },
  { st: 'Awaiting Payment', label: 'Awaiting Payment (12)' },
  { st: 'In Progress', label: 'In Progress (47)' },
  { st: 'Delivered', label: 'Delivered (129)' },
  { st: 'Cancelled', label: 'Cancelled (6)' },
]

const SymCheck = () => (
  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: '-2px', color: 'var(--success-icon)' }}>
    <path d="M20 6 9 17l-5-5" />
  </svg>
)

export function Orders() {
  const ui = useUi()
  const toast = useToast()
  const { confirm } = ui
  const [status, setStatus] = useState('All')
  const [query, setQuery] = useState('')

  const list = orders.filter((o) => {
    const okS = status === 'All' || o.st === status
    const okQ = !query || `${o.id} ${o.s} ${o.it}`.toLowerCase().indexOf(query) >= 0
    return okS && okQ
  })

  const anchorageCell = (o: Order) => {
    if (!o.chTo) return <td className="td-m" style={{ textAlign: 'center' }}>—</td>
    return (
      <td>
        <div className="flex" style={{ flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
          <span className="td-m" style={{ fontSize: '11px' }}><span className="c4">{o.chFrom}</span> <i className="ti ti-arrow-right cteal" /> <span className="td-p">{o.chTo}</span></span>
          <span className="badge badge-warning" style={{ fontSize: '10px' }}>+{o.ecost} shipping</span>
          {o.paid
            ? <span className="badge badge-success" style={{ fontSize: '10px' }}><i className="ti ti-check" /> Balance Paid</span>
            : <span className="badge badge-warning" style={{ fontSize: '10px' }}><i className="ti ti-clock" /> Balance due</span>}
        </div>
      </td>
    )
  }

  const orderRow = (o: Order) => {
    const pc = o.pt === 'Unassigned' ? 'var(--danger-text)' : 'var(--t3)'
    const payc = o.pay.includes('✓') ? 'var(--success-text)' : o.pay === 'Pending' ? 'var(--warning-text)' : 'var(--danger-text)'
    const mobile = o.src === 'Mobile App'
    const orderData = {
      id: o.id, sailor: o.s, source: o.src, ship: o.imo || o.sh, terminal: o.term || o.chTo || '—',
      partner: o.pt, payment: o.pay.includes('✓') ? 'Card · Paid' : o.pay, coupon: o.cp, total: o.t,
      status: o.st, sc: o.sc, delivered: o.st === 'Delivered', intent: o.intent, chFrom: o.chFrom,
      chTo: o.chTo, ecost: o.ecost, paid: o.paid, items: o.items,
    }
    const payParts = o.pay.split('✓')
    return (
      <tr key={o.id} className="tr-click" onClick={() => ui.orderDetail(orderData)}>
        <td className="td-id">{o.id}</td>
        <td><span className={`badge badge-${mobile ? 'teal' : 'navy'}`} style={{ fontSize: '10.5px' }}><i className={`ti ${mobile ? 'ti-device-mobile' : 'ti-world'}`} /> {o.src}</span></td>
        <td><div className="flex aic g8"><Avatar name={o.s} cls="av-sm" /><span className="td-p">{o.s}</span></div></td>
        <td><div className="flex aic g8"><ProductThumb keyword={o.items && o.items[0] ? o.items[0].name : o.it} cls="sm" /><span className="sm c3 w5 trunc" style={{ maxWidth: '150px', display: 'block' }}>{o.it}</span></div></td>
        <td className="td-m">{o.sh}</td>
        {anchorageCell(o)}
        <td style={{ color: pc, fontSize: '12.5px', fontWeight: 600 }}>{o.pt}</td>
        <td style={{ color: payc, fontSize: '12.5px', fontWeight: 700 }}>{o.pay.includes('✓') ? <>{payParts[0]}<SymCheck />{payParts[1]}</> : o.pay}</td>
        <td className="td-m">{o.cp}</td>
        <td className="td-p w7">{o.t}</td>
        <td><span className={`badge badge-${o.sc}`}>{o.st}</span></td>
        <td>
          <div className="td-acts">
            <button className="btn btn-ghost btn-sm btn-icon" title="View" onClick={(e) => { e.stopPropagation(); ui.orderDetail(orderData) }}><i className="ti ti-eye" /></button>
            <button className="btn btn-ghost btn-sm btn-icon" title="Message" onClick={(e) => { e.stopPropagation(); toast('Message sent to ' + o.s, 'success', 'message') }}><i className="ti ti-message" /></button>
            <button className="btn btn-danger btn-sm btn-icon" title="Cancel" onClick={(e) => { e.stopPropagation(); confirm({ title: 'Cancel Order', msg: 'Cancel ' + o.id + '? A refund will be processed.', danger: true, confirmText: 'Cancel Order' }, () => { toast('Order ' + o.id + ' cancelled', 'danger', 'x') }) }}><i className="ti ti-x" /></button>
          </div>
        </td>
      </tr>
    )
  }

  return (
    <>
      <div className="pg-header">
        <div className="pg-header-l">
          <h1 className="pg-title">Orders Management</h1>
          <p className="pg-sub"><span>184 orders today</span><span className="sep">·</span><span>Full lifecycle visibility</span></p>
        </div>
        <div className="pg-actions">
          <div className="input-wrap">
            <i className="ti ti-search pre" />
            <input
              type="text"
              className="form-input has-icon"
              placeholder="Search orders…"
              style={{ width: '240px' }}
              value={query}
              onChange={(e) => setQuery(e.currentTarget.value.toLowerCase().trim())}
            />
          </div>
          <select
            className="form-select"
            value={status === 'All' ? 'All Status' : status}
            onChange={(e) => setStatus(e.currentTarget.value === 'All Status' ? 'All' : e.currentTarget.value)}
          >
            <option>All Status</option>
            <option>New</option>
            <option>Verifying</option>
            <option>Awaiting Payment</option>
            <option>In Progress</option>
            <option>Delivered</option>
            <option>Cancelled</option>
          </select>
          <button className="btn btn-secondary btn-sm" onClick={() => toast('Date range picker — coming soon', 'info', 'calendar')}><i className="ti ti-calendar" />Date Range</button>
          <button className="btn btn-primary btn-sm" onClick={() => toast('Exporting CSV…', '', 'download')}><i className="ti ti-download" />Export</button>
        </div>
      </div>

      <div className="filter-row">
        {TABS.map((t) => (
          <div
            key={t.st}
            className={`fchip${status === t.st ? ' active' : ''}`}
            data-st={t.st}
            onClick={() => setStatus(t.st)}
          >
            {t.label}
          </div>
        ))}
      </div>

      <div className="card" id="orders-table">
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr><th>Order ID</th><th>Source</th><th>Sailor</th><th>Items</th><th>Ship / Terminal</th><th>Changed Anchorage</th><th>Partner</th><th>Payment</th><th>Coupon</th><th>Total</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {list.length ? list.map(orderRow) : (
                <tr><td colSpan={12} className="td-m" style={{ textAlign: 'center', padding: '28px' }}>No orders match this filter.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="pagination">
          <span className="sm c4 w6" style={{ marginRight: 'auto' }}>Showing {list.length} of 184</span>
          <div className="pg-btn"><i className="ti ti-chevron-left" style={{ fontSize: '14px' }} /></div>
          <div className="pg-btn active">1</div>
          <div className="pg-btn">2</div>
          <div className="pg-btn">3</div>
          <div className="pg-btn"><i className="ti ti-chevron-right" style={{ fontSize: '14px' }} /></div>
        </div>
      </div>
    </>
  )
}
