import { useState } from 'react'
import { Modal } from '../ui/Modal'
import { useModal } from '../../context/ModalContext'
import { useToast } from '../../context/ToastContext'
import { Avatar } from '../../lib/images'

const COUPON_USERS = [
  { n: 'Lois Becket', id: 'SLR-0012' },
  { n: 'Ali Mahmoud', id: 'SLR-0048' },
  { n: 'James Wren', id: 'SLR-0071' },
  { n: 'Sara Chen', id: 'SLR-0093' },
  { n: 'Ravi Patel', id: 'SLR-0104' },
  { n: 'Maria Santos', id: 'SLR-0119' },
]

export function AddCouponModal({ data }: { data?: any }) {
  data = data || {}
  const { close } = useModal()
  const toast = useToast()
  const isEdit = !!data.code
  const [applies, setApplies] = useState('All Sailors')

  return (
    <Modal
      title={isEdit ? 'Edit Coupon' : 'Create Coupon'}
      icon="ticket"
      iconBg="var(--amber-50)"
      iconColor="var(--amber-600)"
      footer={
        <button
          className="btn btn-primary"
          onClick={() => {
            close()
            toast(isEdit ? 'Coupon updated' : 'Coupon created', 'success')
          }}
        >
          <i className="ti ti-check" />
          {isEdit ? 'Save Changes' : 'Create Coupon'}
        </button>
      }
    >
      <div className="form-row">
        <div className="fg">
          <label className="fg-label">Coupon Code</label>
          <input
            className="form-input"
            placeholder="e.g. SHIP10"
            style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 15 }}
            defaultValue={data.code || ''}
          />
        </div>
        <div className="fg">
          <label className="fg-label">Discount Type</label>
          <select className="form-select">
            <option>Percentage (%)</option>
            <option>Fixed Amount ($)</option>
            <option>Free Shipping</option>
          </select>
        </div>
      </div>
      <div className="form-row">
        <div className="fg">
          <label className="fg-label">Discount Value</label>
          <input className="form-input" type="number" placeholder="10" defaultValue={data.value || ''} />
        </div>
        <div className="fg">
          <label className="fg-label">Min. Order Value ($)</label>
          <input className="form-input" type="number" placeholder="50" />
        </div>
      </div>
      <div className="form-row">
        <div className="fg">
          <label className="fg-label">Expiry Date</label>
          <input className="form-input" type="date" defaultValue="2026-10-31" />
        </div>
        <div className="fg">
          <label className="fg-label">Max Uses</label>
          <input className="form-input" type="number" placeholder="Unlimited" />
        </div>
      </div>
      <div className="fg">
        <label className="fg-label">Applicable To</label>
        <select
          className="form-select"
          id="coupon-applies"
          value={applies}
          onChange={(e) => setApplies(e.target.value)}
          style={{ width: '100%' }}
        >
          <option>All Sailors</option>
          <option>1st Order</option>
          <option>Referrals Only</option>
          <option>Specific Users</option>
        </select>
      </div>
      <div className="fg" id="coupon-users-field" style={{ display: applies === 'Specific Users' ? '' : 'none' }}>
        <label className="fg-label">Select Users</label>
        <div className="input-wrap" style={{ marginBottom: 8, width: '100%' }}>
          <i className="ti ti-search pre" />
          <input type="text" className="form-input has-icon" placeholder="Search sailors…" style={{ width: '100%' }} />
        </div>
        <div
          style={{
            maxHeight: 170,
            overflowY: 'auto',
            border: '1.5px solid var(--border-sm)',
            borderRadius: 'var(--radius-md)',
            padding: 6,
          }}
        >
          {COUPON_USERS.map((u) => (
            <label
              key={u.id}
              className="flex aic g10"
              style={{ padding: '7px 8px', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}
            >
              <input type="checkbox" style={{ width: 16, height: 16 }} />
              <Avatar name={u.n} cls="av-sm" />
              <div className="f1">
                <div className="sm w7 c1">{u.n}</div>
                <div className="xs c4 mono">{u.id}</div>
              </div>
            </label>
          ))}
        </div>
      </div>
    </Modal>
  )
}
