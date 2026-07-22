import { useState } from 'react'
import { Avatar, ProductThumb } from '../lib/images'
import { Modal } from '../components/ui/Modal'
import { useModal } from '../context/ModalContext'
import { useToast } from '../context/ToastContext'

interface Req {
  r: string
  n: string
  e: string
  ph: string
  prod: string
  brand: string
  qty: number
  desc: string
  ship: string
  dt: string
  img: boolean
  st: string
  sc: string
}

const requests: Req[] = [
  { r: '#SRQ-0091', n: 'Lois Becket', e: 'lois.becket@maersk.com', ph: '+65 8123 4471', prod: 'Sennheiser HD 450BT Headphones', brand: 'Sennheiser', qty: 1, desc: 'Wireless noise-cancelling headphones, black colour preferred. Needed before next sailing.', ship: 'MSC Marvela · Berth 7', dt: '02 Jun 2026 · 09:14', img: true, st: 'Pending', sc: 'warning' },
  { r: '#SRQ-0090', n: 'Ali Mahmoud', e: 'ali.mahmoud@apl.com', ph: '+65 9034 1182', prod: 'Omega-3 Fish Oil Capsules', brand: 'Nordic Naturals', qty: 3, desc: '1000mg softgels, 120 count bottles. Required for crew health supplies.', ship: 'APL Vanda · PSA', dt: '01 Jun 2026 · 17:42', img: false, st: 'Approved', sc: 'success' },
  { r: '#SRQ-0089', n: 'James Wren', e: 'j.wren@evergreen-line.com', ph: '+65 8890 2245', prod: 'Casio G-Shock GA-2100 Watch', brand: 'Casio', qty: 1, desc: 'Carbon core guard, black resin band. Gift for end of contract.', ship: 'Evergreen Ace · Brani', dt: '01 Jun 2026 · 11:08', img: true, st: 'Approved', sc: 'success' },
  { r: '#SRQ-0088', n: 'Sara Chen', e: 'sara.chen@oocl.com', ph: '+65 9112 7763', prod: 'Korean Skincare Set (COSRX)', brand: 'COSRX', qty: 2, desc: 'Snail mucin essence + acne patches. Any variant acceptable.', ship: 'OOCL Tokyo · Anch. 2', dt: '31 May 2026 · 20:31', img: false, st: 'Pending', sc: 'warning' },
  { r: '#SRQ-0087', n: 'Ravi Patel', e: 'ravi.patel@anglo-eastern.com', ph: '+65 8456 9920', prod: 'Bose SoundLink Flex Speaker', brand: 'Bose', qty: 1, desc: 'Portable bluetooth speaker, waterproof. Blue or black.', ship: 'IMO 0123456 · PSA', dt: '31 May 2026 · 08:55', img: false, st: 'Rejected', sc: 'danger' },
]

