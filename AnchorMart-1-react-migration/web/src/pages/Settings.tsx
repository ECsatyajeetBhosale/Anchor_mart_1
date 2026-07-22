import { useToast } from '../context/ToastContext'
import { useModal } from '../context/ModalContext'
import { Modal } from '../components/ui/Modal'

interface Admin { n: string; r: string; e: string }

const ADMINS: Admin[] = [
  { n: 'Super Admin', r: 'Super Admin', e: 'admin@anchormart.io' },
  { n: 'Ops Manager', r: 'Operations', e: 'ops@anchormart.io' },
  { n: 'Support Agent', r: 'Support', e: 'support@anchormart.io' },
]

const FAQS: string[] = [
  'How does ship delivery work?',
  'Can I change my location after ordering?',
  'How do I track my order?',
  'Which payment methods are accepted?',
  'How do I apply a coupon?',
  'Is support available offshore?',
]

const PLATFORM_CONFIG: { label: string; value: string }[] = [
  { label: 'Order cancellation window', value: '36 hours after ship arrival' },
  { label: 'Payment confirmation timeout', value: '48 hours' },
  { label: 'Loyalty points per delivery', value: '250' },
  { label: 'Referral bonus points', value: '500' },
  { label: 'Points to $ conversion rate', value: '100 pts = $1.00' },
  { label: 'Max special request description', value: '500 characters' },
]

export function Settings() {
  const toast = useToast()
  const modal = useModal()

  const addAdmin = () => {
    modal.open(
      <Modal
        title="Add Admin Account"
        icon="user-plus"
        footer={
          <button
            className="btn btn-primary"
            onClick={() => { modal.close(); toast('Admin invited', 'success', 'send') }}
          >
            <i className="ti ti-send" />Send Invite
          </button>
        }
      >
        <div className="fg">
          <label className="fg-label">Full Name</label>
          <input className="form-input" placeholder="Admin name" />
        </div>
        <div className="fg">
          <label className="fg-label">Email</label>
          <input className="form-input" type="email" placeholder="admin@anchormart.io" />
        </div>
        <div className="fg">
          <label className="fg-label">Role</label>
          <select className="form-select" defaultValue="Super Admin">
            <option>Super Admin</option>
            <option>Operations</option>
            <option>Support</option>
          </select>
        </div>
      </Modal>,
    )
  }

  const addFaq = () => {
    modal.open(
      <Modal
        title="Add FAQ Item"
        icon="help-circle"
        footer={
          <button
            className="btn btn-primary"
            onClick={() => { modal.close(); toast('FAQ added', 'success', 'plus') }}
          >
            <i className="ti ti-plus" />Add FAQ
          </button>
        }
      >
        <div className="fg">
          <label className="fg-label">Question</label>
          <input className="form-input" placeholder="FAQ question" />
        </div>
        <div className="fg">
          <label className="fg-label">Answer</label>
          <textarea className="form-input" style={{ height: '90px' }} placeholder="FAQ answer…" />
        </div>
      </Modal>,
    )
  }

  const removeAdmin = (a: Admin) =>
    modal.confirm(
      { title: 'Remove Admin', msg: 'Remove ' + a.n + '?', danger: true, confirmText: 'Remove' },
      () => toast('Admin removed', 'danger', 'trash'),
    )

  const removeFaq = () =>
    modal.confirm(
      { title: 'Remove FAQ', msg: 'Remove this FAQ item?', danger: true, confirmText: 'Remove' },
      () => toast('FAQ removed', 'danger', 'trash'),
    )

  return (
    <>
      <div className="pg-header">
        <div className="pg-header-l">
          <h1 className="pg-title">Settings</h1>
          <p className="pg-sub"><span>Platform configuration, admin accounts, preferences</span></p>
        </div>
        <div className="pg-actions">
          <button
            className="btn btn-primary"
            onClick={() => toast('Settings saved', 'success', 'device-floppy')}
          >
            <i className="ti ti-device-floppy" />Save Changes
          </button>
        </div>
      </div>
      <div className="grid-2">
        <div className="card">
          <div className="card-hd">
            <div className="card-ttl"><i className="ti ti-settings" />Platform Configuration</div>
          </div>
          <div className="card-body">
            {PLATFORM_CONFIG.map((f, i) => (
              <div className={`fg${i === PLATFORM_CONFIG.length - 1 ? ' mb0' : ''}`} key={f.label}>
                <label className="fg-label">{f.label}</label>
                <input className="form-input" defaultValue={f.value} />
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="card mb16">
            <div className="card-hd">
              <div className="card-ttl"><i className="ti ti-users" />Admin Accounts</div>
              <button className="btn btn-ghost btn-sm" onClick={addAdmin}><i className="ti ti-plus" />Add Admin</button>
            </div>
            <div className="card-body-sm">
              {ADMINS.map((a) => (
                <div className="flex aic g10 mb12 ecard" key={a.e}>
                  <div className="av av-navy">{a.n[0]}</div>
                  <div className="f1 mw0">
                    <div className="sm w7 c1">{a.n}</div>
                    <div className="xs c4">{a.r} · {a.e}</div>
                  </div>
                  <span className="badge badge-success">Active</span>
                  <button
                    className="btn btn-ghost btn-sm btn-icon"
                    title="Edit"
                    onClick={() => toast('Edit admin opened', '', 'edit')}
                  >
                    <i className="ti ti-edit" />
                  </button>
                  <button
                    className="btn btn-danger btn-sm btn-icon"
                    title="Remove"
                    onClick={() => removeAdmin(a)}
                  >
                    <i className="ti ti-trash" />
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div className="card">
            <div className="card-hd">
              <div className="card-ttl"><i className="ti ti-help-circle" />Help &amp; FAQ Management</div>
              <button className="btn btn-ghost btn-sm" onClick={addFaq}><i className="ti ti-plus" />Add FAQ</button>
            </div>
            <div className="card-body-sm">
              {FAQS.map((q, i) => (
                <div className="flex aic g10 ecard mb6" style={{ padding: '9px 12px' }} key={q}>
                  <span className="xs c4 w8" style={{ width: '18px' }}>{i + 1}</span>
                  <span className="sm c2 w6 f1">{q}</span>
                  <button
                    className="btn btn-ghost btn-xs btn-icon"
                    title="Edit"
                    onClick={() => toast('FAQ editor opened', '', 'edit')}
                  >
                    <i className="ti ti-edit" />
                  </button>
                  <button
                    className="btn btn-danger btn-xs btn-icon"
                    title="Remove"
                    onClick={removeFaq}
                  >
                    <i className="ti ti-trash" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
