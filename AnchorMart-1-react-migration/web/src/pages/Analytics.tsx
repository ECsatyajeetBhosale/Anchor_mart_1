import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../context/ToastContext'
import { useModal } from '../context/ModalContext'
import { Modal } from '../components/ui/Modal'
import { ProductThumb } from '../lib/images'
import { PATH_BY_PAGE } from '../components/layout/nav'

// ── Category catalog (mirrors PROD_CATEGORIES from index.html) ──
const PROD_CATEGORIES: Record<string, string[]> = {
  Electronics: ['Phones', 'Audio', 'Wearables', 'Accessories'],
  Fashion: ['Men', 'Women', 'Footwear', 'Watches'],
  Jewelry: ['Rings', 'Necklaces', 'Earrings', 'Bracelets'],
  Food: ['Beverages', 'Snacks', 'Staples', 'Confectionery'],
  Beauty: ['Skincare', 'Grooming', 'Fragrance'],
  'Marine Emergency': ['Safety', 'Engine', 'Navigation'],
}

// ── Deterministic pseudo-random helpers (ported from index.html drill logic) ──
function drillHash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}
function drillRand(seed: number): () => number {
  let s = seed >>> 0
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
}
function drillCount(cat: string, sub: string): number {
  const rnd = drillRand(drillHash(cat + '|' + sub))
  return 80 + Math.floor(rnd() * 1120)
}

interface DrillProduct {
  name: string
  sku: string
  units: number[]
  totalUnits: number
  revenue: number
  growth: number
}

function drillGetProducts(cat: string, sub: string): DrillProduct[] {
  const rnd = drillRand(drillHash(cat + '|' + sub))
  const count = 80 + Math.floor(rnd() * 1120)
  const tiers = ['Pro', 'Lite', 'Max', 'Air', 'Plus', 'Mini', 'Ultra', 'Eco', 'Prime', 'Neo', 'Flex', 'Go']
  const list: DrillProduct[] = new Array(count)
  for (let i = 0; i < count; i++) {
    const units: number[] = []
    let tot = 0
    for (let d = 0; d < 7; d++) { const u = 4 + Math.floor(rnd() * 70); units[d] = u; tot += u }
    const price = 5 + Math.floor(rnd() * 145)
    list[i] = {
      name: sub + ' ' + tiers[Math.floor(rnd() * tiers.length)] + ' ' + (i + 1),
      sku: 'SKU-' + cat.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() + (10000 + i),
      units, totalUnits: tot, revenue: tot * price, growth: Math.floor(rnd() * 48) - 10,
    }
  }
  return list
}

