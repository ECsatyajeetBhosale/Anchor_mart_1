import { Modal } from '../ui/Modal'
import { useModal } from '../../context/ModalContext'
import { useToast } from '../../context/ToastContext'
import { ProductThumb } from '../../lib/images'

export function ReviewIntentModal({ intent }: { intent?: any }) {
  const { close } = useModal()
  const toast = useToast()
  const i = (typeof intent === 'object' && intent) ? intent : { r: intent }
  const ref = i.r

  const items: { n: string; q: number; a: boolean | null }[] = [
    { n: 'Titan Quartz Analog Watch', q: 1, a: true },
    { n: 'Brown Leather Card Holder', q: 1, a: true },
    { n: 'Bombay Shaving Kit', q: 1, a: null },
  ]

  return (
    <Modal
      title="Review Intent Request"
      sub={ref || '#INT20260422-0047'}
      icon="file-invoice"
      iconBg="var(--navy-50)"
      iconColor="var(--navy-600)"
      size="lg"
      footer={
        <>
          <button
            className="btn btn-danger"
            onClick={() => { close(); toast('Intent rejected and sailor notified', 'danger', 'x') }}
          >
            <i className="ti ti-x" />Reject
          </button>
          <button
            className="btn btn-primary"
            onClick={() => { close(); toast('Intent confirmed & payment link sent', 'success', 'send') }}
          >
            <i className="ti ti-send" />Confirm & Send Payment Link
          </button>
        </>
      }
    >
      <div style={{ background: 'var(--navy-25)', borderRadius: 'var(--radius-md)', padding: '16px', marginBottom: '20px' }}>
        <div className="form-row" style={{ marginBottom: 0 }}>
          <div className="mini-stat"><div className="mini-stat-val">{i.s || 'Lois Becket'}</div><div className="mini-stat-lbl">Sailor</div></div>
          <div className="mini-stat"><div className="mini-stat-val mono cteal">0123456</div><div className="mini-stat-lbl">IMO Number</div></div>
          <div className="mini-stat"><div className="mini-stat-val">{i.chTo || 'Anch. 2'}</div><div className="mini-stat-lbl">Terminal</div></div>
          <div className="mini-stat"><div className="mini-stat-val">{i.ar || '24 Apr'}</div><div className="mini-stat-lbl">Arrival Date</div></div>
        </div>
      </div>
      <div className="sec-label">Requested Items</div>
      {items.map((item) => (
        <div className="flex aic g12 mb10 ecard" key={item.n}>
          <ProductThumb keyword={item.n} cls="sm" />
          <div className="f1">
            <div className="sm w7 c1">{item.n}</div>
            <div className="xs c4">Qty: {item.q}</div>
          </div>
          {item.a === true
            ? <span className="badge badge-success">Available</span>
            : item.a === false
              ? <span className="badge badge-danger">Unavailable</span>
              : <span className="badge badge-neutral">Checking…</span>}
        </div>
      ))}
      <div className="sec-label mt16">Admin Response</div>
      <div className="fg"><label className="fg-label">Estimated Price ($)</label><input className="form-input" placeholder="0.00" /></div>
      <div className="fg">
        <label className="fg-label">Assign to Partner</label>
        <select className="form-select" style={{ width: '100%' }} defaultValue="">
          <option value="">Select a delivery partner…</option>
          <option>Rahul Singh · DP-00124 · On Duty</option>
          <option>Pita Havili · DP-00087 · On Duty</option>
          <option>Marco Reyes · DP-00201 · On Duty</option>
          <option>Aisha Karimi · DP-00056 · Available</option>
          <option>David Lim · DP-00098 · Available</option>
        </select>
      </div>
      <div className="fg"><label className="fg-label">Notes to Sailor</label><textarea className="form-input" placeholder="Optional notes for the sailor…" style={{ height: '70px' }} /></div>
    </Modal>
  )
}