function SpecialRequestDetail({ req }: { req: Req }) {
  const { close } = useModal()
  const toast = useToast()
  const shipParts = (req.ship || '').split(' · ')
  return (
    <Modal
      title="Special Request Item"
      sub={req.r || '#SRQ-0000'}
      icon="clipboard-text"
      iconBg="var(--navy-50)"
      iconColor="var(--navy-600)"
      size="lg"
      footer={
        <>
          <button className="btn btn-danger" onClick={() => { close(); toast('Request rejected and sailor notified', 'danger', 'x') }}><i className="ti ti-x" />Reject</button>
          <button className="btn btn-primary" onClick={() => { close(); toast('Payment link sent to sailor', 'success', 'send') }}><i className="ti ti-send" />Confirm &amp; Send Payment Link</button>
        </>
      }
    >
      <div className="sec-label">Requested By</div>
      <div style={{ background: 'var(--navy-25)', borderRadius: 'var(--radius-md)', padding: '16px', marginBottom: '20px' }}>
        <div className="flex aic g12 mb14">
          <Avatar name={req.n || ''} />
          <div className="f1"><div className="w7 c1" style={{ fontSize: '15px' }}>{req.n || '—'}</div><div className="xs c4">Sailor</div></div>
          <span className={`badge badge-${req.sc || 'neutral'}`}>{req.st || 'Pending'}</span>
        </div>
        <div className="form-row" style={{ marginBottom: 0 }}>
          <div className="mini-stat"><div className="mini-stat-val" style={{ fontSize: '13px' }}>{req.e || '—'}</div><div className="mini-stat-lbl">Email</div></div>
          <div className="mini-stat"><div className="mini-stat-val mono">{req.ph || '—'}</div><div className="mini-stat-lbl">Phone</div></div>
          <div className="mini-stat"><div className="mini-stat-val">{req.ship || '—'}</div><div className="mini-stat-lbl">Ship / Port</div></div>
          <div className="mini-stat"><div className="mini-stat-val">{req.dt || '—'}</div><div className="mini-stat-lbl">Date of Request</div></div>
        </div>
      </div>
      <div className="sec-label">Item Details</div>
      <div className="form-row">
        <div className="fg"><label className="fg-label">Product Name</label><div className="ecard" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><ProductThumb keyword={req.prod || ''} cls="sm" /><span>{req.prod || '—'}</span></div></div>
        <div className="fg"><label className="fg-label">Brand</label><div className="ecard">{req.brand || '—'}</div></div>
      </div>
      <div className="form-row">
        <div className="fg"><label className="fg-label">Quantity</label><div className="ecard">{req.qty || 1}</div></div>
        <div className="fg"></div>
      </div>
      <div className="fg"><label className="fg-label">Description</label><div className="ecard" style={{ lineHeight: 1.5 }}>{req.desc || 'No description provided.'}</div></div>
      <div className="fg"><label className="fg-label">Uploaded Image</label>
        {req.img
          ? <div className="srq-img"><i className="ti ti-photo" /><span>product-image.jpg</span></div>
          : <div className="srq-img empty"><i className="ti ti-photo-off" /><span>No image provided</span></div>}
      </div>
      <div className="sec-label mt16">Ship &amp; Delivery Information</div>
      <div className="form-row">
        <div className="fg"><label className="fg-label">Ship Information</label><input className="form-input" defaultValue={shipParts[0] || ''} placeholder="Vessel name" /></div>
        <div className="fg"><label className="fg-label">IMO Number</label><input className="form-input mono" placeholder="IMO 0000000" defaultValue="0123456" /></div>
      </div>
      <div className="form-row triple">
        <div className="fg"><label className="fg-label">Stroke Terminal</label><input className="form-input" placeholder="e.g. Berth 7" defaultValue={shipParts[1] || ''} /></div>
        <div className="fg"><label className="fg-label">Expected Arrival Date</label><input className="form-input" type="date" /></div>
        <div className="fg"><label className="fg-label">Expected Arrival Time</label><input className="form-input" type="time" /></div>
      </div>
      <div className="form-row">
        <div className="fg"><label className="fg-label">Expected Stay <span className="xs c4">(helps planning)</span></label><input className="form-input" placeholder="e.g. 2 days" /></div>
        <div className="fg"><label className="fg-label">Communication Preference</label><select className="form-select"><option>WhatsApp</option><option>Email</option></select></div>
      </div>
      <div className="fg"><label className="fg-label">Special Instructions for Delivery Partner</label><textarea className="form-input" placeholder="Any delivery notes for the partner…" style={{ height: '64px' }} /></div>
      <div className="sec-label mt16">Pricing</div>
      <div className="form-row" style={{ marginBottom: 0 }}>
        <div className="fg"><label className="fg-label">Estimated Price ($)</label><input className="form-input" type="number" id="srq-price" placeholder="Enter estimated price set by admin" /></div>
        <div className="fg"></div>
      </div>
    </Modal>
  )
}

