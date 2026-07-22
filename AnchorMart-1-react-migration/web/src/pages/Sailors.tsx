import { useState } from 'react'
import { Avatar } from '../lib/images'
import { useUi } from '../components/modals/useUi'

interface Sailor {
  n: string; e: string; w: string; j: string; sh: string
  o: number; p: number; ca: number; wi: number; st: string; sc: string
}

const sailors: Sailor[] = [
  { n: 'Lois Becket', e: 'loisbecket@gmail.com', w: '+44 7700 900124', j: 'Mar 12, 2026', sh: 'IMO 0123456', o: 18, p: 2450, ca: 1, wi: 3, st: 'Active', sc: 'success' },
  { n: 'Ali Mahmoud', e: 'ali.m@vessel.com', w: '+971 50 444 1234', j: 'Jan 8, 2026', sh: 'MSC Marvela', o: 12, p: 1820, ca: 2, wi: 5, st: 'Active', sc: 'success' },
  { n: 'Sara Chen', e: 'sara.c@marine.io', w: '+65 9123 4567', j: 'Feb 22, 2026', sh: 'APL Vanda', o: 7, p: 920, ca: 0, wi: 2, st: 'Active', sc: 'success' },
  { n: 'James Wren', e: 'jwren@shipco.net', w: '+44 7900 112233', j: 'Dec 3, 2025', sh: 'Evergreen Faith', o: 31, p: 5100, ca: 0, wi: 8, st: 'Active', sc: 'success' },
  { n: 'Ravi Patel', e: 'ravi.p@anchormail.com', w: '+91 98765 43210', j: 'Apr 1, 2026', sh: 'IMO 0123456', o: 2, p: 200, ca: 6, wi: 1, st: 'Active', sc: 'success' },
  { n: 'Maria Santos', e: 'msantos@seafarer.ph', w: '+63 912 345 6789', j: 'Nov 14, 2025', sh: 'MSC Marvela', o: 0, p: 0, ca: 0, wi: 0, st: 'Inactive', sc: 'neutral' },
]

const TABS = ['All', 'Active', 'Inactive']

export function Sailors() {
  const ui = useUi()
  const [status, setStatus] = useState('All')
  const [query, setQuery] = useState('')

  const list = sailors.filter((s) => {
    const okS = status === 'All' || s.st === status
    const okQ = !query || `${s.n} ${s.e} ${s.w}`.toLowerCase().indexOf(query) >= 0
    return okS && okQ
  })

  return (
    <>
      <div className="pg-header">
        <div className="pg-header-l">
          <h1 className="pg-title">Sailors Management</h1>
          <p className="pg-sub"><span>2,847 registered</span><span className="sep">·</span><span>1,204 active this month</span></p>
        </div>
        <div className="pg-actions">
          <div className="input-wrap">
            <i className="ti ti-search pre" />
            <input
              type="text"
              className="form-input has-icon"
              placeholder="Search sailors…"
              style={{ width: '220px' }}
              value={query}
              onChange={(e) => setQuery(e.currentTarget.value.toLowerCase().trim())}
            />
          </div>
          <select
            className="form-select"
            id="sailor-status-filter"
            value={status === 'All' ? 'All Status' : status}
            onChange={(e) => setStatus(e.currentTarget.value === 'All Status' ? 'All' : e.currentTarget.value)}
          >
            <option>All Status</option>
            <option>Active</option>
            <option>Inactive</option>
          </select>
          <button className="btn btn-primary" onClick={() => ui.addSailor()}><i className="ti ti-user-plus" />Add Sailor</button>
        </div>
      </div>

      <div className="stats-row">
        <div className="stat-card sc-navy"><div className="stat-stripe" /><div className="stat-top"><div className="stat-lbl">Total Sailors</div><div className="stat-icon"><i className="ti ti-users" /></div></div><div className="stat-val">2,847</div><div className="stat-foot"><span className="stat-delta up"><i className="ti ti-trending-up" />220</span><span>this month</span></div></div>
        <div className="stat-card sc-amber"><div className="stat-stripe" /><div className="stat-top"><div className="stat-lbl">Loyalty Pts Issued</div><div className="stat-icon"><i className="ti ti-gift" /></div></div><div className="stat-val">4.82M</div><div className="stat-foot"><span>≈ $48,200 value</span></div></div>
        <div className="stat-card sc-teal"><div className="stat-stripe" /><div className="stat-top"><div className="stat-lbl">Referrals (Month)</div><div className="stat-icon"><i className="ti ti-share" /></div></div><div className="stat-val">148</div><div className="stat-foot"><span>+500 pts each</span></div></div>
      </div>

      <div className="tab-row" id="sailor-tabs">
        {TABS.map((t) => (
          <div
            key={t}
            className={`tab-item${status === t ? ' active' : ''}`}
            data-st={t}
            onClick={() => setStatus(t)}
          >
            {t}
          </div>
        ))}
      </div>

      <div className="card" id="sailors-table">
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr><th>Sailor</th><th>Contact</th><th>Joined</th><th>Orders</th><th>Loyalty Pts</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {list.length ? list.map((s) => (
                <tr key={s.n} className="tr-click" onClick={() => ui.profile(s.n, 'sailor')}>
                  <td>
                    <div className="flex aic g10">
                      <Avatar name={s.n} cls="av-sm" />
                      <div><div className="td-p">{s.n}</div><div className="td-m">{s.e}</div></div>
                    </div>
                  </td>
                  <td className="td-m">{s.w}</td>
                  <td className="td-m">{s.j}</td>
                  <td className="td-p w7">{s.o}</td>
                  <td><span className="camber w7">{s.p.toLocaleString()}</span><span className="td-m"> pts</span></td>
                  <td><span className={`badge badge-${s.sc}`}>{s.st}</span></td>
                  <td>
                    <div className="td-acts">
                      <button className="btn btn-ghost btn-sm btn-icon" title="View" onClick={(e) => { e.stopPropagation(); ui.profile(s.n, 'sailor') }}><i className="ti ti-eye" /></button>
                      <button className="btn btn-ghost btn-sm btn-icon" title="Edit" onClick={(e) => { e.stopPropagation(); ui.addSailor({ name: s.n, email: s.e, wa: s.w }) }}><i className="ti ti-edit" /></button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={7} className="td-m" style={{ textAlign: 'center', padding: '28px' }}>No sailors match this filter.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="pagination">
          <span className="sm c4 w6" style={{ marginRight: 'auto' }}>Showing {list.length} of 2,847</span>
          <div className="pg-btn"><i className="ti ti-chevron-left" style={{ fontSize: '14px' }} /></div>
          <div className="pg-btn active">1</div>
          <div className="pg-btn">2</div>
          <div className="pg-btn">3</div>
          <div className="pg-btn"><i className="ti ti-chevron-right" style={{ fontSize: '14px' }} /></div>
        </div>
      </div>
    </>
  )
}
