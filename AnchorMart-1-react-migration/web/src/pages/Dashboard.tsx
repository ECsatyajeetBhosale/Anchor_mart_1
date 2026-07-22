import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { PATH_BY_PAGE } from '../components/layout/nav'
import type { PageKey } from '../types'

interface StatCard {
  cls: string
  page: PageKey
  label: string
  icon: string
  val: string
  foot: ReactNode
}

const ROW1: StatCard[] = [
  {
    cls: 'sc-navy', page: 'sailors', label: 'Sailors', icon: 'ti-users', val: '2,847',
    foot: (
      <>
        <span className="stat-delta up"><i className="ti ti-trending-up" />14.2%</span>
        <span>vs last month</span>
      </>
    ),
  },
  {
    cls: 'sc-teal', page: 'partners', label: 'Delivery Partners', icon: 'ti-motorbike', val: '38',
    foot: <span className="sdot on xs w6 csuccess">28 on duty</span>,
  },
  {
    cls: 'sc-blue', page: 'orders', label: 'Orders', icon: 'ti-package', val: '184',
    foot: (
      <>
        <span className="stat-delta up"><i className="ti ti-trending-up" />8.1%</span>
        <span>vs yesterday</span>
      </>
    ),
  },
  {
    cls: 'sc-purple', page: 'products', label: 'Products', icon: 'ti-box-seam', val: '1,240',
    foot: <span>Total SKUs</span>,
  },
  {
    cls: 'sc-red', page: 'spares', label: 'Marine Emergency Spares', icon: 'ti-engine', val: '86',
    foot: <span>7 types · critical stock</span>,
  },
  {
    cls: 'sc-amber', page: 'assignments', label: 'Assignments', icon: 'ti-clipboard-list', val: '47',
    foot: <span>Active assignments</span>,
  },
]

const ROW2: StatCard[] = [
  {
    cls: 'sc-red', page: 'verification', label: 'Verifications', icon: 'ti-checklist', val: '6',
    foot: <span>Pending review</span>,
  },
  {
    cls: 'sc-purple', page: 'intents', label: 'Intents', icon: 'ti-file-invoice', val: '23',
    foot: <span>Total intents</span>,
  },
  {
    cls: 'sc-navy', page: 'requests', label: 'Special Requests', icon: 'ti-clipboard-text', val: '5',
    foot: <span>Awaiting review</span>,
  },
  {
    cls: 'sc-amber', page: 'cancellation', label: 'Special Request Cancellation', icon: 'ti-receipt-refund', val: '3',
    foot: <span>Refunds pending</span>,
  },
  {
    cls: 'sc-green', page: 'express', label: 'Express Items', icon: 'ti-bolt', val: '124',
    foot: <span>High priority</span>,
  },
  {
    cls: 'sc-teal', page: 'rewards', label: 'Rewards', icon: 'ti-star', val: '128',
    foot: <span>Active coupons</span>,
  },
]

export function Dashboard() {
  const navigate = useNavigate()

  const renderRow = (cards: StatCard[]) =>
    cards.map((s) => (
      <div
        key={s.label}
        className={`stat-card ${s.cls}`}
        onClick={() => navigate(PATH_BY_PAGE[s.page])}
        style={{ cursor: 'pointer' }}
      >
        <div className="stat-stripe" />
        <div className="stat-top">
          <div className="stat-lbl">{s.label}</div>
          <div className="stat-icon"><i className={`ti ${s.icon}`} /></div>
        </div>
        <div className="stat-val">{s.val}</div>
        <div className="stat-foot">{s.foot}</div>
      </div>
    ))

  return (
    <>
      <div
        style={{
          background: 'linear-gradient(110deg,var(--teal-700) 0%,var(--teal-600) 52%,var(--teal-400) 125%)',
          borderRadius: 'var(--radius-xl)',
          padding: '30px 32px',
          marginBottom: '26px',
          color: '#fff',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: 'var(--sh-md)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            width: '280px',
            height: '280px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,.14)',
            filter: 'blur(70px)',
            top: '-90px',
            right: '-40px',
            pointerEvents: 'none',
          }}
        />
        <div className="flex aic jb g20" style={{ flexWrap: 'wrap', position: 'relative', zIndex: 1 }}>
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: '11.5px',
                fontWeight: 800,
                color: 'rgba(255,255,255,.85)',
                letterSpacing: '1.4px',
                textTransform: 'uppercase',
                marginBottom: '8px',
              }}
            >
              Operations Dashboard · Friday, 29 May 2026
            </div>
            <h1
              style={{
                fontSize: '26px',
                fontWeight: 800,
                letterSpacing: '-.5px',
                marginBottom: '8px',
                color: '#fff',
              }}
            >
              Welcome back, Super Admin
            </h1>
            <p
              style={{
                fontSize: '14px',
                color: 'rgba(255,255,255,.62)',
                maxWidth: '560px',
                lineHeight: 1.65,
                margin: 0,
              }}
            >
              You have <b style={{ color: '#fff' }}>6 verifications</b> to review,{' '}
              <b style={{ color: '#fff' }}>7 intents</b> awaiting payment, and{' '}
              <b style={{ color: '#fff' }}>184 orders</b> in flight today.
            </p>
          </div>
        </div>
      </div>

      <div className="stats-row">{renderRow(ROW1)}</div>
      <div className="stats-row">{renderRow(ROW2)}</div>
    </>
  )
}
