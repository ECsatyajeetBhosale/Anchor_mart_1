import { useState } from 'react'
import { Avatar, ProductThumb } from '../lib/images'
import { useUi } from '../components/modals/useUi'

interface Intent {
  r: string; s: string; it: string; sh: string
  chFrom?: string; chTo?: string; ecost?: string; paid?: boolean
  ar: string; sy: string; cm: string; sb: string; st: string; sc: string
}

const intents: Intent[] = [
  { r: '#INT-0047', s: 'Lois Becket', it: 'Titan Watch, Card Holder (2)', sh: '0123456 · Anch.1', chFrom: 'Anchorage 1', chTo: 'Anchorage 2', ecost: '$4.50', paid: false, ar: '24 Apr', sy: '>5 days', cm: 'WhatsApp', sb: '22 Apr 14:32', st: 'Awaiting Payment', sc: 'warning' },
  { r: '#INT-0048', s: 'Ali Mahmoud', it: 'Nu Republic, Protein Bar, Kit (3)', sh: 'MSC Marvela · B7', ar: '22 Apr', sy: '3 days', cm: 'Email', sb: '22 Apr 11:20', st: 'Under Review', sc: 'info' },
  { r: '#INT-0049', s: 'James Wren', it: 'Coffee, Organizer, Tablets (4)', sh: 'Evergreen · Brani', ar: '23 Apr', sy: '2 days', cm: 'WhatsApp', sb: '22 Apr 10:05', st: 'Items Confirmed', sc: 'teal' },
  { r: '#INT-0050', s: 'Sara Chen', it: 'Echo Dot 5th Gen, Echo Buds (2)', sh: 'APL Vanda · PSA', chFrom: 'Berth PSA', chTo: 'Berth 14', ecost: '$6.00', paid: true, ar: '24 Apr', sy: '1 day', cm: 'Email', sb: '22 Apr 09:41', st: 'Substitution Needed', sc: 'danger' },
  { r: '#INT-0051', s: 'Ravi Patel', it: 'Shaving Kit, Water Bottle ×2 (3)', sh: 'IMO 0123456', ar: '25 Apr', sy: '3 days', cm: 'WhatsApp', sb: '22 Apr 08:15', st: 'New', sc: 'neutral' },
]

export function Intents() {
  const ui = useUi()
  const [status, setStatus] = useState('All')
  const [query, setQuery] = useState('')

  const list = intents.filter((i) => {
    const okS = status === 'All' || i.st === status
    const okQ = !query || `${i.r} ${i.s} ${i.it}`.toLowerCase().indexOf(query) >= 0
    return okS && okQ
  })

  return (
    <>
      <div className="pg-header">
        <div className="pg-header-l">
          <h1 className="pg-title">Intent Requests</h1>
          <p className="pg-sub"><span>Sailor order intents pending review &amp; confirmation</span></p>
        </div>
        <div className="pg-actions">
          <div className="input-wrap">
            <i className="ti ti-search pre" />
            <input
              type="text"
              className="form-input has-icon"
              placeholder="Search intents…"
              style={{ width: '200px' }}
              value={query}
              onChange={(e) => setQuery(e.currentTarget.value.toLowerCase().trim())}
            />
          </div>
          <select
            className="form-select"
            value={status === 'All' ? 'All Status' : status}
            onChange={(e) => setStatus(e.currentTarget.value === 'All Status' ? 'All' : e.currentTarget.value)}
          >
            <option>All Status</option>
            <option>New</option>
            <option>Under Review</option>
            <option>Awaiting Payment</option>
            <option>Substitution Needed</option>
          </select>
        </div>
      </div>

      <div className="stats-row">
        <div className="stat-card sc-navy"><div className="stat-stripe" /><div className="stat-top"><div className="stat-lbl">Total Intents</div><div className="stat-icon"><i className="ti ti-file-invoice" /></div></div><div className="stat-val">23</div><div className="stat-foot"><span>8 pending review</span></div></div>
        <div className="stat-card sc-amber"><div className="stat-stripe" /><div className="stat-top"><div className="stat-lbl">Awaiting Payment</div><div className="stat-icon"><i className="ti ti-clock" /></div></div><div className="stat-val">7</div><div className="stat-foot"><span>48hr window active</span></div></div>
        <div className="stat-card sc-red"><div className="stat-stripe" /><div className="stat-top"><div className="stat-lbl">Substitutions Needed</div><div className="stat-icon"><i className="ti ti-refresh" /></div></div><div className="stat-val">4</div><div className="stat-foot"><span>Items unavailable</span></div></div>
        <div className="stat-card sc-green"><div className="stat-stripe" /><div className="stat-top"><div className="stat-lbl">Confirmed Today</div><div className="stat-icon"><i className="ti ti-check" /></div></div><div className="stat-val">12</div><div className="stat-foot"><span>Moved to orders</span></div></div>
      </div>

      <div className="card" id="intents-table">
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr><th>Intent</th><th>Sailor</th><th>Items Requested</th><th>Ship</th><th>Arrival</th><th>Stay</th><th>Submitted</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {list.length ? list.map((i) => (
                <tr key={i.r} className="tr-click" onClick={() => ui.reviewIntent(i)}>
                  <td className="td-id xs">{i.r}</td>
                  <td><div className="flex aic g8"><Avatar name={i.s} cls="av-sm" /><span className="td-p">{i.s}</span></div></td>
                  <td><div className="flex aic g8"><ProductThumb keyword={i.it} cls="sm" /><span className="td-m trunc" style={{ maxWidth: '170px', display: 'block' }}>{i.it}</span></div></td>
                  <td className="td-m">{i.sh}</td>
                  <td className="td-m">{i.ar}</td>
                  <td className="td-m">{i.sy}</td>
                  <td className="td-m">{i.sb}</td>
                  <td><span className={`badge badge-${i.sc}`}>{i.st}</span></td>
                  <td>
                    <div className="td-acts">
                      <button className="btn btn-primary btn-xs" onClick={(e) => { e.stopPropagation(); ui.reviewIntent(i) }}>Review</button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={9} className="td-m" style={{ textAlign: 'center', padding: '28px' }}>No intents match this filter.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
