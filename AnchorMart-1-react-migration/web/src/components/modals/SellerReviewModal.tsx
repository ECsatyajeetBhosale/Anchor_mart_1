import { useEffect } from 'react'
import { Modal } from '../ui/Modal'
import { useModal } from '../../context/ModalContext'
import { useToast } from '../../context/ToastContext'

export function SellerReviewModal({ seller, approve }: { seller?: any; approve?: boolean }) {
  const { close, confirm } = useModal()
  const toast = useToast()
  const s = seller || { n: 'James Wren', b: 'Marine Supplies Co.', p: 'Marine equipment, safety gear' }

  // Approve path mirrors the legacy showConfirm() branch.
  useEffect(() => {
    if (approve) {
      close()
      confirm(
        {
          title: 'Approve Seller Application',
          msg:
            'Approve ' + s.n + ' (' + s.b + ') as a seller on the platform? They will receive an onboarding email.',
          icon: 'building-store',
          iconBg: 'var(--success-bg)',
          iconColor: 'var(--success-icon)',
          confirmText: 'Approve Seller',
        },
        () => { toast('Seller approved — onboarding email sent', 'success') },
      )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (approve) return null

  return (
    <Modal
      title="Reject Seller Application"
      icon="x-circle"
      iconBg="var(--danger-bg)"
      iconColor="var(--danger-icon)"
      footer={
        <button
          className="btn btn-danger"
          onClick={() => { close(); toast('Application rejected', 'danger', 'x') }}
        >
          <i className="ti ti-x" />Reject &amp; Notify
        </button>
      }
    >
      <div className="infobox mb16">
        <div className="xs c4 w7 mb4">APPLICATION</div>
        <div className="sm w7 c1">{s.n} — {s.b}</div>
        <div className="xs c4 mt4">{s.p}</div>
      </div>
      <div className="fg">
        <label className="fg-label">Rejection Reason</label>
        <select className="form-select">
          <option>Incomplete documentation</option>
          <option>Products not eligible</option>
          <option>Duplicate account</option>
          <option>Policy violation</option>
          <option>Other</option>
        </select>
      </div>
      <div className="fg">
        <label className="fg-label">Message to Applicant</label>
        <textarea className="form-input" style={{ height: 80 }} placeholder="Reason for rejection…" />
      </div>
    </Modal>
  )
}
