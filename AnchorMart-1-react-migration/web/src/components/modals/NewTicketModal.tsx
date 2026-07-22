import { useState } from 'react'
import { Modal } from '../ui/Modal'
import { useModal } from '../../context/ModalContext'
import { useToast } from '../../context/ToastContext'
import { Segmented } from '../ui/Segmented'

export function NewTicketModal() {
  const { close } = useModal()
  const toast = useToast()
  const [subject, setSubject] = useState('')

  const submit = () => {
    const s = subject.trim()
    if (!s) { toast('Enter a subject', 'warning'); return }
    close()
    toast('Support ticket created', 'success', 'check')
  }

  return (
    <Modal
      title="New Support Ticket"
      sub="Raise a ticket on behalf of a sailor or delivery partner"
      icon="lifebuoy" iconBg="var(--teal-50)" iconColor="var(--teal-600)"
      size="lg"
      cancelText={false}
      footer={
        <>
          <button className="btn btn-ghost" onClick={close}>Cancel</button>
          <button className="btn btn-primary" onClick={submit}><i className="ti ti-plus" />Create Ticket</button>
        </>
      }
    >
      <div className="form-row">
        <div className="fg"><label className="fg-label">Raised By</label><select className="form-select" id="nt-role" defaultValue="Sailor"><option>Sailor</option><option>Delivery Partner</option></select></div>
        <div className="fg"><label className="fg-label">Name</label><input className="form-input" id="nt-name" placeholder="e.g. Lois Becket" /></div>
      </div>
      <div className="form-row">
        <div className="fg"><label className="fg-label">Related Order ID <span className="xs c4">(optional)</span></label><input className="form-input" id="nt-order" placeholder="e.g. #AM2458" /></div>
        <div className="fg"><label className="fg-label">Category</label><select className="form-select" defaultValue="Order Issue"><option>Order Issue</option><option>Payment</option><option>Delivery</option><option>Account</option><option>Coupon / Rewards</option><option>Other</option></select></div>
      </div>
      <div className="fg"><label className="fg-label">Subject</label><input className="form-input" id="nt-subject" placeholder="Short summary of the issue" value={subject} onChange={(e) => setSubject(e.target.value)} /></div>
      <div className="fg"><label className="fg-label">Priority</label>
        <Segmented options={[{ value: 'Low', label: 'Low' }, { value: 'High', label: 'High' }, { value: 'Urgent', label: 'Urgent' }]} defaultValue="Low" />
      </div>
      <div className="fg" style={{ marginBottom: 0 }}><label className="fg-label">Description</label><textarea className="form-input" id="nt-desc" style={{ height: 96 }} placeholder="Describe the issue in detail…" /></div>
    </Modal>
  )
}
