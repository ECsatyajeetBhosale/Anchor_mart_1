import { Avatar } from '../lib/images'
import { useUi } from '../components/modals/useUi'

interface Verif {
  intent: string; order: string; p: string; desc: string
  t: number; a: number | null; u: number | null; r: string; sc: string
}

const verifs: Verif[] = [
  { intent: '#INT-0047', order: '#AM2461', p: 'Rahul Singh', desc: 'Power bank, protein bars, shaving kit', t: 3, a: 2, u: 1, r: 'Submitted', sc: 'warning' },
  { intent: '#INT-0051', order: '#AM2463', p: 'Pita Havili', desc: 'Galley provisions & toiletries', t: 5, a: 5, u: 0, r: 'Submitted', sc: 'success' },
  { intent: '#INT-0039', order: '#AM2458', p: 'Marco Reyes', desc: 'Watch, card holder', t: 2, a: 2, u: 0, r: 'Submitted', sc: 'success' },
  { intent: '#INT-0055', order: '#AM2467', p: 'Rahul Singh', desc: 'Headphones, charger, snacks', t: 4, a: null, u: null, r: 'In Progress', sc: 'info' },
]

export function Verification() {
  const ui = useUi()

  return (
    <>
      <div className="pg-header">
        <div className="pg-header-l"><h1 className="pg-title">Product Verifications</h1><p className="pg-sub"><span>Partner in-store checks, availability reports, substitutions</span></p></div>
      </div>
      <div className="card" id="verif-table">
        <div className="card-hd"><div className="card-ttl"><i className="ti ti-list-check" />Verification Reports</div></div>
        <div className="tbl-wrap">
          <table>
            <thead><tr><th>Intent ID</th><th>Order ID</th><th>Partner</th><th>Description</th><th>Total</th><th>Available</th><th>Unavailable</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
              {verifs.map((v) => {
                const uc = (v.u ?? 0) > 0 ? 'var(--danger-text)' : 'var(--t4)'
                return (
                  <tr key={v.intent} className="tr-click" onClick={() => ui.itemDetail(v.intent)}>
                    <td className="td-id">{v.intent}</td>
                    <td className="td-id">{v.order}</td>
                    <td><div className="flex aic g8"><Avatar name={v.p} cls="av-sm" /><span className="td-p">{v.p.split(' ')[0]}</span></div></td>
                    <td><span className="sm c3 trunc" style={{ maxWidth: '200px', display: 'block' }}>{v.desc}</span></td>
                    <td className="td-p w7">{v.t}</td>
                    <td className="w7 csuccess">{v.a !== null ? v.a : '—'}</td>
                    <td className="w7" style={{ color: uc }}>{v.u !== null ? v.u : '—'}</td>
                    <td><span className={`badge badge-${v.sc}`}>{v.r}</span></td>
                    <td>
                      {(v.u ?? 0) > 0
                        ? <button className="btn btn-primary btn-sm" style={{ fontSize: '11.5px' }} onClick={(e) => { e.stopPropagation(); ui.substitute('Bombay Shaving Kit') }}>Suggest Substitute</button>
                        : <span className="xs c4 w6">No action needed</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
