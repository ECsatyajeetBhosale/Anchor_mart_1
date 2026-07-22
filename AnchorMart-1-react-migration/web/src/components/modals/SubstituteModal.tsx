import { Modal } from '../ui/Modal'
import { useModal } from '../../context/ModalContext'
import { useToast } from '../../context/ToastContext'

export function SubstituteModal({ item }: { item?: any }) {
  const { close } = useModal()
  const toast = useToast()
  return (
    <Modal
      title="Suggest Substitute"
      sub={'Item: ' + (item || 'Bombay Shaving Kit')}
      icon="refresh"
      iconBg="var(--warning-bg)"
      iconColor="var(--warning-icon)"
      footer={
        <button
          className="btn btn-primary"
          onClick={() => { close(); toast('Substitute sent to sailor for approval', 'success', 'send') }}
        >
          <i className="ti ti-send" />Send to Sailor for Approval
        </button>
      }
    >
      <div className="infobox mb16">
        <div className="xs c4 w7 mb4">UNAVAILABLE ITEM</div>
        <div className="sm w7 c1">{item || 'Bombay Shaving Company 5 Piece Kit'}</div>
        <div className="xs c4 mt4">Partner confirmed out of stock at Wegmans PSA</div>
      </div>
      <div className="fg">
        <label className="fg-label">Substitute Product</label>
        <input className="form-input" list="sub-product-list" id="sub-product-input" placeholder="Search substitute product…" autoComplete="off" />
        <datalist id="sub-product-list">
          <option value="Gillette Fusion5 Shaving Kit"></option>
          <option value="Nivea Men Grooming Set"></option>
          <option value="Philips OneBlade Trimmer Kit"></option>
          <option value="Bombay Shaving Company 3 Piece Kit"></option>
          <option value="Wilkinson Sword Hydro 5 Kit"></option>
          <option value="The Man Company Beard Grooming Kit"></option>
        </datalist>
        <div className="fg-hint">Start typing to search the catalog</div>
      </div>
      <div className="form-row">
        <div className="fg"><label className="fg-label">Add Tax (%)</label><input className="form-input" type="number" placeholder="0" /></div>
        <div className="fg"><label className="fg-label">Add Cost ($)</label><input className="form-input" type="number" placeholder="0.00" /></div>
      </div>
      <div className="fg">
        <label className="fg-label">Message to Sailor</label>
        <textarea className="form-input" style={{ height: '80px' }} placeholder="Explain the substitution…" defaultValue="The requested item was out of stock. We found a similar alternative." />
      </div>
    </Modal>
  )
}
