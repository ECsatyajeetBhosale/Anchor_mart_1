import { useState } from 'react'
import { Modal } from '../ui/Modal'
import { useModal } from '../../context/ModalContext'
import { useToast } from '../../context/ToastContext'

const SPARE_TYPES = ['Engine', 'Safety', 'Fire Safety', 'Navigation', 'Signaling', 'Medical', 'Deck']

export function AddSpareModal({ data }: { data?: any }) {
  const d = data || {}
  const { close } = useModal()
  const toast = useToast()
  const isEdit = !!d.name

  const [preview, setPreview] = useState<string>('')
  const [fileName, setFileName] = useState<string>('')

  function onPick(input: HTMLInputElement) {
    const file = input.files && input.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreview(String(e.target?.result || ''))
      setFileName(file.name)
    }
    reader.readAsDataURL(file)
  }

  return (
    <Modal
      title={isEdit ? 'Edit Spare Part' : 'Add Marine Emergency Spare'}
      sub="Marine Emergency Spares catalog"
      icon="engine"
      iconBg="var(--teal-50)"
      iconColor="var(--teal-600)"
      size="lg"
      footer={
        <button
          className="btn btn-primary"
          onClick={() => {
            close()
            toast(isEdit ? 'Spare part updated' : 'Spare part added to catalog', 'success')
          }}
        >
          <i className="ti ti-check" />
          {isEdit ? 'Save Changes' : 'Add Product'}
        </button>
      }
    >
      <div className="fg">
        <label className="fg-label">Spare Part Name</label>
        <input className="form-input" placeholder="e.g. SOLAS Life Jacket" defaultValue={d.name || ''} />
      </div>
      <div className="fg">
        <label className="fg-label">Description</label>
        <textarea
          className="form-input"
          placeholder="Specification, approval standard, fitment…"
          style={{ height: 70 }}
          defaultValue={d.desc || ''}
        />
      </div>
      <div className="form-row triple">
        <div className="fg">
          <label className="fg-label">Type</label>
          <select className="form-select" defaultValue={d.type || SPARE_TYPES[0]}>
            {SPARE_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div className="fg">
          <label className="fg-label">Price ($)</label>
          <input className="form-input" type="number" placeholder="0.00" defaultValue={d.price || ''} />
        </div>
        <div className="fg">
          <label className="fg-label">Stock Quantity</label>
          <input className="form-input" type="number" placeholder="0" defaultValue={d.stock || ''} />
        </div>
      </div>
      <div className="form-row">
        <div className="fg">
          <label className="fg-label">Part Number</label>
          <input className="form-input" placeholder="SP-XXX-000" defaultValue={d.pn || ''} />
        </div>
        <div className="fg">
          <label className="fg-label">Reorder Level</label>
          <input className="form-input" type="number" placeholder="10" />
        </div>
      </div>
      <div className="fg">
        <label className="fg-label">Product Image</label>
        <input
          type="file"
          id="spare-img-input"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={(e) => onPick(e.target)}
        />
        <div className="upload-area" onClick={() => document.getElementById('spare-img-input')?.click()}>
          {fileName ? (
            <>
              <i className="ti ti-check" style={{ fontSize: 22, color: 'var(--success-icon)', display: 'block', marginBottom: 6 }} />
              {fileName}
            </>
          ) : (
            <>
              <i className="ti ti-photo-up" style={{ fontSize: 26, display: 'block', marginBottom: 6 }} />
              Click to upload the product image
            </>
          )}
        </div>
        {preview && (
          <img
            src={preview}
            alt="preview"
            style={{
              display: 'block',
              maxHeight: 130,
              width: 'auto',
              borderRadius: 'var(--radius-md)',
              marginTop: 10,
              border: '1px solid var(--border-sm)',
            }}
          />
        )}
      </div>
      <div className="form-row triple" style={{ marginBottom: 0 }}>
        <label className="switch">
          <input type="checkbox" defaultChecked />
          <div className="switch-track" /><span className="switch-label">Available to Sailors</span>
        </label>
        <label className="switch">
          <input type="checkbox" defaultChecked={!!d.deal} />
          <div className="switch-track" /><span className="switch-label">Deal Product</span>
        </label>
        <label className="switch">
          <input type="checkbox" defaultChecked={!!d.express} />
          <div className="switch-track" /><span className="switch-label">Express Item</span>
        </label>
      </div>
    </Modal>
  )
}