// ── Client-side .xls download (mirrors downloadExcel) ──
function downloadExcel(filename: string, headers: string[], rows: (string | number)[][]) {
  const esc = (v: string | number) => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const thead = '<tr>' + headers.map((h) => '<th style="background:#0a1628;color:#fff;font-weight:bold">' + esc(h) + '</th>').join('') + '</tr>'
  const tbody = rows.map((r) => '<tr>' + r.map((c) => '<td>' + esc(c) + '</td>').join('') + '</tr>').join('')
  const html = '﻿<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"></head><body>' +
    '<table border="1">' + thead + tbody + '</table></body></html>'
  const blob = new Blob([html], { type: 'application/vnd.ms-excel' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.replace(/[^\w.\- ]+/g, '_')
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1500)
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// ── The category → subcategory → product drill-down (rendered inside a Modal) ──
function CatDrill({ cat }: { cat: string }) {
  const toast = useToast()
  const [sub, setSub] = useState<string | null>(null)
  const [products, setProducts] = useState<DrillProduct[] | null>(null)
  const [query, setQuery] = useState('')
  const [product, setProduct] = useState<DrillProduct | null>(null)

  const selectSub = (s: string) => {
    setSub(s)
    setProducts(drillGetProducts(cat, s))
    setQuery('')
    setProduct(null)
  }
  const drillReset = () => { setSub(null); setProduct(null); setProducts(null); setQuery('') }
  const drillToSub = () => setProduct(null)

  const downloadProduct = (p: DrillProduct) => {
    const rows: (string | number)[][] = [
      ['Product', p.name], ['SKU', p.sku], ['Category', cat], ['Subcategory', sub || ''],
      ['Total Units (7d)', p.totalUnits], ['Revenue (7d)', '$' + p.revenue],
      ['', ''], ['Day', 'Units Sold'],
    ]
    p.units.forEach((u, i) => rows.push([DAYS[i], u]))
    downloadExcel(cat + ' ' + sub + ' ' + p.name + '.xls', ['Metric', 'Value'], rows)
    toast('Exporting "' + p.name + '" analytics…', 'success', 'download')
  }
  const downloadSub = () => {
    if (!products) return
    const headers = ['#', 'Product', 'SKU', 'Category', 'Subcategory', 'Units (7d)', 'Revenue']
    const rows = products.map((p, i) => [i + 1, p.name, p.sku, cat, sub || '', p.totalUnits, '$' + p.revenue])
    downloadExcel(cat + ' ' + sub + ' all products.xls', headers, rows)
    toast('Exporting ' + products.length.toLocaleString() + ' products to Excel…', 'success', 'download')
  }

  const crumb = (
    <div className="flex aic g6 sm w7 mb16" style={{ flexWrap: 'wrap' }}>
      <span className="drill-crumb" onClick={drillReset}>
        <i className="ti ti-category" style={{ fontSize: '14px' }} /> {cat}
      </span>
      {sub && (
        <>
          <i className="ti ti-chevron-right c4" style={{ fontSize: '13px' }} />
          <span className={`drill-crumb${product ? '' : ' cur'}`} onClick={drillToSub}>{sub}</span>
        </>
      )}
      {product && (
        <>
          <i className="ti ti-chevron-right c4" style={{ fontSize: '13px' }} />
          <span className="drill-crumb cur">{product.name}</span>
        </>
      )}
    </div>
  )

  // ── Product detail view ──
  if (product) {
    const max = Math.max.apply(null, product.units)
    return (
      <>
        {crumb}
        <div className="flex aic g8 mb16">
          <span className="badge badge-navy">{sub}</span>
          <span className="mono xs c4">{product.sku}</span>
        </div>
        <div className="flex aic g20 mb20" style={{ flexWrap: 'wrap' }}>
          <div>
            <div className="metric-lbl">Revenue (7d)</div>
            <div className="metric-val" style={{ color: 'var(--teal-700)' }}>${product.revenue.toLocaleString()}</div>
          </div>
          <div className="metric-sep" />
          <div>
            <div className="metric-lbl">Units Sold</div>
            <div className="metric-val">{product.totalUnits.toLocaleString()}</div>
          </div>
        </div>
        <div className="sec-label">Daily Units — Last 7 Days</div>
        <div className="bar-chart" style={{ height: '130px' }}>
          {product.units.map((v, i) => (
            <div
              key={i}
              className="chart-bar teal"
              style={{ height: ((v / max) * 100).toFixed(1) + '%' }}
              title={`${DAYS[i]}: ${v} units`}
            />
          ))}
        </div>
        <div className="chart-labels">
          {DAYS.map((d) => <div className="chart-label" key={d}>{d}</div>)}
        </div>
        <div className="flex g8 mt20" style={{ justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={drillToSub}><i className="ti ti-arrow-left" />Back to list</button>
          <button className="btn btn-primary" onClick={() => downloadProduct(product)}><i className="ti ti-download" />Download Excel</button>
        </div>
      </>
    )
  }

  // ── Product list view ──
  if (sub && products) {
    const q = query.trim().toLowerCase()
    const filtered = q
      ? products.filter((p) => p.name.toLowerCase().indexOf(q) >= 0 || p.sku.toLowerCase().indexOf(q) >= 0)
      : products
    const CAP = 50
    const shown = filtered.slice(0, CAP)
    return (
      <>
        {crumb}
        <div className="flex aic g10 mb12" style={{ flexWrap: 'wrap' }}>
          <div className="input-wrap f1" style={{ minWidth: '200px' }}>
            <i className="ti ti-search pre" />
            <input
              id="drill-search"
              className="form-input has-icon"
              placeholder={`Search ${sub} products…`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <button className="btn btn-secondary btn-sm" onClick={downloadSub}>
            <i className="ti ti-download" />Export all ({products.length.toLocaleString()})
          </button>
        </div>
        <div className="drill-list">
          {shown.length ? (
            shown.map((p, i) => (
              <div className="drill-prow" key={i} onClick={() => setProduct(p)}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="sm w7 c1 trunc">{p.name}</div>
                  <div className="xs c4 mt4 mono">{p.sku}</div>
                </div>
                <div className="sm w7 c2" style={{ width: '92px', textAlign: 'right' }}>${p.revenue.toLocaleString()}</div>
                <i className="ti ti-chevron-right c4" style={{ marginLeft: '6px' }} />
              </div>
            ))
          ) : (
            <div className="notif-empty">
              <i className="ti ti-search-off" />
              <div className="et">No products match "{query}"</div>
            </div>
          )}
        </div>
        <div className="xs c4 mt8" style={{ textAlign: 'center' }}>
          {filtered.length > CAP
            ? `Showing ${CAP} of ${filtered.length.toLocaleString()} — refine your search to narrow results`
            : `${filtered.length.toLocaleString()} product${filtered.length === 1 ? '' : 's'}`}
        </div>
      </>
    )
  }

  // ── Subcategory list view ──
  const subs = PROD_CATEGORIES[cat] || []
  return (
    <>
      {crumb}
      {subs.length ? (
        <>
          <div className="sec-label">Select a subcategory</div>
          <div className="grid-2" style={{ gap: '12px' }}>
            {subs.map((s) => (
              <div className="ecard flex aic g12" style={{ cursor: 'pointer' }} onClick={() => selectSub(s)} key={s}>
                <div className="notif-ic" style={{ background: 'var(--teal-50)', color: 'var(--teal-600)' }}>
                  <i className="ti ti-tag" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="sm w7 c1">{s}</div>
                  <div className="xs c4 mt4">{drillCount(cat, s).toLocaleString()} products</div>
                </div>
                <i className="ti ti-chevron-right c4" />
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="notif-empty">
          <i className="ti ti-folder-off" />
          <div className="et">No subcategories yet</div>
          <div className="es">Add subcategories for {cat} under Products &amp; Catalog → Categories.</div>
        </div>
      )}
    </>
  )
}

// ── Static chart / table sample data ──
const SALES = [55, 42, 70, 88, 60, 95, 78, 90, 65, 88, 95, 72, 100, 84]
const SALES_DAYS = [16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29]
const CAT_HEIGHTS = [85, 70, 62, 95, 55, 75, 48, 88, 65]

const PERF_ROWS: [string, string, string, string, number[]][] = [
  ['Bisleri Water 1L', 'Beverages', '1,284', '$2,568', [3, 5, 4, 8, 7, 9, 8]],
  ["Lay's Classic", 'Snacks', '986', '$2,958', [5, 4, 6, 7, 6, 8, 9]],
  ['Tetley Green Tea', 'Beverages', '742', '$2,226', [2, 4, 5, 6, 8, 9, 10]],
  ['Dettol Antiseptic', 'Personal Care', '621', '$3,726', [6, 7, 6, 8, 7, 9, 8]],
  ['Amul Taaza Milk', 'Beverages', '584', '$2,920', [7, 8, 7, 8, 8, 9, 8]],
]

const RANGE_TABS = ['7 Days', '30 Days', 'Quarter', 'Year']

export function Analytics() {
  const toast = useToast()
  const modal = useModal()
  const navigate = useNavigate()
  const [range, setRange] = useState('7 Days')

  const catNames = Object.keys(PROD_CATEGORIES)
  const catData = catNames.map((n, i) => ({ n, v: CAT_HEIGHTS[i % CAT_HEIGHTS.length] }))

  const openCatDrill = (cat: string) => {
    modal.open(
      <Modal
        title="Category Analytics"
        sub={cat}
        icon="chart-histogram"
        iconBg="var(--teal-50)"
        iconColor="var(--teal-600)"
        size="lg"
        showFooter={false}
      >
        <div id="drill-body"><CatDrill cat={cat} /></div>
      </Modal>,
    )
  }

  const openDateRange = () => {
    modal.open(
      <Modal
        title="Select Date Range"
        sub="Filter data by a custom period"
        icon="calendar"
        size="md"
        footer={
          <button
            className="btn btn-primary"
            onClick={() => { modal.close(); toast('Date range applied', 'success', 'calendar') }}
          >
            <i className="ti ti-check" />Apply
          </button>
        }
      >
        <div className="grid-2" style={{ gap: '14px' }}>
          <div className="fg"><label className="fg-label">From</label><input type="date" className="form-input" /></div>
          <div className="fg"><label className="fg-label">To</label><input type="date" className="form-input" /></div>
        </div>
      </Modal>,
    )
  }

  return (
    <>
      <div className="pg-header">
        <div className="pg-header-l">
          <h1 className="pg-title">Analytics &amp; Insights</h1>
          <p className="pg-sub"><span>Sales · Delivery · Users · Products · Ports</span></p>
        </div>
        <div className="pg-actions">
          <div className="pill-toggle">
            {RANGE_TABS.map((t) => (
              <div
                className={`pill-btn${range === t ? ' active' : ''}`}
                onClick={() => setRange(t)}
                key={t}
              >
                {t}
              </div>
            ))}
          </div>
          <button className="btn btn-secondary btn-sm" onClick={openDateRange}><i className="ti ti-calendar" />Date Range</button>
        </div>
      </div>

      <div className="stats-row">
        <div className="stat-card sc-teal">
          <div className="stat-stripe" />
          <div className="stat-top"><div className="stat-lbl">Monthly Revenue</div><div className="stat-icon"><i className="ti ti-currency-dollar" /></div></div>
          <div className="stat-val">$284k</div>
          <div className="stat-foot"><span className="stat-delta up"><i className="ti ti-trending-up" />18.3%</span><span>vs last month</span></div>
        </div>
        <div className="stat-card sc-navy">
          <div className="stat-stripe" />
          <div className="stat-top"><div className="stat-lbl">Total Orders</div><div className="stat-icon"><i className="ti ti-package" /></div></div>
          <div className="stat-val">3,421</div>
          <div className="stat-foot"><span className="stat-delta up"><i className="ti ti-trending-up" />12.1%</span></div>
        </div>
        <div className="stat-card sc-amber">
          <div className="stat-stripe" />
          <div className="stat-top"><div className="stat-lbl">Active Sailors</div><div className="stat-icon"><i className="ti ti-users" /></div></div>
          <div className="stat-val">1,204</div>
          <div className="stat-foot"><span className="stat-delta up"><i className="ti ti-trending-up" />220 new</span></div>
        </div>
      </div>

      <div className="grid-2 mb20">
        <div className="card">
          <div className="card-hd"><div className="card-ttl"><i className="ti ti-chart-bar" />Sales Trend (Daily)</div></div>
          <div className="card-body">
            <div className="bar-chart" style={{ height: '130px' }}>
              {SALES.map((h, i) => (
                <div
                  key={i}
                  className="chart-bar hi"
                  style={{ height: h + '%' }}
                  title={`May ${16 + i}: $${(h * 3200).toLocaleString()}`}
                />
              ))}
            </div>
            <div className="chart-labels">
              {SALES_DAYS.map((d) => <div className="chart-label" key={d}>May {d}</div>)}
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-hd">
            <div className="card-ttl"><i className="ti ti-chart-bar" />Orders by Category</div>
            <span className="sm c4 w6"><i className="ti ti-hand-finger" /> Click a bar to drill in</span>
          </div>
          <div className="card-body">
            <div className="bar-chart" style={{ height: '130px' }}>
              {catData.map((b, i) => (
                <div
                  key={i}
                  className="chart-bar teal"
                  style={{ height: b.v + '%', cursor: 'pointer' }}
                  title={`${b.n} — click to drill in`}
                  onClick={() => openCatDrill(b.n)}
                />
              ))}
            </div>
            <div className="chart-labels">
              {catData.map((b) => (
                <div className="chart-label" key={b.n}>{b.n.length > 9 ? b.n.slice(0, 8) + '…' : b.n}</div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-hd">
          <div className="card-ttl"><i className="ti ti-bolt" />Express Item Performance</div>
          <button className="btn btn-ghost btn-sm" onClick={() => toast('Exporting CSV…', '', 'download')}>
            <i className="ti ti-download" />Export
          </button>
        </div>
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr><th>#</th><th>Product</th><th>Category</th><th>Units Sold</th><th>Revenue</th><th>Trend</th></tr>
            </thead>
            <tbody>
              {PERF_ROWS.map((row, i) => (
                <tr className="tr-click" key={row[0]} onClick={() => navigate(PATH_BY_PAGE['express'])}>
                  <td className="td-m">{i + 1}</td>
                  <td>
                    <div className="flex aic g8">
                      <ProductThumb keyword={row[1]} cls="sm" />
                      <span className="td-p">{row[0]}</span>
                    </div>
                  </td>
                  <td><span className="badge badge-navy">{row[1]}</span></td>
                  <td className="td-p">{row[2]}</td>
                  <td className="td-p w7">{row[3]}</td>
                  <td>
                    <div className="sparkline">
                      {row[4].map((v, j) => (
                        <div
                          key={j}
                          className="spark-bar"
                          style={{ height: v * 2.5 + 'px', background: 'var(--teal-400)', opacity: 0.7 }}
                        />
                      ))}
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