export function Requests() {
  const modal = useModal()
  const toast = useToast()
  const [status, setStatus] = useState('All')
  const [query, setQuery] = useState('')

  const view = (req: Req) => modal.open(<SpecialRequestDetail req={req} />)

  const list = requests.filter((i) => {
    const okS = status === 'All' || i.st === status
    const okQ = !query || (i.r + ' ' + i.n + ' ' + i.prod + ' ' + i.brand).toLowerCase().indexOf(query) >= 0
    return okS && okQ
  })

  return (
    <>
      <div className="pg-header">
        <div className="pg-header-l"><h1 className="pg-title">Special Request Items</h1><p className="pg-sub"><span>Custom item requests submitted by sailors from the app</span></p></div>
        <div className="pg-actions">
          <div className="input-wrap"><i className="ti ti-search pre" /><input type="text" className="form-input has-icon" placeholder="Search requests…" style={{ width: '200px' }} onInput={(e) => setQuery(e.currentTarget.value.toLowerCase().trim())} /></div>
          <select className="form-select" onChange={(e) => setStatus(e.currentTarget.value === 'All Status' ? 'All' : e.currentTarget.value)}>
            <option>All Status</option><option>Pending</option><option>Approved</option><option>Rejected</option>
          </select>
          <button className="btn btn-secondary" onClick={() => toast('Exporting CSV…', '', 'download')}><i className="ti ti-download" />Export</button>
        </div>
      </div>
      <div className="stats-row">
        <div className="stat-card sc-navy"><div className="stat-stripe" /><div className="stat-top"><div className="stat-lbl">Total Requests</div><div className="stat-icon"><i className="ti ti-clipboard-text" /></div></div><div className="stat-val">28</div><div className="stat-foot"><span>This month</span></div></div>
        <div className="stat-card sc-amber"><div className="stat-stripe" /><div className="stat-top"><div className="stat-lbl">Pending Review</div><div className="stat-icon"><i className="ti ti-clock" /></div></div><div className="stat-val">5</div><div className="stat-foot"><span>Awaiting action</span></div></div>
        <div className="stat-card sc-green"><div className="stat-stripe" /><div className="stat-top"><div className="stat-lbl">Approved</div><div className="stat-icon"><i className="ti ti-check" /></div></div><div className="stat-val">14</div><div className="stat-foot"><span>Added to catalog</span></div></div>
      </div>
      <div className="card" id="requests-table">
        <div className="tbl-wrap"><table>
          <thead><tr><th>Order ID</th><th>Sailor</th><th>Phone</th><th>Product</th><th>Brand</th><th>Qty</th><th>Requested</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {list.length ? list.map((i) => (
              <tr className="tr-click" key={i.r} onClick={() => view(i)}>
                <td className="td-id xs">{i.r}</td>
                <td><div className="flex aic g8"><Avatar name={i.n} cls="av-sm" /><div><div className="td-p">{i.n}</div><div className="xs c4">{i.e}</div></div></div></td>
                <td className="td-m">{i.ph}</td>
                <td><div className="flex aic g8"><ProductThumb keyword={i.prod} cls="sm" /><span className="td-m trunc" style={{ maxWidth: '180px', display: 'block' }}>{i.prod}</span></div></td>
                <td className="td-m">{i.brand}</td>
                <td className="td-m" style={{ textAlign: 'center' }}>{i.qty}</td>
                <td className="td-m">{i.dt}</td>
                <td><span className={`badge badge-${i.sc}`}>{i.st}</span></td>
                <td><div className="td-acts"><button className="btn btn-ghost btn-sm btn-icon" title="View" onClick={(e) => { e.stopPropagation(); view(i) }}><i className="ti ti-eye" /></button></div></td>
              </tr>
            )) : (
              <tr><td colSpan={9} className="td-m" style={{ textAlign: 'center', padding: '28px' }}>No requests match this filter.</td></tr>
            )}
          </tbody>
        </table></div>
      </div>
    </>
  )
}
