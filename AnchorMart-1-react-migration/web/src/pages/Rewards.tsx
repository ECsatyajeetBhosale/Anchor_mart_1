import { useToast } from '../context/ToastContext'
import { useModal } from '../context/ModalContext'
import { useUi } from '../components/modals/useUi'

interface Coupon { code: string; d: string; m: string; e: string; u: number }
interface CouponReportRow { code: string; d: string; a: string; u: number; disc: string; rev: string; s: string; sc: string }

const coupons: Coupon[] = [
  { code: 'SHIP10', d: '10% off shipping', m: 'Min. order $50', e: 'Oct 31, 2026', u: 284 },
  { code: 'FREESHIP', d: '20% off shipping', m: 'Min. order $75', e: 'Oct 30, 2026', u: 142 },
  { code: 'REFERRAL', d: '10% off (referral)', m: 'First order only', e: 'Oct 30, 2026', u: 97 },
]

const couponReport: CouponReportRow[] = [
  { code: 'SHIP10', d: '10% off shipping', a: 'All Sailors', u: 284, disc: '$1,420', rev: '$12,680', s: 'Active', sc: 'success' },
  { code: 'FREESHIP', d: '20% off shipping', a: '1st Order', u: 142, disc: '$2,130', rev: '$7,940', s: 'Active', sc: 'success' },
  { code: 'REFERRAL', d: '10% off', a: 'Referrals Only', u: 97, disc: '$680', rev: '$5,210', s: 'Active', sc: 'success' },
  { code: 'WELCOME5', d: '$5 flat off', a: '1st Order', u: 213, disc: '$1,065', rev: '$9,340', s: 'Active', sc: 'success' },
  { code: 'PORT15', d: '15% off', a: 'Specific Users', u: 46, disc: '$920', rev: '$3,180', s: 'Expired', sc: 'neutral' },
]

export function Rewards() {
  const toast = useToast()
  const { confirm } = useModal()
  const ui = useUi()

  return (
    <>
      <div className="pg-header">
        <div className="pg-header-l">
          <h1 className="pg-title">Rewards &amp; Coupons</h1>
          <p className="pg-sub"><span>Loyalty · Referrals · Coupons</span></p>
        </div>
        <div className="pg-actions">
          <button className="btn btn-secondary btn-sm" onClick={() => ui.addCoupon()}>
            <i className="ti ti-ticket" />Create Coupon
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => ui.configurePoints()}>
            <i className="ti ti-settings" />Configure Points
          </button>
        </div>
      </div>
      <div className="grid-2 mb20">
        <div className="card">
          <div className="card-hd"><div className="card-ttl"><i className="ti ti-star" />Loyalty Program Overview</div></div>
          <div className="card-body">
            <div className="grid-2 mb16" style={{ gap: '10px' }}>
              <div className="infobox"><div className="info-lbl">Total Points Issued</div><div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--amber-600)', marginTop: '6px' }}>4.82M</div></div>
              <div className="infobox"><div className="info-lbl">Total Value</div><div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--teal-600)', marginTop: '6px' }}>$48.2k</div></div>
              <div className="infobox"><div className="info-lbl">Points Redeemed</div><div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--t1)', marginTop: '4px' }}>1.24M pts</div></div>
              <div className="infobox"><div className="info-lbl">Active Loyalty Users</div><div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--t1)', marginTop: '4px' }}>842</div></div>
            </div>
            <div className="sec-label">Program Rules</div>
            <div className="infobox">
              <div className="flex aic jb mb10 sm"><span className="c3 w6">Per delivery completed</span><span className="c1 w8">+250 pts</span></div>
              <div className="flex aic jb mb10 sm"><span className="c3 w6">Successful referral</span><span className="c1 w8">+500 pts</span></div>
              <div className="flex aic jb sm"><span className="c3 w6">Redemption rate</span><span className="c1 w8">100 pts = $1.00</span></div>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-hd"><div className="card-ttl"><i className="ti ti-ticket" />Active Coupons</div></div>
          <div className="card-body-sm" id="coupons-list">
            {coupons.map((cp) => (
              <div
                className="ecard mb10"
                key={cp.code}
                style={{ borderLeft: '3px solid var(--teal-500)', cursor: 'pointer' }}
                onClick={() => ui.addCoupon({ code: cp.code, value: '10' })}
              >
                <div className="flex aic g12">
                  <div className="f1">
                    <div className="flex aic g8 mb6">
                      <span className="w8 mono cteal" style={{ fontSize: '14px' }}>{cp.code}</span>
                      <span className="badge badge-success" style={{ fontSize: '10.5px' }}>Active</span>
                    </div>
                    <div className="sm c4 w5">{cp.d} · {cp.m}</div>
                    <div className="xs c4 mt4">{cp.u} uses · Expires {cp.e}</div>
                  </div>
                  <div className="td-acts">
                    <button
                      className="btn btn-ghost btn-sm btn-icon"
                      onClick={(e) => { e.stopPropagation(); ui.addCoupon({ code: cp.code, value: '10' }) }}
                    >
                      <i className="ti ti-edit" />
                    </button>
                    <button
                      className="btn btn-danger btn-sm btn-icon"
                      onClick={(e) => {
                        e.stopPropagation()
                        confirm({ title: 'Delete Coupon', msg: 'Delete coupon ' + cp.code + '?', danger: true, confirmText: 'Delete' }, () => { toast('Coupon ' + cp.code + ' deleted', 'danger', 'trash') })
                      }}
                    >
                      <i className="ti ti-trash" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="card">
        <div className="card-hd">
          <div className="card-ttl"><i className="ti ti-report-analytics" />Coupon-wise Report</div>
          <button className="btn btn-ghost btn-sm" onClick={() => toast('Exporting CSV…', '', 'download')}>
            <i className="ti ti-download" />Export
          </button>
        </div>
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr>
                <th>Coupon Code</th><th>Discount</th><th>Applicable To</th><th>Times Used</th><th>Total Discount Given</th><th>Revenue Impact</th><th>Status</th>
              </tr>
            </thead>
            <tbody id="coupon-report">
              {couponReport.map((r) => (
                <tr key={r.code}>
                  <td><span className="w8 mono cteal">{r.code}</span></td>
                  <td className="td-m">{r.d}</td>
                  <td><span className="badge badge-navy">{r.a}</span></td>
                  <td className="td-p w7">{r.u}</td>
                  <td className="td-p" style={{ color: 'var(--danger-text)' }}>{r.disc}</td>
                  <td className="td-p w7" style={{ color: 'var(--success-text)' }}>{r.rev}</td>
                  <td><span className={`badge badge-${r.sc}`}>{r.s}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
