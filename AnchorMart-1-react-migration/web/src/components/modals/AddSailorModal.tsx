import { Modal } from '../ui/Modal'
import { Segmented } from '../ui/Segmented'
import { useModal } from '../../context/ModalContext'
import { useToast } from '../../context/ToastContext'

export function AddSailorModal({ data }: { data?: any }) {
  data = data || {}
  const { close } = useModal()
  const toast = useToast()
  const isEdit = !!data.name

  return (
    <Modal
      title={isEdit ? 'Edit Sailor' : 'Add New Sailor'}
      sub={isEdit ? 'Update sailor account details' : 'Register a new sailor to the platform'}
      icon="users"
      iconBg="var(--navy-50)"
      iconColor="var(--navy-600)"
      size="md"
      footer={
        <button
          className="btn btn-primary"
          onClick={() => {
            close()
            toast(`${isEdit ? 'Sailor updated' : 'Sailor added'} successfully`, 'success')
          }}
        >
          <i className="ti ti-check" />
          {isEdit ? 'Save Changes' : 'Add Sailor'}
        </button>
      }
    >
      <div className="form-row">
        <div className="fg">
          <label className="fg-label">Full Name</label>
          <input className="form-input" placeholder="e.g. Lois Becket" defaultValue={data.name || ''} />
        </div>
        <div className="fg">
          <label className="fg-label">Email Address</label>
          <input className="form-input" type="email" placeholder="sailor@email.com" defaultValue={data.email || ''} />
        </div>
      </div>
      <div className="form-row">
        <div className="fg">
          <label className="fg-label">WhatsApp Number</label>
          <input className="form-input" placeholder="+44 7700 900000" defaultValue={data.wa || ''} />
        </div>
        <div className="fg">
          <label className="fg-label">Comm. Preference</label>
          <select className="form-select">
            <option>WhatsApp</option>
            <option>Email</option>
          </select>
        </div>
      </div>
      <div className="fg">
        <label className="fg-label">Account Status</label>
        <div style={{ marginTop: 4 }}>
          <Segmented
            options={[
              { value: 'Active', label: 'Active' },
              { value: 'Inactive', label: 'Inactive' },
            ]}
            defaultValue="Active"
          />
        </div>
      </div>
    </Modal>
  )
}
