import { Modal } from '../ui/Modal'
import { useModal } from '../../context/ModalContext'
import { useToast } from '../../context/ToastContext'

export function AddPartnerModal({ data }: { data?: any }) {
  data = data || {}
  const { close } = useModal()
  const toast = useToast()
  const isEdit = !!data.name

  return (
    <Modal
      title={isEdit ? 'Edit Partner' : 'Onboard Delivery Partner'}
      icon="motorbike"
      iconBg="var(--teal-50)"
      iconColor="var(--teal-600)"
      size="md"
      footer={
        <button
          className="btn btn-primary"
          onClick={() => {
            close()
            toast(isEdit ? 'Partner updated' : 'Partner onboarded', 'success')
          }}
        >
          <i className="ti ti-check" />
          {isEdit ? 'Save Changes' : 'Onboard Partner'}
        </button>
      }
    >
      <div className="form-row">
        <div className="fg">
          <label className="fg-label">Full Name</label>
          <input className="form-input" placeholder="Partner name" defaultValue={data.name || ''} />
        </div>
        <div className="fg">
          <label className="fg-label">Email</label>
          <input className="form-input" type="email" placeholder="partner@email.com" defaultValue={data.email || ''} />
        </div>
      </div>
      <div className="form-row">
        <div className="fg">
          <label className="fg-label">Phone Number</label>
          <input className="form-input" placeholder="+65 9000 0000" defaultValue={data.phone || ''} />
        </div>
        <div className="fg">
          <label className="fg-label">Port Zone</label>
          <select className="form-select">
            <option>Port of Singapore</option>
            <option>Keppel Terminal</option>
            <option>Brani Terminal</option>
            <option>Jurong Port</option>
            <option>PSA Pasir Panjang</option>
          </select>
        </div>
      </div>
      <div className="fg">
        <label className="fg-label">Partner ID</label>
        <input className="form-input" placeholder="DP-00XXX" defaultValue={data.id || ''} />
        <div className="fg-hint">Leave blank to auto-generate</div>
      </div>
    </Modal>
  )
}
