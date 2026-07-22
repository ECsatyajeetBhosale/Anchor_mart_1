import { Modal } from '../ui/Modal'
import { useModal } from '../../context/ModalContext'
import { useToast } from '../../context/ToastContext'
import { ProductThumb } from '../../lib/images'
import { NotifySailorModal } from './NotifySailorModal'

export function ItemDetailModal({ enq }: { enq?: any }) {
  const { open } = useModal()
  const toast = useToast()

  const itemsData: any[] = [
    { n: 'Nu Republic Powerpo X1 Power Bank', q: '×1', a: '—', st: 'Available', sc: 'success' },
    { n: '21g Protein Bar Variety Pack', q: '×2', a: 'Aisle 4', st: 'Available', sc: 'success' },
    { n: 'Bombay Shaving Company 5 Piece Kit', q: '×1', a: 'Aisle 2', st: 'Unavailable', sc: 'danger' },
  ]

  return (
    <Modal
      title={(enq || 'ENQ-0042') + ' — Item Detail'}
      sub="Partner in-store verification report"
      icon="package"
      iconBg="var(--navy-50)"
      iconColor="var(--navy-600)"
      size="lg"
      footer={
        <button className="btn btn-primary" onClick={() => open(<NotifySailorModal refId={enq || ''} />)}>
          <i className="ti ti-send" />Notify Sailor
        </button>
      }
    >
      <div className="grid-3 g16">
        {itemsData.map((item) => {
          const bc = item.sc === 'success' ? 'var(--success-icon)' : 'var(--danger-icon)'
          return (
            <div key={item.n} className="ecard" style={{ borderLeft: '3px solid ' + bc }}>
              <div className="flex aic g8 mb8">
                <ProductThumb keyword={item.n} cls="sm" />
                <div className="sm w7 c1">{item.n}</div>
              </div>
              <div className="flex aic g8 mb10">
                <span className="tag">{item.q}</span>
                {item.a !== '—' && <span className="tag">{item.a}</span>}
              </div>
              <div className="flex aic jb">
                <span className={`badge badge-${item.sc}`}>{item.st}</span>
                {item.st === 'Unavailable' && (
                  <button
                    className="btn btn-secondary btn-xs"
                    onClick={() => toast('Finding alternatives for ' + item.n + '…', '', 'replace')}
                  >
                    Find Alt
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </Modal>
  )
}
