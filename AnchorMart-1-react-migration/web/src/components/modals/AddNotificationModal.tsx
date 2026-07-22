import { useState } from 'react'
import { Modal } from '../ui/Modal'
import { useModal } from '../../context/ModalContext'
import { useToast } from '../../context/ToastContext'

export function AddNotificationModal() {
  const { close } = useModal()
  const toast = useToast()
  const [name, setName] = useState('')

  const submit = () => {
    const n = name.trim()
    if (!n) { toast('Enter a notification name', 'warning', 'alert-triangle'); return }
    close()
    toast('Notification “' + n + '” added', 'success', 'bell-plus')
  }

  return (
    <Modal
      title="Add Notification"
      icon="bell-plus"
      iconBg="var(--info-bg)"
      iconColor="var(--info-icon)"
      size="md"
      footer={
        <button className="btn btn-primary" onClick={submit}>
          <i className="ti ti-plus" />Add Notification
        </button>
      }
    >
      <div className="fg">
        <label className="fg-label">Notification Name *</label>
        <input
          className="form-input"
          id="addnotif-name"
          placeholder="e.g. Payment Reminder"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="fg">
        <label className="fg-label">Notification Type</label>
        <select className="form-select" id="addnotif-type">
          <option>Payment Required</option><option>Order Confirmed</option>
          <option>Out for Delivery</option><option>Gift / Reward</option>
          <option>Product Update</option><option>General Announcement</option>
          <option>Assignment (Partner)</option>
        </select>
      </div>
      <div className="fg">
        <label className="fg-label">Description</label>
        <textarea className="form-input" id="addnotif-desc" style={{ height: '90px' }} placeholder="Describe this notification…" />
      </div>
    </Modal>
  )
}
