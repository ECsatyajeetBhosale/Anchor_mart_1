import { useMemo, useState } from 'react'
import { ProductThumb } from '../lib/images'
import { useToast } from '../context/ToastContext'
import { useModal } from '../context/ModalContext'
import { useUi } from '../components/modals/useUi'

interface Spare {
  ic: string; n: string; d: string; c: string; pn: string; p: string; sk: number; s: string; sc: string
}

const spares: Spare[] = [
  { ic: 'ti-lifebuoy', n: 'SOLAS Life Jacket', d: 'Adult, 150N buoyancy, approved', c: 'Safety', pn: 'SP-SAF-001', p: '$48.00', sk: 120, s: 'In Stock', sc: 'success' },
  { ic: 'ti-flame', n: 'CO₂ Fire Extinguisher 5kg', d: 'Marine grade, wall mount', c: 'Fire Safety', pn: 'SP-FIR-014', p: '$96.50', sk: 34, s: 'In Stock', sc: 'success' },
  { ic: 'ti-flare', n: 'Emergency Flare Kit', d: '4 red parachute + 2 smoke', c: 'Signaling', pn: 'SP-SIG-007', p: '$120.00', sk: 8, s: 'Low Stock', sc: 'warning' },
  { ic: 'ti-filter', n: 'Engine Oil Filter (MAN B&W)', d: 'Spin-on, fits 6S60MC', c: 'Engine', pn: 'SP-ENG-022', p: '$32.75', sk: 0, s: 'Out of Stock', sc: 'danger' },
  { ic: 'ti-droplet', n: 'Bilge Pump 12V', d: '2000 GPH submersible', c: 'Engine', pn: 'SP-ENG-031', p: '$74.00', sk: 16, s: 'In Stock', sc: 'success' },
  { ic: 'ti-broadcast', n: 'EPIRB Distress Beacon', d: '406 MHz, GPS enabled', c: 'Navigation', pn: 'SP-NAV-003', p: '$340.00', sk: 5, s: 'Low Stock', sc: 'warning' },
  { ic: 'ti-first-aid-kit', n: 'Marine First Aid Kit', d: 'SOLAS category C, 50+ items', c: 'Medical', pn: 'SP-MED-009', p: '$58.00', sk: 42, s: 'In Stock', sc: 'success' },
  { ic: 'ti-jacket', n: 'Immersion / Survival Suit', d: 'Insulated, one size, SOLAS', c: 'Safety', pn: 'SP-SAF-018', p: '$185.00', sk: 0, s: 'Out of Stock', sc: 'danger' },
]

export function Spares() {
  const toast = useToast()
  const { confirm } = useModal()
  const ui = useUi()

  const [spareType, setSpareType] = useState('All')
  const [spareStatus, setSpareStatus] = useState('All')
  const [spareQuery, setSpareQuery] = useState('')

  const list = useMemo(() => spares.filter((p) => {
    const okT = spareType === 'All' || p.c === spareType
    const okS = spareStatus === 'All' || p.s === spareStatus
    const okQ = !spareQuery || (p.n + ' ' + p.d + ' ' + p.pn).toLowerCase().indexOf(spareQuery) >= 0
    return okT && okS && okQ
  }), [spareType, spareStatus, spareQuery])

  return (
    <>
      <div className="pg-header">
        <div className="pg-header-l">
          <h1 className="pg-title">Marine Emergency Spares</h1>
          <p className="pg-sub"><span>Critical emergency spare parts available to sailors</span></p>
        </div>
        <div className="pg-actions">
          <div className="input-wrap">
            <i className="ti ti-search pre" />
            <input
              type="text"
              className="form-input has-icon"
              placeholder="Search spare parts…"
              style={{ width: '200px' }}
              onInput={(e) => setSpareQuery(e.currentTarget.value.toLowerCase().trim())}
            />
          </div>
          <select
            className="form-select"
            id="spare-type-filter"
            onChange={(e) => setSpareType(e.currentTarget.value === 'All Types' ? 'All' : e.currentTarget.value)}
          >
            <option>All Types</option><option>Engine</option><option>Safety</option><option>Fire Safety</option><option>Navigation</option><option>Signaling</option><option>Medical</option><option>Deck</option>
          </select>
          <select
            className="form-select"
            id="spare-status-filter"
            onChange={(e) => setSpareStatus(e.currentTarget.value === 'All Status' ? 'All' : e.currentTarget.value)}
          >
            <option>All Status</option><option>In Stock</option><option>Low Stock</option><option>Out of Stock</option>
          </select>
          <button className="btn btn-primary" onClick={() => ui.addSpare()}>
            <i className="ti ti-plus" />Add Product
          </button>
        </div>
      </div>
      <div className="stats-row">
        <div className="stat-card sc-navy">
          <div className="stat-stripe" />
          <div className="stat-top">
            <div className="stat-lbl">Total Spare Parts</div>
            <div className="stat-icon"><i className="ti ti-engine" /></div>
          </div>
          <div className="stat-val">86</div>
          <div className="stat-foot"><span>7 types</span></div>
        </div>
      </div>
      <div className="card" id="spares-table">
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr>
                <th></th><th>Spare Part</th><th>Type</th><th>Part No.</th><th>Price</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.length ? list.map((p) => (
                <tr
                  className="tr-click"
                  key={p.pn}
                  onClick={() => ui.addSpare({ name: p.n, desc: p.d, type: p.c, price: p.p.replace('$', '').replace('€', ''), stock: String(p.sk), pn: p.pn })}
                >
                  <td><ProductThumb keyword={p.c} cls="sm" /></td>
                  <td><div className="td-p">{p.n}</div><div className="td-m">{p.d}</div></td>
                  <td><span className="badge badge-navy">{p.c}</span></td>
                  <td className="td-m mono">{p.pn}</td>
                  <td className="td-p w7">{p.p}</td>
                  <td><span className={`badge badge-${p.sc}`}>{p.s}</span></td>
                  <td>
                    <div className="td-acts">
                      <button
                        className="btn btn-ghost btn-sm btn-icon"
                        title="Edit"
                        onClick={(e) => { e.stopPropagation(); ui.addSpare({ name: p.n, desc: p.d, type: p.c, price: p.p.replace('$', ''), stock: String(p.sk), pn: p.pn }) }}
                      >
                        <i className="ti ti-edit" />
                      </button>
                      <button
                        className="btn btn-danger btn-sm btn-icon"
                        title="Remove"
                        onClick={(e) => {
                          e.stopPropagation()
                          confirm({ title: 'Remove Spare Part', msg: 'Remove "' + p.n + '"? Cannot be undone.', danger: true, confirmText: 'Remove' }, () => { toast('Spare part removed', 'danger', 'trash') })
                        }}
                      >
                        <i className="ti ti-trash" />
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={7} className="td-m" style={{ textAlign: 'center', padding: '28px' }}>No spare parts match this filter.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
