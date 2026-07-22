import { useMemo, useState } from 'react'
import { Avatar } from '../lib/images'
import { useToast } from '../context/ToastContext'
import { useModal } from '../context/ModalContext'
import { useUi } from '../components/modals/useUi'

interface Partner {
  n: string; id: string; p: string; j: string; s: string; c: number; w: string; t: number; r: string
}

const partners: Partner[] = [
  { n: 'Rahul Singh', id: 'DP-00124', p: 'Port of Singapore', j: 'Mar 2023', s: 'On Duty', c: 3, w: '$84.50', t: 124, r: '4.9' },
  { n: 'Pita Havili', id: 'DP-00087', p: 'Port of Singapore', j: 'Jun 2023', s: 'On Duty', c: 2, w: '$61.00', t: 98, r: '4.7' },
  { n: 'Marco Reyes', id: 'DP-00201', p: 'Port of Singapore', j: 'Oct 2023', s: 'On Duty', c: 1, w: '$42.00', t: 87, r: '4.8' },
  { n: 'Aisha Karimi', id: 'DP-00056', p: 'Port of Singapore', j: 'Jan 2023', s: 'Available', c: 0, w: '$0', t: 76, r: '4.6' },
  { n: 'David Lim', id: 'DP-00033', p: 'Jurong Port', j: 'Nov 2022', s: 'Inactive', c: 0, w: '$0', t: 52, r: '4.4' },
  { n: 'Sari Wijaya', id: 'DP-00145', p: 'Keppel Terminal', j: 'May 2023', s: 'On Duty', c: 2, w: '$58.00', t: 67, r: '4.5' },
]

export function Partners() {
  const toast = useToast()
  const { confirm } = useModal()
  const ui = useUi()

  const [partnerStatus, setPartnerStatus] = useState('All')
  const [partnerQuery, setPartnerQuery] = useState('')

  const list = useMemo(() => partners.filter((d) => {
    const okS = partnerStatus === 'All' || d.s === partnerStatus
    const okQ = !partnerQuery || (d.n + ' ' + d.id + ' ' + d.p).toLowerCase().indexOf(partnerQuery) >= 0
    return okS && okQ
  }), [partnerStatus, partnerQuery])

  return (
    <>
      <div className="pg-header">
        <div className="pg-header-l">
          <h1 className="pg-title">Delivery Partners</h1>
          <p className="pg-sub">
            <span>64 partners</span>
            <span className="sep">·</span>
            <span className="sdot on sm w6 csuccess">28 on duty</span>
          </p>
        </div>
        <div className="pg-actions">
          <div className="input-wrap">
            <i className="ti ti-search pre" />
            <input
              type="text"
              className="form-input has-icon"
              placeholder="Search partners…"
              style={{ width: '200px' }}
              onInput={(e) => setPartnerQuery(e.currentTarget.value.toLowerCase().trim())}
            />
          </div>
          <select
            className="form-select"
            onChange={(e) => setPartnerStatus(e.currentTarget.value === 'All Status' ? 'All' : e.currentTarget.value)}
          >
            <option>All Status</option><option>On Duty</option><option>Available</option><option>Inactive</option>
          </select>
          <button className="btn btn-primary" onClick={() => ui.addPartner()}>
            <i className="ti ti-user-plus" />Onboard Partner
          </button>
        </div>
      </div>
      <div className="card" id="partners-table">
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr>
                <th>Partner</th><th>ID</th><th>Port Zone</th><th>Joined</th><th>Total Deliveries</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.length ? list.map((d) => (
                <tr className="tr-click" key={d.id} onClick={() => ui.profile(d.n, 'partner')}>
                  <td>
                    <div className="flex aic g10">
                      <Avatar name={d.n} cls="av-sm" />
                      <span className="td-p">{d.n}</span>
                    </div>
                  </td>
                  <td className="td-id">{d.id}</td>
                  <td className="td-m">{d.p}</td>
                  <td className="td-m">{d.j}</td>
                  <td className="td-m">{d.t}</td>
                  <td>
                    <div className="td-acts">
                      <button
                        className="btn btn-ghost btn-sm btn-icon"
                        title="View"
                        onClick={(e) => { e.stopPropagation(); ui.profile(d.n, 'partner') }}
                      >
                        <i className="ti ti-eye" />
                      </button>
                      <button
                        className="btn btn-ghost btn-sm btn-icon"
                        title="Edit"
                        onClick={(e) => { e.stopPropagation(); ui.addPartner({ name: d.n, id: d.id }) }}
                      >
                        <i className="ti ti-edit" />
                      </button>
                      <button
                        className="btn btn-danger btn-sm btn-icon"
                        title="Deactivate"
                        onClick={(e) => {
                          e.stopPropagation()
                          confirm({ title: 'Deactivate Partner', msg: 'Deactivate ' + d.n + '?', danger: true, confirmText: 'Deactivate' }, () => { toast(d.n + ' deactivated', 'danger', 'user-off') })
                        }}
                      >
                        <i className="ti ti-user-off" />
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={6} className="td-m" style={{ textAlign: 'center', padding: '28px' }}>No partners match this filter.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
