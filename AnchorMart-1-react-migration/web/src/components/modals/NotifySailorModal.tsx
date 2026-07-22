import { useState } from 'react'
import { Modal } from '../ui/Modal'
import { useModal } from '../../context/ModalContext'
import { useToast } from '../../context/ToastContext'

export function NotifySailorModal({ refId }: { refId?: string }) {
  const { close } = useModal()
  const toast = useToast()
  const [channel, setChannel] = useState('WhatsApp')

  return (
    <Modal
      title="Notify Sailor"
      sub={refId ? 'Regarding ' + refId : 'Send an update to the sailor'}
      icon="bell"
      iconBg="var(--teal-50)"
      iconColor="var(--teal-600)"
      footer={
        <button
          className="btn btn-primary"
          onClick={() => { close(); toast('Sailor notified via ' + channel, 'success', 'send') }}
        >
          <i className="ti ti-send" />Send Notification
        </button>
      }
    >
      <div className="fg">
        <label className="fg-label">Sailor</label>
        <input className="form-input" defaultValue="Lois Becket" readOnly />
      </div>
      <div className="form-row">
        <div className="fg">
          <label className="fg-label">Channel</label>
          <select className="form-select" value={channel} onChange={(e) => setChannel(e.target.value)}>
            <option>WhatsApp</option>
            <option>Email</option>
            <option>Push Notification</option>
          </select>
        </div>
        <div className="fg">
          <label className="fg-label">Priority</label>
          <select className="form-select">
            <option>Normal</option>
            <option>High</option>
          </select>
        </div>
      </div>
      <div className="fg">
        <label className="fg-label">Subject</label>
        <input
          className="form-input"
          placeholder="e.g. Update on your order"
          defaultValue="Update on your verification report"
        />
      </div>
      <div className="fg" style={{ marginBottom: 0 }}>
        <label className="fg-label">Message</label>
        <textarea
          className="form-input"
          placeholder="Type your message to the sailor…"
          style={{ height: 110 }}
          defaultValue="Hi, your order has been verified in-store. 1 item is unavailable — please review the suggested substitute at your convenience."
        />
      </div>
    </Modal>
  )
}
