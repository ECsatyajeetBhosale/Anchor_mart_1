import { Modal } from '../ui/Modal'
import { useModal } from '../../context/ModalContext'
import { useToast } from '../../context/ToastContext'

export function SendNotifModal({ prefill }: { prefill?: any }) {
  const { close } = useModal()
  const toast = useToast()
  const p = prefill || {}
  return (
    <Modal
      title="Send Notification"
      icon="bell"
      iconBg="var(--info-bg)"
      iconColor="var(--info-icon)"
      size="md"
      footer={
        <button
          className="btn btn-primary"
          onClick={() => { close(); toast('Notification sent successfully', 'success', 'send') }}
        >
          <i className="ti ti-send" />Send Notification
        </button>
      }
    >
      <div className="fg">
        <label className="fg-label">Target Audience</label>
        <select className="form-select" id="notif-audience" defaultValue={p.audience === 'All Sailors' ? 'All Sailors' : undefined}>
          <option>All Sailors</option>
          <option>All Delivery Partners</option>
          <option>Specific Sailor</option>
          <option>Specific Partner</option>
          <option>Port-specific Sailors</option>
          <option>Sailors with Pending Payment</option>
        </select>
      </div>
      <div className="fg">
        <label className="fg-label">Notification Type</label>
        <select className="form-select">
          <option>Payment Required</option><option>Order Confirmed</option>
          <option>Out for Delivery</option><option>Gift / Reward Unlocked</option>
          <option>Product Unavailable</option><option>General Announcement</option>
          <option>Assignment (Partner)</option><option>Payment Received (Partner)</option>
        </select>
      </div>
      <div className="fg">
        <label className="fg-label">Message</label>
        <textarea className="form-input" style={{ height: '90px' }} placeholder="Notification message…" defaultValue={p.msg || ''} />
        <div className="fg-hint">Max 280 characters. Personalisation: {'{name}'}, {'{order_id}'}</div>
      </div>
      <div className="form-row">
        <div className="fg">
          <label className="fg-label">Send Time</label>
          <select className="form-select"><option>Send Immediately</option><option>Schedule</option></select>
        </div>
        <div className="fg">
          <label className="fg-label">Channel</label>
          <select className="form-select"><option>Push + WhatsApp</option><option>Push Only</option><option>Email Only</option></select>
        </div>
      </div>
    </Modal>
  )
}
