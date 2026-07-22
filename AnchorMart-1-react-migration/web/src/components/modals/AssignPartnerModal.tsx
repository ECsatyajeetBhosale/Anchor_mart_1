import { Modal } from '../ui/Modal'
import { useModal } from '../../context/ModalContext'
import { useToast } from '../../context/ToastContext'

export function AssignPartnerModal({ orderId }: { orderId?: string }) {
  const { close } = useModal()
  const toast = useToast()
  return (
    <Modal
      title="Assign Delivery Partner"
      sub={'Order ' + (orderId || '#AM2467')}
      icon="motorbike"
      iconBg="var(--teal-50)"
      iconColor="var(--teal-600)"
      footer={
        <button
          className="btn btn-primary"
          onClick={() => { close(); toast('Partner assigned successfully', 'success', 'check') }}
        >
          <i className="ti ti-check" />Assign Partner
        </button>
      }
    >
      <div className="fg">
        <label className="fg-label">Select Partner</label>
        <select className="form-select">
          <option value="">Choose a delivery partner…</option>
          <option>Aisha Karimi · DP-00056 · Singapore (Free)</option>
          <option>David Lim · DP-00033 · Jurong (Free)</option>
          <option>Pita Havili · DP-00087 · Singapore (2 active)</option>
        </select>
      </div>
      <div className="fg">
        <label className="fg-label">Select Intent / Order</label>
        <select className="form-select">
          <option value="">Choose an intent or order…</option>
          <option>#INT-0047 · Lois Becket</option>
          <option>#INT-0051 · Ali Mahmoud</option>
          <option>#AM2467 · Sara Chen</option>
          <option>#AM2470 · James Wren</option>
        </select>
      </div>
      <div className="fg">
        <label className="fg-label">Special Instructions</label>
        <textarea
          className="form-input"
          placeholder="Instructions for the delivery partner…"
          style={{ height: 70 }}
        />
      </div>
    </Modal>
  )
}
