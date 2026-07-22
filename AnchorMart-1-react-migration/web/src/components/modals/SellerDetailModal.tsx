import { Modal } from '../ui/Modal'
import { useModal } from '../../context/ModalContext'
import { SellerReviewModal } from './SellerReviewModal'

export function SellerDetailModal({ s }: { s?: any }) {
  const { open } = useModal()
  const seller = s || {}

  const docHtml =
    seller.d === 'Uploaded' ? (
      <div className="srq-img">
        <i className="ti ti-file-text" />
        <span>{seller.doc || 'business-document.pdf'}</span>
      </div>
    ) : (
      <div className="srq-img empty">
        <i className="ti ti-file-off" />
        <span>No documents uploaded</span>
      </div>
    )

  const sub =
    seller.b && seller.b !== '—'
      ? seller.b
      : ((seller.fn || '') + ' ' + (seller.ln || '')).trim()

  return (
    <Modal
      title="Seller Application"
      sub={sub}
      icon="building-store"
      iconBg="var(--purple-bg)"
      iconColor="var(--purple-icon)"
      size="lg"
      footer={
        <>
          <button className="btn btn-danger" onClick={() => open(<SellerReviewModal seller={seller} approve={false} />)}>
            <i className="ti ti-x" />Reject
          </button>
          <button className="btn btn-success" onClick={() => open(<SellerReviewModal seller={seller} approve={true} />)}>
            <i className="ti ti-check" />Accept
          </button>
        </>
      }
    >
      <div className="form-row">
        <div className="fg"><label className="fg-label">First Name</label><div className="ecard">{seller.fn || '—'}</div></div>
        <div className="fg"><label className="fg-label">Last Name</label><div className="ecard">{seller.ln || '—'}</div></div>
      </div>
      <div className="form-row">
        <div className="fg"><label className="fg-label">Email</label><div className="ecard">{seller.e || '—'}</div></div>
        <div className="fg"><label className="fg-label">Contact Number</label><div className="ecard">{seller.ph || '—'}</div></div>
      </div>
      <div className="fg">
        <label className="fg-label">Business / Store Name (Optional)</label>
        <div className="ecard">{seller.b && seller.b !== '—' ? seller.b : '—'}</div>
      </div>
      <div className="fg">
        <label className="fg-label">Product Information & Description</label>
        <div className="ecard" style={{ lineHeight: 1.5 }}>{seller.p || '—'}</div>
      </div>
      <div className="fg">
        <label className="fg-label">Business Documents (Optional)</label>
        {docHtml}
      </div>
    </Modal>
  )
}
