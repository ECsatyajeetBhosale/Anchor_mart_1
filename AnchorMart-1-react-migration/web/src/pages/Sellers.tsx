import { Avatar } from '../lib/images'
import { useUi } from '../components/modals/useUi'

interface Seller {
  n: string; fn: string; ln: string; e: string; ph: string; b: string; p: string
  d: string; doc: string; dt: string; s: string; sc: string
}

const sellers: Seller[] = [
  { n: 'James Wren', fn: 'James', ln: 'Wren', e: 'jwren@shipco.net', ph: '+65 8123 0090', b: 'Marine Supplies Co.', p: 'Marine equipment and safety gear — life jackets, flares, ropes, and SOLAS-approved emergency kits sourced from certified suppliers.', d: 'Uploaded', doc: 'business-license.pdf', dt: 'Apr 22', s: 'Pending', sc: 'warning' },
  { n: 'Sara Chen', fn: 'Sara', ln: 'Chen', e: 'sara.c@marine.io', ph: '+65 9034 7781', b: 'Blue Ocean Supplies', p: 'Consumer electronics and accessories — power banks, earbuds, smart speakers and charging gear for crew members.', d: 'Uploaded', doc: 'gst-registration.pdf', dt: 'Apr 20', s: 'Reviewing', sc: 'info' },
  { n: 'Omar Karim', fn: 'Omar', ln: 'Karim', e: 'omar@porttrader.com', ph: '+65 8456 2310', b: 'Port Trader Ltd.', p: 'Beverages and snacks — bottled water, soft drinks, packaged snacks and quick everyday essentials.', d: 'Missing', doc: '', dt: 'Apr 18', s: 'Pending', sc: 'warning' },
  { n: 'Maria Santos', fn: 'Maria', ln: 'Santos', e: 'msantos@seafarer.ph', ph: '+63 917 220 4455', b: '—', p: 'Fashion and accessories — apparel, footwear, watches and personal lifestyle products.', d: 'Uploaded', doc: 'id-proof.pdf', dt: 'Apr 15', s: 'Approved', sc: 'success' },
]

export function Sellers() {
  const ui = useUi()

  return (
    <>
      <div className="pg-header">
        <div className="pg-header-l"><h1 className="pg-title">Seller Applications</h1><p className="pg-sub"><span>Review and manage seller applications from sailors</span></p></div>
      </div>
      <div className="stats-row">
        <div className="stat-card sc-amber"><div className="stat-stripe" /><div className="stat-top"><div className="stat-lbl">Pending</div><div className="stat-icon"><i className="ti ti-clock" /></div></div><div className="stat-val">4</div><div className="stat-foot"><span>Awaiting review</span></div></div>
        <div className="stat-card sc-green"><div className="stat-stripe" /><div className="stat-top"><div className="stat-lbl">Approved (Month)</div><div className="stat-icon"><i className="ti ti-check" /></div></div><div className="stat-val">12</div><div className="stat-foot"><span>Now active</span></div></div>
        <div className="stat-card sc-red"><div className="stat-stripe" /><div className="stat-top"><div className="stat-lbl">Rejected</div><div className="stat-icon"><i className="ti ti-x" /></div></div><div className="stat-val">3</div><div className="stat-foot"><span>This month</span></div></div>
        <div className="stat-card sc-navy"><div className="stat-stripe" /><div className="stat-top"><div className="stat-lbl">Active Sellers</div><div className="stat-icon"><i className="ti ti-building-store" /></div></div><div className="stat-val">48</div><div className="stat-foot"><span>On platform</span></div></div>
      </div>
      <div className="card" id="sellers-table">
        <div className="tbl-wrap">
          <table>
            <thead><tr><th>Applicant</th><th>Email</th><th>Business</th><th>Submitted</th><th>Actions</th></tr></thead>
            <tbody>
              {sellers.map((s) => (
                <tr key={s.e} className="tr-click" onClick={() => ui.sellerDetail(s)}>
                  <td><div className="flex aic g10"><Avatar name={s.n} /><span className="td-p">{s.n}</span></div></td>
                  <td className="td-m">{s.e}</td>
                  <td className="w7 c1">{s.b}</td>
                  <td className="td-m">{s.dt}</td>
                  <td>
                    <div className="td-acts">
                      <button className="btn btn-success btn-sm" onClick={(e) => { e.stopPropagation(); ui.sellerReview({ n: s.n, b: s.b, p: s.p }, true) }}><i className="ti ti-check" />Approve</button>
                      <button className="btn btn-danger btn-sm" onClick={(e) => { e.stopPropagation(); ui.sellerReview({ n: s.n, b: s.b, p: s.p }, false) }}><i className="ti ti-x" />Reject</button>
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
