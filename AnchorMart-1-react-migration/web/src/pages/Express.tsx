import { ProductThumb } from '../lib/images'
import { useToast } from '../context/ToastContext'
import { useModal } from '../context/ModalContext'
import { useUi } from '../components/modals/useUi'

interface ExpressItem {
  n: string; c: string; p: string; sz: string; sk: number; so: number; s: string
}

const items: ExpressItem[] = [
  { n: 'Bisleri Water 1L', c: 'Beverages', p: '$2.00', sz: '1 Litre', sk: 500, so: 1284, s: 'Active' },
  { n: "Lay's Classic", c: 'Snacks', p: '$3.00', sz: 'Standard pack', sk: 320, so: 986, s: 'Active' },
  { n: 'Tetley Green Tea', c: 'Beverages', p: '$5.00', sz: '25 bags', sk: 180, so: 742, s: 'Active' },
  { n: 'Amul Taaza Milk', c: 'Beverages', p: '$2.50', sz: '500ml', sk: 240, so: 584, s: 'Active' },
  { n: 'Colgate Strong Teeth', c: 'Personal Care', p: '$5.50', sz: '100g', sk: 156, so: 421, s: 'Active' },
  { n: 'Dettol Antiseptic', c: 'Personal Care', p: '$6.00', sz: '250ml', sk: 0, so: 621, s: 'Out of Stock' },
]

export function Express() {
  const toast = useToast()
  const { confirm } = useModal()
  const ui = useUi()

  return (
    <>
      <div className="pg-header">
        <div className="pg-header-l">
          <h1 className="pg-title">Express Items</h1>
          <p className="pg-sub"><span>Fast-delivery everyday essentials</span></p>
        </div>
        <div className="pg-actions">
          <button className="btn btn-primary" onClick={() => ui.addProduct({ fromExpress: true })}>
            <i className="ti ti-plus" />Add Express Item
          </button>
        </div>
      </div>
      <div className="card" id="express-table">
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr>
                <th></th><th>Product</th><th>Category</th><th>Price</th><th>Size</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((e) => (
                <tr
                  className="tr-click"
                  key={e.n}
                  onClick={() => ui.addProduct({ name: e.n, price: e.p.replace('$', ''), stock: String(e.sk), fromExpress: true })}
                >
                  <td><ProductThumb keyword={e.n} cls="sm" /></td>
                  <td className="td-p">{e.n}</td>
                  <td><span className="tag">{e.c}</span></td>
                  <td className="td-p w7">{e.p}</td>
                  <td className="td-m">{e.sz}</td>
                  <td><span className={`badge badge-${e.s === 'Active' ? 'success' : 'danger'}`}>{e.s}</span></td>
                  <td>
                    <div className="td-acts">
                      <button
                        className="btn btn-ghost btn-sm btn-icon"
                        title="Edit"
                        onClick={(ev) => { ev.stopPropagation(); ui.addProduct({ name: e.n, price: e.p.replace('$', ''), stock: String(e.sk), fromExpress: true }) }}
                      >
                        <i className="ti ti-edit" />
                      </button>
                      <button
                        className="btn btn-danger btn-sm btn-icon"
                        title="Remove"
                        onClick={(ev) => {
                          ev.stopPropagation()
                          confirm({ title: 'Remove Item', msg: 'Remove ' + e.n + '?', danger: true, confirmText: 'Remove' }, () => { toast('Item removed', 'danger', 'trash') })
                        }}
                      >
                        <i className="ti ti-trash" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
