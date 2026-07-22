import { Modal } from '../ui/Modal'
import { useModal } from '../../context/ModalContext'
import { useToast } from '../../context/ToastContext'

export function ConfigurePointsModal() {
  const { close } = useModal()
  const toast = useToast()

  return (
    <Modal
      title="Configure Loyalty Points"
      sub="Set how sailors earn and redeem points"
      icon="settings"
      iconBg="var(--amber-50)"
      iconColor="var(--amber-600)"
      size="lg"
      footer={
        <button
          className="btn btn-primary"
          onClick={() => {
            close()
            toast('Points configuration saved', 'success', 'check')
          }}
        >
          <i className="ti ti-check" />
          Save Configuration
        </button>
      }
    >
      <div className="sec-label">Earning Rules</div>
      <div className="form-row">
        <div className="fg">
          <label className="fg-label">Points per Delivery Completed</label>
          <input className="form-input" type="number" defaultValue="250" />
        </div>
        <div className="fg">
          <label className="fg-label">Points per Successful Referral</label>
          <input className="form-input" type="number" defaultValue="500" />
        </div>
      </div>
      <div className="form-row">
        <div className="fg">
          <label className="fg-label">Points per $1 Spent</label>
          <input className="form-input" type="number" defaultValue="5" />
        </div>
        <div className="fg">
          <label className="fg-label">Sign-up Bonus Points</label>
          <input className="form-input" type="number" defaultValue="100" />
        </div>
      </div>
      <div className="sec-label mt16">Redemption Rules</div>
      <div className="form-row">
        <div className="fg">
          <label className="fg-label">Redemption Rate</label>
          <input className="form-input" defaultValue="100 pts = $1.00" />
        </div>
        <div className="fg">
          <label className="fg-label">Minimum Points to Redeem</label>
          <input className="form-input" type="number" defaultValue="500" />
        </div>
      </div>
      <div className="fg">
        <label className="fg-label">Points Expiry</label>
        <select className="form-select" style={{ width: '100%' }} defaultValue="12 months">
          <option>Never</option>
          <option>6 months</option>
          <option>12 months</option>
          <option>24 months</option>
        </select>
      </div>
      <div className="form-row" style={{ marginBottom: 0 }}>
        <label className="switch">
          <input type="checkbox" defaultChecked />
          <div className="switch-track" />
          <span className="switch-label">Loyalty Program Active</span>
        </label>
        <label className="switch">
          <input type="checkbox" defaultChecked />
          <div className="switch-track" />
          <span className="switch-label">Notify sailors on points earned</span>
        </label>
      </div>
    </Modal>
  )
}
