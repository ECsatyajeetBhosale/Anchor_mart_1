import { useDrawer } from '../../context/DrawerContext'
import { useToast } from '../../context/ToastContext'
import { Segmented } from '../ui/Segmented'

export function TicketDrawer({ ticket }: { ticket?: any }) {
  const { close } = useDrawer()
  const toast = useToast()

  ticket = ticket || { id: '#SUP-084', from: 'Lois Becket', type: 'Sailor', issue: 'Missing item in delivered order', priority: 'Urgent' }

  return (
    <>
      <div className="drawer-hd">
        <div className="drawer-title">Support Ticket {ticket.id}</div>
        <div className="modal-close" onClick={close}><i className="ti ti-x" /></div>
      </div>
      <div className="drawer-body">
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          <span className={`badge badge-${ticket.priority === 'Urgent' ? 'danger' : ticket.priority === 'High' ? 'warning' : 'info'}`}>{ticket.priority} Priority</span>
          <span className="badge badge-neutral">Open</span>
          <span className="badge badge-blue">{ticket.type} Issue</span>
        </div>
        <div className="sec-label">Ticket Details</div>
        <div className="detail-kv"><div className="detail-k">Ticket ID</div><div className="detail-v mono cteal">{ticket.id}</div></div>
        <div className="detail-kv"><div className="detail-k">Submitted by</div><div className="detail-v">{ticket.from}</div></div>
        <div className="detail-kv"><div className="detail-k">Issue</div><div className="detail-v">{ticket.issue}</div></div>
        <div className="detail-kv"><div className="detail-k">Submitted</div><div className="detail-v">29 May 2026 · 09:14 AM</div></div>
        <div className="detail-kv"><div className="detail-k">Assigned To</div><div className="detail-v">Support Agent</div></div>
        <div className="sec-label mt16">Conversation</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
          <div className="chat-bubble recv" style={{ maxWidth: '100%' }}><strong>{ticket.from}:</strong> {ticket.issue}. Please help me resolve this ASAP.</div>
          <div className="chat-bubble sent" style={{ maxWidth: '100%' }}>Hi, we've received your report and are investigating. We'll update you within 2 hours.</div>
        </div>
        <div className="fg"><label className="fg-label">Reply</label><textarea className="form-input" style={{ height: 80 }} placeholder="Type your response…" /></div>
        <div className="fg"><label className="fg-label">Status</label>
          <select className="form-select" defaultValue="Open"><option>Open</option><option>In Progress</option><option>Awaiting User</option><option>Resolved</option><option>Closed</option></select>
        </div>
        <div className="fg"><label className="fg-label">Priority</label>
          <Segmented
            options={[{ value: 'Low', label: 'Low' }, { value: 'High', label: 'High' }, { value: 'Urgent', label: 'Urgent' }]}
            defaultValue={ticket.priority === 'Low' ? 'Low' : ticket.priority === 'High' ? 'High' : ticket.priority === 'Urgent' ? 'Urgent' : undefined}
          />
        </div>
      </div>
      <div className="drawer-foot">
        <button className="btn btn-secondary" onClick={close}>Cancel</button>
        <button className="btn btn-success" onClick={() => { close(); toast('Ticket marked resolved', 'success', 'check') }}><i className="ti ti-check" />Mark Resolved</button>
        <button className="btn btn-primary" onClick={() => toast('Reply sent', 'success', 'send')}><i className="ti ti-send" />Send Reply</button>
      </div>
    </>
  )
}
